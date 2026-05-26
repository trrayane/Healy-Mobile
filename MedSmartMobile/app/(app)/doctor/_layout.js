import { Stack } from 'expo-router';

export default function DoctorLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="patients" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}