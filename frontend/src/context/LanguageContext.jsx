import React, { createContext, useContext, useState, useEffect } from 'react';
import translations from '../locales/translations.json';

// Verificar que React está disponible
if (!React || !React.useState) {
  throw new Error('React no está disponible. Verifica que react y react-dom estén correctamente instalados.');
}

const LanguageContext = createContext(null);

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
  if (context === undefined || context === null) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

