import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { T, FONTS, GRADIENTS } from '../../src/theme';
import * as api from '../../src/services/api';

// Navigation sécurisée : si pas d'écran précédent → landing page
function safeBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export default function ForgotPasswordScreen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [step, setStep]         = useState('email');   // 'email' | 'otp' | 'reset'
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [token, setToken]       = useState('');
  const [newPwd, setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  async function handleSendEmail() {
    if (!email.trim()) { setError('Email requis'); return; }
    setError(''); setLoading(true);
    try {
      await api.requestPasswordReset(email.trim());
      setSuccess('Code envoyé à ' + email);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Erreur envoi');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otp.trim() || otp.length < 4) { setError('Code invalide'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.verifyResetCode(email.trim(), otp.trim());
      setToken(res?.token || otp);
      setStep('reset');
    } catch (err) {
      setError(err.message || 'Code incorrect');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!newPwd || newPwd.length < 8) { setError('Minimum 8 caractères'); return; }
    if (newPwd !== confirmPwd) { setError('Les mots de passe ne correspondent pas'); return; }
    setError(''); setLoading(true);
    try {
      await api.confirmPasswordReset(token, newPwd, confirmPwd);
      setSuccess('Mot de passe modifié avec succès !');
      setTimeout(() => router.replace('/auth/login'), 1500);
    } catch (err) {
      setError(err.message || 'Erreur de réinitialisation');
    } finally {
      setLoading(false);
    }
  }

  const steps = { email: 1, otp: 2, reset: 3 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => step === 'email' ? safeBack() : setStep(step === 'reset' ? 'otp' : 'email')} style={styles.backBtn}>
              <ArrowLeft size={20} color={c.txt2} />
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.logoBox}>
              <ShieldCheck size={20} color="#fff" />
            </LinearGradient>
            <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt }}>Healy</Text>
          </View>

          {/* Progression */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
            {[1, 2, 3].map(n => (
              <View key={n} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: n <= steps[step] ? c.blue : c.border }} />
            ))}
          </View>

          {step === 'email' && (
            <>
              <Text style={[styles.title, { color: c.txt }]}>Mot de passe oublié</Text>
              <Text style={[styles.subtitle, { color: c.txt2 }]}>Entrez votre email pour recevoir un code de réinitialisation.</Text>
              {error ? <ErrorBox message={error} /> : null}
              <View style={{ marginTop: 24, gap: 16 }}>
                <View>
                  <Text style={[styles.label, { color: c.txt2 }]}>Email</Text>
                  <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                    <Mail size={16} color={c.icon} style={{ marginRight: 10 }} />
                    <TextInput value={email} onChangeText={setEmail} placeholder="votre@email.com"
                      placeholderTextColor={c.placeholder} keyboardType="email-address" autoCapitalize="none"
                      style={[styles.input, { color: c.txt }]} />
                  </View>
                </View>
                <SubmitBtn label="Envoyer le code" onPress={handleSendEmail} loading={loading} />
              </View>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={[styles.title, { color: c.txt }]}>Code de vérification</Text>
              <Text style={[styles.subtitle, { color: c.txt2 }]}>
                Code envoyé à <Text style={{ fontFamily: FONTS.bold }}>{email}</Text>
              </Text>
              {success ? <SuccessBox message={success} /> : null}
              {error ? <ErrorBox message={error} /> : null}
              <View style={{ marginTop: 24, gap: 16 }}>
                <View>
                  <Text style={[styles.label, { color: c.txt2 }]}>Code reçu</Text>
                  <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                    <TextInput value={otp} onChangeText={setOtp} placeholder="Ex: 123456"
                      placeholderTextColor={c.placeholder} keyboardType="number-pad" maxLength={6}
                      style={[styles.input, { color: c.txt, fontSize: 22, letterSpacing: 8, textAlign: 'center' }]} />
                  </View>
                </View>
                <SubmitBtn label="Vérifier le code" onPress={handleVerifyOTP} loading={loading} />
              </View>
            </>
          )}

          {step === 'reset' && (
            <>
              <Text style={[styles.title, { color: c.txt }]}>Nouveau mot de passe</Text>
              <Text style={[styles.subtitle, { color: c.txt2 }]}>Choisissez un nouveau mot de passe sécurisé.</Text>
              {success ? <SuccessBox message={success} /> : null}
              {error ? <ErrorBox message={error} /> : null}
              <View style={{ marginTop: 24, gap: 16 }}>
                <View>
                  <Text style={[styles.label, { color: c.txt2 }]}>Nouveau mot de passe</Text>
                  <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                    <Lock size={16} color={c.icon} style={{ marginRight: 10 }} />
                    <TextInput value={newPwd} onChangeText={setNewPwd} placeholder="Minimum 8 caractères"
                      placeholderTextColor={c.placeholder} secureTextEntry={!showPwd}
                      style={[styles.input, { color: c.txt }]} />
                    <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      {showPwd ? <Eye size={16} color={c.icon} /> : <EyeOff size={16} color={c.icon} />}
                    </TouchableOpacity>
                  </View>
                </View>
                <View>
                  <Text style={[styles.label, { color: c.txt2 }]}>Confirmer le mot de passe</Text>
                  <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                    <Lock size={16} color={c.icon} style={{ marginRight: 10 }} />
                    <TextInput value={confirmPwd} onChangeText={setConfirmPwd} placeholder="••••••••"
                      placeholderTextColor={c.placeholder} secureTextEntry={!showPwd}
                      style={[styles.input, { color: c.txt }]} />
                  </View>
                </View>
                <SubmitBtn label="Réinitialiser le mot de passe" onPress={handleReset} loading={loading} />
              </View>
            </>
          )}

          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontFamily: FONTS.semibold, color: c.blue }}>← Retour à la connexion</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ErrorBox({ message }) {
  return (
    <View style={{ backgroundColor: '#E05555' + '15', borderColor: '#E05555' + '30', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 }}>
      <Text style={{ color: '#E05555', fontFamily: FONTS.medium, fontSize: 13 }}>{message}</Text>
    </View>
  );
}

function SuccessBox({ message }) {
  return (
    <View style={{ backgroundColor: '#2D8C6F' + '15', borderColor: '#2D8C6F' + '30', borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 12 }}>
      <Text style={{ color: '#2D8C6F', fontFamily: FONTS.medium, fontSize: 13 }}>{message}</Text>
    </View>
  );
}

function SubmitBtn({ label, onPress, loading: ld }) {
  return (
    <TouchableOpacity onPress={onPress} disabled={ld} activeOpacity={0.88} style={{ borderRadius: 14, overflow: 'hidden' }}>
      <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
        {ld ? <ActivityIndicator color="#fff" /> : <>
          <Text style={styles.submitText}>{label}</Text>
          <ArrowRight size={18} color="#fff" />
        </>}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 12, paddingBottom: 16 },
  backBtn: { padding: 8, borderRadius: 10, alignSelf: 'flex-start' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontFamily: FONTS.extrabold, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 21 },
  label: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  submitBtn: {
    paddingVertical: 16, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { fontSize: 16, fontFamily: FONTS.bold, color: '#fff' },
});
