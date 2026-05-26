import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Check, Trash2, ArrowLeft, Info, Calendar, Pill } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useData } from '../../src/context/DataContext';
import { T, FONTS } from '../../src/theme';
import { Card, EmptyState } from '../../src/components/ui';
import * as api from '../../src/services/api';

export default function NotificationsScreen() {
  const { dk } = useTheme();
  const { notifications, refresh, setNotifications } = useData();
  const c = dk ? T.dark : T.light;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn(e);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (e) {
      console.warn(e);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'appointment': return { icon: Calendar, color: c.blue };
      case 'prescription': return { icon: Pill, color: c.green };
      default: return { icon: Info, color: '#E8A838' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.nav, borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={c.txt} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontFamily: FONTS.bold, color: c.txt, flex: 1, marginLeft: 12 }}>Notifications</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={{ fontSize: 13, fontFamily: FONTS.semibold, color: c.blue }}>Tout lu</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.blue} />}
      >
        {notifications.length === 0 ? (
          <EmptyState icon={<Bell size={40} color={c.txt3} />} title="Aucune notification" subtitle="Vous serez averti ici dès qu'il y aura du nouveau" dk={dk} />
        ) : (
          notifications.map((n, idx) => {
            const { icon: Icon, color } = getIcon(n.type);
            return (
              <Card key={n.id || idx} dk={dk} style={[styles.notifCard, !n.is_read && { borderLeftWidth: 4, borderLeftColor: color }]}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Icon size={20} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 15, fontFamily: n.is_read ? FONTS.semibold : FONTS.bold, color: c.txt }}>{n.title}</Text>
                      <Text style={{ fontSize: 11, fontFamily: FONTS.regular, color: c.txt3 }}>{n.created_at_human || 'Juste maintenant'}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontFamily: FONTS.regular, color: c.txt2, marginTop: 4, lineHeight: 18 }}>{n.message}</Text>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 16 }}>
                      {!n.is_read && (
                        <TouchableOpacity onPress={() => api.markNotificationRead(n.id).then(() => refresh())}>
                          <Check size={16} color={c.green} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={() => deleteNotification(n.id)}>
                        <Trash2 size={16} color={c.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notifCard: { marginBottom: 12, paddingVertical: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
