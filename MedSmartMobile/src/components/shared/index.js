import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Platform, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { T, SHADOWS, FONTS, GRADIENTS } from '../../theme';

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style, dk }) {
  const c = dk ? T.dark : T.light;
  return (
    <View style={[
      styles.card,
      { backgroundColor: c.card, borderColor: c.border },
      SHADOWS.sm,
      style,
    ]}>
      {children}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ color, bg, children, label, style }) {
  const content = label !== undefined ? label : children;
  return (
    <View style={[
      styles.badge,
      { backgroundColor: bg, borderColor: color + '44' },
      style,
    ]}>
      <Text style={[styles.badgeText, { color }]}>{content}</Text>
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
  children, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, style, textStyle,
  gradient = GRADIENTS.primary,
}) {
  const isDisabled = disabled || loading;

  if (variant === 'primary' || variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[styles.btnWrap, isDisabled && { opacity: 0.6 }, style]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.btn, styles[`btn_${size}`]]}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={[styles.btnText, textStyle]}>{children}</Text>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          styles.btn, styles[`btn_${size}`],
          styles.btnOutline,
          isDisabled && { opacity: 0.6 },
          style,
        ]}
      >
        {loading
          ? <ActivityIndicator color="#4A6FA5" size="small" />
          : <Text style={[styles.btnOutlineText, textStyle]}>{children}</Text>
        }
      </TouchableOpacity>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[isDisabled && { opacity: 0.6 }, style]}
      >
        <Text style={[styles.btnGhostText, textStyle]}>{children}</Text>
      </TouchableOpacity>
    );
  }

  return null;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#6492C9','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316',
];

export function Avatar({ firstName = '', lastName = '', size = 40, color, uri }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    );
  }
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  const bg = color || AVATAR_COLORS[(firstName.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
    ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ dk, style }) {
  const c = dk ? T.dark : T.light;
  return <View style={[{ height: 1, backgroundColor: c.border }, style]} />;
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction, dk, style }) {
  const c = dk ? T.dark : T.light;
  return (
    <View style={[styles.sectionHeader, style]}>
      <Text style={[styles.sectionTitle, { color: c.txt }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: c.blue, fontSize: 13, fontFamily: FONTS.semibold }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle, dk }) {
  const c = dk ? T.dark : T.light;
  return (
    <View style={styles.emptyState}>
      {icon && (
        typeof icon === 'string'
          ? <Text style={{ fontSize: 40, marginBottom: 12 }}>{icon}</Text>
          : <View style={{ marginBottom: 12 }}>{icon}</View>
      )}
      <Text style={[styles.emptyTitle, { color: c.txt }]}>{title}</Text>
      {subtitle && <Text style={[styles.emptySubtitle, { color: c.txt2 }]}>{subtitle}</Text>}
    </View>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
import { TextInput } from 'react-native';

export function Input({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, dk, error, multiline, numberOfLines, style, ...rest
}) {
  const c = dk ? T.dark : T.light;
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={[styles.inputLabel, { color: c.txt2 }]}>{label}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.txt3}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          {
            backgroundColor: c.card,
            borderColor: error ? c.red : c.border,
            color: c.txt,
          },
          multiline && { height: numberOfLines * 24 + 24, textAlignVertical: 'top' },
          style,
        ]}
        {...rest}
      />
      {error && <Text style={[styles.inputError, { color: c.red }]}>{error}</Text>}
    </View>
  );
}

// ─── LoadingScreen ────────────────────────────────────────────────────────────
export function LoadingScreen({ dk }) {
  const c = dk ? T.dark : T.light;
  return (
    <View style={[styles.loadingScreen, { backgroundColor: c.bg }]}>
      <LinearGradient
        colors={GRADIENTS.primary}
        style={styles.loadingIcon}
      >
        <Text style={{ color: '#fff', fontSize: 24 }}>✚</Text>
      </LinearGradient>
      <ActivityIndicator color={c.blue} size="large" style={{ marginTop: 24 }} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONTS.bold,
  },
  btnWrap: { borderRadius: 14, overflow: 'hidden' },
  btn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn_sm: { paddingHorizontal: 16, paddingVertical: 10 },
  btn_md: { paddingHorizontal: 20, paddingVertical: 14 },
  btn_lg: { paddingHorizontal: 24, paddingVertical: 17 },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#4A6FA5',
    backgroundColor: 'transparent',
  },
  btnOutlineText: {
    color: '#4A6FA5',
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  btnGhostText: {
    color: '#4A6FA5',
    fontSize: 14,
    fontFamily: FONTS.semibold,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontFamily: FONTS.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: FONTS.semibold,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
  },
  inputError: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 4,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});