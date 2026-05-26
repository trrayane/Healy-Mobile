import { Tabs } from 'expo-router';
import { useTheme } from '../../../src/context/ThemeContext';
import { T } from '../../../src/theme';

// Le tab bar est géré en interne par CaretakerDashboard (custom 5 onglets)
// Ce layout masque la tab bar native d'Expo Router
export default function CaretakerLayout() {
  const { dk } = useTheme();
  const c = dk ? T.dark : T.light;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { display: 'none' }, // Tab bar interne dans CaretakerDashboard
    }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="patients" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}