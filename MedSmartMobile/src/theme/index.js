// ─── Healy Mobile — Theme Tokens ─────────────────────────────────────────────
// Miroir exact du web : pages/_shared/theme.js + adminTheme.js
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  light: {
    bg:        '#F0F4F8',
    card:      '#ffffff',
    card2:     '#F0F4F8',
    nav:       '#ffffff',
    border:    '#E4EAF5',
    txt:       '#0D1B2E',
    txt2:      '#5A6E8A',
    txt3:      '#9AACBE',
    blue:      '#4A6FA5',
    blueLight: '#EEF3FB',
    blueBg:    'rgba(74,111,165,0.10)',
    green:     '#2D8C6F',
    greenLight:'#EEF8F4',
    greenBg:   'rgba(45,140,111,0.10)',
    amber:     '#E8A838',
    amberLight:'#FFF8EC',
    amberBg:   'rgba(232,168,56,0.10)',
    red:       '#E05555',
    redLight:  '#FFF0F0',
    redBg:     'rgba(224,85,85,0.10)',
    purple:    '#7B5EA7',
    purpleLight:'#F3EEFF',
    purpleBg:  'rgba(123,94,167,0.10)',
    navHover:  '#EEF3FB',
    inputBg:   '#ffffff',
    inputBorder:'#E4EAF5',
    placeholder:'#9AACBE',
    icon:      '#4A6FA5',
    divider:   '#E4EAF5',
  },
  dark: {
    bg:        '#0D1117',
    card:      '#141B27',
    card2:     '#1A2333',
    nav:       '#141B27',
    border:    'rgba(99,142,203,0.15)',
    txt:       '#F0F3FA',
    txt2:      '#8AAEE0',
    txt3:      '#4A6080',
    blue:      '#638ECB',
    blueLight: '#1A2333',
    blueBg:    'rgba(99,142,203,0.12)',
    green:     '#4CAF82',
    greenLight:'#0F2820',
    greenBg:   'rgba(76,175,130,0.12)',
    amber:     '#F0A500',
    amberLight:'#1E1500',
    amberBg:   'rgba(240,165,0,0.12)',
    red:       '#E05555',
    redLight:  '#1E0A0A',
    redBg:     'rgba(224,85,85,0.12)',
    purple:    '#9B7FD4',
    purpleLight:'#1A1030',
    purpleBg:  'rgba(155,127,212,0.12)',
    navHover:  '#1A2333',
    inputBg:   'rgba(255,255,255,0.08)',
    inputBorder:'rgba(255,255,255,0.15)',
    placeholder:'rgba(255,255,255,0.4)',
    icon:      'rgba(255,255,255,0.4)',
    divider:   'rgba(255,255,255,0.12)',
  },
};

// HMS dark tokens (Admin dashboard style)
export const HMS = {
  bg:        '#0F1117',
  surface:   '#1A1D2E',
  card:      '#1E2235',
  cardHover: '#232840',
  border:    'rgba(255,255,255,0.06)',
  row:       'rgba(255,255,255,0.025)',
  header:    'rgba(255,255,255,0.015)',
  txt:       '#E8EAED',
  txt2:      '#9AA3B0',
  txt3:      '#5C6370',
  blue:      '#5B7FFF',
  blueHover: '#6B8FFF',
  blueFaint: 'rgba(91,127,255,0.08)',
  blueLight: 'rgba(91,127,255,0.06)',
  green:     '#22C55E',
  greenBg:   'rgba(34,197,94,0.12)',
  red:       '#EF4444',
  redBg:     'rgba(239,68,68,0.12)',
  amber:     '#F59E0B',
  amberBg:   'rgba(245,158,11,0.12)',
  purple:    '#A78BFA',
  purpleBg:  'rgba(167,139,250,0.12)',
};

const HMS_LIGHT = {
  bg:        '#F0F4F8',
  surface:   '#FFFFFF',
  card:      '#FFFFFF',
  cardHover: '#F8FAFC',
  border:    '#E4EAF5',
  row:       'rgba(74,111,165,0.04)',
  header:    'rgba(74,111,165,0.025)',
  txt:       '#0D1B2E',
  txt2:      '#5A6E8A',
  txt3:      '#9AACBE',
  blue:      '#4A6FA5',
  blueHover: '#3D5F8F',
  blueFaint: 'rgba(74,111,165,0.08)',
  blueLight: '#EEF3FB',
  green:     '#2D8C6F',
  greenBg:   '#EEF8F4',
  red:       '#E05555',
  redBg:     '#FFF0F0',
  amber:     '#E8A838',
  amberBg:   '#FFF8EC',
  purple:    '#7B5EA7',
  purpleBg:  '#F3EEFF',
};

export const ROLE_META = {
  patient:          { color: '#4A6FA5', bg: '#EEF3FB', label: 'Patient' },
  doctor:           { color: '#2D8C6F', bg: '#EEF8F4', label: 'Médecin' },
  'médecin':        { color: '#2D8C6F', bg: '#EEF8F4', label: 'Médecin' },
  pharmacist:       { color: '#E8A838', bg: '#FFF8EC', label: 'Pharmacien' },
  'pharmacien':     { color: '#E8A838', bg: '#FFF8EC', label: 'Pharmacien' },
  caretaker:        { color: '#7B5EA7', bg: '#F3EEFF', label: 'Garde-malade' },
  'garde-malade':   { color: '#7B5EA7', bg: '#F3EEFF', label: 'Garde-malade' },
  admin:            { color: '#E05555', bg: '#FFF0F0', label: 'Admin' },
};

export const LOG_COLORS = {
  success: { color: '#2D8C6F', bg: '#EEF8F4', bgDk: '#0F2820' },
  warning: { color: '#E8A838', bg: '#FFF8EC', bgDk: '#1E1500' },
  danger:  { color: '#E05555', bg: '#FFF0F0', bgDk: '#1E0A0A' },
  info:    { color: '#4A6FA5', bg: '#EEF3FB', bgDk: '#111E30' },
};

export function useDashColors(dk) {
  return dk ? T.dark : T.light;
}

export function getAdminTheme(dk) {
  return dk ? HMS : HMS_LIGHT;
}

// ─── Typography ───────────────────────────────────────────────────────────────
// Avec fallback système si les fonts locales ne sont pas chargées
export const FONTS = {
  regular:   'PlusJakartaSans-Regular',
  medium:    'PlusJakartaSans-Medium',
  semibold:  'PlusJakartaSans-SemiBold',
  bold:      'PlusJakartaSans-Bold',
  extrabold: 'PlusJakartaSans-ExtraBold',
};

// ─── Shadows (React Native) ───────────────────────────────────────────────────
export const SHADOWS = {
  sm: {
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4A6FA5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
};

// ─── Gradients ────────────────────────────────────────────────────────────────
export const GRADIENTS = {
  primary:  ['#304B71', '#6492C9'],
  green:    ['#2D8C6F', '#4CAF82'],
  amber:    ['#E8A838', '#c8891a'],
  red:      ['#E05555', '#B33B3B'],
  purple:   ['#7B5EA7', '#9B7FD4'],
  darkBg:   ['#0D1B2E', '#141B27'],
};

// ─── Status Badge colors ──────────────────────────────────────────────────────
export const STATUS_COLORS = (c) => ({
  confirmed: { color: c.green,  bg: c.green  + '20', label: 'Confirmé' },
  pending:   { color: c.amber,  bg: c.amber  + '20', label: 'En attente' },
  completed: { color: c.blue,   bg: c.blue   + '20', label: 'Terminé' },
  cancelled: { color: c.red,    bg: c.red    + '20', label: 'Annulé' },
  active:    { color: c.green,  bg: c.green  + '20', label: 'Actif' },
  expired:   { color: c.txt3,   bg: c.border,        label: 'Expiré' },
  accepted:  { color: c.green,  bg: c.green  + '20', label: 'Accepté' },
  rejected:  { color: c.red,    bg: c.red    + '20', label: 'Refusé' },
});
