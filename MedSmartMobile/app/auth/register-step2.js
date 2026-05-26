
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, ArrowRight, Stethoscope, Building, MapPin, Phone, Pill, User } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { T, FONTS, GRADIENTS } from '../../src/theme';
import * as api from '../../src/services/api';
const SPECIALTIES = [
  'Médecin généraliste', 'Cardiologue', 'Pédiatre', 'Neurologue',
  'Orthopédiste', 'Dermatologue', 'Ophtalmologue', 'Gynécologue',
  'Psychiatre', 'ORL', 'Urologue', 'Rhumatologue',
];
export default function RegisterStep2Screen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;
  const params = useLocalSearchParams();
  const { firstName, lastName, email, password, accountType } = params;
  const isMedical = accountType === 'personnel médical';
  const [role, setRole]           = useState('doctor');
  const [specialty, setSpecialty] = useState('');
  const [rpps, setRpps]           = useState('');
  const [phone, setPhone]         = useState('');
  const [city, setCity]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function handleRegister() {
    setError('');
    setLoading(true);
    try {
      const base = { email, password, first_name: firstName, last_name: lastName };
      if (!isMedical) {
        // ── Patient — compte activé immédiatement
        await api.registerPatient({ ...base, phone_number: phone });
        Alert.alert(
          '🎉 Compte créé !',
          'Votre compte patient a été créé avec succès. Connectez-vous pour accéder à Healy.',
          [{ text: 'Se connecter', onPress: () => router.replace('/auth/login') }],
          { cancelable: false },
        );
      } else {
        // ── Personnel médical — en attente de validation
        if (role === 'pharmacist') {
          await api.registerPharmacist({ ...base, phone_number: phone, city });
        } else if (role === 'caretaker') {
          await api.registerCaretaker({ ...base, phone_number: phone });
        } else {
          await api.registerDoctor({ ...base, specialite: specialty, rpps_number: rpps, phone_number: phone });
        }
        Alert.alert(
          '📋 Dossier soumis !',
          'Votre inscription a été transmise à notre équipe.\n\nVous recevrez une confirmation par email sous 24–48h.',
          [{ text: 'Se connecter', onPress: () => router.replace('/auth/login') }],
          { cancelable: false },
        );
      }
    } catch (err) {
      setError(err.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>
          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.logoBox}>
              <Text style={{ color: '#fff', fontSize: 22, fontFamily: FONTS.bold }}>✚</Text>
            </LinearGradient>
            <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt }}>Healy</Text>
          </View>
          {/* Progression */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 20 }}>
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.blue }} />
            <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.blue }} />
          </View>
          <Text style={[styles.title, { color: c.txt }]}>
            {isMedical ? 'Informations professionnelles' : 'Finalisez votre profil'}
          </Text>
          <Text style={[styles.subtitle, { color: c.txt2 }]}>
            Bonjour {firstName} ! Complétez votre profil pour accéder à Healy.
          </Text>
          {error ? (
            <View style={[styles.alertBox, { backgroundColor: '#E05555' + '15', borderColor: '#E05555' + '30', marginTop: 12 }]}>
              <Text style={{ color: '#E05555', fontFamily: FONTS.medium, fontSize: 13 }}>{error}</Text>
            </View>
          ) : null}
          <View style={{ gap: 16, marginTop: 20 }}>
            {/* Rôle médical */}
            {isMedical && (
              <View>
                <Text style={[styles.label, { color: c.txt2 }]}>Votre rôle</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { key: 'doctor', label: 'Médecin', Icon: Stethoscope },
                    { key: 'pharmacist', label: 'Pharmacien', Icon: Pill },
                    { key: 'caretaker', label: 'Garde-malade', Icon: User },
                  ].map(r => {
                    const active = role === r.key;
                    return (
                      <TouchableOpacity key={r.key} onPress={() => setRole(r.key)} activeOpacity={0.8}
                        style={[styles.roleBtn, { flex: 1, backgroundColor: active ? c.blue : c.card, borderColor: active ? c.blue : c.border }]}>
                        <View style={{ marginBottom: 4 }}>
                          <r.Icon size={20} color={active ? '#fff' : c.txt2} />
                        </View>
                        <Text style={{ fontSize: 11, fontFamily: FONTS.semibold, color: active ? '#fff' : c.txt2, textAlign: 'center' }}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
            {/* Spécialité (médecin uniquement) */}
            {isMedical && role === 'doctor' && (
              <View>
                <Text style={[styles.label, { color: c.txt2 }]}>Spécialité</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                  {SPECIALTIES.map(s => (
                    <TouchableOpacity key={s} onPress={() => setSpecialty(s)} activeOpacity={0.8}
                      style={[styles.specChip, {
                        backgroundColor: specialty === s ? c.blue : c.card,
                        borderColor: specialty === s ? c.blue : c.border,
                      }]}>
                      <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: specialty === s ? '#fff' : c.txt2 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {!specialty && <Text style={[styles.errorText, { marginTop: 4 }]}>Sélectionnez une spécialité</Text>}
              </View>
            )}
            {/* Numéro RPPS (médecin) */}
            {isMedical && role === 'doctor' && (
              <View>
                <Text style={[styles.label, { color: c.txt2 }]}>Numéro RPPS</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <Stethoscope size={15} color={c.icon} style={{ marginRight: 8 }} />
                  <TextInput value={rpps} onChangeText={setRpps} placeholder="Ex: 10003456789"
                    placeholderTextColor={c.placeholder} keyboardType="numeric"
                    style={[styles.input, { color: c.txt }]} />
                </View>
              </View>
            )}
            {/* Ville (pharmacien) */}
            {isMedical && role === 'pharmacist' && (
              <View>
                <Text style={[styles.label, { color: c.txt2 }]}>Ville</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <MapPin size={15} color={c.icon} style={{ marginRight: 8 }} />
                  <TextInput value={city} onChangeText={setCity} placeholder="Ex: Alger"
                    placeholderTextColor={c.placeholder}
                    style={[styles.input, { color: c.txt }]} autoCapitalize="words" />
                </View>
              </View>
            )}
            {/* Téléphone */}
            <View>
              <Text style={[styles.label, { color: c.txt2 }]}>Téléphone</Text>
              <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                <Phone size={15} color={c.icon} style={{ marginRight: 8 }} />
                <TextInput value={phone} onChangeText={setPhone} placeholder="+213 5XX XX XX XX"
                  placeholderTextColor={c.placeholder} keyboardType="phone-pad"
                  style={[styles.input, { color: c.txt }]} />
              </View>
            </View>
            {/* Note pour personnel médical */}
            {isMedical && (
              <View style={[{ backgroundColor: '#FFF8EC', borderColor: '#E8A83840', borderWidth: 1, borderRadius: 14, padding: 14 }]}>
                <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: '#E8A838', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Validation requise
                </Text>
                <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: '#5A6E8A', lineHeight: 20 }}>
                  Votre compte sera vérifié sous 24–48h par notre équipe. Vous recevrez une notification par email.
                </Text>
              </View>
            )}
            {/* Submit */}
            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.88} style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Text style={styles.submitText}>Créer mon compte</Text>
                      <ArrowRight size={18} color="#fff" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  backBtn: { padding: 8, borderRadius: 10 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  logoBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontFamily: FONTS.extrabold, marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 21 },
  alertBox: { borderWidth: 1, borderRadius: 12, padding: 14 },
  label: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 12, height: 50,
  },
  input: { flex: 1, fontSize: 14, fontFamily: FONTS.regular },
  errorText: { fontSize: 11, color: '#E05555', fontFamily: FONTS.regular },
  roleBtn: { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  specChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5 },
  submitBtn: {
    paddingVertical: 16, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { fontSize: 16, fontFamily: FONTS.bold, color: '#fff' },
});
