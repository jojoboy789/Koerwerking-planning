import React, { useState, useEffect } from 'react';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

const COOKIE_POLICY_VERSION = 1; // Verhoog dit nummer voor een nieuwe versie

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie-consent');
      if (consent) {
        const { version } = JSON.parse(consent);
        if (version === COOKIE_POLICY_VERSION) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }
    } catch (error) {
        setIsVisible(true);
    }
  }, []);

  const handleConsent = (accepted: boolean) => {
    const consent = {
      version: COOKIE_POLICY_VERSION,
      accepted,
      date: new Date().toISOString(),
    };
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setIsVisible(false);

    if (accepted) {
      console.log('Cookies geaccepteerd! We gaan nu je ervaring... optimaliseren. Ja, dat is het.');
    } else {
      console.log('Cookies geweigerd. Je bent nu een digitale geest, onzichtbaar voor ons.');
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md p-4 sm:p-5 border-t border-slate-200 shadow-2xl z-50 animate-in slide-in-from-bottom duration-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-800">
            <h3 className="font-bold text-base text-slate-900 mb-1.5">🍪 Over Digitale Koekjes & Jouw Privacy</h3>
            <p className="text-xs sm:text-sm">
              Onze app gebruikt cookies, niet de soort met chocoladestukjes, maar de digitale. Ze helpen ons onthouden wie je bent. Lees ons{' '}
              <button onClick={() => setIsModalOpen(true)} className="text-indigo-600 hover:underline font-semibold">epische privacy- & cookieverhaal</button>
              {' '}om te zien hoe we met je data omgaan.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 mt-3 sm:mt-0">
            <button
              onClick={() => handleConsent(true)}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
            >
              Accepteer
            </button>
            <button
              onClick={() => handleConsent(false)}
              className="px-5 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition-colors"
            >
              Weiger
            </button>
          </div>
        </div>
      </div>
      
      <PrivacyPolicyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
