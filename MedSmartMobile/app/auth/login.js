import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Activity, Sun, Moon,
} from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useLanguage } from '../../src/context/LanguageContext';
import { T, FONTS, GRADIENTS } from '../../src/theme';

// Navigation sécurisée : si pas d'écran précédent → landing page
function safeBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

export default function LoginScreen() {
  const { login, isAuthenticated } = useAuth();
  const { dk, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const c = dk ? T.dark : T.light;

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [errors, setErrors]         = useState({});
  const [apiError, setApiError]     = useState('');
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    if (isAuthenticated) router.replace('/');
  }, [isAuthenticated]);

  async function handleLogin() {
    const errs = {};
    if (!email.trim()) errs.email = 'Email requis';
    if (!password.trim()) errs.password = 'Mot de passe requis';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setErrors({});
    setApiError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // La redirection est gérée par le useEffect isAuthenticated
    } catch (err) {
      setApiError(err.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={safeBack} style={styles.backBtn}>
              <ArrowLeft size={20} color={c.txt2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
              {dk ? <Sun size={20} color={c.txt2} /> : <Moon size={20} color={c.txt2} />}
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={styles.logoRow}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.logoBox}>
              <Text style={{ color: '#fff', fontSize: 22, fontFamily: FONTS.bold }}>✚</Text>
            </LinearGradient>
            <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt }}>Healy</Text>
          </View>

          {/* Titre */}
          <Text style={[styles.title, { color: c.txt }]}>
            {t('auth.login.title') || 'Connexion'}
          </Text>
          <Text style={[styles.subtitle, { color: c.txt2 }]}>
            {t('auth.login.subtitle') || 'Connectez-vous à votre compte'}
          </Text>

          {/* Erreur API */}
          {apiError ? (
            <View style={[styles.alertBox, { backgroundColor: '#E05555' + '15', borderColor: '#E05555' + '30' }]}>
              <Text style={{ color: '#E05555', fontFamily: FONTS.medium, fontSize: 13 }}>{apiError}</Text>
            </View>
          ) : null}

          {/* Formulaire */}
          <View style={{ gap: 16, marginTop: 24 }}>
            {/* Email */}
            <View>
              <Text style={[styles.label, { color: c.txt2 }]}>Email</Text>
              <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.email ? '#E05555' : c.inputBorder }]}>
                <Mail size={16} color={c.icon} style={{ marginRight: 10 }} />
                <TextInput
                  value={email}
                  onChangeText={v => { setEmail(v); if (errors.email) setErrors(p => ({ ...p, email: null })); }}
                  placeholder="votre@email.com"
                  placeholderTextColor={c.placeholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.input, { color: c.txt }]}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Mot de passe */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.label, { color: c.txt2 }]}>Mot de passe</Text>
                <TouchableOpacity onPress={() => router.push('/auth/forgot-password')}>
                  <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.blue }}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.password ? '#E05555' : c.inputBorder }]}>
                <Lock size={16} color={c.icon} style={{ marginRight: 10 }} />
                <TextInput
                  value={password}
                  onChangeText={v => { setPassword(v); if (errors.password) setErrors(p => ({ ...p, password: null })); }}
                  placeholder="••••••••"
                  placeholderTextColor={c.placeholder}
                  secureTextEntry={!showPwd}
                  style={[styles.input, { color: c.txt }]}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPwd
                    ? <Eye size={16} color={c.icon} />
                    : <EyeOff size={16} color={c.icon} />
                  }
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Bouton connexion */}
            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.88} style={{ marginTop: 4, borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <>
                      <Text style={styles.submitText}>Se connecter</Text>
                      <ArrowRight size={18} color="#fff" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3 }}>ou</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
            </View>

            {/* OAuth Google */}
            <TouchableOpacity
              style={[styles.oauthBtn, { backgroundColor: c.card, borderColor: c.border }]}
              activeOpacity={0.8}
              onPress={() => {}}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>🔍</Text>
              <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt }}>Continuer avec Google</Text>
            </TouchableOpacity>

            {/* Switch Register */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.regular, color: c.txt2 }}>Pas encore de compte ? </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/register')}>
                <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.blue }}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, paddingBottom: 20 },
  backBtn: { padding: 8, borderRadius: 10 },
  themeBtn: { padding: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: FONTS.extrabold, marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: FONTS.regular, lineHeight: 22 },
  alertBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  label: { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, height: 52,
  },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  errorText: { fontSize: 12, fontFamily: FONTS.regular, color: '#E05555', marginTop: 4 },
  submitBtn: {
    paddingVertical: 16, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  submitText: { fontSize: 16, fontFamily: FONTS.bold, color: '#fff' },
  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderRadius: 14, paddingVertical: 14,
  },
});
