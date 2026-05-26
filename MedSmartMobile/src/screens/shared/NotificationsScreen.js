import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Bell, Check, Trash2,
  Calendar, FileText, MessageCircle, TriangleAlert, CircleCheck, CreditCard,
} from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { T, FONTS } from '../../theme';
import { EmptyState } from '../../components/shared';
import * as api from '../../services/api';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { router } from 'expo-router';

function getNotifIcon(type, color) {
  const p = { size: 20, color };
  switch (type) {
    case 'appointment':  return <Calendar       {...p} />;
    case 'prescription': return <FileText       {...p} />;
    case 'message':      return <MessageCircle  {...p} />;
    case 'alert':        return <TriangleAlert  {...p} />;
    case 'verification': return <CircleCheck    {...p} />;
    case 'payment':      return <CreditCard     {...p} />;
    default:             return <Bell           {...p} />;
  }
}

export default function NotificationsScreen({ navigation }) {
  const { dk } = useTheme();
  const { notifications, setNotifications, refresh } = useData();
  const c = dk ? T.dark : T.light;
  const [refreshing, setRefreshing] = useState(false);

  async function markRead(notif) {
    if (notif.is_read) return;
    try {
      await api.markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } catch {}
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
    } catch {
      // Fallback individuel si le bulk endpoint échoue
      const unread = notifications.filter(n => !n.is_read);
      await Promise.allSettled(unread.map(n => api.markNotificationRead(n.id)));
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  function formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isToday(d))     return `Aujourd'hui ${format(d, 'HH:mm')}`;
    if (isYesterday(d)) return `Hier ${format(d, 'HH:mm')}`;
    return format(d, 'dd MMM yyyy', { locale: fr });
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
        <Text style={[styles.headerTitle, { color: c.txt }]}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: c.blue }]}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Check size={14} color={c.blue} />
            <Text style={[styles.markAllText, { color: c.blue }]}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0
        ? (
            <EmptyState
              icon={<Bell size={40} color={c.txt3} />}
              title="Aucune notification"
              subtitle="Vous êtes à jour !"
              dk={dk}
            />
          )
        : (
            <FlatList
              data={notifications}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
              renderItem={({ item: notif }) => (
                <TouchableOpacity
                  onPress={() => markRead(notif)}
                  activeOpacity={0.85}
                  style={[
                    styles.notifItem,
                    { borderBottomColor: c.border },
                    !notif.is_read && { backgroundColor: c.blueLight },
                  ]}
                >
                  {/* Icon circle */}
                  <View style={[
                    styles.iconCircle,
                    { backgroundColor: notif.is_read ? c.bg : c.blue + '18' },
                  ]}>
                    {getNotifIcon(notif.type, notif.is_read ? c.txt3 : c.blue)}
                  </View>

                  {/* Content */}
                  <View style={{ flex: 1 }}>
                    <Text style={[
                      styles.notifTitle,
                      { color: c.txt },
                      !notif.is_read && { fontFamily: FONTS.bold },
                    ]}>
                      {notif.title || notif.message || 'Notification'}
                    </Text>
                    {notif.body && (
                      <Text style={[styles.notifBody, { color: c.txt2 }]} numberOfLines={2}>
                        {notif.body}
                      </Text>
                    )}
                    <Text style={[styles.notifTime, { color: c.txt3 }]}>
                      {formatTime(notif.created_at)}
                    </Text>
                  </View>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <View style={[styles.unreadDot, { backgroundColor: c.blue }]} />
                  )}
                </TouchableOpacity>
              )}
            />
          )
      }
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  headerTitle: { fontSize: 18, fontFamily: FONTS.bold },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: 4 },
  unreadText: { color: '#fff', fontSize: 10, fontFamily: FONTS.bold },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  markAllText: { fontSize: 13, fontFamily: FONTS.semibold },
  notifItem: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  iconCircle: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 14, fontFamily: FONTS.semibold, marginBottom: 3, lineHeight: 20 },
  notifBody: { fontSize: 13, fontFamily: FONTS.regular, lineHeight: 18, marginBottom: 5 },
  notifTime: { fontSize: 11, fontFamily: FONTS.regular },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
