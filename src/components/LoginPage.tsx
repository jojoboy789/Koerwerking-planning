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

  // Houd de loginpagina vast op het scherm en voorkom scrollen van document/body.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyHeight = body.style.height;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    body.style.height = '100%';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.height = previousBodyHeight;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, []);

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
    <div className="login-viewport fixed inset-0 flex h-screen h-[100dvh] min-h-0 flex-col items-center justify-center overflow-hidden bg-[#100d1c] px-3 py-2 font-sans text-slate-900 sm:px-5 sm:py-3">

      <style>{`
        html, body, #root {
          min-height: 0;
          background: #100d1c;
        }
        html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden !important;
          overscroll-behavior: none;
        }
        #root { height: 100%; overflow: hidden; }
        .login-viewport {
          position: fixed;
          inset: 0;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          min-height: 0;
          background-color: #100d1c;
          background-image:
            linear-gradient(rgba(8, 10, 20, 0.48), rgba(8, 10, 20, 0.58)),
            url('/hallooooow.png');
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          overflow: hidden;
          isolation: isolate;
        }

        .maintenance-warning-pattern {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: .23;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='130' viewBox='0 0 150 130'%3E%3Cg fill='%23ffdc00' fill-opacity='.12' stroke='%23ffdc00' stroke-opacity='.72' stroke-width='2'%3E%3Cpath d='M75 13 L130 112 H20 Z'/%3E%3C/g%3E%3Cpath d='M75 45 V76 M75 89 V91' stroke='%2317202b' stroke-width='8' stroke-linecap='round'/%3E%3C/svg%3E");
          background-size: 150px 130px;
          background-position: center;
        }
        .login-content { width: 100%; max-height: 100%; display: flex; flex-direction: column; justify-content: center; }
        .login-brand { margin-bottom: clamp(6px, 1.2vh, 14px); }
        .login-logo { width: clamp(34px, 5.5vh, 58px); height: clamp(34px, 5.5vh, 58px); margin-bottom: clamp(3px, .6vh, 8px); }
        .login-title { font-size: clamp(20px, 3.4vh, 32px); line-height: 1.08; }
        .login-subtitle { margin-top: clamp(2px, .5vh, 7px); font-size: clamp(11px, 1.7vh, 14px); }
        .login-maintenance { margin-bottom: clamp(6px, 1vh, 12px); }
        .login-card-body { padding: clamp(10px, 2vh, 24px) clamp(12px, 2.5vw, 28px); }
        .login-card-intro { margin-bottom: clamp(7px, 1.3vh, 16px); }
        .login-form { display: flex; flex-direction: column; gap: clamp(8px, 1.5vh, 16px); }
        .login-input { padding-top: clamp(9px, 1.6vh, 15px); padding-bottom: clamp(9px, 1.6vh, 15px); }
        .login-submit { padding-top: clamp(9px, 1.6vh, 15px); padding-bottom: clamp(9px, 1.6vh, 15px); }
        .login-forgot { margin-top: clamp(8px, 1.5vh, 16px); padding-top: clamp(7px, 1.3vh, 14px); }
        .login-security { margin-top: clamp(5px, .8vh, 10px); }
        .login-footer { margin-top: clamp(3px, .6vh, 8px); }
        .login-maintenance-head { padding: clamp(6px, 1vh, 11px) clamp(9px, 1.5vw, 16px); }
        .login-maintenance-copy { padding: clamp(7px, 1vh, 12px) clamp(9px, 1.5vw, 16px); }
        @media (max-height: 700px) {
          .login-viewport { padding-top: 4px; padding-bottom: 4px; }
          .login-content { transform: scale(.92); transform-origin: center; }
          .login-footer { margin-top: 2px; }
        }
        @media (max-width: 640px) {
          .login-viewport {
            padding-left: max(10px, env(safe-area-inset-left));
            padding-right: max(10px, env(safe-area-inset-right));
            padding-top: max(6px, env(safe-area-inset-top));
            padding-bottom: max(6px, env(safe-area-inset-bottom));
          }
        }
        @media (max-height: 580px) {
          .login-content { transform: scale(.82); }
          .login-logo { display: none; }
          .login-security { display: none; }
        }
      `}</style>

      {/* Halloween-onderhoudsachtergrond: wordt uitsluitend getoond wanneer onderhoud actief is. */}
      {maintenanceActive && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(8, 5, 12, 0.28), rgba(8, 5, 12, 0.42)), url('/halloween-maintenance-background.png')",
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
          }}
        />
      )}


      {/* Alleen de nieuwe Halloween-foto als achtergrond. Geen herhalende decoratieve patronen. */}

      {/* Login */}
      <main className="login-content relative z-10 w-full max-w-md">

        {/* Branding */}
        <div className="login-brand text-center">
          <div className="login-logo mx-auto flex items-center justify-center rounded-2xl bg-orange-500 text-[#100d1c] shadow-lg shadow-black/20">
            <BusFront className="h-8 w-8" strokeWidth={2.5} />
          </div>

          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.25em] text-[#ffdc00]">
            Koerwerking
          </p>

          <h1 className="login-title font-extrabold tracking-tight text-white">
            Mijn Planning
          </h1>

          <p className="login-subtitle leading-relaxed text-slate-300">
            Meld je aan om je planning te bekijken.
          </p>

          {!maintenanceActive && (
            <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-orange-300 drop-shadow-[0_0_10px_rgba(249,115,22,0.35)] sm:mt-3 sm:text-sm">
              🎃 Happy Halloween 👻
            </p>
          )}
        </div>

        {/* Onderhoudsmelding */}
        {maintenanceActive && (
          <div
            role="status"
            className="login-maintenance overflow-hidden rounded-2xl border-2 border-[#ffdc00] bg-[#ffdc00] shadow-xl shadow-black/20"
          >
            <div className="login-maintenance-head flex items-center gap-2 border-b border-black/10 bg-black/5 sm:gap-3">
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

            <div className="login-maintenance-copy">
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
        <div className="login-card overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl shadow-black/20 sm:rounded-3xl">

          {/* Gele accentlijn */}
          <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-amber-400 to-violet-500" />

          <div className="login-card-body">
            <div className="login-card-intro">
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
            <form className="login-form" onSubmit={handleSubmit}>
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
                    className={`login-input w-full rounded-2xl border bg-slate-50 pl-12 pr-12 font-mono text-center text-lg font-bold uppercase tracking-widest text-slate-900 outline-none transition-all placeholder:font-sans placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 ${
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
                className="login-submit group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 font-extrabold text-[#17202b] shadow-md shadow-yellow-100/50 transition-all duration-200 hover:bg-yellow-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="login-forgot border-t border-slate-100 text-center">
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
        <div className="login-security flex items-center justify-center gap-2 text-center text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 shrink-0 text-[#ffdc00]" />

          <span>Persoonlijke toegang tot Koerwerking-planning</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer relative z-10 shrink-0 text-center">
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