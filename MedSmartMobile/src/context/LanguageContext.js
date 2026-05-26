import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

const translations = {
  fr: {
    auth: {
      login: { title: 'Connexion', subtitle: 'Connectez-vous a votre compte' },
    },
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('fr');

  function t(key) {
    const keys = key.split('.');
    let result = translations[lang];
    for (const k of keys) result = result?.[k];
    return result || '';
  }

  return (
    <LanguageContext.Provider value={{ t, lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
