import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import {
  KeyRound,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  BusFront,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();

  // Onderhoudsstatus
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  // Loginvelden
  const [accessCode, setAccessCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Onderhoudsstatus ophalen en elke 15 seconden vernieuwen
  useEffect(() => {
    let isActive = true;

    const checkMaintenanceStatus = async () => {
      try {
        const status = await api.getMaintenanceStatus();

        if (isActive) {
          setMaintenanceActive(status.enabled);
        }
      } catch (error) {
        console.warn(
          'Onderhoudsstatus kon niet worden opgehaald:',
          error
        );
      }
    };

    void checkMaintenanceStatus();

    const interval = window.setInterval(() => {
      void checkMaintenanceStatus();
    }, 15000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

  // Login verwerken
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessCode.trim()) {
      setErrorMessage('Voer je persoonlijke toegangscode in.');
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#17202b] px-4 py-8 font-sans text-slate-900 sm:px-6">

      {/* Achtergrondaccenten */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ffdc00]/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl"
      />

      {/* Onderhoudspatroon met waarschuwingsdriehoeken */}
      {maintenanceActive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="90" viewBox="0 0 100 90"><path d="M50 8 L94 82 H6 Z" fill="#ffdc00" stroke="#ffdc00" stroke-width="3"/><text x="50" y="66" font-size="43" font-family="Arial" font-weight="900" text-anchor="middle" fill="#17202b">!</text></svg>'
            )}")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '100px 90px',
          }}
        />
      )}

      {/* Login */}
      <main className="relative z-10 w-full max-w-md">

        {/* Branding */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#ffdc00] text-[#17202b] shadow-lg shadow-black/20">
            <BusFront className="h-8 w-8" strokeWidth={2.5} />
          </div>

          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.25em] text-[#ffdc00]">
            Koerwerking
          </p>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Mijn Planning
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-300">
            Meld je aan om je planning te bekijken.
          </p>
        </div>

        {/* Onderhoudsmelding */}
        {maintenanceActive && (
          <div
            role="status"
            className="mb-5 overflow-hidden rounded-2xl border-2 border-[#ffdc00] bg-[#ffdc00] shadow-xl shadow-black/20"
          >
            <div className="flex items-center gap-3 border-b border-black/10 bg-black/5 px-4 py-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#17202b] text-[#ffdc00]">
                <AlertCircle className="h-6 w-6" strokeWidth={2.5} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#17202b]/70">
                  Koerwerking-planning
                </p>

                <h2 className="text-lg font-black uppercase tracking-wide text-[#17202b]">
                  Update in progress
                </h2>
              </div>
            </div>

            <div className="px-4 py-3">
              <p className="text-sm font-bold leading-relaxed text-[#17202b]">
                Er worden momenteel updates en verbeteringen uitgevoerd aan
                de applicatie.
              </p>

              <p className="mt-1 text-xs font-medium leading-relaxed text-[#17202b]/80">
                Sommige onderdelen kunnen tijdelijk wijzigen of minder goed
                werken. Je kunt de applicatie gewoon blijven gebruiken.
              </p>
            </div>
          </div>
        )}

        {/* Loginformulierkaart */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl shadow-black/20">

          {/* Gele accentlijn */}
          <div className="h-1.5 w-full bg-[#ffdc00]" />

          <div className="p-6 sm:p-9">
            <div className="mb-7">
              <div className="mb-2 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-700" />

                <h2 className="text-xl font-extrabold text-slate-900">
                  Welkom terug
                </h2>
              </div>

              <p className="text-sm leading-relaxed text-slate-500">
                Gebruik je persoonlijke toegangscode om veilig in te loggen.
              </p>
            </div>

            {/* Foutmelding */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Loginformulier */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="access_code"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Persoonlijke toegangscode
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                    <KeyRound className="h-5 w-5" />
                  </span>

                  <input
                    id="access_code"
                    name="access_code"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value.toUpperCase());

                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="GBR-XXXX-XX"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(errorMessage)}
                    aria-describedby={
                      errorMessage ? 'access-code-error' : undefined
                    }
                    className={`w-full rounded-2xl border bg-slate-50 py-4 pl-12 pr-12 font-mono text-center text-lg font-bold uppercase tracking-widest text-slate-900 outline-none transition-all placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${
                      errorMessage
                        ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 focus:border-[#17202b] focus:bg-white focus:ring-4 focus:ring-yellow-100'
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={isSubmitting}
                    aria-label={
                      showPassword
                        ? 'Verberg toegangscode'
                        : 'Toon toegangscode'
                    }
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center rounded-r-2xl px-4 text-slate-400 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#ffdc00] disabled:cursor-not-allowed"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Je toegangscode wordt automatisch in hoofdletters ingevoerd.
                </p>
              </div>

              <button
                id="login-submit-button"
                type="submit"
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ffdc00] px-6 py-4 font-extrabold text-[#17202b] shadow-md shadow-yellow-100/50 transition-all duration-200 hover:bg-yellow-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Code controleren...</span>
                  </>
                ) : (
                  <>
                    <span>Inloggen</span>
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Toegangscode vergeten */}
            <div className="mt-7 border-t border-slate-100 pt-6 text-center">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00]"
              >
                <HelpCircle className="h-4 w-4" />
                Toegangscode vergeten of aanvragen?
              </button>
            </div>
          </div>
        </div>

        {/* Beveiligingsmelding */}
        <div className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#ffdc00]" />

          <span>Persoonlijke toegang tot Koerwerking-planning</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-8 text-center">
        <p className="text-xs text-slate-400">
          Gemaakt door{' '}
          <a
            href="https://capturedcode.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white underline decoration-[#ffdc00] decoration-2 underline-offset-4 transition-colors hover:text-[#ffdc00]"
          >
            Captured Code
          </a>
        </p>
      </footer>

      {/* Venster voor vergeten toegangscode */}
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />
    </div>
  );
};