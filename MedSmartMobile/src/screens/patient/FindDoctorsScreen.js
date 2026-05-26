import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, RefreshControl, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Search, Filter, Star, MapPin,
  Calendar, Clock, ChevronRight, X, Navigation,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import { Card, Avatar, Badge, EmptyState } from '../../components/shared';
import * as api from '../../services/api';

const SPECIALTIES = [
  'Tous', 'Généraliste', 'Cardiologue', 'Dermatologue',
  'Pédiatre', 'Psychiatre', 'Ophtalmologue', 'Gynécologue',
  'Neurologue', 'Orthopédiste',
];

const WILAYAS = ['Toutes', 'Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif'];

export default function FindDoctorsScreen({ navigation }) {
  const { dk } = useTheme();
  const { t } = useLanguage();
  const c = dk ? T.dark : T.light;

  // Params depuis l'IA : doctorId (ouvre directement le profil) ou specialty (pré-filtre)
  const { doctorId, specialty: specialtyParam } = useLocalSearchParams();

  const [doctors, setDoctors]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [search, setSearch]           = useState('');
  const [specialty, setSpecialty]     = useState(specialtyParam || 'Tous');
  const [wilaya, setWilaya]           = useState('Toutes');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [slots, setSlots]             = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => { loadDoctors(); }, [specialty, wilaya]);

  // Auto-ouvrir le profil du médecin recommandé par l'IA
  useEffect(() => {
    if (!doctorId) return;
    api.getDoctorById(doctorId)
      .then(doc => { if (doc) openDoctor(doc); })
      .catch(() => {});
  }, [doctorId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadDoctors() {
    setLoading(true);
    try {
      const filters = {};
      if (specialty !== 'Tous')    filters.speciality = specialty; // backend: "speciality" avec i
      if (wilaya !== 'Toutes')     filters.wilaya = wilaya;
      if (search.trim())           filters.search = search.trim();
      const data = await api.getDoctors(filters);
      setDoctors(Array.isArray(data) ? data : data?.results || []);
    } catch {} finally { setLoading(false); }
  }

  async function openDoctor(doctor) {
    setSelectedDoc(doctor);
    setLoadingSlots(true);
    try {
      const data = await api.getDoctorSlots(doctor.id);
      setSlots(Array.isArray(data) ? data : data?.results || []);
    } catch {} finally { setLoadingSlots(false); }
  }

  async function bookSlot(slot) {
    const slotTime = slot.start_time?.substring(0, 5) || slot.time || '';
    const slotDate = slot.date || slot.slot_date || '';
    Alert.alert(
      'Confirmer le rendez-vous',
      `Dr. ${selectedDoc.full_name || `${selectedDoc.first_name || ''} ${selectedDoc.last_name || ''}`.trim()}\n${slotDate}${slotDate && slotTime ? ' à ' : ''}${slotTime}`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              await api.bookAppointment({
                slot_id: slot.id,
                doctor_id: selectedDoc.id,
                date: slotDate,
                time: slotTime,
              });
              Alert.alert('Rendez-vous pris !', 'Votre rendez-vous a été confirmé.');
              setSelectedDoc(null);
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  }

  const filtered = doctors.filter(d => {
    const name = (d.full_name || `${d.first_name || ''} ${d.last_name || ''}`).toLowerCase();
    return name.includes(search.toLowerCase()) ||
      (d.specialty || '').toLowerCase().includes(search.toLowerCase());
  });

  // ── Doctor profile modal ────────────────────────────────────────────────────
  if (selectedDoc) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <View style={[styles.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)} style={{ padding: 4 }}>
            <ArrowLeft size={22} color={c.txt} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.txt }]}>Prendre rendez-vous</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Doctor info card */}
          <Card dk={dk} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 14, marginBottom: 12 }}>
              <Avatar
                firstName={selectedDoc.full_name?.split(' ')[0] || selectedDoc.first_name || ''}
                lastName={selectedDoc.full_name?.split(' ')[1] || selectedDoc.last_name || ''}
                size={64}
                color={c.green}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.docName, { color: c.txt }]}>
                  Dr. {selectedDoc.full_name || `${selectedDoc.first_name || ''} ${selectedDoc.last_name || ''}`}
                </Text>
                <Text style={[styles.docSpec, { color: c.green }]}>{selectedDoc.specialty || 'Médecin'}</Text>
                {(selectedDoc.city || selectedDoc.wilaya || selectedDoc.address) && (
                  <View style={styles.metaRow}>
                    <MapPin size={12} color={c.txt3} />
                    <Text style={[styles.metaText, { color: c.txt2 }]}>
                      {selectedDoc.city || selectedDoc.wilaya || selectedDoc.address}
                    </Text>
                  </View>
                )}
                {Number(selectedDoc.rating || selectedDoc.average_rating || 0) > 0 && (
                  <View style={styles.metaRow}>
                    <Star size={12} color={c.amber} fill={c.amber} />
                    <Text style={[styles.metaText, { color: c.txt2 }]}>
                      {Number(selectedDoc.rating || selectedDoc.average_rating || 0).toFixed(1)}{' '}
                      ({selectedDoc.reviews_count || selectedDoc.reviewsCount || 0} avis)
                    </Text>
                  </View>
                )}
                {selectedDoc.experience_years && (
                  <View style={styles.metaRow}>
                    <Clock size={12} color={c.txt3} />
                    <Text style={[styles.metaText, { color: c.txt2 }]}>
                      {selectedDoc.experience_years} ans d'expérience
                    </Text>
                  </View>
                )}
                {selectedDoc.consultation_fee && (
                  <View style={styles.metaRow}>
                    <Star size={12} color={c.txt3} />
                    <Text style={[styles.metaText, { color: c.txt2 }]}>
                      Consultation : {selectedDoc.consultation_fee} DA
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {selectedDoc.bio && (
              <Text style={[styles.docBio, { color: c.txt2 }]}>{selectedDoc.bio}</Text>
            )}
          </Card>

          {/* Bouton itinéraire — toujours visible */}
          <TouchableOpacity
            onPress={() => {
              const docName = selectedDoc.full_name
                || `${selectedDoc.first_name || ''} ${selectedDoc.last_name || ''}`.trim()
                || 'Médecin';
              const query = encodeURIComponent(
                [
                  `Dr ${docName}`,
                  selectedDoc.specialty || '',
                  selectedDoc.address || selectedDoc.city || selectedDoc.wilaya || 'Algérie',
                ].filter(Boolean).join(' ')
              );
              const url = selectedDoc.maps_link || `https://www.google.com/maps/search/?api=1&query=${query}`;
              Linking.openURL(url);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 8, backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98140',
              borderRadius: 12, paddingVertical: 11, marginBottom: 16 }}
          >
            <Navigation size={16} color="#10B981" />
            <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: '#10B981' }}>
              Voir l'itinéraire vers le cabinet
            </Text>
          </TouchableOpacity>

          {/* Slots */}
          <Text style={[styles.slotsTitle, { color: c.txt }]}>Créneaux disponibles</Text>
          {loadingSlots
            ? <ActivityIndicator color={c.green} style={{ marginTop: 20 }} />
            : slots.length === 0
              ? <EmptyState icon={<Calendar size={40} color={c.txt3} />} title="Aucun créneau disponible" subtitle="Ce médecin n'a pas de créneau libre pour le moment" dk={dk} />
              : (
                  <>
                    {/* Group slots by date */}
                    {Object.entries(
                      slots.reduce((acc, slot) => {
                        const date = slot.date || 'Autre';
                        if (!acc[date]) acc[date] = [];
                        acc[date].push(slot);
                        return acc;
                      }, {})
                    ).map(([date, dateSlots]) => (
                      <View key={date} style={{ marginBottom: 16 }}>
                        <View style={styles.dateRow}>
                          <Calendar size={14} color={c.blue} />
                          <Text style={[styles.dateLabel, { color: c.txt }]}>{date}</Text>
                        </View>
                        <View style={styles.slotsGrid}>
                          {dateSlots.map(slot => (
                            <TouchableOpacity
                              key={slot.id}
                              onPress={() => bookSlot(slot)}
                              style={[styles.slotBtn, {
                                backgroundColor: c.blueLight,
                                borderColor: c.blue,
                              }]}
                            >
                              <Clock size={12} color={c.blue} />
                              <Text style={[styles.slotTime, { color: c.blue }]}>
                                {slot.start_time?.substring(0, 5) || slot.time || '—'}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </>
                )
          }
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Doctor list ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity 
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/')} 
          style={{ padding: 10, marginLeft: -10 }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ArrowLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.txt }]}>Trouver un médecin</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setShowFilters(p => !p)} style={styles.filterBtn}>
          <Filter size={18} color={showFilters ? c.blue : c.txt2} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: c.bg }]}>
        <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Search size={16} color={c.txt3} />
          <TextInput
            style={[styles.searchInput, { color: c.txt }]}
            placeholder="Nom, spécialité..." placeholderTextColor={c.txt3}
            value={search} onChangeText={setSearch}
            onSubmitEditing={loadDoctors}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={c.txt3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: c.card, borderBottomColor: c.border }]}>
          <Text style={[styles.filterLabel, { color: c.txt2 }]}>Spécialité</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
            {SPECIALTIES.map(s => (
              <TouchableOpacity
                key={s} onPress={() => setSpecialty(s)}
                style={[styles.chip, {
                  backgroundColor: specialty === s ? c.blue : c.bg,
                  borderColor: specialty === s ? c.blue : c.border,
                }]}
              >
                <Text style={{ color: specialty === s ? '#fff' : c.txt2, fontSize: 12, fontFamily: FONTS.semibold }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={[styles.filterLabel, { color: c.txt2 }]}>Wilaya</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {WILAYAS.map(w => (
              <TouchableOpacity
                key={w} onPress={() => setWilaya(w)}
                style={[styles.chip, {
                  backgroundColor: wilaya === w ? c.green : c.bg,
                  borderColor: wilaya === w ? c.green : c.border,
                }]}
              >
                <Text style={{ color: wilaya === w ? '#fff' : c.txt2, fontSize: 12, fontFamily: FONTS.semibold }}>{w}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Active filters row */}
      {(specialty !== 'Tous' || wilaya !== 'Toutes') && (
        <View style={[styles.activeFilters, { backgroundColor: c.blueLight }]}>
          <Text style={[{ color: c.blue, fontSize: 12, fontFamily: FONTS.semibold }]}>
            Filtres actifs : {[specialty !== 'Tous' ? specialty : null, wilaya !== 'Toutes' ? wilaya : null].filter(Boolean).join(', ')}
          </Text>
          <TouchableOpacity onPress={() => { setSpecialty('Tous'); setWilaya('Toutes'); }}>
            <X size={14} color={c.blue} />
          </TouchableOpacity>
        </View>
      )}

      {/* Results */}
      {loading
        ? <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />
        : (
            <ScrollView
              contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadDoctors(); setRefreshing(false); }} tintColor={c.blue} />}
            >
              <Text style={[styles.resultCount, { color: c.txt2 }]}>
                {filtered.length} médecin(s) trouvé(s)
              </Text>
              {filtered.length === 0
                ? <EmptyState icon={<Search size={40} color={c.txt3} />} title="Aucun médecin trouvé" subtitle="Essayez d'autres filtres" dk={dk} />
                : filtered.map(doc => (
                    <TouchableOpacity key={doc.id} onPress={() => openDoctor(doc)} activeOpacity={0.85}>
                      <Card dk={dk} style={styles.docCard}>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <Avatar
                            firstName={doc.full_name?.split(' ')[0] || doc.first_name || ''}
                            lastName={doc.full_name?.split(' ')[1] || doc.last_name || ''}
                            size={54}
                            color={c.green}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.docName, { color: c.txt }]}>
                              Dr. {doc.full_name || `${doc.first_name || ''} ${doc.last_name || ''}`}
                            </Text>
                            <Text style={[styles.docSpec, { color: c.green }]}>{doc.specialty || 'Médecin généraliste'}</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                              {(doc.city || doc.wilaya || doc.address) && (
                                <View style={styles.metaRow}>
                                  <MapPin size={11} color={c.txt3} />
                                  <Text style={[styles.metaText, { color: c.txt2 }]}>
                                    {doc.city || doc.wilaya || doc.address}
                                  </Text>
                                </View>
                              )}
                              {Number(doc.rating || doc.average_rating || 0) > 0 && (
                                <View style={styles.metaRow}>
                                  <Star size={11} color={c.amber} fill={c.amber} />
                                  <Text style={[styles.metaText, { color: c.txt2 }]}>
                                    {Number(doc.rating || doc.average_rating || 0).toFixed(1)}
                                    {(doc.reviews_count || doc.reviewsCount) ? ` (${doc.reviews_count || doc.reviewsCount})` : ''}
                                  </Text>
                                </View>
                              )}
                              {doc.experience_years && (
                                <View style={styles.metaRow}>
                                  <Clock size={11} color={c.txt3} />
                                  <Text style={[styles.metaText, { color: c.txt2 }]}>{doc.experience_years} ans exp.</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <View style={{ justifyContent: 'center' }}>
                            <LinearGradient
                              colors={GRADIENTS.green}
                              style={styles.bookBtn}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            >
                              <Text style={styles.bookBtnText}>Réserver</Text>
                            </LinearGradient>
                          </View>
                        </View>

                        {/* Bouton itinéraire — toujours visible */}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            const query = doc.maps_link
                              ? null
                              : encodeURIComponent(
                                  [
                                    `Dr ${doc.full_name || `${doc.first_name || ''} ${doc.last_name || ''}`}`,
                                    doc.specialty || '',
                                    doc.address || doc.city || doc.wilaya || 'Algérie',
                                  ].filter(Boolean).join(' ')
                                );
                            const url = doc.maps_link || `https://www.google.com/maps/search/?api=1&query=${query}`;
                            Linking.openURL(url);
                          }}
                          style={[styles.itineraryBtn, { borderColor: c.green + '55', backgroundColor: c.green + '10' }]}
                          activeOpacity={0.75}
                        >
                          <Navigation size={13} color={c.green} />
                          <Text style={[styles.itineraryText, { color: c.green }]}>Voir l'itinéraire</Text>
                        </TouchableOpacity>

                        {doc.consultation_fee && (
                          <View style={[styles.feeRow, { borderTopColor: c.border }]}>
                            <Text style={[styles.feeText, { color: c.txt3 }]}>
                              Consultation : {doc.consultation_fee} DA
                            </Text>
                          </View>
                        )}
                      </Card>
                    </TouchableOpacity>
                  ))
              }
            </ScrollView>
          )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold },
  filterBtn: { padding: 8 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  filtersPanel: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterLabel: { fontSize: 12, fontFamily: FONTS.bold, textTransform: 'uppercase', marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  activeFilters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  resultCount: { fontSize: 13, fontFamily: FONTS.semibold, marginBottom: 12 },
  docCard: { marginBottom: 12 },
  docName: { fontSize: 15, fontFamily: FONTS.bold, marginBottom: 2 },
  docSpec: { fontSize: 13, fontFamily: FONTS.semibold, marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: FONTS.regular },
  bookBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: '#fff', fontSize: 12, fontFamily: FONTS.bold },
  docBio: { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 20, marginTop: 8 },
  slotsTitle: { fontSize: 16, fontFamily: FONTS.bold, marginBottom: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dateLabel: { fontSize: 14, fontFamily: FONTS.semibold },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  slotTime: { fontSize: 13, fontFamily: FONTS.bold },
  feeRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  feeText: { fontSize: 12, fontFamily: FONTS.regular },
  itineraryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 8, marginTop: 10 },
  itineraryText: { fontSize: 13, fontFamily: FONTS.bold },
});
