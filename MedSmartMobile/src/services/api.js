// ─────────────────────────────────────────────────────────────────────────────
// src/services/api.js — Med Smart Mobile
// ⚠️  Pour changer l'IP → modifier src/config.js uniquement
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const BASE_URL = API_BASE_URL;

// ─── Helpers token ────────────────────────────────────────────────────────────
const getToken        = async () => AsyncStorage.getItem('access_token');
const getRefreshToken = async () => AsyncStorage.getItem('refresh_token');

const saveTokens = async (data) => {
  // Gère tous les formats courants de réponse backend Django :
  // { access, refresh }                    → SimpleJWT standard
  // { access_token, refresh_token }        → variante courante
  // { token, ... }                         → token simple
  // { tokens: { access, refresh }, ... }   → tokens imbriqués
  const access  = data?.access       || data?.access_token  || data?.tokens?.access  || data?.token;
  const refresh = data?.refresh      || data?.refresh_token || data?.tokens?.refresh || '';
  const role    = data?.role         || data?.user?.role
               || data?.user?.account_type || data?.user?.user_type || '';

  if (!access) {
    console.warn('[saveTokens] Aucun access token dans la réponse :', JSON.stringify(data));
    throw new Error('Token manquant dans la réponse du serveur. Vérifiez la configuration backend.');
  }

  await AsyncStorage.setItem('access_token', String(access));
  if (refresh) await AsyncStorage.setItem('refresh_token', String(refresh));
  if (role)    await AsyncStorage.setItem('mock_role', String(role));
};

const clearTokens = async () => {
  await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'mock_role']);
};

export { clearTokens };

export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return !!token;
};

// ─── Timeout helper ───────────────────────────────────────────────────────────
// Endpoints IA → 90 s   (LLM côté backend, peut être lent)
// Tout le reste → 20 s
const AI_ENDPOINTS = ['/diagnostic/'];

function getTimeout(endpoint) {
  return AI_ENDPOINTS.some(p => endpoint.startsWith(p)) ? 90000 : 20000;
}

async function fetchWithTimeout(url, opts = {}, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      const sec = Math.round(ms / 1000);
      throw new Error(`Le serveur n'a pas répondu après ${sec} s. Vérifiez votre connexion ou réessayez.`);
    }
    throw err;
  }
}

// ─── Fetch central ────────────────────────────────────────────────────────────
export async function apiFetch(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (options.body instanceof FormData) delete headers['Content-Type'];

  const token = await getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const timeout = getTimeout(endpoint);

  let res;
  try {
    res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, { ...options, headers }, timeout);
  } catch (networkErr) {
    // Réseau inaccessible — on propage l'erreur pour que l'appelant gère
    throw networkErr;
  }

  // ── Refresh token automatique sur 401 ─────────────────────────────────────
  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = await getToken();
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, { ...options, headers });
    }
  }

  if (!res.ok) {
    let errData;
    try { errData = await res.json(); } catch { errData = {}; }
    // Essaie d'extraire le vrai message d'erreur Django (champs, detail, non_field_errors…)
    let msg = errData?.detail || errData?.message || errData?.error || '';
    if (!msg && errData && typeof errData === 'object') {
      // Erreurs par champ : { email: ["déjà utilisé"], gender: ["invalide"] }
      msg = Object.entries(errData)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
        .join('\n');
    }
    if (!msg) msg = `Erreur ${res.status}`;
    // Ajoute l'endpoint dans le message pour faciliter le debug
    console.warn(`[API ${res.status}] ${endpoint} →`, msg);
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login/
export async function login(email, password) {
  const data = await apiFetch('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await saveTokens(data);
  return data;
}

// POST /api/auth/refresh/  (simplejwt TokenRefreshView)
export async function refreshAccessToken() {
  try {
    const refresh = await getRefreshToken();
    if (!refresh) return false;
    const data = await apiFetch('/auth/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    });
    await AsyncStorage.setItem('access_token', data.access);
    return true;
  } catch {
    await clearTokens();
    return false;
  }
}

// POST /api/auth/logout/
export async function logout() {
  try {
    const refresh = await getRefreshToken();
    if (refresh) {
      await apiFetch('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh }) });
    }
  } catch {}
  await clearTokens();
}

// POST /api/auth/register/patient|doctor|pharmacist|caretaker/
export async function registerPatient(userData) {
  return apiFetch('/auth/register/patient/', { method: 'POST', body: JSON.stringify(userData) });
}
export async function registerDoctor(data) {
  // Accepte un objet JSON ou FormData (pour les fichiers)
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return apiFetch('/auth/register/doctor/', { method: 'POST', body });
}
export async function registerPharmacist(data) {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return apiFetch('/auth/register/pharmacist/', { method: 'POST', body });
}
export async function registerCaretaker(data) {
  const body = data instanceof FormData ? data : JSON.stringify(data);
  return apiFetch('/auth/register/caretaker/', { method: 'POST', body });
}

// ─── OTP inscription ──────────────────────────────────────────────────────────
// POST /api/auth/register/send-otp/    { email }
export async function sendRegisterOTP(email) {
  return apiFetch('/auth/register/send-otp/', { method: 'POST', body: JSON.stringify({ email }) });
}
// POST /api/auth/register/verify-otp/  { email, code }
export async function verifyRegisterOTP(email, code) {
  return apiFetch('/auth/register/verify-otp/', { method: 'POST', body: JSON.stringify({ email, code }) });
}
// POST /api/auth/register/verify/      { email, code }  (activation finale du compte)
export async function verifyAccountOTP(email, code) {
  return apiFetch('/auth/register/verify/', { method: 'POST', body: JSON.stringify({ email, code }) });
}

// ─── Profil utilisateur ───────────────────────────────────────────────────────
// GET/PATCH /api/auth/me/  (endpoint caméléon — s'adapte au rôle)
export async function getMe() { return apiFetch('/auth/me/'); }
export async function updateMe(data) {
  return apiFetch('/auth/me/', { method: 'PATCH', body: JSON.stringify(data) });
}
// POST /api/auth/request-profile-update/
export async function requestProfileUpdate(data) {
  return apiFetch('/auth/request-profile-update/', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Mots de passe ────────────────────────────────────────────────────────────
// POST /api/auth/password/change/
export async function changePassword(data) {
  return apiFetch('/auth/password/change/', { method: 'POST', body: JSON.stringify(data) });
}
// POST /api/auth/password/reset/request/   { email }
export async function requestPasswordReset(email) {
  return apiFetch('/auth/password/reset/request/', { method: 'POST', body: JSON.stringify({ email }) });
}
// POST /api/auth/password/reset/verify/    { email, code }
export async function verifyResetCode(email, code) {
  return apiFetch('/auth/password/reset/verify/', { method: 'POST', body: JSON.stringify({ email, code }) });
}
// POST /api/auth/password/reset/set/       { token, new_password, confirm_password }
export async function confirmPasswordReset(token, newPassword, confirmPassword) {
  return apiFetch('/auth/password/reset/set/', {
    method: 'POST',
    body: JSON.stringify({ token, new_password: newPassword, confirm_password: confirmPassword }),
  });
}

// ─── Médecins ─────────────────────────────────────────────────────────────────
// GET /api/doctors/list/?speciality=...&wilaya=...&search=...
export async function getDoctors(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/doctors/list/${q ? '?' + q : ''}`);
}
// GET /api/doctors/{id}/
export async function getDoctorById(id) { return apiFetch(`/doctors/${id}/`); }
// GET /api/doctors/{id}/reviews/
export async function getDoctorReviews(id) { return apiFetch(`/doctors/${id}/reviews/`); }
// GET /api/doctors/{id}/availability/?date=YYYY-MM-DD
export async function getDoctorSlots(id, date = null) {
  return apiFetch(`/doctors/${id}/availability/${date ? '?date=' + date : ''}`);
}
// GET/PATCH /api/doctors/profile/
export async function getDoctorProfile() { return apiFetch('/doctors/profile/'); }
export async function updateDoctorProfile(data) {
  return apiFetch('/doctors/profile/', { method: 'PATCH', body: JSON.stringify(data) });
}
// GET /api/doctors/dashboard/
export async function getDoctorDashboard() { return apiFetch('/doctors/dashboard/'); }
// POST /api/doctors/qualifications/add/
export async function addQualification(data) {
  return apiFetch('/doctors/qualifications/add/', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Planning médecin (WeeklySchedule ViewSet) ────────────────────────────────
// GET/POST   /api/doctors/my-schedule/
// PATCH/DEL  /api/doctors/my-schedule/{id}/
export async function getSchedules()         { return apiFetch('/doctors/my-schedule/'); }
export async function saveSchedule(data)     { return apiFetch('/doctors/my-schedule/', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateSchedule(id, d)  { return apiFetch(`/doctors/my-schedule/${id}/`, { method: 'PATCH', body: JSON.stringify(d) }); }
export async function deleteSchedule(id)     { return apiFetch(`/doctors/my-schedule/${id}/`, { method: 'DELETE' }); }

// Jours de congé
export async function getDaysOff()           { return apiFetch('/doctors/days-off/'); }
export async function createDayOff(d)        { return apiFetch('/doctors/days-off/', { method: 'POST', body: JSON.stringify(d) }); }
export async function deleteDayOff(id)       { return apiFetch(`/doctors/days-off/${id}/`, { method: 'DELETE' }); }

// Aliases (compatibilité avec l'ancien code)
export const getMySlots   = getSchedules;
export const createSlot   = saveSchedule;
export const updateSlot   = updateSchedule;
export const deleteSlot   = deleteSchedule;
export const getWeeklySchedule = getSchedules;

// ─── Patient ──────────────────────────────────────────────────────────────────
// GET/PATCH /api/patients/profile/
export async function getPatientProfile() { return apiFetch('/patients/profile/'); }
export async function updatePatientProfile(data) {
  return apiFetch('/patients/profile/', { method: 'PATCH', body: JSON.stringify(data) });
}
// GET/PATCH /api/patients/medical-profile/
export async function getMedicalProfile() { return apiFetch('/patients/medical-profile/'); }
export async function updateMedicalProfile(data) {
  return apiFetch('/patients/medical-profile/', { method: 'PATCH', body: JSON.stringify(data) });
}
// GET /api/patients/antecedents/
export async function getAntecedents() { return apiFetch('/patients/antecedents/'); }
// GET /api/patients/allergies/
export async function getAllergies() { return apiFetch('/patients/allergies/'); }
// GET /api/patients/treatments/
export async function getTreatments() { return apiFetch('/patients/treatments/'); }
// GET /api/patients/medical-documents/
export async function getMedicalDocuments() { return apiFetch('/patients/medical-documents/'); }
// GET /api/patients/dashboard/
export async function getPatientDashboard() { return apiFetch('/patients/dashboard/'); }
// GET /api/patients/symptom-analysis/
export async function getSymptomHistory() { return apiFetch('/patients/symptom-analysis/'); }
// GET /api/patients/search/?q=...
export async function searchPatients(q) { return apiFetch(`/patients/search/?q=${encodeURIComponent(q)}`); }
// GET /api/patients/my-patients/   (docteur → liste de ses patients)
export async function getDoctorPatients() { return apiFetch('/patients/my-patients/'); }

// GET /api/patients/medical-documents/   (résultats labo inclus)
// Note: pas d'app lab-results dédiée — on utilise les documents médicaux
export async function getLabResults() {
  return apiFetch('/patients/medical-documents/').catch(() => []);
}

// Patients sans compte (patients externes gérés par docteur)
export async function getExternalPatients() { return apiFetch('/patients/external/'); }
export async function getExternalPatientById(id) { return apiFetch(`/patients/external/${id}/`); }
export async function createExternalPatient(data) { return apiFetch('/patients/external/', { method: 'POST', body: JSON.stringify(data) }); }
export async function updateExternalPatient(id, data) { return apiFetch(`/patients/external/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }); }

// ─── Liaison médecin ↔ patient ────────────────────────────────────────────────
export async function sendLinkRequest(data) { return apiFetch('/patients/link-requests/', { method: 'POST', body: JSON.stringify(data) }); }
export async function getMyLinkRequests() { return apiFetch('/patients/my-link-requests/'); }
export async function respondLinkRequest(id, data) { return apiFetch(`/patients/link-requests/${id}/respond/`, { method: 'POST', body: JSON.stringify(data) }); }
export async function unlinkPatient(patientId) { return apiFetch(`/patients/${patientId}/unlink/`, { method: 'DELETE' }); }

// ─── Consultations ────────────────────────────────────────────────────────────
// POST /api/appointments/{id}/start/
export async function startConsultation(appointmentId) {
  return apiFetch(`/appointments/${appointmentId}/start/`, { method: 'POST' });
}
// POST /api/consultations/complete-session/
export async function completeSession(payload) {
  return apiFetch('/consultations/complete-session/', { method: 'POST', body: JSON.stringify(payload) });
}
// GET  /api/consultations/consultations/
export async function getMyConsultations() { return apiFetch('/consultations/consultations/'); }
// GET  /api/consultations/consultations/{id}/
export async function getConsultationById(id) { return apiFetch(`/consultations/consultations/${id}/`); }

// Record patient (vu par le médecin)
// GET  /api/doctor/patients/{patientId}/record/
export async function getPatientRecord(patientId) { return apiFetch(`/doctor/patients/${patientId}/record/`); }
// POST /api/doctor/patients/{patientId}/add-diagnosis/
export async function addDiagnosisToPatient(patientId, data) {
  return apiFetch(`/doctor/patients/${patientId}/add-diagnosis/`, { method: 'POST', body: JSON.stringify(data) });
}
// POST /api/doctor/patients/{patientId}/add-treatment/
export async function addTreatmentToPatient(patientId, data) {
  return apiFetch(`/doctor/patients/${patientId}/add-treatment/`, { method: 'POST', body: JSON.stringify(data) });
}

// ─── Rendez-vous — Patient ────────────────────────────────────────────────────
// GET  /api/appointments/          → liste des RDV du patient connecté
// GET  /api/doctor/appointments/   → liste des RDV du médecin
// (rôle-aware : redirige automatiquement selon le rôle stocké)
export async function getMyAppointments() {
  const role = await AsyncStorage.getItem('mock_role');
  if (role === 'doctor') return apiFetch('/doctor/appointments/');
  return apiFetch('/appointments/');
}
// POST /api/appointments/          → prendre un RDV (patient)
export async function bookAppointment(data) {
  return apiFetch('/appointments/', { method: 'POST', body: JSON.stringify(data) });
}
// GET  /api/appointments/{id}/
export async function getAppointmentById(id) { return apiFetch(`/appointments/${id}/`); }
// POST /api/appointments/{id}/cancel/
export async function cancelAppointment(id) {
  return apiFetch(`/appointments/${id}/cancel/`, { method: 'POST' });
}
// POST /api/appointments/{id}/reschedule/
export async function rescheduleAppointment(id, data) {
  return apiFetch(`/appointments/${id}/reschedule/`, { method: 'POST', body: JSON.stringify(data) });
}
// POST /api/appointments/{id}/review/
export async function leaveReview(id, data) {
  return apiFetch(`/appointments/${id}/review/`, { method: 'POST', body: JSON.stringify(data) });
}

// ─── Rendez-vous — Médecin ────────────────────────────────────────────────────
// GET  /api/doctor/schedule/               → planning du jour
export async function getTodaySchedule() { return apiFetch('/doctor/schedule/'); }
// GET  /api/doctor/appointments/           → tous les RDV du médecin
export async function getDoctorAppointments() { return apiFetch('/doctor/appointments/'); }
// GET  /api/doctor/appointments/pending/   → RDV en attente de confirmation
export async function getPendingAppointments() { return apiFetch('/doctor/appointments/pending/'); }
// GET  /api/doctor/appointments/{id}/
export async function getDoctorAppointmentById(id) { return apiFetch(`/doctor/appointments/${id}/`); }
// POST /api/doctor/appointments/{id}/confirm/
export async function confirmAppointment(id) {
  return apiFetch(`/doctor/appointments/${id}/confirm/`, { method: 'POST' });
}
// POST /api/doctor/appointments/{id}/refuse/
export async function refuseAppointment(id) {
  return apiFetch(`/doctor/appointments/${id}/refuse/`, { method: 'POST' });
}
// POST /api/doctor/appointments/{id}/complete/
export async function completeAppointment(id) {
  return apiFetch(`/doctor/appointments/${id}/complete/`, { method: 'POST' });
}
// POST /api/doctor/appointments/{id}/cancel/
export async function doctorCancelAppointment(id) {
  return apiFetch(`/doctor/appointments/${id}/cancel/`, { method: 'POST' });
}

// ─── Prescriptions ────────────────────────────────────────────────────────────
// GET  /api/prescriptions/prescriptions/
export async function getMyPrescriptions() { return apiFetch('/prescriptions/prescriptions/'); }
// POST /api/prescriptions/prescriptions/
export async function addPrescription(data) {
  return apiFetch('/prescriptions/prescriptions/', { method: 'POST', body: JSON.stringify(data) });
}
export const createPrescription = addPrescription;
// GET  /api/prescriptions/prescriptions/{id}/
export async function getPrescriptionById(id) { return apiFetch(`/prescriptions/prescriptions/${id}/`); }
// POST /api/prescriptions/quick/
export async function createQuickPrescription(data) {
  return apiFetch('/prescriptions/quick/', { method: 'POST', body: JSON.stringify(data) });
}
// POST /api/prescriptions/{id}/send/   (envoyer à une pharmacie)
export async function sendPrescriptionToPharmacy(prescriptionId, data) {
  return apiFetch(`/prescriptions/prescriptions/${prescriptionId}/send/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
// GET  /api/prescriptions/{pk}/qr-image/
export async function getPrescriptionQR(pk) { return apiFetch(`/prescriptions/${pk}/qr-image/`); }
// POST /api/prescriptions/scan/
export async function scanPrescriptionQR(data) {
  return apiFetch('/prescriptions/scan/', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Médicaments ──────────────────────────────────────────────────────────────
// GET  /api/medications/registry/          → liste complète
export async function getMedications(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/medications/registry/${q ? '?' + q : ''}`);
}
// GET  /api/medications/registry/?search=  → recherche
export async function searchMedications(query) {
  return apiFetch(`/medications/registry/?search=${encodeURIComponent(query)}`);
}
// POST /api/medications/registry/
export async function createMedication(data) {
  return apiFetch('/medications/registry/', { method: 'POST', body: JSON.stringify(data) });
}
// PATCH /api/medications/registry/{id}/   → mettre à jour le stock
export async function updateMedicationStock(id, quantity) {
  return apiFetch(`/medications/registry/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ stock_quantity: quantity }),
  });
}

// ─── Pharmacie ────────────────────────────────────────────────────────────────
// GET  /api/pharmacy/list/
export async function getAllPharmacies(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/pharmacy/list/${q ? '?' + q : ''}`);
}
// GET  /api/pharmacy/stock/
export async function getPharmacyStock(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/pharmacy/stock/${q ? '?' + q : ''}`);
}
// POST /api/pharmacy/stock/
export async function addPharmacyStock(data) {
  return apiFetch('/pharmacy/stock/', { method: 'POST', body: JSON.stringify(data) });
}
// PATCH /api/pharmacy/stock/{id}/
export async function updatePharmacyStock(id, data) {
  return apiFetch(`/pharmacy/stock/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
}
// GET  /api/pharmacy/orders/
export async function getPharmacyOrders(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/pharmacy/orders/${q ? '?' + q : ''}`);
}
// POST /api/pharmacy/orders/
export async function createPharmacyOrder(data) {
  return apiFetch('/pharmacy/orders/', { method: 'POST', body: JSON.stringify(data) });
}
// PATCH /api/pharmacy/orders/{id}/status/   → mettre à jour le statut
export async function updateOrderStatus(id, data) {
  const body = typeof data === 'string' ? { status: data } : data;
  return apiFetch(`/pharmacy/orders/${id}/status/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}
export const updatePharmacyOrderStatus = updateOrderStatus;
// GET /api/pharmacy/stock/public-stock/?pharmacy_id=<id>
// Permet à un patient de consulter le catalogue en stock d'une pharmacie
export async function getPharmacyPublicStock(pharmacyId) {
  return apiFetch(`/pharmacy/stock/public-stock/?pharmacy_id=${pharmacyId}`);
}

// GET /api/pharmacy/dashboard/
export async function getPharmacistDashboard() { return apiFetch('/pharmacy/dashboard/'); }

// ─── Garde-malade (Caretaker) ─────────────────────────────────────────────────
// GET  /api/caretaker/search/          → chercher des gardes-malades
export async function getCaretakers(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/caretaker/search/${q ? '?' + q : ''}`);
}
export const getAllCaretakers = getCaretakers;
// GET/POST  /api/caretaker/requests/   → demandes de soins
export async function getCareRequests() { return apiFetch('/caretaker/requests/'); }
export async function createCareRequest(data) {
  return apiFetch('/caretaker/requests/', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCareRequest(id, data) {
  return apiFetch(`/caretaker/requests/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
}
// POST /api/caretaker/requests/{id}/respond_to_offer/  { status: 'accepted' | 'rejected' }
export async function respondToOffer(id, status) {
  return apiFetch(`/caretaker/requests/${id}/respond_to_offer/`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}
// Alias : patients suivis par le garde-malade
export async function getCaretakerPatients() { return apiFetch('/caretaker/requests/'); }
// Prescriptions vues par le garde-malade → on passe par prescriptions standard
export async function getCaretakerPatientsPrescriptions() { return apiFetch('/prescriptions/prescriptions/'); }
// GET/POST/PATCH/DELETE /api/caretaker/tasks/{id}/
export async function getCaretakerTasks() { return apiFetch('/caretaker/tasks/'); }
export async function createCaretakerTask(data) {
  return apiFetch('/caretaker/tasks/', { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCaretakerTask(id, data) {
  return apiFetch(`/caretaker/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
}
export async function deleteCaretakerTask(id) {
  return apiFetch(`/caretaker/tasks/${id}/`, { method: 'DELETE' });
}
// GET/POST /api/caretaker/medication-schedules/
export async function getMedicationSchedules() { return apiFetch('/caretaker/medication-schedules/'); }
export async function createMedicationSchedule(data) {
  return apiFetch('/caretaker/medication-schedules/', { method: 'POST', body: JSON.stringify(data) });
}
// GET /api/caretaker/dashboard/
export async function getCaretakerDashboard() { return apiFetch('/caretaker/dashboard/'); }
// POST /api/caretaker/certificates/add/
export async function addCaretakerCertificate(data) {
  return apiFetch('/caretaker/certificates/add/', { method: 'POST', body: data });
}

// ─── Notifications ────────────────────────────────────────────────────────────
// GET  /api/notifications/
export async function getNotifications() { return apiFetch('/notifications/'); }
// POST /api/notifications/{id}/mark_as_read/   (action custom du ViewSet)
export async function markNotificationRead(id) {
  return apiFetch(`/notifications/${id}/mark_as_read/`, { method: 'POST' });
}
// POST /api/notifications/mark_all_as_read/  (marquer toutes comme lues)
export async function markAllNotificationsRead() {
  return apiFetch('/notifications/mark_all_as_read/', { method: 'POST' });
}
// DELETE /api/notifications/{id}/
export async function deleteNotification(id) {
  return apiFetch(`/notifications/${id}/`, { method: 'DELETE' });
}
// DELETE /api/notifications/clear_all/  (supprimer toutes les notifications)
export async function clearAllNotifications() {
  return apiFetch('/notifications/clear_all/', { method: 'DELETE' });
}
// GET  /api/notifications/summary/
export async function getNotificationSummary() { return apiFetch('/notifications/summary/'); }

// ─── Chat / Messagerie ────────────────────────────────────────────────────────
// GET  /api/messaging/conversations/
export async function getConversations() { return apiFetch('/messaging/conversations/'); }
// POST /api/messaging/conversations/
export async function createConversation(interlocutorId) {
  return apiFetch('/messaging/conversations/', {
    method: 'POST',
    body: JSON.stringify({ interlocutor_id: interlocutorId }),
  });
}
// GET  /api/messaging/conversations/{id}/
export async function getConversationDetail(conversationId) {
  return apiFetch(`/messaging/conversations/${conversationId}/`);
}
// POST /api/messaging/conversations/{id}/read/  (url_path='read' dans le ViewSet)
export async function markConversationRead(conversationId) {
  return apiFetch(`/messaging/conversations/${conversationId}/read/`, { method: 'POST' });
}
// GET  /api/messaging/conversations/{id}/messages/
export async function getMessages(conversationId) {
  return apiFetch(`/messaging/conversations/${conversationId}/messages/`);
}
// POST /api/messaging/conversations/{id}/messages/
export async function sendMessage(conversationId, content) {
  return apiFetch(`/messaging/conversations/${conversationId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
// PATCH /api/messaging/messages/{id}/
export async function updateMessage(messageId, content) {
  return apiFetch(`/messaging/messages/${messageId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
}
// DELETE /api/messaging/messages/{id}/
export async function deleteMessage(messageId) {
  return apiFetch(`/messaging/messages/${messageId}/`, { method: 'DELETE' });
}
// POST /api/messaging/block/{userId}/
export async function blockUser(userId) {
  return apiFetch(`/messaging/block/${userId}/`, { method: 'POST' });
}
// POST /api/messaging/report/  { reported_user_id, reason, category? }
export async function reportUser(userId, reason, category = 'other') {
  return apiFetch('/messaging/report/', {
    method: 'POST',
    body: JSON.stringify({ reported_user_id: userId, reason, category }),
  });
}

// ─── IA Médicale (diagnostic_ai) ──────────────────────────────────────────────
// POST /api/diagnostic/chat/  { symptoms, lang, history? }
// ⚠️  Le backend Django attend "symptoms" (pas "message") et "lang" (pas "language")
export async function analyzeSymptoms(data) {
  const payload = typeof data === 'string'
    ? { symptoms: data, lang: 'fr' }
    : {
        symptoms: data.symptoms || data.message || '',
        lang:     data.lang || data.language || 'fr',
        // n'envoyer session_id que s'il est défini (évite les erreurs backend sur null)
        ...(data.session_id ? { session_id: data.session_id } : {}),
      };
  return apiFetch('/diagnostic/chat/', { method: 'POST', body: JSON.stringify(payload) });
}

// GET  /api/diagnostic/chat/sessions/
export async function getAISessions() { return apiFetch('/diagnostic/chat/sessions/'); }
// GET  /api/diagnostic/chat/sessions/{id}/
export async function getAISessionDetail(id) { return apiFetch(`/diagnostic/chat/sessions/${id}/`); }
// GET  /api/diagnostic/chat/history/
export async function getAIHistory() { return apiFetch('/diagnostic/chat/history/'); }
// POST /api/diagnostic/chat/analyze-file/   (FormData: file, message, lang)
export async function analyzeMedicalFile(file, message = '', lang = 'fr') {
  const form = new FormData();
  form.append('file', file);
  form.append('message', message);
  form.append('lang', lang);
  return apiFetch('/diagnostic/chat/analyze-file/', { method: 'POST', body: form });
}
// POST /api/diagnostic/chat/feedback/
export async function sendAIFeedback(data) {
  return apiFetch('/diagnostic/chat/feedback/', { method: 'POST', body: JSON.stringify(data) });
}
// POST /api/diagnostic/chat/confirm-recommendation/
export async function confirmAIRecommendation(data) {
  return apiFetch('/diagnostic/chat/confirm-recommendation/', { method: 'POST', body: JSON.stringify(data) });
}
// GET  /api/diagnostic/doctor/interactions/
export async function getDoctorAIInteractions() { return apiFetch('/diagnostic/doctor/interactions/'); }

// ─── Admin ────────────────────────────────────────────────────────────────────
// GET  /api/admin/dashboard/  ET  /api/admin/stats/  (même vue)
export async function getAdminDashboard() { return apiFetch('/admin/dashboard/'); }
export async function getAdminStats()     { return apiFetch('/admin/stats/'); }
// GET/PATCH  /api/admin/users/  et  /api/admin/users/{id}/
export async function getAdminUsers(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/admin/users/${q ? '?' + q : ''}`);
}
export const getUsers = getAdminUsers;
export async function updateAdminUser(userId, data) {
  return apiFetch(`/admin/users/${userId}/`, { method: 'PATCH', body: JSON.stringify(data) });
}
// POST /api/admin/users/{id}/verify/
export async function verifyUser(userId) {
  return apiFetch(`/admin/users/${userId}/verify/`, { method: 'POST' });
}
// POST /api/admin/users/{id}/reject/
export async function rejectUser(userId, reason = '') {
  return apiFetch(`/admin/users/${userId}/reject/`, { method: 'POST', body: JSON.stringify({ reason }) });
}
// POST /api/admin/users/{id}/suspend/
export async function toggleSuspendUser(userId) {
  return apiFetch(`/admin/users/${userId}/suspend/`, { method: 'POST' });
}
// GET  /api/admin/audit-logs/
export async function getAuditLogs(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/admin/audit-logs/${q ? '?' + q : ''}`);
}
// GET  /api/admin/appointments/
export async function getAdminAppointments(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/admin/appointments/${q ? '?' + q : ''}`);
}
// GET  /api/admin/profile-updates/
export async function getAdminProfileUpdates() { return apiFetch('/admin/profile-updates/'); }
// POST /api/admin/profile-updates/{id}/action/
export async function handleProfileUpdateAction(id, action) {
  return apiFetch(`/admin/profile-updates/${id}/action/`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

// Aliases conservés pour l'ancien code
export async function getPendingDoctors() { return getAdminUsers({ role: 'doctor', status: 'pending' }); }
export async function getAdminCareRequests(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/caretaker/requests/${q ? '?' + q : ''}`);
}
export async function getAdminQueue(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/admin/appointments/${q ? '?' + q : ''}`);
}
export async function updateQueueStatus(id, status) {
  return apiFetch(`/admin/appointments/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) });
}
export async function getReports() { return apiFetch('/messaging/reports/'); }
export async function handleReportAction(reportId, action) {
  return apiFetch(`/messaging/reports/${reportId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
}
