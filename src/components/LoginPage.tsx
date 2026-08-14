import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { Calendar, Key, ArrowRight, HelpCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';

const DEFAULT_PRESETS = [
  { name: 'Beheerder (Admin)', code: 'ADM-7701-NT', rights: 'Volledige beheerderstoegang' },
  { name: 'Jan Janssens', code: 'GBR-4829-XK', rights: 'Planning invullen + Teamoverzicht' },
  { name: 'Sarah De Smet', code: 'SRH-8821-ZP', rights: 'Alleen eigen planning invullen' },
  { name: 'Peter Peeters', code: 'PTR-4412-KV', rights: 'Alleen teamoverzicht bekijken' },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [accessCode, setAccessCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [demoPresets, setDemoPresets] = useState<Array<{ name: string; code: string; rights: string }>>(DEFAULT_PRESETS);

  useEffect(() => {
    api.getSetupInfo().then((info) => {
      if (info && info.demoPresets && info.demoPresets.length > 0) {
        setDemoPresets(info.demoPresets);
      }
    }).catch(() => {
      // ignore
    });
  }, []);

  const handleQuickLogin = async (code: string) => {
    setAccessCode(code);
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(code);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('De ingevoerde toegangscode is ongeldig.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      setErrorMessage('Voer een toegangscode in (bijv. ADM-7701-NT of TES-5879-NA).');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await login(accessCode.trim());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('De ingevoerde toegangscode is ongeldig.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-center items-center relative overflow-hidden px-4 py-8">
      {/* Main Login Card - Bento Card */}
      <main className="relative z-10 w-full max-w-md">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
          {/* Header Icon & Titles */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg shadow-indigo-200 text-white font-bold text-2xl">
              M
            </div>
            <h1 className="font-bold text-2xl sm:text-3xl text-slate-900 mb-2 tracking-tight">
              Mijn Planning
            </h1>
            <p className="text-slate-500 text-sm">
              Voer je persoonlijke toegangscode in
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="sr-only" htmlFor="access_code">
                Toegangscode
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                  <Key className="w-5 h-5" />
                </span>
                <input
                  id="access_code"
                  name="access_code"
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="GBR-XXXX-XX"
                  disabled={isSubmitting}
                  className={`w-full bg-slate-50 text-slate-900 font-mono text-center text-lg sm:text-xl font-bold tracking-widest py-3.5 pl-11 pr-4 rounded-2xl border transition-all outline-none placeholder:text-slate-400 uppercase ${
                    errorMessage ? 'border-red-400 bg-red-50/40 focus:border-red-600 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100'
                  }`}
                />
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-100 flex justify-center items-center gap-2 cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group/btn active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-semibold tracking-wide">Controleren & Inloggen...</span>
                </>
              ) : (
                <>
                  <span className="text-sm font-semibold tracking-wide">Inloggen</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Quick Presets Drawer / Helper */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors inline-flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Toegangscode vergeten of aanvragen?</span>
              </button>
            </div>

            {/* Direct 1-click test selector chips */}
            {demoPresets.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Snelle 1-klik test-inlog (klik om direct in te loggen):
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {demoPresets.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleQuickLogin(p.code)}
                      className="text-left p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer shadow-2xs group active:scale-98 disabled:opacity-50"
                      title={`Klik om direct in te loggen als ${p.name}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                          {p.name}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="text-xs font-mono font-bold text-indigo-700 tracking-wider mt-1">
                        {p.code}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5 truncate">{p.rights}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="relative z-10 mt-8 text-center">
        <p className="text-xs text-slate-400 font-medium">
          Mijn Planning &mdash; Bento Grid Layout
        </p>
      </footer>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        demoPresets={demoPresets}
        onSelectPreset={(code) => {
          setAccessCode(code);
          setErrorMessage(null);
        }}
      />
    </div>
  );
};
