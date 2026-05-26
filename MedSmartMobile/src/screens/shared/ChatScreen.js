import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, EllipsisVertical, Search,
  MessageSquare, Trash2, Pencil, Check, X, Clock, MessageCircle,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { T, FONTS, GRADIENTS, SHADOWS } from '../../theme';
import { Avatar, EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

export default function ChatScreen({ navigation }) {
  const { dk } = useTheme();
  const { userData } = useAuth();
  const { conversations, setConversations } = useData();
  const c = dk ? T.dark : T.light;

  const [activeConv, setActiveConv]   = useState(null);
  const [messages, setMessages]       = useState([]);
  const [newMsg, setNewMsg]           = useState('');
  const [loading, setLoading]         = useState(false);
  const [sending, setSending]         = useState(false);
  const [editingMsg, setEditingMsg]   = useState(null);
  const [search, setSearch]           = useState('');
  const scrollRef    = useRef(null);
  // Tracks first load per conversation — polling must not flash the spinner
  const firstLoadRef = useRef(true);

  const loadMessages = useCallback(async (convId) => {
    const isFirst = firstLoadRef.current;
    if (isFirst) {
      setLoading(true);
      firstLoadRef.current = false;
    }
    try {
      const data = await api.getMessages(convId);
      const list = Array.isArray(data) ? data : data?.results || [];
      setMessages(list);
      api.markConversationRead(convId).catch(() => {});
    } catch {
      // Silent during background polling — only first-load errors matter
      // (network hiccups during polling must not popup an alert)
    } finally {
      if (isFirst) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeConv) {
      firstLoadRef.current = true; // reset for each new conversation
      loadMessages(activeConv.id);
      const interval = setInterval(() => loadMessages(activeConv.id), 5000);
      return () => clearInterval(interval);
    }
  }, [activeConv, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  async function sendMessage() {
    if (!newMsg.trim() || !activeConv) return;
    if (editingMsg) {
      try {
        await api.updateMessage(editingMsg.id, newMsg.trim());
        setMessages(prev => prev.map(m =>
          m.id === editingMsg.id ? { ...m, content: newMsg.trim(), is_edited: true } : m
        ));
        setEditingMsg(null);
        setNewMsg('');
      } catch (e) { Alert.alert('Erreur', e.message); }
      return;
    }
    setSending(true);
    const tempId = Date.now();
    const tempMsg = {
      id: tempId, content: newMsg.trim(),
      sender: userData?.id, is_mine: true,
      created_at: new Date().toISOString(), status: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);
    setNewMsg('');
    try {
      const sent = await api.sendMessage(activeConv.id, newMsg.trim());
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, is_mine: true } : m));
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMsg(newMsg);
      Alert.alert('Erreur', e.message);
    } finally {
      setSending(false);
    }
  }

  async function deleteMessage(msgId) {
    Alert.alert('Supprimer', 'Supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteMessage(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
          } catch (e) { Alert.alert('Erreur', e.message); }
        },
      },
    ]);
  }

  function formatMsgTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d))     return format(d, 'HH:mm');
    if (isYesterday(d)) return `Hier ${format(d, 'HH:mm')}`;
    return format(d, 'dd/MM HH:mm');
  }

  function formatConvTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d)) return format(d, 'HH:mm');
    return format(d, 'dd/MM');
  }

  const filteredConvs = conversations.filter(conv => {
    const name = conv.interlocutor_name || conv.other_participant?.full_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  // ── Conversation list ──────────────────────────────────────────────────────
  if (!activeConv) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
          <TouchableOpacity 
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)/patient/')} 
            style={{ padding: 10, marginLeft: -10 }}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <ArrowLeft size={22} color={c.txt} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.txt }]}>Messages</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={{ padding: 4 }}>
            <EllipsisVertical size={20} color={c.txt2} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border, margin: 16 }]}>
          <Search size={16} color={c.txt3} />
          <TextInput
            style={[styles.searchInput, { color: c.txt }]}
            placeholder="Rechercher..." placeholderTextColor={c.txt3}
            value={search} onChangeText={setSearch}
          />
        </View>

        {filteredConvs.length === 0
          ? (
              <EmptyState
                icon={<MessageCircle size={40} color={c.txt3} />}
                title="Aucune conversation"
                subtitle="Commencez une nouvelle conversation depuis votre tableau de bord"
                dk={dk}
              />
            )
          : (
              <FlatList
                data={filteredConvs}
                keyExtractor={item => String(item.id)}
                renderItem={({ item: conv }) => {
                  const name = conv.interlocutor_name || conv.other_participant?.full_name || 'Utilisateur';
                  const lastMsg = conv.last_message?.content || '';
                  const hasUnread = (conv.unread_count || 0) > 0;
                  return (
                    <TouchableOpacity
                      onPress={() => setActiveConv(conv)}
                      style={[
                        styles.convItem,
                        { borderBottomColor: c.border },
                        hasUnread && { backgroundColor: c.blueLight },
                      ]}
                    >
                      <Avatar
                        firstName={name.split(' ')[0]}
                        lastName={name.split(' ')[1] || ''}
                        size={48}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={[styles.convName, { color: c.txt }, hasUnread && { fontFamily: FONTS.bold }]}>
                            {name}
                          </Text>
                          <Text style={[styles.convTime, { color: c.txt3 }]}>
                            {formatConvTime(conv.last_message?.created_at || conv.updated_at)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text
                            style={[styles.convPreview, { color: c.txt2 }]}
                            numberOfLines={1}
                          >
                            {lastMsg || 'Aucun message'}
                          </Text>
                          {hasUnread && (
                            <View style={[styles.unreadBadge, { backgroundColor: c.blue }]}>
                              <Text style={styles.unreadText}>{conv.unread_count}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              />
            )
        }
      </SafeAreaView>
    );
  }

  // ── Active conversation ────────────────────────────────────────────────────
  const convName = activeConv.interlocutor_name || activeConv.other_participant?.full_name || 'Utilisateur';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Chat header */}
        <View style={[styles.chatHeader, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => setActiveConv(null)} style={{ padding: 4 }}>
            <ArrowLeft size={22} color={c.txt} />
          </TouchableOpacity>
          <Avatar firstName={convName.split(' ')[0]} lastName={convName.split(' ')[1] || ''} size={36} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.chatName, { color: c.txt }]}>{convName}</Text>
            <Text style={[styles.chatStatus, { color: c.green }]}>En ligne</Text>
          </View>
          <TouchableOpacity
            onPress={() => Alert.alert('Options', '', [
              { text: 'Bloquer cet utilisateur', style: 'destructive', onPress: () => api.blockUser(activeConv.other_participant?.id).catch(() => {}) },
              { text: 'Annuler', style: 'cancel' },
            ])}
            style={{ padding: 4 }}
          >
            <EllipsisVertical size={20} color={c.txt2} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        {loading
          ? <ActivityIndicator color={c.blue} style={{ marginTop: 40 }} />
          : (
              <ScrollView
                ref={scrollRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              >
                {messages.length === 0 && (
                  <EmptyState icon={<MessageCircle size={40} color={c.txt3} />} title="Démarrez la conversation" dk={dk} />
                )}
                {messages.map((msg, idx) => {
                  const isMine = msg.is_mine || String(msg.sender) === String(userData?.id);
                  const showDate = idx === 0 || (
                    format(new Date(msg.created_at), 'yyyy-MM-dd') !==
                    format(new Date(messages[idx - 1]?.created_at || msg.created_at), 'yyyy-MM-dd')
                  );
                  return (
                    <React.Fragment key={msg.id}>
                      {showDate && (
                        <View style={styles.dateSeparator}>
                          <Text style={[styles.dateText, { color: c.txt3, backgroundColor: c.card }]}>
                            {format(new Date(msg.created_at), 'EEEE dd MMMM', { locale: fr })}
                          </Text>
                        </View>
                      )}
                      <TouchableOpacity
                        onLongPress={() => isMine && Alert.alert('Message', '', [
                          { text: 'Modifier', onPress: () => { setEditingMsg(msg); setNewMsg(msg.content); } },
                          { text: 'Supprimer', style: 'destructive', onPress: () => deleteMessage(msg.id) },
                          { text: 'Annuler', style: 'cancel' },
                        ])}
                        activeOpacity={0.85}
                        style={[
                          styles.msgWrap,
                          isMine ? styles.msgWrapMine : styles.msgWrapOther,
                        ]}
                      >
                        {!isMine && (
                          <Avatar
                            firstName={convName.split(' ')[0]}
                            lastName={convName.split(' ')[1] || ''}
                            size={28}
                            style={{ marginRight: 8, alignSelf: 'flex-end' }}
                          />
                        )}
                        <View style={{ maxWidth: '75%' }}>
                          <LinearGradient
                            colors={isMine ? GRADIENTS.primary : [c.card, c.card]}
                            style={[
                              styles.msgBubble,
                              !isMine && { borderColor: c.border, borderWidth: 1 },
                            ]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          >
                            <Text style={[
                              styles.msgText,
                              { color: isMine ? '#fff' : c.txt },
                            ]}>
                              {msg.content}
                            </Text>
                          </LinearGradient>
                          <View style={[
                            styles.msgMeta,
                            { justifyContent: isMine ? 'flex-end' : 'flex-start' },
                          ]}>
                            <Text style={[styles.msgTime, { color: c.txt3 }]}>
                              {formatMsgTime(msg.created_at)}
                            </Text>
                            {msg.is_edited && (
                              <Text style={[styles.msgTime, { color: c.txt3, marginLeft: 4 }]}>· modifié</Text>
                            )}
                            {isMine && msg.status === 'sending' && (
                              <Clock size={10} color={c.txt3} style={{ marginLeft: 4 }} />
                            )}
                          </View>
                        </View>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            )
        }

        {/* Edit banner */}
        {editingMsg && (
          <View style={[styles.editBanner, { backgroundColor: c.blueLight, borderTopColor: c.blue }]}>
            <Pencil size={14} color={c.blue} />
            <Text style={[styles.editText, { color: c.blue }]} numberOfLines={1}>
              Modification : {editingMsg.content}
            </Text>
            <TouchableOpacity onPress={() => { setEditingMsg(null); setNewMsg(''); }}>
              <X size={16} color={c.blue} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: c.nav, borderTopColor: c.border }]}>
          <TextInput
            style={[styles.msgInput, { backgroundColor: c.bg, borderColor: c.border, color: c.txt }]}
            placeholder="Votre message..." placeholderTextColor={c.txt3}
            value={newMsg} onChangeText={setNewMsg}
            multiline maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={sending || !newMsg.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={newMsg.trim() ? GRADIENTS.primary : [c.border, c.border]}
              style={styles.sendBtn}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Send size={18} color={newMsg.trim() ? '#fff' : c.txt3} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: FONTS.regular },
  convItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  convName: { fontSize: 15, fontFamily: FONTS.semibold },
  convTime: { fontSize: 11, fontFamily: FONTS.regular },
  convPreview: { fontSize: 13, fontFamily: FONTS.regular, flex: 1, marginRight: 8 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bold },
  chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  chatName: { fontSize: 15, fontFamily: FONTS.bold },
  chatStatus: { fontSize: 12, fontFamily: FONTS.regular },
  dateSeparator: { alignItems: 'center', marginVertical: 12 },
  dateText: { fontSize: 11, fontFamily: FONTS.semibold, paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999 },
  msgWrap: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  msgWrapMine: { justifyContent: 'flex-end' },
  msgWrapOther: { justifyContent: 'flex-start' },
  msgBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  msgText: { fontSize: 15, fontFamily: FONTS.regular, lineHeight: 21 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3, paddingHorizontal: 2 },
  msgTime: { fontSize: 11, fontFamily: FONTS.regular },
  editBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 2, gap: 8 },
  editText: { flex: 1, fontSize: 12, fontFamily: FONTS.semibold },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, gap: 10 },
  msgInput: { flex: 1, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: FONTS.regular, maxHeight: 120 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
