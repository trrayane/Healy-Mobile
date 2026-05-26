import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, TrendingUp, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { C, CL, CHART_DATA } from './data';
import * as api from '../../services/api';

// ─── Graphique barres ──────────────────────────────────────────────────────────
function BarChart({ data, c = C }) {
  const maxVal = Math.max(...data.map(d => d.ventes)) * 1.1 || 1;
  const BAR_H  = 100;

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
        {[{ label: 'Ventes', color: c.blue }, { label: 'CNAS', color: c.green }].map(l => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color }} />
            <Text style={{ fontSize: 12, color: c.txt2 }}>{l.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: BAR_H + 20, gap: 4 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: '100%', flexDirection: 'row', gap: 2, alignItems: 'flex-end', height: BAR_H }}>
              <View style={{ flex: 1, height: Math.round((d.ventes / maxVal) * BAR_H), backgroundColor: c.blue,  borderRadius: 3 }} />
              <View style={{ flex: 1, height: Math.round((d.cnas   / maxVal) * BAR_H), backgroundColor: c.green, borderRadius: 3 }} />
            </View>
            <Text style={{ fontSize: 9, color: c.txt3, marginTop: 4 }}>{d.month}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Formater un montant DZD ───────────────────────────────────────────────────
function fmtDZD(val) {
  if (val == null || val === '') return '—';
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return n.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }) + ' DZD';
}

// ─── Écran Statistiques ────────────────────────────────────────────────────────
export default function PharmacistStats() {
  const { dk } = useTheme();
  const c = dk ? C : CL;

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [dashData,    setDashData]    = useState(null);
  const [alertCount,  setAlertCount]  = useState(0);
  const [topMeds,     setTopMeds]     = useState([]);

  // ── Charger les données ──────────────────────────────────────────────────────
  const loadStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dashRes, stockRes] = await Promise.allSettled([
        api.getPharmacistDashboard(),
        api.getPharmacyStock(),
      ]);

      // Dashboard KPIs
      if (dashRes.status === 'fulfilled' && dashRes.value) {
        setDashData(dashRes.value);
      }

      // Stock → alertes + top médicaments
      if (stockRes.status === 'fulfilled') {
        const list = Array.isArray(stockRes.value)
          ? stockRes.value
          : stockRes.value?.results || [];

        // Alertes : quantité ≤ seuil_alerte (ou ≤ 5 par défaut)
        const alerts = list.filter(item => {
          const qty       = Number(item.quantity       ?? item.stock_quantity ?? 0);
          const threshold = Number(item.alert_threshold ?? item.min_quantity  ?? 5);
          return qty <= threshold;
        });
        setAlertCount(alerts.length);

        // Top médicaments : tri par quantité vendue ou quantité en stock
        const sorted = [...list].sort((a, b) => {
          const sa = Number(a.quantity_sold ?? a.sales ?? a.quantity ?? 0);
          const sb = Number(b.quantity_sold ?? b.sales ?? b.quantity ?? 0);
          return sb - sa;
        });
        const colors = [c.blue, c.purple, c.green];
        setTopMeds(
          sorted.slice(0, 3).map((item, i) => {
            const sales = Number(item.quantity_sold ?? item.sales ?? item.quantity ?? 0);
            const name  = item.medication_name ?? item.name ?? item.medication ?? `Médicament ${i + 1}`;
            return { name, sales, color: colors[i] };
          })
        );
      }
    } catch (_) {
      // silently fail — keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [c.blue, c.purple, c.green]);

  useEffect(() => { loadStats(); }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats(true);
  }, [loadStats]);

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Commandes aujourd'hui",
      value: dashData?.orders_today != null ? String(dashData.orders_today) : '—',
      color: c.blue,
    },
    {
      label: 'Revenus du jour',
      value: fmtDZD(dashData?.revenue_today),
      color: c.blue,
    },
    {
      label: 'Remboursés CNAS',
      value: fmtDZD(dashData?.cnas_reimbursement),
      color: c.purple,
    },
    {
      label: 'Alertes stock',
      value: loading ? '…' : String(alertCount),
      color: c.amber,
    },
  ];

  // ── Top médicaments fallback ──────────────────────────────────────────────────
  const displayMeds = topMeds.length > 0 ? topMeds : [];
  const maxSales    = displayMeds.length > 0 ? Math.max(...displayMeds.map(m => m.sales), 1) : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.blue}
            colors={[c.blue]}
          />
        }
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.txt }}>Statistiques</Text>
            <Text style={{ fontSize: 12, color: c.txt2 }}>Analyse des ventes et remboursements CNAS</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={onRefresh}
              style={{ padding: 6 }}
            >
              <RefreshCw size={16} color={c.txt3} />
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 12, color: c.txt2 }}>6 mois</Text>
              <ChevronDown size={14} color={c.txt2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* KPIs 2×2 */}
        {loading && !refreshing ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator size="large" color={c.blue} />
          </View>
        ) : (
          [[kpis[0], kpis[1]], [kpis[2], kpis[3]]].map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              {row.map((k, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.txt3, letterSpacing: 0.6, textTransform: 'uppercase' }}>{k.label}</Text>
                  <Text
                    style={{
                      fontSize: ri === 0 ? 24 : 16,
                      fontWeight: '800',
                      color: k.color,
                      marginTop: 6,
                      lineHeight: ri === 0 ? 28 : 22,
                    }}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                  >
                    {k.value}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Graphique — données illustratives (historique mensuel non disponible via API) */}
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14, marginBottom: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt, marginBottom: 4 }}>Ventes vs CNAS</Text>
          <Text style={{ fontSize: 11, color: c.txt3, marginBottom: 14 }}>6 derniers mois (en milliers de DZD)</Text>
          <BarChart data={CHART_DATA} c={c} />
        </View>

        {/* Top médicaments */}
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>Top médicaments vendus</Text>
            <View style={{ backgroundColor: c.greenBg, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <TrendingUp size={11} color={c.green} />
              <Text style={{ color: c.green, fontSize: 11, fontWeight: '700' }}>Stock</Text>
            </View>
          </View>

          {loading && !refreshing ? (
            <ActivityIndicator size="small" color={c.blue} style={{ marginVertical: 12 }} />
          ) : displayMeds.length === 0 ? (
            <Text style={{ color: c.txt3, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>
              Aucune donnée disponible
            </Text>
          ) : (
            displayMeds.map((m, i) => (
              <View key={i} style={{ marginBottom: i < displayMeds.length - 1 ? 14 : 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: c.txt3 }}>{i + 1}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: c.txt, flex: 1 }} numberOfLines={1}>{m.name}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: m.color }}>{m.sales}</Text>
                </View>
                <View style={{ backgroundColor: c.border, borderRadius: 4, height: 4 }}>
                  <View style={{ width: `${Math.min((m.sales / maxSales) * 100, 100)}%`, backgroundColor: m.color, borderRadius: 4, height: '100%' }} />
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
