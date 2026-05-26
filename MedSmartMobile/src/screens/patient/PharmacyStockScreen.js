// ─────────────────────────────────────────────────────────────────────────────
// PharmacyStockScreen.js — Stock d'une pharmacie + panier patient
// Données réelles depuis /api/pharmacy/stock/public-stock/?pharmacy_id=<id>
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Linking, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Search, ShoppingCart, Plus, Minus, X,
  MapPin, Phone, Package, Pill, Trash2, CircleCheck,
  TriangleAlert, RefreshCw,
} from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import * as api from '../../services/api';

// ─────────────────────────────────────────────────────────────────────────────
export default function PharmacyStockScreen() {
  // Route params passés depuis PharmaciesScreen
  const { pharmId, pharmName, pharmAddress, pharmPhone, pharmMapsUrl, pharmacistId } = useLocalSearchParams();
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [medications, setMedications] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [cart,        setCart]        = useState({});   // { medId: qty }
  const [showCart,    setShowCart]    = useState(false);
  const [ordering,    setOrdering]    = useState(false);
  const [ordered,     setOrdered]     = useState(false);

  // ── Charger le stock depuis l'API ─────────────────────────────────────────
  const loadStock = useCallback(async () => {
    if (!pharmId) return;
    setLoading(true);
    try {
      const data = await api.getPharmacyPublicStock(pharmId);
      // Normaliser la réponse (array ou { results: [...] })
      setMedications(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error('[PharmacyStock]', err.message);
      setMedications([]);
    } finally {
      setLoading(false);
    }
  }, [pharmId]);

  useEffect(() => { loadStock(); }, [loadStock]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStock();
    setRefreshing(false);
  };

  // ── Filtrer par recherche ─────────────────────────────────────────────────
  // Le backend public-stock retourne : { id, name, molecule, price, stock_qty }
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medications;
    return medications.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.molecule || '').toLowerCase().includes(q)
    );
  }, [medications, search]);

  // ── Panier helpers ─────────────────────────────────────────────────────────
  const cartCount = useMemo(() => Object.values(cart).reduce((s, v) => s + v, 0), [cart]);
  const cartItems = useMemo(() =>
    Object.entries(cart)
      .map(([id, qty]) => {
        const med = medications.find(m => String(m.id) === id);
        return med ? { ...med, qty } : null;
      })
      .filter(Boolean),
  [cart, medications]);
  const cartTotal = useMemo(() =>
    cartItems.reduce((s, it) => s + Number(it.price || 0) * it.qty, 0),
  [cartItems]);

  function doAdd(med) {
    setCart(p => ({ ...p, [String(med.id)]: (p[String(med.id)] || 0) + 1 }));
  }
  function removeOne(id) {
    setCart(p => {
      const qty = (p[String(id)] || 0) - 1;
      if (qty <= 0) { const n = { ...p }; delete n[String(id)]; return n; }
      return { ...p, [String(id)]: qty };
    });
  }
  function removeFromCart(id) {
    setCart(p => { const n = { ...p }; delete n[String(id)]; return n; });
  }

  // ── Passer la commande ─────────────────────────────────────────────────────
  async function placeOrder() {
    setOrdering(true);
    try {
      // Construire un message résumant le panier
      const summary = cartItems
        .map(it => `${it.name} ×${it.qty} (${Number(it.price || 0) * it.qty} DA)`)
        .join('\n');
      const message = `Commande depuis l'app:\n${summary}\n\nTotal: ${cartTotal} DA`;

      await api.createPharmacyOrder({
        pharmacist:      pharmacistId ? Number(pharmacistId) : undefined,
        order_type:      'direct',
        patient_message: message,
      });

      setOrdered(true);
      setTimeout(() => {
        setCart({});
        setShowCart(false);
        setOrdered(false);
        setOrdering(false);
        Alert.alert(
          'Commande envoyée',
          `Votre commande de ${cartItems.length} médicament(s) a été envoyée à ${pharmName}.\nVous recevrez une confirmation sous peu.`,
          [{ text: 'OK' }]
        );
      }, 1200);
    } catch (err) {
      setOrdering(false);
      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer la commande.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── Header ── */}
      <LinearGradient colors={['#1E3A5F', '#304B71']} style={S.header}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/pharmacies')}
          style={{ padding: 6 }}>
          <ArrowLeft size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }} numberOfLines={1}>
            {pharmName || 'Pharmacie'}
          </Text>
          {!!pharmAddress && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <MapPin size={11} color="rgba(255,255,255,0.7)" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontFamily: FONTS.regular }} numberOfLines={1}>
                {pharmAddress}
              </Text>
            </View>
          )}
        </View>
        {/* Panier */}
        <TouchableOpacity
          onPress={() => cartCount > 0 && setShowCart(true)}
          style={[S.cartBtn, cartCount > 0 && { backgroundColor: '#fff' }]}>
          <ShoppingCart size={20} color={cartCount > 0 ? '#304B71' : 'rgba(255,255,255,0.6)'} />
          {cartCount > 0 && (
            <View style={S.cartBadge}>
              <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* ── Infos pharmacie ── */}
      <View style={[S.pharmInfo, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Package size={13} color={c.green} />
          <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: c.green }}>
            {medications.length} médicament{medications.length !== 1 ? 's' : ''} en stock
          </Text>
        </View>
        {!!pharmPhone && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`tel:${pharmPhone}`)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Phone size={13} color={c.blue} />
            <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.blue }}>{pharmPhone}</Text>
          </TouchableOpacity>
        )}
        {!!pharmMapsUrl && (
          <TouchableOpacity
            onPress={() => Linking.openURL(pharmMapsUrl)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={13} color={c.green} />
            <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.green }}>Itinéraire</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Recherche ── */}
      <View style={{ paddingHorizontal: 14, paddingVertical: 10,
        backgroundColor: c.nav, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={[S.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Search size={16} color={c.txt3} />
          <TextInput
            style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt, marginLeft: 8 }}
            placeholder="Rechercher un médicament..."
            placeholderTextColor={c.txt3}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={c.txt3} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Liste médicaments ── */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator color={c.blue} size="large" />
          <Text style={{ color: c.txt3, fontFamily: FONTS.regular }}>Chargement du stock...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: cartCount > 0 ? 100 : 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <Package size={48} color={c.txt3} />
              <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt2 }}>
                {search ? 'Aucun médicament trouvé' : 'Stock vide'}
              </Text>
              <Text style={{ fontSize: 13, color: c.txt3, textAlign: 'center' }}>
                {search ? 'Essayez une autre recherche' : 'Cette pharmacie n\'a pas encore de stock enregistré'}
              </Text>
              {!search && (
                <TouchableOpacity onPress={onRefresh} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <RefreshCw size={14} color={c.blue} />
                  <Text style={{ color: c.blue, fontFamily: FONTS.medium }}>Réessayer</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item: med }) => {
            const qty        = cart[String(med.id)] || 0;
            const inCart     = qty > 0;
            const stockQty   = med.stock_qty ?? med.stock_quantity ?? 0;
            const price      = Number(med.price || 0);
            const isLow      = stockQty > 0 && stockQty < 10;
            const outOfStock = stockQty === 0;

            return (
              <View style={[S.medCard, { backgroundColor: c.card, borderColor: inCart ? c.blue : c.border }]}>
                {/* Icône */}
                <View style={[S.medIcon, { backgroundColor: '#304B7118' }]}>
                  <Pill size={20} color="#304B71" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt }} numberOfLines={1}>
                    {med.name}
                  </Text>
                  {!!med.molecule && (
                    <Text style={{ fontSize: 11, color: c.txt3, marginTop: 1 }} numberOfLines={1}>
                      {med.molecule}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 15, fontFamily: FONTS.extrabold, color: c.blue }}>
                      {price} DA
                    </Text>
                    {outOfStock ? (
                      <View style={S.stockBadge}>
                        <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: '#EF4444' }}>Rupture</Text>
                      </View>
                    ) : isLow ? (
                      <View style={[S.stockBadge, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                        <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: '#F59E0B' }}>
                          Stock limité ({stockQty})
                        </Text>
                      </View>
                    ) : (
                      <View style={[S.stockBadge, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
                        <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: '#10B981' }}>
                          En stock ({stockQty})
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Contrôle quantité */}
                {outOfStock ? (
                  <View style={[S.addBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}>
                    <X size={16} color="#EF4444" />
                  </View>
                ) : inCart ? (
                  <View style={S.qtyCtrl}>
                    <TouchableOpacity onPress={() => removeOne(med.id)} style={S.qtyBtn}>
                      <Minus size={14} color="#304B71" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, minWidth: 20, textAlign: 'center' }}>
                      {qty}
                    </Text>
                    <TouchableOpacity onPress={() => doAdd(med)} style={S.qtyBtn}>
                      <Plus size={14} color="#304B71" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => doAdd(med)}
                    style={[S.addBtn, { backgroundColor: '#304B71', borderColor: '#304B71' }]}>
                    <Plus size={16} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ── Floating Cart Bar ── */}
      {cartCount > 0 && (
        <TouchableOpacity onPress={() => setShowCart(true)} style={S.floatingCart}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={S.cartCountBadge}>
              <Text style={{ color: '#304B71', fontFamily: FONTS.bold, fontSize: 13 }}>{cartCount}</Text>
            </View>
            <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Voir le panier</Text>
          </View>
          <Text style={{ color: '#fff', fontFamily: FONTS.extrabold, fontSize: 15 }}>{cartTotal} DA</Text>
        </TouchableOpacity>
      )}

      {/* ── Modal Panier ── */}
      <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => setShowCart(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[S.cartModal, { backgroundColor: c.card }]}>
              {/* Handle */}
              <View style={{ width: 40, height: 4, backgroundColor: c.border,
                borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />

              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ShoppingCart size={20} color={c.blue} />
                  <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: c.txt }}>Mon panier</Text>
                  <View style={[S.cartCountBadge2, { backgroundColor: c.blue }]}>
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 12 }}>{cartCount}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setShowCart(false)}>
                  <X size={22} color={c.txt3} />
                </TouchableOpacity>
              </View>

              {/* Nom pharmacie */}
              <View style={[S.pharmBanner, { backgroundColor: c.bg, borderColor: c.border }]}>
                <Package size={14} color={c.green} />
                <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.txt2 }}>
                  {pharmName}
                </Text>
              </View>

              {/* Items */}
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                {cartItems.map(item => (
                  <View key={item.id} style={[S.cartItem, { borderBottomColor: c.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: FONTS.semibold, color: c.txt }} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: c.txt3 }}>
                        {Number(item.price || 0)} DA × {item.qty} = {Number(item.price || 0) * item.qty} DA
                      </Text>
                      {!!item.molecule && (
                        <Text style={{ fontSize: 11, color: c.txt3, marginTop: 1 }}>{item.molecule}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={S.qtyCtrl}>
                        <TouchableOpacity onPress={() => removeOne(item.id)} style={S.qtyBtn}>
                          <Minus size={13} color="#304B71" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.txt, minWidth: 18, textAlign: 'center' }}>
                          {item.qty}
                        </Text>
                        <TouchableOpacity onPress={() => doAdd(item)} style={S.qtyBtn}>
                          <Plus size={13} color="#304B71" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(item.id)}>
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Total */}
              <View style={[S.totalRow, { borderTopColor: c.border }]}>
                <Text style={{ fontSize: 14, fontFamily: FONTS.semibold, color: c.txt2 }}>Total</Text>
                <Text style={{ fontSize: 20, fontFamily: FONTS.extrabold, color: c.blue }}>{cartTotal} DA</Text>
              </View>

              {/* Bouton commander */}
              {ordered ? (
                <View style={[S.orderBtn, { backgroundColor: '#10B981' }]}>
                  <CircleCheck size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 16 }}>Commande envoyée !</Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={placeOrder}
                  disabled={ordering}
                  style={[S.orderBtn, ordering && { opacity: 0.7 }]}>
                  {ordering
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <ShoppingCart size={18} color="#fff" />
                  }
                  <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 16 }}>
                    {ordering ? 'Envoi...' : `Commander · ${cartTotal} DA`}
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={{ fontSize: 11, color: c.txt3, textAlign: 'center', marginTop: 10, lineHeight: 16 }}>
                La pharmacie confirmera votre commande.{'\n'}
                Présentez-vous avec votre ordonnance si nécessaire.
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, paddingTop: 14 },
  pharmInfo:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  statusDot:       { width: 8, height: 8, borderRadius: 4 },
  searchBar:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  medCard:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 12 },
  medIcon:         { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stockBadge:      { backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444440', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  addBtn:          { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  qtyCtrl:         { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#304B7115', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  qtyBtn:          { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  cartBtn:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
  cartBadge:       { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  floatingCart:    { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: '#304B71', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  cartCountBadge:  { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cartModal:       { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36 },
  pharmBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  cartItem:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 14, marginTop: 6, marginBottom: 14 },
  orderBtn:        { backgroundColor: '#304B71', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  cartCountBadge2: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
