/**
 * CaretakersScreen.js — Refonte fidèle à la version web
 *
 * Web : deux tabs "Mon Garde-Malade" / "Trouver un Garde-Malade"
 *       barre de recherche pleine largeur
 *       filtres : WILAYA (dropdown) + NOTE MINIMUM (étoiles)
 *       état vide avec icône loupe + "Aucun résultat"
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput,
  Modal, FlatList, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Search, Star, MapPin, Phone, MessageCircle,
  ChevronDown, X, Check, Users, Briefcase, Clock,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import { Avatar, Card } from '../../components/shared';
import * as api from '../../services/api';

/* ── Données statiques ────────────────────────────────────────────────────── */
const WILAYAS = [
  'Toutes', 'Alger', 'Oran', 'Constantine', 'Annaba',
  'Blida', 'Tizi Ouzou', 'Béjaïa', 'Sétif', 'Batna',
  'Sidi Bel Abbès', 'Biskra', 'Tlemcen',
];

/* ── Étoiles de rating ────────────────────────────────────────────────────── */
function StarRating({ value, max = 5, size = 14, color = '#E8A838', emptyColor }) {
  const c2 = emptyColor || 'rgba(255,255,255,0.25)';
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} size={size} color={i < value ? color : c2} fill={i < value ? color : 'transparent'} />
      ))}
    </View>
  );
}

/* ── Empty state web-style (icône loupe) ──────────────────────────────────── */
function WebEmptyState({ c, dk, message = 'Essayez d\'autres filtres ou une recherche différente.' }) {
  return (
    <View style={[S.emptyWrap, { backgroundColor: dk ? 'rgba(255,255,255,0.03)' : '#F8FAFC', borderColor: c.border }]}>
      <View style={[S.emptyIconCircle, { backgroundColor: dk ? 'rgba(255,255,255,0.06)' : '#EEF3FB' }]}>
        <Search size={28} color={c.txt3} />
      </View>
      <Text style={[S.emptyTitle, { color: c.txt }]}>Aucun résultat</Text>
      <Text style={[S.emptySub, { color: c.txt2 }]}>{message}</Text>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function CaretakersScreen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  /* ── State ── */
  const [activeTab,    setActiveTab]    = useState('find');   // 'mine' | 'find'
  const [myCaretaker,  setMyCaretaker]  = useState(null);
  const [caretakers,   setCaretakers]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState('');
  const [wilaya,       setWilaya]       = useState('Toutes');
  const [minRating,    setMinRating]    = useState(1);
  const [wilayaOpen,   setWilayaOpen]   = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [reqResult, allResult] = await Promise.allSettled([
        api.getCareRequests(),   // demandes du patient (statut accepted = mon garde-malade)
        api.getCaretakers(),     // liste de recherche
      ]);

      // Mon garde-malade = première demande acceptée
      if (reqResult.status === 'fulfilled') {
        const reqs = Array.isArray(reqResult.value) ? reqResult.value : reqResult.value?.results || [];
        const accepted = reqs.find(r => r.status === 'accepted');
        if (accepted) {
          setMyCaretaker(accepted.caretaker || accepted);
        }
      }

      if (allResult.status === 'fulfilled') {
        const d = allResult.value;
        setCaretakers(Array.isArray(d) ? d : d?.results || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  /* ── Filtrage ── */
  const filtered = caretakers.filter(ct => {
    const u    = ct.user || ct;
    const name = (u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || ct.full_name || ct.name || '').toLowerCase();
    const zone = (ct.location || ct.zone || ct.wilaya || '').toLowerCase();
    const spec = (ct.specialty || ct.speciality || '').toLowerCase();

    const matchSearch = !search.trim() ||
      name.includes(search.toLowerCase()) ||
      zone.includes(search.toLowerCase()) ||
      spec.includes(search.toLowerCase());

    const matchWilaya = wilaya === 'Toutes' ||
      (ct.wilaya || ct.location || '').toLowerCase().includes(wilaya.toLowerCase());

    const matchRating = !ct.rating || Number(ct.rating) >= minRating;

    return matchSearch && matchWilaya && matchRating;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/')}
          style={S.backBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ArrowLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[S.headerTitle, { color: c.txt }]}>Garde-Malade</Text>
          <Text style={[S.headerSub, { color: c.txt3 }]}>Gérez votre garde-malade assigné</Text>
        </View>
      </View>

      {/* ── TABS (style web underline) ─────────────────────────────────────── */}
      <View style={[S.tabsRow, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        {[
          { key: 'mine', label: 'Mon Garde-Malade'    },
          { key: 'find', label: 'Trouver un Garde-Malade' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[S.tabBtn, activeTab === tab.key && { borderBottomColor: c.blue }]}
            activeOpacity={0.8}
          >
            <Text style={[S.tabLabel, { color: activeTab === tab.key ? c.blue : c.txt2 }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB : MON GARDE-MALADE ─────────────────────────────────────────── */}
      {activeTab === 'mine' && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
        >
          {loading ? (
            <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />
          ) : myCaretaker ? (
            <MyCaretakerCard ct={myCaretaker} c={c} dk={dk} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View style={[S.emptyIconCircle, { backgroundColor: c.purpleLight }]}>
                <Users size={30} color={c.purple} />
              </View>
              <Text style={[S.emptyTitle, { color: c.txt, marginTop: 16 }]}>Aucun garde-malade assigné</Text>
              <Text style={[S.emptySub, { color: c.txt2 }]}>
                Trouvez un garde-malade dans l'onglet "Trouver un Garde-Malade"
              </Text>
              <TouchableOpacity
                onPress={() => setActiveTab('find')}
                style={{ borderRadius: 14, overflow: 'hidden', marginTop: 20, ...SHADOWS.md }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.ctaInner}>
                  <Text style={S.ctaText}>Trouver un garde-malade</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── TAB : TROUVER ──────────────────────────────────────────────────── */}
      {activeTab === 'find' && (
        <>
          {/* Barre de recherche pleine largeur (style web) */}
          <View style={[S.searchWrap, { backgroundColor: c.bg }]}>
            <View style={[S.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
              <Search size={18} color={c.txt3} />
              <TextInput
                style={[S.searchInput, { color: c.txt }]}
                placeholder="Rechercher par nom, spécialité ou zone..."
                placeholderTextColor={c.txt3}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={16} color={c.txt3} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filtres WILAYA + NOTE MIN (style web : deux colonnes) */}
          <View style={[S.filtersRow, { backgroundColor: c.bg }]}>
            {/* Wilaya dropdown */}
            <View style={{ flex: 1 }}>
              <Text style={[S.filterLabel, { color: c.txt3 }]}>WILAYA</Text>
              <TouchableOpacity
                onPress={() => setWilayaOpen(true)}
                style={[S.dropdownBtn, { backgroundColor: c.card, borderColor: c.border }]}
                activeOpacity={0.8}
              >
                <Text style={[S.dropdownValue, { color: c.txt }]}>{wilaya}</Text>
                <ChevronDown size={16} color={c.txt3} />
              </TouchableOpacity>
            </View>

            {/* Rating min */}
            <View style={{ flex: 1 }}>
              <Text style={[S.filterLabel, { color: c.txt3 }]}>NOTE MINIMUM</Text>
              <View style={[S.ratingPicker, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[S.ratingLabel, { color: c.txt2 }]}>Note min :</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setMinRating(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Star
                        size={18}
                        color="#E8A838"
                        fill={n <= minRating ? '#E8A838' : 'transparent'}
                        strokeWidth={n <= minRating ? 0 : 1.5}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Compteur résultats */}
          <View style={[S.resultsRow, { borderBottomColor: c.border }]}>
            <Text style={[S.resultsCount, { color: c.txt3 }]}>
              {filtered.length} GARDE-MALADE{filtered.length !== 1 ? 'S' : ''} TROUVÉ{filtered.length !== 1 ? 'S' : ''}
            </Text>
          </View>

          {/* Liste */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
          >
            {loading && !refreshing ? (
              <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />
            ) : filtered.length === 0 ? (
              <WebEmptyState c={c} dk={dk} />
            ) : (
              filtered.map(ct => (
                <CaretakerCard key={ct.id} ct={ct} c={c} dk={dk} />
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* ── MODAL WILAYA ─────────────────────────────────────────────────── */}
      <Modal visible={wilayaOpen} transparent animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={[S.modalSheet, { backgroundColor: c.card }]}>
            <View style={S.modalHandle} />
            <Text style={[S.modalTitle, { color: c.txt }]}>Choisir une wilaya</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
              {WILAYAS.map(w => (
                <TouchableOpacity
                  key={w}
                  onPress={() => { setWilaya(w); setWilayaOpen(false); }}
                  style={[S.wilayaRow, { borderBottomColor: c.border }]}
                >
                  <Text style={[S.wilayaLabel, { color: wilaya === w ? c.blue : c.txt }]}>{w}</Text>
                  {wilaya === w && <Check size={16} color={c.blue} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setWilayaOpen(false)} style={[S.modalCancel, { borderColor: c.border }]}>
              <Text style={{ color: c.txt3, fontSize: 14, fontFamily: FONTS.semibold }}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ── Carte "Mon Garde-Malade" ──────────────────────────────────────────────── */
function MyCaretakerCard({ ct, c, dk }) {
  // Le backend renvoie parfois le garde-malade dans un sous-objet "caretaker" ou "user"
  const u    = ct.caretaker || ct.user || ct;
  const name = u.full_name
    || `${u.first_name || ''} ${u.last_name || ''}`.trim()
    || ct.full_name || ct.name || 'Garde-Malade';
  return (
    <View style={{ gap: 16 }}>
      {/* Hero card */}
      <LinearGradient
        colors={['#2A4470', '#7B5EA7']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={S.myCtHero}
      >
        <Avatar firstName={name.split(' ')[0]} lastName={name.split(' ')[1] || ''} size={72} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={{ color: '#fff', fontSize: 18, fontFamily: FONTS.extrabold, marginBottom: 3 }}>{name}</Text>
          {(u.specialty || ct.specialty) && (
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 }}>
              {u.specialty || ct.specialty}
            </Text>
          )}
          {(u.location || u.wilaya || ct.location || ct.wilaya) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <MapPin size={12} color="rgba(255,255,255,0.7)" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: FONTS.regular }}>
                {u.location || u.wilaya || ct.location || ct.wilaya}
              </Text>
            </View>
          )}
          {(u.rating || ct.rating) > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <StarRating value={Math.round(u.rating || ct.rating)} color="#FFD700" emptyColor="rgba(255,255,255,0.3)" />
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: FONTS.bold }}>
                {Number(u.rating || ct.rating).toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Stats */}
      {(ct.experience || ct.cases_count) && (
        <View style={[S.statsRow, { backgroundColor: c.card, borderColor: c.border }]}>
          {ct.experience && (
            <View style={S.statItem}>
              <View style={[S.statIcon, { backgroundColor: c.blueLight }]}>
                <Clock size={16} color={c.blue} />
              </View>
              <Text style={[S.statValue, { color: c.txt }]}>{ct.experience}</Text>
              <Text style={[S.statLabel, { color: c.txt3 }]}>Expérience</Text>
            </View>
          )}
          {ct.cases_count && (
            <View style={S.statItem}>
              <View style={[S.statIcon, { backgroundColor: c.greenLight }]}>
                <Briefcase size={16} color={c.green} />
              </View>
              <Text style={[S.statValue, { color: c.txt }]}>{ct.cases_count}</Text>
              <Text style={[S.statLabel, { color: c.txt3 }]}>Cas pris en charge</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={[S.ctActions, { backgroundColor: c.card, borderColor: c.border }]}>
        <TouchableOpacity
          onPress={() => ct.phone && Linking.openURL(`tel:${ct.phone}`)}
          style={[S.ctActionBtn, { borderColor: c.border }]}
        >
          <Phone size={18} color={c.blue} />
          <Text style={{ color: c.blue, fontSize: 14, fontFamily: FONTS.bold }}>Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            try {
              const conv = await api.createConversation(ct.user_id || ct.id);
              router.push(`/(app)/chat/${conv.id}`);
            } catch { router.push('/(app)/chat'); }
          }}
          style={[S.ctActionBtn, { backgroundColor: c.blue, borderColor: c.blue }]}
        >
          <MessageCircle size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.bold }}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ── Carte dans la liste "Trouver" ──────────────────────────────────────────── */
function CaretakerCard({ ct, c, dk }) {
  // Gère full_name, first_name+last_name, ou champ "name" selon le serializer backend
  const u    = ct.user || ct;
  const name = u.full_name
    || `${u.first_name || ''} ${u.last_name || ''}`.trim()
    || ct.full_name || ct.name || 'Garde-Malade';
  const rating = Number(ct.rating) || 0;

  return (
    <View style={[S.card, { backgroundColor: c.card, borderColor: c.border }, SHADOWS.sm]}>
      {/* Ligne principale */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Avatar firstName={name.split(' ')[0]} lastName={name.split(' ')[1] || ''} size={54} />
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.txt, marginBottom: 2 }}>
            {name}
          </Text>
          {ct.specialty && (
            <Text style={{ fontSize: 13, fontFamily: FONTS.medium, color: c.purple, marginBottom: 2 }}>
              {ct.specialty}
            </Text>
          )}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            {(ct.location || ct.wilaya) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color={c.txt3} />
                <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt2 }}>
                  {ct.location || ct.wilaya}
                </Text>
              </View>
            )}
            {ct.experience && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Briefcase size={11} color={c.txt3} />
                <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt2 }}>
                  {ct.experience}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Rating */}
      {rating > 0 && (
        <View style={[S.ratingRow, { borderTopColor: c.border }]}>
          <StarRating value={Math.round(rating)} color={c.amber} emptyColor={c.border} size={14} />
          <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: c.txt, marginLeft: 6 }}>
            {rating.toFixed(1)}
          </Text>
          {ct.reviews_count > 0 && (
            <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3 }}>
              {' '}({ct.reviews_count} avis)
            </Text>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={[S.cardActions, { borderTopColor: c.border }]}>
        <TouchableOpacity
          onPress={() => ct.phone && Linking.openURL(`tel:${ct.phone}`)}
          style={[S.cardActionBtn, { borderColor: c.border }]}
        >
          <Phone size={15} color={c.blue} />
          <Text style={{ color: c.blue, fontSize: 13, fontFamily: FONTS.bold }}>Appeler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Alert.alert('Contacter', `Contacter ${name} ?`, [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Message', onPress: async () => {
                try {
                  const conv = await api.createConversation(ct.user_id || ct.id);
                  router.push(`/(app)/chat/${conv.id}`);
                } catch { router.push('/(app)/chat'); }
              }},
          ])}
          style={[S.cardActionBtn, { backgroundColor: c.blue, borderColor: c.blue }]}
        >
          <MessageCircle size={15} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: FONTS.bold }}>Contacter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */
const S = StyleSheet.create({
  /* Header */
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  backBtn:      { padding: 4 },
  headerTitle:  { fontSize: 20, fontFamily: FONTS.extrabold },
  headerSub:    { fontSize: 13, fontFamily: FONTS.regular, marginTop: 1 },

  /* Tabs style web */
  tabsRow:      { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:       { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabLabel:     { fontSize: 14, fontFamily: FONTS.semibold },

  /* Search */
  searchWrap:   { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 13 },
  searchInput:  { flex: 1, fontSize: 15, fontFamily: FONTS.regular },

  /* Filters */
  filtersRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 12, paddingBottom: 12 },
  filterLabel:  { fontSize: 10, fontFamily: FONTS.extrabold, letterSpacing: 0.8, marginBottom: 6 },
  dropdownBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  dropdownValue:{ fontSize: 14, fontFamily: FONTS.medium },
  ratingPicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  ratingLabel:  { fontSize: 12, fontFamily: FONTS.medium },

  /* Results count */
  resultsRow:   { paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  resultsCount: { fontSize: 11, fontFamily: FONTS.extrabold, letterSpacing: 0.5 },

  /* Empty state (style web) */
  emptyWrap:    { borderRadius: 16, borderWidth: 1, padding: 48, alignItems: 'center', marginTop: 4 },
  emptyIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle:   { fontSize: 18, fontFamily: FONTS.bold, textAlign: 'center', marginBottom: 8 },
  emptySub:     { fontSize: 13, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 20 },

  /* My caretaker */
  myCtHero:     { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' },
  statsRow:     { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  statItem:     { flex: 1, alignItems: 'center', padding: 16, gap: 6 },
  statIcon:     { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue:    { fontSize: 14, fontFamily: FONTS.bold },
  statLabel:    { fontSize: 11, fontFamily: FONTS.regular },
  ctActions:    { flexDirection: 'row', gap: 12, borderRadius: 16, borderWidth: 1, padding: 14 },
  ctActionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 12 },

  /* Caretaker card */
  card:         { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  ratingRow:    { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  cardActions:  { flexDirection: 'row', gap: 10, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  cardActionBtn:{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 11, paddingVertical: 10 },

  /* CTA */
  ctaInner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 28 },
  ctaText:      { color: '#fff', fontSize: 15, fontFamily: FONTS.bold },

  /* Wilaya modal */
  modalSheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 20 },
  modalTitle:   { fontSize: 18, fontFamily: FONTS.bold, marginBottom: 16 },
  wilayaRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  wilayaLabel:  { fontSize: 15, fontFamily: FONTS.medium },
  modalCancel:  { marginTop: 14, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
});
