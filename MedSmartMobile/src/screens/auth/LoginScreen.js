import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react-native';
import { router } from 'expo-router';

export default function LoginScreen({ navigation }) {
  const { login, loginWithData } = useAuth();
  const { t } = useLanguage();
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [errors, setErrors]       = useState({});

  function validate() {
    const e = {};
    if (!email.trim()) e.email = t('common.required');
    if (!password)     e.password = t('common.required');
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('auth.login.incorrectCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero gradient header */}
        <LinearGradient
          colors={GRADIENTS.primary}
          style={styles.hero}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoWrap}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoPlus}>✚</Text>
            </View>
            <Text style={styles.logoText}>Healy</Text>
          </View>
          <Text style={styles.heroTitle}>{t('auth.login.title')}</Text>
          <Text style={styles.heroSub}>{t('auth.login.subtitle')}</Text>
        </LinearGradient>

        {/* Form card */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, SHADOWS.lg]}>

          {/* Email */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: c.txt2 }]}>{t('auth.login.email')}</Text>
            <View style={[
              styles.inputRow,
              { backgroundColor: c.bg, borderColor: errors.email ? c.red : c.border },
            ]}>
              <Mail size={16} color={c.txt3} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { color: c.txt }]}
                placeholder={t('auth.login.emailPlaceholder')}
                placeholderTextColor={c.txt3}
                value={email}
                onChangeText={v => { setEmail(v); setErrors(p => ({ ...p, email: null })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && <Text style={[styles.error, { color: c.red }]}>{errors.email}</Text>}
          </View>

          {/* Password */}
          <View style={styles.fieldWrap}>
            <Text style={[styles.label, { color: c.txt2 }]}>{t('auth.login.password')}</Text>
            <View style={[
              styles.inputRow,
              { backgroundColor: c.bg, borderColor: errors.password ? c.red : c.border },
            ]}>
              <Lock size={16} color={c.txt3} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.input, { color: c.txt, flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={c.txt3}
                value={password}
                onChangeText={v => { setPassword(v); setErrors(p => ({ ...p, password: null })); }}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                {showPass
                  ? <EyeOff size={16} color={c.txt3} />
                  : <Eye size={16} color={c.txt3} />
                }
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={[styles.error, { color: c.red }]}>{errors.password}</Text>}
          </View>

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 20 }}
          >
            <Text style={[styles.forgot, { color: c.blue }]}>{t('auth.login.forgotPassword')}</Text>
          </TouchableOpacity>

          {/* Sign in button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.88}
            style={[styles.btnWrap, loading && { opacity: 0.7 }]}
          >
            <LinearGradient
              colors={GRADIENTS.primary}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.btn}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>{t('auth.login.signIn')}</Text>
              }
            </LinearGradient>
          </TouchableOpacity>

          {/* Dev Bypass Button — visible uniquement en développement */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={() => loginWithData('patient', { id: 999, role: 'patient', email: 'dev@test.com', verification_status: 'verified', first_name: 'Patient', last_name: 'Test' })}
              activeOpacity={0.88}
              style={[styles.btnWrap, { marginBottom: 20 }]}
            >
              <View style={[styles.btn, { backgroundColor: c.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} color={c.txt} />
                  <Text style={[styles.btnText, { color: c.txt }]}>Skip Auth (Patient)</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: c.txt3 }]}>{t('auth.login.orWith')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: c.txt2 }]}>{t('auth.login.noAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={[styles.registerLink, { color: c.blue }]}>{t('auth.login.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: c.txt3 }]}>
          Healy v2.1.0 · Plateforme de santé connectée{'\n'}
          Certifié CNAS · Conforme RGPD · Hébergé en Algérie
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingBottom: 40 },
  hero: {
    paddingTop: 64,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  logoIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  logoPlus: { color: '#fff', fontSize: 22, fontFamily: FONTS.bold },
  logoText: { color: '#fff', fontSize: 22, fontFamily: FONTS.extrabold },
  heroTitle: {
    color: '#fff', fontSize: 26, fontFamily: FONTS.extrabold,
    textAlign: 'center', marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.75)', fontSize: 15,
    fontFamily: FONTS.regular, textAlign: 'center',
  },
  card: {
    marginHorizontal: 20,
    marginTop: -24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: FONTS.semibold, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 13 : 10,
  },
  input: { fontSize: 15, fontFamily: FONTS.regular, flex: 1 },
  error: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 4 },
  forgot: { fontSize: 13, fontFamily: FONTS.semibold },
  btnWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  btn: {
    paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FONTS.bold },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 12, fontFamily: FONTS.regular },
  registerRow: { flexDirection: 'row', justifyContent: 'center' },
  registerText: { fontSize: 14, fontFamily: FONTS.regular },
  registerLink: { fontSize: 14, fontFamily: FONTS.bold },
  footer: {
    textAlign: 'center', fontSize: 11, fontFamily: FONTS.regular,
    marginTop: 28, lineHeight: 18,
  },
});
