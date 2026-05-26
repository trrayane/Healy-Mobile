import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Switch, ActivityIndicator, TextInput, Image, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft, User, Lock, Bell, Globe, Moon, Sun,
  LogOut, Shield, CircleHelp, Info, Camera,
  Check, Eye, EyeOff, Building2, CircleCheck,
  Stethoscope, MapPin, MessageSquare, Save,
  Heart, ClipboardList, Users, Link as LinkIcon, ChevronRight, Navigation,
  Droplets, Weight, Ruler, TriangleAlert, FileText, Phone,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { T, FONTS, GRADIENTS } from '../../theme';
import { Avatar } from '../../components/shared';
import * as api from '../../services/api';

// ─── Helpers UI ────────────────────────────────────────────────────────────────
function SectionLabel({ children, c }) {
  return (
    <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: c.txt3,
      letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 }}>
      {children}
    </Text>
  );
}

function Block({ children, c }) {
  return (
    <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: 16, padding: 16, marginBottom: 16 }}>
      {children}
    </View>
  );
}

function FieldLabel({ children, c }) {
  return (
    <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: c.txt3,
      letterSpacing: 0.5, marginBottom: 6 }}>
      {children}
    </Text>
  );
}

function Field({ label, value, onChangeText, secureTextEntry, editable = true,
  keyboardType = 'default', placeholder, c, last = false }) {
  return (
    <View style={{ marginBottom: last ? 0 : 12 }}>
      <FieldLabel c={c}>{label}</FieldLabel>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={c.txt3}
        style={{
          backgroundColor: editable ? c.bg : c.card2,
          borderWidth: 1, borderColor: c.border,
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 14, fontFamily: FONTS.regular, color: editable ? c.txt : c.txt2,
        }}
      />
    </View>
  );
}

function RowItem({ icon: Icon, label, subtitle, color, right, onPress, c, noBorder }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={right ? 1 : 0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 13,
        borderBottomWidth: noBorder ? 0 : 1, borderBottomColor: c.border,
      }}
    >
      <View style={{ width: 38, height: 38, borderRadius: 11,
        backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: FONTS.medium, color: c.txt }}>{label}</Text>
        {subtitle ? <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right || null}
    </TouchableOpacity>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { userData, logout, accountType, updateUserData, avatarUri, setAvatarUri } = useAuth();
  const { dk, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const c = dk ? T.dark : T.light;

  // ── Form profil ────────────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState(userData?.first_name   || '');
  const [lastName,    setLastName]    = useState(userData?.last_name    || '');
  const [phone,       setPhone]       = useState(userData?.phone        || userData?.phone_number || '');
  const [mapsLink,    setMapsLink]    = useState('');
  const [savingProf,  setSavingProf]  = useState(false);
  const [savedProf,   setSavedProf]   = useState(false);

  // ── Form sécurité ──────────────────────────────────────────────────────────
  const [curPwd,      setCurPwd]      = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [showCur,     setShowCur]     = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [savingPwd,   setSavingPwd]   = useState(false);

  // ── Préférences ───────────────────────────────────────────────────────────
  const [notifs,      setNotifs]      = useState(true);
  const [messaging,   setMessaging]   = useState(true);

  // ── Déconnexion ───────────────────────────────────────────────────────────
  const [loggingOut,  setLoggingOut]  = useState(false);

  // ── Profil médical (patient uniquement) ───────────────────────────────────
  const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const [medLoading,        setMedLoading]        = useState(false);
  const [medSaving,         setMedSaving]         = useState(false);
  const [medSaved,          setMedSaved]          = useState(false);
  const [bloodGroup,        setBloodGroup]        = useState('');
  const [weight,            setWeight]            = useState('');
  const [height,            setHeight]            = useState('');
  const [allergies,         setAllergies]         = useState('');
  const [antecedents,       setAntecedents]       = useState('');
  const [chronicDiseases,   setChronicDiseases]   = useState('');
  const [emergencyContact,  setEmergencyContact]  = useState('');
  const [emergencyPhone,    setEmergencyPhone]    = useState('');

  useEffect(() => {
    // Charger le lien Maps sauvegardé
    AsyncStorage.getItem(`@maps_link_${accountType}`).then(v => {
      if (v) setMapsLink(v);
    });
    if (accountType === 'doctor') {
      AsyncStorage.getItem('@doctor_messaging_enabled').then(v => {
        if (v !== null) setMessaging(v === 'true');
      });
    }
    // Charger le profil médical (patient uniquement)
    if (accountType === 'patient') {
      loadMedicalProfile();
    }
  }, [accountType]);

  async function loadMedicalProfile() {
    setMedLoading(true);
    try {
      const data = await api.getMedicalProfile();
      if (data && typeof data === 'object') {
        setBloodGroup(data.blood_group || data.blood_type || '');
        setWeight(data.weight ? String(data.weight) : '');
        setHeight(data.height ? String(data.height) : '');
        setAllergies(
          Array.isArray(data.allergies)
            ? data.allergies.map(a => a.name || a.allergen || String(a)).join(', ')
            : data.allergies || ''
        );
        setAntecedents(
          Array.isArray(data.antecedents)
            ? data.antecedents.map(a => a.name || a.condition || String(a)).join(', ')
            : data.antecedents || data.medical_history || ''
        );
        setChronicDiseases(
          Array.isArray(data.chronic_diseases)
            ? data.chronic_diseases.join(', ')
            : data.chronic_diseases || data.maladies_chroniques || ''
        );
        setEmergencyContact(data.emergency_contact_name || data.emergency_contact || '');
        setEmergencyPhone(data.emergency_contact_phone || data.emergency_phone || '');
      }
    } catch {
      // silencieux — champs restent vides
    } finally {
      setMedLoading(false);
    }
  }

  async function saveMedicalProfile() {
    setMedSaving(true);
    try {
      await api.updateMedicalProfile({
        blood_group:              bloodGroup || null,
        weight:                   weight     ? parseFloat(weight)  : null,
        height:                   height     ? parseFloat(height)  : null,
        allergies:                allergies,
        antecedents:              antecedents,
        chronic_diseases:         chronicDiseases,
        emergency_contact_name:   emergencyContact,
        emergency_contact_phone:  emergencyPhone,
      });
      setMedSaved(true);
      setTimeout(() => setMedSaved(false), 2500);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder le profil médical. Réessayez.');
    } finally {
      setMedSaving(false);
    }
  }

  function toggleMessaging(val) {
    setMessaging(val);
    AsyncStorage.setItem('@doctor_messaging_enabled', val.toString());
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Accès galerie requis', 'Autorisez l\'accès à votre galerie photos.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await setAvatarUri(result.assets[0].uri);
    }
  }

  async function saveProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Champ requis', 'Le prénom et le nom sont obligatoires.');
      return;
    }
    setSavingProf(true);
    try {
      const updated = await api.updateMe({ first_name: firstName, last_name: lastName, phone_number: phone });
      if (updateUserData) updateUserData(updated);
      // Sauvegarder le lien Maps
      if (mapsLink.trim()) {
        await AsyncStorage.setItem(`@maps_link_${accountType}`, mapsLink.trim());
      } else {
        await AsyncStorage.removeItem(`@maps_link_${accountType}`);
      }
      setSavedProf(true);
      setTimeout(() => setSavedProf(false), 2500);
    } catch {
      if (mapsLink.trim()) {
        await AsyncStorage.setItem(`@maps_link_${accountType}`, mapsLink.trim());
      }
      setSavedProf(true);
      setTimeout(() => setSavedProf(false), 2500);
    } finally { setSavingProf(false); }
  }

  async function savePassword() {
    if (!curPwd)         { Alert.alert('Requis', 'Entrez votre mot de passe actuel.'); return; }
    if (newPwd.length < 6) { Alert.alert('Trop court', 'Au moins 6 caractères requis.'); return; }
    setSavingPwd(true);
    try {
      await api.changePassword({ old_password: curPwd, new_password: newPwd });
      setCurPwd(''); setNewPwd('');
      Alert.alert('Mot de passe mis à jour', 'Modifié avec succès.');
    } catch {
      Alert.alert('Erreur', 'Mot de passe actuel incorrect.');
    } finally { setSavingPwd(false); }
  }

  async function handleLogout() {
    Alert.alert('Se déconnecter', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: async () => {
        setLoggingOut(true);
        await logout();
      }},
    ]);
  }

  const fallbackRoute =
    accountType === 'doctor'      ? '/(app)/doctor/'
    : accountType === 'pharmacist'  ? '/(app)/pharmacist/'
    : accountType === 'caretaker'   ? '/(app)/caretaker/'
    : '/(app)/patient/';

  const roleLabel =
    accountType === 'doctor'      ? 'Médecin'
    : accountType === 'pharmacist'  ? 'Pharmacien'
    : accountType === 'caretaker'   ? 'Garde-malade'
    : accountType === 'admin'       ? 'Administrateur'
    : 'Patient';

  // Stats row selon rôle
  const stats = accountType === 'doctor' ? [
    { label: 'Spécialité', value: (userData?.specialty || 'Généraliste').split(' ')[0] },
    { label: 'Statut',     value: userData?.is_verified ? 'Vérifié ✓' : 'En attente'   },
    { label: 'Ville',      value: userData?.city || userData?.wilaya || 'Alger'          },
  ] : accountType === 'pharmacist' ? [
    { label: 'Rôle',  value: 'Pharmacien'   },
    { label: 'CNAS',  value: 'Conventionné' },
    { label: 'Ville', value: userData?.city || 'Alger' },
  ] : accountType === 'caretaker' ? [
    { label: 'Patients',  value: userData?.patients_count?.toString() || '3' },
    { label: 'Depuis',    value: userData?.date_joined ? new Date(userData.date_joined).getFullYear().toString() : '2024' },
    { label: 'Statut',    value: userData?.is_verified ? 'Vérifié ✓' : 'Actif' },
  ] : [
    { label: 'Membre depuis', value: userData?.date_joined ? new Date(userData.date_joined).getFullYear().toString() : '2024' },
    { label: 'Statut',        value: userData?.verification_status === 'approved' ? 'Vérifié' : 'En attente' },
    { label: 'Langue',        value: lang === 'fr' ? 'FR' : 'EN' },
  ];

  const certified = userData?.is_verified || userData?.verification_status === 'approved';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace(fallbackRoute)}
          style={{ padding: 10, marginLeft: -10 }}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ArrowLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: c.txt }]}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>

        {/* ── Hero gradient ── */}
        <LinearGradient colors={GRADIENTS.primary} style={S.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={S.avatarWrap}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#fff' }} resizeMode="cover" />
              : <Avatar firstName={userData?.first_name || ''} lastName={userData?.last_name || ''} size={84} />
            }
            <TouchableOpacity onPress={handlePickAvatar} style={S.cameraBtn}>
              <Camera size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={S.heroName}>
            {accountType === 'doctor' ? 'Dr. ' : ''}
            {userData?.first_name || firstName} {userData?.last_name || lastName}
          </Text>
          <Text style={S.heroEmail}>{userData?.email || ''}</Text>
          <View style={S.roleBadge}>
            <Text style={{ color: '#fff', fontSize: 12, fontFamily: FONTS.bold }}>{roleLabel}</Text>
          </View>
        </LinearGradient>

        {/* ── Stats row ── */}
        <View style={[S.statsRow, { backgroundColor: c.card, borderColor: c.border }]}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={{ width: 1, backgroundColor: c.border }} />}
              <View style={S.statItem}>
                <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: c.txt, marginBottom: 2 }} numberOfLines={1}>{s.value}</Text>
                <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt2 }}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <View style={{ padding: 16 }}>

          {/* ══ SECTION RÔLE-SPÉCIFIQUE ══════════════════════════════════════ */}

          {/* MÉDECIN — Cabinet */}
          {accountType === 'doctor' && (
            <View style={{ marginBottom: 8 }}>
              <SectionLabel c={c}>Cabinet médical</SectionLabel>
              <Block c={c}>
                <RowItem icon={Stethoscope} label={userData?.specialty || 'Médecin généraliste'}
                  subtitle="Spécialité" color={c.blue} c={c} onPress={() => {}} />
                <RowItem icon={MapPin} label={userData?.city || userData?.wilaya || 'Alger'}
                  subtitle="Ville d'exercice" color={c.purple} c={c} onPress={() => {}} />
                {mapsLink ? (
                  <RowItem icon={LinkIcon}
                    label="Voir mon cabinet sur Maps"
                    subtitle={mapsLink.length > 40 ? mapsLink.substring(0, 40) + '…' : mapsLink}
                    color={c.green} c={c}
                    onPress={() => Linking.openURL(mapsLink)}
                    right={<ChevronRight size={16} color={c.txt3} />}
                  />
                ) : null}
                <RowItem icon={Shield}
                  label={certified ? 'Compte vérifié' : 'En attente de vérification'}
                  subtitle="Statut de certification"
                  color={certified ? c.green : c.amber} c={c} onPress={() => {}} noBorder />
              </Block>

              {/* ── Carte localisation cabinet ── */}
              <SectionLabel c={c}>Localisation du cabinet</SectionLabel>
              <View style={{ backgroundColor: c.card, borderWidth: 1, borderColor: c.border, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
                {/* En-tête */}
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#10B98118', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.txt, fontFamily: FONTS.semibold, fontSize: 15 }}>Mon cabinet</Text>
                    <Text style={{ color: c.txt2, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                      {userData?.address || userData?.cabinet_address ||
                       (userData?.city ? `Cabinet Dr. ${userData?.last_name || ''}, ${userData?.city}` : 'Adresse non renseignée')}
                    </Text>
                  </View>
                </View>

                {/* Carte statique simulée */}
                <View style={{ height: 110, backgroundColor: '#E8F4F8', marginHorizontal: 14,
                  borderRadius: 12, overflow: 'hidden', marginBottom: 12, position: 'relative' }}>
                  <View style={{ flex: 1, backgroundColor: '#D4E8D4' }}>
                    {[0,1,2,3].map(i => (
                      <View key={i} style={{ position: 'absolute', top: i * 28, left: 0, right: 0,
                        height: 1, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                    ))}
                    {[0,1,2,3,4].map(i => (
                      <View key={i} style={{ position: 'absolute', left: i * 60, top: 0, bottom: 0,
                        width: 1, backgroundColor: 'rgba(255,255,255,0.5)' }} />
                    ))}
                    <View style={{ position: 'absolute', top: 55, left: 0, right: 0, height: 10,
                      backgroundColor: '#fff', opacity: 0.7 }} />
                    <View style={{ position: 'absolute', left: 100, top: 0, bottom: 0, width: 8,
                      backgroundColor: '#fff', opacity: 0.7 }} />
                    <View style={{ position: 'absolute', top: '50%', left: '50%',
                      transform: [{ translateX: -14 }, { translateY: -30 }], alignItems: 'center' }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4444',
                        alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
                        <MapPin size={14} color="#fff" />
                      </View>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginTop: -1 }} />
                    </View>
                  </View>
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                    backgroundColor: 'rgba(0,0,0,0.25)', padding: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontFamily: FONTS.semibold, textAlign: 'center' }}>
                      {mapsLink ? 'Lien Maps configuré ✓' : 'Aperçu de localisation — renseignez le lien ci-dessous'}
                    </Text>
                  </View>
                </View>

                {/* Bouton itinéraire */}
                <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
                  <TouchableOpacity
                    onPress={() => {
                      const address = userData?.address || userData?.cabinet_address ||
                        (userData?.city ? `Cabinet Dr. ${userData?.last_name || ''}, ${userData?.city}` : null);
                      const url = mapsLink ||
                        (address
                          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
                          : 'https://maps.google.com');
                      Linking.openURL(url).catch(() => {});
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                      gap: 6, backgroundColor: '#304B71', borderRadius: 10, paddingVertical: 10 }}>
                    <Navigation size={15} color="#fff" />
                    <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 13 }}>Ouvrir l'itinéraire</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <SectionLabel c={c}>Messagerie</SectionLabel>
              <Block c={c}>
                <RowItem icon={MessageSquare} label="Messagerie patients"
                  subtitle={messaging ? 'Les patients peuvent vous écrire' : 'Messagerie désactivée'}
                  color={c.blue} c={c} noBorder onPress={() => {}}
                  right={
                    <Switch value={messaging} onValueChange={toggleMessaging}
                      trackColor={{ false: c.border2, true: c.blue + '80' }}
                      thumbColor={messaging ? c.blue : '#f4f3f4'} />
                  }
                />
              </Block>
            </View>
          )}

          {/* PHARMACIEN — Officine */}
          {accountType === 'pharmacist' && (
            <View style={{ marginBottom: 8 }}>
              <SectionLabel c={c}>Officine</SectionLabel>
              <Block c={c}>
                <RowItem icon={Building2} label="Connexion CNAS active"
                  subtitle="Conventionné · Dernière sync aujourd'hui"
                  color={c.green} c={c} onPress={() => {}} />
                {mapsLink ? (
                  <RowItem icon={LinkIcon}
                    label="Voir ma pharmacie sur Maps"
                    subtitle={mapsLink.length > 40 ? mapsLink.substring(0, 40) + '…' : mapsLink}
                    color={c.green} c={c}
                    onPress={() => Linking.openURL(mapsLink)}
                    right={<ChevronRight size={16} color={c.txt3} />}
                  />
                ) : null}
                <RowItem icon={CircleCheck} label="Pharmacie agréée"
                  subtitle="Ministère de la Santé · Algérie"
                  color={c.blue} c={c} noBorder onPress={() => {}} />
              </Block>
            </View>
          )}

          {/* GARDE-MALADE — Soins à domicile */}
          {accountType === 'caretaker' && (
            <View style={{ marginBottom: 8 }}>
              <SectionLabel c={c}>Soins à domicile</SectionLabel>
              <Block c={c}>
                <RowItem icon={Users} label="3 patients suivis"
                  subtitle="Fatima Bouali · Abdelkader Mekki · Zohra Hadj Ali"
                  color={'#7B5EA7'} c={c} onPress={() => {}} />
                <RowItem icon={ClipboardList} label="Plan de soins actif"
                  subtitle="Médicaments · Tâches quotidiennes · Bilans"
                  color={c.blue} c={c} onPress={() => {}} />
                <RowItem icon={Heart} label="Spécialités"
                  subtitle="Personnes âgées · Post-opératoire · Diabétiques"
                  color={c.red} c={c} noBorder onPress={() => {}} />
              </Block>
            </View>
          )}

          {/* ══ PROFIL — champs modifiables ══════════════════════════════════ */}
          <SectionLabel c={c}>Profil</SectionLabel>
          <Block c={c}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel c={c}>PRÉNOM</FieldLabel>
                <TextInput value={firstName} onChangeText={setFirstName}
                  placeholder="Prénom" placeholderTextColor={c.txt3}
                  style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FieldLabel c={c}>NOM</FieldLabel>
                <TextInput value={lastName} onChangeText={setLastName}
                  placeholder="Nom" placeholderTextColor={c.txt3}
                  style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                />
              </View>
            </View>
            <Field label="EMAIL" value={userData?.email || ''} editable={false} c={c} placeholder="email@exemple.com" />
            <Field label="TÉLÉPHONE" value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" c={c} placeholder="0555 00 00 00" />
            {/* Lien Maps — uniquement pour les professionnels */}
            {(accountType === 'doctor' || accountType === 'pharmacist') && (
              <View style={{ marginBottom: 0 }}>
                <FieldLabel c={c}>LIEN GOOGLE MAPS (ADRESSE DE TRAVAIL)</FieldLabel>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1,
                  borderColor: mapsLink ? c.green : c.border, borderRadius: 12,
                  paddingHorizontal: 12, paddingVertical: 11, backgroundColor: c.bg, gap: 8 }}>
                  <LinkIcon size={16} color={mapsLink ? c.green : c.txt3} />
                  <TextInput
                    value={mapsLink}
                    onChangeText={setMapsLink}
                    placeholder="https://maps.google.com/..."
                    placeholderTextColor={c.txt3}
                    keyboardType="url"
                    autoCapitalize="none"
                    style={{ flex: 1, fontSize: 13, fontFamily: FONTS.regular, color: c.txt }}
                  />
                  {mapsLink ? (
                    <TouchableOpacity onPress={() => Linking.openURL(mapsLink)}>
                      <MapPin size={16} color={c.green} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={{ fontSize: 11, color: c.txt3, marginTop: 4, marginLeft: 2 }}>
                  Copiez le lien depuis Google Maps → Partager → Copier le lien
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={saveProfile} disabled={savingProf}
              style={{ backgroundColor: c.blue, borderRadius: 12, paddingVertical: 13,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 }}>
              {savingProf
                ? <ActivityIndicator color="#fff" size="small" />
                : savedProf
                  ? <><Check size={16} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Sauvegardé !</Text></>
                  : <><Save size={16} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Enregistrer les modifications</Text></>
              }
            </TouchableOpacity>
          </Block>

          {/* ══ PROFIL MÉDICAL (patient uniquement) ══════════════════════════ */}
          {accountType === 'patient' && (
            <>
              <SectionLabel c={c}>Profil médical</SectionLabel>
              <Block c={c}>
                {medLoading ? (
                  <ActivityIndicator color={c.blue} style={{ marginVertical: 10 }} />
                ) : (
                  <>
                    {/* ── Groupe sanguin ── */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Droplets size={14} color="#E05555" />
                        <FieldLabel c={c}>GROUPE SANGUIN</FieldLabel>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {BLOOD_GROUPS.map(bg => (
                          <TouchableOpacity
                            key={bg}
                            onPress={() => setBloodGroup(bg === bloodGroup ? '' : bg)}
                            style={{
                              paddingHorizontal: 16, paddingVertical: 9,
                              borderRadius: 10, borderWidth: 1.5,
                              backgroundColor: bloodGroup === bg ? '#E05555' : c.bg,
                              borderColor:     bloodGroup === bg ? '#E05555' : c.border,
                            }}
                          >
                            <Text style={{
                              fontSize: 14, fontFamily: FONTS.bold,
                              color: bloodGroup === bg ? '#fff' : c.txt,
                            }}>{bg}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* ── Poids & Taille ── */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Weight size={13} color={c.blue} />
                          <FieldLabel c={c}>POIDS (kg)</FieldLabel>
                        </View>
                        <TextInput
                          value={weight}
                          onChangeText={setWeight}
                          placeholder="Ex: 70"
                          placeholderTextColor={c.txt3}
                          keyboardType="decimal-pad"
                          style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                            fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Ruler size={13} color={c.blue} />
                          <FieldLabel c={c}>TAILLE (cm)</FieldLabel>
                        </View>
                        <TextInput
                          value={height}
                          onChangeText={setHeight}
                          placeholder="Ex: 175"
                          placeholderTextColor={c.txt3}
                          keyboardType="decimal-pad"
                          style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                            borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                            fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                        />
                      </View>
                    </View>

                    {/* ── Allergies ── */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <TriangleAlert size={13} color="#F59E0B" />
                        <FieldLabel c={c}>ALLERGIES</FieldLabel>
                      </View>
                      <TextInput
                        value={allergies}
                        onChangeText={setAllergies}
                        placeholder="Ex: Pénicilline, Arachides, Aspirine..."
                        placeholderTextColor={c.txt3}
                        multiline
                        numberOfLines={3}
                        style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                          fontSize: 14, fontFamily: FONTS.regular, color: c.txt,
                          textAlignVertical: 'top', minHeight: 70 }}
                      />
                      <Text style={{ fontSize: 11, color: c.txt3, marginTop: 4 }}>
                        Séparez les allergies par une virgule
                      </Text>
                    </View>

                    {/* ── Antécédents médicaux ── */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <FileText size={13} color={c.purple} />
                        <FieldLabel c={c}>ANTÉCÉDENTS MÉDICAUX</FieldLabel>
                      </View>
                      <TextInput
                        value={antecedents}
                        onChangeText={setAntecedents}
                        placeholder="Ex: Hypertension, Diabète type 2, Opération appendicite 2018..."
                        placeholderTextColor={c.txt3}
                        multiline
                        numberOfLines={3}
                        style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                          fontSize: 14, fontFamily: FONTS.regular, color: c.txt,
                          textAlignVertical: 'top', minHeight: 70 }}
                      />
                    </View>

                    {/* ── Maladies chroniques ── */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Heart size={13} color="#E05555" />
                        <FieldLabel c={c}>MALADIES CHRONIQUES</FieldLabel>
                      </View>
                      <TextInput
                        value={chronicDiseases}
                        onChangeText={setChronicDiseases}
                        placeholder="Ex: Asthme, Insuffisance rénale..."
                        placeholderTextColor={c.txt3}
                        multiline
                        numberOfLines={2}
                        style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                          fontSize: 14, fontFamily: FONTS.regular, color: c.txt,
                          textAlignVertical: 'top', minHeight: 55 }}
                      />
                    </View>

                    {/* ── Contact d'urgence ── */}
                    <View style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Phone size={13} color={c.green} />
                        <FieldLabel c={c}>CONTACT D'URGENCE</FieldLabel>
                      </View>
                      <TextInput
                        value={emergencyContact}
                        onChangeText={setEmergencyContact}
                        placeholder="Nom du contact (Ex: Mère, Époux...)"
                        placeholderTextColor={c.txt3}
                        style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                          fontSize: 14, fontFamily: FONTS.regular, color: c.txt, marginBottom: 8 }}
                      />
                      <TextInput
                        value={emergencyPhone}
                        onChangeText={setEmergencyPhone}
                        placeholder="Téléphone (Ex: 0555 00 00 00)"
                        placeholderTextColor={c.txt3}
                        keyboardType="phone-pad"
                        style={{ backgroundColor: c.bg, borderWidth: 1, borderColor: c.border,
                          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
                          fontSize: 14, fontFamily: FONTS.regular, color: c.txt }}
                      />
                    </View>

                    {/* ── Bouton sauvegarder ── */}
                    <TouchableOpacity
                      onPress={saveMedicalProfile}
                      disabled={medSaving}
                      style={{ backgroundColor: '#E05555', borderRadius: 12, paddingVertical: 13,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {medSaving
                        ? <ActivityIndicator color="#fff" size="small" />
                        : medSaved
                          ? <><Check size={16} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Sauvegardé !</Text></>
                          : <><Save size={16} color="#fff" /><Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 15 }}>Enregistrer le profil médical</Text></>
                      }
                    </TouchableOpacity>
                  </>
                )}
              </Block>
            </>
          )}

          {/* ══ SÉCURITÉ ══════════════════════════════════════════════════════ */}
          <SectionLabel c={c}>Sécurité</SectionLabel>
          <Block c={c}>
            <FieldLabel c={c}>MOT DE PASSE ACTUEL</FieldLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 }}>
              <TextInput value={curPwd} onChangeText={setCurPwd} secureTextEntry={!showCur}
                placeholder="••••••••" placeholderTextColor={c.txt3}
                style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }} />
              <TouchableOpacity onPress={() => setShowCur(p => !p)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                {showCur ? <EyeOff size={18} color={c.txt3} /> : <Eye size={18} color={c.txt3} />}
              </TouchableOpacity>
            </View>
            <FieldLabel c={c}>NOUVEAU MOT DE PASSE</FieldLabel>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
              <TextInput value={newPwd} onChangeText={setNewPwd} secureTextEntry={!showNew}
                placeholder="Min. 6 caractères" placeholderTextColor={c.txt3}
                style={{ flex: 1, fontSize: 14, fontFamily: FONTS.regular, color: c.txt }} />
              <TouchableOpacity onPress={() => setShowNew(p => !p)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                {showNew ? <EyeOff size={18} color={c.txt3} /> : <Eye size={18} color={c.txt3} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={savePassword} disabled={savingPwd}
              style={{ backgroundColor: c.card2, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingVertical: 13,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {savingPwd
                ? <ActivityIndicator color={c.txt2} size="small" />
                : <><Lock size={15} color={c.txt2} /><Text style={{ color: c.txt2, fontFamily: FONTS.bold, fontSize: 14 }}>Mettre à jour le mot de passe</Text></>
              }
            </TouchableOpacity>
          </Block>

          {/* ══ PRÉFÉRENCES ══════════════════════════════════════════════════ */}
          <SectionLabel c={c}>Préférences</SectionLabel>
          <Block c={c}>
            <RowItem icon={dk ? Sun : Moon} label={dk ? 'Mode clair' : 'Mode sombre'}
              subtitle={dk ? 'Passer en thème clair' : 'Passer en thème sombre'}
              color={c.amber} c={c} onPress={toggleTheme}
              right={
                <Switch value={dk} onValueChange={toggleTheme}
                  trackColor={{ false: c.border, true: c.blue + '80' }}
                  thumbColor={dk ? c.blue : '#f4f3f4'} />
              }
            />
            <RowItem icon={Globe} label="Langue"
              subtitle={lang === 'fr' ? 'Français' : 'English'}
              color={c.blue} c={c}
              onPress={() => Alert.alert('Langue', 'Choisissez votre langue', [
                { text: 'Français', onPress: () => setLang('fr') },
                { text: 'English',  onPress: () => setLang('en') },
                { text: 'Annuler',  style: 'cancel' },
              ])}
            />
            <RowItem icon={Bell} label="Notifications"
              subtitle={notifs ? 'Activées' : 'Désactivées'}
              color={c.red} c={c} noBorder onPress={() => {}}
              right={
                <Switch value={notifs} onValueChange={setNotifs}
                  trackColor={{ false: c.border, true: c.blue + '80' }}
                  thumbColor={notifs ? c.blue : '#f4f3f4'} />
              }
            />
          </Block>

          {/* ══ SUPPORT ══════════════════════════════════════════════════════ */}
          <SectionLabel c={c}>Support</SectionLabel>
          <Block c={c}>
            <RowItem icon={CircleHelp} label="Centre d'aide"
              subtitle="support@healy.dz · +213 23 00 00 00"
              color={c.green} c={c}
              onPress={() => Alert.alert('Centre d\'aide', 'Email : support@healy.dz\nTel : +213 23 00 00 00\n\nLun – Ven  8h – 17h', [{ text: 'Fermer' }])}
            />
            <RowItem icon={Shield} label="Confidentialité" color={c.purple} c={c}
              onPress={() => Alert.alert('Confidentialité',
                'Vos données sont protégées conformément au RGPD et à la réglementation algérienne.\n\nAucune donnée médicale n\'est partagée sans votre consentement.', [{ text: 'OK' }])}
            />
            <RowItem icon={Info} label="À propos de Healy"
              subtitle="Version 2.1.0 · © 2025 Healy"
              color={c.txt3} c={c} noBorder
              onPress={() => Alert.alert('Healy Mobile', 'Version 2.1.0\n\nPlateforme de santé connectée pour l\'Algérie.\n\n© 2025 Healy Health Technologies', [{ text: 'Fermer' }])}
            />
          </Block>

          {/* ══ DÉCONNEXION ══════════════════════════════════════════════════ */}
          <TouchableOpacity onPress={handleLogout} disabled={loggingOut}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
              backgroundColor: c.red + '15', borderWidth: 1, borderColor: c.red + '40',
              borderRadius: 14, paddingVertical: 15, marginTop: 4, marginBottom: 8 }}>
            {loggingOut
              ? <ActivityIndicator color={c.red} size="small" />
              : <LogOut size={18} color={c.red} />
            }
            <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.red }}>Se déconnecter</Text>
          </TouchableOpacity>

          <Text style={{ textAlign: 'center', fontSize: 11, fontFamily: FONTS.regular, color: c.txt3, lineHeight: 18 }}>
            Healy Mobile v2.1.0{'\n'}Plateforme de santé connectée · Algérie
          </Text>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: FONTS.bold, textAlign: 'center' },
  hero:      { alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24 },
  avatarWrap:{ position: 'relative', marginBottom: 14 },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#304B71', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  heroName:  { color: '#fff', fontSize: 22, fontFamily: FONTS.extrabold, marginBottom: 4 },
  heroEmail: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontFamily: FONTS.regular, marginBottom: 10 },
  roleBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999 },
  statsRow:  { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1 },
  statItem:  { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
});
