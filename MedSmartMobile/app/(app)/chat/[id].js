import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  ActivityIndicator, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Image as ImageIcon, Paperclip, EllipsisVertical } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../src/context/ThemeContext';
import { useAuth } from '../../../src/context/AuthContext';
import { T, FONTS } from '../../../src/theme';
import { Avatar } from '../../../src/components/ui';
import * as api from '../../../src/services/api';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { userData } = useAuth();
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  const [conversation, setConversation] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState('');
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);

  const flatListRef  = useRef(null);
  // verrou : une seule tentative de resolution par montage du composant
  const resolving    = useRef(false);
  const intervalRef  = useRef(null);

  useEffect(() => {
    resolving.current = false; // reset a chaque nouvel ID
    load(id);
    intervalRef.current = setInterval(() => load(id), 5000);
    return () => {
      clearInterval(intervalRef.current);
    };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load(cid) {
    // Si on est deja en train de resoudre un 404, on bloque toute nouvelle tentative
    if (resolving.current) return;
    try {
      const [convData, msgsData] = await Promise.all([
        api.getConversationDetail(cid),
        api.getMessages(cid),
      ]);
      setConversation(convData);
      setMessages(Array.isArray(msgsData) ? msgsData : msgsData?.results || []);
      api.markConversationRead(cid).catch(() => {});
    } catch (e) {
      const is404 = e.message?.toLowerCase().includes('no conversation')
        || e.message?.includes('404')
        || e.message?.includes('Not found');

      if (is404) {
        // Poser le verrou AVANT toute operation asynchrone
        resolving.current = true;
        clearInterval(intervalRef.current); // stop le polling immediatement

        // Tenter de creer/trouver la conversation (cid pourrait etre un user ID)
        try {
          const conv = await api.createConversation(cid);
          router.replace(`/(app)/chat/${conv.id}`);
        } catch {
          // user ID invalide ou erreur backend — retour a la liste
          router.replace('/(app)/chat');
        }
      }
      // erreur reseau ou autre : on laisse le polling reessayer
    } finally {
      setLoading(false);
    }
  }

  const handleSend = async () => {
    if (!text.trim() || sending || resolving.current) return;

    const msgText = text.trim();
    setText('');
    setSending(true);

    const tempId = Date.now().toString();
    setMessages(prev => [...prev, {
      id: tempId, sender: userData?.id, content: msgText,
      created_at: new Date().toISOString(), is_temp: true,
    }]);

    try {
      await api.sendMessage(id, msgText);
      // Message sent successfully — refresh silently.
      // Polling (every 5s) will sync if this reload fails.
      load(id).catch(() => {});
    } catch {
      // Only here if sendMessage itself failed
      alert("Erreur lors de l'envoi");
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setText(msgText); // restore text so user can retry
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.is_mine || String(item.sender) === String(userData?.id);
    return (
      <View style={[styles.messageRow, isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isMe && (
          <Avatar 
            firstName={conversation?.other_participant?.full_name?.split(' ')[0]} 
            lastName={conversation?.other_participant?.full_name?.split(' ')[1]} 
            size={32} 
            style={{ marginRight: 8, marginBottom: 4 }}
          />
        )}
        <View style={[
          styles.bubble, 
          isMe ? { backgroundColor: c.blue, borderBottomRightRadius: 4 } : { backgroundColor: c.card, borderBottomLeftRadius: 4, borderColor: c.border, borderWidth: 1 }
        ]}>
          <Text style={{ fontSize: 14, fontFamily: FONTS.regular, color: isMe ? '#fff' : c.txt, lineHeight: 20 }}>
            {item.content}
          </Text>
          <Text style={{ fontSize: 10, fontFamily: FONTS.regular, color: isMe ? 'rgba(255,255,255,0.7)' : c.txt3, alignSelf: 'flex-end', marginTop: 4 }}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && !conversation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={c.txt} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 }}>
          <Avatar 
            firstName={conversation?.other_participant?.full_name?.split(' ')[0]} 
            lastName={conversation?.other_participant?.full_name?.split(' ')[1]} 
            size={36} 
          />
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontSize: 15, fontFamily: FONTS.bold, color: c.txt }}>{conversation?.other_participant?.full_name}</Text>
            <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: '#2D8C6F' }}>En ligne</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.headerBtn}>
          <EllipsisVertical size={20} color={c.txt} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Input Bar */}
        <View style={[styles.inputBar, { backgroundColor: c.nav, borderTopColor: c.border }]}>
          <TouchableOpacity style={styles.attachBtn}>
            <Paperclip size={20} color={c.txt3} />
          </TouchableOpacity>
          
          <View style={[styles.inputContainer, { backgroundColor: c.inputBg, borderColor: c.border }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Écrivez votre message..."
              placeholderTextColor={c.placeholder}
              multiline
              style={[styles.input, { color: c.txt }]}
            />
            <TouchableOpacity style={styles.mediaBtn}>
              <ImageIcon size={20} color={c.txt3} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            onPress={handleSend} 
            disabled={!text.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: text.trim() ? c.blue : c.border }]}
          >
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16 },
  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: Platform.OS === 'ios' ? 24 : 10, borderTopWidth: 1 },
  attachBtn: { padding: 8 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, marginHorizontal: 8, minHeight: 40, maxHeight: 100 },
  input: { flex: 1, paddingVertical: 8, fontSize: 14, fontFamily: FONTS.regular },
  mediaBtn: { padding: 4 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
