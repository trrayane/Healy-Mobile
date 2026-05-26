import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import { ChevronLeft, Mail, Lock, KeyRound, CircleCheck } from 'lucide-react-native';
import * as api from '../../services/api';
import { router } from 'expo-router';

const STEPS = ['email', 'code', 'reset', 'done'];

export default function ForgotPasswordScreen({ navigation }) {
  const { t } = useLanguage();
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [email, setEmail]         = useState('');
  const [code, setCode]           = useState('');
  const [token, setToken]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');

  async function handleSendEmail() {
    if (!email.trim()) return Alert.alert(t('common.error'), t('common.required'));
    setLoading(true);
    try {
      await api.requestPasswordReset(email.trim().toLowerCase());
      setStep(1);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) return Alert.alert(t('common.error'), t('common.required'));
    setLoading(true);
    try {
      const res = await api.verifyResetCode(email.trim().toLowerCase(), code.trim());
      setToken(res?.token || code);
      setStep(2);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!password || password !== confirm) {
      return Alert.alert(t('common.error'), t('auth.register.passwordMismatch'));
    }
    setLoading(true);
    try {
      await api.confirmPasswordReset(token, password, confirm);
      setStep(3);
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setLoading(false);
    }
  }

  const stepConfig = [
    { title: 'Mot de passe oublié ?', subtitle: 'Entrez votre adresse email pour recevoir un code de réinitialisation.' },
    { title: 'Vérification', subtitle: 'Entrez le code à 6 chiffres envoyé à ' + email },
    { title: 'Nouveau mot de passe', subtitle: 'Choisissez un mot de passe sécurisé pour votre compte.' },
    { title: 'Mot de passe changé !', subtitle: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={GRADIENTS.primary} style={styles.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <TouchableOpacity 
            onPress={() => step === 0 ? (router.canGoBack() ? router.back() : router.replace('/(auth)/login')) : setStep(s => s - 1)} 
            style={styles.backBtn}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <KeyRound size={28} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>{stepConfig[step].title}</Text>
          <Text style={styles.heroSub}>{stepConfig[step].subtitle}</Text>
        </LinearGradient>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, SHADOWS.lg]}>

          {/* Step 0 — Email */}
          {step === 0 && (
            <>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: c.txt2 }]}>Adresse Email</Text>
                <View style={[styles.inputRow, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Mail size={16} color={c.txt3} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: c.txt, flex: 1 }]}
                    placeholder="votre@email.com" placeholderTextColor={c.txt3}
                    value={email} onChangeText={setEmail}
                    keyboardType="email-address" autoCapitalize="none"
                  />
                </View>
              </View>
              <TouchableOpacity onPress={handleSendEmail} disabled={loading} activeOpacity={0.88} style={styles.btnWrap}>
                <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Envoyer le code</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Step 1 — Code */}
          {step === 1 && (
            <>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: c.txt2 }]}>Code de vérification</Text>
                <TextInput
                  style={[styles.codeInput, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
                  placeholder="000000" placeholderTextColor={c.txt3}
                  value={code} onChangeText={setCode}
                  keyboardType="numeric" maxLength={6}
                />
              </View>
              <TouchableOpacity onPress={handleVerifyCode} disabled={loading} activeOpacity={0.88} style={styles.btnWrap}>
                <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Vérifier</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendEmail} style={{ alignItems: 'center', marginTop: 12 }}>
                <Text style={[styles.resend, { color: c.blue }]}>Renvoyer le code</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — New password */}
          {step === 2 && (
            <>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: c.txt2 }]}>Nouveau mot de passe</Text>
                <View style={[styles.inputRow, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Lock size={16} color={c.txt3} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: c.txt, flex: 1 }]}
                    placeholder="••••••••" placeholderTextColor={c.txt3}
                    value={password} onChangeText={setPassword} secureTextEntry
                  />
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Text style={[styles.label, { color: c.txt2 }]}>Confirmer le mot de passe</Text>
                <View style={[styles.inputRow, { backgroundColor: c.bg, borderColor: c.border }]}>
                  <Lock size={16} color={c.txt3} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: c.txt, flex: 1 }]}
                    placeholder="••••••••" placeholderTextColor={c.txt3}
                    value={confirm} onChangeText={setConfirm} secureTextEntry
                  />
                </View>
              </View>
              <TouchableOpacity onPress={handleResetPassword} disabled={loading} activeOpacity={0.88} style={styles.btnWrap}>
                <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Réinitialiser</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <>
              <View style={[styles.successIcon, { backgroundColor: c.green + '20' }]}>
                <CircleCheck size={40} color={c.green} />
              </View>
              <Text style={[styles.successText, { color: c.txt2 }]}>
                Votre mot de passe a été mis à jour avec succès.
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.88} style={styles.btnWrap}>
                <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                  <Text style={styles.btnText}>Se connecter</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' },
  backBtn: { position: 'absolute', top: 56, left: 20, padding: 8 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { color: '#fff', fontSize: 22, fontFamily: FONTS.extrabold, textAlign: 'center', marginBottom: 8 },
  heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontFamily: FONTS.regular, textAlign: 'center' },
  card: { marginHorizontal: 20, marginTop: -20, borderRadius: 24, padding: 24, borderWidth: 1 },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: FONTS.semibold, marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10 },
  input: { fontSize: 15, fontFamily: FONTS.regular },
  codeInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 16, fontSize: 28, fontFamily: FONTS.bold, textAlign: 'center', letterSpacing: 12 },
  btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  btn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FONTS.bold },
  resend: { fontSize: 14, fontFamily: FONTS.semibold },
  successIcon: { alignItems: 'center', justifyContent: 'center', width: 100, height: 100, borderRadius: 50, alignSelf: 'center', marginBottom: 16 },
  successText: { textAlign: 'center', fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22, marginBottom: 24 },
});
