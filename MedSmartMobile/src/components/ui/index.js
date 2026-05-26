import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, SHADOWS, GRADIENTS } from '../../theme';

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, onPress, dk: dkProp }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  const content = (
    <View style={[{
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      ...SHADOWS.sm,
    }, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color, bg, size = 'md' }) {
  const fontSize = size === 'sm' ? 10 : 12;
  const px = size === 'sm' ? 8 : 10;
  const py = size === 'sm' ? 3 : 4;

  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: px, paddingVertical: py, borderRadius: 999 }}>
      <Text style={{ color, fontSize, fontFamily: FONTS.bold }}>{label}</Text>
    </View>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status, c }) {
  const statusMap = {
    confirmed: { color: c?.green  || '#2D8C6F', bg: (c?.green  || '#2D8C6F') + '20', label: 'Confirmé' },
    pending:   { color: c?.amber  || '#E8A838', bg: (c?.amber  || '#E8A838') + '20', label: 'En attente' },
    completed: { color: c?.blue   || '#4A6FA5', bg: (c?.blue   || '#4A6FA5') + '20', label: 'Terminé' },
    cancelled: { color: c?.red    || '#E05555', bg: (c?.red    || '#E05555') + '20', label: 'Annulé' },
    active:    { color: c?.green  || '#2D8C6F', bg: (c?.green  || '#2D8C6F') + '20', label: 'Actif' },
    expired:   { color: c?.txt3   || '#9AACBE', bg: c?.border  || '#E4EAF5',          label: 'Expiré' },
    accepted:  { color: c?.green  || '#2D8C6F', bg: (c?.green  || '#2D8C6F') + '20', label: 'Accepté' },
    rejected:  { color: c?.red    || '#E05555', bg: (c?.red    || '#E05555') + '20', label: 'Refusé' },
  };
  const s = statusMap[status] || statusMap.pending;
  return <Badge label={s.label} color={s.color} bg={s.bg} />;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ firstName = '', lastName = '', size = 36, color = '#4A6FA5' }) {
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
  const fontSize = Math.round(size * 0.38);

  return (
    <LinearGradient
      colors={GRADIENTS.primary}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: '#fff', fontSize, fontFamily: FONTS.bold }}>{initials}</Text>
    </LinearGradient>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ label, onPress, disabled, loading, variant = 'primary', style, textStyle, icon }) {
  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88} style={[{ borderRadius: 14, overflow: 'hidden' }, style]}>
        <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
                <Text style={[styles.btnText, textStyle]}>{label}</Text>
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    const { dk } = useTheme();
    const c = dk ? T.dark : T.light;
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.88}
        style={[{ borderRadius: 14, borderWidth: 1.5, borderColor: c.blue, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }, style]}>
        {loading
          ? <ActivityIndicator color={c.blue} size="small" />
          : <Text style={[{ color: c.blue, fontFamily: FONTS.semibold, fontSize: 15 }, textStyle]}>{label}</Text>
        }
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    const { dk } = useTheme();
    const c = dk ? T.dark : T.light;
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.7} style={[{ paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Text style={[{ color: c.blue, fontFamily: FONTS.semibold, fontSize: 14 }, textStyle]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

// ─── Input ────────────────────────────────────────────────────────────────────
import { TextInput, Platform } from 'react-native';

export function Input({ label, value, onChangeText, placeholder, secureTextEntry, error, icon, rightIcon, dk: dkProp, keyboardType, autoCapitalize = 'none', style, multiline, numberOfLines }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  return (
    <View style={style}>
      {label && <Text style={{ fontSize: 13, fontFamily: FONTS.medium, color: c.txt2, marginBottom: 6 }}>{label}</Text>}
      <View style={{
        flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center',
        backgroundColor: c.inputBg,
        borderWidth: 1.5,
        borderColor: error ? '#E05555' : c.inputBorder,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: multiline ? 12 : 0,
        minHeight: multiline ? (numberOfLines || 4) * 24 : 50,
      }}>
        {icon && <View style={{ marginRight: 8, opacity: 0.6, marginTop: multiline ? 2 : 0 }}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={{
            flex: 1,
            fontSize: 15,
            fontFamily: FONTS.regular,
            color: c.txt,
            paddingVertical: multiline ? 0 : Platform.OS === 'ios' ? 14 : 10,
          }}
        />
        {rightIcon && <View style={{ marginLeft: 8 }}>{rightIcon}</View>}
      </View>
      {error && <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: '#E05555', marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction, dk: dkProp, style }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, style]}>
      <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: c.txt }}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.blue }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, dk: dkProp }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontFamily: FONTS.bold, color: c.txt, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 14, fontFamily: FONTS.regular, color: c.txt2, textAlign: 'center', lineHeight: 21 }}>{subtitle}</Text>}
    </View>
  );
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────
export function LoadingScreen({ dk: dkProp }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <LinearGradient colors={GRADIENTS.primary} style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontFamily: FONTS.bold }}>✚</Text>
      </LinearGradient>
      <Text style={{ fontSize: 20, fontFamily: FONTS.bold, color: c.txt, marginBottom: 8 }}>Healy</Text>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {[0, 1, 2].map(i => (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.blue, opacity: 0.6 + i * 0.2 }} />
        ))}
      </View>
    </View>
  );
}

// ─── HealyLogo ────────────────────────────────────────────────────────────────
export function HealyLogo({ size = 34, textColor }) {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LinearGradient colors={GRADIENTS.primary} style={{ width: size, height: size, borderRadius: Math.round(size * 0.29), alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: Math.round(size * 0.47), fontFamily: FONTS.bold }}>✚</Text>
      </LinearGradient>
      <Text style={{ fontSize: Math.round(size * 0.5), fontFamily: FONTS.bold, color: textColor || c.txt }}>Healy</Text>
    </View>
  );
}

// ─── TopNavbar ────────────────────────────────────────────────────────────────
export function TopNavbar({ title, subtitle, right, left, dk: dkProp }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: c.nav, borderBottomWidth: 1, borderBottomColor: c.border,
      gap: 12,
    }}>
      {left && <View>{left}</View>}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 17, fontFamily: FONTS.bold, color: c.txt }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt2 }}>{subtitle}</Text>}
      </View>
      {right && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{right}</View>}
    </View>
  );
}

// ─── Chip / Filter ────────────────────────────────────────────────────────────
export function Chip({ label, active, onPress, color, c }) {
  const activeColor = color || (c?.blue ?? '#4A6FA5');
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
        backgroundColor: active ? activeColor : (c?.card ?? '#fff'),
        borderWidth: 1.5,
        borderColor: active ? activeColor : (c?.border ?? '#E4EAF5'),
      }}>
      <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: active ? '#fff' : (c?.txt2 ?? '#5A6E8A') }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ label, dk: dkProp }) {
  const { dk: dkCtx } = useTheme();
  const dk = dkProp !== undefined ? dkProp : dkCtx;
  const c = dk ? T.dark : T.light;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 16 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />
      {label && <Text style={{ fontSize: 12, fontFamily: FONTS.regular, color: c.txt3 }}>{label}</Text>}
      {label && <View style={{ flex: 1, height: 1, backgroundColor: c.divider }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
});
