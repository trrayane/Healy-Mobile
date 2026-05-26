import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFF' }}>
        <ActivityIndicator size="large" color="#6B8FD4" />
      </View>
    );
  }

  if (!isAuthenticated) return null;

  return <Slot />;
}