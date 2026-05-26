import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, Animated, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  Camera, ClipboardList, Banknote, Package, Building2,
  Pill, X, Check, ChevronRight, TriangleAlert, Search, CircleCheck,
  Bell, MessageSquare,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth }  from '../../context/AuthContext';
import { GRADIENTS, FONTS } from '../../theme';
import { C, CL } from './data';
import * as api from '../../services/api';

// ─── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status, c = C }) {
  const map = {
    'Nouvelle':  { bg: c.amberBg, color: c.amber },
    'En prepa':  { bg: c.blueBg,  color: c.blue  },
    'Prete':     { bg: c.greenBg, color: c.green  },
    'Recuperee': { bg: c.border,  color: c.txt3   },
    'Normal':    { bg: c.greenBg, color: c.green  },
    'Critique':  { bg: c.amberBg, color: c.amber  },
    'Rupture':   { bg: c.redBg,   color: c.red    },
  };
  const s = map[status] || { bg: c.card2, color: c.txt2 };
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 }}>{status}</Text>
    </View>
  );
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ initials, c = C }) {
  return (
    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.blueBg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.blue, fontSize: 13, fontWeight: '800' }}>{initials}</Text>
    </View>
  );
}

// ─── Modal Scanner ─────────────────────────────────────────────────────────────
function ScanModal({ visible, onClose, c = C }) {
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

  // ── Appel API backend pour valider l'ordonnance par son token QR ─────────
  async function processToken(code) {
    const trimmed = code.trim();
    if (!trimmed || searching) return;
    setSearching(true);
    try {
      const data = await api.scanPrescriptionQR({ token: trimmed, qr_token: trimmed });
      // Normalise la réponse quelle que soit la structure retournée par le backend
      const rx = data?.prescription || data?.order || data || {};
      // Extrait le nom patient (rx.patient peut être un objet ou une chaîne)
      const patientRaw = rx.patient;
      const patientName = rx.patient_name
        || (patientRaw && typeof patientRaw === 'object'
            ? `${patientRaw.first_name || ''} ${patientRaw.last_name || ''}`.trim() || patientRaw.full_name
            : typeof patientRaw === 'string' ? patientRaw : null)
        || 'Patient';
      const order = {
        id:      rx.id || trimmed,
        patient: patientName,
        time:    rx.created_at ? new Date(rx.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
        status:  rx.status || 'Nouvelle',
        total:   Number(rx.total_price || rx.total || 0),
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

  function handleGoToOrders() {
    handleClose();
    router.push('/(app)/pharmacist/orders');
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

          {result ? (
            <View>
              {result.success ? (
                <View style={{ backgroundColor: c.greenBg, borderWidth: 1, borderColor: c.green + '40', borderRadius: 14, padding: 16, marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CircleCheck size={20} color={c.green} />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: c.green }}>Ordonnance trouvée</Text>
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
                  <Text style={{ fontSize: 12, color: c.txt2 }}>Code : {result.code}</Text>
                  <Text style={{ fontSize: 11, color: c.txt3, marginTop: 4 }}>
                    Essayez : CMD-1042, CMD-1041, CMD-1040
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
                    onPress={handleGoToOrders}
                    style={{ flex: 1, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    <ChevronRight size={16} color="#fff" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Commandes</Text>
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
                      Autorisation caméra requise
                    </Text>
                    <TouchableOpacity
                      onPress={requestPermission}
                      style={{ backgroundColor: c.blue, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Autoriser</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <CameraView
                    style={{ flex: 1 }}
                    barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] }}
                    onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                  >
                    {[
                      { position: 'absolute', top: 24,    left: 24,   borderTopWidth: 3,    borderLeftWidth: 3  },
                      { position: 'absolute', top: 24,    right: 24,  borderTopWidth: 3,    borderRightWidth: 3 },
                      { position: 'absolute', bottom: 24, left: 24,   borderBottomWidth: 3, borderLeftWidth: 3  },
                      { position: 'absolute', bottom: 24, right: 24,  borderBottomWidth: 3, borderRightWidth: 3 },
                    ].map((st, i) => <View key={i} style={{ width: 28, height: 28, borderColor: c.blue, ...st }} />)}
                    <Animated.View
                      style={{
                        position: 'absolute', left: 24, right: 24, height: 2,
                        backgroundColor: c.blue, opacity: 0.9,
                        transform: [{ translateY: scanLineY }],
                      }}
                    />
                  </CameraView>
                )}
              </View>
              <Text style={{ fontSize: 12, color: c.txt3, textAlign: 'center' }}>
                Pointez la caméra vers le QR code de l'ordonnance
              </Text>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginBottom: 6 }}>
                NUMÉRO DE COMMANDE
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
                  disabled={searching}
                  style={{ flex: 1, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: searching ? 0.7 : 1 }}
                >
                  {searching
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Search size={16} color="#fff" /><Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Rechercher</Text></>
                  }
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Écran Dashboard ───────────────────────────────────────────────────────────
export default function PharmacistDashboard() {
  const { dk } = useTheme();
  const { avatarUri, userData } = useAuth();
  const c = dk ? C : CL;

  const [scanOpen, setScanOpen]     = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [alertStock, setAlertStock]     = useState([]);
  const [dashData, setDashData]         = useState(null);

  const loadDash = useCallback(async () => {
    try {
      const [orders, stock, dash] = await Promise.allSettled([
        api.getPharmacyOrders(),
        api.getPharmacyStock(),
        api.getPharmacistDashboard(),
      ]);
      if (orders.status === 'fulfilled') {
        const list = Array.isArray(orders.value) ? orders.value : orders.value?.results || [];
        setRecentOrders(list.slice(0, 3).map(o => {
          const name = o.patient_name || o.patient || 'Patient';
          const initials = name.split(' ').map(p => p[0] || '').join('').toUpperCase().substring(0, 2) || 'P';
          const statusMap = { pending: 'Nouvelle', preparing: 'En prepa', ready: 'Prete', completed: 'Recuperee' };
          return {
            id:      o.id,
            patient: name,
            initials,
            status:  statusMap[o.status] || o.status || 'Nouvelle',
            total:   Number(o.total_price || o.total || 0),
            time:    o.created_at ? new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          };
        }));
      }
      if (stock.status === 'fulfilled') {
        const list = Array.isArray(stock.value) ? stock.value : stock.value?.results || [];
        setAlertStock(list
          .map(s => {
            const qty = Number(s.stock_qty ?? s.quantity ?? s.qty ?? 0);
            const min = Number(s.min_quantity ?? s.min_qty ?? s.min ?? 10);
            const molecule = s.molecule || s.generic_name || '';
            return {
              id:       s.id,
              name:     s.name || 'Médicament',
              molecule,
              qty,
              min,
              status:   qty === 0 ? 'Rupture' : qty < min ? 'Critique' : 'Normal',
            };
          })
          .filter(s => s.status !== 'Normal')
        );
      }
      if (dash.status === 'fulfilled' && dash.value) {
        setDashData(dash.value);
      }
    } catch {}
  }, []);

  useEffect(() => { loadDash(); }, [loadDash]);

  const kpis = [
    { label: "Commandes aujourd'hui", value: String(dashData?.orders_today ?? recentOrders.length), sub: 'en attente',   color: c.blue,   Icon: ClipboardList },
    { label: 'Revenu du jour',        value: dashData?.revenue_today ? String(dashData.revenue_today) : '—', sub: 'DZD', color: c.purple, Icon: Banknote      },
    { label: 'Articles stock',        value: dashData?.total_products ? String(dashData.total_products) : '—', sub: `${alertStock.length} à surveiller`, color: c.amber, Icon: Package },
    { label: 'Remb. CNAS / mois',     value: dashData?.cnas_reimbursement ? String(dashData.cnas_reimbursement) : '—', sub: 'DZD', color: c.green, Icon: Building2 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── NavBar ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.nav, gap: 10 }}>
        <LinearGradient colors={GRADIENTS.primary} style={{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16, fontFamily: FONTS.bold }}>+</Text>
        </LinearGradient>
        <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: c.txt }}>Healy</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => router.push('/(app)/chat')}
          style={{ padding: 6 }}
        >
          <MessageSquare size={20} color={c.txt2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(app)/notifications')}
          style={{ padding: 6, position: 'relative' }}
        >
          <Bell size={20} color={c.txt2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(app)/pharmacist/profile')}
          activeOpacity={0.75}
          style={{ padding: 6 }}
        >
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.blueBg, borderWidth: 2, borderColor: c.blue + '50', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={{ width: 34, height: 34 }} resizeMode="cover" />
              : <Text style={{ color: c.blue, fontSize: 13, fontFamily: FONTS.bold }}>
                  {((userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || '')).toUpperCase() || 'PH'}
                </Text>
            }
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>

        {/* ── Bouton Scanner ── */}
        <TouchableOpacity
          onPress={() => setScanOpen(true)}
          activeOpacity={0.85}
          style={{ backgroundColor: c.blue, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}
        >
          <Camera size={20} color="#fff" />
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Scanner une ordonnance</Text>
        </TouchableOpacity>

        {/* ── KPIs 2×2 ── */}
        {[[kpis[0], kpis[1]], [kpis[2], kpis[3]]].map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            {row.map((k, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 }}>
                <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: k.color + '1A', alignItems: 'center', justifyContent: 'center' }}>
                  <k.Icon size={18} color={k.color} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: k.color, marginTop: 8 }}>{k.value}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 2 }}>{k.label}</Text>
                <Text style={{ fontSize: 11, color: k.color + 'BB', marginTop: 2 }}>{k.sub}</Text>
              </View>
            ))}
          </View>
        ))}

        {/* ── Dernières commandes ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.txt3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Dernières commandes</Text>
          <TouchableOpacity
            onPress={() => router.push('/(app)/pharmacist/orders')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          >
            <Text style={{ color: c.blue, fontSize: 13, fontWeight: '700' }}>Voir tout</Text>
            <ChevronRight size={14} color={c.blue} />
          </TouchableOpacity>
        </View>

        {recentOrders.map(o => (
          <TouchableOpacity
            key={o.id}
            onPress={() => router.push('/(app)/pharmacist/orders')}
            style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}
          >
            <Avatar initials={o.initials} c={c} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>{o.patient}</Text>
                <StatusBadge status={o.status} c={c} />
              </View>
              <Text style={{ fontSize: 12, color: c.txt3, marginTop: 2 }}>{o.id} · {o.time}</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.txt }}>{o.total.toLocaleString()} DZD</Text>
          </TouchableOpacity>
        ))}

        {/* ── Alertes stock ── */}
        {alertStock.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.txt3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Alertes stock</Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/pharmacist/stock')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
              >
                <Text style={{ color: c.blue, fontSize: 13, fontWeight: '700' }}>Gérer</Text>
                <ChevronRight size={14} color={c.blue} />
              </TouchableOpacity>
            </View>
            {alertStock.map(s => (
              <TouchableOpacity
                key={s.id}
                onPress={() => router.push('/(app)/pharmacist/stock')}
                style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: s.status === 'Rupture' ? c.redBg : c.amberBg, alignItems: 'center', justifyContent: 'center' }}>
                  {s.status === 'Rupture'
                    ? <TriangleAlert size={18} color={c.red} />
                    : <Pill size={18} color={c.amber} />
                  }
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.txt }}>{s.name}</Text>
                  <Text style={{ fontSize: 11, color: c.txt3 }}>{(s.molecule || '').split('·')[0].trim() || '—'} · min {s.min}</Text>
                </View>
                <StatusBadge status={s.status === 'Critique' ? 'Critique' : 'Rupture'} c={c} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Bilan CNAS ── */}
        <View style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, marginTop: 10 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Bilan CNAS ce mois
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 26, fontWeight: '800', color: c.txt }}>42 380 DZD</Text>
              <Text style={{ fontSize: 12, color: c.txt2, marginTop: 2 }}>sur 86 250 DZD de revenu total</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.purple }}>49%</Text>
          </View>
          <View style={{ marginTop: 10, backgroundColor: c.border, borderRadius: 4, height: 6 }}>
            <View style={{ width: '49%', backgroundColor: c.purple, borderRadius: 4, height: '100%' }} />
          </View>
          <Text style={{ fontSize: 10, color: c.txt3, marginTop: 4 }}>couvert</Text>
        </View>

      </ScrollView>

      <ScanModal
        visible={scanOpen}
        onClose={() => setScanOpen(false)}
        c={c}
      />
    </SafeAreaView>
  );
}
