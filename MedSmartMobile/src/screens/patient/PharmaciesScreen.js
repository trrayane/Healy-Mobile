import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, MapPin, Phone, Clock,
  ChevronRight, ExternalLink, Package, ShoppingBag,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { T, FONTS, SHADOWS } from '../../theme';
import { Card, Badge, EmptyState } from '../../components/shared';
import * as api from '../../services/api';

export default function PharmaciesScreen() {
  const { dk } = useTheme();
  const { t } = useLanguage();
  const c = dk ? T.dark : T.light;

  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPharmacies();
  }, []);

  const loadPharmacies = async () => {
    setLoading(true);
    try {
      const data = await api.getAllPharmacies();
      setPharmacies(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPharmacies();
    setRefreshing(false);
  };

  // Champs backend réels : name, pharm_address, pharm_city
  const filtered = pharmacies.filter(p =>
    (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.pharm_city || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.pharm_address || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/')}
          style={styles.backBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ArrowLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: c.txt }]}>Pharmacies</Text>
          <Text style={[styles.headerSub, { color: c.txt3 }]}>Trouvez une pharmacie à proximité</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Search size={18} color={c.txt3} />
          <TextInput
            style={[styles.searchInput, { color: c.txt }]}
            placeholder="Rechercher par nom, ville..."
            placeholderTextColor={c.txt3}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="Package"
            title="Aucune pharmacie"
            message="Nous n'avons trouvé aucune pharmacie correspondant à votre recherche."
            dk={dk}
          />
        ) : (
          filtered.map((pharm) => (
            <PharmacyCard key={pharm.id} pharm={pharm} c={c} dk={dk} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PharmacyCard({ pharm, c, dk }) {
  // Champs backend : name, pharm_address, pharm_city, pharm_phone, is_open_24h, latitude, longitude
  const name    = pharm.name || 'Pharmacie';
  const address = [pharm.pharm_address, pharm.pharm_city].filter(Boolean).join(', ') || 'Adresse non renseignée';
  const phone   = pharm.pharm_phone;
  const isOpen24 = pharm.is_open_24h;

  // URL Maps : coordonnées GPS si disponibles, sinon adresse texte
  const mapsUrl = (pharm.latitude && pharm.longitude)
    ? `https://www.google.com/maps?q=${pharm.latitude},${pharm.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <Card dk={dk} style={styles.pharmCard}>
      <View style={styles.pharmHeader}>
        <View style={[styles.iconBox, { backgroundColor: c.green + '15' }]}>
          <Package size={24} color={c.green} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.pharmName, { color: c.txt }]} numberOfLines={1}>{name}</Text>
            {isOpen24 && (
              <Badge label="24h/24" color={c.green} bg={c.green + '15'} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <MapPin size={12} color={c.txt3} />
            <Text style={[styles.pharmAddress, { color: c.txt3 }]} numberOfLines={1}>{address}</Text>
          </View>
          {pharm.cnas_coverage && (
            <Text style={{ fontSize: 11, color: c.blue, marginTop: 2, fontFamily: FONTS.medium }}>
              ✓ Convention CNAS
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <View style={styles.pharmActions}>
        <TouchableOpacity
          onPress={() => phone && Linking.openURL(`tel:${phone}`)}
          style={[styles.actionBtn, { borderColor: c.border, opacity: phone ? 1 : 0.4 }]}
        >
          <Phone size={14} color={c.blue} />
          <Text style={[styles.actionText, { color: c.blue }]}>Appeler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL(mapsUrl)}
          style={[styles.actionBtn, { borderColor: c.border }]}
        >
          <MapPin size={14} color={c.green} />
          <Text style={[styles.actionText, { color: c.green }]}>Itinéraire</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push({
            pathname: '/(app)/patient/pharmacy-stock',
            params: {
              pharmId:        pharm.id,
              pharmName:      name,
              pharmAddress:   address,
              pharmPhone:     phone || '',
              pharmMapsUrl:   mapsUrl,
              pharmacistId:   pharm.pharmacist_user_id || pharm.pharmacist || '',
            },
          })}
          style={[styles.actionBtn, { backgroundColor: '#304B71', borderColor: '#304B71', flex: 1.4 }]}
        >
          <ShoppingBag size={14} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>Voir le stock</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold },
  headerSub: { fontSize: 12, fontFamily: FONTS.regular },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  pharmCard: { marginBottom: 16, padding: 0, overflow: 'hidden' },
  pharmHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pharmName: { fontSize: 15, fontFamily: FONTS.bold, flex: 1, marginRight: 8 },
  pharmAddress: { fontSize: 12, fontFamily: FONTS.regular, flex: 1 },
  divider: { height: 1, marginHorizontal: 16 },
  pharmActions: { flexDirection: 'row', padding: 12, gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 13, fontFamily: FONTS.bold }
});
