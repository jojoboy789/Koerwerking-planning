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
const UPDATE_POPUP_VERSION = 'v2.3';
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
      <div className="update-popup-ribbon">✨ KLEINE UPDATE • VERSIE 2.3</div>

      <div className="update-popup-emoji" aria-hidden="true">🚀</div>

      <h2 id="update-popup-title">
        WE ZIJN WEER EEN STAPJE VERDER! 🎉
      </h2>

      <p className="update-popup-intro">
       De Koerwerking-planning kreeg een kleine update!
Enkele verbeteringen en handige aanpassingen maken alles weer wat vlotter. 😉
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
        Kleine update, weer een stap vooruit! • Versie 2.3
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-100 flex items-center justify-center text-white font-bold text-2xl animate-pulse">
          M
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
          <span>Systeem initialiseren...</span>
        </div>
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
