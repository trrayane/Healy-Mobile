import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Animated, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Camera, Pill, X, Check, CircleCheck, PackageCheck, Phone,
  Search, TriangleAlert,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { C, CL } from './data';
import * as api from '../../services/api';

// Status mapping backend → UI
const STATUS_MAP = {
  pending:    'Nouvelle',
  preparing:  'En prepa',
  ready:      'Prete',
  completed:  'Recuperee',
  cancelled:  'Recuperee',
  // Garder les valeurs UI telles quelles si déjà normalisées
  Nouvelle:   'Nouvelle',
  'En prepa': 'En prepa',
  Prete:      'Prete',
  Recuperee:  'Recuperee',
};
// Correspondance UI → valeur backend pour PATCH /pharmacy/orders/{id}/status/
// Nouveau → commencer prépa → 'preparing', Prête → 'ready', Récupérée → 'completed'
const STATUS_BACK = {
  'En prepa':  'preparing',  // handleCommencer appelle updateStatus(..., 'En prepa')
  'Prete':     'ready',      // handleMarkReady appelle updateStatus(..., 'Prete')
  'Recuperee': 'completed',  // future action "marquer récupérée"
};

function normalizeOrder(o) {
  const status   = STATUS_MAP[o.status] || 'Nouvelle';
  const name     = o.patient_name || o.patient || 'Patient';
  const initials = name.split(' ').map(p => p[0] || '').join('').toUpperCase().substring(0, 2) || 'P';
  const dateStr  = o.created_at
    ? new Date(o.created_at).toLocaleDateString('fr-FR')
    : (o.date || '');
  const timeStr  = o.created_at
    ? new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : (o.time || '');
  // Les items backend peuvent venir de medications[] ou doivent être extraits du message
  const items = Array.isArray(o.medications) && o.medications.length > 0
    ? o.medications.map(m => ({ name: m.name || m, qty: m.qty || m.quantity || 1 }))
    : (Array.isArray(o.items) ? o.items : []);

  return {
    id:       o.id,
    patient:  name,
    initials,
    note:     o.patient_message || o.notes || o.note || '',
    phone:    o.patient_phone   || o.phone || '',
    date:     dateStr,
    time:     timeStr,
    status,
    total:    Number(o.total_price || o.total || 0),
    cnas:     o.cnas_coverage ?? o.cnas ?? false,
    cnasRate: Number(o.cnas_rate || o.cnasRate || 80),
    items,
    _raw:     o,
  };
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status, c = C }) {
  const map = {
    'Nouvelle':  { bg: c.amberBg, color: c.amber },
    'En prepa':  { bg: c.blueBg,  color: c.blue  },
    'Prete':     { bg: c.greenBg, color: c.green  },
    'Recuperee': { bg: c.border,  color: c.txt3   },
  };
  const s = map[status] || { bg: c.card2, color: c.txt2 };
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ initials, c = C }) {
  return (
    <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.blueBg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.blue, fontSize: 14, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

// ─── PrepModal (détail commande + actions) ─────────────────────────────────────
function PrepModal({ visible, order, onClose, onMarkReady, c = C }) {
  if (!order) return null;

  const cnasAmt = order.cnas ? Math.round(order.total * order.cnasRate / 100) : 0;
  const reste   = order.total - cnasAmt;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: c.card,
          borderTopLeftRadius: 26, borderTopRightRadius: 26,
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40,
        }}>
          {/* Drag handle */}
          <View style={{ width: 40, height: 4, backgroundColor: c.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

          {/* Header patient */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 }}>
            <Avatar initials={order.initials} c={c} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: c.txt }}>{order.patient}</Text>
              <Text style={{ fontSize: 12, color: c.txt2, marginTop: 2 }}>{order.id} · {order.time}</Text>
              <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
                <StatusBadge status={order.status} c={c} />
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>

          {/* Médicaments */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 1.1, marginBottom: 8 }}>
            MÉDICAMENTS
          </Text>
          {order.items.map((item, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: c.card2, borderWidth: 1, borderColor: c.border,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 6,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pill size={14} color={c.green} />
                <Text style={{ fontSize: 13, color: c.txt, fontWeight: '600' }}>
                  {item.name} ×{item.qty}
                </Text>
              </View>
              <View style={{ backgroundColor: c.greenBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.green }}>En stock</Text>
              </View>
            </View>
          ))}

          {/* Facturation */}
          <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 1.1, marginTop: 14, marginBottom: 8 }}>
            FACTURATION
          </Text>
          <View style={{
            backgroundColor: c.card2, borderWidth: 1, borderColor: c.border,
            borderRadius: 14, padding: 14, marginBottom: 20,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: c.txt2 }}>Total ordonnance</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.txt }}>
                {order.total.toLocaleString()} DZD
              </Text>
            </View>
            {order.cnas && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 13, color: c.txt2 }}>
                  Pris en charge CNAS ({order.cnasRate}%)
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.red }}>
                  −{cnasAmt.toLocaleString()} DZD
                </Text>
              </View>
            )}
            <View style={{ height: 1, backgroundColor: c.border, marginBottom: 10 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: c.txt }}>Reste à payer</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.green }}>
                {reste.toLocaleString()} DZD
              </Text>
            </View>
          </View>

          {/* Boutons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => Alert.alert('Patient', `Contacter ${order.patient} ?`, [{ text: 'OK' }])}
              style={{
                flex: 1, backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2,
                borderRadius: 14, paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <Phone size={16} color={c.txt2} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>Patient</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMarkReady}
              style={{
                flex: 2, backgroundColor: c.blue, borderRadius: 14, paddingVertical: 14,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <Check size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Marquer Prête</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal Scanner ─────────────────────────────────────────────────────────────
function ScanModal({ visible, onClose, orders, onOrderFound, c = C }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,   setScanned]   = useState(false);
  const [token,     setToken]     = useState('');
  const [result,    setResult]    = useState(null);
  const [tab,       setTab]       = useState('camera');
  const [searching, setSearching] = useState(false);
  const scanLineAnim              = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const scanLineY = scanLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 200] });

  function resetState() { setScanned(false); setToken(''); setResult(null); }
  function handleClose() { resetState(); onClose(); }

  // Extrait le nom patient depuis les structures imbriquées du backend
  function extractPatientName(rx) {
    if (rx.patient_name) return rx.patient_name;
    const p = rx.patient;
    if (p && typeof p === 'object') {
      return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.full_name || 'Patient';
    }
    if (typeof p === 'string' && p) return p;
    return 'Patient';
  }

  async function processToken(code) {
    const trimmed = code.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    try {
      // Appel backend : POST /api/prescriptions/scan/
      const data = await api.scanPrescriptionQR({ token: trimmed, qr_token: trimmed });
      const rx = data?.prescription || data?.order || data || {};

      const patientName = extractPatientName(rx);
      const rxId = rx.id ? String(rx.id) : null;

      // Cherche la commande correspondante dans la liste locale
      // (matching par prescription_id ou prescription)
      const matchedOrder = rxId
        ? orders?.find(o =>
            String(o.prescription_id) === rxId ||
            String(o.prescription)    === rxId
          )
        : null;

      const order = matchedOrder || {
        id:      rxId || trimmed,
        patient: patientName,
        time:    rx.created_at
          ? new Date(rx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : '',
        status:  STATUS_MAP[rx.status] || 'Nouvelle',
        total:   Number(rx.total_price || rx.total || 0),
        _fromScan: !matchedOrder,  // vrai si pas de commande locale trouvée
      };
      setResult({ success: true, order });
    } catch {
      setResult({ success: false, code: trimmed });
    } finally {
      setSearching(false);
    }
  }

  function handleBarcodeScanned({ data }) {
    if (scanned) return;
    setScanned(true);
    processToken(data);
  }

  function handleConfirmOrder() {
    if (result?.success && result.order) {
      onOrderFound?.(result.order);
      handleClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 44 }}>

          <View style={{ width: 40, height: 4, backgroundColor: c.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: c.blueBg, borderRadius: 8, padding: 8 }}>
                <Camera size={18} color={c.blue} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.txt }}>Scanner une ordonnance</Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', backgroundColor: c.card2, borderRadius: 10, padding: 3, marginBottom: 16, gap: 3 }}>
            {[{ id: 'camera', label: 'Camera QR' }, { id: 'manual', label: 'Saisie manuelle' }].map(t => (
              <TouchableOpacity
                key={t.id}
                onPress={() => { setTab(t.id); resetState(); }}
                style={{
                  flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
                  backgroundColor: tab === t.id ? c.blue : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t.id ? '#fff' : c.txt2 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {searching ? (
            <View style={{ alignItems: 'center', paddingVertical: 28 }}>
              <ActivityIndicator size="large" color={c.blue} />
              <Text style={{ color: c.txt2, fontSize: 13, marginTop: 10 }}>Recherche en cours…</Text>
            </View>
          ) : result ? (
            <View>
              {result.success ? (
                <View style={{ backgroundColor: c.greenBg, borderWidth: 1, borderColor: c.green + '40', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CircleCheck size={20} color={c.green} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: c.green }}>
                      {result.order._fromScan ? 'Ordonnance trouvée' : 'Commande trouvée'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: c.txt, fontWeight: '700' }}>{result.order.patient}</Text>
                  <Text style={{ fontSize: 12, color: c.txt2, marginTop: 2 }}>{result.order.id} · {result.order.time}</Text>
                  <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StatusBadge status={result.order.status} c={c} />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: c.txt }}>{result.order.total.toLocaleString()} DZD</Text>
                  </View>
                </View>
              ) : (
                <View style={{ backgroundColor: c.redBg, borderWidth: 1, borderColor: c.red + '40', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <TriangleAlert size={20} color={c.red} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: c.red }}>Ordonnance introuvable</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: c.txt2 }}>Code scanné : {result.code}</Text>
                  <Text style={{ fontSize: 11, color: c.txt3, marginTop: 4 }}>
                    Assurez-vous de scanner le QR Code de l'ordonnance du patient.
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => { setScanned(false); setResult(null); setToken(''); }}
                  style={{ flex: 1, backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>Réessayer</Text>
                </TouchableOpacity>
                {result.success && (
                  <TouchableOpacity
                    onPress={handleConfirmOrder}
                    style={{ flex: 1, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <Check size={16} color="#fff" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Ouvrir</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : tab === 'camera' ? (
            <View>
              {/* Camera agrandie */}
              <View style={{ borderRadius: 18, height: 280, overflow: 'hidden', marginBottom: 14, backgroundColor: '#050A10' }}>
                {!permission ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.txt3, fontSize: 12 }}>Chargement...</Text>
                  </View>
                ) : !permission.granted ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <Camera size={36} color={c.txt3} />
                    <Text style={{ color: c.txt2, fontSize: 13, textAlign: 'center', marginTop: 12, marginBottom: 16 }}>
                      Autorisation caméra requise pour scanner les QR codes
                    </Text>
                    <TouchableOpacity
                      onPress={requestPermission}
                      style={{ backgroundColor: c.blue, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 24 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Autoriser la caméra</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <CameraView
                    style={{ flex: 1 }}
                    barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  >
                    {/* Coins du cadre */}
                    {[
                      { position: 'absolute', top: 24,    left: 24,   borderTopWidth: 3,    borderLeftWidth: 3  },
                      { position: 'absolute', top: 24,    right: 24,  borderTopWidth: 3,    borderRightWidth: 3 },
                      { position: 'absolute', bottom: 24, left: 24,   borderBottomWidth: 3, borderLeftWidth: 3  },
                      { position: 'absolute', bottom: 24, right: 24,  borderBottomWidth: 3, borderRightWidth: 3 },
                    ].map((st, i) => <View key={i} style={{ width: 28, height: 28, borderColor: c.blue, ...st }} />)}
                    <Animated.View
                      style={{
                        position: 'absolute', left: 24, right: 24,
                        height: 2, backgroundColor: c.blue, opacity: 0.9,
                        transform: [{ translateY: scanLineY }],
                      }}
                    />
                  </CameraView>
                )}
              </View>
              <Text style={{ fontSize: 12, color: c.txt3, textAlign: 'center', marginBottom: 6 }}>
                Pointez la caméra vers le QR code de l'ordonnance
              </Text>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginBottom: 6 }}>
                NUMÉRO DE COMMANDE (ex: CMD-1042)
              </Text>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="CMD-1042 ou 1042..."
                placeholderTextColor={c.txt3}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={() => processToken(token)}
                style={{
                  backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2,
                  borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14,
                  color: c.txt, fontSize: 14, marginBottom: 14,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={{ flex: 1, backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => processToken(token)}
                  style={{ flex: 1, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Search size={16} color="#fff" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Rechercher</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Écran Commandes ──────────────────────────────────────────────────────────
export default function PharmacistOrders() {
  const { dk } = useTheme();
  const c = dk ? C : CL;

  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState('Toutes');
  const [scanOpen, setScanOpen]     = useState(false);
  const [prepOrder, setPrepOrder]   = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      const data = await api.getPharmacyOrders();
      const list  = Array.isArray(data) ? data : data?.results || [];
      setOrders(list.map(normalizeOrder));
    } catch {
      // silencieux
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const TABS = ['Toutes', 'Nouvelles', 'En prepa', 'Prêtes'];
  const counts = {
    'Toutes':    orders.length,
    'Nouvelles': orders.filter(o => o.status === 'Nouvelle').length,
    'En prepa':  orders.filter(o => o.status === 'En prepa').length,
    'Prêtes':    orders.filter(o => o.status === 'Prete').length,
  };

  const filtered = filter === 'Toutes' ? orders : orders.filter(o => {
    if (filter === 'Nouvelles') return o.status === 'Nouvelle';
    if (filter === 'En prepa')  return o.status === 'En prepa';
    if (filter === 'Prêtes')    return o.status === 'Prete';
    return true;
  });

  async function updateStatus(id, newUiStatus) {
    // Optimistic update
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newUiStatus } : o));
    // Sync backend
    const backStatus = STATUS_BACK[newUiStatus];
    if (backStatus) {
      api.updatePharmacyOrderStatus(id, { status: backStatus }).catch(() => {});
    }
  }

  function handleOrderFound(order) {
    // Si c'est une ordonnance scannée sans commande locale correspondante → pas de filtre à appliquer
    if (order._fromScan) {
      Alert.alert(
        'Ordonnance trouvée',
        `Patient : ${order.patient}\nAucune commande en cours pour cette ordonnance.\nLe patient doit d'abord envoyer son ordonnance à la pharmacie.`,
        [{ text: 'OK' }]
      );
      return;
    }
    // Commande locale trouvée → filtrer + alerter
    if (order.status === 'Nouvelle') setFilter('Nouvelles');
    else if (order.status === 'En prepa') setFilter('En prepa');
    else if (order.status === 'Prete') setFilter('Prêtes');
    else setFilter('Toutes');
    Alert.alert(
      'Commande trouvée',
      `${order.patient} · #${order.id}\nStatut : ${order.status}`,
      [{ text: 'OK' }]
    );
  }

  // Ouvrir PrepModal + passer en "En prepa"
  function handleCommencer(order) {
    updateStatus(order.id, 'En prepa');
    setPrepOrder({ ...order, status: 'En prepa' });
  }

  // "Marquer Prête" depuis le PrepModal
  function handleMarkReady() {
    if (prepOrder) {
      updateStatus(prepOrder.id, 'Prete');
      setPrepOrder(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadOrders(); }} />}
      >

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.txt }}>Commandes</Text>
            <Text style={{ fontSize: 12, color: c.txt2 }}>Aujourd'hui</Text>
          </View>
          <TouchableOpacity
            onPress={() => setScanOpen(true)}
            style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Camera size={15} color={c.blue} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>Scanner</Text>
          </TouchableOpacity>
        </View>

        {/* Filtres */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t} onPress={() => setFilter(t)}
              style={{ backgroundColor: filter === t ? c.blue : c.card2, borderWidth: 1, borderColor: filter === t ? c.blue : c.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: filter === t ? '#fff' : c.txt2 }}>
                {t} {counts[t] ?? 0}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Liste commandes */}
        {loading && <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} />}
        {!loading && filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>Aucune commande</Text>
            <Text style={{ fontSize: 12, color: c.txt3, marginTop: 4 }}>Les commandes des patients apparaîtront ici</Text>
          </View>
        )}
        {!loading && filtered.map(o => (
          <View key={o.id} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, marginBottom: 12 }}>

            {/* En-tête commande */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Avatar initials={o.initials} c={c} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>{o.patient}</Text>
                  <StatusBadge status={o.status} c={c} />
                </View>
                <Text style={{ fontSize: 12, color: c.txt3 }}>{o.id} · {o.time}</Text>
              </View>
            </View>

            {/* Articles */}
            {o.items.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Pill size={13} color={c.green} />
                <Text style={{ fontSize: 13, color: c.txt2 }}>{item.name} ×{item.qty}</Text>
              </View>
            ))}

            {/* Footer — CNAS + total */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                {o.cnas && (
                  <View style={{ backgroundColor: c.greenBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ color: c.green, fontSize: 11, fontWeight: '700' }}>CNAS · {o.cnasRate}%</Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: c.txt3 }}>
                  {o.items.reduce((a, b) => a + b.qty, 0)} article{o.items.reduce((a, b) => a + b.qty, 0) > 1 ? 's' : ''}
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '800', color: c.txt }}>{o.total.toLocaleString()} DZD</Text>
            </View>

            {/* Actions */}
            {o.status === 'Nouvelle' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => Alert.alert(
                    'Refuser la commande',
                    `Refuser la commande de ${o.patient} ?`,
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Refuser', style: 'destructive', onPress: () => updateStatus(o.id, 'Recuperee') },
                    ]
                  )}
                  style={{ flex: 1, borderWidth: 1, borderColor: c.red + '40', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.red }}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleCommencer(o)}
                  style={{ flex: 2, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Check size={15} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Commencer la prépa.</Text>
                </TouchableOpacity>
              </View>
            )}
            {o.status === 'En prepa' && (
              <TouchableOpacity
                onPress={() => setPrepOrder(o)}
                style={{ backgroundColor: c.blue, borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <CircleCheck size={15} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Voir la préparation</Text>
              </TouchableOpacity>
            )}
            {o.status === 'Prete' && (
              <TouchableOpacity
                onPress={() => updateStatus(o.id, 'Recuperee')}
                style={{ backgroundColor: c.blue, borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <PackageCheck size={15} color="#fff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>Confirmer la remise</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

      </ScrollView>

      {/* Modal détail préparation */}
      <PrepModal
        visible={!!prepOrder}
        order={prepOrder}
        onClose={() => setPrepOrder(null)}
        onMarkReady={handleMarkReady}
        c={c}
      />

      {/* Modal scanner */}
      <ScanModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        orders={orders}
        onOrderFound={handleOrderFound}
        c={c}
      />
    </SafeAreaView>
  );
}
