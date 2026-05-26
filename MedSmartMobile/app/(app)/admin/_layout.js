import { Tabs } from 'expo-router';
import { LayoutDashboard, Users, ChartBar, User } from 'lucide-react-native';
import { useTheme } from '../../../src/context/ThemeContext';
import { T, FONTS } from '../../../src/theme';

export default function AdminLayout() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: c.nav, borderTopColor: c.border, height: 62, paddingBottom: 8 },
      tabBarActiveTintColor: '#E05555',
      tabBarInactiveTintColor: c.txt3,
      tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} /> }} />
      <Tabs.Screen name="users" options={{ title: 'Utilisateurs', tabBarIcon: ({ color }) => <Users size={22} color={color} /> }} />
      <Tabs.Screen name="stats" options={{ title: 'Stats', tabBarIcon: ({ color }) => <ChartBar size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  );
}
