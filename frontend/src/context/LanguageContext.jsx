import { createContext, useContext, useState, useEffect } from 'react';
import translations from '../locales/translations.json';

// Ensure a single LanguageContext instance even if the module is evaluated twice
const getGlobalThis = () => (typeof window !== 'undefined' ? window : globalThis);
const __global = getGlobalThis();
if (!__global.__ARCHIVO_LANGUAGE_CONTEXT__) {
  __global.__ARCHIVO_LANGUAGE_CONTEXT__ = createContext(null);
}
const LanguageContext = __global.__ARCHIVO_LANGUAGE_CONTEXT__;

export const LanguageProvider = ({ children }) => {
  // Get saved language or use English as default
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  // Guardar el idioma en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return value;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'es' ? 'en' : 'es');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return a safe default so the app doesn't crash
    if (typeof console !== 'undefined' && !__global.__LANGUAGE_HOOK_WARNED__) {
      console.error('[Language] useLanguage called outside of LanguageProvider or context mismatch. Falling back to default.');
      __global.__LANGUAGE_HOOK_WARNED__ = true;
    }
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key) => key,
      toggleLanguage: () => {},
    };
  }
  return context;
};

export { LanguageContext };
