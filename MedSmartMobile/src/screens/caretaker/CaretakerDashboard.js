import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput, Modal, Switch,
  KeyboardAvoidingView, Platform, Linking, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  House, Bell, MessageSquare, Users, Pill, Brain,
  Plus, Trash2, Clock, ChevronRight,
  Phone, Pencil, X, Check, TriangleAlert,
  User, LogOut, Shield, Lock, Globe,
  CircleCheckBig, Circle, ClipboardList,
  Send, History, Mic, Activity, ChevronDown, ChevronUp, CircleAlert,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { T, FONTS, GRADIENTS } from '../../theme';
import { EmptyState, Avatar } from '../../components/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const PURPLE = '#7B5EA7'; // couleur accent plan de soins + badges

const TABS = [
  { key: 'overview',   label: 'Accueil',     Icon: House  },
  { key: 'patients',   label: 'Patients',    Icon: Users },
  { key: 'ai',         label: 'IA',          Icon: Brain },
  { key: 'treatments', label: 'Traitements', Icon: Pill  },
  { key: 'offers',     label: 'Offres',      Icon: Bell  },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function CaretakerDashboardScreen() {
  const { userData, logout, avatarUri } = useAuth();
  const { dk }  = useTheme();
  const { refresh }          = useData();
  const c = dk ? T.dark : T.light;

  const [activeTab, setActiveTab]         = useState('overview');
  const [refreshing, setRefreshing]       = useState(false);
  const [patients, setPatients]           = useState([]);
  const [tasks, setTasks]                 = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [offers, setOffers]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [pts, tks, rxs, offs] = await Promise.allSettled([
        api.getCaretakerPatients(),
        api.getCaretakerTasks(),
        api.getCaretakerPatientsPrescriptions(),
        api.getCareRequests(),
      ]);
      if (pts.status  === 'fulfilled') setPatients(Array.isArray(pts.value)  ? pts.value  : pts.value?.results  || []);
      if (tks.status  === 'fulfilled') setTasks(Array.isArray(tks.value)     ? tks.value  : tks.value?.results  || []);
      if (rxs.status  === 'fulfilled') setPrescriptions(Array.isArray(rxs.value) ? rxs.value : rxs.value?.results || []);
      if (offs.status === 'fulfilled') setOffers(Array.isArray(offs.value)   ? offs.value : offs.value?.results || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadData()]);
    setRefreshing(false);
  }, [refresh, loadData]);

  // Optimistic task toggle
  const toggleTask = useCallback(async (task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    try { await api.updateCaretakerTask(task.id, { completed: !task.completed }); }
    catch { setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: task.completed } : t)); }
  }, []);

  const deleteTask = useCallback((taskId) => {
    Alert.alert('Supprimer', 'Supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        api.deleteCaretakerTask(taskId).catch(() => loadData());
      }},
    ]);
  }, [loadData]);

  const initials = useMemo(() =>
    ((userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || '')).toUpperCase() || 'GM',
  [userData]);

  const fullName = `${userData?.first_name || ''} ${userData?.last_name || ''}`.trim();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── Header — identique au patient ── */}
      <View style={[s.navbar, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <LinearGradient colors={GRADIENTS.primary} style={s.navLogo}>
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>+</Text>
        </LinearGradient>
        <Text style={[s.navBrand, { color: c.txt }]}>Healy</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => router.push('/(app)/chat')} style={s.navIcon}>
          <MessageSquare size={20} color={c.txt2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(app)/notifications')} style={s.navIcon}>
          <Bell size={20} color={c.txt2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(app)/caretaker/profile')} style={s.navIcon}>
          <Avatar firstName={userData?.first_name || ''} lastName={userData?.last_name || ''} size={34} uri={avatarUri} />
        </TouchableOpacity>
      </View>

      {/* ── AI tab — hors ScrollView ── */}
      {activeTab === 'ai' && (
        <AITab c={c} dk={dk} userData={userData} />
      )}

      {/* ── Scrollable content ── */}
      {activeTab !== 'ai' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 110 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
        >
          {activeTab === 'overview'   && <OverviewTab   c={c} dk={dk} userData={userData} patients={patients} tasks={tasks} offers={offers} loading={loading} onEmergency={() => setShowEmergency(true)} onTabChange={setActiveTab} />}
          {activeTab === 'offers'     && <OffersTab     c={c} dk={dk} offers={offers} onRefresh={loadData} />}
          {activeTab === 'patients'   && <PatientsTab   c={c} dk={dk} patients={patients} setPatients={setPatients} />}
          {activeTab === 'treatments' && <TreatmentsTab c={c} dk={dk} patients={patients} prescriptions={prescriptions} onPlanAdded={(plan) => setPatients(prev => prev.map(p => p.id === plan.patientId ? { ...p, medications: [...(p.medications||[]), ...plan.medications] } : p))} />}
        </ScrollView>
      )}

      {/* ── Bottom Tab Bar flottante ── */}
      <View style={[s.tabBar, { backgroundColor: c.nav }]}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setActiveTab(key)}
              style={s.tabItem}
              activeOpacity={0.7}
            >
              <Icon size={22} color={active ? c.blue : c.txt3} strokeWidth={active ? 2.5 : 1.8} />
              <Text style={[s.tabLabel, { color: active ? c.blue : c.txt3 }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Emergency Modal ── */}
      <EmergencyModal visible={showEmergency} onClose={() => setShowEmergency(false)} c={c} />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMERGENCY MODAL
// ─────────────────────────────────────────────────────────────────────────────
function EmergencyModal({ visible, onClose, c }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
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
            <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.regular }}>
              Ceci alertera les services d'urgence et mettra le patient en relation avec les secours de proximité.
            </Text>
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
              onPress={() => Alert.alert('Position partagée', 'Votre position a été partagée avec les secours.')}
              style={{ backgroundColor: 'rgba(224,85,85,0.06)', borderWidth: 1, borderColor: 'rgba(224,85,85,0.15)', paddingVertical: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <CircleCheckBig size={16} color="#E05555" />
              <Text style={{ color: '#E05555', fontSize: 15, fontFamily: FONTS.semibold }}>Partager ma position</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, alignItems: 'center' }}>
            <Text style={{ color: c.txt3, fontSize: 14, fontFamily: FONTS.medium }}>Annuler — Tout va bien</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab({ c, dk, userData, patients, tasks, offers, loading, onEmergency, onTabChange }) {
  if (loading) return <ActivityIndicator color={PURPLE} style={{ marginTop: 60 }} />;

  const pendingOffers  = offers.filter(o => o.status === 'pending');
  const totalMeds      = patients.reduce((acc, p) => acc + (p.medications?.length || 0), 0);
  const nextPatient    = patients[0];
  const nextName       = nextPatient
    ? `${nextPatient.first_name || ''} ${nextPatient.last_name || ''}`.trim() || 'Patient'
    : '—';

  return (
    <View style={{ padding: 16 }}>
      {/* Header */}
      <View style={s.overviewHeader}>
        <View>
          <Text style={[s.greeting, { color: c.txt }]}>
            Bonjour, {userData?.first_name || '—'}
          </Text>
          <Text style={[s.dateText, { color: c.txt2 }]}>
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr }).replace(/^\w/, ch => ch.toUpperCase())}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onEmergency}
          style={[s.urgenceBtn, { backgroundColor: '#E05555' + '18', borderColor: '#E05555' + '50' }]}
        >
          <TriangleAlert size={13} color="#E05555" />
          <Text style={{ color: '#E05555', fontSize: 12, fontFamily: FONTS.bold, marginLeft: 5 }}>URGENCE</Text>
        </TouchableOpacity>
      </View>

      {/* KPI 2×2 */}
      <View style={s.kpiGrid}>
        <KpiCard value={patients.length}      label="PATIENTS ASSIGNÉS"      icon={<Users size={18} color={PURPLE} />}    c={c} onPress={() => onTabChange('patients')} />
        <KpiCard value={totalMeds}            label="MÉDICAMENTS AUJOURD'HUI" icon={<Pill size={18} color="#E8A838" />}   c={c} onPress={() => onTabChange('treatments')} />
        <KpiCard value={pendingOffers.length} label="NOUVELLES OFFRES"        icon={<Bell size={18} color="#4A6FA5" />}   c={c} onPress={() => onTabChange('offers')} />
        <KpiCard value={nextName}             label="PROCHAIN PATIENT"        icon={<User size={18} color={PURPLE} />}    c={c} isText onPress={() => onTabChange('patients')} />
      </View>

      {/* Mes patients */}
      <SectionRow title="Mes patients" action="Voir tout" onAction={() => onTabChange('patients')} c={c} />
      {patients.length === 0
        ? <EmptyState icon={<Users size={40} color={c.txt3} />} title="Aucun patient assigné" dk={dk} />
        : patients.slice(0, 3).map((p, i) => <PatientCompactRow key={p.id || i} patient={p} c={c} onTabChange={onTabChange} />)
      }

      {/* Nouvelles offres */}
      <SectionRow title="Nouvelles offres" action="Voir tout" onAction={() => onTabChange('offers')} c={c} style={{ marginTop: 20 }} />
      {pendingOffers.length === 0
        ? <EmptyState icon={<ClipboardList size={40} color={c.txt3} />} title="Aucune offre en attente" dk={dk} />
        : pendingOffers.slice(0, 3).map((o, i) => <OfferCompactRow key={o.id || i} offer={o} c={c} />)
      }
    </View>
  );
}

const KpiCard = memo(function KpiCard({ value, label, icon, c, isText, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={[s.kpiCard, { backgroundColor: c.card, borderColor: c.border }]}
    >
      {icon}
      {isText
        ? <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, marginTop: 8, marginBottom: 2 }} numberOfLines={1}>{value}</Text>
        : <Text style={{ fontSize: 26, fontFamily: FONTS.extrabold, color: c.txt, marginTop: 8 }}>{value}</Text>
      }
      <Text style={{ fontSize: 9, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

function SectionRow({ title, action, onAction, c, style }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, style]}>
      <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.txt }}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: PURPLE, fontSize: 13, fontFamily: FONTS.semibold }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const PatientCompactRow = memo(function PatientCompactRow({ patient, c, onTabChange }) {
  // Le backend renvoie parfois les infos patient dans un sous-objet "patient" ou "user"
  const p    = patient.patient || patient.user || patient;
  const name = `${p.first_name || ''} ${p.last_name || ''}`.trim()
    || p.full_name || patient.patient_name || 'Patient';
  const initials= name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const sub     = p.condition || patient.condition || (p.age ? `${p.age} ans` : '');
  return (
    <TouchableOpacity
      onPress={() => onTabChange?.('patients')}
      style={[s.compactRow, { backgroundColor: c.card, borderColor: c.border }]}
    >
      <View style={[s.circleAvatar, { backgroundColor: PURPLE + '22' }]}>
        <Text style={{ color: PURPLE, fontSize: 13, fontFamily: FONTS.bold }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt }}>{name}</Text>
        {!!sub && <Text style={{ fontSize: 12, color: c.txt2 }}>{sub}</Text>}
      </View>
      <View style={[s.smallBtn, { borderColor: c.border }]}>
        <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: c.txt2 }}>Profil</Text>
      </View>
    </TouchableOpacity>
  );
});

const OfferCompactRow = memo(function OfferCompactRow({ offer, c }) {
  // patient_name (flat) OU patient.full_name OU patient.first_name + last_name (nested)
  const p    = offer.patient || {};
  const name = offer.patient_name
    || p.full_name
    || `${p.first_name || ''} ${p.last_name || ''}`.trim()
    || 'Patient';
  const initials= name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const colors  = ['#4CAF82', '#4A6FA5', '#E8A838'];
  const col     = colors[name.charCodeAt(0) % colors.length];
  return (
    <View style={[s.compactRow, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={[s.circleAvatar, { backgroundColor: col + '22' }]}>
        <Text style={{ color: col, fontSize: 13, fontFamily: FONTS.bold }}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt }}>{name}</Text>
        <Text style={{ fontSize: 12, color: c.txt2 }}>{offer.location || offer.address || 'Emplacement non précisé'}</Text>
      </View>
      <ChevronRight size={18} color={c.txt3} />
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// OFFERS TAB
// ─────────────────────────────────────────────────────────────────────────────
function OffersTab({ c, dk, offers, onRefresh }) {
  const pendingOffers = useMemo(() => offers.filter(o => o.status === 'pending'), [offers]);
  const [processing, setProcessing] = useState(null);

  async function handleAction(id, action) {
    setProcessing(id);
    try {
      // POST /api/caretaker/requests/{id}/respond_to_offer/  { status: 'accepted' | 'rejected' }
      await api.respondToOffer(id, action === 'accept' ? 'accepted' : 'rejected');
      Alert.alert(
        action === 'accept' ? 'Offre acceptée' : 'Offre refusée',
        action === 'accept'
          ? 'La mission a été acceptée. Le patient apparaîtra dans votre liste.'
          : 'L\'offre a été refusée.',
      );
      onRefresh();
    } catch (e) {
      Alert.alert('Erreur', e.message || 'Impossible de traiter cette offre.');
    } finally { setProcessing(null); }
  }

  return (
    <View style={{ padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <View>
          <Text style={{ fontSize: 22, fontFamily: FONTS.bold, color: c.txt }}>Offres & Missions</Text>
          <Text style={{ fontSize: 13, color: c.txt2, marginTop: 3 }}>Nouvelles opportunités dans votre zone</Text>
        </View>
        <View style={[s.dispoChip, { borderColor: c.border, backgroundColor: c.card }]}>
          <Users size={12} color={c.txt3} />
          <Text style={{ fontSize: 11, color: c.txt3, fontFamily: FONTS.semibold, marginLeft: 4 }}>
            {pendingOffers.length} dispo.
          </Text>
        </View>
      </View>

      {pendingOffers.length === 0 ? (
        <View style={[s.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.green + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Check size={26} color={c.green} />
          </View>
          <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt }}>Aucune nouvelle offre</Text>
          <Text style={{ fontSize: 13, color: c.txt2, marginTop: 4 }}>Toutes les missions ont été traitées</Text>
        </View>
      ) : (
        pendingOffers.map((off, i) => (
          <View key={off.id || i} style={[s.offerCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.txt }}>
                  {off.patient_name
                    || off.patient?.full_name
                    || `${off.patient?.first_name || ''} ${off.patient?.last_name || ''}`.trim()
                    || 'Patient'}
                </Text>
                <Text style={{ fontSize: 13, color: c.txt2 }}>{off.duration || 'Durée non spécifiée'}</Text>
              </View>
              <Text style={{ fontSize: 17, fontFamily: FONTS.extrabold, color: PURPLE }}>{off.price || '—'} DA</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => handleAction(off.id, 'accept')}
                disabled={!!processing}
                style={[s.offerBtnFill, { backgroundColor: PURPLE }]}
              >
                {processing === off.id
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>Accepter</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAction(off.id, 'refuse')}
                disabled={!!processing}
                style={[s.offerBtnOutline, { borderColor: c.red + '60' }]}
              >
                <Text style={{ color: c.red, fontFamily: FONTS.bold, fontSize: 14 }}>Refuser</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function PatientsTab({ c, dk, patients, setPatients }) {
  const [detailPatient, setDetailPatient] = useState(null);

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontFamily: FONTS.bold, color: c.txt }}>Mes patients</Text>
      <Text style={{ fontSize: 13, color: c.txt2, marginTop: 3, marginBottom: 16 }}>
        {patients.length} patient{patients.length !== 1 ? 's' : ''} assigné{patients.length !== 1 ? 's' : ''} à votre charge
      </Text>

      {patients.length === 0
        ? <EmptyState icon={<Users size={40} color={c.txt3} />} title="Aucun patient assigné" subtitle="Vos patients apparaîtront ici" dk={dk} />
        : patients.map((p, i) => (
            <PatientFullCard key={p.id || i} patient={p} c={c} dk={dk}
              onViewProfile={() => setDetailPatient(p)}
            />
          ))
      }

      {/* Patient detail modal */}
      {detailPatient && (
        <Modal visible transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 44 }}>
              <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: c.txt }}>Profil patient</Text>
                <TouchableOpacity onPress={() => setDetailPatient(null)}>
                  <X size={22} color={c.txt3} />
                </TouchableOpacity>
              </View>

              {(() => {
                // Le backend renvoie les infos patient dans un sous-objet .patient ou .user
                const raw  = detailPatient;
                const p    = raw.patient || raw.user || raw;
                const name = `${p.first_name || ''} ${p.last_name || ''}`.trim()
                  || p.full_name || raw.patient_name || 'Patient';
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                const phone = p.phone || raw.phone;
                const genderVal = p.gender || raw.gender;
                const genderLabel = genderVal === 'male' || genderVal === 'homme' ? 'Homme'
                  : genderVal === 'female' || genderVal === 'femme' ? 'Femme' : genderVal;
                const rows = [
                  (p.age || raw.age)       && { icon: '🎂', label: 'Âge',        value: `${p.age || raw.age} ans` },
                  genderLabel              && { icon: '👤', label: 'Genre',       value: genderLabel },
                  phone                    && { icon: '📞', label: 'Téléphone',   value: phone },
                  (p.email || raw.email)   && { icon: '✉️', label: 'Email',       value: p.email || raw.email },
                  (p.wilaya || raw.wilaya) && { icon: '📍', label: 'Wilaya',      value: p.wilaya || raw.wilaya },
                  p.condition              && { icon: '🏥', label: 'Condition',   value: p.condition },
                ].filter(Boolean);
                return (
                  <>
                    {/* Avatar + nom centré */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: PURPLE + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                        <Text style={{ color: PURPLE, fontSize: 24, fontFamily: FONTS.bold }}>{initials}</Text>
                      </View>
                      <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt, textAlign: 'center' }}>{name}</Text>
                    </View>

                    {/* Champs supplémentaires ou message si aucun */}
                    {rows.length === 0 ? (
                      <Text style={{ color: c.txt3, fontFamily: FONTS.regular, fontSize: 13, textAlign: 'center', marginBottom: 8 }}>
                        Aucune information supplémentaire disponible.
                      </Text>
                    ) : (
                      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden', marginBottom: 4 }}>
                        {rows.map((r, i) => (
                          <View
                            key={r.label}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              paddingVertical: 12,
                              paddingHorizontal: 14,
                              backgroundColor: i % 2 === 0 ? 'transparent' : (dk ? '#ffffff08' : '#00000004'),
                              borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                              borderBottomColor: c.border,
                            }}
                          >
                            <Text style={{ fontSize: 15, marginRight: 10 }}>{r.icon}</Text>
                            <Text style={{ color: c.txt2, fontFamily: FONTS.medium, fontSize: 13, width: 90 }}>{r.label}</Text>
                            <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 13, flex: 1, textAlign: 'right' }}>{r.value}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Bouton appeler */}
                    {!!phone && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${phone}`)}
                        style={{ marginTop: 14, backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        <Phone size={16} color="#fff" />
                        <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Appeler le patient</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const PatientFullCard = memo(function PatientFullCard({ patient, c, dk, onViewProfile }) {
  // Le backend renvoie parfois les données patient dans un sous-objet
  const p        = patient.patient || patient.user || patient;
  const name     = `${p.first_name || ''} ${p.last_name || ''}`.trim()
    || p.full_name || patient.patient_name || 'Patient';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const age      = p.age    ? `${p.age} ANS`                                              : '';
  const gender   = (p.gender || patient.gender) === 'male' || (p.gender || patient.gender) === 'homme' ? 'HOMME'
                 : (p.gender || patient.gender) === 'female' || (p.gender || patient.gender) === 'femme' ? 'FEMME' : '';
  const location = p.wilaya || p.commune || patient.wilaya || '';
  const meta     = [age, gender, location].filter(Boolean).join(' · ');
  const conditions = p.conditions || (p.condition ? [p.condition] : []) || (patient.condition ? [patient.condition] : []);

  return (
    <View style={[s.fullCard, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Avatar + meta */}
      <View style={{ alignItems: 'center', marginBottom: 14 }}>
        <View style={[s.bigCircle, { backgroundColor: PURPLE + '22' }]}>
          <Text style={{ color: PURPLE, fontSize: 20, fontFamily: FONTS.bold }}>{initials}</Text>
        </View>
        <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: c.txt, marginTop: 10 }}>{name}</Text>
        {!!meta && <Text style={{ fontSize: 12, color: c.txt2, marginTop: 3 }}>{meta}</Text>}
        {conditions.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 8 }}>
            {conditions.map((cond, ci) => (
              <View key={ci} style={[s.condChip, { backgroundColor: PURPLE + '12', borderColor: PURPLE + '30' }]}>
                <Text style={{ fontSize: 11, color: PURPLE, fontFamily: FONTS.medium }}>{cond}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {/* Buttons */}
      <View style={{ gap: 8 }}>
        <TouchableOpacity
          onPress={onViewProfile}
          style={[s.actionRow, { borderColor: c.border }]}
        >
          <User size={16} color={c.txt2} />
          <Text style={{ color: c.txt, fontFamily: FONTS.medium, fontSize: 14, marginLeft: 10 }}>Voir profil</Text>
          <ChevronRight size={15} color={c.txt3} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Traitements',
              patient.medications?.length > 0
                ? `${name} a ${patient.medications.length} traitement(s) actif(s).\n\nConsultez l'onglet Traitements pour les détails.`
                : `Aucun traitement actif pour ${name} pour le moment.`,
              [{ text: 'OK' }]
            );
          }}
          style={[s.actionRow, { borderColor: c.border }]}
        >
          <Pill size={16} color={c.txt2} />
          <Text style={{ color: c.txt, fontFamily: FONTS.medium, fontSize: 14, marginLeft: 10 }}>Traitements</Text>
          <ChevronRight size={15} color={c.txt3} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
        {(() => {
          const phone = p.phone || patient.phone;
          return (
            <TouchableOpacity
              onPress={() => {
                if (phone) {
                  Linking.openURL(`tel:${phone}`);
                } else {
                  Alert.alert('Alerter', 'Aucun numéro de téléphone enregistré pour ce patient.');
                }
              }}
              style={[s.actionRow, { borderColor: '#E05555' + '50', backgroundColor: '#E05555' + '08' }]}
            >
              <Phone size={16} color="#E05555" />
              <Text style={{ color: '#E05555', fontFamily: FONTS.medium, fontSize: 14, marginLeft: 10 }}>
                {phone ? `Appeler · ${phone}` : 'Alerter (aucun tel.)'}
              </Text>
            </TouchableOpacity>
          );
        })()}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// TREATMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function TreatmentsTab({ c, dk, patients, prescriptions, onPlanAdded }) {
  const [showPlan, setShowPlan] = useState(false);
  const [localPatients, setLocalPatients] = useState(patients);

  // Sync when patients prop changes
  React.useEffect(() => { setLocalPatients(patients); }, [patients]);

  const count = localPatients.length;

  function handlePlanSaved(plan) {
    setLocalPatients(prev => prev.map(p =>
      p.id === plan.patientId
        ? { ...p, medications: [...(p.medications || []), ...plan.medications] }
        : p
    ));
    onPlanAdded?.(plan);
    setShowPlan(false);
    Alert.alert('Plan ajouté', `Le plan de soins a été enregistré pour ${plan.patientName}.`);
  }

  return (
    <View style={{ padding: 16 }}>
      <PlanModal
        visible={showPlan}
        onClose={() => setShowPlan(false)}
        onSave={handlePlanSaved}
        patients={localPatients}
        c={c} dk={dk}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 22, fontFamily: FONTS.bold, color: c.txt }}>Traitements</Text>
          <Text style={{ fontSize: 13, color: c.txt2, marginTop: 3 }}>{count} patient(s) au planning</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowPlan(true)}
          style={[s.planBtn, { backgroundColor: PURPLE }]}
        >
          <Plus size={14} color="#fff" />
          <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13, marginLeft: 4 }}>Plan</Text>
        </TouchableOpacity>
      </View>

      {localPatients.length === 0 && prescriptions.length === 0 ? (
        <EmptyState icon={<Pill size={40} color={c.txt3} />} title="Aucun traitement" subtitle="Les traitements de vos patients apparaîtront ici" dk={dk} />
      ) : (
        localPatients.map((p, pi) => {
          const name     = `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.full_name || 'Patient';
          const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const cond     = p.condition || '';
          const rxMeds   = prescriptions
            .filter(rx => rx.patient_id === p.id || rx.patient === p.id)
            .flatMap(rx => rx.medications || []);
          const meds     = rxMeds.length > 0 ? rxMeds : (p.medications || []);
          if (meds.length === 0) return null;
          return (
            <TreatmentCard
              key={p.id || pi}
              name={name} initials={initials} condition={cond}
              medications={meds} c={c} dk={dk}
            />
          );
        })
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN MODAL — Créer un plan de soins pour un patient
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS_LIST = [
  { key: 'matin',  label: 'Matin',      color: '#E8A838' },
  { key: 'midi',   label: 'Après-midi', color: PURPLE },
  { key: 'soir',   label: 'Soir',       color: '#4A6FA5' },
];

function PlanModal({ visible, onClose, onSave, patients, c, dk }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [medName,  setMedName]  = useState('');
  const [dosage,   setDosage]   = useState('');
  const [period,   setPeriod]   = useState('matin');
  const [meds,     setMeds]     = useState([]);
  const [saving,   setSaving]   = useState(false);

  function reset() {
    setSelectedPatient(null);
    setMedName('');
    setDosage('');
    setPeriod('matin');
    setMeds([]);
  }

  function addMed() {
    if (!medName.trim()) { Alert.alert('Champ requis', 'Entrez le nom du médicament.'); return; }
    setMeds(prev => [...prev, { name: medName.trim(), dosage: dosage.trim(), frequency: period, period }]);
    setMedName('');
    setDosage('');
  }

  function removeMed(idx) {
    setMeds(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!selectedPatient) { Alert.alert('Patient requis', 'Sélectionnez un patient.'); return; }
    if (meds.length === 0) { Alert.alert('Aucun médicament', 'Ajoutez au moins un médicament au plan.'); return; }
    setSaving(true);
    try {
      await api.addTreatmentToPatient(selectedPatient.id, { medications: meds }).catch(() => {});
      onSave({ patientId: selectedPatient.id, patientName: `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim(), medications: meds });
      reset();
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '92%' }}>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>Nouveau plan de soins</Text>
                <Text style={{ fontSize: 13, color: c.txt2, marginTop: 2 }}>Programmez les médicaments du patient</Text>
              </View>
              <TouchableOpacity onPress={() => { reset(); onClose(); }} style={{ padding: 4 }}>
                <X size={22} color={c.txt3} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Patient selector */}
              <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt2, marginBottom: 8 }}>Patient</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}
                contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
                {patients.length === 0 ? (
                  <Text style={{ color: c.txt3, fontSize: 13 }}>Aucun patient assigné</Text>
                ) : patients.map((p) => {
                  const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient';
                  const sel  = selectedPatient?.id === p.id;
                  return (
                    <TouchableOpacity key={p.id}
                      onPress={() => setSelectedPatient(p)}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
                        backgroundColor: sel ? PURPLE : (dk ? '#1A2333' : '#F0EEF8'),
                        borderWidth: 1.5, borderColor: sel ? PURPLE : 'transparent' }}
                    >
                      <Text style={{ color: sel ? '#fff' : c.txt, fontSize: 13, fontFamily: FONTS.semibold }}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Add medication form */}
              <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt2, marginBottom: 8 }}>Ajouter un médicament</Text>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput
                  value={medName}
                  onChangeText={setMedName}
                  placeholder="Nom du médicament"
                  placeholderTextColor={c.txt3}
                  style={{ flex: 2, backgroundColor: dk ? '#1A2333' : '#F5F5F8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.txt, fontSize: 14, fontFamily: FONTS.regular, borderWidth: 1, borderColor: c.border }}
                />
                <TextInput
                  value={dosage}
                  onChangeText={setDosage}
                  placeholder="Dosage"
                  placeholderTextColor={c.txt3}
                  style={{ flex: 1, backgroundColor: dk ? '#1A2333' : '#F5F5F8', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: c.txt, fontSize: 14, fontFamily: FONTS.regular, borderWidth: 1, borderColor: c.border }}
                />
              </View>

              {/* Period selector */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {PERIODS_LIST.map(per => (
                  <TouchableOpacity key={per.key}
                    onPress={() => setPeriod(per.key)}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
                      backgroundColor: period === per.key ? per.color : (dk ? '#1A2333' : '#F0EEF8'),
                      borderWidth: 1, borderColor: period === per.key ? per.color : c.border }}
                  >
                    <Text style={{ color: period === per.key ? '#fff' : c.txt2, fontSize: 12, fontFamily: FONTS.semibold }}>{per.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={addMed}
                style={{ backgroundColor: PURPLE + '18', borderWidth: 1.5, borderColor: PURPLE + '50', borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginBottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                <Plus size={15} color={PURPLE} />
                <Text style={{ color: PURPLE, fontFamily: FONTS.semibold, fontSize: 14 }}>Ajouter au plan</Text>
              </TouchableOpacity>

              {/* Meds list */}
              {meds.length > 0 && (
                <View style={{ backgroundColor: dk ? '#0F1822' : '#F8F8FC', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: c.border }}>
                  <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: c.txt2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Plan ({meds.length} médicament{meds.length > 1 ? 's' : ''})</Text>
                  {meds.map((m, i) => {
                    const per = PERIODS_LIST.find(p => p.key === m.period) || PERIODS_LIST[0];
                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, backgroundColor: dk ? '#1A2333' : '#fff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: c.border }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: per.color }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt }}>{m.name}{m.dosage ? ` — ${m.dosage}` : ''}</Text>
                          <Text style={{ fontSize: 11, color: per.color, fontFamily: FONTS.medium }}>{per.label}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeMed(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <X size={15} color={c.red} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Save button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', opacity: saving ? 0.7 : 1, marginBottom: 8 }}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONTS.bold }}>Enregistrer le plan</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const PERIODS = [
  { key: 'matin',    label: 'MATIN',      color: '#E8A838', keywords: ['matin', 'morning', 'am'] },
  { key: 'midi',     label: 'APRÈS-MIDI', color: PURPLE,    keywords: ['midi', 'après-midi', 'afternoon', 'pm'] },
  { key: 'soir',     label: 'SOIR',       color: '#4A6FA5', keywords: ['soir', 'evening', 'night'] },
];

function groupMeds(meds) {
  const groups = { matin: [], midi: [], soir: [], other: [] };
  meds.forEach(m => {
    const key = (m.frequency || m.time_of_day || m.period || '').toLowerCase();
    const period = PERIODS.find(p => p.keywords.some(kw => key.includes(kw)));
    if (period) groups[period.key].push(m);
    else groups.other.push(m);
  });
  return groups;
}

const TreatmentCard = memo(function TreatmentCard({ name, initials, condition, medications: initMeds, c, dk }) {
  const [meds, setMeds] = useState(initMeds);
  const groups     = useMemo(() => groupMeds(meds), [meds]);
  const showGroups = PERIODS.filter(p => groups[p.key].length > 0);
  const others     = groups.other;

  function deleteMed(medName) {
    Alert.alert('Supprimer', `Supprimer "${medName}" de la liste ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => setMeds(prev => prev.filter(m => (m.name || m.medication_name) !== medName)) },
    ]);
  }

  return (
    <View style={[s.treatCard, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Patient header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={[s.smallCircle, { backgroundColor: PURPLE + '22' }]}>
          <Text style={{ color: PURPLE, fontSize: 13, fontFamily: FONTS.bold }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt }}>{name}</Text>
          {!!condition && <Text style={{ fontSize: 12, color: c.txt2 }} numberOfLines={1}>{condition}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => Alert.alert('Modifier plan', `Modifier le plan de ${name} ?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Modifier', onPress: () => Alert.alert('Info', 'Modification complète disponible dans la version web Healy.') },
          ])}
          style={{ padding: 6 }}
        >
          <Pencil size={15} color={c.txt3} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert('Supprimer plan', `Supprimer le plan de soins de ${name} ?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => setMeds([]) },
          ])}
          style={{ padding: 6 }}
        >
          <Trash2 size={15} color={c.red} />
        </TouchableOpacity>
      </View>

      {showGroups.map(p => (
        <MedGroup key={p.key} label={p.label} color={p.color} meds={groups[p.key]} c={c} dk={dk} onDelete={deleteMed} />
      ))}
      {others.length > 0 && showGroups.length === 0 && (
        <MedGroup label="MATIN" color="#E8A838" meds={others} c={c} dk={dk} onDelete={deleteMed} />
      )}
      {meds.length === 0 && (
        <Text style={{ color: c.txt3, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 }}>
          Aucun médicament dans ce plan
        </Text>
      )}
    </View>
  );
});

function MedGroup({ label, color, meds, c, dk, onDelete }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <Clock size={12} color={color} />
        <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
      </View>
      {meds.map((m, i) => {
        const medName = m.name || m.medication_name || m.drug_name || 'Médicament';
        return (
          <View key={i} style={[s.medRow, { backgroundColor: dk ? '#1A2333' : '#F6F8FC', borderColor: c.border }]}>
            <Pill size={14} color={PURPLE} />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: FONTS.medium, color: c.txt, marginLeft: 8 }}>
              {medName}{m.dosage ? ` ${m.dosage}` : ''}
            </Text>
            <TouchableOpacity onPress={() => onDelete?.(medName)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Trash2 size={14} color={c.red} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI TAB — identique à AIScreen patient
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_SYMPTOMS = [
  'Maux de tête', 'Fièvre', 'Fatigue',
  'Douleur thoracique', 'Nausées', 'Toux', 'Essoufflement',
];

function AITab({ c, dk }) {
  const scrollRef = React.useRef(null);

  const [sessions,       setSessions]       = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [loadingHistory, setLoadingHistory]  = useState(true);
  const [historyOpen,    setHistoryOpen]    = useState(false);
  const [resultsOpen,    setResultsOpen]    = useState(true);
  const [lastResult,     setLastResult]     = useState(null);

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const stored = await AsyncStorage.getItem('@ai_sessions_caretaker');
      if (stored) setSessions(JSON.parse(stored));
    } catch { }
    finally { setLoadingHistory(false); }
  }

  async function saveSessionLocally(userText, botText) {
    const newSession = {
      id: Date.now(),
      symptoms: userText,
      analysis: botText,
      created_at: new Date().toISOString(),
    };
    const stored = await AsyncStorage.getItem('@ai_sessions_caretaker').catch(() => null);
    const prev = stored ? JSON.parse(stored) : [];
    const updated = [newSession, ...prev].slice(0, 20);
    await AsyncStorage.setItem('@ai_sessions_caretaker', JSON.stringify(updated)).catch(() => {});
    setSessions(updated);
  }

  function newSession() {
    setCurrentSession(null);
    setMessages([]);
    setInput('');
    setLastResult(null);
    setHistoryOpen(false);
  }

  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg) return;
    const userMsg = { role: 'user', content: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.analyzeSymptoms({ symptoms: msg, lang: 'fr', session_id: currentSession });
      // Texte brut pour le chat — backend retourne "response" (pas "diagnosis")
      let analysis = typeof res === 'string' ? res
        : res?.response || res?.diagnosis || res?.analysis || res?.result || res?.message || '';
      if (res && typeof res === 'object' && !analysis) analysis = JSON.stringify(res, null, 2);

      // Données structurées — backend retourne name_fr, urgency (pas urgency_level), recommended_doctors[]
      const diseases = Array.isArray(res?.diseases)
        ? res.diseases.map(d => typeof d === 'string' ? d : (d.name_fr || d.name_en || d.name || d.disease || '')).filter(Boolean)
        : [];
      const rawUrgency = res?.urgency_level || res?.urgency || null;
      const urgencyMap = { faible: 'low', low: 'low', 'modéré': 'medium', modere: 'medium', moderate: 'medium', medium: 'medium', urgent: 'high', high: 'high', critical: 'critical' };
      const urgencyLevel = rawUrgency ? (urgencyMap[rawUrgency.toLowerCase()] || rawUrgency) : null;
      const recommendations = res?.recommendations || res?.recommendation || res?.suggestions || null;
      const caveats = res?.caveats ? (Array.isArray(res.caveats) ? res.caveats.join('\n') : String(res.caveats)) : null;

      const botMsg = { role: 'bot', content: analysis, ts: new Date() };
      setMessages(prev => [...prev, botMsg]);
      setLastResult({ text: analysis, diseases, urgencyLevel, recommendations, caveats, ts: new Date() });
      setResultsOpen(true);
      if (res?.session_id) setCurrentSession(res.session_id);
      saveSessionLocally(msg, analysis);
    } catch (e) {
      const isTimeout = e.message?.includes('répondu après') || e.message?.includes('timeout');
      setMessages(prev => [...prev, {
        role: 'error',
        content: isTimeout
          ? "L'analyse a pris trop de temps. Le modèle IA est peut-être surchargé — réessayez dans quelques secondes."
          : `Erreur : ${e.message}`,
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  function selectSession(session) {
    setCurrentSession(session.id);
    const msgs = [];
    if (session.symptoms) msgs.push({ role: 'user', content: session.symptoms, ts: new Date(session.created_at) });
    if (session.result || session.analysis) msgs.push({ role: 'bot', content: session.result || session.analysis, ts: new Date(session.created_at) });
    setMessages(msgs);
    if (session.result || session.analysis) setLastResult({ text: session.result || session.analysis, ts: new Date(session.created_at) });
    setHistoryOpen(false);
  }

  const hasConversation = messages.length > 0;
  const BOT_INTRO = `Nouvelle session. Décrivez les symptômes du patient en détail — localisation, intensité, durée — et je vous fournirai une analyse immédiate.`;
  const BOT_DISCLAIMER = `Ces informations sont indicatives et ne remplacent pas un avis médical. Consultez un professionnel de santé pour un diagnostic adapté.`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>

      {/* ── HEADER ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.nav, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: dk ? 'rgba(255,255,255,0.06)' : '#EEF3FB' }}>
          <History size={14} color={c.blue} />
          <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.txt }}>Diagnostic IA</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => setHistoryOpen(true)}
          style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: dk ? 'rgba(255,255,255,0.06)' : '#EEF3FB' }}
        >
          <History size={16} color={c.blue} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={newSession}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: c.blue }}
        >
          <Plus size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: FONTS.bold }}>Nouvelle session</Text>
        </TouchableOpacity>
      </View>

      {/* ── PANNEAU RÉSULTATS ── */}
      {(lastResult || !hasConversation) && (
        <View style={{ borderBottomWidth: 1, paddingBottom: 0, backgroundColor: dk ? '#141B27' : '#F8FAFC', borderBottomColor: c.border }}>
          <TouchableOpacity
            onPress={() => setResultsOpen(r => !r)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Activity size={16} color={c.blue} />
              <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt }}>Résultats & Recommandations</Text>
            </View>
            {resultsOpen ? <ChevronUp size={16} color={c.txt3} /> : <ChevronDown size={16} color={c.txt3} />}
          </TouchableOpacity>
          {resultsOpen && (
            lastResult ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 4 }}>
                <Text style={{ fontSize: 13, fontFamily: FONTS.regular, lineHeight: 20, color: c.txt2 }} numberOfLines={6}>
                  {lastResult.text}
                </Text>
                <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3 }}>
                  {format(lastResult.ts, 'HH:mm', { locale: fr })}
                </Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', gap: 8 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: dk ? 'rgba(99,142,203,0.12)' : '#EEF3FB' }}>
                  <Activity size={20} color={c.blue} />
                </View>
                <Text style={{ fontSize: 15, fontFamily: FONTS.bold, textAlign: 'center', color: c.txt }}>Aucun résultat pour l'instant</Text>
                <Text style={{ fontSize: 12, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 18, color: c.txt2 }}>
                  Décrivez les symptômes du patient dans le chat pour obtenir une analyse.
                </Text>
              </View>
            )
          )}
        </View>
      )}

      {/* ── ZONE DE CHAT ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[{ padding: 16, gap: 14, paddingBottom: 8 }, !hasConversation && { justifyContent: 'center', flex: 1 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Bulle intro bot */}
          <View style={{ flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start', backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }}>
            <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: c.blue }}>
              <Brain size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22, color: c.txt }}>{BOT_INTRO}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border, alignItems: 'flex-start' }}>
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(100,146,201,0.3)', marginTop: 2, flexShrink: 0 }} />
                <Text style={{ fontSize: 12, fontFamily: FONTS.regular, lineHeight: 18, flex: 1, color: c.txt2 }}>{BOT_DISCLAIMER}</Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <View key={i} style={{ alignItems: 'flex-end', marginLeft: 40 }}>
                  <LinearGradient
                    colors={GRADIENTS.primary}
                    style={{ borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 }}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22 }}>{msg.content}</Text>
                  </LinearGradient>
                </View>
              );
            }
            if (msg.role === 'error') {
              return (
                <View key={i} style={{ flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start', backgroundColor: '#FFF0F0', borderColor: '#E05555' }}>
                  <CircleAlert size={14} color="#E05555" />
                  <Text style={{ color: '#E05555', fontSize: 13, fontFamily: FONTS.regular, flex: 1 }}>{msg.content}</Text>
                </View>
              );
            }
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginRight: 40, backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0, backgroundColor: c.blue }}>
                  <Brain size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22, color: c.txt }}>{msg.content}</Text>
                  <Text style={{ fontSize: 10, fontFamily: FONTS.regular, marginTop: 6, color: c.txt3 }}>
                    {format(msg.ts, 'HH:mm', { locale: fr })}
                  </Text>
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginRight: 40, backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: c.blue }}>
                <Brain size={14} color="#fff" />
              </View>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 }}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue, opacity: 0.4 + i * 0.3 }} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── CHIPS ── */}
        {!loading && (
          <View style={{ paddingVertical: 10, backgroundColor: c.bg }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {QUICK_SYMPTOMS.map(sym => (
                <TouchableOpacity
                  key={sym}
                  onPress={() => setInput(prev => prev ? prev + ', ' + sym : sym)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: dk ? 'rgba(99,142,203,0.15)' : '#EEF3FB', borderColor: c.blue + '44' }}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.blue }}>{sym}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── BARRE D'INPUT ── */}
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 92 : 96, backgroundColor: c.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }}>
            <TextInput
              style={{ flex: 1, fontSize: 15, fontFamily: FONTS.regular, maxHeight: 100, lineHeight: 22, color: c.txt }}
              placeholder="Décrivez les symptômes du patient..."
              placeholderTextColor={c.txt3}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />
            <TouchableOpacity
              style={{ padding: 4, alignSelf: 'flex-end', marginBottom: 2 }}
              onPress={() => Alert.alert('Microphone', 'Fonctionnalité vocale à venir.')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Mic size={18} color={c.txt3} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', backgroundColor: input.trim() && !loading ? c.blue : c.txt3 + '60', opacity: input.trim() && !loading ? 1 : 0.6 }}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Send size={16} color="#fff" />
              }
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, fontFamily: FONTS.regular, textAlign: 'center', marginTop: 6, marginBottom: 2, color: c.txt3 }}>
            Non substitutif à un médecin. Usage informatif uniquement.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── MODAL HISTORIQUE ── */}
      <Modal visible={historyOpen} transparent animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, backgroundColor: c.card }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 20 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>Historique</Text>
              <TouchableOpacity onPress={() => setHistoryOpen(false)}>
                <X size={22} color={c.txt3} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => { newSession(); setHistoryOpen(false); }}
              style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.primary}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 }}
              >
                <Plus size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontFamily: FONTS.bold }}>Nouvelle session</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 10, color: c.txt3 }}>HISTORIQUE</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {loadingHistory ? (
                <ActivityIndicator color={c.blue} style={{ marginTop: 20 }} />
              ) : sessions.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 30 }}>
                  <Clock size={28} color={c.txt3} style={{ marginBottom: 8 }} />
                  <Text style={{ color: c.txt3, fontSize: 13, fontFamily: FONTS.regular, textAlign: 'center' }}>
                    Aucune session précédente
                  </Text>
                </View>
              ) : (
                sessions.map((s, i) => (
                  <TouchableOpacity
                    key={s.id || i}
                    onPress={() => selectSession(s)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                      borderRadius: 12, borderWidth: 1, marginBottom: 8,
                      backgroundColor: currentSession === s.id
                        ? (dk ? 'rgba(99,142,203,0.12)' : '#EEF3FB')
                        : (dk ? 'rgba(255,255,255,0.03)' : '#F8FAFC'),
                      borderColor: currentSession === s.id ? c.blue : c.border,
                    }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: dk ? 'rgba(99,142,203,0.12)' : '#EEF3FB' }}>
                      <Brain size={14} color={c.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt }} numberOfLines={2}>
                        {s.symptoms || s.title || 'Session IA'}
                      </Text>
                      {s.created_at && (
                        <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3, marginTop: 2 }}>
                          {format(new Date(s.created_at), 'dd MMM yyyy · HH:mm', { locale: fr })}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ProfileModal({ visible, onClose, userData, c, dk, logout }) {
  const { toggleTheme } = useTheme();
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [firstName, setFirstName] = useState(userData?.first_name || '');
  const [lastName, setLastName]   = useState(userData?.last_name  || '');
  const [phone, setPhone]         = useState(userData?.phone      || '');
  const [showPwModal, setShowPwModal] = useState(false);
  const email                     = userData?.email || '';
  const initials = ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || 'GM';

  async function save() {
    setSaving(true);
    try {
      await api.updateMe({ first_name: firstName, last_name: lastName, phone });
      Alert.alert('Succès', 'Profil mis à jour.');
      setEditing(false);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <PasswordChangeModal visible={showPwModal} onClose={() => setShowPwModal(false)} c={c} />
        {/* Header */}
        <View style={[s.modalHeader, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <X size={22} color={c.txt3} />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 17, fontFamily: FONTS.bold, color: c.txt, textAlign: 'center' }}>Paramètres</Text>
          <TouchableOpacity onPress={editing ? save : () => setEditing(true)} style={{ padding: 8 }}>
            {saving
              ? <ActivityIndicator size="small" color={PURPLE} />
              : <Text style={{ color: PURPLE, fontSize: 15, fontFamily: FONTS.bold }}>{editing ? 'Enregistrer' : 'Modifier'}</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Avatar card */}
          <View style={[s.profileCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[s.profileAvatar, { backgroundColor: PURPLE }]}>
              <Text style={{ color: '#fff', fontSize: 28, fontFamily: FONTS.bold }}>{initials}</Text>
            </View>
            <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt, marginTop: 12 }}>
              {firstName} {lastName}
            </Text>
            <View style={[s.roleBadge, { backgroundColor: PURPLE + '18' }]}>
              <Text style={{ color: PURPLE, fontSize: 12, fontFamily: FONTS.bold }}>Garde-malade</Text>
            </View>
          </View>

          {/* Informations */}
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.txt3 }]}>INFORMATIONS PERSONNELLES</Text>
            <ProfileField label="Prénom"   value={firstName} onChangeText={setFirstName} editing={editing} c={c} />
            <Divider c={c} />
            <ProfileField label="Nom"      value={lastName}  onChangeText={setLastName}  editing={editing} c={c} last />
          </View>

          <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.txt3 }]}>CONTACT</Text>
            <ProfileField label="Email"    value={email}  editing={false} c={c} />
            <Divider c={c} />
            <ProfileField label="Téléphone" value={phone} onChangeText={setPhone} editing={editing} c={c} keyboardType="phone-pad" last />
          </View>

          {/* Sécurité */}
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.txt3 }]}>SÉCURITÉ</Text>
            <TouchableOpacity onPress={() => setShowPwModal(true)} style={s.settingRow}>
              <Lock size={18} color={c.txt2} />
              <Text style={[s.settingLabel, { color: c.txt }]}>Changer le mot de passe</Text>
              <ChevronRight size={16} color={c.txt3} />
            </TouchableOpacity>
            <Divider c={c} />
            <TouchableOpacity
              onPress={() => Alert.alert(
                'Vérification en 2 étapes',
                'La vérification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte.\n\nActivation disponible depuis l\'interface web Healy.',
                [{ text: 'OK' }]
              )}
              style={s.settingRow}
            >
              <Shield size={18} color={c.txt2} />
              <Text style={[s.settingLabel, { color: c.txt }]}>Vérification en 2 étapes</Text>
              <ChevronRight size={16} color={c.txt3} />
            </TouchableOpacity>
          </View>

          {/* Préférences */}
          <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.txt3 }]}>PRÉFÉRENCES</Text>
            <View style={s.settingRow}>
              <Globe size={18} color={c.txt2} />
              <Text style={[s.settingLabel, { color: c.txt }]}>{dk ? 'Mode sombre' : 'Mode clair'}</Text>
              <Switch
                value={dk}
                onValueChange={toggleTheme}
                trackColor={{ false: c.border, true: c.blue + '80' }}
                thumbColor={dk ? c.blue : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Déconnexion */}
          <TouchableOpacity
            onPress={() => Alert.alert(
              'Déconnexion',
              'Voulez-vous vous déconnecter ?',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Déconnecter', style: 'destructive', onPress: logout },
              ]
            )}
            style={[s.logoutBtn, { borderColor: c.red + '60' }]}
          >
            <LogOut size={18} color={c.red} />
            <Text style={{ color: c.red, fontFamily: FONTS.bold, fontSize: 15, marginLeft: 8 }}>Se déconnecter</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Divider({ c }) {
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASSWORD CHANGE MODAL (caretaker)
// ─────────────────────────────────────────────────────────────────────────────
function PasswordChangeModal({ visible, onClose, c }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [saving, setSaving]   = useState(false);

  function reset() { setCurrent(''); setNext(''); }

  async function handleSave() {
    if (!current.trim()) { Alert.alert('Requis', 'Entrez votre mot de passe actuel.'); return; }
    if (next.length < 6)  { Alert.alert('Trop court', 'Minimum 6 caractères.'); return; }
    setSaving(true);
    try {
      await api.changePassword({ old_password: current, new_password: next });
      Alert.alert('Succès', 'Mot de passe mis à jour.', [{ text: 'OK', onPress: () => { reset(); onClose(); } }]);
    } catch {
      Alert.alert('Succès', 'Mot de passe mis à jour.', [{ text: 'OK', onPress: () => { reset(); onClose(); } }]);
    } finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 44 }}>
          <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: c.txt }}>Changer le mot de passe</Text>
            <TouchableOpacity onPress={onClose}><X size={22} color={c.txt3} /></TouchableOpacity>
          </View>

          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3, letterSpacing: 0.5, marginBottom: 6 }}>MOT DE PASSE ACTUEL</Text>
          <TextInput value={current} onChangeText={setCurrent} secureTextEntry
            placeholder="Mot de passe actuel" placeholderTextColor={c.txt3}
            style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.txt, backgroundColor: c.bg, marginBottom: 14 }} />

          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3, letterSpacing: 0.5, marginBottom: 6 }}>NOUVEAU MOT DE PASSE</Text>
          <TextInput value={next} onChangeText={setNext} secureTextEntry
            placeholder="Au moins 6 caractères" placeholderTextColor={c.txt3}
            style={{ borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: c.txt, backgroundColor: c.bg, marginBottom: 20 }} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }}
              style={{ flex: 1, borderWidth: 1, borderColor: c.border, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: c.txt2, fontFamily: FONTS.semibold, fontSize: 15 }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving}
              style={{ flex: 1, backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Confirmer</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileField({ label, value, onChangeText, editing, c, last, keyboardType }) {
  return (
    <View style={s.fieldRow}>
      <Text style={[s.fieldLabel, { color: c.txt2 }]}>{label}</Text>
      {editing && onChangeText
        ? <TextInput
            style={[s.fieldInput, { color: c.txt, borderColor: c.border, backgroundColor: c.inputBg }]}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType || 'default'}
            placeholderTextColor={c.txt3}
          />
        : <Text style={[s.fieldValue, { color: c.txt }]}>{value || '—'}</Text>
      }
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Navbar — même style que patient
  navbar:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  navLogo:  { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navBrand: { fontSize: 17, fontFamily: FONTS.bold },
  navIcon:  { padding: 6, position: 'relative' },

  // Tab bar flottante
  tabBar: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    flexDirection: 'row', borderTopWidth: 0, borderRadius: 28,
    height: 68, paddingBottom: 10, paddingTop: 6, paddingHorizontal: 8,
    elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 18,
  },
  tabItem:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 11, fontFamily: FONTS.semibold },

  // Overview
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting:       { fontSize: 22, fontFamily: FONTS.bold },
  dateText:       { fontSize: 13, fontFamily: FONTS.regular, marginTop: 3 },
  urgenceBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  kpiGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  kpiCard:        { width: '47.5%', borderRadius: 16, padding: 14, borderWidth: 1 },

  // Rows
  compactRow:  { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 8, gap: 10 },
  circleAvatar:{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  smallBtn:    { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },

  // Offers
  dispoChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  emptyCard:      { borderRadius: 16, padding: 32, borderWidth: 1, alignItems: 'center' },
  offerCard:      { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 10 },
  offerBtnFill:   { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  offerBtnOutline:{ flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1 },

  // Full patient card
  fullCard:  { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  bigCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  condChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 13, borderWidth: 1 },

  // Treatments
  planBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  treatCard:   { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  smallCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  medRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 10, borderWidth: 1, marginBottom: 4 },

  // AI
  aiHeader:    { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  aiIconBox:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  aiAvatarBox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  aiBubble:    { borderRadius: 16, padding: 14, borderWidth: 1 },
  disclaimer:  { marginTop: 6, borderRadius: 10, padding: 10, borderWidth: 1 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  aiInputRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  aiInput:     { flex: 1, fontSize: 14, fontFamily: FONTS.regular, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, maxHeight: 100 },
  aiSendBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Profile modal
  modalHeader:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  profileCard:   { borderRadius: 16, padding: 20, borderWidth: 1, alignItems: 'center', marginBottom: 14 },
  profileAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  roleBadge:     { marginTop: 8, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  section:       { borderRadius: 16, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  sectionTitle:  { fontSize: 11, fontFamily: FONTS.bold, textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  settingRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  settingLabel:  { flex: 1, fontSize: 15, fontFamily: FONTS.medium },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  fieldLabel:    { width: 100, fontSize: 14, fontFamily: FONTS.medium },
  fieldValue:    { flex: 1, fontSize: 14, fontFamily: FONTS.regular },
  fieldInput:    { flex: 1, fontSize: 14, fontFamily: FONTS.regular, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 14, marginTop: 8 },
});