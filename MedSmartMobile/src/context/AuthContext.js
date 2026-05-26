import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData]               = useState(null);
  const [accountType, setAccountType]         = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [avatarUri, setAvatarUriState]        = useState(null);

  useEffect(() => { loadStoredAuth(); }, []);

  async function loadStoredAuth() {
    try {
      const [stored, uri] = await Promise.all([
        AsyncStorage.getItem('auth'),
        AsyncStorage.getItem('avatar_uri'),
      ]);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUserData(parsed.userData);
        setAccountType(parsed.accountType);
        setIsAuthenticated(true);

        // Rafraîchir le profil depuis le backend en arrière-plan
        _refreshProfile(parsed.accountType).catch(() => {});
      }
      if (uri) setAvatarUriState(uri);
    } catch {}
    finally { setLoading(false); }
  }

  // ─── Récupère le profil complet depuis /auth/me/ ──────────────────────────
  async function _refreshProfile(role) {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;
      const profile = await api.getMe();
      if (profile && typeof profile === 'object') {
        // Normaliser le rôle depuis la réponse
        const updatedRole = profile.role || role;
        setUserData(profile);
        setAccountType(updatedRole);
        // Persister le profil à jour
        AsyncStorage.setItem('auth', JSON.stringify({
          userData: profile,
          accountType: updatedRole,
        })).catch(() => {});
      }
    } catch {}
  }

  async function setAvatarUri(uri) {
    setAvatarUriState(uri);
    try {
      if (uri) await AsyncStorage.setItem('avatar_uri', uri);
      else      await AsyncStorage.removeItem('avatar_uri');
    } catch {}
  }

  async function login(email, password) {
    let data;
    try {
      data = await api.login(email, password);
    } catch (err) {
      const msg = err.message || '';
      if (
        msg.includes('injoignable') ||
        msg.includes('Network') ||
        msg.includes('fetch') ||
        msg.includes('connect') ||
        msg.includes('timeout')
      ) {
        throw new Error('Impossible de contacter le serveur.\nVérifiez que vous êtes sur le même WiFi que le serveur.');
      }
      throw new Error(msg || 'Identifiants incorrects');
    }

    // Extraire le rôle — gère tous les noms de champs possibles du backend
    const rawRole = data.role
      || data.user?.role
      || data.user?.account_type
      || data.user?.user_type
      || data.account_type
      || 'patient';
    const role = String(rawRole).toLowerCase().trim();

    // Données minimales immédiates (pour naviguer sans attendre)
    const user  = data.user || data;
    const minimalUser = {
      id:         user.id         || data.id,
      email:      user.email      || email,
      role,
      first_name: user.first_name || data.first_name || user.full_name?.split(' ')[0] || '',
      last_name:  user.last_name  || data.last_name  || user.full_name?.split(' ').slice(1).join(' ') || '',
      full_name:  user.full_name  || data.full_name  || '',
      verification_status: user.verification_status || data.verification_status || 'verified',
    };

    // Connexion immédiate avec les données minimales
    _applyLogin(role, minimalUser);

    // Puis charger le profil complet en arrière-plan
    _refreshProfile(role);

    return data;
  }

  function _applyLogin(role, userData) {
    setAccountType(role);
    setUserData(userData);
    setIsAuthenticated(true);
    AsyncStorage.setItem('auth', JSON.stringify({ userData, accountType: role })).catch(() => {});
  }

  // Mise à jour partielle de userData (ex: après saveProfile)
  function updateUserData(partial) {
    setUserData(prev => {
      const merged = { ...prev, ...partial };
      AsyncStorage.setItem('auth', JSON.stringify({ userData: merged, accountType })).catch(() => {});
      return merged;
    });
  }

  // loginWithData pour le mode dev (bypass)
  function loginWithData(role, data) {
    _applyLogin(role, data);
  }

  async function logout() {
    // 1. Réinitialiser l'état immédiatement — l'UI répond sans attendre le réseau
    setIsAuthenticated(false);
    setUserData(null);
    setAccountType(null);
    setAvatarUriState(null);
    // 2. Nettoyer tout le stockage local (tokens inclus)
    await AsyncStorage.multiRemove([
      'auth', 'avatar_uri', 'access_token', 'refresh_token', 'mock_role',
    ]);
    // 3. Informer le serveur (fire & forget — ne bloque pas)
    api.logout().catch(() => {});
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userData,
      accountType,
      loading,
      login,
      loginWithData,
      logout,
      avatarUri,
      setAvatarUri,
      refreshProfile: () => _refreshProfile(accountType),
      updateUserData,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
