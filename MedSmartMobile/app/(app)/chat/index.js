import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, ArrowLeft, PenLine, X, ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../../src/context/ThemeContext';
import { useData }  from '../../../src/context/DataContext';
import { useAuth }  from '../../../src/context/AuthContext';
import { T, FONTS, GRADIENTS } from '../../../src/theme';
import { Avatar } from '../../../src/components/ui';
import * as api from '../../../src/services/api';

// ─── Badge rôle ────────────────────────────────────────────────────────────────
function RoleBadge({ role, c }) {
  const isPharm   = role === 'Pharm';
  const isPatient = role === 'Patient';
  const col = isPharm ? c.green : isPatient ? c.blue : c.txt3;
  const bg  = isPharm ? 'rgba(45,212,160,0.15)' : isPatient ? 'rgba(48,75,113,0.12)' : 'rgba(99,142,203,0.12)';
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
      <Text style={{ color: col, fontSize: 10, fontFamily: FONTS.bold }}>{role}</Text>
    </View>
  );
}

// ─── Avatar couleur fixe ───────────────────────────────────────────────────────
function ColorAvatar({ initials, color }) {
  return (
    <View style={{
      width: 44, height: 44, borderRadius: 22,
      backgroundColor: color + '25',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color, fontSize: 15, fontFamily: FONTS.bold }}>{initials}</Text>
    </View>
  );
}

// ─── Normalise un contact depuis l'API vers un format unifié ──────────────────
function normalizeContact(item, roleLabel, color) {
  const fullName = item.full_name
    || `${item.first_name || ''} ${item.last_name || ''}`.trim()
    || item.pharm_name || item.name || 'Utilisateur';
  const initials = fullName.split(' ').map(w => w[0] || '').join('').toUpperCase().substring(0, 2) || '?';
  const sub = item.specialty || item.address || item.city || item.wilaya || '';
  return { id: item.user_id || item.id, fullName, initials, role: roleLabel, sub, color };
}

// ─── Modal Nouvelle conversation ──────────────────────────────────────────────
function NewConversationModal({ visible, onClose, c, dk, accountType }) {
  const [query,    setQuery]    = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [creating, setCreating] = useState(null); // id en cours de création

  // Charger les contacts selon le rôle
  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setLoading(true);

    const role = (accountType || '').toLowerCase();

    async function load() {
      try {
        let results = [];
        if (role === 'patient') {
          // Patient peut contacter ses médecins, pharmaciens, garde-malades
          const [docs, caretakers, pharmacies] = await Promise.allSettled([
            api.getDoctors(),
            api.getCaretakers(),
            api.getAllPharmacies(),
          ]);
          if (docs.status === 'fulfilled') {
            const list = Array.isArray(docs.value) ? docs.value : docs.value?.results || [];
            results.push(...list.map(d => normalizeContact(d, 'Médecin', '#4A6FA5')));
          }
          if (caretakers.status === 'fulfilled') {
            const list = Array.isArray(caretakers.value) ? caretakers.value : caretakers.value?.results || [];
            results.push(...list.map(d => normalizeContact(d, 'Garde-malade', '#638ECB')));
          }
          if (pharmacies.status === 'fulfilled') {
            const list = Array.isArray(pharmacies.value) ? pharmacies.value : pharmacies.value?.results || [];
            results.push(...list.map(d => normalizeContact(d, 'Pharmacie', '#2DD4A0')));
          }
        } else if (role === 'doctor') {
          // Médecin peut contacter ses patients
          const res = await api.getDoctorPatients().catch(() => null);
          const list = Array.isArray(res) ? res : res?.results || [];
          results = list.map(d => normalizeContact(d, 'Patient', '#4A6FA5'));
        } else if (role === 'pharmacist') {
          // Pharmacien → patients ayant envoyé des ordonnances
          const res = await api.getPharmacyOrders().catch(() => null);
          const list = Array.isArray(res) ? res : res?.results || [];
          const seen = new Set();
          results = list
            .filter(o => (o.patient_user_id || o.patient_id) && !seen.has(o.patient_user_id || o.patient_id) && seen.add(o.patient_user_id || o.patient_id))
            .map(o => ({
              id: o.patient_user_id || o.patient_id, // préférer le User ID pour la messagerie
              fullName: o.patient_name || 'Patient',
              initials: (o.patient_name || 'P').split(' ').map(w => w[0] || '').join('').toUpperCase().substring(0, 2),
              role: 'Patient',
              sub: o.created_at ? new Date(o.created_at).toLocaleDateString('fr-FR') : '',
              color: '#4A6FA5',
            }));
        } else if (role === 'caretaker') {
          // Garde-malade → ses patients
          const res = await api.getCaretakerPatients().catch(() => null);
          const list = Array.isArray(res) ? res : res?.results || [];
          results = list.map(d => normalizeContact(d, 'Patient', '#4A6FA5'));
        } else {
          // Fallback: médecins
          const res = await api.getDoctors().catch(() => null);
          const list = Array.isArray(res) ? res : res?.results || [];
          results = list.map(d => normalizeContact(d, 'Médecin', '#4A6FA5'));
        }
        setContacts(results.filter(c => c.id)); // garder uniquement les contacts avec un ID réel
      } catch {}
      finally { setLoading(false); }
    }

    load();
  }, [visible, accountType]);

  const filtered = contacts.filter(p =>
    p.fullName.toLowerCase().includes(query.toLowerCase()) ||
    (p.sub || '').toLowerCase().includes(query.toLowerCase())
  );

  async function handleSelect(person) {
    if (creating) return;
    setCreating(person.id);
    try {
      const conv = await api.createConversation(person.id);
      onClose();
      // Naviguer vers la vraie conversation créée par le backend
      router.push(`/(app)/chat/${conv.id}`);
    } catch {
      // createConversation a echoue — retour a la liste des conversations
      onClose();
      router.push('/(app)/chat');
    } finally {
      setCreating(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={{
          backgroundColor: c.card,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          maxHeight: '85%',
        }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: c.border, borderRadius: 2, alignSelf: 'center', marginTop: 14, marginBottom: 4 }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 }}>
            <Text style={{ flex: 1, fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>Nouvelle conversation</Text>
            <TouchableOpacity
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c.card2 || (dk ? '#1E2A3A' : '#F0F4F8'), alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} color={c.txt2} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={{ paddingHorizontal: 20, paddingBottom: 36 }}>
              {/* Recherche */}
              <View style={[S.searchBar, { backgroundColor: c.card2 || (dk ? '#1E2A3A' : '#F0F4F8'), borderColor: c.border, marginBottom: 14 }]}>
                <Search size={16} color={c.txt3} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Rechercher..."
                  placeholderTextColor={c.txt3}
                  style={{ flex: 1, marginLeft: 10, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                />
              </View>

              {/* Contenu */}
              {loading ? (
                <ActivityIndicator color={c.blue} style={{ marginVertical: 30 }} />
              ) : filtered.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Text style={{ color: c.txt3, fontSize: 14, fontFamily: FONTS.regular }}>
                    {query ? 'Aucun résultat' : 'Aucun contact disponible'}
                  </Text>
                </View>
              ) : (
                filtered.map((person, i) => (
                  <TouchableOpacity
                    key={person.id + i}
                    onPress={() => handleSelect(person)}
                    activeOpacity={0.7}
                    disabled={creating === person.id}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      paddingVertical: 12,
                      borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
                      borderBottomColor: c.border,
                      opacity: creating === person.id ? 0.5 : 1,
                    }}
                  >
                    <ColorAvatar initials={person.initials} color={person.color} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt }}>
                          {person.fullName}
                        </Text>
                        <RoleBadge role={person.role} c={c} />
                      </View>
                      {person.sub ? (
                        <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3 }}>{person.sub}</Text>
                      ) : null}
                    </View>
                    {creating === person.id
                      ? <ActivityIndicator size="small" color={c.blue} />
                      : <ChevronRight size={16} color={c.txt3} />
                    }
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Écran principal Messages ─────────────────────────────────────────────────
export default function ConversationsScreen() {
  const { dk } = useTheme();
  const { conversations = [], refresh } = useData();
  const { userData, accountType } = useAuth();
  const c = dk ? T.dark : T.light;

  const [query,       setQuery]       = useState('');
  const [refreshing,  setRefreshing]  = useState(false);
  const [newConvOpen, setNewConvOpen] = useState(false);

  const filtered = conversations.filter(conv => {
    const name = conv.other_participant?.full_name || conv.other_user_name || '';
    const preview = conv.last_message?.content || conv.last_message || '';
    return name.toLowerCase().includes(query.toLowerCase()) ||
      String(preview).toLowerCase().includes(query.toLowerCase());
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh?.(); } catch {}
    setRefreshing(false);
  };

  const totalConvs = filtered.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── Header ── */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={S.backBtn}>
          <ArrowLeft size={20} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ fontSize: 22, fontFamily: FONTS.bold, color: c.txt }}>Messages</Text>
          <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3, marginTop: 1 }}>
            {totalConvs} conversation{totalConvs !== 1 ? 's' : ''}
          </Text>
        </View>
        {/* Bouton nouveau message */}
        <TouchableOpacity
          onPress={() => setNewConvOpen(true)}
          style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}
        >
          <PenLine size={18} color={c.blue} />
        </TouchableOpacity>
      </View>

      {/* ── Search ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View style={[S.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <Search size={16} color={c.txt3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher..."
            placeholderTextColor={c.txt3}
            style={{ flex: 1, marginLeft: 10, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Bouton nouvelle conversation ── */}
        <TouchableOpacity
          onPress={() => setNewConvOpen(true)}
          activeOpacity={0.88}
          style={{ marginBottom: 20 }}
        >
          <LinearGradient
            colors={GRADIENTS.primary}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16, paddingVertical: 15,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: '#fff' }}>+ Nouvelle conversation</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Liste conversations ── */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt2 }}>Aucune conversation</Text>
            <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt3, marginTop: 6, textAlign: 'center' }}>
              Appuyez sur « Nouvelle conversation » pour commencer
            </Text>
          </View>
        ) : (
          filtered.map((conv, idx) => {
            const displayName = conv.other_participant?.full_name || conv.other_user_name || 'Conversation';
            const first = displayName.split(' ')[0] || '';
            const last  = displayName.split(' ')[1] || '';
            const isLast = idx === filtered.length - 1;
            const hasUnread = (conv.unread_count || 0) > 0;

            return (
              <TouchableOpacity
                key={conv.id || idx}
                onPress={() => router.push(`/(app)/chat/${conv.id}`)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                  paddingVertical: 14,
                  borderBottomWidth: isLast ? 0 : 1,
                  borderBottomColor: c.border,
                }}
              >
                {/* Avatar */}
                <View style={{ position: 'relative' }}>
                  <Avatar firstName={first} lastName={last} size={44} />
                  {conv.is_online && (
                    <View style={{
                      position: 'absolute', bottom: 1, right: 1,
                      width: 11, height: 11, borderRadius: 6,
                      backgroundColor: c.green, borderWidth: 2, borderColor: c.nav,
                    }} />
                  )}
                </View>

                {/* Contenu */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 15, fontFamily: hasUnread ? FONTS.bold : FONTS.semibold, color: c.txt }}>
                      {displayName}
                    </Text>
                    <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3 }}>
                      {conv.last_message?.created_at
                        ? new Date(conv.last_message.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                        : conv.last_message_time || ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1, marginRight: 8,
                        fontSize: 13,
                        fontFamily: hasUnread ? FONTS.semibold : FONTS.regular,
                        color: hasUnread ? c.txt : c.txt3,
                      }}
                    >
                      {conv.last_message?.content || conv.last_message || 'Démarrez la conversation...'}
                    </Text>
                    {hasUnread && (
                      <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.blue, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.bold }}>{conv.unread_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ── Modal Nouvelle conversation ── */}
      <NewConversationModal
        visible={newConvOpen}
        onClose={() => setNewConvOpen(false)}
        c={c}
        dk={dk}
        accountType={accountType}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 44 },
});
