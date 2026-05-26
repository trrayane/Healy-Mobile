import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Building2, CircleCheck, Check, Save, Lock, Globe,
  Info, ShieldCheck, LogOut, Sun, Moon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth }  from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { C, CL }   from './data';
import * as api    from '../../services/api';

export default function PharmacistProfile() {
  const { userData, logout, updateUserData } = useAuth();
  const { dk, toggleTheme } = useTheme();
  const c = dk ? C : CL;

  // ── Profil ────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    prenom: userData?.first_name  || '',
    nom:    userData?.last_name   || '',
    email:  userData?.email       || '',
    tel:    userData?.phone       || userData?.phone_number || '',
  });
  const [savingProf, setSavingProf] = useState(false);
  const [savedProf,  setSavedProf]  = useState(false);

  // ── Sécurité ─────────────────────────────────────────────────────────────────
  const [pwForm, setPwForm]     = useState({ current: '', next: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  // ── Langue ───────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState('Français');

  // ── Initiales avatar ─────────────────────────────────────────────────────────
  const initials = `${(form.prenom[0] || '').toUpperCase()}${(form.nom[0] || '').toUpperCase()}` || '??';
  const displayName = [form.prenom, form.nom].filter(Boolean).join(' ') || 'Pharmacien';
  const pharmacyName = userData?.pharmacy_name || userData?.pharmacyName || '';
  const wilaya = userData?.wilaya || userData?.city || 'Alger';
  const cnasOk = userData?.cnas_convention ?? true;

  // ── Sauvegarder le profil ────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.prenom.trim() || !form.nom.trim()) {
      Alert.alert('Champ requis', 'Le prénom et le nom sont obligatoires.');
      return;
    }
    setSavingProf(true);
    try {
      const updated = await api.updateMe({
        first_name:   form.prenom.trim(),
        last_name:    form.nom.trim(),
        phone_number: form.tel.trim(),
      });
      if (updateUserData) updateUserData(updated);
      setSavedProf(true);
      setTimeout(() => setSavedProf(false), 2000);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de mettre à jour le profil.');
    } finally {
      setSavingProf(false);
    }
  }

  // ── Changer le mot de passe ───────────────────────────────────────────────────
  async function handleChangePassword() {
    if (!pwForm.current.trim()) {
      Alert.alert('Champ requis', 'Entrez votre mot de passe actuel.');
      return;
    }
    if (pwForm.next.length < 6) {
      Alert.alert('Mot de passe trop court', 'Au moins 6 caractères requis.');
      return;
    }
    setSavingPwd(true);
    try {
      await api.changePassword({
        old_password: pwForm.current,
        new_password: pwForm.next,
        confirm_password: pwForm.next,
      });
      Alert.alert('Mot de passe mis à jour', 'Votre mot de passe a été modifié avec succès.', [
        { text: 'OK', onPress: () => setPwForm({ current: '', next: '' }) },
      ]);
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Mot de passe actuel incorrect.');
    } finally {
      setSavingPwd(false);
    }
  }

  // ── Déconnexion ───────────────────────────────────────────────────────────────
  function handleLogout() {
    Alert.alert(
      'Se déconnecter',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter', style: 'destructive',
          onPress: async () => { await logout(); router.replace('/'); },
        },
      ]
    );
  }

  // ── Composants internes ───────────────────────────────────────────────────────
  function Card({ children, style }) {
    return (
      <View style={[{
        backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
        borderRadius: 16, padding: 14, marginBottom: 10,
      }, style]}>
        {children}
      </View>
    );
  }

  function SectionTitle({ children }) {
    return (
      <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt, marginTop: 16, marginBottom: 10 }}>
        {children}
      </Text>
    );
  }

  function FieldInput({ label, value, onChange, secureTextEntry, placeholder }) {
    return (
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginBottom: 5 }}>
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={c.txt3}
          autoCapitalize="none"
          style={{
            backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2,
            borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
            color: c.txt, fontSize: 14,
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 110 }}>

        {/* ── Titre ─────────────────────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: c.txt }}>Paramètres</Text>
          <Text style={{ fontSize: 12, color: c.txt2 }}>Gérez votre officine</Text>
        </View>

        {/* ── Carte pharmacien ──────────────────────────────────────────────────── */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{
              width: 46, height: 46, borderRadius: 14,
              backgroundColor: c.blueBg, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ color: c.blue, fontSize: 15, fontWeight: '800' }}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.txt }}>{displayName}</Text>
              <Text style={{ fontSize: 12, color: c.txt2 }}>
                {pharmacyName ? `${pharmacyName} · ` : 'Pharmacien · '}{wilaya}
              </Text>
              {cnasOk && (
                <View style={{
                  backgroundColor: c.greenBg, flexDirection: 'row', alignItems: 'center',
                  gap: 4, paddingHorizontal: 8, paddingVertical: 2,
                  borderRadius: 6, alignSelf: 'flex-start', marginTop: 4,
                }}>
                  <ShieldCheck size={11} color={c.green} />
                  <Text style={{ color: c.green, fontSize: 11, fontWeight: '700' }}>Conventionné CNAS</Text>
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* ── Connexion CNAS ────────────────────────────────────────────────────── */}
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: c.greenBg, alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={18} color={c.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>Connexion CNAS</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <CircleCheck size={13} color={c.green} />
                <Text style={{ fontSize: 12, color: c.green }}>Connecté · Conventionné</Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 11, color: c.txt3, marginTop: 8 }}>Dernière sync : Aujourd'hui 08:32</Text>
        </Card>

        {/* ── Apparence ─────────────────────────────────────────────────────────── */}
        <SectionTitle>Apparence</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: c.amberBg, alignItems: 'center', justifyContent: 'center',
            }}>
              {dk ? <Sun size={18} color={c.amber} /> : <Moon size={18} color={c.amber} />}
            </View>
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: c.txt }}>
              {dk ? 'Mode sombre' : 'Mode clair'}
            </Text>
            <Switch
              value={dk}
              onValueChange={toggleTheme}
              trackColor={{ false: c.border, true: c.blue + '80' }}
              thumbColor={dk ? c.blue : '#f4f3f4'}
            />
          </View>
        </Card>

        {/* ── Profil ────────────────────────────────────────────────────────────── */}
        <SectionTitle>Profil</SectionTitle>
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            {[['PRÉNOM', 'prenom'], ['NOM', 'nom']].map(([label, key]) => (
              <View key={key} style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: c.txt3, letterSpacing: 0.8, marginBottom: 5 }}>{label}</Text>
                <TextInput
                  value={form[key]}
                  onChangeText={v => setForm(f => ({ ...f, [key]: v }))}
                  placeholderTextColor={c.txt3}
                  autoCapitalize="words"
                  style={{
                    backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2,
                    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
                    color: c.txt, fontSize: 14,
                  }}
                />
              </View>
            ))}
          </View>

          <FieldInput
            label="EMAIL"
            value={form.email}
            onChange={v => setForm(f => ({ ...f, email: v }))}
            placeholder="votre@email.com"
          />
          <FieldInput
            label="TÉLÉPHONE"
            value={form.tel}
            onChange={v => setForm(f => ({ ...f, tel: v }))}
            placeholder="0555 00 00 00"
          />

          <TouchableOpacity
            onPress={handleSave}
            disabled={savingProf}
            style={{
              backgroundColor: c.blue, borderRadius: 12, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginTop: 4, opacity: savingProf ? 0.7 : 1,
            }}
          >
            {savingProf
              ? <ActivityIndicator size="small" color="#fff" />
              : savedProf
                ? <Check size={16} color="#fff" />
                : <Save size={16} color="#fff" />
            }
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>
              {savingProf ? 'Sauvegarde...' : savedProf ? 'Sauvegardé !' : 'Sauvegarder'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Sécurité ──────────────────────────────────────────────────────────── */}
        <SectionTitle>Sécurité</SectionTitle>
        <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16 }}>
          <FieldInput
            label="MOT DE PASSE ACTUEL"
            value={pwForm.current}
            onChange={v => setPwForm(f => ({ ...f, current: v }))}
            secureTextEntry
            placeholder="••••••••"
          />
          <FieldInput
            label="NOUVEAU MOT DE PASSE"
            value={pwForm.next}
            onChange={v => setPwForm(f => ({ ...f, next: v }))}
            secureTextEntry
            placeholder="Minimum 6 caractères"
          />
          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={savingPwd}
            style={{
              backgroundColor: c.card2, borderWidth: 1, borderColor: c.border2,
              borderRadius: 12, paddingVertical: 12,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginTop: 4, opacity: savingPwd ? 0.7 : 1,
            }}
          >
            {savingPwd
              ? <ActivityIndicator size="small" color={c.txt2} />
              : <Lock size={15} color={c.txt2} />
            }
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt2 }}>
              {savingPwd ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Langue ────────────────────────────────────────────────────────────── */}
        <SectionTitle>Langue</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Globe size={15} color={c.txt3} />
            <Text style={{ fontSize: 12, color: c.txt3 }}>Langue d'affichage</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['Français', 'English', 'العربية'].map(l => (
              <TouchableOpacity
                key={l}
                onPress={() => setLang(l)}
                style={{
                  flex: 1, paddingVertical: 9, alignItems: 'center',
                  backgroundColor: lang === l ? c.blue : c.card2,
                  borderWidth: 1, borderColor: lang === l ? c.blue : c.border,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: lang === l ? '#fff' : c.txt2 }}>
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* ── À propos ──────────────────────────────────────────────────────────── */}
        <SectionTitle>À propos</SectionTitle>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Info size={15} color={c.txt3} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: c.txt }}>Healy Vue pharmacie v2.1.0</Text>
          </View>
          <Text style={{ fontSize: 12, color: c.txt2, lineHeight: 19, marginBottom: 10 }}>
            Plateforme de gestion d'officine connectée CNAS pour pharmaciens en Algérie.
          </Text>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {['CNAS Conventionné', 'RGPD', 'v 2.1.0'].map(tag => (
              <View key={tag} style={{
                backgroundColor: c.card2, borderWidth: 1, borderColor: c.border,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
              }}>
                <Text style={{ color: c.txt3, fontSize: 10, fontWeight: '700' }}>{tag}</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Déconnexion ───────────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            marginTop: 8, backgroundColor: c.redBg,
            borderWidth: 1, borderColor: c.red + '40',
            borderRadius: 16, paddingVertical: 15,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
        >
          <LogOut size={18} color={c.red} />
          <Text style={{ fontSize: 15, fontWeight: '700', color: c.red }}>Se déconnecter</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
