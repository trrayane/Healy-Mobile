import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import {
  LayoutDashboard, MessageSquare, Bell, User, Search,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { T, FONTS } from '../theme';

// ── Screens ─────────────────────────────────────────────────────────────────
import LoginScreen             from '../screens/auth/LoginScreen';
import RegisterScreen          from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen    from '../screens/auth/ForgotPasswordScreen';

import PatientDashboardScreen  from '../screens/patient/PatientDashboardScreen';
import FindDoctorsScreen       from '../screens/patient/FindDoctorsScreen';

import DoctorDashboardScreen   from '../screens/doctor/DoctorDashboard';
import PharmacistDashboardScreen from '../screens/pharmacist/PharmacistDashboard';
import CaretakerDashboardScreen from '../screens/caretaker/CaretakerDashboard';
import AdminDashboardScreen    from '../screens/admin/AdminDashboard';

import ChatScreen              from '../screens/shared/ChatScreen';
import NotificationsScreen     from '../screens/shared/NotificationsScreen';
import ProfileScreen           from '../screens/shared/ProfileScreen';
import { LoadingScreen }       from '../components/shared';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Auth Stack ───────────────────────────────────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"          component={LoginScreen} />
      <Stack.Screen name="Register"       component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// ── Tab bar icon helper ───────────────────────────────────────────────────────
function TabIcon({ Icon, focused, color, unread }) {
  return (
    <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
      {unread > 0 && (
        <View style={[styles.tabBadge, { backgroundColor: '#E05555' }]}>
          <Text style={styles.tabBadgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </View>
  );
}

// ── Patient Tabs ──────────────────────────────────────────────────────────────
function PatientTabs() {
  const { dk } = useTheme();
  const { unreadNotifs, unreadMessages } = useData();
  const c = dk ? T.dark : T.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.nav,
          borderTopColor: c.border,
          height: 62,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: c.blue,
        tabBarInactiveTintColor: c.txt3,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={PatientDashboardScreen}
        options={{
          title: 'Tableau',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={LayoutDashboard} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="FindDoctors"
        component={FindDoctorsScreen}
        options={{
          title: 'Médecins',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={Search} focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={MessageSquare} focused={focused} color={color} unread={unreadMessages} />,
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Alertes',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={Bell} focused={focused} color={color} unread={unreadNotifs} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ({ focused, color }) => <TabIcon Icon={User} focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

// ── Doctor Tabs ───────────────────────────────────────────────────────────────
function DoctorTabs() {
  const { dk } = useTheme();
  const { unreadNotifs, unreadMessages } = useData();
  const c = dk ? T.dark : T.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.nav, borderTopColor: c.border, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor: c.green,
        tabBarInactiveTintColor: c.txt3,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold },
      }}
    >
      <Tab.Screen name="Dashboard"     component={DoctorDashboardScreen}
        options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon Icon={LayoutDashboard} focused={focused} color={color} /> }} />
      <Tab.Screen name="Chat"          component={ChatScreen}
        options={{ title: 'Messages', tabBarIcon: ({ focused, color }) => <TabIcon Icon={MessageSquare} focused={focused} color={color} unread={unreadMessages} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{ title: 'Alertes', tabBarIcon: ({ focused, color }) => <TabIcon Icon={Bell} focused={focused} color={color} unread={unreadNotifs} /> }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: ({ focused, color }) => <TabIcon Icon={User} focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
}

// ── Pharmacist Tabs ───────────────────────────────────────────────────────────
function PharmacistTabs() {
  const { dk } = useTheme();
  const { unreadNotifs, unreadMessages } = useData();
  const c = dk ? T.dark : T.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.nav, borderTopColor: c.border, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor: c.amber,
        tabBarInactiveTintColor: c.txt3,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold },
      }}
    >
      <Tab.Screen name="Dashboard"     component={PharmacistDashboardScreen}
        options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon Icon={LayoutDashboard} focused={focused} color={color} /> }} />
      <Tab.Screen name="Chat"          component={ChatScreen}
        options={{ title: 'Messages', tabBarIcon: ({ focused, color }) => <TabIcon Icon={MessageSquare} focused={focused} color={color} unread={unreadMessages} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{ title: 'Alertes', tabBarIcon: ({ focused, color }) => <TabIcon Icon={Bell} focused={focused} color={color} unread={unreadNotifs} /> }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: ({ focused, color }) => <TabIcon Icon={User} focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
}

// ── Caretaker Tabs ────────────────────────────────────────────────────────────
function CaretakerTabs() {
  const { dk } = useTheme();
  const { unreadNotifs, unreadMessages } = useData();
  const c = dk ? T.dark : T.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.nav, borderTopColor: c.border, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor: c.purple,
        tabBarInactiveTintColor: c.txt3,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold },
      }}
    >
      <Tab.Screen name="Dashboard"     component={CaretakerDashboardScreen}
        options={{ title: 'Dashboard', tabBarIcon: ({ focused, color }) => <TabIcon Icon={LayoutDashboard} focused={focused} color={color} /> }} />
      <Tab.Screen name="Chat"          component={ChatScreen}
        options={{ title: 'Messages', tabBarIcon: ({ focused, color }) => <TabIcon Icon={MessageSquare} focused={focused} color={color} unread={unreadMessages} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{ title: 'Alertes', tabBarIcon: ({ focused, color }) => <TabIcon Icon={Bell} focused={focused} color={color} unread={unreadNotifs} /> }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: ({ focused, color }) => <TabIcon Icon={User} focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
}

// ── Admin Tabs ────────────────────────────────────────────────────────────────
function AdminTabs() {
  const { dk } = useTheme();
  const { unreadNotifs, unreadMessages } = useData();
  const c = dk ? T.dark : T.light;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.nav, borderTopColor: c.border, height: 62, paddingBottom: 8 },
        tabBarActiveTintColor: c.red,
        tabBarInactiveTintColor: c.txt3,
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semibold },
      }}
    >
      <Tab.Screen name="Dashboard"     component={AdminDashboardScreen}
        options={{ title: 'Admin', tabBarIcon: ({ focused, color }) => <TabIcon Icon={LayoutDashboard} focused={focused} color={color} /> }} />
      <Tab.Screen name="Chat"          component={ChatScreen}
        options={{ title: 'Messages', tabBarIcon: ({ focused, color }) => <TabIcon Icon={MessageSquare} focused={focused} color={color} unread={unreadMessages} /> }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}
        options={{ title: 'Alertes', tabBarIcon: ({ focused, color }) => <TabIcon Icon={Bell} focused={focused} color={color} unread={unreadNotifs} /> }} />
      <Tab.Screen name="Profile"       component={ProfileScreen}
        options={{ title: 'Profil', tabBarIcon: ({ focused, color }) => <TabIcon Icon={User} focused={focused} color={color} /> }} />
    </Tab.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
function RoleNavigator() {
  const { isAuthenticated, accountType, userData } = useAuth();

  if (!isAuthenticated) return <AuthStack />;

  const role    = accountType?.toLowerCase()?.trim() || '';
  const subRole = userData?.role?.toLowerCase()?.trim() || '';

  if (role === 'admin') return <AdminTabs />;
  if (role === 'patient') return <PatientTabs />;

  if (role === 'personnel médical') {
    if (subRole === 'pharmacist') return <PharmacistTabs />;
    if (subRole === 'caretaker')  return <CaretakerTabs />;
    return <DoctorTabs />;
  }

  // Fallback by subRole
  if (subRole === 'doctor')     return <DoctorTabs />;
  if (subRole === 'pharmacist') return <PharmacistTabs />;
  if (subRole === 'caretaker')  return <CaretakerTabs />;
  if (subRole === 'admin')      return <AdminTabs />;

  return <PatientTabs />;
}

// ── App Navigator (exported) ─────────────────────────────────────────────────
export default function AppNavigator() {
  const { loading } = useAuth();
  const { dk } = useTheme();

  if (loading) return <LoadingScreen dk={dk} />;

  return (
    <NavigationContainer>
      <RoleNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: FONTS.bold,
  },
});
