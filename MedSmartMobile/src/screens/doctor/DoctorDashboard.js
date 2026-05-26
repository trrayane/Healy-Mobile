import React, {
  useState, useEffect, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert, TextInput,
  Modal, Dimensions, Switch, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  House, Calendar, Users, FileText, ChartBar,
  Search, Plus, ChevronRight, ChevronLeft, Clock, Star,
  X, Check, Filter, Trash2, QrCode, Download,
  TrendingUp, RefreshCw, Settings, Activity, Bell, MessageSquare,
  MapPin,
} from 'lucide-react-native';
import { Share, Linking } from 'react-native';
import { router } from 'expo-router';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData }  from '../../context/DataContext';
import { T, FONTS } from '../../theme';
import { Avatar, EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import DoctorSettings from './DoctorSettings';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

const { width: SW } = Dimensions.get('window');

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_KEY_DASH     = 'cache_doctor_dashboard';
const CACHE_KEY_PATIENTS = 'cache_doctor_patients';
const CACHE_KEY_RX       = 'cache_doctor_rx';
const CACHE_KEY_SLOTS    = 'cache_doctor_slots';
const CACHE_TTL          = 5 * 60 * 1000;

async function cacheGet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return Date.now() - ts > CACHE_TTL ? null : data;
  } catch { return null; }
}
async function cacheSet(key, data) {
  try { await AsyncStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

const TABS = [
  { key: 'overview',      label: 'Accueil',     Icon: House      },
  { key: 'schedule',      label: 'Agenda',      Icon: Calendar  },
  { key: 'patients',      label: 'Patients',    Icon: Users     },
  { key: 'prescriptions', label: 'Ordonnances', Icon: FileText  },
  { key: 'stats',         label: 'Stats',       Icon: ChartBar },
];

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function DoctorDashboardScreen() {
  const { userData, avatarUri } = useAuth();
  const { dk }       = useTheme();
  const { refresh }  = useData();
  const c = useMemo(() => (dk ? T.dark : T.light), [dk]);

  // ── All hooks declared first — never conditionally ───────────────────────
  const [activeTab,      setActiveTab]      = useState('overview');
  const [showSettings,   setShowSettings]   = useState(false);
  const [showHoraires,   setShowHoraires]   = useState(false);
  const [showCreneau,    setShowCreneau]    = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showNewRx,      setShowNewRx]      = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [dashData,       setDashData]       = useState(null);
  const [loading,        setLoading]        = useState(false);
  const [today,          setToday]          = useState([]);
  const [requests,       setRequests]       = useState([]);
  const [patientsData,   setPatientsData]   = useState(null);
  const [rxData,         setRxData]         = useState(null);

  const closeAddPatient = useCallback(() => setShowAddPatient(false), []);
  const closeNewRx      = useCallback(() => setShowNewRx(false),      []);
  const onPatientAdded  = useCallback(p => setPatientsData(prev => [...(prev || []), p]), []);
  const onRxCreated     = useCallback(rx => setRxData(prev => [rx, ...(prev || [])]),    []);

  const loadData = useCallback(async () => {
    const cached = await cacheGet(CACHE_KEY_DASH);
    if (cached) {
      setDashData(cached.dash);
      setToday(cached.today   || []);
      setRequests(cached.reqs || []);
      setLoading(false);
    }
    try {
      const [dash, schedule, pending] = await Promise.allSettled([
        api.getDoctorDashboard(),
        api.getTodaySchedule(),
        api.getPendingAppointments(),
      ]);
      const d = dash.status     === 'fulfilled' ? dash.value     : null;
      const t = schedule.status === 'fulfilled'
        ? (Array.isArray(schedule.value) ? schedule.value : schedule.value?.results || [])
        : [];
      const r = pending.status  === 'fulfilled'
        ? (Array.isArray(pending.value) ? pending.value : pending.value?.results || [])
        : [];
      if (d) setDashData(d);
      setToday(t);
      setRequests(r);
      await cacheSet(CACHE_KEY_DASH, { dash: d, today: t, reqs: r });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setTimeout(async () => {
      // Pre-fetch patients
      const cp = await cacheGet(CACHE_KEY_PATIENTS);
      if (cp) setPatientsData(cp);
      api.getDoctorPatients().then(d => {
        const list = Array.isArray(d) ? d : d?.results || [];
        setPatientsData(list);
        cacheSet(CACHE_KEY_PATIENTS, list);
      }).catch(() => {});
      // Pre-fetch prescriptions
      const cr = await cacheGet(CACHE_KEY_RX);
      if (cr) setRxData(cr);
      api.getMyPrescriptions().then(d => {
        const list = Array.isArray(d) ? d : d?.results || [];
        setRxData(list);
        cacheSet(CACHE_KEY_RX, list);
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refresh(), loadData()]);
    setRefreshing(false);
  }, [refresh, loadData]);

  const shared = { c, dk, userData, dashData, loading, today, requests, onRefresh: loadData };

  const content = showSettings ? (
    <DoctorSettings onBack={() => setShowSettings(false)} />
  ) : showHoraires ? (
    <DoctorHoraires onBack={() => setShowHoraires(false)} />
  ) : (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── HEADER ── */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[S.headerTitle, { color: c.txt }]}>
            {activeTab === 'overview'        ? 'Healy'
             : activeTab === 'schedule'      ? 'Planning'
             : activeTab === 'patients'      ? 'Patients'
             : activeTab === 'prescriptions' ? 'Ordonnances'
             : 'Statistiques'}
          </Text>
          {activeTab === 'overview' && (
            <Text style={[S.headerSub, { color: c.txt2 }]}>
              Dr. {userData?.last_name || userData?.first_name || ''}
            </Text>
          )}
        </View>
        {activeTab === 'overview' && (
          <>
            <TouchableOpacity
              onPress={() => router.push('/(app)/chat')}
              style={{ padding: 6 }}
            >
              <MessageSquare size={20} color={c.txt2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/notifications')}
              style={{ padding: 6 }}
            >
              <Bell size={20} color={c.txt2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/doctor/profile')}
              activeOpacity={0.75}
              style={[S.avatarCircle, { backgroundColor: c.blue + '20', borderWidth: 2, borderColor: c.blue + '50', overflow: 'hidden' }]}
            >
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <Text style={{ color: c.blue, fontFamily: FONTS.bold, fontSize: 13 }}>
                    {(userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || '')}
                  </Text>
              }
            </TouchableOpacity>
          </>
        )}
        {activeTab === 'schedule' && (
          <TouchableOpacity onPress={() => setShowCreneau(true)}
            style={[S.addBtn, { backgroundColor: c.blue }]}>
            <Plus size={14} color="#fff" />
            <Text style={S.addBtnTxt}>Créneau</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'patients' && (
          <TouchableOpacity onPress={() => setShowAddPatient(true)}
            style={[S.addBtn, { backgroundColor: c.blue }]}>
            <Plus size={14} color="#fff" />
            <Text style={S.addBtnTxt}>Nouveau</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'prescriptions' && (
          <TouchableOpacity onPress={() => setShowNewRx(true)}
            style={[S.addBtn, { backgroundColor: c.blue }]}>
            <Plus size={14} color="#fff" />
            <Text style={S.addBtnTxt}>Nouvelle</Text>
          </TouchableOpacity>
        )}
        {activeTab === 'stats' && (
          <View style={[S.filterChip, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.medium }}>7 jours</Text>
          </View>
        )}
      </View>

      {/* ── CONTENT ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        {activeTab === 'overview'      && (
          <OverviewTab {...shared} onOpenHoraires={() => setShowHoraires(true)} />
        )}
        {activeTab === 'schedule'      && (
          <ScheduleTab {...shared} onOpenHoraires={() => setShowHoraires(true)} />
        )}
        {activeTab === 'patients'      && (
          <PatientsTab
            c={c} dk={dk}
            prefetchedData={patientsData}
            showAddModal={showAddPatient}
            onCloseAddModal={closeAddPatient}
            onPatientAdded={onPatientAdded}
          />
        )}
        {activeTab === 'prescriptions' && (
          <PrescriptionsTab
            c={c} dk={dk}
            prefetchedData={rxData}
            showNewModal={showNewRx}
            onCloseNewModal={closeNewRx}
            onRxCreated={onRxCreated}
          />
        )}
        {activeTab === 'stats' && <StatsTab c={c} dk={dk} dashData={dashData} />}
      </ScrollView>

      {/* ── BOTTOM TAB BAR flottante ── */}
      <View style={[S.tabBar, { backgroundColor: c.nav }]}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <TouchableOpacity key={key} style={S.tabItem} onPress={() => setActiveTab(key)} activeOpacity={0.7}>
              <Icon size={22} color={active ? c.blue : c.txt3} strokeWidth={active ? 2.2 : 1.7} />
              <Text style={[S.tabLabel, { color: active ? c.blue : c.txt3 }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── CRÉNEAU MODAL ── */}
      <CreneauModal visible={showCreneau} onClose={() => setShowCreneau(false)} c={c} dk={dk} />
    </SafeAreaView>
  );
  return content;
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
const OverviewTab = memo(function OverviewTab({ c, dk, dashData, loading, today, requests, onRefresh, onOpenHoraires, userData }) {
  // useState AVANT tout return conditionnel
  const [processingId, setProcessingId] = useState(null);

  const kpis = useMemo(() => [
    { value: dashData?.consultations_today ?? 0,  label: "Consultations\naujourd'hui", Icon: House,  col: c.blue,    bg: c.blue    + '18' },
    { value: dashData?.total_patients      ?? 0,  label: 'Total\npatients',            Icon: Users, col: c.txt2,    bg: c.border         },
    { value: requests.length,                     label: 'Demandes\nen attente',        Icon: Clock, col: '#E8A838', bg: '#E8A83818'      },
    {
      value: dashData?.average_rating ? String(Number(dashData.average_rating).toFixed(1)) : '4.6',
      label: 'Note\nmoyenne', Icon: Star, col: '#9B7FD4', bg: '#9B7FD418',
    },
  ], [dashData, requests.length, c]);

  const handleReq = useCallback(async (id, action) => {
    setProcessingId(id);
    try {
      if (action === 'confirm') {
        await api.confirmAppointment(id);
      } else {
        await api.refuseAppointment(id);
      }
      Alert.alert('Succès', action === 'confirm' ? 'RDV confirmé.' : 'RDV refusé.');
      onRefresh();
    } catch (e) { Alert.alert('Erreur', e?.message || 'Erreur'); }
    finally { setProcessingId(null); }
  }, [onRefresh]);

  if (loading) return <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />;

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* KPIs */}
      <View style={S.kpiGrid}>
        {kpis.map(({ value, label, Icon, col, bg }, i) => (
          <View key={i} style={[S.kpiCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[S.iconBox, { backgroundColor: bg }]}><Icon size={18} color={col} /></View>
            <Text style={[S.kpiVal, { color: c.txt }]}>{value}</Text>
            <Text style={[S.kpiLbl, { color: c.txt2 }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Planning du jour */}
      <SectionCard title="Planning du jour" badge={`${today.length} rendez-vous`} badgeBg={c.border} badgeCol={c.txt2} c={c}>
        {today.length === 0
          ? <EmptyBox icon={<Calendar size={28} color={c.txt3} />} text="Aucun rendez-vous prévu aujourd'hui" c={c} />
          : today.map(a => <ApptRow key={a.id} a={a} c={c} dk={dk} />)
        }
      </SectionCard>

      {/* Demandes */}
      <SectionCard title="Demandes de patients" badge={`${requests.length} en attente`} badgeBg="#E8A83820" badgeCol="#E8A838" c={c}>
        {requests.length === 0
          ? <EmptyBox icon={<Clock size={28} color={c.txt3} />} text="Aucune demande en attente" c={c} />
          : requests.map(r => (
              <View key={r.id} style={[S.row, { backgroundColor: dk ? '#1A2333' : '#F8FAFC' }]}>
                <Avatar
                  firstName={(r.patient_name || '').split(' ')[0]}
                  lastName={(r.patient_name  || '').split(' ')[1]}
                  size={38}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 14 }}>{r.patient_name || 'Patient'}</Text>
                  <Text style={{ color: c.txt2, fontSize: 12 }}>{r.date} · {r.start_time?.substring(0, 5)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleReq(r.id, 'confirm')} style={[S.iconBtn, { backgroundColor: c.green + '20' }]}>
                  {processingId === r.id
                    ? <ActivityIndicator size="small" color={c.green} />
                    : <Check size={15} color={c.green} />
                  }
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleReq(r.id, 'refuse')} style={[S.iconBtn, { backgroundColor: c.red + '20' }]}>
                  <X size={15} color={c.red} />
                </TouchableOpacity>
              </View>
            ))
        }
      </SectionCard>

      {/* Horaires */}
      <TouchableOpacity onPress={onOpenHoraires} style={[S.card, S.horRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[S.iconBox, { backgroundColor: c.blue + '18' }]}><Clock size={18} color={c.blue} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 15 }}>Horaires de travail</Text>
          <Text style={{ color: c.txt2, fontSize: 12 }}>Configurer vos disponibilités</Text>
        </View>
        <ChevronRight size={18} color={c.txt3} />
      </TouchableOpacity>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULE TAB
// ─────────────────────────────────────────────────────────────────────────────
const ScheduleTab = memo(function ScheduleTab({ c, dk, today, onOpenHoraires }) {
  // Tous les hooks en haut
  const [selDate, setSelDate] = useState(new Date());
  const [reqs,    setReqs]    = useState([]);

  useEffect(() => {
    // Afficher uniquement les demandes en attente de confirmation
    api.getPendingAppointments()
      .then(d => setReqs(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {});
  }, []);

  const weekStart = useMemo(() => startOfWeek(selDate, { weekStartsOn: 1 }), [selDate]);
  const days      = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const DAY_LBL   = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

  const dayAppts = useMemo(() =>
    today.filter(a => {
      try { return isSameDay(new Date(a.date || a.slot_date || ''), selDate); }
      catch { return false; }
    }),
    [today, selDate]
  );

  return (
    <View style={{ padding: 16, gap: 16 }}>
      {/* Navigation semaine */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TouchableOpacity onPress={() => setSelDate(new Date())}
          style={[S.todayBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <RefreshCw size={13} color={c.txt2} />
          <Text style={{ color: c.txt2, fontSize: 12, fontFamily: FONTS.medium }}>Aujourd'hui</Text>
        </TouchableOpacity>
      </View>

      {/* Grille semaine */}
      <View style={[S.card, { backgroundColor: c.card, borderColor: c.border, paddingVertical: 12 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => setSelDate(d => addDays(d, -7))}>
            <ChevronLeft size={20} color={c.txt2} />
          </TouchableOpacity>
          <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 13 }}>
            {format(weekStart, 'MMMM yyyy', { locale: fr }).toUpperCase()}
          </Text>
          <TouchableOpacity onPress={() => setSelDate(d => addDays(d, 7))}>
            <ChevronRight size={20} color={c.txt2} />
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {days.map((day, i) => {
            const isSel   = isSameDay(day, selDate);
            const isToday = isSameDay(day, new Date());
            const cnt = today.filter(a => {
              try { return isSameDay(new Date(a.date || ''), day); }
              catch { return false; }
            }).length;
            return (
              <TouchableOpacity key={i} style={{ alignItems: 'center', gap: 4 }} onPress={() => setSelDate(day)}>
                <Text style={{ fontSize: 10, fontFamily: FONTS.semibold, color: c.txt3 }}>{DAY_LBL[i]}</Text>
                <View style={{
                  width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isSel ? c.blue : 'transparent',
                }}>
                  <Text style={{
                    fontSize: 15,
                    fontFamily: isSel || isToday ? FONTS.bold : FONTS.regular,
                    color: isSel ? '#fff' : isToday ? c.blue : c.txt,
                  }}>
                    {format(day, 'd')}
                  </Text>
                </View>
                <Text style={{ fontSize: 9, fontFamily: FONTS.medium, color: isSel ? c.blue : c.txt3 }}>
                  {cnt > 0 ? `${cnt} rdv` : '0'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* RDV du jour */}
      <SectionCard title="Planning du jour" badge={`${dayAppts.length} rendez-vous`} badgeBg={c.border} badgeCol={c.txt2} c={c}>
        {dayAppts.length === 0
          ? <EmptyBox icon={<Calendar size={28} color={c.txt3} />} text="Aucun rendez-vous prévu" c={c} />
          : dayAppts.map(a => <ApptRow key={a.id} a={a} c={c} dk={dk} />)
        }
      </SectionCard>

      {/* Demandes */}
      <SectionCard title="Demandes de patients" badge={`${reqs.length} en attente`} badgeBg="#E8A83820" badgeCol="#E8A838" c={c}>
        {reqs.length === 0
          ? <EmptyBox icon={<Clock size={28} color={c.txt3} />} text="Aucune demande en attente" c={c} />
          : reqs.map(r => (
              <View key={r.id} style={[S.row, { backgroundColor: dk ? '#1A2333' : '#F8FAFC' }]}>
                <Avatar firstName={(r.patient_name || '').split(' ')[0]} lastName={(r.patient_name || '').split(' ')[1]} size={38} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 14 }}>{r.patient_name || 'Patient'}</Text>
                  <Text style={{ color: c.txt2, fontSize: 12 }}>{r.date} · {r.start_time?.substring(0, 5)}</Text>
                </View>
              </View>
            ))
        }
      </SectionCard>

      {/* Horaires */}
      <TouchableOpacity onPress={onOpenHoraires} style={[S.card, S.horRow, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[S.iconBox, { backgroundColor: c.blue + '18' }]}><Clock size={18} color={c.blue} /></View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 15 }}>Horaires de travail</Text>
          <Text style={{ color: c.txt2, fontSize: 12 }}>Configurer vos disponibilités</Text>
        </View>
        <ChevronRight size={18} color={c.txt3} />
      </TouchableOpacity>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
const COLORS_P = ['#4A6FA5', '#2D8C6F', '#E8A838', '#E05555', '#7B5EA7', '#2CA0C8', '#E07828'];
const iniStr   = (n = '') => n.split(' ').map(x => x[0] || '').join('').toUpperCase().substring(0, 2);
const clrFor   = (n = '') => COLORS_P[n.charCodeAt(0) % COLORS_P.length];

// ── Modal profil patient ──────────────────────────────────────────────────────
function PatientProfileModal({ patient, visible, onClose, c, dk }) {
  const [record,  setRecord]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('info');

  useEffect(() => {
    if (!visible || !patient?.id) return;
    setRecord(null);
    setTab('info');
    setLoading(true);
    api.getPatientRecord(patient.id)
      .then(setRecord)
      .catch(() => setRecord(null))
      .finally(() => setLoading(false));
  }, [visible, patient?.id]);

  if (!patient) return null;

  const TABS_P = [
    { key: 'info',          label: 'Infos'       },
    { key: 'history',       label: 'Historique'  },
    { key: 'prescriptions', label: 'Ordonnances' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }}>
          {/* Poignee */}
          <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginTop: 14 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
            <View style={[S.ava, { backgroundColor: clrFor(patient.name) }]}>
              <Text style={S.avaT}>{iniStr(patient.name)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>{patient.name}</Text>
              {patient.sub ? <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt3 }}>{patient.sub}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <X size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 }}>
            {TABS_P.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setTab(key)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
                  backgroundColor: tab === key ? c.blue : (dk ? '#1E2A3A' : '#F0F4F8'),
                }}
              >
                <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: tab === key ? '#fff' : c.txt2 }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenu */}
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />
            ) : !record ? (
              <View style={{ alignItems: 'center', paddingTop: 40, gap: 12 }}>
                <Users size={40} color={c.txt3} />
                <Text style={{ fontSize: 14, fontFamily: FONTS.regular, color: c.txt3, textAlign: 'center' }}>
                  Dossier non disponible.{'\n'}Un rendez-vous confirme ou une liaison est requis.
                </Text>
              </View>
            ) : tab === 'info' ? (
              <View style={{ gap: 0 }}>
                {[
                  ['Email',       record.profile?.email],
                  ['Telephone',   record.profile?.phone],
                  ['Naissance',   record.profile?.date_of_birth],
                  ['Sexe',        record.profile?.sex === 'M' ? 'Masculin' : record.profile?.sex === 'F' ? 'Feminin' : record.profile?.sex],
                  ['Ville',       [record.profile?.city, record.profile?.wilaya].filter(Boolean).join(', ')],
                  ['Groupe sg.',  record.medical_profile?.blood_group],
                  ['Poids/Taille', record.medical_profile?.weight && record.medical_profile?.height
                    ? `${record.medical_profile.weight} kg · ${record.medical_profile.height} cm` : null],
                  ['Allergies',   Array.isArray(record.medical_profile?.allergies)
                    ? record.medical_profile.allergies.map(a => a.substance || a).join(', ') : null],
                ].filter(([, v]) => v).map(([label, value]) => (
                  <View key={label} style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <Text style={{ width: 110, fontSize: 13, fontFamily: FONTS.medium, color: c.txt3 }}>{label}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: c.txt }}>{value}</Text>
                  </View>
                ))}
              </View>
            ) : tab === 'history' ? (
              !record.history?.length ? (
                <Text style={{ color: c.txt3, fontFamily: FONTS.regular, fontSize: 14, textAlign: 'center', marginTop: 30 }}>
                  Aucun historique de consultation
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {record.history.map((h, i) => (
                    <View key={i} style={{ backgroundColor: dk ? '#1A2535' : '#F8FAFC', borderRadius: 12, padding: 14 }}>
                      <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, marginBottom: 4 }}>
                        {h.condition || 'Consultation'}
                      </Text>
                      {h.description ? (
                        <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt2, marginBottom: 6 }}>
                          {h.description}
                        </Text>
                      ) : null}
                      <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3 }}>
                        {h.doctor_name}{h.diagnosis_date ? ' · ' + h.diagnosis_date : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )
            ) : (
              !record.prescriptions?.length ? (
                <Text style={{ color: c.txt3, fontFamily: FONTS.regular, fontSize: 14, textAlign: 'center', marginTop: 30 }}>
                  Aucune ordonnance
                </Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {record.prescriptions.map((rx, i) => (
                    <View key={i} style={{ backgroundColor: dk ? '#1A2535' : '#F8FAFC', borderRadius: 12, padding: 14 }}>
                      <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, marginBottom: 4 }}>{rx.medication}</Text>
                      <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt2 }}>
                        {rx.frequency}{rx.duration ? ' · ' + rx.duration : ''}
                      </Text>
                      {rx.prescription_date ? (
                        <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3, marginTop: 4 }}>
                          {rx.prescription_date}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              )
            )}
          </ScrollView>

          {/* Bouton message */}
          <View style={{ paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: c.border }}>
            <TouchableOpacity
              onPress={async () => {
                const userId = record?.profile?.user_id || patient.userId;
                if (!userId) { onClose(); router.push('/(app)/chat'); return; }
                onClose();
                try {
                  const conv = await api.createConversation(userId);
                  router.push(`/(app)/chat/${conv.id}`);
                } catch { router.push('/(app)/chat'); }
              }}
              style={{
                backgroundColor: c.blue, borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Envoyer un message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const PatientsTab = memo(function PatientsTab({ c, dk, prefetchedData, showAddModal, onCloseAddModal, onPatientAdded }) {
  const [patients,         setPatients]         = useState(prefetchedData || []);
  const [loading,          setLoading]          = useState(!prefetchedData);
  const [search,           setSearch]           = useState('');
  const [locals,           setLocals]           = useState([]);
  const [selectedPatient,  setSelectedPatient]  = useState(null);

  useEffect(() => {
    if (prefetchedData) { setPatients(prefetchedData); setLoading(false); return; }
    api.getDoctorPatients()
      .then(d => setPatients(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefetchedData]);

  const all = useMemo(() => [
    ...patients.map(p => ({
      id:     p.id,                                                          // Patient model ID -> /record/
      userId: p.user_id,                                                     // User ID -> /messaging/
      name:   `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient',
      sub:    [p.age ? `${p.age} ans` : null, p.city || p.wilaya || null].filter(Boolean).join(' · '),
    })),
    ...locals.map(p => ({
      id:     null,
      userId: null,
      name:   `${p.firstName} ${p.lastName}`.trim(),
      sub:    `${p.condition || ''}${p.age ? ` · ${p.age} ans` : ''}`,
    })),
  ], [patients, locals]);

  const filtered = useMemo(() =>
    all.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [all, search]
  );

  if (loading) return <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <View style={[S.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Search size={16} color={c.txt3} />
        <TextInput
          style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
          placeholder="Rechercher un patient..." placeholderTextColor={c.txt3}
          value={search} onChangeText={setSearch}
        />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16 }}>Mes patients</Text>
        <Text style={{ color: c.txt3, fontFamily: FONTS.medium, fontSize: 14 }}>· {filtered.length}</Text>
        <View style={{ flex: 1 }} />
        <View style={[S.filterChip, { backgroundColor: c.card, borderColor: c.border }]}>
          <Filter size={13} color={c.txt2} />
          <Text style={{ color: c.txt2, fontSize: 12, fontFamily: FONTS.medium }}>Filtrer</Text>
        </View>
      </View>

      {filtered.length === 0
        ? <EmptyState icon={<Users size={40} color={c.txt3} />} title="Aucun patient" subtitle="Vos patients apparaîtront ici" dk={dk} />
        : filtered.map(p => (
            <TouchableOpacity
              key={String(p.id ?? p.name)}
              onPress={() => p.id && setSelectedPatient(p)}
              activeOpacity={0.75}
              style={[S.patientRow, { backgroundColor: c.card, borderColor: c.border }]}
            >
              <View style={[S.ava, { backgroundColor: clrFor(p.name) }]}>
                <Text style={S.avaT}>{iniStr(p.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 15 }}>{p.name}</Text>
                {p.sub ? <Text style={{ color: c.txt2, fontSize: 12, fontFamily: FONTS.regular }}>{p.sub}</Text> : null}
              </View>
              <ChevronRight size={18} color={c.txt3} />
            </TouchableOpacity>
          ))
      }

      <AddPatientModal
        visible={showAddModal}
        onClose={onCloseAddModal}
        onAdd={p => {
          const np = { ...p, id: Date.now().toString() };
          setLocals(prev => [...prev, np]);
          onPatientAdded && onPatientAdded(np);
          onCloseAddModal();
        }}
        c={c} dk={dk}
      />

      <PatientProfileModal
        patient={selectedPatient}
        visible={!!selectedPatient}
        onClose={() => setSelectedPatient(null)}
        c={c}
        dk={dk}
      />
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
const PrescriptionsTab = memo(function PrescriptionsTab({ c, dk, prefetchedData, showNewModal, onCloseNewModal, onRxCreated }) {
  const [rxs,        setRxs]        = useState(prefetchedData || []);
  const [loading,    setLoading]    = useState(!prefetchedData);
  const [search,     setSearch]     = useState('');
  const [qrRx,       setQrRx]       = useState(null);   // ordonnance sélectionnée pour QR
  const [qrImage,    setQrImage]    = useState(null);
  const [qrLoading,  setQrLoading]  = useState(false);

  useEffect(() => {
    if (prefetchedData) { setRxs(prefetchedData); setLoading(false); return; }
    api.getMyPrescriptions()
      .then(d => setRxs(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefetchedData]);

  async function handleShowQr(rx) {
    setQrRx(rx);
    setQrImage(null);
    setQrLoading(true);
    try {
      const token = rx.qr_token || `RX-DOC-${rx.id}-${rx.patient_id || ''}`;
      setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(token)}&color=0D1B2E`);
    } catch { Alert.alert('Erreur', 'Impossible de générer le QR Code'); }
    finally  { setQrLoading(false); }
  }

  const sCol = useCallback(s =>
    s === 'active' ? c.green : s === 'expired' ? c.red : c.amber,
    [c]
  );
  const sLbl = (s) =>
    s === 'active' ? 'Active' : s === 'expired' ? 'Expirée' : 'En attente';

  const filtered = useMemo(() =>
    rxs.filter(rx => {
      const q = search.toLowerCase();
      return (rx.patient_name || '').toLowerCase().includes(q) ||
             (rx.medications  || []).some(m => (m.name || '').toLowerCase().includes(q));
    }),
    [rxs, search]
  );

  if (loading) return <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.regular }}>{rxs.length} ce mois</Text>
      <View style={[S.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Search size={16} color={c.txt3} />
        <TextInput
          style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
          placeholder="Rechercher par médicament ou patient..."
          placeholderTextColor={c.txt3}
          value={search} onChangeText={setSearch}
        />
      </View>
      {filtered.length === 0
        ? <EmptyState icon={<FileText size={40} color={c.txt3} />} title="Aucune ordonnance" dk={dk} />
        : filtered.map((rx, i) => {
            const meds = rx.medications || [];
            return (
              <View key={rx.id || i} style={[S.rxCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <View style={[S.ava, { backgroundColor: clrFor(rx.patient_name || '') }]}>
                    <Text style={S.avaT}>{iniStr(rx.patient_name || 'P')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 15 }}>{rx.patient_name || 'Patient'}</Text>
                    <Text style={{ color: c.txt2, fontSize: 12 }}>
                      {rx.date ? format(new Date(rx.date), 'dd MMM yyyy', { locale: fr }) : ''}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: sCol(rx.status) + '20' }}>
                    <Text style={{ color: sCol(rx.status), fontSize: 11, fontFamily: FONTS.semibold }}>
                      {sLbl(rx.status)}
                    </Text>
                  </View>
                </View>
                <View style={{ gap: 4, marginBottom: 10 }}>
                  {meds.slice(0, 3).map((m, mi) => (
                    <View key={mi} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: c.blue + '12', alignSelf: 'flex-start' }}>
                      <Text style={{ color: c.blue, fontSize: 12, fontFamily: FONTS.medium }}>
                        {m.name || 'Médicament'}{m.dosage ? ` · ${m.dosage}` : ''}{m.frequency ? ` · ${m.frequency}` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handleShowQr(rx)}
                    style={[S.rxBtn, { backgroundColor: dk ? '#1A2333' : '#F0F4F8', borderColor: c.border }]}
                  >
                    <QrCode size={14} color={c.blue} />
                    <Text style={{ color: c.blue, fontSize: 13, fontFamily: FONTS.medium }}>QR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const meds = rx.medications || [];
                      const content = [
                        '=== ORDONNANCE MEDICALE ===',
                        `Patient : ${rx.patient_name || 'N/A'}`,
                        `Date    : ${rx.date ? new Date(rx.date).toLocaleDateString('fr-FR') : 'N/A'}`,
                        `Statut  : ${rx.status === 'active' ? 'Active' : rx.status || 'N/A'}`,
                        '',
                        'MEDICAMENTS :',
                        ...meds.map((m, mi) => `  ${mi + 1}. ${m.name || 'Médicament'}${m.dosage ? ' — ' + m.dosage : ''}${m.frequency ? ' — ' + m.frequency : ''}${m.duration ? ' — ' + m.duration : ''}`),
                        '',
                        rx.notes ? `Notes : ${rx.notes}` : '',
                        '',
                        '--- Healy Mobile v2.1.0 ---',
                      ].filter(Boolean).join('\n');
                      try {
                        await Share.share({ message: content, title: 'Ordonnance médicale' });
                      } catch {
                        Alert.alert('Export', 'Impossible de partager l\'ordonnance.');
                      }
                    }}
                    style={[S.rxBtn, { backgroundColor: dk ? '#1A2333' : '#F0F4F8', borderColor: c.border }]}
                  >
                    <Download size={14} color={c.txt2} />
                    <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.medium }}>PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[S.rxBtn, { backgroundColor: c.red + '15', borderColor: c.red + '30', flex: 0, paddingHorizontal: 14 }]}
                    onPress={() => Alert.alert('Supprimer', 'Supprimer cette ordonnance ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: () => setRxs(prev => prev.filter((_, idx) => idx !== i)) },
                    ])}>
                    <Trash2 size={14} color={c.red} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
      }
      <NewPrescriptionModal
        visible={showNewModal}
        onClose={onCloseNewModal}
        onCreated={rx => { setRxs(prev => [rx, ...prev]); onRxCreated && onRxCreated(rx); onCloseNewModal(); }}
        c={c} dk={dk}
      />

      {/* ── Modal QR Code ordonnance ── */}
      <Modal
        visible={!!qrRx}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => { setQrRx(null); setQrImage(null); }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 28, overflow: 'hidden' }}>
            {/* Bouton fermer */}
            <TouchableOpacity
              onPress={() => { setQrRx(null); setQrImage(null); }}
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, padding: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 20 }}
            >
              <X size={20} color="#333" />
            </TouchableOpacity>

            {/* En-tête gradient */}
            <View style={{ backgroundColor: '#304B71', padding: 24, alignItems: 'center' }}>
              <QrCode size={28} color="#fff" style={{ marginBottom: 8 }} />
              <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONTS.extrabold, marginBottom: 2 }}>
                QR Ordonnance
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: FONTS.regular, textAlign: 'center' }}>
                {qrRx?.patient_name || 'Patient'}{qrRx?.date ? ' · ' + new Date(qrRx.date).toLocaleDateString('fr-FR') : ''}
              </Text>
            </View>

            {/* Image QR */}
            <View style={{ width: 240, height: 240, alignSelf: 'center', margin: 20, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#eee' }}>
              {qrLoading
                ? <ActivityIndicator color="#304B71" size="large" />
                : qrImage
                  ? <Image source={{ uri: qrImage }} style={{ width: 220, height: 220 }} resizeMode="contain" />
                  : null}
            </View>

            {/* Médicaments */}
            <Text style={{ textAlign: 'center', fontSize: 12, fontFamily: FONTS.regular, color: '#666', marginBottom: 8, paddingHorizontal: 20 }}>
              Présentez ce QR Code à la pharmacie
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 24 }}>
              {(qrRx?.medications || []).slice(0, 4).map((m, i) => (
                <View key={i} style={{ backgroundColor: '#EEF3FB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: '#304B71', fontFamily: FONTS.bold }}>{m.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS TAB
// ─────────────────────────────────────────────────────────────────────────────
const StatsTab = memo(function StatsTab({ c, dk, dashData }) {
  const BAR  = [4, 6, 5, 8, 7, 10, 12];
  const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const maxB = Math.max(...BAR);

  const kpis = useMemo(() => [
    { value: dashData?.total_appointments   ?? 42,  label: 'Planning',    Icon: Calendar, col: c.green,   bg: c.green   + '18' },
    { value: dashData?.total_prescriptions  ?? 24,  label: 'Ordonnances', Icon: FileText, col: '#9B7FD4', bg: '#9B7FD418'      },
    { value: dashData?.total_patients       ?? 148, label: 'Patients',    Icon: Users,    col: '#E8A838', bg: '#E8A83818'      },
    {
      value: dashData?.average_rating ? String(Number(dashData.average_rating).toFixed(1)) : '4.8',
      label: 'Note moyenne', Icon: Star, col: '#9B7FD4', bg: '#9B7FD418',
    },
  ], [dashData, c]);

  const motifs = [
    { label: 'Consultation de suivi',     pct: 38 },
    { label: 'Renouvellement ordonnance', pct: 24 },
    { label: 'Première consultation',     pct: 18 },
    { label: 'Contrôle tension',          pct: 12 },
    { label: 'Autre',                     pct: 8  },
  ];

  return (
    <View style={{ padding: 16, gap: 16 }}>
      <View style={S.kpiGrid}>
        {kpis.map(({ value, label, Icon, col, bg }, i) => (
          <View key={i} style={[S.kpiCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[S.iconBox, { backgroundColor: bg }]}><Icon size={18} color={col} /></View>
            <Text style={[S.kpiVal, { color: c.txt }]}>{value}</Text>
            <Text style={[S.kpiLbl, { color: c.txt2 }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Bar chart */}
      <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
          <View>
            <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16 }}>Activité hebdomadaire</Text>
            <Text style={{ color: c.txt3, fontSize: 12 }}>RDV par jour cette semaine</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: c.green + '20' }}>
            <TrendingUp size={11} color={c.green} />
            <Text style={{ color: c.green, fontSize: 11, fontFamily: FONTS.bold }}>+18%</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130, marginTop: 16 }}>
          {BAR.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 10, fontFamily: FONTS.semibold, color: c.txt2 }}>{v}</Text>
              <View style={{ width: '100%', height: (v / maxB) * 100, backgroundColor: i === BAR.length - 1 ? c.blue : c.blue + '35', borderRadius: 6 }} />
              <Text style={{ fontSize: 10, fontFamily: FONTS.medium, color: c.txt3 }}>{DAYS[i]}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top motifs */}
      <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16, marginBottom: 14 }}>Top motifs</Text>
        {motifs.map(({ label, pct }, i) => (
          <View key={i} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ color: c.txt, fontFamily: FONTS.medium, fontSize: 14 }}>{label}</Text>
              <Text style={{ color: c.txt2, fontFamily: FONTS.semibold, fontSize: 13 }}>{pct}%</Text>
            </View>
            <View style={{ height: 5, borderRadius: 3, backgroundColor: c.border, overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${pct}%`, backgroundColor: c.blue, borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// CRÉNEAU MODAL — génération + liste + suppression
// ─────────────────────────────────────────────────────────────────────────────
function generateSlots(start, end, duration, breakStart, breakEnd) {
  const slots = [];
  const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toStr = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  let cur = toMin(start);
  const endM = toMin(end);
  const bsM  = breakStart ? toMin(breakStart) : null;
  const beM  = breakEnd   ? toMin(breakEnd)   : null;
  while (cur + duration <= endM) {
    if (bsM && beM && cur >= bsM && cur < beM) { cur = beM; continue; }
    slots.push({ time: toStr(cur), end: toStr(cur + duration) });
    cur += duration;
  }
  return slots;
}

const DUREES = [15, 20, 30, 45, 60];

const CreneauModal = memo(function CreneauModal({ visible, onClose, c, dk }) {
  // tous les hooks en haut
  const [slots,    setSlots]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [config,   setConfig]   = useState({
    heureDebut: '09:00', heureFin: '17:00',
    pauseDebut: '12:00', pauseFin: '13:00',
    duree: 30,
  });

  useEffect(() => {
    if (!visible) return;
    loadSlots();
  }, [visible]);

  async function loadSlots() {
    setLoading(true);
    try {
      const cached = await cacheGet(CACHE_KEY_SLOTS);
      if (cached) setSlots(cached);
      const data = await api.getMySlots();
      const list = Array.isArray(data) ? data : data?.results || [];
      setSlots(list);
      cacheSet(CACHE_KEY_SLOTS, list);
    } catch {}
    finally { setLoading(false); }
  }

  async function deleteSlot(id) {
    Alert.alert('Supprimer', 'Voulez-vous supprimer ce créneau ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        setSaving(id);
        try {
          await api.deleteSlot(id);
          setSlots(prev => prev.filter(s => s.id !== id));
          AsyncStorage.removeItem(CACHE_KEY_SLOTS);
        } catch (e) { Alert.alert('Erreur', e?.message || 'Erreur'); }
        finally { setSaving(null); }
      }},
    ]);
  }

  async function generateAndSave() {
    const generated = generateSlots(config.heureDebut, config.heureFin, config.duree, config.pauseDebut, config.pauseFin);
    if (generated.length === 0) return Alert.alert('Erreur', 'Aucun créneau généré avec ces paramètres.');
    setSaving('generate');
    try {
      const saved = await Promise.all(
        generated.map(s => api.createSlot({ start_time: s.time, end_time: s.end, duration: config.duree }))
      );
      setSlots(prev => [...prev, ...saved.filter(Boolean)]);
      AsyncStorage.removeItem(CACHE_KEY_SLOTS);
      setShowForm(false);
      Alert.alert('Succès', `${saved.length} créneaux générés.`);
    } catch (e) { Alert.alert('Erreur', e?.message || 'Erreur lors de la génération.'); }
    finally { setSaving(null); }
  }

  const grouped = useMemo(() => {
    const groups = {};
    slots.forEach(s => {
      const key = s.date || s.slot_date || 'Non défini';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[S.sheet, { backgroundColor: c.card, maxHeight: '90%' }]}>
          <View style={[S.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <View>
              <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 20 }}>Créneaux</Text>
              <Text style={{ color: c.txt2, fontSize: 12 }}>Gérer vos disponibilités</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity onPress={() => setShowForm(p => !p)} style={[S.addBtn, { backgroundColor: c.blue }]}>
                <Plus size={14} color="#fff" />
                <Text style={S.addBtnTxt}>Générer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={[S.closeCircle, { backgroundColor: c.border }]}>
                <X size={16} color={c.txt2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Config form */}
          {showForm && (
            <View style={{ borderRadius: 14, padding: 14, backgroundColor: c.blue + '08', borderWidth: 1, borderColor: c.blue + '25', marginBottom: 16, gap: 10 }}>
              <Text style={{ color: c.blue, fontFamily: FONTS.bold, fontSize: 14 }}>Configuration</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[S.lbl, { color: c.txt3 }]}>DÉBUT</Text>
                  <TextInput style={[S.inp, { backgroundColor: c.card, borderColor: c.border, color: c.txt }]}
                    value={config.heureDebut} onChangeText={v => setConfig(p => ({ ...p, heureDebut: v }))}
                    placeholder="09:00" placeholderTextColor={c.txt3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.lbl, { color: c.txt3 }]}>FIN</Text>
                  <TextInput style={[S.inp, { backgroundColor: c.card, borderColor: c.border, color: c.txt }]}
                    value={config.heureFin} onChangeText={v => setConfig(p => ({ ...p, heureFin: v }))}
                    placeholder="17:00" placeholderTextColor={c.txt3} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[S.lbl, { color: c.txt3 }]}>PAUSE DÉBUT</Text>
                  <TextInput style={[S.inp, { backgroundColor: c.card, borderColor: c.border, color: c.txt }]}
                    value={config.pauseDebut} onChangeText={v => setConfig(p => ({ ...p, pauseDebut: v }))}
                    placeholder="12:00" placeholderTextColor={c.txt3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.lbl, { color: c.txt3 }]}>PAUSE FIN</Text>
                  <TextInput style={[S.inp, { backgroundColor: c.card, borderColor: c.border, color: c.txt }]}
                    value={config.pauseFin} onChangeText={v => setConfig(p => ({ ...p, pauseFin: v }))}
                    placeholder="13:00" placeholderTextColor={c.txt3} />
                </View>
              </View>
              <Text style={[S.lbl, { color: c.txt3 }]}>DURÉE PAR CRÉNEAU</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {DUREES.map(d => (
                  <TouchableOpacity key={d} onPress={() => setConfig(p => ({ ...p, duree: d }))}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1,
                      backgroundColor: config.duree === d ? c.blue : 'transparent',
                      borderColor: config.duree === d ? c.blue : c.border }}>
                    <Text style={{ color: config.duree === d ? '#fff' : c.txt2, fontSize: 12, fontFamily: FONTS.semibold }}>
                      {d} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={generateAndSave} disabled={saving === 'generate'}
                style={[S.addBtn, { backgroundColor: c.blue, alignSelf: 'stretch', justifyContent: 'center', paddingVertical: 13 }]}>
                {saving === 'generate'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[S.addBtnTxt, { fontSize: 14 }]}>Générer les créneaux</Text>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* Slots list */}
          {loading
            ? <ActivityIndicator color={c.blue} style={{ marginVertical: 30 }} />
            : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {grouped.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40, gap: 12 }}>
                    <Clock size={40} color={c.txt3} />
                    <Text style={{ color: c.txt2, fontFamily: FONTS.semibold, fontSize: 16 }}>Aucun créneau</Text>
                    <Text style={{ color: c.txt3, fontSize: 13, textAlign: 'center' }}>
                      Appuyez sur "Générer" pour créer vos créneaux
                    </Text>
                  </View>
                ) : (
                  grouped.map(([date, daySlots]) => (
                    <View key={date} style={{ marginBottom: 16 }}>
                      <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 14, marginBottom: 8 }}>
                        {date !== 'Non défini'
                          ? format(new Date(date), 'EEEE dd MMM yyyy', { locale: fr })
                          : 'Créneaux récurrents'
                        }
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {daySlots.map(slot => (
                          <View key={slot.id} style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6,
                            backgroundColor: slot.is_booked ? c.red + '12' : c.green + '12',
                            borderWidth: 1,
                            borderColor: slot.is_booked ? c.red + '30' : c.green + '30',
                            borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
                          }}>
                            <Clock size={12} color={slot.is_booked ? c.red : c.green} />
                            <Text style={{ color: slot.is_booked ? c.red : c.green, fontFamily: FONTS.semibold, fontSize: 13 }}>
                              {slot.start_time?.substring(0, 5) || slot.time}
                            </Text>
                            {!slot.is_booked && (
                              <TouchableOpacity onPress={() => deleteSlot(slot.id)} style={{ marginLeft: 2 }}>
                                {saving === slot.id
                                  ? <ActivityIndicator size="small" color={c.red} />
                                  : <X size={13} color={c.red} />
                                }
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )
          }
        </View>
      </View>
    </Modal>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD PATIENT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function AddPatientModal({ visible, onClose, onAdd, c }) {
  const [f, setF] = useState({ firstName: '', lastName: '', age: '', phone: '', condition: '', notes: '' });
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }));
  const reset = () => setF({ firstName: '', lastName: '', age: '', phone: '', condition: '', notes: '' });
  const canSave = f.firstName.trim() || f.lastName.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[S.sheet, { backgroundColor: c.card }]}>
          <View style={[S.handle, { backgroundColor: c.border }]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <View style={[S.iconBox, { backgroundColor: c.blue + '18' }]}><Plus size={18} color={c.blue} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 17 }}>Nouveau patient</Text>
              <Text style={{ color: c.txt2, fontSize: 12 }}>Ajouté localement à votre liste</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[S.closeCircle, { backgroundColor: c.border }]}>
              <X size={16} color={c.txt2} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[S.lbl, { color: c.txt3 }]}>PRÉNOM</Text>
              <TextInput style={[S.inp, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                placeholder="Ahmed" placeholderTextColor={c.txt3} value={f.firstName} onChangeText={v => upd('firstName', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.lbl, { color: c.txt3 }]}>NOM</Text>
              <TextInput style={[S.inp, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                placeholder="Meziane" placeholderTextColor={c.txt3} value={f.lastName} onChangeText={v => upd('lastName', v)} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[S.lbl, { color: c.txt3 }]}>ÂGE</Text>
              <TextInput style={[S.inp, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                placeholder="35" placeholderTextColor={c.txt3} keyboardType="numeric" value={f.age} onChangeText={v => upd('age', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.lbl, { color: c.txt3 }]}>TÉLÉPHONE</Text>
              <TextInput style={[S.inp, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                placeholder="0555 00 00 00" placeholderTextColor={c.txt3} keyboardType="phone-pad" value={f.phone} onChangeText={v => upd('phone', v)} />
            </View>
          </View>
          <Text style={[S.lbl, { color: c.txt3 }]}>CONDITION / MOTIF</Text>
          <TextInput style={[S.inp, { backgroundColor: c.bg, borderColor: c.border, color: c.txt, marginBottom: 12 }]}
            placeholder="ex : Hypertension" placeholderTextColor={c.txt3} value={f.condition} onChangeText={v => upd('condition', v)} />
          <Text style={[S.lbl, { color: c.txt3 }]}>NOTES</Text>
          <TextInput style={[S.inp, S.ta, { backgroundColor: c.bg, borderColor: c.border, color: c.txt, marginBottom: 20 }]}
            placeholder="Observations initiales..." placeholderTextColor={c.txt3} multiline value={f.notes} onChangeText={v => upd('notes', v)} />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[S.cancelBtn, { borderColor: c.border }]}>
              <Text style={{ color: c.txt2, fontFamily: FONTS.semibold, fontSize: 15 }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => {
              try {
                const created = await api.createExternalPatient({
                  first_name: f.firstName, last_name: f.lastName,
                  age: f.age ? parseInt(f.age) : undefined,
                  phone: f.phone,
                  condition: f.condition, notes: f.notes,
                });
                onAdd(created || f);
              } catch {
                // Fallback : ajout local si l'API échoue
                onAdd(f);
              }
              reset();
            }}
              style={[S.saveBtn, { backgroundColor: c.blue, opacity: canSave ? 1 : 0.5 }]}
              disabled={!canSave}>
              <Check size={15} color="#fff" />
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW PRESCRIPTION MODAL
// ─────────────────────────────────────────────────────────────────────────────
const FREQ_OPTIONS = ['1x/jour', '2x/jour', '3x/jour', 'Matin & soir', 'À la demande'];

function NewPrescriptionModal({ visible, onClose, onCreated, c }) {
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSugg,   setPatientSugg]   = useState([]);
  const [selectedPat,   setSelectedPat]   = useState(null); // { id, user_id, name }
  const [meds,    setMeds]    = useState([{ name: '', dosage: '', frequency: '1x/jour', duration: '' }]);
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [freqIdx, setFreqIdx] = useState(null);

  const addMed = () => { if (meds.length < 10) setMeds(p => [...p, { name: '', dosage: '', frequency: '1x/jour', duration: '' }]); };
  const updMed = (i, k, v) => setMeds(p => p.map((m, idx) => idx === i ? { ...m, [k]: v } : m));
  const reset  = () => {
    setPatientSearch(''); setPatientSugg([]); setSelectedPat(null);
    setMeds([{ name: '', dosage: '', frequency: '1x/jour', duration: '' }]); setNotes('');
  };

  // Auto-complétion patient depuis la liste /patients/my-patients/
  useEffect(() => {
    if (!visible) return;
    if (!patientSearch.trim() || selectedPat) { setPatientSugg([]); return; }
    const timer = setTimeout(() => {
      api.getDoctorPatients().then(d => {
        const list = Array.isArray(d) ? d : d?.results || [];
        const q = patientSearch.toLowerCase();
        setPatientSugg(
          list.filter(p =>
            `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(q)
          ).slice(0, 5)
        );
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, selectedPat, visible]);

  const patientName = selectedPat ? selectedPat.name : patientSearch;

  async function save() {
    if (!patientName.trim()) return Alert.alert('Erreur', 'Veuillez saisir un patient.');
    if (!meds[0].name.trim()) return Alert.alert('Erreur', 'Veuillez saisir au moins un médicament.');
    setSaving(true);
    try {
      const payload = {
        medications: meds,
        notes,
        ...(selectedPat?.id ? { patient_id: selectedPat.id } : { patient_name: patientName }),
      };
      const rx = await api.addPrescription(payload);
      onCreated(rx || { id: Date.now().toString(), patient_name: patientName, medications: meds, notes, status: 'active', date: new Date().toISOString() });
      reset();
    } catch {
      // Fallback local si API pas dispo (backend ne supporte pas la création directe)
      onCreated({ id: Date.now().toString(), patient_name: patientName, medications: meds, notes, status: 'active', date: new Date().toISOString() });
      reset();
    }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <ScrollView
          style={{ maxHeight: '92%' }}
          contentContainerStyle={{ justifyContent: 'flex-end' }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[S.sheet, { backgroundColor: c.card }]}>
            <View style={[S.handle, { backgroundColor: c.border }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <View>
                <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 20 }}>Nouvelle ordonnance</Text>
                <Text style={{ color: c.txt2, fontSize: 12 }}>Créer une ordonnance</Text>
              </View>
              <TouchableOpacity onPress={() => { reset(); onClose(); }} style={[S.closeCircle, { backgroundColor: c.border }]}>
                <X size={16} color={c.txt2} />
              </TouchableOpacity>
            </View>

            <Text style={[S.lbl, { color: c.txt3 }]}>PATIENT</Text>
            <View style={[S.searchBar, { backgroundColor: c.bg, borderColor: c.border, marginBottom: 20 }]}>
              <Search size={15} color={c.txt3} />
              <TextInput
                style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                placeholder="Nom du patient..." placeholderTextColor={c.txt3}
                value={patientName}
                onChangeText={v => { setSelectedPat(null); setPatientSearch(v); }}
              />
              {selectedPat && (
                <TouchableOpacity onPress={() => { setSelectedPat(null); setPatientSearch(''); }}>
                  <X size={16} color={c.txt3} />
                </TouchableOpacity>
              )}
            </View>
            {/* Suggestions de patients */}
            {patientSugg.length > 0 && !selectedPat && (
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.card, marginBottom: 12, overflow: 'hidden' }}>
                {patientSugg.map((p, pi) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => { setSelectedPat({ id: p.id, user_id: p.user_id, name: `${p.first_name || ''} ${p.last_name || ''}`.trim() }); setPatientSugg([]); }}
                    style={{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: pi < patientSugg.length - 1 ? 1 : 0, borderBottomColor: c.border }}
                  >
                    <Text style={{ fontSize: 14, fontFamily: FONTS.semibold, color: c.txt }}>
                      {`${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Patient'}
                    </Text>
                    {(p.age || p.city) && (
                      <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3 }}>
                        {[p.age ? `${p.age} ans` : null, p.city || p.wilaya].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16 }}>Médicaments ({meds.length}/10)</Text>
              <TouchableOpacity onPress={addMed}>
                <Text style={{ color: c.blue, fontFamily: FONTS.semibold, fontSize: 14 }}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>

            {meds.map((m, i) => (
              <View key={i} style={{ borderRadius: 14, padding: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.bg, marginBottom: 10 }}>
                <Text style={[S.lbl, { color: c.txt3 }]}>MÉDICAMENT {i + 1}</Text>
                <TextInput style={[S.inp, { backgroundColor: c.card, borderColor: c.border, color: c.txt, marginBottom: 8 }]}
                  placeholder="Nom du médicament *" placeholderTextColor={c.txt3} value={m.name} onChangeText={v => updMed(i, 'name', v)} />
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <TextInput style={[S.inp, { flex: 1, backgroundColor: c.card, borderColor: c.border, color: c.txt }]}
                    placeholder="Dosage (ex: 500mg)" placeholderTextColor={c.txt3} value={m.dosage} onChangeText={v => updMed(i, 'dosage', v)} />
                  <TouchableOpacity onPress={() => setFreqIdx(freqIdx === i ? null : i)}
                    style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: c.blue + '40', backgroundColor: c.blue + '18' }}>
                    <Text style={{ color: c.blue, fontFamily: FONTS.semibold, fontSize: 13 }}>{m.frequency}</Text>
                  </TouchableOpacity>
                </View>
                {freqIdx === i && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {FREQ_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt} onPress={() => { updMed(i, 'frequency', opt); setFreqIdx(null); }}
                        style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
                          backgroundColor: m.frequency === opt ? c.blue : c.card,
                          borderColor: m.frequency === opt ? c.blue : c.border }}>
                        <Text style={{ color: m.frequency === opt ? '#fff' : c.txt2, fontSize: 12, fontFamily: FONTS.medium }}>
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TextInput style={[S.inp, { backgroundColor: c.card, borderColor: c.border, color: c.txt }]}
                  placeholder="Durée (ex : 30 jours)" placeholderTextColor={c.txt3} value={m.duration} onChangeText={v => updMed(i, 'duration', v)} />
              </View>
            ))}

            <Text style={[S.lbl, { color: c.txt3, marginTop: 8 }]}>NOTES (OPTIONNEL)</Text>
            <TextInput style={[S.inp, S.ta, { backgroundColor: c.bg, borderColor: c.border, color: c.txt, marginBottom: 20 }]}
              placeholder="Instructions spéciales, précautions..." placeholderTextColor={c.txt3} multiline value={notes} onChangeText={setNotes} />

            <TouchableOpacity onPress={save} disabled={saving}
              style={[S.saveBtn, { backgroundColor: c.blue, width: '100%', justifyContent: 'center', paddingVertical: 16, opacity: saving ? 0.7 : 1 }]}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <><Check size={16} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 16 }}>Générer l'ordonnance</Text></>
              }
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HORAIRES (page complète)
// ─────────────────────────────────────────────────────────────────────────────
const DAYS_CFG = [
  { key: 'monday',    short: 'LUN', label: 'Lundi'    },
  { key: 'tuesday',   short: 'MAR', label: 'Mardi'    },
  { key: 'wednesday', short: 'MER', label: 'Mercredi' },
  { key: 'thursday',  short: 'JEU', label: 'Jeudi'    },
  { key: 'friday',    short: 'VEN', label: 'Vendredi' },
  { key: 'saturday',  short: 'SAM', label: 'Samedi'   },
  { key: 'sunday',    short: 'DIM', label: 'Dimanche' },
];
const DEFAULT_DAY = { enabled: true, open: '09:00', close: '17:00', breakStart: '12:00', breakEnd: '13:00', slotDuration: 30 };
const SLOT_OPTS   = [15, 20, 30, 45, 60];

function buildDefaults() {
  const d = {};
  DAYS_CFG.forEach(({ key }, i) => { d[key] = { ...DEFAULT_DAY, enabled: i < 5 }; });
  return d;
}

function DoctorHoraires({ onBack }) {
  const { dk }     = useTheme();
  const c          = dk ? T.dark : T.light;
  const [schedule, setSchedule] = useState(buildDefaults());
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.getSchedules()
      .then(data => {
        if (data && typeof data === 'object') {
          const merged = buildDefaults();
          DAYS_CFG.forEach(({ key }) => { if (data[key]) merged[key] = { ...merged[key], ...data[key] }; });
          setSchedule(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updDay = useCallback((key, field, val) => {
    setSchedule(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  }, []);

  async function save() {
    setSaving(true);
    try { await api.saveSchedule(schedule); Alert.alert('Succès', 'Horaires enregistrés.'); }
    catch (e) { Alert.alert('Erreur', e?.message || 'Erreur'); }
    finally { setSaving(false); }
  }

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <View style={[SH.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={onBack} style={SH.backBtn}>
          <ChevronLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[SH.headerTitle, { color: c.txt }]}>Horaires</Text>
          <Text style={[SH.headerSub, { color: c.txt2 }]}>Vos disponibilités hebdomadaires</Text>
        </View>
        <TouchableOpacity onPress={save} disabled={saving}
          style={[SH.saveBtn, { backgroundColor: c.blue, opacity: saving ? 0.7 : 1 }]}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={SH.saveBtnTxt}>Enregistrer</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        {DAYS_CFG.map(({ key, short, label }) => {
          const day = schedule[key];
          return (
            <View key={key} style={[SH.dayCard, { backgroundColor: c.card, borderColor: day.enabled ? c.blue + '30' : c.border, opacity: day.enabled ? 1 : 0.7 }]}>
              <View style={SH.dayHeader}>
                <View style={[SH.dayBadge, { backgroundColor: day.enabled ? c.blue + '18' : c.border }]}>
                  <Text style={[SH.dayShort, { color: day.enabled ? c.blue : c.txt3 }]}>{short}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16 }}>{label}</Text>
                  <Text style={{ color: day.enabled ? c.green : c.txt3, fontSize: 12, fontFamily: FONTS.medium }}>
                    {day.enabled ? 'Ouvert' : 'Fermé'}
                  </Text>
                </View>
                <Switch
                  value={day.enabled} onValueChange={v => updDay(key, 'enabled', v)}
                  trackColor={{ false: c.border, true: c.blue + '60' }}
                  thumbColor={day.enabled ? c.blue : '#f0f0f0'}
                />
              </View>

              {day.enabled && (
                <>
                  <Text style={[SH.sectionLabel, { color: c.txt3 }]}>OUVERTURE</Text>
                  <View style={SH.timeRow}>
                    <HTimeInput value={day.open}       onChange={v => updDay(key, 'open', v)}       c={c} />
                    <Text style={{ color: c.txt3, fontSize: 18 }}>→</Text>
                    <HTimeInput value={day.close}      onChange={v => updDay(key, 'close', v)}      c={c} />
                  </View>
                  <Text style={[SH.sectionLabel, { color: c.txt3 }]}>PAUSE DÉJEUNER</Text>
                  <View style={SH.timeRow}>
                    <HTimeInput value={day.breakStart} onChange={v => updDay(key, 'breakStart', v)} c={c} />
                    <Text style={{ color: c.txt3, fontSize: 18 }}>→</Text>
                    <HTimeInput value={day.breakEnd}   onChange={v => updDay(key, 'breakEnd', v)}   c={c} />
                  </View>
                  <View style={[SH.slotRow, { backgroundColor: c.green + '12', borderRadius: 10, padding: 10 }]}>
                    <Activity size={14} color={c.green} />
                    <Text style={{ color: c.green, fontFamily: FONTS.medium, fontSize: 13, flex: 1 }}>Durée / consultation</Text>
                    <View style={SH.slotPicker}>
                      {SLOT_OPTS.map(opt => (
                        <TouchableOpacity key={opt} onPress={() => updDay(key, 'slotDuration', opt)}
                          style={[SH.slotChip, { backgroundColor: day.slotDuration === opt ? c.green : 'transparent', borderColor: day.slotDuration === opt ? c.green : c.green + '40' }]}>
                          <Text style={{ color: day.slotDuration === opt ? '#fff' : c.green, fontSize: 11, fontFamily: FONTS.semibold }}>
                            {day.slotDuration === opt ? `${opt} min` : `${opt}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function HTimeInput({ value, onChange, c }) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  function handleBlur() {
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const formatted = `${String(Math.min(23, parseInt(match[1]))).padStart(2, '0')}:${String(Math.min(59, parseInt(match[2]))).padStart(2, '0')}`;
      setText(formatted); onChange(formatted);
    } else { setText(value); }
  }
  function handleChange(t) {
    let cleaned = t.replace(/[^0-9:]/g, '');
    if (cleaned.length === 2 && !cleaned.includes(':') && text.length === 1) cleaned += ':';
    if (cleaned.length <= 5) setText(cleaned);
  }
  return (
    <TextInput
      style={[SH.timeInput, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
      value={text} onChangeText={handleChange} onBlur={handleBlur}
      keyboardType="numeric" maxLength={5} placeholder="00:00" placeholderTextColor={c.txt3}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const SectionCard = memo(function SectionCard({ title, badge, badgeBg, badgeCol, c, children }) {
  return (
    <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16 }}>{title}</Text>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: badgeBg }}>
          <Text style={{ color: badgeCol, fontSize: 11, fontFamily: FONTS.semibold }}>{badge}</Text>
        </View>
      </View>
      {children}
    </View>
  );
});

function EmptyBox({ icon, text, c }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
      {icon}
      <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.regular, textAlign: 'center' }}>{text}</Text>
    </View>
  );
}

const ApptRow = memo(function ApptRow({ a, c, dk }) {
  const name = a.patient_name || 'Patient';
  return (
    <View style={[S.row, { backgroundColor: dk ? '#1A2333' : '#F8FAFC', marginBottom: 8 }]}>
      <View style={[S.ava, { backgroundColor: c.blue, width: 40, height: 40, borderRadius: 12 }]}>
        <Text style={S.avaT}>{iniStr(name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 14 }}>{name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Clock size={11} color={c.txt3} />
          <Text style={{ color: c.txt2, fontSize: 12 }}>{a.time || a.slot_time || '—'}</Text>
        </View>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 8 },
  headerTitle:  { fontSize: 22, fontFamily: FONTS.bold },
  headerSub:    { fontSize: 12, fontFamily: FONTS.regular, marginTop: 1 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  iconCircle:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addBtnTxt:    { color: '#fff', fontFamily: FONTS.semibold, fontSize: 13 },
  filterChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  tabBar: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    flexDirection: 'row', borderTopWidth: 0, borderRadius: 28,
    height: 68, paddingBottom: 10, paddingTop: 6, paddingHorizontal: 8,
    elevation: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14, shadowRadius: 18,
  },
  tabItem:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 10, fontFamily: FONTS.semibold },
  card:         { borderRadius: 16, padding: 16, borderWidth: 1 },
  kpiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpiCard:      { width: (SW - 44) / 2, borderRadius: 16, padding: 14, borderWidth: 1, gap: 6 },
  iconBox:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiVal:       { fontSize: 28, fontFamily: FONTS.extrabold, lineHeight: 32 },
  kpiLbl:       { fontSize: 12, fontFamily: FONTS.regular },
  row:          { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12 },
  iconBtn:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  horRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  patientRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  ava:          { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avaT:         { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11 },
  rxCard:       { borderRadius: 16, padding: 14, borderWidth: 1 },
  rxBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, flex: 1, justifyContent: 'center' },
  todayBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  closeCircle:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lbl:          { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5, marginBottom: 6 },
  inp:          { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.regular },
  ta:           { minHeight: 80, textAlignVertical: 'top' },
  cancelBtn:    { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  saveBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
});

const SH = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold },
  headerSub:   { fontSize: 12, fontFamily: FONTS.regular, marginTop: 1 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  saveBtn:     { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  saveBtnTxt:  { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
  dayCard:     { borderRadius: 18, padding: 16, borderWidth: 1.5, gap: 10 },
  dayHeader:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  dayBadge:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayShort:    { fontSize: 12, fontFamily: FONTS.extrabold, letterSpacing: 0.5 },
  sectionLabel:{ fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.8, marginTop: 4 },
  timeRow:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeInput:   { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, fontFamily: FONTS.semibold, textAlign: 'center' },
  slotRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  slotPicker:  { flexDirection: 'row', gap: 4 },
  slotChip:    { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
});