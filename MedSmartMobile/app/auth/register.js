import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowLeft, ArrowRight, User, Mail, Lock, Eye, EyeOff, ShieldCheck, Zap, Sun, Moon, Plus, Users, Stethoscope } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { T, FONTS, GRADIENTS } from '../../src/theme';
import * as api from '../../src/services/api';

const DEV_MODE = false;

// Navigation sécurisée : si pas d'écran précédent → landing page
function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Routing centralisé après OTP selon le type de compte
function navigateAfterOTP({ firstName, lastName, email, password, accountType }) {
  const destination = accountType === 'personnel médical'
    ? '/auth/register-doctor'   // Parcours médecin complet (6 étapes)
    : '/auth/register-step2';   // Parcours patient

  router.push({ pathname: destination, params: { firstName, lastName, email, password, accountType } });
}

export default function RegisterScreen() {
  const { dk, toggleTheme } = useTheme();
  const c = dk ? T.dark : T.light;

  const [step, setStep] = useState('form');

  // Form state
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]     = useState('');
  const [email,       setEmail]        = useState('');
  const [password,    setPassword]     = useState('');
  const [confirmPwd,  setConfirmPwd]   = useState('');
  const [accountType, setAccountType]  = useState('patient');
  const [showPwd,     setShowPwd]      = useState(false);
  const [showConfirm, setShowConfirm]  = useState(false);
  const [errors,      setErrors]       = useState({});
  const [apiError,    setApiError]     = useState('');
  const [loading,     setLoading]      = useState(false);

  // OTP state
  const [otp,      setOtp]      = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpInfo,  setOtpInfo]  = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown(x => x - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'Requis';
    if (!lastName.trim())  errs.lastName  = 'Requis';
    if (!email.trim())     errs.email     = 'Requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email invalide';
    if (!password.trim())  errs.password  = 'Requis';
    else if (password.length < 8) errs.password = 'Minimum 8 caractères';
    if (password !== confirmPwd) errs.confirmPwd = 'Les mots de passe ne correspondent pas';
    return errs;
  }

  // ── Submit form → envoie OTP ───────────────────────────────────────────────
  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setApiError('');
    setLoading(true);
    try {
      await api.sendRegisterOTP(email.trim());
      setOtpInfo('Code envoyé à ' + email.trim());
      setCooldown(60);
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('existe déjà')) {
        setErrors({ email: 'Un compte existe déjà avec cet email' });
      } else {
        setApiError(msg || "Erreur d'envoi du code OTP");
        // Dev fallback : bascule quand même en OTP
        setOtpInfo('Code dans le terminal Django (mode dev)');
        setCooldown(60);
        setStep('otp');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── OTP handlers ───────────────────────────────────────────────────────────
  function handleOtpChange(idx, val) {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next  = [...otp];
    next[idx]   = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKey(idx, e) {
    if (e.nativeEvent.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerifyOTP() {
    const code = otp.join('');
    if (code.length !== 6) { setOtpError('Entrez les 6 chiffres'); return; }
    setLoading(true);
    setOtpError('');
    try {
      await api.verifyRegisterOTP(email.trim(), code);
      // Routing selon le type de compte
      navigateAfterOTP({ firstName, lastName, email, password, accountType });
    } catch (err) {
      setOtpError(err?.message || 'Code incorrect ou expiré');
    } finally {
      setLoading(false);
    }
  }

  async function resendOTP() {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setOtpError('');
    try {
      await api.sendRegisterOTP(email.trim());
      setOtpInfo('Nouveau code envoyé');
      setCooldown(60);
    } catch {
      setOtpInfo('Code affiché dans le terminal Django');
      setCooldown(60);
    } finally {
      setLoading(false);
    }
  }

  // DEV ONLY — contourne la vérification OTP
  function skipOTP() {
    navigateAfterOTP({ firstName, lastName, email, password, accountType });
  }

  // ── OTP Step ───────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            <View style={styles.header}>
              <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
                <ArrowLeft size={20} color={c.txt2} />
              </TouchableOpacity>
            </View>

            <View style={styles.logoRow}>
              <LinearGradient colors={GRADIENTS.primary} style={styles.logoBox}>
                <ShieldCheck size={20} color="#fff" />
              </LinearGradient>
              <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt }}>Healy</Text>
            </View>

            <Text style={[styles.title, { color: c.txt }]}>Vérification email</Text>
            <Text style={[styles.subtitle, { color: c.txt2 }]}>
              Code envoyé à <Text style={{ fontFamily: FONTS.bold }}>{email}</Text>
            </Text>

            {otpError ? (
              <View style={[styles.alertBox, { backgroundColor: '#E05555' + '15', borderColor: '#E05555' + '30', marginTop: 16 }]}>
                <Text style={{ color: '#E05555', fontFamily: FONTS.medium, fontSize: 13 }}>{otpError}</Text>
              </View>
            ) : null}
            {otpInfo ? (
              <View style={[styles.alertBox, { backgroundColor: '#2D8C6F' + '15', borderColor: '#2D8C6F' + '30', marginTop: 16 }]}>
                <Text style={{ color: '#2D8C6F', fontFamily: FONTS.medium, fontSize: 13 }}>{otpInfo}</Text>
              </View>
            ) : null}

            {/* OTP inputs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 32, gap: 8 }}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  value={d}
                  onChangeText={v => handleOtpChange(i, v)}
                  onKeyPress={e => handleOtpKey(i, e)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[styles.otpInput, {
                    backgroundColor: c.inputBg,
                    borderColor: d ? c.blue : c.inputBorder,
                    color: c.txt,
                  }]}
                  textAlign="center"
                />
              ))}
            </View>

            <TouchableOpacity onPress={handleVerifyOTP} disabled={loading} activeOpacity={0.88} style={{ marginTop: 28, borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.submitText}>Vérifier le code</Text><ArrowRight size={18} color="#fff" /></>
                }
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={resendOTP} disabled={cooldown > 0 || loading} style={{ marginTop: 16, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: cooldown > 0 ? c.txt3 : c.blue }}>
                {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : 'Renvoyer le code'}
              </Text>
            </TouchableOpacity>

            {/* DEV ONLY */}
            {DEV_MODE && (
              <TouchableOpacity
                onPress={skipOTP}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 8, marginTop: 12, paddingVertical: 13, borderRadius: 14,
                  borderWidth: 1.5, borderColor: '#E8A83860', backgroundColor: '#FFF8EC',
                }}
              >
                <Zap size={15} color="#E8A838" />
                <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: '#E8A838' }}>
                  Skip OTP — {accountType === 'personnel médical' ? 'Parcours Médecin' : 'Parcours Patient'}
                </Text>
              </TouchableOpacity>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Form Step ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <TouchableOpacity onPress={safeBack} style={styles.backBtn}>
              <ArrowLeft size={20} color={c.txt2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme}>
              {dk ? <Sun size={20} color={c.txt2} /> : <Moon size={20} color={c.txt2} />}
            </TouchableOpacity>
          </View>

          <View style={styles.logoRow}>
            <LinearGradient colors={GRADIENTS.primary} style={styles.logoBox}>
              <Plus size={22} color="#fff" />
            </LinearGradient>
            <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt }}>Healy</Text>
          </View>

          <Text style={[styles.title, { color: c.txt }]}>Créer un compte</Text>
          <Text style={[styles.subtitle, { color: c.txt2 }]}>Rejoignez la plateforme de santé N°1</Text>

          {apiError ? (
            <View style={[styles.alertBox, { backgroundColor: '#E05555' + '15', borderColor: '#E05555' + '30', marginTop: 12 }]}>
              <Text style={{ color: '#E05555', fontFamily: FONTS.medium, fontSize: 13 }}>{apiError}</Text>
            </View>
          ) : null}

          <View style={{ gap: 14, marginTop: 20 }}>

            {/* Prénom / Nom */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.txt2 }]}>Prénom</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.firstName ? '#E05555' : c.inputBorder }]}>
                  <User size={15} color={c.icon} style={{ marginRight: 8 }} />
                  <TextInput
                    value={firstName}
                    onChangeText={v => { setFirstName(v); setErrors(p => ({ ...p, firstName: null })); }}
                    placeholder="Prénom" placeholderTextColor={c.placeholder}
                    style={[styles.input, { color: c.txt }]} autoCapitalize="words"
                  />
                </View>
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: c.txt2 }]}>Nom</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.lastName ? '#E05555' : c.inputBorder }]}>
                  <User size={15} color={c.icon} style={{ marginRight: 8 }} />
                  <TextInput
                    value={lastName}
                    onChangeText={v => { setLastName(v); setErrors(p => ({ ...p, lastName: null })); }}
                    placeholder="Nom" placeholderTextColor={c.placeholder}
                    style={[styles.input, { color: c.txt }]} autoCapitalize="words"
                  />
                </View>
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
              </View>
            </View>

            {/* Email */}
            <View>
              <Text style={[styles.label, { color: c.txt2 }]}>Email</Text>
              <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.email ? '#E05555' : c.inputBorder }]}>
                <Mail size={15} color={c.icon} style={{ marginRight: 8 }} />
                <TextInput
                  value={email}
                  onChangeText={v => { setEmail(v); setErrors(p => ({ ...p, email: null })); }}
                  placeholder="votre@email.com" placeholderTextColor={c.placeholder}
                  keyboardType="email-address" autoCapitalize="none"
                  style={[styles.input, { color: c.txt }]}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Mot de passe */}
            <View>
              <Text style={[styles.label, { color: c.txt2 }]}>Mot de passe</Text>
              <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.password ? '#E05555' : c.inputBorder }]}>
                <Lock size={15} color={c.icon} style={{ marginRight: 8 }} />
                <TextInput
                  value={password}
                  onChangeText={v => { setPassword(v); setErrors(p => ({ ...p, password: null })); }}
                  placeholder="Minimum 8 caractères" placeholderTextColor={c.placeholder}
                  secureTextEntry={!showPwd} style={[styles.input, { color: c.txt }]}
                />
                <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPwd ? <Eye size={16} color={c.icon} /> : <EyeOff size={16} color={c.icon} />}
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {/* Confirmer mot de passe */}
            <View>
              <Text style={[styles.label, { color: c.txt2 }]}>Confirmer le mot de passe</Text>
              <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: errors.confirmPwd ? '#E05555' : c.inputBorder }]}>
                <Lock size={15} color={c.icon} style={{ marginRight: 8 }} />
                <TextInput
                  value={confirmPwd}
                  onChangeText={v => { setConfirmPwd(v); setErrors(p => ({ ...p, confirmPwd: null })); }}
                  placeholder="••••••••" placeholderTextColor={c.placeholder}
                  secureTextEntry={!showConfirm} style={[styles.input, { color: c.txt }]}
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showConfirm ? <Eye size={16} color={c.icon} /> : <EyeOff size={16} color={c.icon} />}
                </TouchableOpacity>
              </View>
              {errors.confirmPwd && <Text style={styles.errorText}>{errors.confirmPwd}</Text>}
            </View>

            {/* Type de compte */}
            <View>
              <Text style={[styles.label, { color: c.txt2 }]}>Type de compte</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { key: 'patient',           label: 'Patient',           Icon: Users },
                  { key: 'personnel médical', label: 'Personnel médical', Icon: Stethoscope },
                ].map(({ key, label, Icon }) => {
                  const active = accountType === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setAccountType(key)}
                      style={[styles.typeBtn, {
                        flex: 1,
                        backgroundColor: active ? c.blue : c.card,
                        borderColor: active ? c.blue : c.border,
                      }]}
                      activeOpacity={0.8}
                    >
                      <View style={{ marginBottom: 4 }}>
                        <Icon size={22} color={active ? '#fff' : c.txt2} />
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: active ? '#fff' : c.txt2, textAlign: 'center' }}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.88} style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden' }}>
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.submitText}>Continuer</Text><ArrowRight size={18} color="#fff" /></>
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Switch Login */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.regular, color: c.txt2 }}>Déjà un compte ? </Text>
              <TouchableOpacity onPress={() => router.replace('/auth/login')}>
                <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: c.blue }}>Se connecter</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll:     { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, paddingBottom: 16 },
  backBtn:    { padding: 8, borderRadius: 10 },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  logoBox:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 26, fontFamily: FONTS.extrabold, marginBottom: 6 },
  subtitle:   { fontSize: 14, fontFamily: FONTS.regular },
  alertBox:   { borderWidth: 1, borderRadius: 12, padding: 14 },
  label:      { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6 },
  inputRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 50 },
  input:      { flex: 1, fontSize: 14, fontFamily: FONTS.regular },
  errorText:  { fontSize: 11, fontFamily: FONTS.regular, color: '#E05555', marginTop: 4 },
  typeBtn:    { borderWidth: 1.5, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' },
  submitBtn:  { paddingVertical: 16, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { fontSize: 16, fontFamily: FONTS.bold, color: '#fff' },
  otpInput:   { width: 48, height: 56, borderRadius: 14, borderWidth: 2, fontSize: 22, fontFamily: FONTS.bold },
});
