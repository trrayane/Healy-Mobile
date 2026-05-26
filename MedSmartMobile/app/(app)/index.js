import { Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

// Redirection intelligente vers le bon dashboard selon le rôle
export default function AppIndex() {
  const { accountType, userData } = useAuth();

  // Récupère tous les champs possibles que le backend peut renvoyer
  const role = accountType?.toLowerCase()?.trim() || '';
  const sub  = (
    userData?.role         ||
    userData?.account_type ||
    userData?.user_type    ||
    userData?.sub_role     || ''
  ).toLowerCase().trim();

  // Combine role + sub pour couvrir tous les cas possibles du backend
  const isPharmacist  = role === 'pharmacist'   || role === 'pharmacien'   || sub === 'pharmacist'   || sub === 'pharmacien';
  const isCaretaker   = role === 'caretaker'    || role === 'garde-malade' || sub === 'caretaker'    || sub === 'garde-malade';
  const isDoctor      = role === 'doctor'       || role === 'médecin'      || role === 'docteur'     || sub === 'doctor'     || sub === 'médecin';
  const isMedical     = role === 'personnel médical' || role === 'medical_staff' || role === 'staff';

  if (role === 'admin') return <Redirect href="/(app)/admin" />;
  if (role === 'patient') return <Redirect href="/(app)/patient" />;
  if (isPharmacist)  return <Redirect href="/(app)/pharmacist" />;
  if (isCaretaker)   return <Redirect href="/(app)/caretaker" />;
  if (isDoctor)      return <Redirect href="/(app)/doctor" />;
  if (isMedical) {
    // 'personnel médical' sans sous-rôle précis → médecin par défaut
    return <Redirect href="/(app)/doctor" />;
  }

  // Fallback patient
  return <Redirect href="/(app)/patient" />;
}
