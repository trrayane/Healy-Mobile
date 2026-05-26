import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, EyeOff, Lock, User, Shield, Building2, LogOut, Check, MessageSquare } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS } from '../../theme';
import * as api from '../../services/api';

export default function DoctorSettings({ onBack }) {
  const { userData, logout, updateUserData } = useAuth();
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  // Profile form
  const [firstName,  setFirstName]  = useState(userData?.first_name  || '');
  const [lastName,   setLastName]   = useState(userData?.last_name   || '');
  const [email,      setEmail]      = useState(userData?.email       || '');
  const [phone,      setPhone]      = useState(userData?.phone       || userData?.phone_number || '');
  const [savingProf, setSavingProf] = useState(false);

  // Security form
  const [curPwd,   setCurPwd]   = useState('');
  const [newPwd,   setNewPwd]   = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  // Messaging toggle
  const [messagingEnabled, setMessagingEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('@doctor_messaging_enabled').then(val => {
      if (val !== null) setMessagingEnabled(val === 'true');
    });
  }, []);

  function toggleMessaging(val) {
    setMessagingEnabled(val);
    AsyncStorage.setItem('@doctor_messaging_enabled', val.toString());
  }

  // Cabinet (read-only display)
  const specialty  = userData?.specialty   || 'Médecin généraliste';
  const city       = userData?.city        || userData?.wilaya || 'Alger';
  const certified  = userData?.verification_status === 'verified' || userData?.is_verified;

  async function saveProfile() {
    setSavingProf(true);
    try {
      const updated = await api.updateMe({ first_name: firstName, last_name: lastName, phone_number: phone });
      if (updateUserData) updateUserData(updated);
      Alert.alert('Succès', 'Profil mis à jour.');
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue.');
    } finally { setSavingProf(false); }
  }

  async function savePassword() {
    if (!curPwd || !newPwd) return Alert.alert('Erreur', 'Veuillez remplir les deux champs.');
    if (newPwd.length < 8)  return Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
    setSavingPwd(true);
    try {
      await api.changePassword({ old_password: curPwd, new_password: newPwd });
      setCurPwd(''); setNewPwd('');
      Alert.alert('Succès', 'Mot de passe mis à jour.');
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Mot de passe actuel incorrect.');
    } finally { setSavingPwd(false); }
  }

  const initials = ((userData?.first_name?.[0] || '') + (userData?.last_name?.[0] || '')).toUpperCase() || 'AK';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={onBack} style={S.backBtn}>
          <ChevronLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[S.headerTitle, { color: c.txt }]}>Paramètres</Text>
          <Text style={[S.headerSub,   { color: c.txt2 }]}>Gérez votre compte</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        {/* ── Doctor Card ── */}
        <View style={[S.doctorCard, { backgroundColor: c.blue + '12', borderColor: c.blue + '30' }]}>
          <View style={[S.avatarBig, { backgroundColor: c.blue + '30' }]}>
            <Text style={[S.avatarTxt, { color: c.blue }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 17 }}>
              Dr. {userData?.first_name} {userData?.last_name}
            </Text>
            <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.regular }}>
              {specialty} · {city}
            </Text>
            {certified && (
              <View style={[S.certBadge, { backgroundColor: c.green + '20' }]}>
                <Check size={11} color={c.green} />
                <Text style={{ color: c.green, fontSize: 11, fontFamily: FONTS.semibold }}>Certifiée</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── PROFIL ── */}
        <View>
          <Text style={[S.sectionLabel, { color: c.txt3 }]}>PROFIL</Text>
          <View style={[S.block, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={S.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={[S.fieldLabel, { color: c.txt3 }]}>PRÉNOM</Text>
                <TextInput
                  style={[S.input, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                  value={firstName} onChangeText={setFirstName}
                  placeholder="Amina" placeholderTextColor={c.txt3}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.fieldLabel, { color: c.txt3 }]}>NOM</Text>
                <TextInput
                  style={[S.input, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                  value={lastName} onChangeText={setLastName}
                  placeholder="Khelifi" placeholderTextColor={c.txt3}
                />
              </View>
            </View>
            <Text style={[S.fieldLabel, { color: c.txt3 }]}>EMAIL</Text>
            <TextInput
              style={[S.input, { backgroundColor: c.bg, borderColor: c.border, color: c.txt2, marginBottom: 12 }]}
              value={email} editable={false}
              placeholder="email@demo.com" placeholderTextColor={c.txt3}
              keyboardType="email-address"
            />
            <Text style={[S.fieldLabel, { color: c.txt3 }]}>TÉLÉPHONE</Text>
            <TextInput
              style={[S.input, { backgroundColor: c.bg, borderColor: c.border, color: c.txt, marginBottom: 16 }]}
              value={phone} onChangeText={setPhone}
              placeholder="0661 34 56 78" placeholderTextColor={c.txt3}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              onPress={saveProfile} disabled={savingProf}
              style={[S.primaryBtn, { backgroundColor: c.blue }]}
            >
              {savingProf
                ? <ActivityIndicator color="#fff" />
                : <Text style={S.primaryBtnTxt}>Enregistrer les modifications</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SÉCURITÉ ── */}
        <View>
          <Text style={[S.sectionLabel, { color: c.txt3 }]}>SÉCURITÉ</Text>
          <View style={[S.block, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[S.fieldLabel, { color: c.txt3 }]}>MOT DE PASSE ACTUEL</Text>
            <View style={[S.pwdRow, { backgroundColor: c.bg, borderColor: c.border, marginBottom: 12 }]}>
              <TextInput
                style={[S.pwdInput, { color: c.txt }]}
                value={curPwd} onChangeText={setCurPwd}
                secureTextEntry={!showCur}
                placeholder="••••••••" placeholderTextColor={c.txt3}
              />
              <TouchableOpacity onPress={() => setShowCur(p => !p)}>
                {showCur ? <Eye size={18} color={c.txt3} /> : <EyeOff size={18} color={c.txt3} />}
              </TouchableOpacity>
            </View>
            <Text style={[S.fieldLabel, { color: c.txt3 }]}>NOUVEAU MOT DE PASSE</Text>
            <View style={[S.pwdRow, { backgroundColor: c.bg, borderColor: c.border, marginBottom: 16 }]}>
              <TextInput
                style={[S.pwdInput, { color: c.txt }]}
                value={newPwd} onChangeText={setNewPwd}
                secureTextEntry={!showNew}
                placeholder="••••••••" placeholderTextColor={c.txt3}
              />
              <TouchableOpacity onPress={() => setShowNew(p => !p)}>
                {showNew ? <Eye size={18} color={c.txt3} /> : <EyeOff size={18} color={c.txt3} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={savePassword} disabled={savingPwd}
              style={[S.outlineBtn, { borderColor: c.border, backgroundColor: c.bg }]}
            >
              {savingPwd
                ? <ActivityIndicator color={c.txt2} />
                : <>
                    <Lock size={14} color={c.txt2} />
                    <Text style={[S.outlineBtnTxt, { color: c.txt2 }]}>Mettre à jour le mot de passe</Text>
                  </>
              }
            </TouchableOpacity>
          </View>
        </View>

        {/* ── CABINET ── */}
        <View>
          <Text style={[S.sectionLabel, { color: c.txt3 }]}>CABINET</Text>
          <View style={[S.block, { backgroundColor: c.card, borderColor: c.border }]}>
            <InfoRow label="Spécialité" value={specialty} c={c} />
            <InfoRow label="Ville"      value={city}      c={c} />
            <InfoRow label="Statut"
              value={certified ? 'Vérifié ✓' : 'En attente de vérification'}
              valueColor={certified ? c.green : c.amber}
              c={c} last
            />
          </View>
        </View>

        {/* ── MESSAGERIE ── */}
        <View>
          <Text style={[S.sectionLabel, { color: c.txt3 }]}>MESSAGERIE</Text>
          <View style={[S.block, { backgroundColor: c.card, borderColor: c.border, gap: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.blue + '18', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={18} color={c.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt }}>Messagerie patients</Text>
                <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3, marginTop: 2 }}>
                  {messagingEnabled
                    ? 'Les patients peuvent vous envoyer des messages'
                    : 'La messagerie est désactivée'}
                </Text>
              </View>
              <Switch
                value={messagingEnabled}
                onValueChange={toggleMessaging}
                trackColor={{ false: c.border2, true: c.blue + '80' }}
                thumbColor={messagingEnabled ? c.blue : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* ── DÉCONNEXION ── */}
        <TouchableOpacity
          onPress={() => Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Déconnecter', style: 'destructive', onPress: logout },
          ])}
          style={[S.logoutBtn, { backgroundColor: c.red + '12', borderColor: c.red + '30' }]}
        >
          <LogOut size={16} color={c.red} />
          <Text style={{ color: c.red, fontFamily: FONTS.semibold, fontSize: 15 }}>Se déconnecter</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, valueColor, c, last }) {
  return (
    <View style={[S.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
      <Text style={{ color: c.txt2, fontSize: 13, fontFamily: FONTS.regular }}>{label}</Text>
      <Text style={{ color: valueColor || c.txt, fontSize: 13, fontFamily: FONTS.semibold }}>{value}</Text>
    </View>
  );
}

const S = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle:   { fontSize: 20, fontFamily: FONTS.bold },
  headerSub:     { fontSize: 12, fontFamily: FONTS.regular, marginTop: 1 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  doctorCard:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, borderWidth: 1 },
  avatarBig:     { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:     { fontSize: 20, fontFamily: FONTS.extrabold },
  certBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginTop: 6, alignSelf: 'flex-start' },
  sectionLabel:  { fontSize: 11, fontFamily: FONTS.bold, letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  block:         { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  fieldRow:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  fieldLabel:    { fontSize: 10, fontFamily: FONTS.bold, letterSpacing: 0.5, marginBottom: 6 },
  input:         { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.regular },
  pwdRow:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pwdInput:      { flex: 1, fontSize: 14, fontFamily: FONTS.regular },
  primaryBtn:    { paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnTxt: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
  outlineBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, borderWidth: 1 },
  outlineBtnTxt: { fontFamily: FONTS.semibold, fontSize: 14 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, borderRadius: 16, borderWidth: 1 },
});