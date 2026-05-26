import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Activity } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS } from '../../theme';
import * as api from '../../services/api';

const DAYS = [
  { key: 'monday',    short: 'LUN', label: 'Lundi'    },
  { key: 'tuesday',   short: 'MAR', label: 'Mardi'    },
  { key: 'wednesday', short: 'MER', label: 'Mercredi' },
  { key: 'thursday',  short: 'JEU', label: 'Jeudi'    },
  { key: 'friday',    short: 'VEN', label: 'Vendredi' },
  { key: 'saturday',  short: 'SAM', label: 'Samedi'   },
  { key: 'sunday',    short: 'DIM', label: 'Dimanche' },
];

const DEFAULT_DAY = {
  enabled:       true,
  open:          '09:00',
  close:         '17:00',
  breakStart:    '12:00',
  breakEnd:      '13:00',
  slotDuration:  30,
};

const SLOT_OPTIONS = [15, 20, 30, 45, 60];

function buildDefaults() {
  const d = {};
  DAYS.forEach(({ key }, i) => {
    d[key] = { ...DEFAULT_DAY, enabled: i < 5 }; // Mon–Fri open by default
  });
  return d;
}

export default function DoctorHoraires({ onBack }) {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [schedule, setSchedule] = useState(buildDefaults());
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    api.getSchedules()
      .then(data => {
        if (data && typeof data === 'object') {
          // Merge server data over defaults
          const merged = buildDefaults();
          DAYS.forEach(({ key }) => {
            if (data[key]) merged[key] = { ...merged[key], ...data[key] };
          });
          setSchedule(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateDay(dayKey, field, value) {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveSchedule(schedule);
      Alert.alert('Succès', 'Horaires enregistrés avec succès.');
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Une erreur est survenue.');
    } finally { setSaving(false); }
  }

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <ActivityIndicator color={c.blue} style={{ marginTop: 60 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* ── Header ── */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={onBack} style={S.backBtn}>
          <ChevronLeft size={22} color={c.txt} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[S.headerTitle, { color: c.txt }]}>Horaires</Text>
          <Text style={[S.headerSub,   { color: c.txt2 }]}>Vos disponibilités hebdomadaires</Text>
        </View>
        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={[S.saveBtn, { backgroundColor: c.blue, opacity: saving ? 0.7 : 1 }]}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={S.saveBtnTxt}>Enregistrer</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
      >
        {DAYS.map(({ key, short, label }) => {
          const day = schedule[key];
          return (
            <View
              key={key}
              style={[S.dayCard, {
                backgroundColor: c.card,
                borderColor: day.enabled ? c.blue + '30' : c.border,
                opacity: day.enabled ? 1 : 0.6,
              }]}
            >
              {/* ── Day header ── */}
              <View style={S.dayHeader}>
                <View style={[S.dayBadge, {
                  backgroundColor: day.enabled ? c.blue + '18' : c.border,
                }]}>
                  <Text style={[S.dayShort, { color: day.enabled ? c.blue : c.txt3 }]}>{short}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.txt, fontFamily: FONTS.bold, fontSize: 16 }}>{label}</Text>
                  <Text style={{ color: day.enabled ? c.green : c.txt3, fontSize: 12, fontFamily: FONTS.medium }}>
                    {day.enabled ? 'Ouvert' : 'Fermé'}
                  </Text>
                </View>
                <Switch
                  value={day.enabled}
                  onValueChange={v => updateDay(key, 'enabled', v)}
                  trackColor={{ false: c.border, true: c.blue + '60' }}
                  thumbColor={day.enabled ? c.blue : '#f0f0f0'}
                />
              </View>

              {day.enabled && (
                <>
                  {/* ── Ouverture ── */}
                  <Text style={[S.sectionLabel, { color: c.txt3 }]}>OUVERTURE</Text>
                  <View style={S.timeRow}>
                    <TimeInput
                      value={day.open}
                      onChange={v => updateDay(key, 'open', v)}
                      c={c}
                    />
                    <Text style={{ color: c.txt3, fontSize: 18, fontFamily: FONTS.regular }}>→</Text>
                    <TimeInput
                      value={day.close}
                      onChange={v => updateDay(key, 'close', v)}
                      c={c}
                    />
                  </View>

                  {/* ── Pause déjeuner ── */}
                  <Text style={[S.sectionLabel, { color: c.txt3 }]}>PAUSE DÉJEUNER</Text>
                  <View style={S.timeRow}>
                    <TimeInput
                      value={day.breakStart}
                      onChange={v => updateDay(key, 'breakStart', v)}
                      c={c}
                    />
                    <Text style={{ color: c.txt3, fontSize: 18, fontFamily: FONTS.regular }}>→</Text>
                    <TimeInput
                      value={day.breakEnd}
                      onChange={v => updateDay(key, 'breakEnd', v)}
                      c={c}
                    />
                  </View>

                  {/* ── Durée consultation ── */}
                  <View style={[S.slotRow, { backgroundColor: c.green + '12', borderRadius: 10, padding: 10 }]}>
                    <Activity size={14} color={c.green} />
                    <Text style={{ color: c.green, fontFamily: FONTS.medium, fontSize: 13, flex: 1 }}>
                      Durée par consultation
                    </Text>
                    <View style={S.slotPicker}>
                      {SLOT_OPTIONS.map(opt => (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => updateDay(key, 'slotDuration', opt)}
                          style={[S.slotChip, {
                            backgroundColor: day.slotDuration === opt ? c.green : 'transparent',
                            borderColor:     day.slotDuration === opt ? c.green : c.green + '40',
                          }]}
                        >
                          <Text style={{
                            color: day.slotDuration === opt ? '#fff' : c.green,
                            fontSize: 11,
                            fontFamily: FONTS.semibold,
                          }}>
                            {opt === day.slotDuration ? `${opt} min` : `${opt}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Time Input component ──────────────────────────────────────────────────────
function TimeInput({ value, onChange, c }) {
  const [text, setText] = useState(value);

  // Keep in sync with parent
  useEffect(() => { setText(value); }, [value]);

  function handleBlur() {
    // Validate HH:MM format
    const match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const h = Math.min(23, parseInt(match[1]));
      const m = Math.min(59, parseInt(match[2]));
      const formatted = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      setText(formatted);
      onChange(formatted);
    } else {
      setText(value); // revert
    }
  }

  function handleChange(t) {
    // Auto-insert colon
    let cleaned = t.replace(/[^0-9:]/g,'');
    if (cleaned.length === 2 && !cleaned.includes(':') && text.length === 1) {
      cleaned = cleaned + ':';
    }
    if (cleaned.length <= 5) setText(cleaned);
  }

  return (
    <TextInput
      style={[S.timeInput, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
      value={text}
      onChangeText={handleChange}
      onBlur={handleBlur}
      keyboardType="numeric"
      maxLength={5}
      placeholder="00:00"
      placeholderTextColor={c.txt3}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  header:       { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, gap:10 },
  headerTitle:  { fontSize:20, fontFamily:FONTS.bold },
  headerSub:    { fontSize:12, fontFamily:FONTS.regular, marginTop:1 },
  backBtn:      { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  saveBtn:      { paddingHorizontal:16, paddingVertical:9, borderRadius:20 },
  saveBtnTxt:   { color:'#fff', fontFamily:FONTS.bold, fontSize:14 },
  dayCard:      { borderRadius:18, padding:16, borderWidth:1.5, gap:10 },
  dayHeader:    { flexDirection:'row', alignItems:'center', gap:12, marginBottom:4 },
  dayBadge:     { width:44, height:44, borderRadius:14, alignItems:'center', justifyContent:'center' },
  dayShort:     { fontSize:12, fontFamily:FONTS.extrabold, letterSpacing:0.5 },
  sectionLabel: { fontSize:10, fontFamily:FONTS.bold, letterSpacing:0.8, color:'#999', marginTop:4 },
  timeRow:      { flexDirection:'row', alignItems:'center', gap:10 },
  timeInput:    { flex:1, borderWidth:1.5, borderRadius:12, paddingHorizontal:14, paddingVertical:12, fontSize:16, fontFamily:FONTS.semibold, textAlign:'center' },
  slotRow:      { flexDirection:'row', alignItems:'center', gap:8, marginTop:4 },
  slotPicker:   { flexDirection:'row', gap:4 },
  slotChip:     { paddingHorizontal:8, paddingVertical:5, borderRadius:20, borderWidth:1 },
});