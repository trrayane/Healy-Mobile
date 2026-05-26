import { Tabs } from 'expo-router';
import { LayoutDashboard, ShoppingBag, Pill, ChartBar } from 'lucide-react-native';
import { useTheme } from '../../../src/context/ThemeContext';
import { C, CL } from '../../../src/screens/pharmacist/data';

export default function PharmacistLayout() {
  const { dk } = useTheme();
  const c = dk ? C : CL;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          // ── Flottante ──────────────────────────────────
          position:        'absolute',
          bottom:          20,
          left:            16,
          right:           16,
          borderRadius:    28,
          borderTopWidth:  0,
          // ── Couleurs ───────────────────────────────────
          backgroundColor: c.nav,
          // ── Shadow ────────────────────────────────────
          elevation:       16,
          shadowColor:     '#000',
          shadowOffset:    { width: 0, height: 6 },
          shadowOpacity:   0.14,
          shadowRadius:    18,
          // ── Dimensions ────────────────────────────────
          height:          68,
          paddingBottom:   10,
          paddingTop:      6,
          paddingHorizontal: 8,
        },
        tabBarActiveTintColor:   c.blue,
        tabBarInactiveTintColor: c.txt3,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index"   options={{ title: 'Accueil',   tabBarIcon: ({ color, focused }) => <LayoutDashboard size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
      <Tabs.Screen name="orders"  options={{ title: 'Commandes', tabBarIcon: ({ color, focused }) => <ShoppingBag    size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
      <Tabs.Screen name="stock"   options={{ title: 'Stock',     tabBarIcon: ({ color, focused }) => <Pill           size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
      <Tabs.Screen name="stats"   options={{ title: 'Stats',     tabBarIcon: ({ color, focused }) => <ChartBar      size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} /> }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
