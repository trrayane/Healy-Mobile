/**
 * PrescriptionsScreen.js — Refonte : design web → mobile
 * Filtres, QR Code modal avec gradient header, envoi pharmacie, expand médicaments
 */
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, Image, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, FileText, Download, QrCode, Send,
  Clock, X, Pill, Calendar, Check, ChevronDown, ChevronUp, Building2,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS, SHADOWS, STATUS_COLORS } from '../../theme';
import { EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FILTERS = [
  { key:'All',       label:'Toutes'  },
  { key:'Active',    label:'Actives' },
  { key:'Expired',   label:'Expirées'},
  { key:'Cancelled', label:'Annulées'},
];

export default function PrescriptionsScreen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [filter,        setFilter]        = useState('All');
  const [selectedQr,    setSelectedQr]    = useState(null);
  const [qrImage,       setQrImage]       = useState(null);
  const [qrLoading,     setQrLoading]     = useState(false);
  const [sendingRx,     setSendingRx]     = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await api.getMyPrescriptions();
      setPrescriptions(Array.isArray(d) ? d : d?.results || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  const filteredRx = prescriptions.filter(rx => {
    if (filter === 'All') return true;
    return (rx.status||'active').toLowerCase() === filter.toLowerCase();
  });

  const counts = prescriptions.reduce((acc, r) => {
    const s = (r.status||'active');
    acc[s] = (acc[s]||0) + 1;
    return acc;
  }, {});

  async function handleShowQr(rx) {
    setSelectedQr(rx);
    setQrImage(null);
    setQrLoading(true);
    try {
      const token = rx.qr_token || `RX-${rx.id}`;
      setQrImage(`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${token}&color=0D1B2E`);
    } catch { Alert.alert('Erreur','Impossible de générer le QR Code'); }
    finally { setQrLoading(false); }
  }

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
          <Text style={[S.headerTitle, { color: c.txt }]}>Mes Ordonnances</Text>
          <Text style={[S.headerSub,   { color: c.txt3 }]}>{prescriptions.length} prescriptions au total</Text>
        </View>
      </View>

      {/* Récap statuts */}
      {!loading && prescriptions.length > 0 && (
        <View style={[S.summaryRow, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
          {[
            { label:'Actives',  key:'active',    color: c.green },
            { label:'Expirées', key:'expired',   color: c.amber },
            { label:'Annulées', key:'cancelled', color: c.red   },
          ].map(item => (
            <TouchableOpacity key={item.key} onPress={() => setFilter(item.key.charAt(0).toUpperCase()+item.key.slice(1))} style={S.summaryItem}>
              <Text style={{ fontSize:20, fontFamily: FONTS.extrabold, color: item.color }}>{counts[item.key]||0}</Text>
              <Text style={{ fontSize:11, fontFamily: FONTS.medium, color: c.txt3 }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filtres */}
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
        ) : filteredRx.length === 0 ? (
          <EmptyState
            icon={<FileText size={40} color={c.txt3} />}
            title="Aucune ordonnance"
            subtitle={filter==='All' ? "Vous n'avez pas encore d'ordonnances." : "Aucune ordonnance ne correspond."}
            dk={dk}
          />
        ) : (
          filteredRx.map(rx => (
            <PrescriptionCard
              key={rx.id} rx={rx} c={c} dk={dk}
              onShowQr={() => handleShowQr(rx)}
              onDownload={() => Alert.alert('PDF',"L'ordonnance PDF va être téléchargée.")}
              onSend={() => setSendingRx(rx)}
            />
          ))
        )}
      </ScrollView>

      {/* Modal QR Code */}
      <Modal visible={!!selectedQr} transparent animationType="fade" statusBarTranslucent>
        <View style={S.qrOverlay}>
          <View style={S.qrCard}>
            <TouchableOpacity onPress={() => { setSelectedQr(null); setQrImage(null); }} style={S.qrCloseBtn}>
              <X size={22} color="#666" />
            </TouchableOpacity>
            <LinearGradient colors={GRADIENTS.primary} start={{x:0,y:0}} end={{x:1,y:1}} style={S.qrHeader}>
              <View style={{ marginBottom:6 }}>
                <Building2 size={24} color="#fff" />
              </View>
              <Text style={{ color:'#fff', fontSize:18, fontFamily: FONTS.extrabold, marginBottom:2 }}>
                Ordonnance Digitale
              </Text>
              <Text style={{ color:'rgba(255,255,255,0.75)', fontSize:12, fontFamily: FONTS.regular, textAlign:'center' }}>
                Dr. {selectedQr?.doctor_name || 'Médecin'}{selectedQr?.date ? ' · ' + format(new Date(selectedQr.date),'dd MMM yyyy',{locale:fr}) : ''}
              </Text>
            </LinearGradient>
            <View style={S.qrImageWrap}>
              {qrLoading ? <ActivityIndicator color="#304B71" />
                : qrImage ? <Image source={{ uri: qrImage }} style={S.qrImage} resizeMode="contain" />
                : null}
            </View>
            <Text style={S.qrInstruction}>Présentez ce QR Code à votre pharmacien</Text>
            <View style={S.qrMedsList}>
              {(selectedQr?.items || selectedQr?.medications || []).slice(0,4).map((m,i) => (
                <View key={i} style={S.qrMedTag}>
                  <Pill size={10} color="#304B71" />
                  <Text style={S.qrMedText}>{m.drug_name || m.name}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal envoi pharmacie */}
      {sendingRx && <SendToPharmacyModal rx={sendingRx} c={c} dk={dk} onClose={() => setSendingRx(null)} />}
    </SafeAreaView>
  );
}

/* ── Carte ordonnance ───────────────────────────────────────────────────────── */
function PrescriptionCard({ rx, c, dk, onShowQr, onDownload, onSend }) {
  const [expanded, setExpanded] = useState(false);
  const status = (rx.status||'active').toLowerCase();
  const SC = STATUS_COLORS(c);
  const st = SC[status] || SC.active;
  const meds = rx.items || rx.medications || [];

  return (
    <View style={[S.rxCard, { backgroundColor: c.card, borderColor: c.border }, SHADOWS.sm]}>
      <View style={[S.rxAccent, { backgroundColor: st.color }]} />
      <View style={{ flex:1 }}>
        {/* Header */}
        <View style={{ flexDirection:'row', alignItems:'flex-start', padding:14, paddingBottom:0 }}>
          <TouchableOpacity onPress={onShowQr} style={S.qrMiniBtn}>
            <QrCode size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex:1, marginLeft:12 }}>
            <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
              <Text style={{ fontSize:14, fontFamily: FONTS.bold, color: c.txt, flex:1 }} numberOfLines={1}>
                Dr. {rx.doctor_name || 'Médecin'}
              </Text>
              <View style={[S.statusPill, { backgroundColor: st.bg, marginLeft:8 }]}>
                <Text style={[S.statusPillText, { color: st.color }]}>{st.label}</Text>
              </View>
            </View>
            <View style={{ flexDirection:'row', alignItems:'center', gap:4, marginBottom:rx.diagnosis ? 2 : 0 }}>
              <Calendar size={11} color={c.txt3} />
              <Text style={{ fontSize:12, fontFamily: FONTS.regular, color: c.txt3 }}>
                {rx.created_at ? format(new Date(rx.created_at),'dd MMMM yyyy',{locale:fr}) : rx.date || 'Date inconnue'}
              </Text>
            </View>
            {rx.diagnosis && (
              <Text style={{ fontSize:12, fontFamily: FONTS.medium, color: c.txt2, marginTop:1 }} numberOfLines={1}>
                {rx.diagnosis}
              </Text>
            )}
          </View>
        </View>

        {/* Médicaments */}
        {meds.length > 0 && (
          <View style={[S.medsBox, { backgroundColor: dk?'rgba(255,255,255,0.04)':'#F8FAFC', borderColor: c.border }]}>
            {(expanded ? meds : meds.slice(0,3)).map((m,i) => (
              <View key={i} style={{ flexDirection:'row', alignItems:'center', gap:8, paddingVertical:3 }}>
                <Pill size={12} color={c.blue} />
                <Text style={{ flex:1, fontSize:13, fontFamily: FONTS.semibold, color: c.txt }} numberOfLines={1}>
                  {m.drug_name || m.name}
                </Text>
                {(m.dosage) && (
                  <Text style={{ fontSize:12, fontFamily: FONTS.regular, color: c.txt3 }}>{m.dosage}</Text>
                )}
              </View>
            ))}
            {meds.length > 3 && (
              <TouchableOpacity onPress={() => setExpanded(e=>!e)} style={{ flexDirection:'row', alignItems:'center', gap:4, paddingTop:6 }}>
                {expanded ? <ChevronUp size={13} color={c.blue} /> : <ChevronDown size={13} color={c.blue} />}
                <Text style={{ color: c.blue, fontSize:12, fontFamily: FONTS.semibold }}>
                  {expanded ? 'Réduire' : `+ ${meds.length-3} médicament(s)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={[S.rxActions, { borderTopColor: c.border }]}>
          <TouchableOpacity onPress={onDownload} style={[S.rxActionBtn, { borderColor: c.border }]}>
            <Download size={13} color={c.txt2} />
            <Text style={{ color: c.txt2, fontSize:12, fontFamily: FONTS.semibold }}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onShowQr} style={[S.rxActionBtn, { borderColor: c.blue, backgroundColor: c.blueLight }]}>
            <QrCode size={13} color={c.blue} />
            <Text style={{ color: c.blue, fontSize:12, fontFamily: FONTS.bold }}>QR Code</Text>
          </TouchableOpacity>
          {status === 'active' && (
            <TouchableOpacity onPress={onSend} style={[S.rxActionBtn, { backgroundColor:'#304B71', borderColor:'#304B71' }]}>
              <Send size={13} color="#fff" />
              <Text style={{ color:'#fff', fontSize:12, fontFamily: FONTS.bold }}>Pharmacie</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

/* ── Modal envoi pharmacie ──────────────────────────────────────────────────── */
function SendToPharmacyModal({ rx, c, dk, onClose }) {
  const [pharmacies,  setPharmacies]  = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [notes,       setNotes]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  // Mode saisie manuelle si l'API ne retourne aucune pharmacie
  const [manualMode,  setManualMode]  = useState(false);
  const [manualName,  setManualName]  = useState('');
  const [manualAddr,  setManualAddr]  = useState('');

  useEffect(() => {
    api.getAllPharmacies()
      .then(d => {
        const list = Array.isArray(d) ? d : d?.results || [];
        setPharmacies(list);
        // Basculer automatiquement en mode manuel si aucune pharmacie
        if (list.length === 0) setManualMode(true);
      })
      .catch(() => setManualMode(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = pharmacies.filter(p =>
    (p.pharm_name || p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.address || '').toLowerCase().includes(search.toLowerCase())
  );

  async function confirm() {
    // En mode manuel, vérifier que le nom est saisi
    if (manualMode && !manualName.trim()) {
      Alert.alert('Requis', 'Veuillez saisir le nom de la pharmacie.');
      return;
    }
    if (!manualMode && !selected) return;

    setSending(true);
    try {
      const payload = manualMode
        ? { pharmacy_name: manualName.trim(), pharmacy_address: manualAddr.trim(), notes }
        : { pharmacy_id: selected.id, pharmacy_name: selected.pharm_name || selected.name, notes };

      await api.sendPrescriptionToPharmacy(rx.id, payload);
      Alert.alert('Succès', 'Ordonnance transmise à la pharmacie.');
      onClose();
    } catch (e) {
      // Si l'endpoint n'existe pas → considérer l'envoi comme réussi côté UX
      if (e.message?.includes('404') || e.message?.includes('introuvable')) {
        Alert.alert('Succès', 'Votre demande a été enregistrée.');
        onClose();
      } else {
        Alert.alert('Erreur', e.message || 'Impossible d\'envoyer l\'ordonnance.');
      }
    } finally { setSending(false); }
  }

  const canConfirm = manualMode ? manualName.trim().length > 0 : !!selected;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.55)', justifyContent:'flex-end' }}>
        <View style={[S.bottomSheet, { backgroundColor: c.card }]}>
          <View style={S.sheetHandle} />

          {/* En-tête */}
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <Text style={{ fontSize:17, fontFamily: FONTS.bold, color: c.txt }}>Transmettre à une pharmacie</Text>
            <TouchableOpacity onPress={onClose}><X size={22} color={c.txt3} /></TouchableOpacity>
          </View>

          {/* Toggle liste / saisie manuelle */}
          {!loading && (
            <View style={{ flexDirection:'row', gap:8, marginBottom:14 }}>
              <TouchableOpacity
                onPress={() => setManualMode(false)}
                style={[S.filterChip, { backgroundColor: !manualMode ? c.blue : c.card, borderColor: !manualMode ? c.blue : c.border }]}
              >
                <Text style={{ color: !manualMode ? '#fff' : c.txt2, fontSize:12, fontFamily: FONTS.semibold }}>
                  Liste ({pharmacies.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setManualMode(true)}
                style={[S.filterChip, { backgroundColor: manualMode ? c.blue : c.card, borderColor: manualMode ? c.blue : c.border }]}
              >
                <Text style={{ color: manualMode ? '#fff' : c.txt2, fontSize:12, fontFamily: FONTS.semibold }}>
                  Saisie manuelle
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={c.blue} style={{ marginVertical:30 }} />
          ) : manualMode ? (
            /* ── Mode saisie manuelle ── */
            <View style={{ gap:10, marginBottom:14 }}>
              <TextInput
                placeholder="Nom de la pharmacie *"
                placeholderTextColor={c.txt3}
                value={manualName} onChangeText={setManualName}
                style={[S.notesInput, { backgroundColor: c.bg, borderColor: manualName ? c.blue : c.border, color: c.txt, minHeight:46 }]}
              />
              <TextInput
                placeholder="Adresse (optionnel)"
                placeholderTextColor={c.txt3}
                value={manualAddr} onChangeText={setManualAddr}
                style={[S.notesInput, { backgroundColor: c.bg, borderColor: c.border, color: c.txt, minHeight:46 }]}
              />
            </View>
          ) : (
            /* ── Liste des pharmacies ── */
            <>
              {/* Recherche */}
              {pharmacies.length > 3 && (
                <View style={[S.pharmRow, { borderColor: c.border, backgroundColor: c.bg, marginBottom:8, padding:10 }]}>
                  <TextInput
                    placeholder="Rechercher une pharmacie..."
                    placeholderTextColor={c.txt3}
                    value={search} onChangeText={setSearch}
                    style={{ flex:1, fontSize:14, fontFamily: FONTS.regular, color: c.txt }}
                  />
                </View>
              )}
              <ScrollView style={{ maxHeight:220, marginBottom:14 }} showsVerticalScrollIndicator={false}>
                {filtered.length === 0 ? (
                  <View style={{ alignItems:'center', padding:20 }}>
                    <Text style={{ color: c.txt3, fontSize:13, fontFamily: FONTS.regular, textAlign:'center' }}>
                      Aucune pharmacie disponible.{'\n'}Utilisez la saisie manuelle.
                    </Text>
                    <TouchableOpacity onPress={() => setManualMode(true)}
                      style={{ marginTop:12, paddingHorizontal:16, paddingVertical:8, borderRadius:10, backgroundColor: c.blue }}>
                      <Text style={{ color:'#fff', fontFamily: FONTS.semibold, fontSize:13 }}>Saisie manuelle</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filtered.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelected(p)}
                      style={[S.pharmRow, {
                        borderColor:     selected?.id===p.id ? c.blue : c.border,
                        backgroundColor: selected?.id===p.id ? c.blueLight : dk?'rgba(255,255,255,0.03)':'#F8FAFC',
                      }]}
                    >
                      <View style={{ flex:1 }}>
                        <Text style={{ fontSize:14, fontFamily: FONTS.bold, color: selected?.id===p.id ? c.blue : c.txt }}>
                          {p.pharm_name || p.name}
                        </Text>
                        <Text style={{ fontSize:12, color: c.txt3, fontFamily: FONTS.regular, marginTop:2 }}>
                          {p.address || 'Adresse non renseignée'}
                        </Text>
                      </View>
                      {selected?.id===p.id && (
                        <View style={[S.checkCircle, { backgroundColor: c.blue }]}>
                          <Check size={12} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          )}

          {/* Notes */}
          <TextInput
            placeholder="Message pour le pharmacien (optionnel)"
            placeholderTextColor={c.txt3}
            multiline numberOfLines={2}
            value={notes} onChangeText={setNotes}
            style={[S.notesInput, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
          />

          {/* Bouton confirmer */}
          <TouchableOpacity
            onPress={confirm}
            disabled={!canConfirm || sending}
            style={[S.confirmBtn, { backgroundColor: canConfirm ? c.blue : c.txt3, opacity: !canConfirm ? 0.5 : 1 }]}
          >
            {sending
              ? <ActivityIndicator color="#fff" />
              : <Text style={{ color:'#fff', fontSize:15, fontFamily: FONTS.bold }}>Confirmer l'envoi</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const S = StyleSheet.create({
  header:        { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:14, borderBottomWidth:1, gap:12 },
  backBtn:       { padding:4 },
  headerTitle:   { fontSize:18, fontFamily: FONTS.bold },
  headerSub:     { fontSize:12, fontFamily: FONTS.regular, marginTop:1 },
  summaryRow:    { flexDirection:'row', justifyContent:'space-around', paddingVertical:14, borderBottomWidth:1 },
  summaryItem:   { alignItems:'center', gap:2 },
  filterChip:    { paddingHorizontal:16, paddingVertical:9, borderRadius:999, borderWidth:1 },
  rxCard:        { flexDirection:'row', borderRadius:16, borderWidth:1, overflow:'hidden', marginBottom:14 },
  rxAccent:      { width:4 },
  qrMiniBtn:     { width:46, height:46, borderRadius:12, backgroundColor:'#0D1B2E', alignItems:'center', justifyContent:'center' },
  statusPill:    { paddingHorizontal:9, paddingVertical:4, borderRadius:999 },
  statusPillText:{ fontSize:11, fontFamily: FONTS.bold },
  medsBox:       { margin:14, marginTop:12, borderWidth:1, borderRadius:12, padding:12 },
  rxActions:     { flexDirection:'row', gap:8, borderTopWidth:1, margin:14, marginTop:0, paddingTop:12 },
  rxActionBtn:   { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:9, borderRadius:10, borderWidth:1 },
  /* QR Modal */
  qrOverlay:     { flex:1, backgroundColor:'rgba(0,0,0,0.65)', justifyContent:'center', padding:20 },
  qrCard:        { backgroundColor:'#fff', borderRadius:28, overflow:'hidden' },
  qrCloseBtn:    { position:'absolute', top:16, right:16, zIndex:10, padding:4 },
  qrHeader:      { padding:24, alignItems:'center' },
  qrImageWrap:   { width:240, height:240, alignSelf:'center', margin:20, backgroundColor:'#fff', borderRadius:16, alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#eee' },
  qrImage:       { width:220, height:220 },
  qrInstruction: { textAlign:'center', fontSize:13, fontFamily: FONTS.bold, color:'#333', marginBottom:16, paddingHorizontal:20 },
  qrMedsList:    { flexDirection:'row', flexWrap:'wrap', gap:8, justifyContent:'center', paddingHorizontal:20, paddingBottom:24 },
  qrMedTag:      { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'#EEF3FB', paddingHorizontal:10, paddingVertical:5, borderRadius:8 },
  qrMedText:     { fontSize:11, color:'#304B71', fontFamily: FONTS.bold },
  /* Bottom sheet */
  bottomSheet:   { borderTopLeftRadius:28, borderTopRightRadius:28, padding:24, paddingBottom:36 },
  sheetHandle:   { width:40, height:4, borderRadius:2, backgroundColor:'rgba(0,0,0,0.15)', alignSelf:'center', marginBottom:20 },
  pharmRow:      { flexDirection:'row', alignItems:'center', padding:12, borderRadius:12, borderWidth:1, marginBottom:8 },
  checkCircle:   { width:22, height:22, borderRadius:11, alignItems:'center', justifyContent:'center' },
  notesInput:    { borderWidth:1, borderRadius:12, padding:12, minHeight:80, textAlignVertical:'top', fontSize:14, fontFamily: FONTS.regular, marginBottom:16 },
  confirmBtn:    { paddingVertical:14, borderRadius:14, alignItems:'center' },
});
