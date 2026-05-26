/**
 * AppointmentsScreen.js — Refonte complète : design web → mobile
 * Compteurs par statut, filtres chips, carte avec accent coloré, modal détail
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Calendar, Plus, Clock, MapPin,
  ChevronRight, X, Check,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS, SHADOWS, STATUS_COLORS } from '../../theme';
import { EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const FILTERS = [
  { key:'all',       label:'Tous'       },
  { key:'confirmed', label:'Confirmés'  },
  { key:'pending',   label:'En attente' },
  { key:'completed', label:'Terminés'   },
  { key:'cancelled', label:'Annulés'    },
];

export default function AppointmentsScreen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [detailAppt,   setDetailAppt]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await api.getMyAppointments();
      setAppointments(Array.isArray(d) ? d : d?.results || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter(a => (a.status||'pending').toLowerCase() === filter);

  /* Compteurs pour la ligne récap */
  const counts = appointments.reduce((acc, a) => {
    const s = (a.status||'pending').toLowerCase();
    acc[s] = (acc[s]||0) + 1;
    return acc;
  }, {});

  return (
    <SafeAreaView style={{ flex:1, backgroundColor: c.bg }} edges={['top']}>

      {/* Header */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/')}
          style={S.backBtn} hitSlop={{top:20,bottom:20,left:20,right:20}}
        >
          <ArrowLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex:1 }}>
          <Text style={[S.headerTitle, { color: c.txt }]}>Mes Rendez-vous</Text>
          <Text style={[S.headerSub,   { color: c.txt3 }]}>{appointments.length} rendez-vous au total</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(app)/patient/find-doctors')}
          style={[S.addBtn, { backgroundColor: c.blueLight }]}
        >
          <Plus size={18} color={c.blue} />
        </TouchableOpacity>
      </View>

      {/* Ligne récap compteurs */}
      {!loading && appointments.length > 0 && (
        <View style={[S.summaryRow, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
          {[
            { label:'Confirmés',  key:'confirmed', color: c.green },
            { label:'En attente', key:'pending',   color: c.amber },
            { label:'Terminés',   key:'completed', color: c.blue  },
          ].map(item => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={S.summaryItem}
            >
              <Text style={{ fontSize:20, fontFamily: FONTS.extrabold, color: item.color }}>
                {counts[item.key] || 0}
              </Text>
              <Text style={{ fontSize:11, fontFamily: FONTS.medium, color: c.txt3 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* CTA prendre RDV */}
      <View style={{ padding:16, paddingBottom:4 }}>
        <TouchableOpacity
          onPress={() => router.push('/(app)/patient/find-doctors')}
          style={{ borderRadius:14, overflow:'hidden', ...SHADOWS.md }}
          activeOpacity={0.85}
        >
          <LinearGradient colors={GRADIENTS.primary} start={{x:0,y:0}} end={{x:1,y:0}} style={S.ctaBtnInner}>
            <Plus size={18} color="#fff" />
            <Text style={S.ctaBtnText}>Prendre un rendez-vous</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Filtres chips */}
      <View style={{ paddingVertical:12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap:8, paddingHorizontal:16 }}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[S.filterChip, {
                backgroundColor: filter === f.key ? c.blue : c.card,
                borderColor:     filter === f.key ? c.blue : c.border,
              }]}
            >
              <Text style={{ color: filter === f.key ? '#fff' : c.txt2, fontSize:13, fontFamily: FONTS.semibold }}>
                {f.label}
                {f.key !== 'all' && counts[f.key] ? ` (${counts[f.key]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste */}
      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding:16, paddingBottom:110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={c.blue} style={{ marginTop:60 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Calendar size={40} color={c.txt3} />}
            title="Aucun rendez-vous"
            subtitle={filter==='all' ? "Vous n'avez pas encore de rendez-vous." : "Aucun rendez-vous pour ce filtre."}
            dk={dk}
          />
        ) : (
          filtered.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              c={c}
              dk={dk}
              onPress={() => setDetailAppt(appt)}
            />
          ))
        )}
      </ScrollView>

      {/* Modal détail */}
      {detailAppt && (
        <DetailModal appt={detailAppt} c={c} dk={dk} onClose={() => setDetailAppt(null)} />
      )}
    </SafeAreaView>
  );
}

/* ── Carte rendez-vous ──────────────────────────────────────────────────────── */
function AppointmentCard({ appt, c, dk, onPress }) {
  const sc = STATUS_COLORS(c);
  const st = sc[(appt.status||'pending').toLowerCase()] || sc.pending;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ marginBottom:14 }}>
      <View style={[S.apptCard, { backgroundColor: c.card, borderColor: c.border }, SHADOWS.sm]}>
        {/* Accent coloré vertical */}
        <View style={[S.accentBar, { backgroundColor: st.color }]} />

        <View style={{ flex:1, padding:14 }}>
          {/* Ligne principale */}
          <View style={{ flexDirection:'row', alignItems:'center', marginBottom:10 }}>
            <View style={[S.dateBox, { backgroundColor: st.bg }]}>
              <Text style={[S.dateDay, { color: st.color }]}>
                {appt.date ? format(parseISO(appt.date),'dd') : '--'}
              </Text>
              <Text style={[S.dateMon, { color: st.color }]}>
                {appt.date ? format(parseISO(appt.date),'MMM',{locale:fr}).toUpperCase() : '---'}
              </Text>
            </View>
            <View style={{ flex:1, marginLeft:12 }}>
              <Text style={{ fontSize:14, fontFamily: FONTS.bold, color: c.txt, marginBottom:2 }} numberOfLines={1}>
                Dr. {appt.doctor_name || 'Médecin'}
              </Text>
              <Text style={{ fontSize:12, fontFamily: FONTS.regular, color: c.txt3 }}>
                {appt.doctor_specialty || 'Généraliste'}
              </Text>
            </View>
            <View style={[S.statusPill, { backgroundColor: st.bg }]}>
              <Text style={[S.statusPillText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>

          {/* Séparateur */}
          <View style={{ height:1, backgroundColor: c.border, marginBottom:10 }} />

          {/* Méta */}
          <View style={{ flexDirection:'row', gap:18 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              <Clock size={13} color={c.txt3} />
              <Text style={{ fontSize:13, fontFamily: FONTS.medium, color: c.txt2 }}>
                {appt.time || appt.slot_time || '--:--'}
              </Text>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6, flex:1 }}>
              <MapPin size={13} color={c.txt3} />
              <Text style={{ fontSize:13, fontFamily: FONTS.medium, color: c.txt2 }} numberOfLines={1}>
                {appt.location || 'Cabinet Médical'}
              </Text>
            </View>
          </View>

          {/* Lien détails */}
          <View style={[S.detailLink, { borderTopColor: c.border }]}>
            <Text style={{ fontSize:13, fontFamily: FONTS.semibold, color: c.blue }}>Voir les détails</Text>
            <ChevronRight size={14} color={c.blue} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ── Modal détail ───────────────────────────────────────────────────────────── */
function DetailModal({ appt, c, dk, onClose }) {
  const sc = STATUS_COLORS(c);
  const st = sc[(appt.status||'pending').toLowerCase()] || sc.pending;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' }}>
        <View style={[S.detailSheet, { backgroundColor: c.card }]}>
          <View style={S.sheetHandle} />
          <TouchableOpacity onPress={onClose} style={S.closeBtn}>
            <X size={20} color={c.txt3} />
          </TouchableOpacity>

          <View style={[S.detailBanner, { backgroundColor: st.bg }]}>
            <Text style={{ color: st.color, fontSize:14, fontFamily: FONTS.bold }}>{st.label}</Text>
          </View>

          <Text style={{ fontSize:20, fontFamily: FONTS.extrabold, color: c.txt, marginBottom:4 }}>
            Dr. {appt.doctor_name || 'Médecin'}
          </Text>
          <Text style={{ fontSize:14, fontFamily: FONTS.regular, color: c.txt2, marginBottom:20 }}>
            {appt.doctor_specialty || 'Généraliste'}
          </Text>

          <View style={{ gap:12 }}>
            {[
              { Icon: Calendar, label:'Date',  value: appt.date ? format(parseISO(appt.date),'EEEE d MMMM yyyy',{locale:fr}) : '—' },
              { Icon: Clock,    label:'Heure', value: appt.time || appt.slot_time || '—' },
              { Icon: MapPin,   label:'Lieu',  value: appt.location || 'Cabinet Médical' },
            ].map(({ Icon, label, value }) => (
              <View key={label} style={[S.detailRow, { backgroundColor: dk ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderColor: c.border }]}>
                <View style={[S.detailRowIcon, { backgroundColor: c.blueLight }]}>
                  <Icon size={14} color={c.blue} />
                </View>
                <View>
                  <Text style={{ fontSize:11, fontFamily: FONTS.semibold, color: c.txt3 }}>{label}</Text>
                  <Text style={{ fontSize:14, fontFamily: FONTS.bold, color: c.txt }}>{value}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={onClose} style={[S.dismissBtn, { borderColor: c.border }]}>
            <Text style={{ color: c.txt3, fontSize:14, fontFamily: FONTS.semibold }}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  header:       { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, gap:12 },
  backBtn:      { padding:4 },
  headerTitle:  { fontSize:18, fontFamily: FONTS.bold },
  headerSub:    { fontSize:12, fontFamily: FONTS.regular, marginTop:1 },
  addBtn:       { width:38, height:38, borderRadius:12, alignItems:'center', justifyContent:'center' },
  summaryRow:   { flexDirection:'row', justifyContent:'space-around', paddingVertical:14, borderBottomWidth:1 },
  summaryItem:  { alignItems:'center', gap:2 },
  ctaBtnInner:  { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:14 },
  ctaBtnText:   { color:'#fff', fontSize:15, fontFamily: FONTS.bold },
  filterChip:   { paddingHorizontal:16, paddingVertical:9, borderRadius:999, borderWidth:1 },
  apptCard:     { flexDirection:'row', borderRadius:16, borderWidth:1, overflow:'hidden' },
  accentBar:    { width:4 },
  dateBox:      { width:50, height:55, borderRadius:12, alignItems:'center', justifyContent:'center' },
  dateDay:      { fontSize:20, fontFamily: FONTS.extrabold, lineHeight:24 },
  dateMon:      { fontSize:10, fontFamily: FONTS.bold },
  statusPill:   { paddingHorizontal:9, paddingVertical:4, borderRadius:999 },
  statusPillText:{ fontSize:11, fontFamily: FONTS.bold },
  detailLink:   { flexDirection:'row', alignItems:'center', justifyContent:'center', borderTopWidth:1, paddingTop:12, marginTop:10, gap:4 },
  detailSheet:  { borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:36 },
  sheetHandle:  { width:40, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.15)', alignSelf:'center', marginBottom:20 },
  closeBtn:     { position:'absolute', top:20, right:20, padding:8 },
  detailBanner: { borderRadius:12, paddingVertical:10, paddingHorizontal:14, marginBottom:16, alignSelf:'flex-start' },
  detailRow:    { flexDirection:'row', alignItems:'center', gap:12, padding:12, borderRadius:12, borderWidth:1 },
  detailRowIcon:{ width:34, height:34, borderRadius:10, alignItems:'center', justifyContent:'center' },
  dismissBtn:   { marginTop:20, paddingVertical:13, borderRadius:12, borderWidth:1, alignItems:'center' },
});
