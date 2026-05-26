// ─────────────────────────────────────────────────────────────────────────────
// src/context/DataContext.js — Med Smart Mobile
// Charge les données UNIQUEMENT quand l'utilisateur est authentifié
// Se vide automatiquement au logout
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext({
  appointments:     [],
  prescriptions:    [],
  notifications:    [],
  conversations:    [],
  unreadNotifs:     0,
  unreadMessages:   0,
  treatments:       [],
  labResults:       [],
  loading:          false,
  refresh:          async () => {},
  setNotifications: () => {},
  setConversations: () => {},
});

export function DataProvider({ children }) {
  const { isAuthenticated } = useAuth();

  const [appointments,   setAppointments]   = useState([]);
  const [prescriptions,  setPrescriptions]  = useState([]);
  const [notifications,  setNotifications]  = useState([]);
  const [conversations,  setConversations]  = useState([]);
  const [unreadNotifs,   setUnreadNotifs]   = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [treatments,     setTreatments]     = useState([]);
  const [labResults,     setLabResults]     = useState([]);
  const [loading,        setLoading]        = useState(false);

  // ─── Normalise any API response to a plain array ─────────────────────────
  function toArray(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (Array.isArray(val.results)) return val.results;
    if (Array.isArray(val.data)) return val.data;
    return [];
  }

  // ─── Vider toutes les données (logout) ────────────────────────────────────
  function clearAll() {
    setAppointments([]);
    setPrescriptions([]);
    setNotifications([]);
    setConversations([]);
    setTreatments([]);
    setLabResults([]);
    setUnreadNotifs(0);
    setUnreadMessages(0);
  }

  // ─── Charger les données depuis le backend ────────────────────────────────
  const refresh = useCallback(async () => {
    // Ne rien charger si pas connecté
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.getMyAppointments(),
        api.getMyPrescriptions(),
        api.getNotifications(),
        api.getTreatments(),
        api.getLabResults(),
        api.getConversations(),
      ]);

      const [appts, rxs, notifs, treats, labs, convs] = results;

      if (appts.status  === 'fulfilled') setAppointments(toArray(appts.value));
      if (rxs.status    === 'fulfilled') setPrescriptions(toArray(rxs.value));
      if (treats.status === 'fulfilled') setTreatments(toArray(treats.value));
      if (labs.status   === 'fulfilled') setLabResults(toArray(labs.value));

      if (notifs.status === 'fulfilled') {
        const list = toArray(notifs.value);
        setNotifications(list);
        setUnreadNotifs(list.filter(n => !n.is_read).length);
      }

      if (convs.status === 'fulfilled') {
        const list = toArray(convs.value);
        setConversations(list);
        setUnreadMessages(list.reduce((acc, c) => acc + (c.unread_count || 0), 0));
      }

    } catch {
      // Silencieux — les tableaux restent vides
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // ─── Réagir au changement de statut d'authentification ───────────────────
  useEffect(() => {
    if (isAuthenticated) {
      // Connecté → charger les données
      refresh();
    } else {
      // Déconnecté → vider toutes les données
      clearAll();
    }
  }, [isAuthenticated]);

  // ─── Polling conversations + notifications toutes les 30s ─────────────────
  // (pour maintenir le badge de messages non lus à jour sans pull-to-refresh)
  useEffect(() => {
    if (!isAuthenticated) return;
    const id = setInterval(async () => {
      try {
        const [convRes, notifRes] = await Promise.allSettled([
          api.getConversations(),
          api.getNotifications(),
        ]);
        if (convRes.status === 'fulfilled') {
          const list = toArray(convRes.value);
          setConversations(list);
          setUnreadMessages(list.reduce((acc, c) => acc + (c.unread_count || 0), 0));
        }
        if (notifRes.status === 'fulfilled') {
          const list = toArray(notifRes.value);
          setNotifications(list);
          setUnreadNotifs(list.filter(n => !n.is_read).length);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  // ─── Keep unreadNotifs in sync ────────────────────────────────────────────
  useEffect(() => {
    setUnreadNotifs(notifications.filter(n => !n.is_read).length);
  }, [notifications]);

  // ─── Keep unreadMessages in sync ─────────────────────────────────────────
  useEffect(() => {
    setUnreadMessages(conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0));
  }, [conversations]);

  return (
    <DataContext.Provider value={{
      appointments,
      prescriptions,
      notifications,
      conversations,
      unreadNotifs,
      unreadMessages,
      treatments,
      labResults,
      loading,
      refresh,
      setNotifications,
      setConversations,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
