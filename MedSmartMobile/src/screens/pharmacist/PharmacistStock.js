import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, Share, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search, Download, Pencil, Plus, TriangleAlert, Pill,
  X, Check, Package,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { C, CL } from './data';
import * as api from '../../services/api';

// ─── Normalise un item retourné par le backend ────────────────────────────────
function normalizeStockItem(item) {
  const qty = item.stock_qty ?? item.quantity ?? item.qty ?? 0;
  const min = item.min_quantity ?? item.min_qty ?? item.low_stock_threshold ?? item.min ?? 10;
  return {
    id:       item.id,
    name:     item.name     || 'Médicament',
    molecule: item.molecule || item.generic_name || '',
    qty:      Number(qty),
    min:      Number(min),
    price:    Number(item.price) || 0,
    exp:      item.expiry_date ?? item.expiration_date ?? item.exp ?? 'N/A',
    status:   deriveStatus(String(qty), String(min)),
    _raw:     item, // conserver l'objet original pour les PATCH
  };
}

// ─── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status, c = C }) {
  const map = {
    'Normal':   { bg: c.greenBg, color: c.green },
    'Critique': { bg: c.amberBg, color: c.amber },
    'Rupture':  { bg: c.redBg,   color: c.red   },
  };
  const s = map[status] || { bg: c.card2, color: c.txt2 };
  return (
    <View style={{ backgroundColor: s.bg, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

// ─── FieldRow ──────────────────────────────────────────────────────────────────
function FieldRow({ label, value, onChange, keyboardType = 'default', placeholder, c = C }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginBottom: 5 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={c.txt3}
        style={{
          backgroundColor: c.bg, borderWidth: 1, borderColor: c.border2,
          borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
          color: c.txt, fontSize: 14,
        }}
      />
    </View>
  );
}

function deriveStatus(qty, min) {
  const q = parseInt(qty) || 0;
  const m = parseInt(min) || 0;
  if (q === 0) return 'Rupture';
  if (q < m)   return 'Critique';
  return 'Normal';
}

// ─── Modal Ajouter / Modifier ──────────────────────────────────────────────────
function StockFormModal({ visible, onClose, item, onSave, c = C }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    name:     item?.name     || '',
    molecule: item?.molecule || '',
    qty:      item ? String(item.qty) : '',
    min:      item ? String(item.min) : '',
    price:    item ? String(item.price) : '',
    exp:      item?.exp      || '',
  });

  function set(key) { return v => setForm(f => ({ ...f, [key]: v })); }

  function handleSave() {
    if (!form.name.trim()) { Alert.alert('Champ requis', 'Le nom du médicament est obligatoire.'); return; }
    if (!form.qty.trim())  { Alert.alert('Champ requis', 'La quantité est obligatoire.'); return; }
    if (!form.min.trim())  { Alert.alert('Champ requis', 'Le seuil minimum est obligatoire.'); return; }
    const entry = {
      id:       item?.id || Date.now(),
      name:     form.name.trim(),
      molecule: form.molecule.trim() || 'Non spécifié',
      qty:      parseInt(form.qty) || 0,
      min:      parseInt(form.min) || 0,
      price:    parseInt(form.price) || 0,
      exp:      form.exp.trim() || 'N/A',
      status:   deriveStatus(form.qty, form.min),
    };
    onSave(entry);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 }}>
          <View style={{ width: 40, height: 4, backgroundColor: c.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: c.blueBg, borderRadius: 8, padding: 8 }}>
                {isEdit ? <Pencil size={16} color={c.blue} /> : <Plus size={16} color={c.blue} />}
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.txt }}>
                {isEdit ? 'Modifier le médicament' : 'Ajouter un médicament'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
            <FieldRow label="NOM DU MÉDICAMENT"    value={form.name}     onChange={set('name')}     placeholder="ex: Paracetamol 500mg" c={c} />
            <FieldRow label="MOLÉCULE / CATÉGORIE" value={form.molecule} onChange={set('molecule')} placeholder="ex: Paracetamol · Antalgique" c={c} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FieldRow label="QUANTITÉ EN STOCK" value={form.qty}   onChange={set('qty')}   keyboardType="numeric" placeholder="0" c={c} /></View>
              <View style={{ flex: 1 }}><FieldRow label="SEUIL MINIMUM"     value={form.min}   onChange={set('min')}   keyboardType="numeric" placeholder="0" c={c} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><FieldRow label="PRIX (DZD)"           value={form.price} onChange={set('price')} keyboardType="numeric" placeholder="0" c={c} /></View>
              <View style={{ flex: 1 }}><FieldRow label="EXPIRATION (MM/AAAA)" value={form.exp}   onChange={set('exp')}   placeholder="12/2027" c={c} /></View>
            </View>
            {form.qty !== '' && form.min !== '' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: c.txt3 }}>Statut prévu :</Text>
                <StatusBadge status={deriveStatus(form.qty, form.min)} c={c} />
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={{ flex: 1, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Check size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{isEdit ? 'Modifier' : 'Ajouter'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal Réapprovisionnement ─────────────────────────────────────────────────
function ReapproModal({ visible, onClose, item, onSave, c = C }) {
  const [qty, setQty] = useState('');

  function handleConfirm() {
    const added = parseInt(qty);
    if (!added || added <= 0) { Alert.alert('Quantité invalide', 'Entrez une quantité > 0.'); return; }
    onSave(item, added);
    setQty('');
    onClose();
  }

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 44 }}>
          <View style={{ width: 40, height: 4, backgroundColor: c.border2, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: c.blueBg, borderRadius: 8, padding: 8 }}>
                <Package size={16} color={c.blue} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: c.txt }}>Réapprovisionnement</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>

          <View style={{ backgroundColor: c.card2, borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>{item.name}</Text>
            <Text style={{ fontSize: 11, color: c.txt3, marginTop: 2 }}>{item.molecule}</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
              <View>
                <Text style={{ fontSize: 10, color: c.txt3, letterSpacing: 0.6 }}>STOCK ACTUEL</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: item.qty === 0 ? c.red : c.amber }}>{item.qty}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: c.txt3, letterSpacing: 0.6 }}>MINIMUM</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: c.txt2 }}>{item.min}</Text>
              </View>
            </View>
          </View>

          <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginBottom: 6 }}>QUANTITÉ À AJOUTER</Text>
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="numeric"
            placeholder="ex: 50"
            placeholderTextColor={c.txt3}
            autoFocus
            style={{
              backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2,
              borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14,
              color: c.txt, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 6,
            }}
          />
          {qty !== '' && (
            <Text style={{ fontSize: 12, color: c.blue, textAlign: 'center', marginBottom: 14 }}>
              Nouveau stock : {item.qty + (parseInt(qty) || 0)}
            </Text>
          )}
          {qty === '' && <View style={{ marginBottom: 14 }} />}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              style={{ flex: 1, backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={{ flex: 1, backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Check size={16} color="#fff" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Écran Stock ───────────────────────────────────────────────────────────────
export default function PharmacistStock() {
  const { dk } = useTheme();
  const c = dk ? C : CL;

  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('Toutes');
  const [stock, setStock]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [addOpen, setAddOpen]         = useState(false);
  const [editItem, setEditItem]       = useState(null);
  const [reapproItem, setReapproItem] = useState(null);

  const loadStock = useCallback(async () => {
    try {
      const data = await api.getPharmacyStock();
      const list  = Array.isArray(data) ? data : data?.results || [];
      setStock(list.map(normalizeStockItem));
    } catch {
      // Silencieux — la liste reste vide
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStock(); }, [loadStock]);

  const counts = {
    Normal:   stock.filter(s => s.status === 'Normal').length,
    Critique: stock.filter(s => s.status === 'Critique').length,
    Rupture:  stock.filter(s => s.status === 'Rupture').length,
  };

  const filtered = stock.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(q) || s.molecule.toLowerCase().includes(q);
    const matchFilter = filter === 'Toutes' || s.status === filter;
    return matchSearch && matchFilter;
  });

  async function handleSaveNew(entry) {
    try {
      await api.addPharmacyStock({
        name:         entry.name,
        molecule:     entry.molecule,
        stock_qty:    entry.qty,
        min_quantity: entry.min,
        price:        entry.price,
        expiry_date:  entry.exp !== 'N/A' ? entry.exp : undefined,
      });
      await loadStock();
      Alert.alert('Ajouté', `${entry.name} a été ajouté au stock.`);
    } catch {
      // Fallback local si l'API échoue
      setStock(prev => [entry, ...prev]);
      Alert.alert('Ajouté (local)', `${entry.name} ajouté localement.`);
    }
  }

  async function handleSaveEdit(entry) {
    try {
      await api.updatePharmacyStock(entry.id, {
        name:         entry.name,
        molecule:     entry.molecule,
        stock_qty:    entry.qty,
        min_quantity: entry.min,
        price:        entry.price,
        expiry_date:  entry.exp !== 'N/A' ? entry.exp : undefined,
      });
      await loadStock();
      Alert.alert('Modifié', `${entry.name} mis à jour.`);
    } catch {
      setStock(prev => prev.map(s => s.id === entry.id ? entry : s));
      Alert.alert('Modifié (local)', `${entry.name} mis à jour localement.`);
    }
  }

  async function handleReappro(item, added) {
    const newQty = item.qty + added;
    try {
      await api.updatePharmacyStock(item.id, { stock_qty: newQty });
      await loadStock();
    } catch {
      setStock(prev => prev.map(s => {
        if (s.id !== item.id) return s;
        return { ...s, qty: newQty, status: deriveStatus(String(newQty), String(s.min)) };
      }));
    }
    Alert.alert('Réapprovisionné', `${item.name} : +${added} unités ajoutées.`);
  }

  async function handleExport() {
    const lines = [
      'Rapport de stock - Healy Pharmacie',
      `Date : ${new Date().toLocaleDateString('fr-FR')}`,
      '',
      stock.map(s => `${s.name} | ${s.molecule} | Qté: ${s.qty} | Min: ${s.min} | ${s.price} DZD | Exp: ${s.exp} | ${s.status}`).join('\n'),
    ].join('\n');
    try { await Share.share({ message: lines, title: 'Stock Pharmacie' }); }
    catch { Alert.alert('Export', 'Impossible de partager le rapport.'); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStock(); }} />}
      >

        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.txt }}>Gestion du Stock</Text>
            <Text style={{ fontSize: 12, color: c.txt2 }}>
              {stock.length} références · <Text style={{ color: c.red }}>{counts.Rupture} en rupture</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setAddOpen(true)}
            style={{ backgroundColor: c.blueBg, borderWidth: 1, borderColor: c.blue + '40', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} color={c.blue} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.blue }}>Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Recherche */}
        <View style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 }}>
          <Search size={16} color={c.txt3} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Médicament ou molécule..."
            placeholderTextColor={c.txt3}
            style={{ flex: 1, color: c.txt, fontSize: 14 }}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={15} color={c.txt3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, alignItems: 'center' }}>
          {['Toutes', 'Critique', 'Normal'].map(f => (
            <TouchableOpacity
              key={f} onPress={() => setFilter(f)}
              style={{ backgroundColor: filter === f ? c.blue : c.card2, borderWidth: 1, borderColor: filter === f ? c.blue : c.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: filter === f ? '#fff' : c.txt2 }}>{f}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={handleExport}
            style={{ marginLeft: 'auto', backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}
          >
            <Download size={12} color={c.txt2} />
            <Text style={{ fontSize: 12, color: c.txt2 }}>Exporter</Text>
          </TouchableOpacity>
        </View>

        {/* Compteurs */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'NORMAL',   value: counts.Normal,   color: c.green },
            { label: 'CRITIQUE', value: counts.Critique, color: c.amber },
            { label: 'RUPTURE',  value: counts.Rupture,  color: c.red   },
          ].map(item => (
            <View key={item.label} style={{ flex: 1, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: item.color }}>{item.value}</Text>
              <Text style={{ fontSize: 9, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Liste stock */}
        {loading && <ActivityIndicator color={c.blue} style={{ marginTop: 30 }} />}
        {!loading && filtered.map(s => {
          const pct      = Math.min(100, Math.round((s.qty / Math.max(s.qty, s.min * 2)) * 100));
          const barColor = s.status === 'Rupture' ? c.red : s.status === 'Critique' ? c.amber : c.green;
          return (
            <View key={s.id} style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>{s.name}</Text>
                  <Text style={{ fontSize: 11, color: c.txt3, marginTop: 2 }}>{s.molecule}</Text>
                </View>
                <StatusBadge status={s.status} c={c} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: s.qty === 0 ? c.red : c.txt }}>{s.qty}</Text>
                <Text style={{ fontSize: 11, color: c.txt3 }}>Min : {s.min} · Exp. {s.exp}</Text>
              </View>
              <View style={{ backgroundColor: c.border, borderRadius: 4, height: 4, marginBottom: 10 }}>
                <View style={{ width: `${pct}%`, backgroundColor: barColor, borderRadius: 4, height: '100%' }} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: c.blue }}>{s.price} DZD</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => setEditItem(s)}
                    style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}
                  >
                    <Pencil size={14} color={c.txt2} />
                  </TouchableOpacity>
                  {s.status !== 'Normal' && (
                    <TouchableOpacity
                      onPress={() => setReapproItem(s)}
                      style={{ backgroundColor: c.blueBg, borderWidth: 1, borderColor: c.blue + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}
                    >
                      {s.status === 'Rupture'
                        ? <TriangleAlert size={13} color={c.blue} />
                        : <Pill size={13} color={c.blue} />
                      }
                      <Text style={{ color: c.blue, fontSize: 12, fontWeight: '700' }}>Reappro</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {!loading && filtered.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Package size={40} color={c.txt3} />
            <Text style={{ color: c.txt2, fontSize: 14, fontWeight: '700', marginTop: 12 }}>Aucun résultat</Text>
            <Text style={{ color: c.txt3, fontSize: 12, marginTop: 4 }}>Modifiez votre recherche ou ajoutez des médicaments</Text>
          </View>
        )}

      </ScrollView>

      <StockFormModal visible={addOpen}     onClose={() => setAddOpen(false)}   item={null}     onSave={handleSaveNew}  c={c} />
      <StockFormModal visible={!!editItem}  onClose={() => setEditItem(null)}   item={editItem} onSave={handleSaveEdit} c={c} />
      <ReapproModal   visible={!!reapproItem} onClose={() => setReapproItem(null)} item={reapproItem} onSave={handleReappro} c={c} />
    </SafeAreaView>
  );
}
