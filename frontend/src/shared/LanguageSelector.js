import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = i18n.language?.startsWith('ko') ? 'KO' : 'EN';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLang = (lang) => {
    i18n.changeLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-medium text-gray-600 hover:text-gray-900 bg-transparent border-none cursor-pointer px-2 py-1 rounded hover:bg-gray-100 transition-colors"
      >
        {currentLang}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[80px] z-[2000]">
          <button onClick={() => changeLang('ko')} className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-none cursor-pointer bg-transparent ${currentLang === 'KO' ? 'text-blue-500 font-medium' : 'text-gray-700'}`}>
            한국어
          </button>
          <button onClick={() => changeLang('en')} className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 border-none cursor-pointer bg-transparent ${currentLang === 'EN' ? 'text-blue-500 font-medium' : 'text-gray-700'}`}>
            English
          </button>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
