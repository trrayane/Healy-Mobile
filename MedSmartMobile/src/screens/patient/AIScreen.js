/**
 * AIScreen.js — Diagnostic IA : fidèle à la version web
 *
 * Web :
 *  ← sidebar gauche : "+ Nouvelle session" + historique
 *  → zone centrale : bulle intro bot + disclaimer
 *     chips de symptômes rapides
 *     barre input (paperclip | text | mic | send)
 *  → panel droit : "Résultats & Recommandations"
 *
 * Mobile : layout vertical adapté
 *  - Header "Diagnostic IA" + bouton "Nouvelle session"
 *  - Historique des sessions (drawer / panneau rétractable)
 *  - Zone de chat avec bulle intro + résultats
 *  - Chips de symptômes rapides
 *  - Barre d'entrée (text | mic | send)
 *  - Panneau résultats collapsible
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, Modal, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Plus, History, Send, Mic, Brain,
  Activity, ChevronDown, ChevronUp, CircleAlert,
  Clock, RotateCcw, X, Zap, Stethoscope, CalendarPlus,
  TriangleAlert, FlaskConical,
} from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import * as api from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

/* ── Chips de symptômes rapides (miroir web) ─────────────────────────────── */
const QUICK_SYMPTOMS = [
  'Maux de tête', 'Fièvre', 'Fatigue',
  'Douleur thoracique', 'Nausées', 'Toux', 'Essoufflement',
];

/* ── Message du bot d'introduction ─────────────────────────────────────────── */
const BOT_INTRO = `Nouvelle session. Décrivez vos symptômes en détail — localisation, intensité, durée — et je vous fournirai une analyse immédiate.`;
const BOT_DISCLAIMER = `Ces informations sont indicatives et ne remplacent pas un avis médical. Consultez un professionnel de santé pour un diagnostic adapté à votre situation personnelle.`;

/* ═══════════════════════════════════════════════════════════════════════════
   SCREEN PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function AIScreen() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;
  const scrollRef = useRef(null);

  // Symptôme pré-rempli depuis le dashboard (banner "Analyser")
  const { symptom: initialSymptom } = useLocalSearchParams();

  /* ── State ── */
  const [sessions,      setSessions]      = useState([]);  // historique
  const [currentSession,setCurrentSession]= useState(null);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState(initialSymptom || '');
  const [loading,       setLoading]       = useState(false);
  const [loadingHistory,setLoadingHistory] = useState(true);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [resultsOpen,   setResultsOpen]   = useState(true);
  const [lastResult,    setLastResult]    = useState(null);

  useEffect(() => { loadHistory(); }, []);

  /* ── Scroll bas après nouveau message ── */
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      // 1. Essai API
      const data = await api.getAISessions().catch(() => null)
        || await api.getAIHistory().catch(() => null);
      if (data) {
        const list = Array.isArray(data) ? data : data?.results || [];
        if (list.length > 0) { setSessions(list); setLoadingHistory(false); return; }
      }
      // 2. Fallback AsyncStorage (hors ligne)
      const stored = await AsyncStorage.getItem('@ai_sessions_patient');
      if (stored) setSessions(JSON.parse(stored));
    } catch { /* silence */ }
    finally { setLoadingHistory(false); }
  }

  async function saveSessionLocally(userText, botText) {
    const newSession = {
      id: Date.now(),
      symptoms: userText,
      analysis: botText,
      created_at: new Date().toISOString(),
    };
    const stored = await AsyncStorage.getItem('@ai_sessions_patient').catch(() => null);
    const prev = stored ? JSON.parse(stored) : [];
    const updated = [newSession, ...prev].slice(0, 20); // max 20
    await AsyncStorage.setItem('@ai_sessions_patient', JSON.stringify(updated)).catch(() => {});
    setSessions(updated);
  }

  /* ── Nouvelle session ── */
  function newSession() {
    setCurrentSession(null);
    setMessages([]);
    setInput('');
    setLastResult(null);
    setHistoryOpen(false);
  }

  /* ── Envoyer symptômes ── */
  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg = { role: 'user', content: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.analyzeSymptoms({ symptoms: msg, lang: 'fr', session_id: currentSession });

      // ── Parsing de la réponse backend ───────────────────────────────────────
      // Données SÉPARÉES : texte du chat vs données structurées du panneau résultats
      let diagnosis = '';
      let diseases       = [];   // string[]
      let urgencyLevel   = null; // 'low' | 'medium' | 'high' | 'critical'
      let recommendations = null; // string | string[]
      let caveats        = null; // string
      let recommendedDoctor = null;

      if (typeof res === 'string') {
        diagnosis = res;
      } else if (res && typeof res === 'object') {
        // 1. Texte principal — backend retourne "response" (pas "diagnosis")
        diagnosis = res.response || res.diagnosis || res.analysis || res.result
          || res.content || res.reply || res.text || res.answer || res.message || '';

        // 2. Maladies possibles — backend retourne { name_fr, name_en, confidence, ... }
        if (Array.isArray(res.diseases) && res.diseases.length > 0) {
          diseases = res.diseases.map(d =>
            typeof d === 'string' ? d : (d.name_fr || d.name_en || d.name || d.disease || '')
          ).filter(Boolean);
        }

        // 3. Niveau d'urgence — backend retourne "urgency" (pas "urgency_level")
        //    Valeurs backend : "faible" | "modéré" | "modere" | "urgent"
        //    On les mappe vers low / medium / high pour l'affichage coloré
        const rawUrgency = res.urgency_level || res.urgency || null;
        if (rawUrgency) {
          const urgencyMap = {
            faible: 'low', low: 'low',
            'modéré': 'medium', modere: 'medium', moderate: 'medium', medium: 'medium',
            urgent: 'high', high: 'high', critical: 'critical', critique: 'critical',
          };
          urgencyLevel = urgencyMap[rawUrgency.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')]
            || urgencyMap[rawUrgency.toLowerCase()]
            || rawUrgency;
        }

        // 4. Recommandations
        recommendations = res.recommendations || res.recommendation || res.suggestions || null;

        // 5. Caveats
        if (res.caveats) {
          caveats = Array.isArray(res.caveats) ? res.caveats.join('\n') : String(res.caveats);
        }

        // 6. Médecin recommandé — backend retourne "recommended_doctors" (tableau)
        const rawDoc = res.recommended_doctor
          || (Array.isArray(res.recommended_doctors) && res.recommended_doctors.length > 0 ? res.recommended_doctors[0] : null)
          || res.doctor || null;
        if (rawDoc) {
          if (typeof rawDoc === 'object') {
            recommendedDoctor = {
              name: rawDoc.full_name
                || (rawDoc.first_name ? `${rawDoc.first_name} ${rawDoc.last_name || ''}`.trim() : null)
                || rawDoc.name || 'Médecin',
              specialty: rawDoc.specialty || rawDoc.specialite || rawDoc.specialization || rawDoc.specialty_fr || '',
              id: rawDoc.id || null,
            };
          } else if (typeof rawDoc === 'string') {
            recommendedDoctor = { name: rawDoc, specialty: '', id: null };
          }
        }

        if (!diagnosis) diagnosis = JSON.stringify(res, null, 2);
      }

      const botMsg = { role: 'bot', content: diagnosis, ts: new Date() };
      setMessages(prev => [...prev, botMsg]);
      setLastResult({ text: diagnosis, diseases, urgencyLevel, recommendations, caveats, recommendedDoctor, ts: new Date() });
      setResultsOpen(true);
      if (res?.session_id) setCurrentSession(res.session_id);
      saveSessionLocally(msg, diagnosis);
    } catch (e) {
      // Message d'erreur clair pour l'utilisateur
      const isTimeout = e.message?.includes('répondu après') || e.message?.includes('timeout');
      const errMsg = {
        role: 'error',
        content: isTimeout
          ? "L'analyse a pris trop de temps. Le modèle IA est peut-être surchargé — réessayez dans quelques secondes."
          : `Erreur : ${e.message}`,
        ts: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  /* ── Sélectionner une session historique ── */
  function selectSession(session) {
    setCurrentSession(session.id);
    const msgs = [];
    if (session.symptoms) msgs.push({ role: 'user', content: session.symptoms, ts: new Date(session.created_at) });
    if (session.result || session.analysis) msgs.push({ role: 'bot', content: session.result || session.analysis, ts: new Date(session.created_at) });
    setMessages(msgs);
    if (session.result || session.analysis) setLastResult({ text: session.result || session.analysis, ts: new Date(session.created_at) });
    setHistoryOpen(false);
  }

  const hasConversation = messages.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={[S.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/')}
          style={S.backBtn}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <ArrowLeft size={22} color={c.txt} />
        </TouchableOpacity>

        <View style={[S.headerTitleWrap, { backgroundColor: dk ? 'rgba(255,255,255,0.06)' : '#EEF3FB' }]}>
          <History size={14} color={c.blue} />
          <Text style={[S.headerTitle, { color: c.txt }]}>Diagnostic IA</Text>
        </View>

        <View style={{ flex: 1 }} />

        {/* Historique */}
        <TouchableOpacity
          onPress={() => setHistoryOpen(true)}
          style={[S.histBtn, { backgroundColor: dk ? 'rgba(255,255,255,0.06)' : '#EEF3FB' }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <History size={16} color={c.blue} />
        </TouchableOpacity>

        {/* Nouvelle session */}
        <TouchableOpacity onPress={newSession} style={[S.newSessionBtn, { backgroundColor: c.blue }]}>
          <Plus size={14} color="#fff" />
          <Text style={S.newSessionText}>Nouvelle session</Text>
        </TouchableOpacity>
      </View>

      {/* ── PANNEAU RÉSULTATS (collapsible) ─────────────────────────────── */}
      <View style={[S.resultsPanel, { backgroundColor: dk ? '#141B27' : '#F8FAFC', borderBottomColor: c.border }]}>
        <TouchableOpacity
          onPress={() => setResultsOpen(r => !r)}
          style={S.resultsPanelHeader}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Activity size={16} color={c.blue} />
            <Text style={[S.resultsPanelTitle, { color: c.txt }]}>Résultats & Recommandations</Text>
          </View>
          {resultsOpen ? <ChevronUp size={16} color={c.txt3} /> : <ChevronDown size={16} color={c.txt3} />}
        </TouchableOpacity>

        {resultsOpen && (
          lastResult ? (
            <ScrollView
              style={{ maxHeight: 280 }}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <View style={S.resultsPanelContent}>
                {/* ── Niveau d'urgence ── */}
                {lastResult.urgencyLevel && (() => {
                  const urgencyConfig = {
                    low:      { label: 'Faible',   color: '#10B981', bg: '#D1FAE5' },
                    medium:   { label: 'Modéré',   color: '#F59E0B', bg: '#FEF3C7' },
                    high:     { label: 'Élevé',    color: '#EF4444', bg: '#FEE2E2' },
                    critical: { label: 'Critique', color: '#B91C1C', bg: '#FEE2E2' },
                  };
                  const ug = urgencyConfig[lastResult.urgencyLevel] || { label: lastResult.urgencyLevel, color: c.txt2, bg: c.card };
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10,
                      backgroundColor: ug.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <TriangleAlert size={14} color={ug.color} />
                      <Text style={{ fontSize: 12, fontFamily: FONTS.semibold, color: ug.color }}>
                        Urgence : {ug.label}
                      </Text>
                    </View>
                  );
                })()}

                {/* ── Maladies possibles ── */}
                {lastResult.diseases && lastResult.diseases.length > 0 && (
                  <View style={{ marginTop: 10, padding: 10, borderRadius: 10,
                    backgroundColor: dk ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                    borderWidth: 1, borderColor: c.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <FlaskConical size={13} color={c.txt3} />
                      <Text style={{ color: c.txt3, fontFamily: FONTS.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Maladies possibles
                      </Text>
                    </View>
                    {lastResult.diseases.map((d, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.txt3 }} />
                        <Text style={[S.resultsText, { color: c.txt2 }]}>{d}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* ── Médecin recommandé ── */}
                {lastResult.recommendedDoctor && (
                  <View style={[S.docCard, {
                    backgroundColor: dk ? 'rgba(99,142,203,0.10)' : '#EEF6FF',
                    borderColor: c.blue + '40',
                  }]}>
                    {/* Icône + label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <View style={[S.docIconWrap, { backgroundColor: c.blue }]}>
                        <Stethoscope size={14} color="#fff" />
                      </View>
                      <Text style={[S.docCardLabel, { color: c.blue }]}>
                        Médecin recommandé
                      </Text>
                    </View>
                    {/* Nom + spécialité */}
                    <Text style={[S.docName, { color: c.txt }]}>
                      {lastResult.recommendedDoctor.name.startsWith('Dr')
                        ? lastResult.recommendedDoctor.name
                        : `Dr ${lastResult.recommendedDoctor.name}`}
                    </Text>
                    {lastResult.recommendedDoctor.specialty ? (
                      <Text style={[S.docSpecialty, { color: c.txt2 }]}>
                        {lastResult.recommendedDoctor.specialty}
                      </Text>
                    ) : null}
                    {/* Bouton prendre RDV */}
                    <TouchableOpacity
                      onPress={() => {
                        const doc = lastResult.recommendedDoctor;
                        if (doc?.id) {
                          router.push(`/(app)/patient/find-doctors?doctorId=${doc.id}`);
                        } else if (doc?.specialty) {
                          router.push(`/(app)/patient/find-doctors?specialty=${encodeURIComponent(doc.specialty)}`);
                        } else {
                          router.push('/(app)/patient/find-doctors');
                        }
                      }}
                      style={[S.rdvBtn, { backgroundColor: c.blue }]}
                      activeOpacity={0.85}
                    >
                      <CalendarPlus size={14} color="#fff" />
                      <Text style={S.rdvBtnText}>Prendre rendez-vous</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[S.resultsTs, { color: c.txt3, marginTop: 6 }]}>
                  {format(lastResult.ts, 'HH:mm', { locale: fr })}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={S.resultsPanelEmpty}>
              <View style={[S.resultsEmptyIcon, { backgroundColor: dk ? 'rgba(99,142,203,0.12)' : '#EEF3FB' }]}>
                <Activity size={20} color={c.blue} />
              </View>
              <Text style={[S.resultsEmptyTitle, { color: c.txt }]}>Aucun résultat pour l'instant</Text>
              <Text style={[S.resultsEmptySub, { color: c.txt2 }]}>
                Décrivez vos symptômes dans le chat pour obtenir un diagnostic provisoire et des recommandations personnalisées.
              </Text>
            </View>
          )
        )}
      </View>

      {/* ── ZONE DE CHAT ────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[S.chatArea, !hasConversation && { justifyContent: 'center', flex: 1 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Bulle d'intro bot (toujours visible) */}
          <View style={[S.botBubbleWrap, { backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }]}>
            <View style={[S.botAvatar, { backgroundColor: c.blue }]}>
              <Brain size={16} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.botBubbleText, { color: c.txt }]}>{BOT_INTRO}</Text>
              <View style={[S.disclaimerBox, { borderColor: c.border }]}>
                <View style={S.disclaimerDot} />
                <Text style={[S.disclaimerText, { color: c.txt2 }]}>{BOT_DISCLAIMER}</Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          {messages.map((msg, i) => {
            if (msg.role === 'user') {
              return (
                <View key={i} style={S.userMsgRow}>
                  <LinearGradient colors={GRADIENTS.primary} style={S.userBubble} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={S.userBubbleText}>{msg.content}</Text>
                  </LinearGradient>
                </View>
              );
            }
            if (msg.role === 'error') {
              return (
                <View key={i} style={[S.errorBubble, { backgroundColor: '#FFF0F0', borderColor: '#E05555' }]}>
                  <CircleAlert size={14} color="#E05555" />
                  <Text style={{ color: '#E05555', fontSize: 13, fontFamily: FONTS.regular, flex: 1 }}>{msg.content}</Text>
                </View>
              );
            }
            /* bot */
            return (
              <View key={i} style={[S.botMsgRow, { backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }]}>
                <View style={[S.botAvatar, { backgroundColor: c.blue }]}>
                  <Brain size={14} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.botBubbleText, { color: c.txt }]}>{msg.content}</Text>
                  <Text style={[S.msgTs, { color: c.txt3 }]}>
                    {format(msg.ts, 'HH:mm', { locale: fr })}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Indicateur de frappe */}
          {loading && (
            <View style={[S.botMsgRow, { backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }]}>
              <View style={[S.botAvatar, { backgroundColor: c.blue }]}>
                <Brain size={14} color="#fff" />
              </View>
              <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 }}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[S.typingDot, { backgroundColor: c.blue, opacity: 0.4 + i * 0.3 }]} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── CHIPS DE SYMPTÔMES ──────────────────────────────────────────── */}
        {!loading && (
          <View style={[S.chipsWrap, { backgroundColor: c.bg }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {QUICK_SYMPTOMS.map(sym => (
                <TouchableOpacity
                  key={sym}
                  onPress={() => setInput(prev => prev ? prev + ', ' + sym : sym)}
                  style={[S.chip, { backgroundColor: dk ? 'rgba(99,142,203,0.15)' : '#EEF3FB', borderColor: c.blue + '44' }]}
                  activeOpacity={0.75}
                >
                  <Text style={[S.chipText, { color: c.blue }]}>{sym}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── BARRE D'INPUT (style web) ────────────────────────────────────── */}
        <View style={[S.inputBarWrap, { backgroundColor: c.bg, borderTopColor: c.border }]}>
          <View style={[S.inputBar, { backgroundColor: dk ? '#1E2A3A' : '#F0F4F8', borderColor: c.border }]}>
            {/* Texte */}
            <TextInput
              style={[S.input, { color: c.txt }]}
              placeholder="Décrivez vos symptômes en détail..."
              placeholderTextColor={c.txt3}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              returnKeyType="default"
            />

            {/* Mic */}
            <TouchableOpacity
              style={S.inputActionBtn}
              onPress={() => Alert.alert('Microphone', 'Fonctionnalité vocale à venir.')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Mic size={18} color={c.txt3} />
            </TouchableOpacity>

            {/* Send */}
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={[S.sendBtn, { backgroundColor: input.trim() && !loading ? c.blue : c.txt3 + '60', opacity: input.trim() && !loading ? 1 : 0.6 }]}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Send size={16} color="#fff" />
              }
            </TouchableOpacity>
          </View>

          <Text style={[S.disclaimer, { color: c.txt3 }]}>
            Non substitutif à un médecin. Usage informatif uniquement.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* ── MODAL HISTORIQUE ──────────────────────────────────────────────── */}
      <Modal visible={historyOpen} transparent animationType="slide" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
          <View style={[S.historySheet, { backgroundColor: c.card }]}>
            <View style={S.historyHandle} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt }}>Historique</Text>
              <TouchableOpacity onPress={() => setHistoryOpen(false)}>
                <X size={22} color={c.txt3} />
              </TouchableOpacity>
            </View>

            {/* Bouton nouvelle session */}
            <TouchableOpacity
              onPress={() => { newSession(); setHistoryOpen(false); }}
              style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 16, ...SHADOWS.sm }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={S.histNewBtn}>
                <Plus size={16} color="#fff" />
                <Text style={S.histNewText}>Nouvelle session</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Label */}
            <Text style={[S.histLabel, { color: c.txt3 }]}>HISTORIQUE</Text>

            {/* Liste sessions */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300 }}>
              {loadingHistory ? (
                <ActivityIndicator color={c.blue} style={{ marginTop: 20 }} />
              ) : sessions.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 30 }}>
                  <Clock size={28} color={c.txt3} style={{ marginBottom: 8 }} />
                  <Text style={{ color: c.txt3, fontSize: 13, fontFamily: FONTS.regular, textAlign: 'center' }}>
                    Aucune session précédente
                  </Text>
                </View>
              ) : (
                sessions.map((s, i) => (
                  <TouchableOpacity
                    key={s.id || i}
                    onPress={() => selectSession(s)}
                    style={[S.histSessionRow, {
                      backgroundColor: currentSession === s.id ? c.blueLight : dk ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                      borderColor: currentSession === s.id ? c.blue : c.border,
                    }]}
                  >
                    <View style={[S.histSessionIcon, { backgroundColor: c.blueLight }]}>
                      <Brain size={14} color={c.blue} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.txt }} numberOfLines={2}>
                        {s.symptoms || s.title || 'Session IA'}
                      </Text>
                      {s.created_at && (
                        <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3, marginTop: 2 }}>
                          {format(new Date(s.created_at), 'dd MMM yyyy · HH:mm', { locale: fr })}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */
const S = StyleSheet.create({
  /* Header */
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  backBtn:         { padding: 4 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  headerTitle:     { fontSize: 15, fontFamily: FONTS.bold },
  histBtn:         { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  newSessionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  newSessionText:  { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },

  /* Results panel */
  resultsPanel:       { borderBottomWidth: 1, paddingBottom: 0 },
  resultsPanelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  resultsPanelTitle:  { fontSize: 14, fontFamily: FONTS.bold },
  resultsPanelContent:{ paddingHorizontal: 16, paddingBottom: 14, gap: 4 },
  resultsText:        { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 20 },
  resultsTs:          { fontSize: 11, fontFamily: FONTS.regular },
  resultsPanelEmpty:  { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', gap: 8 },
  resultsEmptyIcon:   { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resultsEmptyTitle:  { fontSize: 15, fontFamily: FONTS.bold, textAlign: 'center' },
  resultsEmptySub:    { fontSize: 12, fontFamily: FONTS.regular, textAlign: 'center', lineHeight: 18 },

  /* Chat area */
  chatArea:       { padding: 16, gap: 14, paddingBottom: 8 },

  /* Bot bubble */
  botBubbleWrap:  { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start' },
  botAvatar:      { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  botBubbleText:  { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22 },
  disclaimerBox:  { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, alignItems: 'flex-start' },
  disclaimerDot:  { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(100,146,201,0.3)', marginTop: 2, flexShrink: 0 },
  disclaimerText: { fontSize: 12, fontFamily: FONTS.regular, lineHeight: 18, flex: 1 },

  /* User bubble */
  userMsgRow:     { alignItems: 'flex-end', marginLeft: 40 },
  userBubble:     { borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  userBubbleText: { color: '#fff', fontSize: 14, fontFamily: FONTS.regular, lineHeight: 22 },

  /* Bot msg */
  botMsgRow:      { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginRight: 40 },
  msgTs:          { fontSize: 10, fontFamily: FONTS.regular, marginTop: 6 },

  /* Error */
  errorBubble:    { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },

  /* Typing dots */
  typingDot:      { width: 8, height: 8, borderRadius: 4 },

  /* Chips */
  chipsWrap:      { paddingVertical: 10 },
  chip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText:       { fontSize: 13, fontFamily: FONTS.semibold },

  /* Input bar */
  inputBarWrap:   { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 92 : 96 },
  inputBar:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  input:          { flex: 1, fontSize: 15, fontFamily: FONTS.regular, maxHeight: 100, lineHeight: 22 },
  inputActionBtn: { padding: 4, alignSelf: 'flex-end', marginBottom: 2 },
  sendBtn:        { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  disclaimer:     { fontSize: 11, fontFamily: FONTS.regular, textAlign: 'center', marginTop: 6, marginBottom: 2 },

  /* Médecin recommandé card */
  docCard:        { marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  docIconWrap:    { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  docCardLabel:   { fontSize: 12, fontFamily: FONTS.extrabold, letterSpacing: 0.4, textTransform: 'uppercase' },
  docName:        { fontSize: 16, fontFamily: FONTS.bold, marginBottom: 2 },
  docSpecialty:   { fontSize: 13, fontFamily: FONTS.regular, marginBottom: 12 },
  rdvBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
                    paddingVertical: 10, borderRadius: 10 },
  rdvBtnText:     { color: '#fff', fontSize: 13, fontFamily: FONTS.bold },

  /* History modal */
  historySheet:   { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  historyHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginBottom: 20 },
  histNewBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  histNewText:    { color: '#fff', fontSize: 15, fontFamily: FONTS.bold },
  histLabel:      { fontSize: 10, fontFamily: FONTS.extrabold, letterSpacing: 0.8, marginBottom: 10 },
  histSessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  histSessionIcon:{ width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
