import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { MyPlanningView } from './components/MyPlanningView';
import { TeamOverviewView } from './components/TeamOverviewView';
import { TeamPlanningView } from './components/TeamPlanningView';
import { AdminPortalView } from './components/AdminPortalView';
import { FinalPlanningView } from './components/FinalPlanningView';
import { GeneralChatView } from './components/GeneralChatView';
import { Loader2 } from 'lucide-react';
import { CookieConsent } from './components/CookieConsent';
import { OCPlanningView } from './components/OCPlanningView';


// Update-popup version: bump this value (e.g. to "v2") for the next major update.
const UPDATE_POPUP_VERSION = 'v2.5';
const UPDATE_POPUP_STORAGE_KEY = `koerwerking-update-popup-${UPDATE_POPUP_VERSION}`;

const UpdateWelcomePopup: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [celebrate, setCelebrate] = useState(false);

  const handleOkay = () => {
    setCelebrate(true);
    window.setTimeout(onClose, 1900);
  };

  return (
    <div className="update-popup-backdrop" role="presentation">
      <section
        className={`update-popup-card${celebrate ? ' update-popup-card-celebrate' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-popup-title"
      >
      <div className="update-popup-ribbon">✨ KLEINE UPDATE • VERSIE 2.5</div>

      <div className="update-popup-emoji" aria-hidden="true">🚀</div>

      <h2 id="update-popup-title">
        Klein update, maar fijn! 
        <p>
          (voor de planners)🎉
          </p>
          <p>Lees zeker het bericht</p>
      </h2>

      <p className="update-popup-intro">
       De Koerwerking-planning kreeg een kleine update!
       </p>
Daarom staat er tijdelijk een planning in april 2027, 
<p>

gelieve die te laten staan, </p>zodat de testen kunnen worden uitgevoerd,<p>
</p> Dankjewel! 🙏
<p>
      </p>

      <div className="update-popup-note">
        <strong>💬 Heb je feedback of een leuk idee?</strong>
        <p>
          Een foutje gespot? Een ideetje? Of denk je dat Jonas nog wat werk nodig heeft? 🤣
Laat het gerust weten! Jonas sleutelt met plezier verder aan de planning.
Alle suggesties zijn welkom!
        </p>
      </div>

      <p className="update-popup-signoff">
        Bedankt om mee te bouwen aan de Koerwerking-planning! ❤️
        <br />
        <strong>Groetjeeees! 👋 Jonas</strong>
      </p>

      <button className="update-popup-button" onClick={handleOkay} type="button">
        TOP, IK BEN MEE! 👍
      </button>

      <div className="update-popup-footnote">
        Kleine update, weer een stap vooruit! • Versie 2.5
      </div>
      </section>
      {celebrate && (
        <div className="update-fireworks" aria-hidden="true">
          {[
            { x: 16, y: 27, delay: 0, scale: 1.12, tone: 'gold' },
            { x: 78, y: 23, delay: 90, scale: 1.18, tone: 'blue' },
            { x: 49, y: 43, delay: 210, scale: 1.42, tone: 'gold' },
            { x: 25, y: 68, delay: 330, scale: 1.02, tone: 'pink' },
            { x: 84, y: 64, delay: 420, scale: 1.12, tone: 'blue' },
            { x: 52, y: 17, delay: 560, scale: 0.92, tone: 'pink' },
            { x: 7, y: 49, delay: 680, scale: 0.88, tone: 'blue' },
          ].map((burst, burstIndex) => (
            <div
              className={`update-firework-burst update-firework-${burst.tone}`}
              key={burstIndex}
              style={{
                '--burst-x': `${burst.x}%`,
                '--burst-y': `${burst.y}%`,
                '--burst-delay': `${burst.delay}ms`,
                '--burst-scale': burst.scale,
              } as React.CSSProperties}
            >
              <span className="update-firework-flash" />
              <span className="update-firework-core" />
              {Array.from({ length:  52 }, (_, particleIndex) => {
                const angle = (360 / 52) * particleIndex + (burstIndex * 11);
                const distance = 115 + ((particleIndex * 37 + burstIndex * 23) % 155);
                const duration = 1050 + ((particleIndex * 37 + burstIndex * 53) % 650);
                const delay = burst.delay + ((particleIndex * 17) % 130);
                const length = 24 + ((particleIndex * 17 + burstIndex * 11) % 34);

                return (
                  <i
                    className="update-firework-particle"
                    key={particleIndex}
                    style={{
                      '--particle-angle': `${angle}deg`,
                      '--particle-distance': `${distance}px`,
                      '--particle-duration': `${duration}ms`,
                      '--particle-delay': `${delay}ms`,
                      '--particle-length': `${length}px`,
                      '--particle-depth': `${0.65 + ((particleIndex * 7) % 8) / 10}`,
                    } as React.CSSProperties}
                  />
                );
              })}
            </div>
          ))}
          <span className="update-fireworks-message">🎉 YESSS! 🎉</span>
        </div>
      )}
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, isLoading, canViewOverview, canEditPlanning, isAdmin, canPlannerMode } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  // Show the welcome update only for signed-in users who haven't acknowledged this version.
  useEffect(() => {
    if (!user) {
      setShowUpdatePopup(false);
      return;
    }
    try {
      setShowUpdatePopup(window.localStorage.getItem(UPDATE_POPUP_STORAGE_KEY) !== 'seen');
    } catch {
      // If storage is unavailable, still show the announcement for this session.
      setShowUpdatePopup(true);
    }
  }, [user?.id]);

  const closeUpdatePopup = () => {
    try {
      window.localStorage.setItem(UPDATE_POPUP_STORAGE_KEY, 'seen');
    } catch {
      // The popup can still close even when browser storage is unavailable.
    }
    setShowUpdatePopup(false);
  };

  // Automatically select the default landing tab upon login:
  // - If user only has "Overzicht bekijken" -> 'overview'
  // - For all other Teamleden & Admins -> always first 'dashboard'
  React.useEffect(() => {
    if (user) {
      if (!canEditPlanning && !isAdmin && canViewOverview) {
        setCurrentTab('overview');
      } else {
        setCurrentTab('dashboard');
      }
    }
  }, [user?.id, canEditPlanning, canViewOverview, isAdmin]);

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#111827] text-white flex items-center justify-center px-5 py-10">
        {/* Subtiele achtergrondaccenten in de kleuren van Koerwerking-planning */}
        <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-[#ffdc00]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-sky-400/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.45)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.45)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
          <div className="relative mb-7">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-[#ffdc00]/20 blur-2xl animate-pulse" />
            <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.08] p-2.5 shadow-2xl shadow-black/30 backdrop-blur-sm sm:h-48 sm:w-48">
              <img
                src="/koermannenbus.png"
                alt="Koerwerking buslogo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-4 border-[#111827] bg-[#ffdc00] text-[#111827] shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          </div>

          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.32em] text-[#ffdc00] sm:text-xs">
            Samen sterk op de koer
          </p>
          <h1 className="text-2xl font-black tracking-[0.12em] text-white sm:text-3xl">
            KOERWERKING
          </h1>
          <p className="mt-1 text-sm font-semibold tracking-[0.34em] text-[#ffdc00] sm:text-base">
            PLANNING
          </p>

          <div className="mt-10 w-full max-w-xs">
            <div className="mb-3 flex items-center justify-center gap-2.5 text-sm font-medium text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin text-[#ffdc00]" />
              <span>Systeem initialiseren...</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[38%] rounded-full bg-[#ffdc00] shadow-[0_0_14px_rgba(255,220,0,0.65)] animate-[loadingbar_1.8s_ease-in-out_infinite]" />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500 sm:text-[11px]">
            <span>Planning</span>
            <span className="h-1 w-1 rounded-full bg-[#ffdc00]/70" />
            <span>Team</span>
            <span className="h-1 w-1 rounded-full bg-[#ffdc00]/70" />
            <span>Organisatie</span>
          </div>
        </div>

        <style>{`
          @keyframes loadingbar {
            0% { transform: translateX(-115%); }
            50% { transform: translateX(95%); }
            100% { transform: translateX(260%); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Safety fallback if current tab is not allowed for this user
  let effectiveTab = currentTab;
  if (effectiveTab === 'planning' && !canEditPlanning && canViewOverview) {
    effectiveTab = 'overview';
  } else if (effectiveTab === 'team_planning' && !user?.canPlannerMode && !isAdmin) {
    effectiveTab = canEditPlanning ? 'planning' : 'dashboard';
  } else if (effectiveTab === 'overview' && !canViewOverview) {
    effectiveTab = canEditPlanning ? 'planning' : 'dashboard';
  } else if (effectiveTab === 'admin' && !isAdmin) {
    effectiveTab = canEditPlanning ? 'planning' : 'overview';
  } else if (effectiveTab === 'chat' && !canPlannerMode && !isAdmin) {
    effectiveTab = 'dashboard';
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Navigation
        currentTab={effectiveTab}
        onSelectTab={setCurrentTab}
      />

      <main className="flex-1 overflow-x-hidden">
        {effectiveTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
        {effectiveTab === 'planning' && <MyPlanningView />}
        {effectiveTab === 'team_planning' && <TeamPlanningView />}
        {effectiveTab === 'final_planning' && <FinalPlanningView />}
        {effectiveTab === 'overview' && canViewOverview && <TeamOverviewView onNavigateToTeamPlanning={() => setCurrentTab('team_planning')} />}
        {effectiveTab === 'admin' && isAdmin && <AdminPortalView />}
        {effectiveTab === 'chat' && (canPlannerMode || isAdmin) && <GeneralChatView />}
        {effectiveTab === 'oc_planning' && <OCPlanningView />}
      </main>
      <CookieConsent />
      {showUpdatePopup && <UpdateWelcomePopup onClose={closeUpdatePopup} />}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
