import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [dk, setDk] = useState(true);

  async function toggleTheme() {
    const next = !dk;
    setDk(next);
    try { await AsyncStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  }

  return (
    <ThemeContext.Provider value={{ dk, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
