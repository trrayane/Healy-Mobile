import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Brain, Calendar, FileText, Shield, Users,
  ChevronRight, Stethoscope, Pill, Heart,
  Clock, Zap, MessageSquare, Bell, Lock, ClipboardList,
  Check, Eye, Star, MapPin, Activity,
  House, User,
} from 'lucide-react-native';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { FONTS, GRADIENTS } from '../src/theme';
import { LoadingScreen } from '../src/components/ui';

const { width: W } = Dimensions.get('window');

// ─── Palette fixe landing (toujours claire) ───────────────────────────────────
const LP = {
  bg:      '#FFFFFF',
  bg2:     '#F8FAFC',
  bg3:     '#F0F4F8',
  txt:     '#0D1B35',
  txt2:    '#4B5563',
  txt3:    '#9CA3AF',
  navy:    '#1B2B4B',
  blue:    '#304B71',
  border:  '#E5EAF0',
  card:    '#FFFFFF',
  green:   '#059669',
  purple:  '#7C3AED',
  amber:   '#D97706',
  red:     '#DC2626',
};

// ─── Routage ──────────────────────────────────────────────────────────────────
function getRoute(userData) {
  const role = (
    userData?.role || userData?.account_type || userData?.user_type || ''
  ).toLowerCase().trim();

  if (role === 'admin' || role === 'administrator') return '/(app)/admin';
  if (role === 'patient') return '/(app)/patient';

  // Médecin
  if (role === 'doctor' || role === 'médecin' || role === 'medecin') return '/(app)/doctor';
  // Pharmacien
  if (role === 'pharmacist' || role === 'pharmacien') return '/(app)/pharmacist';
  // Garde-malade
  if (role === 'caretaker' || role === 'garde-malade' || role === 'garde_malade') return '/(app)/caretaker';

  // Ancienne valeur "personnel médical" → vérifier sub_role
  if (role === 'personnel médical' || role === 'personnel_medical' || role === 'medical_staff') {
    const sub = (userData?.sub_role || '').toLowerCase().trim();
    if (sub === 'pharmacist' || sub === 'pharmacien') return '/(app)/pharmacist';
    if (sub === 'caretaker'  || sub === 'garde-malade') return '/(app)/caretaker';
    return '/(app)/doctor';
  }

  // Fallback sécurisé : patient
  return '/(app)/patient';
}

export default function LandingScreen() {
  const { isAuthenticated, userData, loading } = useAuth();
  React.useEffect(() => {
    if (loading) return;
    if (isAuthenticated) router.replace(getRoute(userData));
  }, [isAuthenticated, loading, userData]);

  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return null;
  return <LandingContent />;
}

// ═════════════════════════════════════════════════════════════════════════════
function LandingContent() {
  return (
    <View style={{ flex: 1, backgroundColor: LP.bg }}>
      <StatusBar barStyle="dark-content" backgroundColor={LP.bg} />
      <Navbar />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 108 }}>
        <HeroSection />
        <StatsRow />
        <RolesSection />
        <FeaturesListSection />
        <SpecialistsSection />
        <BookingSection />
        <PrescriptionsSection />
        <FeaturesGridSection />
        <CTASection />
        <FooterSection />
      </ScrollView>
    </View>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <View style={S.navbar}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <LinearGradient colors={GRADIENTS.primary} style={S.logoBox}>
          <Text style={{ color: '#fff', fontSize: 14, fontFamily: FONTS.bold }}>+</Text>
        </LinearGradient>
        <Text style={{ fontSize: 19, fontFamily: FONTS.bold, color: LP.navy }}>Healy</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={() => router.push('/auth/login')} style={S.navOutline}>
          <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: LP.navy }}>Connexion</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/auth/register')} style={S.navFill}>
          <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: '#fff' }}>Commencer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <View style={[S.section, { paddingTop: 36, paddingBottom: 0 }]}>
      {/* Badge */}
      <View style={[S.badge, { backgroundColor: 'rgba(176,138,255,0.14)', gap: 6 }]}>
        <Zap size={11} color="#7c5cff" />
        <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: '#7c5cff', letterSpacing: 0.1 }}>
          Plateforme de santé intelligente N°1 en Algérie
        </Text>
      </View>

      {/* Titre */}
      <Text style={S.heroTitle}>
        Votre santé,{'\n'}<Text style={{ color: '#2d3b5f' }}>digitalisée.</Text>
      </Text>
      <Text style={S.heroSub}>
        Prenez rendez-vous, consultez vos ordonnances et bénéficiez d'analyses IA — tout depuis votre téléphone.
      </Text>

      {/* Boutons */}
      <View style={{ gap: 12, marginTop: 24 }}>
        <TouchableOpacity onPress={() => router.push('/auth/register')} activeOpacity={0.9}>
          <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.ctaFill}>
            <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: '#fff' }}>Créer un compte gratuit</Text>
            <ChevronRight size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/auth/login')} style={S.ctaOutline} activeOpacity={0.8}>
          <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: LP.txt }}>Se connecter</Text>
        </TouchableOpacity>
      </View>

      {/* ── Phone stage + floaters ── */}
      <View style={{ marginTop: 32, height: 300, alignItems: 'center', justifyContent: 'flex-end', position: 'relative', width: '100%' }}>

        {/* Floater gauche — RDV confirmé */}
        <View style={{
          position: 'absolute', left: 0, top: 24, zIndex: 1,
          transform: [{ rotate: '-6deg' }],
          backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          shadowColor: '#1e2a5e', shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15, shadowRadius: 28, elevation: 8,
        }}>
          <View style={{ width: 28, height: 28, borderRadius: 9,
            backgroundColor: 'rgba(78,213,168,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={14} color="#2bb88c" strokeWidth={2.5} />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: '#1e2a5e' }}>RDV confirmé</Text>
            <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: '#5b6585' }}>Mardi · 14:30</Text>
          </View>
        </View>

        {/* Floater droit — Analyse IA */}
        <View style={{
          position: 'absolute', right: -14, top: 132, zIndex: 1,
          transform: [{ rotate: '5deg' }],
          backgroundColor: '#fff', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          shadowColor: '#1e2a5e', shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.15, shadowRadius: 28, elevation: 8,
        }}>
          <View style={{ width: 28, height: 28, borderRadius: 9,
            backgroundColor: 'rgba(176,138,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
            <Star size={13} color="#7c5cff" fill="#7c5cff" />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: '#1e2a5e' }}>Analyse IA</Text>
            <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: '#5b6585' }}>3 hypothèses</Text>
          </View>
        </View>

        {/* Phone */}
        <View style={[S.phoneMockup, { zIndex: 2 }]}>
          {/* Notch */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 10, alignItems: 'center', zIndex: 5 }}>
            <View style={{ width: 90, height: 22, borderRadius: 14, backgroundColor: '#14193a' }} />
          </View>
          <LinearGradient colors={['#2d3b5f', '#1e2a5e']} style={S.phoneScreen}>
            <Text style={{ fontSize: 9, color: '#8a93b0', fontFamily: FONTS.bold, letterSpacing: 0.6 }}>LUNDI 18 MAI</Text>
            <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: '#fff', marginTop: 4, letterSpacing: -0.3 }}>Bonjour, Rayane</Text>

            {/* AI card */}
            <View style={{
              marginTop: 14, padding: 12, borderRadius: 14,
              backgroundColor: 'rgba(142,168,255,0.15)',
              borderWidth: 1, borderColor: 'rgba(142,168,255,0.25)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Activity size={11} color="#8ea8ff" />
                <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: '#fff' }}>Analyse IA</Text>
              </View>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', fontFamily: FONTS.regular, lineHeight: 14 }}>
                Décrivez vos symptômes…
              </Text>
            </View>

            {/* Mini stats row */}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
              {[
                { lbl: 'PROCHAIN RDV', val: 'Mardi',    color: '#fff'     },
                { lbl: 'ORDONNANCES',  val: '2 actives', color: '#4ed5a8' },
              ].map((s, i) => (
                <View key={i} style={{
                  flex: 1, padding: 8, borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
                }}>
                  <Text style={{ fontSize: 7, color: '#8a93b0', fontFamily: FONTS.bold, letterSpacing: 0.5 }}>{s.lbl}</Text>
                  <Text style={{ fontSize: 11, fontFamily: FONTS.bold, color: s.color, marginTop: 3 }}>{s.val}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsRow() {
  return (
    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: LP.border }}>
      {[{ v: '50K+', l: 'Patients' }, { v: '1200+', l: 'Médecins' }, { v: '98%', l: 'Satisfaction' }].map((s, i) => (
        <React.Fragment key={s.l}>
          {i > 0 && <View style={{ width: 1, backgroundColor: LP.border }} />}
          <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
            <Text style={{ fontSize: 24, fontFamily: FONTS.extrabold, color: LP.navy }}>{s.v}</Text>
            <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2, marginTop: 2 }}>{s.l}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Quatre rôles ─────────────────────────────────────────────────────────────
const ROLES_DATA = [
  {
    key: 'patient', label: 'Patient',
    icon: User, iconColor: '#4A6FA5', iconBg: '#EEF3FB',
    title: 'Conçu pour les patients',
    desc: 'Prenez rendez-vous, consultez l\'IA, gardez vos ordonnances dans votre poche.',
    bullets: ['Diagnostic IA en moins de 30s', 'Trouver un médecin par spécialité', 'Ordonnances QR partageables', 'Garde-malade à domicile'],
  },
  {
    key: 'doctor', label: 'Médecin',
    icon: Stethoscope, iconColor: '#059669', iconBg: '#ECFDF5',
    title: 'Pensé pour les médecins',
    desc: 'Gérez votre cabinet — planning, patients, ordonnances — en un clic.',
    bullets: ['Planning intelligent + rappels SMS', 'Dossier patient consolidé', 'Ordonnances numériques rapides', 'Statistiques de votre cabinet'],
  },
  {
    key: 'pharmacist', label: 'Pharmacien',
    icon: Pill, iconColor: '#7C3AED', iconBg: '#F5F3FF',
    title: 'Outillé pour les pharmaciens',
    desc: 'Scannez, dispensez, suivez votre stock et vos remboursements CNAS.',
    bullets: ['Scan QR ordonnance instantané', 'Stock + alertes automatiques', 'Remboursements CNAS suivis', 'Statistiques de ventes'],
  },
  {
    key: 'caretaker', label: 'Garde-malade',
    icon: Heart, iconColor: '#E05577', iconBg: '#FFF1F4',
    title: 'Conçu pour les garde-malades',
    desc: 'Patients assignés, planning de soins, traitements, urgences — tout au même endroit.',
    bullets: ['Patients à charge en un coup d\'œil', 'Offres de mission à proximité', 'Planning médicaments + alertes', 'Contacts d\'urgence (SAMU 15)'],
  },
];

function RolesSection() {
  const [active, setActive] = useState('patient');
  const role = ROLES_DATA.find(r => r.key === active);

  return (
    <View style={[S.section, { backgroundColor: LP.bg2 }]}>
      <Pill2 label="Pour qui" />
      <Text style={S.title}>Une plateforme,{'\n'}quatre rôles.</Text>
      <Text style={S.subtitle}>
        Patients, médecins, pharmaciens et garde-malades — Healy connecte tout l'écosystème santé en Algérie.
      </Text>

      {/* Tabs 2×2 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20, marginBottom: 18 }}>
        {ROLES_DATA.map(r => {
          const isActive = r.key === active;
          return (
            <TouchableOpacity
              key={r.key}
              onPress={() => setActive(r.key)}
              style={{
                width: (W - 56) / 2,
                paddingVertical: 10, paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: isActive ? LP.card : 'transparent',
                borderWidth: isActive ? 0 : 0,
                alignItems: 'center',
                shadowColor: isActive ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isActive ? 0.08 : 0,
                shadowRadius: isActive ? 8 : 0,
                elevation: isActive ? 3 : 0,
              }}
              activeOpacity={0.7}
            >
              <Text style={{
                fontSize: 14,
                fontFamily: isActive ? FONTS.bold : FONTS.regular,
                color: isActive ? LP.navy : LP.txt2,
              }}>{r.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Carte rôle */}
      {role && (
        <View style={{ backgroundColor: LP.card, borderRadius: 20, padding: 20,
          shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.07, shadowRadius: 16, elevation: 4 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13,
            backgroundColor: role.iconBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <role.icon size={22} color={role.iconColor} />
          </View>
          <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: LP.txt, marginBottom: 6 }}>{role.title}</Text>
          <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: LP.txt2, lineHeight: 20, marginBottom: 16 }}>{role.desc}</Text>
          {role.bullets.map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Check size={15} color={LP.green} strokeWidth={2.5} />
              <Text style={{ fontSize: 14, fontFamily: FONTS.medium, color: LP.txt }}>{b}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Features liste ────────────────────────────────────────────────────────────
const FEATURES_LIST = [
  { icon: Activity,     color: '#7C3AED', bg: '#F5F3FF', title: 'Analyse IA des symptômes',    desc: 'Hypothèses diagnostiques et orientations en quelques secondes.' },
  { icon: FileText,     color: '#059669', bg: '#ECFDF5', title: 'Ordonnances numériques',       desc: 'Recevez et partagez vos ordonnances par QR code sécurisé.' },
  { icon: Calendar,     color: '#4A6FA5', bg: '#EEF3FB', title: 'Rendez-vous en ligne',         desc: 'Réservez avec votre médecin préféré en quelques secondes.' },
  { icon: MessageSquare,color: '#D97706', bg: '#FFFBEB', title: 'Messagerie sécurisée',         desc: 'Communiquez directement avec votre équipe médicale.' },
  { icon: House,         color: '#E05577', bg: '#FFF1F4', title: 'Garde-malade à domicile',      desc: 'Trouvez un aide-soignant certifié près de chez vous.' },
];

function FeaturesListSection() {
  return (
    <View style={S.section}>
      <Pill2 label="Fonctionnalités" color="#2d3b5f" bg="rgba(42,78,207,0.10)" />
      <Text style={S.title}>La santé de demain,{'\n'}aujourd'hui.</Text>
      <Text style={S.subtitle}>Cinq piliers pour une expérience santé fluide et connectée.</Text>
      <View style={{ marginTop: 20, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: LP.border }}>
        {FEATURES_LIST.map((f, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'center', gap: 14,
            padding: 16,
            borderBottomWidth: i < FEATURES_LIST.length - 1 ? 1 : 0,
            borderBottomColor: LP.border,
            backgroundColor: LP.card,
          }}>
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: f.bg,
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <f.icon size={20} color={f.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: LP.txt, marginBottom: 2 }}>{f.title}</Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2, lineHeight: 18 }}>{f.desc}</Text>
            </View>
            <ChevronRight size={16} color={LP.txt3} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Spécialistes ─────────────────────────────────────────────────────────────
const SPECIALTIES = [
  { name: 'Cardiologie',   count: 84,  color: '#E05577', bg: '#FFF1F4', icon: Heart },
  { name: 'Pédiatrie',     count: 62,  color: '#059669', bg: '#ECFDF5', icon: Users },
  { name: 'Dermatologie',  count: 47,  color: '#D97706', bg: '#FFFBEB', icon: Shield },
  { name: 'Gynécologie',   count: 53,  color: '#7C3AED', bg: '#F5F3FF', icon: Star  },
  { name: 'Généraliste',   count: 312, color: '#4A6FA5', bg: '#EEF3FB', icon: Stethoscope },
  { name: 'Ophtalmologie', count: 38,  color: '#0891B2', bg: '#ECFEFF', icon: Eye   },
];

function SpecialistsSection() {
  return (
    <View style={[S.section, { backgroundColor: LP.bg2 }]}>
      <Pill2 label="Nos médecins" color="#2d3b5f" bg="rgba(42,78,207,0.10)" />
      <Text style={S.title}>Trouvez votre{'\n'}spécialiste.</Text>
      <Text style={S.subtitle}>Choisissez une spécialité ou réservez avec un médecin populaire.</Text>

      {/* Grille 2×3 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        {SPECIALTIES.map((sp, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => router.push('/auth/register')}
            activeOpacity={0.75}
            style={{ width: (W - 54) / 2, backgroundColor: sp.bg, borderRadius: 18, padding: 16, gap: 10 }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 12,
              backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' }}>
              <sp.icon size={20} color={sp.color} />
            </View>
            <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: LP.navy, letterSpacing: -0.2 }}>{sp.name}</Text>
            <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: sp.color }}>{sp.count} médecins</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Médecin du moment */}
      <View style={{ marginTop: 20 }}>
        {/* Label */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
          backgroundColor: 'rgba(245,180,84,0.14)', paddingHorizontal: 12, paddingVertical: 6,
          borderRadius: 999, marginBottom: 12 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: LP.amber }} />
          <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: LP.amber }}>Médecin du moment</Text>
        </View>

        {/* Carte */}
        <View style={{ backgroundColor: LP.card, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: LP.border,
          shadowColor: '#1e2a5e', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 28, elevation: 4 }}>

          {/* Header médecin */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            {/* Avatar gradient + badge vérifié */}
            <View style={{ position: 'relative' }}>
              <LinearGradient colors={['#2d3b5f', '#1e2a5e']}
                style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#1e2a5e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 6 }}>
                <Text style={{ fontSize: 20, fontFamily: FONTS.extrabold, color: '#fff', letterSpacing: -0.5 }}>AB</Text>
              </LinearGradient>
              {/* Verified badge */}
              <View style={{ position: 'absolute', bottom: -3, right: -3,
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: '#2bb88c', borderWidth: 3, borderColor: '#fff',
                alignItems: 'center', justifyContent: 'center' }}>
                <Check size={10} color="#fff" strokeWidth={3} />
              </View>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: LP.txt, letterSpacing: -0.3 }}>Dr. Ahmed Benali</Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: LP.blue, marginTop: 2 }}>Cardiologue · 12 ans d'expérience</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={13} color={LP.amber} fill={LP.amber} />
                  <Text style={{ fontSize: 12, fontFamily: FONTS.bold, color: LP.txt }}>4.9</Text>
                  <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2 }}>(1 240)</Text>
                </View>
                <Text style={{ color: LP.txt3 }}>·</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <MapPin size={11} color={LP.txt3} />
                  <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2 }}>2.4 km</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Créneaux 2×2 */}
          <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: LP.txt3, letterSpacing: 0.7,
            textTransform: 'uppercase', marginBottom: 10 }}>Prochains créneaux</Text>
          {[
            [{ day: "AUJOURD'HUI", t: '14:30', hot: true  }, { day: "AUJOURD'HUI", t: '16:00', hot: false }],
            [{ day: 'DEMAIN',      t: '09:30', hot: false }, { day: 'DEMAIN',      t: '11:00', hot: false }],
          ].map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 8, marginBottom: ri === 0 ? 8 : 18 }}>
              {row.map((sl, si) => (
                <View key={si} style={{ flex: 1, borderRadius: 12,
                  paddingVertical: 10, paddingHorizontal: 12,
                  backgroundColor: sl.hot ? 'rgba(78,213,168,0.12)' : 'rgba(238,240,247,0.7)',
                  borderWidth: 1.5, borderColor: sl.hot ? 'rgba(78,213,168,0.35)' : 'transparent' }}>
                  <Text style={{ fontSize: 9, fontFamily: FONTS.bold,
                    color: sl.hot ? '#2bb88c' : LP.txt3, letterSpacing: 0.4, textTransform: 'uppercase' }}>{sl.day}</Text>
                  <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: sl.hot ? '#2bb88c' : LP.txt, marginTop: 2 }}>{sl.t}</Text>
                </View>
              ))}
            </View>
          ))}

          {/* Divider */}
          <View style={{ borderTopWidth: 1, borderTopColor: LP.border, borderStyle: 'dashed', marginBottom: 16 }} />

          {/* Prix + Bouton */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: LP.txt3 }}>Consultation</Text>
              <Text style={{ fontSize: 18, fontFamily: FONTS.extrabold, color: LP.txt, letterSpacing: -0.4, marginTop: 1 }}>2 500 DA</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/auth/register')}
              style={{ backgroundColor: LP.navy, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                shadowColor: '#1e2a5e', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 18, elevation: 5 }}>
              <Text style={{ color: '#fff', fontFamily: FONTS.bold, fontSize: 14 }}>Réserver</Text>
              <ChevronRight size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Voir tous */}
        <TouchableOpacity onPress={() => router.push('/auth/register')}
          style={{ marginTop: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: LP.border, borderRadius: 16,
            paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
            backgroundColor: LP.card }}>
          <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: LP.blue }}>Voir les 1 200+ médecins</Text>
          <ChevronRight size={14} color={LP.blue} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Réservation ──────────────────────────────────────────────────────────────
function BookingSection() {
  const steps = [
    { n: '01', t: 'Décrivez vos symptômes',  d: 'L\'IA pré-analyse et oriente vers le bon spécialiste.' },
    { n: '02', t: 'Choisissez un médecin',   d: 'Filtrez par spécialité, ville ou disponibilité.' },
    { n: '03', t: 'Confirmez en 1 clic',     d: 'Vous recevez la confirmation par notification.' },
  ];
  return (
    <View style={S.section}>
      <Pill2 label="3 étapes" color={LP.green} bg="#ECFDF5" />
      <Text style={S.title}>Réservez en{'\n'}quelques secondes.</Text>
      <View style={{ gap: 14, marginTop: 20 }}>
        {steps.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14,
            backgroundColor: LP.card, borderRadius: 16, padding: 16,
            borderWidth: 1, borderColor: LP.border }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: '#ECFDF5',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Text style={{ fontSize: 12, fontFamily: FONTS.extrabold, color: LP.green }}>{s.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: LP.txt, marginBottom: 4 }}>{s.t}</Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2, lineHeight: 18 }}>{s.d}</Text>
            </View>
          </View>
        ))}
      </View>
      <TouchableOpacity onPress={() => router.push('/auth/register')} activeOpacity={0.9} style={{ marginTop: 20 }}>
        <LinearGradient colors={['#059669', '#34D399']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.ctaFill}>
          <Calendar size={18} color="#fff" />
          <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: '#fff' }}>Prendre un rendez-vous</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

// ─── QR Code visuel ───────────────────────────────────────────────────────────
function QRCodeView({ size = 80 }) {
  const QC = '#0d1330';
  // Finder patterns: [x, y, outerSize, innerOffset, dotSize]
  const finders = [
    { x: 0,        y: 0        },  // TL
    { x: size - 22,y: 0        },  // TR
    { x: 0,        y: size - 22},  // BL
  ];
  // Data dots [x, y]
  const dots = [
    [26,4],[32,4],[38,2],[46,6],[52,2],[60,8],
    [28,12],[36,14],[44,10],[54,14],[62,10],
    [26,20],[34,24],[42,20],[50,26],[58,22],[66,28],
    [27,30],[33,34],[41,30],[49,34],[57,30],[65,36],
    [26,42],[34,46],[42,40],[50,44],[56,40],[64,46],
    [28,52],[36,56],[44,52],[52,58],[60,54],[68,60],
    [26,62],[34,66],[44,62],[52,68],[60,64],[68,70],
  ].filter(([x, y]) => {
    // Exclude dots that overlap with finder patterns
    if (x < 26 && y < 26) return false; // TL
    if (x > size - 28 && y < 26) return false; // TR
    if (x < 26 && y > size - 28) return false; // BL
    return true;
  });

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Finder patterns */}
      {finders.map((f, i) => (
        <View key={i}>
          <View style={{ position: 'absolute', left: f.x, top: f.y, width: 22, height: 22, backgroundColor: QC }} />
          <View style={{ position: 'absolute', left: f.x + 3, top: f.y + 3, width: 16, height: 16, backgroundColor: '#fff' }} />
          <View style={{ position: 'absolute', left: f.x + 7, top: f.y + 7, width: 8, height: 8, backgroundColor: QC }} />
        </View>
      ))}
      {/* Data dots */}
      {dots.map(([x, y], i) => (
        <View key={`d${i}`} style={{ position: 'absolute', left: x, top: y, width: 4, height: 4, backgroundColor: QC }} />
      ))}
    </View>
  );
}

// ─── Ordonnances ──────────────────────────────────────────────────────────────
function PrescriptionsSection() {
  return (
    <View style={S.section}>
      <Pill2 label="Ordonnances" color="#7c5cff" bg="rgba(124,92,255,0.12)" />
      <Text style={S.title}>Vos ordonnances,{'\n'}toujours avec vous.</Text>
      <Text style={S.subtitle}>
        Plus de papier — chaque ordonnance génère un QR code unique. Votre pharmacien le scanne, c'est tout.
      </Text>

      {/* Carte QR ordonnance */}
      <LinearGradient
        colors={['#f9faff', '#eef2ff']}
        style={{ marginTop: 22, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(42,78,207,0.10)', flexDirection: 'row', alignItems: 'center', gap: 16 }}
      >
        {/* QR code visuel */}
        <View style={{
          width: 100, height: 100, borderRadius: 14, padding: 10,
          backgroundColor: '#fff',
          shadowColor: '#0f1632', shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
          flexShrink: 0, alignItems: 'center', justifyContent: 'center',
        }}>
          <QRCodeView size={80} />
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10, color: '#5b6585', fontFamily: FONTS.bold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Ordonnance · CMD-2306
          </Text>
          <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: LP.txt, marginTop: 4 }}>Sarah Benali</Text>
          <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2, marginTop: 2 }}>
            3 médicaments · 15 mai
          </Text>
          <View style={{
            marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5,
            backgroundColor: 'rgba(78,213,168,0.16)', paddingHorizontal: 9, paddingVertical: 3,
            borderRadius: 999, alignSelf: 'flex-start',
          }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#2bb88c' }} />
            <Text style={{ fontSize: 10, fontFamily: FONTS.bold, color: '#2bb88c' }}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Bullets */}
      <View style={{ gap: 0, marginTop: 24 }}>
        {[
          { I: FileText, c: '#7c5cff', bg: 'rgba(124,92,255,0.12)', t: 'Ordonnances numérisées', d: 'Plus besoin de papier — tout est dans l\'app.' },
          { I: Lock,     c: '#7c5cff', bg: 'rgba(124,92,255,0.12)', t: 'QR code sécurisé',       d: 'Code unique généré pour chaque ordonnance.' },
          { I: Bell,     c: '#7c5cff', bg: 'rgba(124,92,255,0.12)', t: 'Rappels automatiques',   d: 'Soyez notifié avant l\'expiration.' },
        ].map((item, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14,
            borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: LP.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: item.bg,
              alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <item.I size={16} color={item.c} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontFamily: FONTS.bold, color: LP.txt, marginBottom: 2 }}>{item.t}</Text>
              <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: LP.txt2, lineHeight: 18 }}>{item.d}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Grille de fonctionnalités ────────────────────────────────────────────────
const FEAT_GRID = [
  { icon: Shield,       color: '#4A6FA5', bg: '#EEF3FB', t: 'Données sécurisées', d: 'Chiffrement end-to-end'    },
  { icon: Clock,        color: '#D97706', bg: '#FFFBEB', t: 'Disponible 24/7',    d: 'Accès à tout moment'       },
  { icon: Users,        color: '#7C3AED', bg: '#F5F3FF', t: 'Multi-rôles',        d: 'Patient, médecin, pharmacien' },
  { icon: Stethoscope,  color: '#059669', bg: '#ECFDF5', t: 'Suivi médical',      d: 'Historique complet'        },
  { icon: Pill,         color: '#E05577', bg: '#FFF1F4', t: 'Gestion médicaments',d: 'Traitements en cours'      },
  { icon: Heart,        color: '#D97706', bg: '#FFFBEB', t: 'Garde-malade',       d: 'Services à domicile'       },
];

function FeaturesGridSection() {
  return (
    <View style={S.section}>
      <Pill2 label="Fonctionnalités" color="#2d3b5f" bg="rgba(42,78,207,0.10)" />
      <Text style={S.title}>Tout ce dont vous{'\n'}avez besoin.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
        {FEAT_GRID.map((f, i) => (
          <View key={i} style={{ width: (W - 54) / 2, backgroundColor: LP.card, borderRadius: 18,
            padding: 18, borderWidth: 1, borderColor: LP.border }}>
            <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: f.bg,
              alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <f.icon size={20} color={f.color} />
            </View>
            <Text style={{ fontSize: 13, fontFamily: FONTS.bold, color: LP.txt, marginBottom: 4 }}>{f.t}</Text>
            <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: LP.txt2 }}>{f.d}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
      <LinearGradient colors={['#1B2B4B', '#304B71']} style={{ borderRadius: 24, padding: 28, alignItems: 'center' }}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={[S.badge, { backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 16 }]}>
          <Zap size={11} color="#A5C3FF" />
          <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: '#A5C3FF', marginLeft: 5 }}>Commencez en 30 secondes</Text>
        </View>
        <Text style={{ fontSize: 26, fontFamily: FONTS.extrabold, color: '#fff', textAlign: 'center', marginBottom: 10, lineHeight: 33 }}>
          Rejoignez Healy{'\n'}aujourd'hui
        </Text>
        <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
          Plus de 50 000 patients font confiance à Healy pour gérer leur santé.
        </Text>
        <TouchableOpacity onPress={() => router.push('/auth/register')} activeOpacity={0.9}
          style={{ backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
            alignItems: 'center', width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: LP.navy }}>Créer un compte gratuit</Text>
          <ChevronRight size={16} color={LP.navy} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/auth/login')} activeOpacity={0.8}
          style={{ borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 14,
            paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center', width: '100%' }}>
          <Text style={{ fontSize: 15, fontFamily: FONTS.semibold, color: '#fff' }}>Je suis déjà membre</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function FooterSection() {
  return (
    <View style={{ padding: 24, alignItems: 'center', borderTopWidth: 1, borderTopColor: LP.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <LinearGradient colors={GRADIENTS.primary} style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontFamily: FONTS.bold }}>+</Text>
        </LinearGradient>
        <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: LP.navy }}>Healy</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 8 }}>
        {['À propos', 'Confidentialité', 'CGU', 'Contact'].map(l => (
          <TouchableOpacity key={l}><Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: LP.txt2 }}>{l}</Text></TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: LP.txt2 }}>Carrières</Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: LP.txt3, textAlign: 'center', lineHeight: 18 }}>
        Plateforme de santé numérique — Algérie{'\n'}© 2026 Healy. Tous droits réservés.
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Pill2({ label, color = '#7c5cff', bg = 'rgba(176,138,255,0.14)', icon }) {
  return (
    <View style={[S.badge, { backgroundColor: bg, marginBottom: 14, gap: 6 }]}>
      {icon && icon}
      <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color, letterSpacing: 0.1 }}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  navbar:    { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
               flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
               paddingHorizontal: 20, paddingTop: 52, paddingBottom: 18,
               backgroundColor: 'rgba(238,240,246,0.88)',
               borderBottomWidth: 1, borderBottomColor: 'rgba(30,42,94,0.06)' },
  logoBox:   { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navOutline:{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13, borderWidth: 1.5, borderColor: 'rgba(30,42,94,0.14)', backgroundColor: '#fff' },
  navFill:   { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13, backgroundColor: LP.navy },
  section:   { paddingHorizontal: 22, paddingVertical: 36 },
  badge:     { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
               paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  title:     { fontSize: 34, fontFamily: FONTS.extrabold, lineHeight: 37, marginTop: 14, letterSpacing: -1.3, color: LP.navy },
  subtitle:  { fontSize: 15, fontFamily: FONTS.medium,   lineHeight: 24, marginTop: 12, color: '#5b6585' },
  heroTitle: { fontSize: 46, fontFamily: FONTS.extrabold, lineHeight: 48, letterSpacing: -2, marginTop: 18, marginBottom: 14, color: LP.navy },
  heroSub:   { fontSize: 15, fontFamily: FONTS.medium,   lineHeight: 24, color: '#5b6585' },
  ctaFill:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
               gap: 8, paddingVertical: 16, borderRadius: 14 },
  ctaOutline:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
               paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: LP.border },
  phoneMockup: {
    width: 220, height: 270,
    borderTopLeftRadius: 36, borderTopRightRadius: 36,
    overflow: 'hidden',
    borderWidth: 8, borderBottomWidth: 0, borderColor: '#14193a',
    shadowColor: '#1e2a5e', shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.30, shadowRadius: 60, elevation: 12,
  },
  phoneScreen: { flex: 1, paddingTop: 42, paddingHorizontal: 14, paddingBottom: 14 },
});
