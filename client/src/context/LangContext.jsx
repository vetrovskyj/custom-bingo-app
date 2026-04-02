import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import translations from '../i18n/translations';

const LangContext = createContext(null);

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
};

export const LangProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('lang') || 'cs';
  });

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (newLang) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
  };

  // t() is stable per-language; only recreated when lang changes
  const t = useCallback((key, params = {}) => {
    const dict = translations[lang] || translations['cs'];
    let str = dict[key] ?? translations['en'][key] ?? key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
    return str;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
};
