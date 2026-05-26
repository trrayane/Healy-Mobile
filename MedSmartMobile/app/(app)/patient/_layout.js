/**
 * _layout.js — Tab bar patient (flottante)
 * 5 onglets : Accueil · Médecins · IA · RDV · Ordo.
 */
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import {
  LayoutDashboard, Calendar, FileText, Search, Brain,
} from 'lucide-react-native';
import { useTheme } from '../../../src/context/ThemeContext';
import { useData }  from '../../../src/context/DataContext';
import { T, FONTS } from '../../../src/theme';

function TabIcon({ Icon, focused, color, badge }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: 26, height: 26 }}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
      {badge > 0 && (
        <View style={{
          position: 'absolute', top: -5, right: -10,
          minWidth: 16, height: 16, borderRadius: 8,
          backgroundColor: '#E05555',
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3,
          borderWidth: 1.5, borderColor: '#fff',
        }}>
          <Text style={{ color: '#fff', fontSize: 9, fontFamily: FONTS.extrabold }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function PatientLayout() {
  const { dk } = useTheme();
  const { unreadNotifs } = useData();
  const c = dk ? T.dark : T.light;

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
        tabBarLabelStyle: {
          fontSize:   11,
          fontFamily: FONTS.semibold,
          marginTop:  2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={LayoutDashboard} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="find-doctors"
        options={{
          title: 'Médecins',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Search} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'IA',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Brain} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'RDV',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Calendar} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="prescriptions"
        options={{
          title: 'Ordo.',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={FileText} focused={focused} color={color} badge={unreadNotifs} />
          ),
        }}
      />

      {/* Écrans cachés */}
      <Tabs.Screen name="profile"         options={{ href: null }} />
      <Tabs.Screen name="pharmacies"      options={{ href: null }} />
      <Tabs.Screen name="caretakers"      options={{ href: null }} />
      <Tabs.Screen name="pharmacy-stock"  options={{ href: null }} />
    </Tabs>
  );
}
