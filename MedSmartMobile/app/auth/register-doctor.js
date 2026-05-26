/**
 * register-doctor.js
 * Parcours d'inscription complet pour le rôle MÉDECIN — 6 étapes
 *
 * Étape 1 : Informations personnelles (date naissance, sexe, téléphone, N° CIN)
 * Étape 2 : Adresse résidentielle (adresse, code postal, commune, wilaya)
 * Étape 3 : Vérification d'identité (CIN recto/verso + photo de profil)
 * Étape 4 : Choix du métier (médecin seulement ici)
 * Étape 5 : Activité médicale (spécialité, ordre, cabinet, expérience, maps, CNAS)
 * Étape 6 : Confirmation & soumission
 *
 * Usage : router.push({ pathname: '/auth/register-doctor', params: { firstName, lastName, email, password } })
 */

import React, {
  useState, useCallback, useMemo, createContext, useContext, memo,
} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
  KeyboardAvoidingView, Dimensions, Image,
} from 'react-native';
import * as ImagePicker    from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft, ArrowRight, Check, User, Phone, CreditCard,
  MapPin, House, Stethoscope, Building2, Clock,
  Link, FileText, ChevronDown, CircleCheckBig,
  CircleAlert, Calendar, Pill, Camera,
} from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import { T, FONTS, GRADIENTS } from '../../src/theme';
import * as api from '../../src/services/api';

const { width: SW } = Dimensions.get('window');

// ─── Données statiques ────────────────────────────────────────────────────────
const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra',
  'Béchar','Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret',
  'Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda','Skikda',
  'Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',
  'M\'Sila','Mascara','Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arréridj',
  'Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued','Khenchela',
  'Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane',
];

const SPECIALTIES = [
  'Médecin généraliste','Cardiologue','Pédiatre','Neurologue',
  'Orthopédiste','Dermatologue','Ophtalmologue','Gynécologue',
  'Psychiatre','ORL','Urologue','Rhumatologue','Endocrinologue',
  'Gastro-entérologue','Pneumologue','Néphrologue','Hématologue',
  'Oncologue','Radiologue','Anesthésiste','Chirurgien général',
  'Chirurgien cardiaque','Urgentiste','Médecin du sport',
];

const TOTAL_STEPS = 6;

const STEP_LABELS = [
  { label: 'Profil',     short: '1' },
  { label: 'Identité',   short: '2' },
  { label: 'Rôle',       short: '3' },
  { label: 'Activité',   short: '4' },
  { label: 'Documents',  short: '5' },
  { label: 'Confirmer',  short: '6' },
];

// ─── Context interne ──────────────────────────────────────────────────────────
const FormCtx = createContext(null);
const useForm = () => useContext(FormCtx);

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function RegisterDoctorScreen() {
  const { dk }           = useTheme();

  const params           = useLocalSearchParams();
  const c = useMemo(() => (dk ? T.dark : T.light), [dk]);

  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);

  // ── Form data ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    // Étape 1
    birthDate: '',
    gender:    'Masculin',
    phone:     '',
    cinNumber: '',
    // Étape 2
    address:    '',
    postalCode: '',
    commune:    '',
    wilaya:     'Alger',
    // Étape 3
    cinRecto:   null,   // { name, uri }
    cinVerso:   null,
    profilePhoto: null,
    // Étape 4 — rôle fixé à médecin dans ce parcours
    role: 'doctor',
    // Étape 5
    specialty:      '',
    ordreNumber:    '',
    cabinetName:    '',
    experience:     '',
    googleMaps:     '',
    autorisation:   null,
    cnas:           true,
    // Documents professionnels (étape 5)
    diplomas: [],   // [{ id, name, uri, type }]
  });

  const [errors, setErrors] = useState({});

  const upd = useCallback((key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  // ── Validation par étape ───────────────────────────────────────────────────
  function validate(s) {
    const errs = {};
    if (s === 1) {
      if (!form.birthDate.trim()) errs.birthDate = 'Requis';
      if (!form.phone.trim())     errs.phone     = 'Requis';
      else if (!/^0[5-7]\d{8}$/.test(form.phone.trim())) errs.phone = 'Format invalide (ex: 0555123456)';
      if (!form.cinNumber.trim()) errs.cinNumber = 'Requis';
      if (!form.address.trim())    errs.address    = 'Requis';
      if (!form.postalCode.trim()) errs.postalCode = 'Requis';
      if (!form.commune.trim())    errs.commune    = 'Requis';
    }
    // step 2 = Identité (CIN docs)
    if (s === 2) {
      if (!form.cinRecto)     errs.cinRecto     = 'Ce champ est obligatoire';
      if (!form.cinVerso)     errs.cinVerso     = 'Ce champ est obligatoire';
      if (!form.profilePhoto) errs.profilePhoto = 'Ce champ est obligatoire';
    }
    // step 4 = Activité médicale
    if (s === 4) {
      if (!form.specialty.trim())   errs.specialty   = 'Requis';
      if (!form.ordreNumber.trim()) errs.ordreNumber = 'Requis';
      if (!form.cabinetName.trim()) errs.cabinetName = 'Requis';
      if (!form.experience.trim())  errs.experience  = 'Requis';
    }
    return errs;
  }

  function goNext() {
    const errs = validate(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  }

  function goBack() {
    setErrors({});
    if (step > 1) setStep(s => s - 1);
    else router.back();
  }

  // ── Submit final ───────────────────────────────────────────────────────────
  async function handleSubmit() {
    setLoading(true);
    try {
      // Convertir date JJ/MM/AAAA → YYYY-MM-DD (format Django)
      function toISO(str = '') {
        const parts = str.trim().split(/[\/\-\.]/);
        if (parts.length === 3) {
          const [a, b, c] = parts;
          // Si le 3ème segment est une année à 4 chiffres → DD/MM/YYYY
          if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
          // Si le 1er segment est une année à 4 chiffres → déjà YYYY-MM-DD
          if (a.length === 4) return str.trim();
        }
        return str.trim();
      }
      const dateISO = toISO(form.birthDate);

      // sex : valeurs attendues par le backend
      const sexMap = { 'Masculin': 'male', 'Féminin': 'female' };
      const sex = sexMap[form.gender] ?? form.gender;

      // Construire FormData avec les vrais noms de champs du backend
      const fd = new FormData();

      // ── Champs de base ──
      fd.append('email',            params.email     || '');
      fd.append('password',         params.password  || '');
      fd.append('password_confirm', params.password  || '');   // requis par le backend
      fd.append('first_name',       params.firstName || '');
      fd.append('last_name',        params.lastName  || '');
      fd.append('role',             form.role);
      fd.append('phone',            form.phone);
      fd.append('date_of_birth',    dateISO);
      fd.append('sex',              sex);
      fd.append('id_card_number',   form.cinNumber);
      fd.append('address',          form.address);
      fd.append('postal_code',      form.postalCode);
      fd.append('city',             form.commune);   // commune → city
      fd.append('wilaya',           form.wilaya);
      fd.append('cnas',             String(form.cnas));

      // ── Champs spécifiques médecin ──
      if (form.role === 'doctor') {
        fd.append('specialty',              form.specialty);
        fd.append('order_number',           form.ordreNumber);
        fd.append('clinic_name',            form.cabinetName);
        fd.append('experience_years',       form.experience);
        if (form.googleMaps) fd.append('google_maps', form.googleMaps);
      }

      // ── Fichiers identité ──
      if (form.cinRecto)     fd.append('id_card_recto',          { uri: form.cinRecto.uri,     name: form.cinRecto.name,     type: form.cinRecto.type     || 'image/jpeg' });
      if (form.cinVerso)     fd.append('id_card_verso',          { uri: form.cinVerso.uri,     name: form.cinVerso.name,     type: form.cinVerso.type     || 'image/jpeg' });
      if (form.profilePhoto) fd.append('profile_photo',          { uri: form.profilePhoto.uri, name: form.profilePhoto.name, type: form.profilePhoto.type || 'image/jpeg' });
      if (form.autorisation) fd.append('practice_authorization', { uri: form.autorisation.uri, name: form.autorisation.name, type: form.autorisation.type || 'application/pdf' });

      // ── Diplômes ──
      form.diplomas.forEach((d, i) => {
        fd.append(`diplomas[${i}]`, { uri: d.uri, name: d.name, type: d.type || 'application/pdf' });
      });

      // ── Appel API selon le rôle ──
      const registerFn = form.role === 'pharmacist' ? api.registerPharmacist
                       : form.role === 'caretaker'  ? api.registerCaretaker
                       : api.registerDoctor;
      await registerFn(fd);

      // Ne pas connecter automatiquement — le compte doit être validé par un admin
      Alert.alert(
        '🎉 Dossier envoyé !',
        'Votre inscription a été soumise avec succès.\n\nVotre dossier sera examiné par notre équipe. Vous recevrez un e-mail de confirmation une fois votre compte activé.',
        [{ text: 'Se connecter', onPress: () => router.replace('/auth/login') }],
        { cancelable: false },
      );
    } catch (err) {
      Alert.alert('Erreur d\'inscription', err?.message || "Une erreur s'est produite. Vérifiez vos informations et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  const ctx = { form, upd, errors, c, dk, params };

  return (
    <FormCtx.Provider value={ctx}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── Stepper ── */}
          <Stepper currentStep={step} c={c} />

          {/* ── Content ── */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && <Step1Profile />}
            {step === 2 && <Step3Identity />}
            {step === 3 && <Step4Role />}
            {step === 4 && <Step5Activity />}
            {step === 5 && <Step5Documents />}
            {step === 6 && <Step6Confirm onSubmit={handleSubmit} loading={loading} />}
          </ScrollView>

          {/* ── Footer buttons ── */}
          {step < 6 && (
            <FooterButtons onBack={goBack} onNext={goNext} step={step} c={c} />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </FormCtx.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEPPER
// ─────────────────────────────────────────────────────────────────────────────
const Stepper = memo(function Stepper({ currentStep, c }) {
  return (
    <View style={[St.stepperWrap, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
      {STEP_LABELS.map((s, i) => {
        const num      = i + 1;
        const done     = num < currentStep;
        const active   = num === currentStep;
        const inactive = num > currentStep;
        return (
          <React.Fragment key={num}>
            <View style={St.stepItem}>
              {/* Circle */}
              <View style={[
                St.stepCircle,
                done     && { backgroundColor: '#2D8C6F', borderColor: '#2D8C6F' },
                active   && { backgroundColor: '#304B71', borderColor: '#304B71' },
                inactive && { backgroundColor: 'transparent', borderColor: c.border },
              ]}>
                {done
                  ? <Check size={12} color="#fff" strokeWidth={3} />
                  : <Text style={[St.stepNum, { color: active ? '#fff' : c.txt3 }]}>{num}</Text>
                }
              </View>
              {/* Label */}
              <Text style={[St.stepLabel, {
                color: done ? '#2D8C6F' : active ? '#304B71' : c.txt3,
                fontFamily: active ? FONTS.bold : FONTS.regular,
              }]}>
                {s.label}
              </Text>
            </View>

            {/* Connector line (pas après le dernier) */}
            {i < STEP_LABELS.length - 1 && (
              <View style={[St.connector, { backgroundColor: num < currentStep ? '#2D8C6F' : c.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FOOTER BUTTONS
// ─────────────────────────────────────────────────────────────────────────────
function FooterButtons({ onBack, onNext, step, c }) {
  return (
    <View style={[St.footer, { backgroundColor: c.nav, borderTopColor: c.border }]}>
      <TouchableOpacity onPress={onBack} style={[St.backBtn, { borderColor: c.border, backgroundColor: c.card }]}>
        <ArrowLeft size={16} color={c.txt2} />
        <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: c.txt2 }}>Retour</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} activeOpacity={0.88} style={{ flex: 1, borderRadius: 14, overflow: 'hidden' }}>
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={St.nextBtn}>
          <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: '#fff' }}>Continuer</Text>
          <ArrowRight size={16} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — INFORMATIONS PERSONNELLES + ADRESSE
// ─────────────────────────────────────────────────────────────────────────────
function Step1Profile() {
  const { form, upd, errors, c } = useForm();

  return (
    <View style={{ gap: 0 }}>
      <SectionTitle title="INFORMATIONS PERSONNELLES" c={c} />

      <View style={St.row2}>
        {/* Date de naissance */}
        <View style={{ flex: 1 }}>
          <FieldLabel text="Date de naissance" c={c} />
          <FieldInput
            icon={<Calendar size={15} color={c.icon} />}
            placeholder="JJ/MM/AAAA"
            value={form.birthDate}
            onChangeText={v => upd('birthDate', v)}
            error={errors.birthDate}
            keyboardType="numbers-and-punctuation"
            c={c}
          />
          {errors.birthDate && <ErrorText text={errors.birthDate} />}
        </View>

        {/* Sexe */}
        <View style={{ flex: 1 }}>
          <FieldLabel text="Sexe" c={c} />
          <SelectPicker
            value={form.gender}
            options={['Masculin', 'Féminin']}
            onSelect={v => upd('gender', v)}
            c={c}
          />
        </View>
      </View>

      <View style={St.row2}>
        {/* Téléphone */}
        <View style={{ flex: 1 }}>
          <FieldLabel text="Téléphone" c={c} />
          <FieldInput
            icon={<Phone size={15} color={c.icon} />}
            placeholder="0555123456"
            value={form.phone}
            onChangeText={v => upd('phone', v)}
            error={errors.phone}
            keyboardType="phone-pad"
            c={c}
          />
          {errors.phone && <ErrorText text={errors.phone} />}
        </View>

        {/* N° CIN */}
        <View style={{ flex: 1 }}>
          <FieldLabel text="N° Carte d'identité" c={c} />
          <FieldInput
            icon={<CreditCard size={15} color={c.icon} />}
            placeholder="Ex: 10123456789"
            value={form.cinNumber}
            onChangeText={v => upd('cinNumber', v)}
            error={errors.cinNumber}
            keyboardType="numeric"
            c={c}
          />
          {errors.cinNumber && <ErrorText text={errors.cinNumber} />}
        </View>
      </View>

      <SectionTitle title="ADRESSE RÉSIDENTIELLE" c={c} style={{ marginTop: 8 }} />

      {/* Adresse */}
      <FieldLabel text="Adresse" c={c} />
      <FieldInput
        icon={<House size={15} color={c.icon} />}
        placeholder="Rue, numéro..."
        value={form.address}
        onChangeText={v => upd('address', v)}
        error={errors.address}
        c={c}
      />
      {errors.address && <ErrorText text={errors.address} />}

      <View style={[St.row2, { marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Code postal" c={c} />
          <FieldInput
            placeholder="16000"
            value={form.postalCode}
            onChangeText={v => upd('postalCode', v)}
            error={errors.postalCode}
            keyboardType="numeric"
            c={c}
          />
          {errors.postalCode && <ErrorText text={errors.postalCode} />}
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Commune" c={c} />
          <FieldInput
            icon={<MapPin size={15} color={c.icon} />}
            placeholder="Rouiba"
            value={form.commune}
            onChangeText={v => upd('commune', v)}
            error={errors.commune}
            c={c}
          />
          {errors.commune && <ErrorText text={errors.commune} />}
        </View>
      </View>

      {/* Wilaya */}
      <FieldLabel text="Wilaya" c={c} style={{ marginTop: 12 }} />
      <SelectPicker
        value={form.wilaya}
        options={WILAYAS}
        onSelect={v => upd('wilaya', v)}
        c={c}
        fullWidth
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Vrai picker : caméra, galerie ou document PDF
// ─────────────────────────────────────────────────────────────────────────────
async function realPickFile(upd, key, label) {
  Alert.alert(`Télécharger : ${label}`, 'Choisissez une source', [
    { text: 'Annuler', style: 'cancel' },
    {
      text: '📷  Caméra',
      onPress: async () => {
        try {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission refusée', 'Autorisez la caméra dans les Réglages.'); return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
          if (!result.canceled && result.assets?.[0]) {
            const a = result.assets[0];
            upd(key, { uri: a.uri, name: a.fileName || `${key}_${Date.now()}.jpg`, type: 'image/jpeg' });
          }
        } catch { Alert.alert('Erreur', "Impossible d'ouvrir la caméra."); }
      },
    },
    {
      text: '🖼️  Galerie',
      onPress: async () => {
        try {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission refusée', 'Autorisez la galerie dans les Réglages.'); return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
          if (!result.canceled && result.assets?.[0]) {
            const a = result.assets[0];
            upd(key, { uri: a.uri, name: a.fileName || `${key}_${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
          }
        } catch { Alert.alert('Erreur', "Impossible d'ouvrir la galerie."); }
      },
    },
    {
      text: '📄  Document (PDF / JPG)',
      onPress: async () => {
        try {
          const result = await DocumentPicker.getDocumentAsync({
            type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
            copyToCacheDirectory: true,
          });
          if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            if (asset.size && asset.size > 5 * 1024 * 1024) {
              Alert.alert('Fichier trop volumineux', '5 Mo maximum.'); return;
            }
            upd(key, { uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/pdf' });
          }
        } catch { Alert.alert('Erreur', 'Impossible de sélectionner ce fichier.'); }
      },
    },
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — VÉRIFICATION D'IDENTITÉ (CIN recto / verso / photo)
// ─────────────────────────────────────────────────────────────────────────────
function Step3Identity() {
  const { form, upd, errors, c, dk } = useForm();

  return (
    <View>
      <SectionTitle title="VÉRIFICATION D'IDENTITÉ" c={c} />
      <Text style={[St.sectionSub, { color: c.txt2 }]}>
        Téléchargez vos documents d'identité pour valider votre compte.
      </Text>

      <View style={[St.row3, { marginTop: 20 }]}>
        <DocUploadCard
          label="CIN Recto"
          icon={<CreditCard size={26} color={errors.cinRecto ? '#E05555' : c.icon} />}
          file={form.cinRecto}
          onPress={() => realPickFile(upd, 'cinRecto', 'CIN Recto')}
          error={errors.cinRecto}
          c={c} dk={dk}
        />
        <DocUploadCard
          label="CIN Verso"
          icon={<CreditCard size={26} color={errors.cinVerso ? '#E05555' : c.icon} />}
          file={form.cinVerso}
          onPress={() => realPickFile(upd, 'cinVerso', 'CIN Verso')}
          error={errors.cinVerso}
          c={c} dk={dk}
        />
        <DocUploadCard
          label="Photo profil"
          icon={<User size={26} color={errors.profilePhoto ? '#E05555' : c.icon} />}
          file={form.profilePhoto}
          onPress={() => realPickFile(upd, 'profilePhoto', 'Photo de profil')}
          error={errors.profilePhoto}
          c={c} dk={dk}
        />
      </View>

      <View style={{ flexDirection:'row', gap:8, backgroundColor:'#EFF6FF',
        borderWidth:1, borderColor:'#BFDBFE', borderRadius:12, padding:12, marginTop:16 }}>
        <Camera size={14} color="#1D4ED8" style={{ marginTop:1 }} />
        <Text style={{ flex:1, fontSize:12, color:'#1E40AF', lineHeight:18 }}>
          Appuyez sur une carte pour choisir entre appareil photo, galerie ou fichier PDF.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — CHOIX DU MÉTIER
// ─────────────────────────────────────────────────────────────────────────────
function Step4Role() {
  const { form, upd, c } = useForm();

  const roles = [
    { key: 'doctor',     label: 'Médecin',      sub: 'Généraliste ou Spécialiste', Icon: Stethoscope },
    { key: 'caretaker',  label: 'Garde-malade', sub: 'Soins à domicile',           Icon: User        },
    { key: 'pharmacist', label: 'Pharmacien',   sub: 'Officine ou Conseil',        Icon: Pill        },
  ];

  return (
    <View>
      <SectionTitle title="VOTRE MÉTIER" c={c} />
      <View style={{ gap: 14, marginTop: 8 }}>
        {roles.map(r => {
          const active = form.role === r.key;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => upd('role', r.key)}
              activeOpacity={0.75}
              style={[
                St.roleCard,
                {
                  backgroundColor: active ? '#304B7110' : c.card,
                  borderColor:     active ? '#304B71'   : c.border,
                  borderWidth:     active ? 2            : 1.5,
                },
              ]}
            >
              <View style={[St.roleIcon, { backgroundColor: active ? '#304B7122' : c.border }]}>
                <r.Icon size={28} color={active ? '#304B71' : c.txt3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontFamily: FONTS.bold,
                  color: active ? '#304B71' : c.txt, marginBottom: 2 }}>
                  {r.label}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: FONTS.regular,
                  color: active ? '#304B71' : c.txt2 }}>
                  {r.sub}
                </Text>
              </View>
              <View style={[St.checkBadge, {
                backgroundColor: active ? '#2D8C6F' : 'transparent',
                borderWidth:     active ? 0 : 2,
                borderColor:     c.border,
              }]}>
                {active && <Check size={14} color="#fff" strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — ACTIVITÉ MÉDICALE
// ─────────────────────────────────────────────────────────────────────────────
function Step5Activity() {
  const { form, upd, errors, c, dk } = useForm();
  const [showSpecialties, setShowSpecialties] = useState(false);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Stethoscope size={20} color='#304B71' />
        <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: '#304B71', textTransform: 'uppercase', letterSpacing: 1 }}>
          Médecin
        </Text>
      </View>

      {/* Spécialité */}
      <FieldLabel text="Spécialité médicale" c={c} />
      <TouchableOpacity
        onPress={() => setShowSpecialties(!showSpecialties)}
        style={[St.selectBtn, { backgroundColor: c.card, borderColor: errors.specialty ? '#E05555' : c.border }]}
      >
        <Stethoscope size={15} color={c.icon} />
        <Text style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: form.specialty ? c.txt : c.placeholder, marginLeft: 10 }}>
          {form.specialty || 'Sélectionnez une spécialité'}
        </Text>
        <ChevronDown size={16} color={c.txt3} />
      </TouchableOpacity>
      {errors.specialty && <ErrorText text={errors.specialty} />}

      {showSpecialties && (
        <View style={[St.dropdownList, { backgroundColor: c.card, borderColor: c.border }]}>
          <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {SPECIALTIES.map(sp => (
              <TouchableOpacity
                key={sp}
                onPress={() => { upd('specialty', sp); setShowSpecialties(false); }}
                style={[St.dropdownItem, { borderBottomColor: c.border, backgroundColor: form.specialty === sp ? c.blue + '12' : 'transparent' }]}
              >
                <Text style={{ fontSize: 14, fontFamily: form.specialty === sp ? FONTS.semibold : FONTS.regular, color: form.specialty === sp ? c.blue : c.txt }}>
                  {sp}
                </Text>
                {form.specialty === sp && <Check size={14} color={c.blue} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={[St.row2, { marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="N° inscription à l'Ordre" c={c} />
          <FieldInput
            placeholder="Ex: 161234"
            value={form.ordreNumber}
            onChangeText={v => upd('ordreNumber', v)}
            error={errors.ordreNumber}
            keyboardType="numeric"
            c={c}
          />
          {errors.ordreNumber && <ErrorText text={errors.ordreNumber} />}
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Nom du Cabinet" c={c} />
          <FieldInput
            icon={<Building2 size={15} color={c.icon} />}
            placeholder="Cabinet Dr. Benali"
            value={form.cabinetName}
            onChangeText={v => upd('cabinetName', v)}
            error={errors.cabinetName}
            c={c}
          />
          {errors.cabinetName && <ErrorText text={errors.cabinetName} />}
        </View>
      </View>

      <View style={[St.row2, { marginTop: 12 }]}>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Années d'expérience" c={c} />
          <View style={[St.inputRow, { backgroundColor: c.card, borderColor: errors.experience ? '#E05555' : c.border }]}>
            <Clock size={15} color={c.icon} style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Ex: 5"
              placeholderTextColor={c.placeholder}
              value={form.experience}
              onChangeText={v => upd('experience', v)}
              keyboardType="numeric"
              style={[St.input, { color: c.txt, flex: 1 }]}
            />
            <Text style={{ fontSize: 13, fontFamily: FONTS.medium, color: c.txt2 }}>ans</Text>
          </View>
          {errors.experience && <ErrorText text={errors.experience} />}
        </View>
        <View style={{ flex: 1 }}>
          <FieldLabel text="Google Maps" c={c} />
          <FieldInput
            icon={<Link size={15} color={c.icon} />}
            placeholder="https://maps.google.com/..."
            value={form.googleMaps}
            onChangeText={v => upd('googleMaps', v)}
            autoCapitalize="none"
            keyboardType="url"
            c={c}
          />
        </View>
      </View>

      {/* Autorisation d'exercer */}
      <FieldLabel text="Autorisation d'exercer" c={c} style={{ marginTop: 16 }} />
      <TouchableOpacity
        onPress={() => realPickFile(upd, 'autorisation', "Autorisation d'exercer")}
        style={[St.uploadZone, { borderColor: c.border, backgroundColor: c.card }]}
      >
        {form.autorisation ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <CircleCheckBig size={28} color="#2D8C6F" />
            <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: '#2D8C6F' }}>{form.autorisation.name}</Text>
            <Text style={{ fontSize: 11, color: c.txt3 }}>Appuyez pour changer</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 8 }}>
            <View style={[St.plusCircle, { backgroundColor: c.border }]}>
              <Text style={{ fontSize: 20, color: c.txt3 }}>+</Text>
            </View>
            <Text style={{ fontSize: 14, fontFamily: FONTS.semibold, color: c.txt }}>Télécharger le document</Text>
            <Text style={{ fontSize: 12, color: c.txt3 }}>PDF, JPG — 5MB max</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* CNAS */}
      <View style={{ marginTop: 20 }}>
        <Text style={[{ fontSize: 11, fontFamily: FONTS.bold, color: c.txt3, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center', marginBottom: 12 }]}>
          CONVENTION CNAS
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24 }}>
          {[true, false].map(val => (
            <TouchableOpacity
              key={String(val)}
              onPress={() => upd('cnas', val)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <View style={[St.radioOuter, { borderColor: form.cnas === val ? c.blue : c.border }]}>
                {form.cnas === val && <View style={[St.radioInner, { backgroundColor: c.blue }]} />}
              </View>
              <Text style={{ fontSize: 15, fontFamily: FONTS.medium, color: c.txt }}>{val ? 'Oui' : 'Non'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5 — DOCUMENTS PROFESSIONNELS (diplômes multiples)
// ─────────────────────────────────────────────────────────────────────────────
function Step5Documents() {
  const { form, upd, c, dk } = useForm();
  const MAX_DIPLOMAS = 10;

  function addDiploma() {
    if (form.diplomas.length >= MAX_DIPLOMAS) {
      Alert.alert('Maximum atteint', `Vous pouvez ajouter jusqu'à ${MAX_DIPLOMAS} diplômes.`);
      return;
    }
    Alert.alert('Ajouter un diplôme', 'Choisissez une source', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: '📷  Caméra',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'Autorisez la caméra dans les Réglages.'); return;
            }
            const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
            if (!result.canceled && result.assets?.[0]) {
              const a = result.assets[0];
              const d = { id: Date.now(), uri: a.uri, name: a.fileName || `diplome_${Date.now()}.jpg`, type: 'image/jpeg' };
              upd('diplomas', [...form.diplomas, d]);
            }
          } catch { Alert.alert('Erreur', "Impossible d'ouvrir la caméra."); }
        },
      },
      {
        text: '🖼️  Galerie',
        onPress: async () => {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission refusée', 'Autorisez la galerie dans les Réglages.'); return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
            if (!result.canceled && result.assets?.[0]) {
              const a = result.assets[0];
              const d = { id: Date.now(), uri: a.uri, name: a.fileName || `diplome_${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' };
              upd('diplomas', [...form.diplomas, d]);
            }
          } catch { Alert.alert('Erreur', "Impossible d'ouvrir la galerie."); }
        },
      },
      {
        text: '📄  Document (PDF / JPG)',
        onPress: async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
              copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets?.[0]) {
              const asset = result.assets[0];
              if (asset.size && asset.size > 5 * 1024 * 1024) {
                Alert.alert('Fichier trop volumineux', '5 Mo maximum.'); return;
              }
              const d = { id: Date.now(), uri: asset.uri, name: asset.name, type: asset.mimeType || 'application/pdf' };
              upd('diplomas', [...form.diplomas, d]);
            }
          } catch { Alert.alert('Erreur', 'Impossible de sélectionner ce fichier.'); }
        },
      },
    ]);
  }

  function removeDiploma(id) {
    upd('diplomas', form.diplomas.filter(d => d.id !== id));
  }

  const isPDF = (name = '') => name.toLowerCase().endsWith('.pdf');

  return (
    <View>
      <SectionTitle title="DOCUMENTS PROFESSIONNELS" c={c} />
      <Text style={[St.sectionSub, { color: c.txt2, marginBottom: 20 }]}>
        Ajoutez vos diplômes et documents justifiant votre activité médicale.{'\n'}
        <Text style={{ fontFamily: FONTS.semibold }}>{form.diplomas.length}/{MAX_DIPLOMAS}</Text> diplôme(s) ajouté(s).
      </Text>

      {/* Liste des diplômes ajoutés */}
      {form.diplomas.map((d, i) => (
        <View key={d.id} style={{
          flexDirection: 'row', alignItems: 'center', gap: 12,
          borderWidth: 1.5, borderColor: '#2D8C6F', borderRadius: 14,
          padding: 12, marginBottom: 10, backgroundColor: '#2D8C6F0A',
        }}>
          {/* Preview ou icône PDF */}
          {!isPDF(d.name) && d.uri ? (
            <Image source={{ uri: d.uri }} style={{ width: 48, height: 48, borderRadius: 8 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 48, height: 48, borderRadius: 8,
              backgroundColor: '#304B7120', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={22} color="#304B71" />
            </View>
          )}

          {/* Infos */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt }}
              numberOfLines={1}>
              Diplôme {i + 1}
            </Text>
            <Text style={{ fontSize: 11, color: c.txt3, marginTop: 2 }}
              numberOfLines={1}>
              {d.name}
            </Text>
          </View>

          {/* Supprimer */}
          <TouchableOpacity
            onPress={() => removeDiploma(d.id)}
            style={{ padding: 8 }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={{ fontSize: 18, color: '#EF4444' }}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Bouton Ajouter */}
      {form.diplomas.length < MAX_DIPLOMAS && (
        <TouchableOpacity
          onPress={addDiploma}
          activeOpacity={0.75}
          style={{
            borderWidth: 1.5, borderStyle: 'dashed',
            borderColor: '#304B71', borderRadius: 14,
            paddingVertical: 20, alignItems: 'center',
            backgroundColor: '#304B7108', gap: 8,
            flexDirection: 'row', justifyContent: 'center',
            marginTop: form.diplomas.length > 0 ? 4 : 0,
          }}
        >
          <View style={{ width: 32, height: 32, borderRadius: 16,
            backgroundColor: '#304B71', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 20, lineHeight: 22 }}>+</Text>
          </View>
          <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: '#304B71' }}>
            Ajouter un diplôme
          </Text>
        </TouchableOpacity>
      )}

      {form.diplomas.length === 0 && (
        <Text style={{ fontSize: 12, color: c.txt3, textAlign: 'center', marginTop: 12 }}>
          Aucun diplôme ajouté — ce champ est optionnel.
        </Text>
      )}

      <View style={{ flexDirection:'row', gap:8, backgroundColor:'#EFF6FF',
        borderWidth:1, borderColor:'#BFDBFE', borderRadius:12, padding:12, marginTop:20 }}>
        <Camera size={14} color="#1D4ED8" style={{ marginTop:1 }} />
        <Text style={{ flex:1, fontSize:12, color:'#1E40AF', lineHeight:18 }}>
          Caméra, galerie ou PDF — 5 Mo max par document.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6 — CONFIRMATION ET SOUMISSION
// ─────────────────────────────────────────────────────────────────────────────
function Step6Confirm({ onSubmit, loading }) {
  const { form, upd, c, dk, params } = useForm();

  const sections = [
    {
      title: 'Informations personnelles',
      Icon: User,
      items: [
        { label: 'Nom complet', value: `${params.firstName || ''} ${params.lastName || ''}`.trim() },
        { label: 'Email', value: params.email || '' },
        { label: 'Téléphone', value: form.phone || '—' },
        { label: 'Date de naissance', value: form.birthDate || '—' },
        { label: 'Sexe', value: form.gender },
        { label: 'N° CIN', value: form.cinNumber || '—' },
      ],
    },
    {
      title: 'Adresse',
      Icon: MapPin,
      items: [
        { label: 'Adresse', value: form.address || '—' },
        { label: 'Code postal', value: form.postalCode || '—' },
        { label: 'Commune', value: form.commune || '—' },
        { label: 'Wilaya', value: form.wilaya },
      ],
    },
    {
      title: 'Documents d\'identité',
      Icon: CreditCard,
      items: [
        { label: 'CIN Recto',     value: form.cinRecto?.name     || '—' },
        { label: 'CIN Verso',     value: form.cinVerso?.name     || '—' },
        { label: 'Photo profil',  value: form.profilePhoto?.name || '—' },
      ],
    },
    {
      title: 'Diplômes',
      Icon: FileText,
      items: form.diplomas.length > 0
        ? form.diplomas.map((d, i) => ({ label: `Diplôme ${i + 1}`, value: d.name }))
        : [{ label: 'Diplômes', value: 'Aucun ajouté' }],
    },
    {
      title: 'Activité médicale',
      Icon: Stethoscope,
      items: [
        { label: 'Spécialité',    value: form.specialty    || '—' },
        { label: 'N° Ordre',      value: form.ordreNumber  || '—' },
        { label: 'Cabinet',       value: form.cabinetName  || '—' },
        { label: 'Expérience',    value: form.experience ? `${form.experience} ans` : '—' },
        { label: 'CNAS',          value: form.cnas ? 'Oui' : 'Non' },
      ],
    },
  ];

  return (
    <View>
      {/* Hero */}
      <View style={[St.confirmHero, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[St.confirmIcon, { backgroundColor: '#2D8C6F' + '15' }]}>
          <CircleCheckBig size={36} color="#2D8C6F" />
        </View>
        <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt, marginTop: 14, textAlign: 'center' }}>
          Presque terminé !
        </Text>
        <Text style={{ fontSize: 14, fontFamily: FONTS.regular, color: c.txt2, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
          Vérifiez vos informations avant de soumettre votre dossier.{'\n'}
          Notre équipe validera votre compte sous 24–48h.
        </Text>
      </View>

      {/* Récapitulatif */}
      {sections.map((sec, si) => (
        <View key={si} style={[St.confirmSection, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={St.confirmSectionHeader}>
            <sec.Icon size={16} color={c.txt3} />
            <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.txt }}>{sec.title}</Text>
          </View>
          {sec.items.map((item, ii) => (
            <View key={ii} style={[St.confirmRow, { borderBottomColor: c.border, borderBottomWidth: ii < sec.items.length - 1 ? 1 : 0 }]}>
              <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt2, flex: 1 }}>{item.label}</Text>
              <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt, flex: 1.5, textAlign: 'right' }} numberOfLines={1}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      ))}

      {/* Info bannière */}
      <View style={[St.infoBanner, { backgroundColor: '#E8A838' + '12', borderColor: '#E8A838' + '30' }]}>
        <CircleAlert size={16} color="#E8A838" />
        <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: '#E8A838', flex: 1, lineHeight: 18 }}>
          Votre compte sera en attente de validation. Vous recevrez un email de confirmation une fois approuvé.
        </Text>
      </View>

      {/* Submit button */}
      <TouchableOpacity onPress={onSubmit} disabled={loading} activeOpacity={0.88} style={{ marginTop: 8, borderRadius: 14, overflow: 'hidden' }}>
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={St.submitBtn}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Check size={18} color="#fff" />
                <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: '#fff' }}>Soumettre l'inscription</Text>
                <ArrowRight size={18} color="#fff" />
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionTitle({ title, c, style }) {
  return (
    <View style={[{ marginBottom: 16, marginTop: 8 }, style]}>
      <View style={{ height: 1, backgroundColor: c.border, marginBottom: 12 }} />
      <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: c.txt3, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' }}>
        {title}
      </Text>
    </View>
  );
}

function FieldLabel({ text, c, style }) {
  return <Text style={[St.label, { color: c.txt2 }, style]}>{text}</Text>;
}

function ErrorText({ text }) {
  return <Text style={St.errorText}>{text}</Text>;
}

function FieldInput({ icon, placeholder, value, onChangeText, error, keyboardType, autoCapitalize, c }) {
  return (
    <View style={[St.inputRow, { backgroundColor: c.card, borderColor: error ? '#E05555' : c.border }]}>
      {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={c.placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        style={[St.input, { color: c.txt }]}
      />
    </View>
  );
}

function SelectPicker({ value, options, onSelect, c, fullWidth }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ position: 'relative', zIndex: open ? 99 : 1 }}>
      <TouchableOpacity
        onPress={() => setOpen(p => !p)}
        style={[St.selectBtn, { backgroundColor: c.card, borderColor: c.border, width: fullWidth ? '100%' : undefined }]}
      >
        <Text style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}>{value}</Text>
        <ChevronDown size={16} color={c.txt3} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {open && (
        <View style={[St.dropdownList, { backgroundColor: c.card, borderColor: c.border }]}>
          <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => { onSelect(opt); setOpen(false); }}
                style={[St.dropdownItem, { borderBottomColor: c.border, backgroundColor: value === opt ? c.blue + '12' : 'transparent' }]}
              >
                <Text style={{ fontSize: 14, fontFamily: value === opt ? FONTS.semibold : FONTS.regular, color: value === opt ? c.blue : c.txt }}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const DocUploadCard = memo(function DocUploadCard({ label, icon, file, onPress, error, c, dk }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 12, fontFamily: FONTS.medium, color: c.txt2, marginBottom: 8, textAlign: 'center' }}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        style={[
          St.docCard,
          {
            backgroundColor: c.card,
            borderColor: error ? '#E05555' : file ? '#2D8C6F' : c.border,
            borderStyle: file ? 'solid' : 'dashed',
          },
        ]}
      >
        {file ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <CircleCheckBig size={24} color="#2D8C6F" />
            <Text style={{ fontSize: 9, fontFamily: FONTS.medium, color: '#2D8C6F', textAlign: 'center' }} numberOfLines={2}>
              {file.name}
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            {icon}
            <Text style={{ fontSize: 11, fontFamily: FONTS.semibold, color: c.txt, textAlign: 'center' }}>{label}</Text>
            <Text style={{ fontSize: 9, color: c.txt3, textAlign: 'center' }}>JPG, PNG, PDF{'\n'}5MB max</Text>
          </View>
        )}
      </TouchableOpacity>
      {error && <Text style={[St.errorText, { textAlign: 'center', marginTop: 4 }]}>{error}</Text>}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const St = StyleSheet.create({
  // Stepper
  stepperWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 14, borderBottomWidth: 1 },
  stepItem:    { alignItems: 'center', gap: 4 },
  stepCircle:  { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepNum:     { fontSize: 12, fontFamily: FONTS.bold },
  stepLabel:   { fontSize: 9, fontFamily: FONTS.regular, textAlign: 'center', maxWidth: 56 },
  connector:   { flex: 1, height: 2, marginBottom: 14, marginHorizontal: 2 },

  // Footer
  footer:   { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
  backBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1 },
  nextBtn:  { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },

  // Fields
  row2:     { flexDirection: 'row', gap: 12, marginTop: 12 },
  row3:     { flexDirection: 'row', gap: 10 },
  label:    { fontSize: 13, fontFamily: FONTS.medium, marginBottom: 6, marginTop: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 50 },
  input:    { flex: 1, fontSize: 14, fontFamily: FONTS.regular },
  errorText:{ fontSize: 11, fontFamily: FONTS.regular, color: '#E05555', marginTop: 4 },
  selectBtn:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 50, gap: 8 },
  dropdownList: { position: 'absolute', top: 52, left: 0, right: 0, borderWidth: 1.5, borderRadius: 12, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, zIndex: 999 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1 },

  // Upload
  uploadZone: { borderWidth: 1.5, borderRadius: 14, borderStyle: 'dashed', paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', marginTop: 4 },
  plusCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  docCard:    { width: '100%', aspectRatio: 0.85, borderWidth: 1.5, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 8 },

  // Section
  sectionSub: { fontSize: 14, fontFamily: FONTS.regular, textAlign: 'center', marginBottom: 4, lineHeight: 20 },

  // Role cards
  roleCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1.5 },
  roleIcon:   { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  checkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // Radio
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },

  // Confirm
  confirmHero:    { borderRadius: 20, padding: 24, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  confirmIcon:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  confirmSection: { borderRadius: 16, padding: 16, borderWidth: 1, marginTop: 12 },
  confirmSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  confirmRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  infoBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 16 },
  submitBtn:      { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14 },
});