"use client";

import { useLanguage } from '@/lib/language-context';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useState } from 'react';

const languages = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
] as const;

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(lang => lang.code === language);

  return (
    <div className="relative">
      {/* Seçili Dil Butonu */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#1a1f3a] to-[#2a2f4a] border border-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all"
      >
        <Globe className="w-4 h-4 text-[#D4AF37]" />
        <span className="text-2xl">{currentLang?.flag}</span>
        <span className="text-sm text-gray-300 hidden sm:block">{currentLang?.name}</span>
      </motion.button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dil Listesi */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 right-0 z-50 bg-[#1a1f3a] border border-[#D4AF37]/20 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
          >
            {languages.map((lang) => (
              <motion.button
                key={lang.code}
                whileHover={{ backgroundColor: 'rgba(212, 175, 55, 0.1)' }}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                  ${language === lang.code ? 'bg-[#D4AF37]/10 border-l-4 border-[#D4AF37]' : ''}
                `}
              >
                <span className="text-2xl">{lang.flag}</span>
                <span className="text-sm text-gray-200">{lang.name}</span>
                {language === lang.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-2 h-2 rounded-full bg-[#D4AF37]"
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        </>
      )}
    </div>
  );
}