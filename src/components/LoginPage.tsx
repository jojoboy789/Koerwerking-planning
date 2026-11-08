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

  // Aftelklok naar Pakjesavond (5 december om 18:00, Belgische lokale tijd).
  const [pakjesavondCountdown, setPakjesavondCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      let target = new Date(now.getFullYear(), 11, 5, 18, 0, 0);

      // Is Pakjesavond van dit jaar voorbij, tel dan af naar volgend jaar.
      if (now.getTime() >= target.getTime()) {
        target = new Date(now.getFullYear() + 1, 11, 5, 18, 0, 0);
      }

      const remaining = Math.max(0, target.getTime() - now.getTime());
      const totalSeconds = Math.floor(remaining / 1000);

      setPakjesavondCountdown({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };

    updateCountdown();
    const interval = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(interval);
  }, []);

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
    <div className="login-viewport fixed inset-0 flex h-screen h-[100dvh] min-h-0 flex-col items-center justify-center overflow-hidden bg-[#101a31] px-3 py-2 font-sans text-slate-900 sm:px-5 sm:py-3">

      <style>{`
        html, body, #root {
          min-height: 0;
          background: #101a31;
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
          position: fixed; inset: 0; width: 100%; height: 100vh; height: 100dvh;
          min-height: 0; overflow: hidden; isolation: isolate;
          background:
            radial-gradient(ellipse at 50% 105%, rgba(34, 73, 130, .55), transparent 58%),
            radial-gradient(ellipse at 10% 15%, rgba(158, 37, 54, .34), transparent 42%),
            radial-gradient(ellipse at 92% 20%, rgba(244, 183, 72, .20), transparent 38%),
            linear-gradient(145deg, #050b1a 0%, #0b1831 48%, #172544 72%, #071020 100%);
        }
        .login-brand { position: relative; }
        .login-logo {
          position: relative; overflow: hidden;
          border: 1px solid rgba(255, 239, 178, .9);
          background: linear-gradient(145deg, #fff0a8 0%, #e8ad35 48%, #a96713 100%);
          box-shadow: 0 8px 30px rgba(247, 183, 56, .28), inset 0 1px 0 rgba(255,255,255,.7);
        }
        .login-title {
          color: #fff8e5;
          text-shadow: 0 2px 0 rgba(110, 25, 28, .6), 0 8px 30px rgba(255, 193, 77, .18);
          letter-spacing: -.035em;
        }
        .login-subtitle { color: rgba(235, 242, 255, .82); }
        .pakjesavond-countdown {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 220, 140, .42);
          background: linear-gradient(135deg, rgba(9, 20, 42, .84), rgba(51, 14, 28, .78));
          box-shadow: 0 10px 28px rgba(0,0,0,.24), inset 0 1px 0 rgba(255,255,255,.08);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .countdown-unit {
          border: 1px solid rgba(255, 224, 151, .18);
          background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
        }
        .sinterklaas-banner {
          position: relative; overflow: hidden;
          border: 1px solid rgba(255, 220, 140, .85) !important;
          background: linear-gradient(115deg, rgba(67, 8, 20, .96), rgba(146, 25, 38, .97) 48%, rgba(62, 9, 23, .96)) !important;
          box-shadow: 0 12px 34px rgba(0,0,0,.32), 0 0 24px rgba(239, 177, 65, .12), inset 0 1px 0 rgba(255,255,255,.12) !important;
        }
        .sinterklaas-banner::before {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(110deg, transparent 15%, rgba(255,238,177,.16) 48%, transparent 72%);
          transform: translateX(-100%); animation: sinterklaas-shine 7s ease-in-out infinite;
        }
        @keyframes sinterklaas-shine { 0%, 60%, 100% { transform: translateX(-100%); } 78% { transform: translateX(100%); } }
        .login-card {
          border: 1px solid rgba(255, 230, 160, .55) !important;
          box-shadow: 0 24px 70px rgba(0,0,0,.38), 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.8) !important;
        }
        .login-card > div:first-child {
          height: 5px;
          background: linear-gradient(90deg, #8d1727, #f6c75d 28%, #fff1bb 50%, #f6c75d 72%, #8d1727) !important;
        }
        .login-maintenance {
          border-color: rgba(255, 226, 142, .95) !important;
          background: linear-gradient(135deg, #fff0b0, #eec05a 52%, #f8df92) !important;
          box-shadow: 0 16px 40px rgba(0,0,0,.28), 0 0 24px rgba(250,196,72,.14) !important;
        }
        .login-content { width: 100%; max-height: 100%; display: flex; flex-direction: column; justify-content: center; }
        .login-brand { margin-bottom: clamp(6px, 1.2vh, 14px); }
        .login-logo { width: clamp(34px, 5.5vh, 58px); height: clamp(34px, 5.5vh, 58px); margin-bottom: clamp(3px, .6vh, 8px); }
        .login-title { font-size: clamp(20px, 3.4vh, 32px); line-height: 1.08; }
        .login-subtitle { margin-top: clamp(2px, .5vh, 7px); font-size: clamp(11px, 1.7vh, 14px); }
        .login-maintenance { margin-bottom: clamp(6px, 1vh, 12px); }
        .login-card-body { padding: clamp(10px, 2vh, 24px) clamp(12px, 2.5vw, 28px); }
        .login-card-intro {
          margin-bottom: clamp(7px, 1.3vh, 16px);
          text-align: center;
        }
        .login-card-intro > div {
          justify-content: center;
        }
        .login-card-intro h2 {
          text-align: center;
        }
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

      {/* Achtergrondaccenten */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#ffdc00]/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-sky-400/10 blur-3xl"
      />

      {/* Premium Sinterklaas-achtergrond uit de public-map */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        style={{
          backgroundImage: maintenanceActive
            ? "url('/sintje-onderhoud.png')"
            : "url('/sinterklaas.png')",
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 ${maintenanceActive ? "bg-gradient-to-b from-[#061126]/25 via-[#0a1429]/25 to-[#050b18]/45" : "bg-gradient-to-b from-[#061126]/50 via-[#0a1429]/45 to-[#050b18]/70"}`} />

      {/* Login */}
      <main className="login-content relative z-10 w-full max-w-md">

        {/* Branding */}
        <div className="login-brand text-center">
          <div className="login-logo mx-auto flex items-center justify-center rounded-2xl bg-[#ffdc00] text-[#101a31] shadow-lg shadow-black/20">
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

          <div className="sinterklaas-banner mx-auto mt-3 max-w-[min(92vw,440px)] rounded-[1.35rem] px-6 py-3 text-center">
            <p className="relative z-10 font-serif text-xl font-bold italic tracking-wide text-amber-100 drop-shadow-[0_2px_8px_rgba(255,205,90,.3)] sm:text-3xl">
              Sinterklaas
            </p>
            <p className="relative z-10 mt-0.5 text-[10px] font-bold tracking-[0.25em] text-amber-300 sm:text-xs">
              ✦ 5 DECEMBER · PAKJESAVOND ✦
            </p>
          </div>

          {/* Aftelklok naar Pakjesavond */}
          <div
            className="pakjesavond-countdown mx-auto mt-2.5 w-full max-w-[min(92vw,440px)] rounded-2xl px-3 py-2.5 text-center sm:mt-3 sm:px-4 sm:py-3"
            aria-label={`Aftellen naar Pakjesavond: ${pakjesavondCountdown.days} dagen, ${pakjesavondCountdown.hours} uur, ${pakjesavondCountdown.minutes} minuten en ${pakjesavondCountdown.seconds} seconden`}
          >
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.22em] text-amber-200/90 sm:text-[10px]">
              🎁 Nog even tot Pakjesavond
            </p>
            <div className="relative z-10 grid grid-cols-4 gap-1.5 sm:gap-2">
              {[
                { label: 'DAGEN', value: pakjesavondCountdown.days },
                { label: 'UREN', value: pakjesavondCountdown.hours },
                { label: 'MIN', value: pakjesavondCountdown.minutes },
                { label: 'SEC', value: pakjesavondCountdown.seconds },
              ].map((unit) => (
                <div
                  key={unit.label}
                  className="countdown-unit rounded-xl px-1 py-1.5 sm:py-2"
                >
                  <span className="block font-mono text-lg font-black leading-none tabular-nums text-white sm:text-2xl">
                    {String(unit.value).padStart(2, '0')}
                  </span>
                  <span className="mt-1 block text-[8px] font-bold tracking-[0.12em] text-amber-200/80 sm:text-[9px]">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Onderhoudsmelding */}
        {maintenanceActive && (
          <div
            role="status"
            className="login-maintenance overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-200 via-yellow-300 to-amber-400 shadow-xl shadow-black/30"
          >
            <div className="login-maintenance-head flex items-center gap-2 border-b border-black/10 bg-red-950/5 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-900 text-amber-200">
                <AlertCircle className="h-6 w-6" strokeWidth={2.5} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#101a31]/70">
                  Koerwerking-planning
                </p>

                <h2 className="text-lg font-black uppercase tracking-wide text-[#101a31]">
                  Update in progress
                </h2>
              </div>
            </div>

            <div className="login-maintenance-copy">
              <p className="text-sm font-bold leading-relaxed text-[#101a31]">
                Er worden momenteel updates en verbeteringen uitgevoerd aan
                de applicatie.
              </p>

              <p className="mt-1 text-xs font-medium leading-relaxed text-[#101a31]/80">
                Sommige onderdelen kunnen tijdelijk wijzigen of minder goed
                werken. Je kunt de applicatie gewoon blijven gebruiken.
              </p>
            </div>
          </div>
        )}

        {/* Loginformulierkaart */}
        <div className="login-card overflow-hidden rounded-[1.6rem] border border-amber-100/60 bg-white shadow-2xl shadow-black/20 sm:rounded-[2rem]">

          {/* Gele accentlijn */}
          <div className="h-1.5 w-full bg-gradient-to-r from-red-700 via-amber-300 to-red-700" />

          <div className="login-card-body">
            <div className="login-card-intro">
              <div className="mb-2 flex items-center justify-center gap-2">
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
                        : 'border-slate-200 focus:border-red-600 focus:bg-white focus:ring-4 focus:ring-red-100'
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
                className="login-submit group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-700 via-red-600 to-red-800 px-6 font-extrabold text-white ring-1 ring-inset ring-amber-300 shadow-md shadow-yellow-100/50 transition-all duration-200 hover:bg-yellow-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* Buy Me a Coffee-knop, vast linksonder */}
      <a
        href="https://www.buymeacoffee.com/jonasapp"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-50 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101a31]"
        aria-label="Trakteer Jonas op een Monster via Buy Me a Coffee"
      >
        <img
          src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20Monster&emoji=%F0%9F%91%BE&slug=jonasapp&button_colour=BD5FFF&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"
          alt="Buy me a Monster"
          className="h-auto w-[145px] sm:w-[175px]"
        />
      </a>

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