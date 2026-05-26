import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LayoutDashboard, Users, Calendar, FileText, Bell,
  Shield, Activity, ChevronRight, Search, Check, X,
  UserCog, Clock, Stethoscope, TriangleAlert,
  Plus, Building2, CircleCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useData } from '../../context/DataContext';
import { T, FONTS, GRADIENTS, HMS, ROLE_META, SHADOWS } from '../../theme';
import { Card, Avatar, SectionHeader, EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const NAV_ITEMS = [
  { key: 'overview',  label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { key: 'users',     label: 'Utilisateurs',     icon: Users },
  { key: 'pending',   label: 'En attente',        icon: Shield },
  { key: 'schedule',  label: 'Planning',          icon: Calendar },
  { key: 'logs',      label: 'Journaux',          icon: Activity },
];

export default function AdminDashboardScreen() {
  const { userData, logout } = useAuth();
  const { dk } = useTheme();
  const { unreadNotifs, refresh } = useData();
  // Admin always uses dark-themed HMS palette
  const c = dk ? HMS : T.light;
  const baseC = dk ? T.dark : T.light;

  const [activeTab, setActiveTab]       = useState('overview');
  const [refreshing, setRefreshing]     = useState(false);
  const [stats, setStats]               = useState(null);
  const [users, setUsers]               = useState([]);
  const [pending, setPending]           = useState([]);
  const [logs, setLogs]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  // Reject modal — cross-platform alternative to Alert.prompt (iOS-only)
  const [rejectTarget, setRejectTarget] = useState(null); // userId en cours de rejet
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [s, u, p, l] = await Promise.allSettled([
        api.getAdminDashboard(),
        api.getAdminUsers({ limit: 20 }),
        api.getPendingDoctors(),
        api.getAuditLogs({ limit: 20 }),
      ]);
      if (s.status === 'fulfilled') setStats(s.value);
      if (u.status === 'fulfilled') setUsers(Array.isArray(u.value) ? u.value : u.value?.results || []);
      if (p.status === 'fulfilled') setPending(Array.isArray(p.value) ? p.value : p.value?.results || []);
      if (l.status === 'fulfilled') setLogs(Array.isArray(l.value) ? l.value : l.value?.results || []);
    } catch {} finally { setLoading(false); }
  }

  async function handleVerify(userId) {
    try {
      await api.verifyUser(userId);
      setPending(prev => prev.filter(u => u.id !== userId));
      Alert.alert('Validé', 'Le compte a été approuvé.');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  }

  function handleReject(userId) {
    // Alert.prompt est iOS-only → on utilise un modal cross-platform
    setRejectTarget(userId);
    setRejectReason('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const userId = rejectTarget;
    setRejectTarget(null);
    try {
      await api.rejectUser(userId, rejectReason.trim());
      setPending(prev => prev.filter(u => u.id !== userId));
      Alert.alert('Rejeté', 'Le compte a été rejeté.');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refresh(), loadData()]);
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: baseC.bg }} edges={['top']}>
      {/* Navbar */}
      <View style={[styles.navbar, { backgroundColor: baseC.nav, borderBottomColor: baseC.border }]}>
        <LinearGradient colors={[c.red || '#E05555', '#B33B3B']} style={styles.navLogo}>
          <Plus size={16} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.navTitle, { color: baseC.txt }]}>Healy</Text>
          <Text style={[styles.navRole, { color: baseC.red }]}>Admin</Text>
        </View>
        <TouchableOpacity style={styles.navIcon}>
          <Bell size={20} color={baseC.txt2} />
          {unreadNotifs > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: baseC.red }]}>
              <Text style={{ color: '#fff', fontSize: 9, fontFamily: FONTS.bold }}>{unreadNotifs}</Text>
            </View>
          )}
        </TouchableOpacity>
        {pending.length > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: baseC.amber }]}>
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>{pending.length}</Text>
          </View>
        )}
        <Avatar firstName={userData?.first_name || ''} lastName={userData?.last_name || ''} size={34} color={baseC.red} />
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { backgroundColor: baseC.nav, borderBottomColor: baseC.border }]}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setActiveTab(key)}
            style={[styles.tabItem, activeTab === key && { borderBottomColor: baseC.red }]}
          >
            <Icon size={16} color={activeTab === key ? baseC.red : baseC.txt3} />
            <Text style={[styles.tabLabel, { color: activeTab === key ? baseC.red : baseC.txt2 }]}>{label}</Text>
            {key === 'pending' && pending.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: baseC.amber }]}>
                <Text style={{ color: '#fff', fontSize: 9, fontFamily: FONTS.bold }}>{pending.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={baseC.red} />}
      >
        {activeTab === 'overview' && <AdminOverview c={baseC} dk={dk} stats={stats} loading={loading} pending={pending} users={users} />}
        {activeTab === 'users'    && <UsersTab c={baseC} dk={dk} users={users} />}
        {activeTab === 'pending'  && <PendingTab c={baseC} dk={dk} pending={pending} onVerify={handleVerify} onReject={handleReject} />}
        {activeTab === 'schedule' && <AdminScheduleTab c={baseC} dk={dk} />}
        {activeTab === 'logs'     && <LogsTab c={baseC} dk={dk} logs={logs} />}
      </ScrollView>

      {/* ── Modal rejet cross-platform (Alert.prompt est iOS-only) ── */}
      {rejectTarget !== null && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: baseC.card, borderRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: baseC.txt, marginBottom: 8 }}>Motif de rejet</Text>
            <Text style={{ fontSize: 13, color: baseC.txt2, marginBottom: 16 }}>Expliquez pourquoi ce compte est refusé (optionnel).</Text>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Ex: Documents insuffisants..."
              placeholderTextColor={baseC.txt3}
              multiline
              style={{
                borderWidth: 1, borderColor: baseC.border, borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 10, color: baseC.txt,
                fontSize: 14, fontFamily: FONTS.regular, minHeight: 80,
                textAlignVertical: 'top', backgroundColor: baseC.bg, marginBottom: 20,
              }}
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setRejectTarget(null)}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: baseC.border, alignItems: 'center' }}
              >
                <Text style={{ color: baseC.txt2, fontFamily: FONTS.semibold }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmReject}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: baseC.red || '#E05555', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontFamily: FONTS.bold }}>Rejeter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function AdminOverview({ c, dk, stats, loading, pending, users }) {
  if (loading) return <ActivityIndicator color={c.red} style={{ marginTop: 40 }} />;

  const statCards = [
    { label: 'Patients',      value: stats?.total_patients    ?? 0, color: c.blue,   Icon: Users },
    { label: 'Médecins',      value: stats?.total_doctors     ?? 0, color: c.green,  Icon: UserCog },
    { label: 'En attente',    value: pending.length,                 color: c.amber,  Icon: Clock },
    { label: 'Consultations', value: stats?.total_consultations ?? 0, color: c.purple, Icon: Stethoscope },
  ];

  return (
    <>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.welcomeBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.welcomeHello}>Panel Admin</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.welcomeName}>Healy HMS</Text>
          <Building2 size={20} color="#fff" />
        </View>
        <Text style={styles.welcomeSub}>
          {stats?.total_patients ?? 0} patients · {stats?.total_doctors ?? 0} médecins
        </Text>
      </LinearGradient>

      {pending.length > 0 && (
        <View style={[styles.alertBox, { backgroundColor: c.amber + '20', borderColor: c.amber }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TriangleAlert size={16} color={c.amber} />
            <Text style={{ color: c.amber, fontFamily: FONTS.bold, fontSize: 14 }}>
              {pending.length} dossier(s) en attente de validation
            </Text>
          </View>
        </View>
      )}

      <View style={styles.statsGrid}>
        {statCards.map(s => (
          <Card key={s.label} dk={dk} style={styles.statCard}>
            <View style={{ marginBottom: 6 }}>
              <s.Icon size={24} color={s.color} />
            </View>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: c.txt2 }]}>{s.label}</Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="Derniers utilisateurs" dk={dk} />
      {users.slice(0, 5).map(u => <UserCard key={u.id} user={u} c={c} dk={dk} />)}
    </>
  );
}

function UsersTab({ c, dk, users }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const ROLES = ['all', 'patient', 'doctor', 'pharmacist', 'caretaker', 'admin'];
  const filtered = users.filter(u => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || (u.email || '').includes(search.toLowerCase());
    const matchRole = filter === 'all' || u.role?.toLowerCase() === filter;
    return matchSearch && matchRole;
  });

  return (
    <>
      <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <Search size={16} color={c.txt3} />
        <TextInput style={[styles.searchInput, { color: c.txt }]} placeholder="Rechercher..." placeholderTextColor={c.txt3} value={search} onChangeText={setSearch} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
        {ROLES.map(r => (
          <TouchableOpacity key={r} onPress={() => setFilter(r)}
            style={[styles.chip, { backgroundColor: filter === r ? c.blue : c.card, borderColor: filter === r ? c.blue : c.border }]}>
            <Text style={{ color: filter === r ? '#fff' : c.txt2, fontSize: 12, fontFamily: FONTS.semibold, textTransform: 'capitalize' }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {filtered.length === 0
        ? <EmptyState icon={<Users size={40} color={c.txt3} />} title="Aucun utilisateur" dk={dk} />
        : filtered.map(u => <UserCard key={u.id} user={u} c={c} dk={dk} />)
      }
    </>
  );
}

function PendingTab({ c, dk, pending, onVerify, onReject }) {
  return pending.length === 0
    ? <EmptyState icon={<CircleCheck size={40} color={c.txt3} />} title="Aucun dossier en attente" subtitle="Tous les comptes médicaux ont été traités" dk={dk} />
    : pending.map(u => (
        <Card key={u.id} dk={dk} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <Avatar firstName={u.first_name || ''} lastName={u.last_name || ''} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.txt }]}>{u.first_name} {u.last_name}</Text>
              <Text style={[styles.cardSub, { color: c.txt2 }]}>{u.email}</Text>
              <Text style={[styles.cardSub, { color: c.txt3, textTransform: 'capitalize' }]}>{u.role || 'Médecin'}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => onVerify(u.id)}
              style={[styles.actionBtn, { backgroundColor: c.green + '20', borderColor: c.green }]}
            >
              <Check size={16} color={c.green} />
              <Text style={{ color: c.green, fontFamily: FONTS.bold, fontSize: 13 }}>Valider</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onReject(u.id)}
              style={[styles.actionBtn, { backgroundColor: c.red + '20', borderColor: c.red }]}
            >
              <X size={16} color={c.red} />
              <Text style={{ color: c.red, fontFamily: FONTS.bold, fontSize: 13 }}>Rejeter</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ));
}

function AdminScheduleTab({ c, dk }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.getAdminAppointments({ limit: 20 })
      .then(d => setAppointments(Array.isArray(d) ? d : d?.results || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />;
  return appointments.length === 0
    ? <EmptyState icon={<Calendar size={40} color={c.txt3} />} title="Aucun rendez-vous" dk={dk} />
    : appointments.map((a, i) => (
        <Card key={a.id || i} dk={dk} style={{ marginBottom: 10 }}>
          <Text style={[styles.cardTitle, { color: c.txt }]}>{a.patient_name || 'Patient'} → Dr. {a.doctor_name || '—'}</Text>
          <Text style={[styles.cardSub, { color: c.txt2 }]}>{a.date} à {a.time || '—'}</Text>
        </Card>
      ));
}

function LogsTab({ c, dk, logs }) {
  const LOG_COLORS_MAP = {
    success: c.green, warning: c.amber, danger: c.red, info: c.blue,
  };
  return logs.length === 0
    ? <EmptyState icon={<FileText size={40} color={c.txt3} />} title="Aucun journal" dk={dk} />
    : logs.map((log, i) => (
        <Card key={log.id || i} dk={dk} style={{ marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.logDot, { backgroundColor: LOG_COLORS_MAP[log.level] || c.blue }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: c.txt, fontSize: 13 }]}>{log.action || log.message || 'Action'}</Text>
              <Text style={[styles.cardSub, { color: c.txt3 }]}>
                {log.user_email || ''} · {log.created_at ? format(new Date(log.created_at), 'dd/MM HH:mm') : ''}
              </Text>
            </View>
          </View>
        </Card>
      ));
}

function UserCard({ user, c, dk }) {
  const rm = ROLE_META[user.role?.toLowerCase()] || ROLE_META.patient;
  return (
    <Card dk={dk} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar firstName={user.first_name || ''} lastName={user.last_name || ''} size={40} color={rm.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: c.txt }]}>{user.first_name} {user.last_name}</Text>
          <Text style={[styles.cardSub, { color: c.txt2 }]}>{user.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: rm.bg }]}>
          <Text style={{ color: rm.color, fontSize: 11, fontFamily: FONTS.bold, textTransform: 'capitalize' }}>{user.role || 'patient'}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  navbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  navLogo: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 16, fontFamily: FONTS.bold },
  navRole: { fontSize: 11, fontFamily: FONTS.semibold },
  navIcon: { padding: 6, position: 'relative' },
  notifBadge: { position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  tabBar: { borderBottomWidth: 1, maxHeight: 50 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontFamily: FONTS.semibold },
  tabBadge: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  welcomeBanner: { borderRadius: 20, padding: 20, marginBottom: 16 },
  welcomeHello: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: FONTS.regular },
  welcomeName: { color: '#fff', fontSize: 22, fontFamily: FONTS.extrabold, marginBottom: 4 },
  welcomeSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: FONTS.regular },
  alertBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: { width: '47%', alignItems: 'center' },
  statValue: { fontSize: 28, fontFamily: FONTS.extrabold },
  statLabel: { fontSize: 12, fontFamily: FONTS.medium, marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  cardTitle: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 2 },
  cardSub: { fontSize: 13, fontFamily: FONTS.regular },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  logDot: { width: 8, height: 8, borderRadius: 4 },
});
