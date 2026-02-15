"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { tr } from './i18n/tr';
import { en } from './i18n/en';
import { de } from './i18n/de';

type Language = 'tr' | 'en' | 'de';
type Translations = typeof tr;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Translations> = {
  tr,
  en,
  de,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('de');

  // LocalStorage'dan dil yükle
  useEffect(() => {
    const savedLang = localStorage.getItem('gardirop-language') as Language;
    if (savedLang && ['tr', 'en', 'de'].includes(savedLang)) {
      setLanguageState(savedLang);
    } else {
      // Varsayılan dil Almanca
      setLanguageState('de');
      localStorage.setItem('gardirop-language', 'de');
    }
  }, []);

  // Dil değiştir ve kaydet
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('gardirop-language', lang);
  };

  // Çeviri fonksiyonu
  const t = (key: keyof Translations): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook - Dil kullanmak için
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}