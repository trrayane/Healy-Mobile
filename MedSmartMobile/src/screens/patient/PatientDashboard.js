import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Linking,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Calendar, FileText, Pill, Heart,
  Bell, MessageSquare, ChevronRight, Activity,
  Clock, MapPin, Star, Plus, Brain, Phone, TriangleAlert, X, Search, Package, Check, Send,
  FlaskConical,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import { Card, Badge, Avatar, SectionHeader, EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';


export default function PatientDashboardScreen() {
  const { userData, logout, avatarUri } = useAuth();
  const { dk } = useTheme();
  const { t } = useLanguage();
  const { notifications, appointments, prescriptions, unreadNotifs, refresh } = useData();
  const c = dk ? T.dark : T.light;

  const [refreshing, setRefreshing]   = useState(false);
  const [dashData, setDashData]       = useState(null);
  const [loading, setLoading]         = useState(false);
  const [emergency, setEmergency]     = useState(false);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const data = await api.getPatientDashboard().catch(() => null);
      setDashData(data);
    } catch {} finally { setLoading(false); }
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refresh(), loadDashboard()]);
    setRefreshing(false);
  }

  const upcoming = appointments
    .filter(a => a.status === 'confirmed' || a.status === 'pending')
    .slice(0, 3);

  const activeRx = prescriptions.filter(r => r.status === 'active').slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <EmergencyModal visible={emergency} onClose={() => setEmergency(false)} dk={dk} c={c} t={t} />

      {/* ── Header compact ────────────────────────────────────────────────── */}
      <View style={[styles.navbar, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.navLogo}>
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>+</Text>
        </LinearGradient>
        <Text style={[styles.navTitle, { color: c.txt }]}>Healy</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push('/(app)/chat')}
          style={styles.navIcon}
        >
          <MessageSquare size={20} color={c.txt2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(app)/notifications')}
          style={styles.navIcon}
        >
          <Bell size={20} color={c.txt2} />
          {unreadNotifs > 0 && (
            <View style={[styles.badge, { backgroundColor: c.red }]}>
              <Text style={styles.badgeText}>{unreadNotifs}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(app)/patient/profile')}
          style={styles.navIcon}
        >
          <Avatar firstName={userData?.first_name || ''} lastName={userData?.last_name || ''} size={34} uri={avatarUri} />
        </TouchableOpacity>
      </View>

      {/* ── Contenu overview (plus de barre de tabs horizontale) ──────────── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        <OverviewTab
          c={c} dk={dk}
          userData={userData}
          upcoming={upcoming}
          activeRx={activeRx}
          dashData={dashData}
          loading={loading}
          onEmergency={() => setEmergency(true)}
          onAnalyze={(symptom) => router.push(
          symptom?.trim()
            ? `/(app)/patient/ai?symptom=${encodeURIComponent(symptom.trim())}`
            : '/(app)/patient/ai'
        )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Emergency Modal ─────────────────────────────────────────────────────────
function EmergencyModal({ visible, onClose, dk, c, t }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: c.card, borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#E05555' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(224,85,85,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <TriangleAlert size={24} color="#E05555" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>Urgence vitale</Text>
              <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt2 }}>Alerte et localisation</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={c.txt3} />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: 'rgba(224,85,85,0.08)', borderWidth: 1, borderColor: 'rgba(224,85,85,0.2)', padding: 12, borderRadius: 12, marginBottom: 20 }}>
            <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.regular }}>Ceci alertera vos contacts d'urgence et vous mettra en relation avec les services médicaux de proximité.</Text>
          </View>

          <View style={{ gap: 12, marginBottom: 16 }}>
            <TouchableOpacity 
              onPress={() => Linking.openURL('tel:15')}
              style={{ backgroundColor: '#E05555', paddingVertical: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Phone size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>Appeler le 15 (SAMU)</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => Linking.openURL('tel:1021')}
              style={{ backgroundColor: 'rgba(224,85,85,0.1)', borderWidth: 1, borderColor: 'rgba(224,85,85,0.2)', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Phone size={16} color="#E05555" />
              <Text style={{ color: '#E05555', fontSize: 15, fontFamily: FONTS.semibold }}>Appeler le 1021</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => Alert.alert('Position', 'Votre position a été partagée avec les secours.')}
              style={{ backgroundColor: 'rgba(224,85,85,0.06)', borderWidth: 1, borderColor: 'rgba(224,85,85,0.15)', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <MapPin size={16} color="#E05555" />
              <Text style={{ color: '#E05555', fontSize: 15, fontFamily: FONTS.semibold }}>Partager ma position</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
            <Text style={{ color: c.txt3, fontSize: 14, fontFamily: FONTS.medium }}>Annuler — Je vais bien</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ c, dk, userData, upcoming, activeRx, dashData, loading, onEmergency, onAnalyze }) {
  const [tempSymptom, setTempSymptom] = useState('');
  if (loading) return <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />;

  return (
    <>
      {/* ── HEADER & URGENCE ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 22, fontFamily: FONTS.bold, color: c.txt, marginBottom: 4 }}>
            Bonjour, {userData?.first_name || '—'}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt2 }}>
            {format(new Date(), 'EEEE d MMMM', { locale: fr })}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onEmergency}
          style={{ backgroundColor: '#E24B4A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <TriangleAlert size={16} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: FONTS.bold }}>Urgence</Text>
        </TouchableOpacity>
      </View>

      {/* ── BANNIÈRE IA ── */}
      <LinearGradient
        colors={['#304B71', '#6492C9']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: 20, marginBottom: 20 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Activity size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>Analyse IA des symptômes</Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontFamily: FONTS.regular, marginBottom: 16 }}>
          Décrivez vos symptômes pour obtenir un avis orienté par notre intelligence médicale.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            placeholder="Ex: Maux de tête..."
            placeholderTextColor="rgba(13,27,46,0.5)"
            value={tempSymptom}
            onChangeText={setTempSymptom}
            style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0D1B2E', fontFamily: FONTS.regular }}
          />
          <TouchableOpacity 
            onPress={() => onAnalyze(tempSymptom)}
            style={{ backgroundColor: '#fff', paddingHorizontal: 16, justifyContent: 'center', borderRadius: 12 }}
          >
            <Text style={{ color: '#304B71', fontSize: 14, fontFamily: FONTS.bold }}>Analyser</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── KPIS GRID ── */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        {/* KPI 1 : Prochain RDV */}
        <View style={{ width: '48%', backgroundColor: c.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', marginBottom: 8 }}>Prochain RDV</Text>
          {upcoming[0] ? (
            <>
              <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, marginBottom: 2 }} numberOfLines={1}>
                {upcoming[0].doctor_name || 'Médecin'}
              </Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.blue }}>
                {upcoming[0].date ? format(new Date(upcoming[0].date), 'dd MMM', { locale: fr }) : ''} · {upcoming[0].start_time?.substring(0,5) || upcoming[0].time || upcoming[0].slot_time || ''}
              </Text>
            </>
          ) : (
             <Text style={{ fontSize: 13, fontFamily: FONTS.medium, color: c.txt2 }}>Aucun RDV</Text>
          )}
        </View>

        {/* KPI 2 : Ordonnances */}
        <View style={{ width: '48%', backgroundColor: c.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', marginBottom: 8 }}>Ordonnances</Text>
          <Text style={{ fontSize: 24, fontFamily: FONTS.extrabold, color: c.txt, marginBottom: 2, lineHeight: 28 }}>{activeRx.length}</Text>
          <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.green }}>{activeRx.length} active(s)</Text>
        </View>

        {/* KPI 3 : Commande */}
        <View style={{ width: '48%', backgroundColor: c.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', marginBottom: 8 }}>Pharmacie</Text>
          <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: c.txt, marginBottom: 2 }}>Aucune</Text>
          <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.txt2 }}>En attente</Text>
        </View>

        {/* KPI 4 : Notifications */}
        <View style={{ width: '48%', backgroundColor: c.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', marginBottom: 8 }}>Alertes</Text>
          <Text style={{ fontSize: 24, fontFamily: FONTS.extrabold, color: c.txt, marginBottom: 2, lineHeight: 28 }}>0</Text>
          <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.txt2 }}>Tout est lu</Text>
        </View>
      </View>

      {/* ── PROCHAINS RDV LISTE ── */}
      <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prochains rendez-vous</Text>
          <TouchableOpacity onPress={() => router.push('/(app)/patient/appointments')}>
            <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.blue }}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {upcoming.length === 0 ? (
          <Text style={{ fontSize: 13, color: c.txt2, textAlign: 'center', marginVertical: 10, fontFamily: FONTS.regular }}>Aucun rendez-vous prévu</Text>
        ) : (
          upcoming.map((appt) => {
            const initials = (appt.doctor_name || 'M').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            return (
              <View key={appt.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: dk ? '#1A2333' : '#F8FAFC', borderRadius: 12, marginBottom: 8 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.bold }}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, marginBottom: 2 }}>{appt.doctor_name || 'Médecin'}</Text>
                  <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt2 }}>
                    {appt.doctor_specialty || 'Généraliste'} · {appt.date ? format(new Date(appt.date), 'dd MMM', { locale: fr }) : ''}
                  </Text>
                </View>
                {appt.status === 'confirmed' && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.green + '20' }}>
                    <Text style={{ color: c.green, fontSize: 11, fontFamily: FONTS.bold }}>Confirmé</Text>
                  </View>
                )}
                {appt.status === 'pending' && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: c.amber + '20' }}>
                    <Text style={{ color: c.amber, fontSize: 11, fontFamily: FONTS.bold }}>En attente</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* ── ACCÈS RAPIDE ── */}
      <View style={{ backgroundColor: c.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border }}>
        <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>Accès rapide</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[
            { label: 'Médecin',   icon: Search,    color: c.blue,   bg: c.blue + '18', route: '/(app)/patient/find-doctors' },
            { label: 'Pharmacie', icon: Package,   color: c.green,  bg: c.green + '18', route: '/(app)/patient/pharmacies' },
            { label: 'Ordonnance', icon: FileText, color: c.amber, bg: c.amber + '18', route: '/(app)/patient/prescriptions' },
            { label: 'Garde-malade', icon: Heart, color: c.purple, bg: c.purple + '18', route: '/(app)/patient/caretakers' },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => item.route && router.push(item.route)}
              style={{ alignItems: 'center', gap: 8, flex: 1 }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                <item.icon size={22} color={item.color} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: FONTS.medium, color: c.txt, textAlign: 'center' }} numberOfLines={2}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </>
  );
}

// ─── Appointments Tab ─────────────────────────────────────────────────────────
function AppointmentsTab({ c, dk, appointments }) {
  const [filter, setFilter] = useState('all');

  const filters = [
    { key: 'all',       label: 'Tous' },
    { key: 'confirmed', label: 'Confirmés' },
    { key: 'pending',   label: 'En attente' },
    { key: 'completed', label: 'Terminés' },
    { key: 'cancelled', label: 'Annulés' },
  ];

  const filtered = filter === 'all' ? appointments : appointments.filter(a => a.status === filter);

  return (
    <>
      <TouchableOpacity 
        onPress={() => router.push('/(app)/patient/find-doctors')}
        style={{ 
          backgroundColor: c.blue, paddingVertical: 14, borderRadius: 14, 
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
          gap: 10, marginBottom: 20, ...SHADOWS.md
        }}
      >
        <Plus size={18} color="#fff" />
        <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONTS.bold }}>Prendre rendez-vous</Text>
      </TouchableOpacity>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
        {filters.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.chip, {
              backgroundColor: filter === f.key ? c.blue : c.card,
              borderColor: filter === f.key ? c.blue : c.border,
            }]}
          >
            <Text style={{ color: filter === f.key ? '#fff' : c.txt2, fontSize: 13, fontFamily: FONTS.semibold }}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0
        ? <EmptyState icon={<Calendar size={40} color={c.txt3} />} title="Aucun rendez-vous" subtitle="Aucun rendez-vous dans cette catégorie" dk={dk} />
        : filtered.map(a => <AppointmentCard key={a.id} appt={a} c={c} dk={dk} full />)
      }
    </>
  );
}

// ─── Prescriptions Tab ────────────────────────────────────────────────────────
function PrescriptionsTab({ c, dk, prescriptions }) {
  const [selectedRx, setSelectedRx] = useState(null);

  return (
    <>
      {selectedRx && (
        <SendToPharmacyModal 
          rx={selectedRx} 
          onClose={() => setSelectedRx(null)} 
          c={c} dk={dk} 
        />
      )}
      {prescriptions.length === 0
        ? <EmptyState icon={<FileText size={40} color={c.txt3} />} title="Aucune ordonnance" subtitle="Vos ordonnances apparaîtront ici" dk={dk} />
        : prescriptions.map(rx => (
            <PrescriptionCard 
              key={rx.id} rx={rx} c={c} dk={dk} full 
              onSend={() => setSelectedRx(rx)}
            />
          ))
      }
    </>
  );
}

// ─── Send To Pharmacy Modal ──────────────────────────────────────────────────
function SendToPharmacyModal({ rx, onClose, c, dk }) {
  const [pharmacies, setPharmacies] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [notes, setNotes]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    api.getAllPharmacies()
      .then(d => setPharmacies(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function confirm() {
    if (!selected) return;
    setSending(true);
    try {
      await api.sendPrescriptionToPharmacy(rx.id, {
        pharmacy_id: selected.id,
        notes: notes
      });
      Alert.alert('Succès', 'Ordonnance transmise à la pharmacie.');
      onClose();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>Transmettre à une pharmacie</Text>
            <TouchableOpacity onPress={onClose}><X size={24} color={c.txt3} /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, color: c.txt2, marginBottom: 16 }}>Choisissez une pharmacie pour transmettre votre ordonnance.</Text>

          <ScrollView style={{ marginBottom: 20 }}>
            {loading ? <ActivityIndicator color={c.blue} /> : pharmacies.map(p => (
              <TouchableOpacity 
                key={p.id} 
                onPress={() => setSelected(p)}
                style={{ 
                  padding: 14, borderRadius: 12, borderWidth: 1, 
                  borderColor: selected?.id === p.id ? c.blue : c.border,
                  backgroundColor: selected?.id === p.id ? c.blue + '10' : c.bg,
                  marginBottom: 8
                }}
              >
                <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: selected?.id === p.id ? c.blue : c.txt }}>{p.name || p.pharm_name}</Text>
                <Text style={{ fontSize: 12, color: c.txt3 }}>{[p.pharm_address, p.pharm_city].filter(Boolean).join(', ') || 'Adresse non renseignée'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TextInput 
            placeholder="Notes pour le pharmacien (optionnel)" 
            placeholderTextColor={c.txt3}
            multiline
            numberOfLines={3}
            style={{ 
              backgroundColor: c.bg, borderRadius: 12, padding: 12, color: c.txt, 
              borderWidth: 1, borderColor: c.border, marginBottom: 20, textAlignVertical: 'top'
            }}
            onChangeText={setNotes}
          />

          <TouchableOpacity 
            onPress={confirm} 
            disabled={!selected || sending}
            style={{ backgroundColor: selected ? c.blue : c.txt3, paddingVertical: 14, borderRadius: 14, alignItems: 'center' }}
          >
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>Confirmer l'envoi</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Medications Tab ──────────────────────────────────────────────────────────
function MedicationsTab({ c, dk }) {
  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getTreatments().then(d => setTreatments(Array.isArray(d) ? d : d?.results || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />;
  return treatments.length === 0
    ? <EmptyState icon={<Pill size={40} color={c.txt3} />} title="Aucun traitement" subtitle="Vos traitements apparaîtront ici" dk={dk} />
    : treatments.map((tr, i) => (
        <Card key={tr.id || i} dk={dk} style={{ marginBottom: 10 }}>
          <Text style={[styles.cardTitle, { color: c.txt }]}>{tr.medication_name || tr.name}</Text>
          <Text style={[styles.cardSub, { color: c.txt2 }]}>{tr.dosage} — {tr.frequency}</Text>
          <Text style={[styles.cardSub, { color: c.txt3 }]}>
            {tr.start_date} → {tr.end_date || 'En cours'}
          </Text>
        </Card>
      ));
}

// ─── Health Tab ───────────────────────────────────────────────────────────────
function HealthTab({ c, dk }) {
  const [vitals, setVitals] = useState([]);
  const [labs, setLabs]     = useState([]);
  useEffect(() => {
    api.getMedicalProfile().then(d => { if (d?.vitals) setVitals(d.vitals); }).catch(() => {});
    api.getLabResults().then(d => setLabs(Array.isArray(d) ? d : d?.results || [])).catch(() => {});
  }, []);

  return (
    <>
      <SectionHeader title="Profil santé" dk={dk} />
      <Card dk={dk} style={{ marginBottom: 16 }}>
        <Text style={[styles.cardSub, { color: c.txt2, lineHeight: 22 }]}>
          Consultez votre profil médical, vos constantes vitales et vos résultats d'analyses depuis cette section.
        </Text>
      </Card>
      <SectionHeader title="Résultats d'analyses" dk={dk} />
      {labs.length === 0
        ? <EmptyState icon={<FlaskConical size={40} color={c.txt3} />} title="Aucun résultat" subtitle="Vos résultats d'analyses apparaîtront ici" dk={dk} />
        : labs.map((l, i) => (
            <Card key={l.id || i} dk={dk} style={{ marginBottom: 10 }}>
              <Text style={[styles.cardTitle, { color: c.txt }]}>{l.test_name || l.name}</Text>
              <Text style={[styles.cardSub, { color: c.txt2 }]}>{l.result}</Text>
              <Text style={[styles.cardSub, { color: c.txt3 }]}>{l.date}</Text>
            </Card>
          ))
      }
    </>
  );
}

// ─── AI Tab — interface chat complète ────────────────────────────────────────
const AI_CHIPS = ['Maux de tête', 'Fièvre', 'Douleur thoracique', 'Fatigue', 'Nausées', 'Vertiges', 'Toux'];

const AI_INIT_MESSAGES = [
  {
    id: 0, role: 'assistant',
    text: "Bonjour ! Décrivez vos symptômes en détail — localisation, intensité, durée — et je vous fournirai une analyse préliminaire.",
    disclaimer: "Informations indicatives — consultez un médecin pour un diagnostic adapté.",
  }
];

function AITab({ c, dk, initialSymptoms = '' }) {
  const [messages, setMessages] = useState(AI_INIT_MESSAGES);
  const [input,    setInput]    = useState(initialSymptoms);
  const [loading,  setLoading]  = useState(false);
  const scrollRef               = useRef(null);

  // Si l'utilisateur vient du banner avec des symptômes pré-remplis
  useEffect(() => {
    if (initialSymptoms && initialSymptoms.trim()) {
      setInput(initialSymptoms);
    }
  }, [initialSymptoms]);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg = { id: Date.now(), role: 'user', text: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await api.analyzeSymptoms({ symptoms: msg, lang: 'fr' });
      const answer = res?.analysis || res?.response || res?.result || res?.message
        || (typeof res === 'string' ? res : "Analyse reçue. Consultez votre médecin pour confirmation.");
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant', text: answer,
        disclaimer: "Informations indicatives — consultez un professionnel de santé.",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, role: 'assistant',
        text: "Une erreur s'est produite. Vérifiez votre connexion et réessayez.",
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, loading]);

  const BLUE = c.blue;

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.nav }}>
        <LinearGradient colors={GRADIENTS.primary} style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
          <Brain size={18} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: c.txt }}>Analyse IA</Text>
          <Text style={{ fontSize: 12, color: c.txt2 }}>Non substitutif à un médecin</Text>
        </View>
        <TouchableOpacity
          onPress={() => { setMessages(AI_INIT_MESSAGES); setInput(''); }}
          style={{ padding: 8 }}
        >
          <Clock size={20} color={c.txt3} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <View key={msg.id} style={{ marginBottom: 12 }}>
              {isUser ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: BLUE, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%' }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20 }}>{msg.text}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                  <LinearGradient colors={GRADIENTS.primary} style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                    <Brain size={14} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ backgroundColor: c.card, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: c.border }}>
                      <Text style={{ color: c.txt, fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20 }}>{msg.text}</Text>
                    </View>
                    {msg.disclaimer && (
                      <View style={{ marginTop: 6, backgroundColor: c.amber + '15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: c.amber + '40' }}>
                        <Text style={{ color: c.amber, fontSize: 11, fontFamily: FONTS.regular, fontStyle: 'italic' }}>{msg.disclaimer}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          );
        })}
        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
            <LinearGradient colors={GRADIENTS.primary} style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={14} color="#fff" />
            </LinearGradient>
            <View style={{ backgroundColor: c.card, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: c.border }}>
              <ActivityIndicator size="small" color={BLUE} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={{ borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}
      >
        {AI_CHIPS.map(chip => (
          <TouchableOpacity
            key={chip}
            onPress={() => send(chip)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BLUE + '12', borderWidth: 1, borderColor: BLUE + '30' }}
          >
            <Text style={{ color: BLUE, fontSize: 12, fontFamily: FONTS.semibold }}>{chip}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: dk ? '#1A2333' : '#1E2B3C', borderTopWidth: 1, borderTopColor: c.border }}>
          <TextInput
            style={{ flex: 1, color: '#fff', fontSize: 14, fontFamily: FONTS.regular, maxHeight: 80 }}
            placeholder="Décrivez les symptômes..."
            placeholderTextColor="rgba(255,255,255,0.38)"
            value={input}
            onChangeText={setInput}
            multiline
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            onPress={() => send()}
            disabled={!input.trim() || loading}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || loading ? 0.4 : 1 }}
          >
            <Send size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AppointmentCard({ appt, c, dk, full }) {
  const STATUS_COLORS = {
    confirmed: { color: c.green,  bg: c.green  + '18', label: 'Confirmé' },
    pending:   { color: c.amber,  bg: c.amber  + '18', label: 'En attente' },
    completed: { color: c.blue,   bg: c.blue   + '18', label: 'Terminé' },
    cancelled: { color: c.red,    bg: c.red    + '18', label: 'Annulé' },
  };
  const st = STATUS_COLORS[appt.status] || STATUS_COLORS.pending;

  return (
    <Card dk={dk} style={styles.apptCard}>
      <View style={styles.apptHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.txt }]}>
            Dr. {appt.doctor_name || appt.doctor?.full_name || 'Médecin'}
          </Text>
          <Text style={[styles.cardSub, { color: c.txt2 }]}>
            {appt.doctor_specialty || appt.specialty || ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={{ color: st.color, fontSize: 11, fontFamily: FONTS.bold }}>{st.label}</Text>
        </View>
      </View>
      <View style={styles.apptMeta}>
        <View style={styles.metaRow}>
          <Calendar size={13} color={c.txt3} />
          <Text style={[styles.metaText, { color: c.txt2 }]}>
            {appt.date ? format(new Date(appt.date), 'dd MMM yyyy', { locale: fr }) : '—'}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Clock size={13} color={c.txt3} />
          <Text style={[styles.metaText, { color: c.txt2 }]}>{appt.time || appt.slot_time || '—'}</Text>
        </View>
        {appt.location && (
          <View style={styles.metaRow}>
            <MapPin size={13} color={c.txt3} />
            <Text style={[styles.metaText, { color: c.txt2 }]}>{appt.location}</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

function PrescriptionCard({ rx, c, dk, full, onSend }) {
  const ccStatus = rx.click_collect_status || rx.cc_status;
  const pharmacy = rx.pharmacy_name || rx.pharmacy;

  return (
    <Card dk={dk} style={styles.apptCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.txt }]}>
            {rx.diagnosis || 'Ordonnance'}
          </Text>
          <Text style={[styles.cardSub, { color: c.txt2 }]}>
            Dr. {rx.doctor_name || rx.doctor?.full_name || '—'}
          </Text>
          <Text style={[styles.cardSub, { color: c.txt3 }]}>
            {rx.date ? format(new Date(rx.date), 'dd MMM yyyy', { locale: fr }) : '—'}
          </Text>
        </View>
        
        {!ccStatus && (
          <TouchableOpacity 
            onPress={onSend}
            style={{ backgroundColor: c.blue + '15', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
          >
            <Text style={{ color: c.blue, fontSize: 12, fontFamily: FONTS.bold }}>Transmettre</Text>
          </TouchableOpacity>
        )}
      </View>

      {rx.medications?.length > 0 && (
        <View style={{ marginTop: 12, padding: 10, backgroundColor: dk ? '#1A2333' : '#F8FAFC', borderRadius: 10 }}>
          {rx.medications.map((m, i) => (
            <Text key={i} style={[styles.metaText, { color: c.txt2, marginBottom: 4 }]}>
              • {m.name} — {m.dosage}
            </Text>
          ))}
        </View>
      )}

      {ccStatus && (
        <ClickCollectTracker ccStatus={ccStatus} pharmacy={pharmacy} c={c} dk={dk} />
      )}
    </Card>
  );
}

// ─── Click & Collect Tracker ─────────────────────────────────────────────────
function ClickCollectTracker({ ccStatus, pharmacy, c, dk }) {
  const steps = [
    { key: "sent",      label: "Envoyé",           icon: Send          },
    { key: "preparing", label: "En préparation",    icon: Clock         },
    { key: "ready",     label: "Prêt",             icon: Check         },
  ];
  
  const statusMap = {
    'sent': 0,
    'preparing': 1,
    'ready': 2,
    'collected': 2
  };
  
  const currentIdx = statusMap[ccStatus] ?? -1;

  return (
    <View style={{ mt: 16, pt: 16, borderTopWidth: 1, borderTopColor: c.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Package size={14} color={c.blue} />
        <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: c.txt }}>{pharmacy}</Text>
        <Badge label="Click & Collect" color={c.blue} bg={c.blue + '15'} style={{ marginLeft: 'auto' }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {steps.map((step, i) => {
          const done   = i <= currentIdx;
          const active = i === currentIdx;
          return (
            <React.Fragment key={step.key}>
              <View style={{ alignItems: 'center', gap: 4, flex: 1 }}>
                <View style={{ 
                  width: 32, height: 32, borderRadius: 16, 
                  backgroundColor: done ? c.blue : dk ? '#1E2A3A' : '#E4EAF5',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: active ? 3 : 0, borderColor: c.blue + '44'
                }}>
                  <step.icon size={14} color={done ? '#fff' : c.txt3} />
                </View>
                <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: done ? c.blue : c.txt3 }}>{step.label}</Text>
              </View>
              {i < steps.length - 1 && (
                <View style={{ flex: 1, height: 2, backgroundColor: i < currentIdx ? c.blue : dk ? '#1E2A3A' : '#E4EAF5', marginTop: -14 }} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, gap: 10,
  },
  navLogo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 17, fontFamily: FONTS.bold },
  navIcon: { padding: 6, position: 'relative' },
  badge: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 9, fontFamily: FONTS.bold },
  welcomeBanner: { borderRadius: 20, padding: 20, marginBottom: 16 },
  welcomeHello: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: FONTS.regular },
  welcomeName: { color: '#fff', fontSize: 22, fontFamily: FONTS.extrabold, marginBottom: 4 },
  welcomeSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: FONTS.regular },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%', alignItems: 'center' },
  statValue: { fontSize: 28, fontFamily: FONTS.extrabold },
  statLabel: { fontSize: 12, fontFamily: FONTS.medium, marginTop: 2 },
  apptCard: { marginBottom: 10 },
  apptHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  apptMeta: { gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontFamily: FONTS.regular },
  cardTitle: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 2 },
  cardSub: { fontSize: 13, fontFamily: FONTS.regular },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 13, fontFamily: FONTS.semibold },
  textArea: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 120 },
  btnWrap: { borderRadius: 14, overflow: 'hidden' },
  btn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FONTS.bold },
  aiBanner: { borderRadius: 20, padding: 24, alignItems: 'center' },
  disclaimer: { borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 12 },
});