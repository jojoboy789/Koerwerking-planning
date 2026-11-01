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
const UPDATE_POPUP_VERSION = 'v1.1';
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
        <div className="update-popup-ribbon">NIEUWE UPDATE • NIEUWE VIBES</div>
        <div className="update-popup-emoji" aria-hidden="true">🎉</div>
        <h2 id="update-popup-title">JAWADDE! WAT EEN UPDATE! 2.0</h2>
        <p className="update-popup-intro">
          De Koerwerking-planning heeft een stevige make-over gekregen.
          Er zijn heel wat veranderingen, verbeteringen en nieuwe snufjes toegevoegd.
          Kortom: er is weer serieus aan de knoppen gedraaid!
        </p>
        <div className="update-popup-note">
          <strong>💬 Vragen, opmerkingen of een geweldig idee?</strong>
          <p>
            Je mag Jonas gerust lastigvallen! Geen schrik, hij bijt niet…
            meestal toch. 🤣 Heb je een idee om de planning nog beter te maken?
            Laat het zeker weten. Alle suggesties zijn welkom!
          </p>
        </div>
        <p className="update-popup-signoff">
          Samen maken we er iets fantastisch van!<br />
          <strong>Groetjeeees! 👋 Jonas</strong>
        </p>
        <button className="update-popup-button" onClick={handleOkay} type="button">
          OKÉ, IK BEN MEE! 🎆
        </button>
        <div className="update-popup-footnote">Eenmalige update-melding • beloofd 😉</div>
      </section>
      {celebrate && (
        <div className="update-fireworks" aria-hidden="true">
          {Array.from({ length: 100 }, (_, i) => (
            <i key={i} style={{
              '--piece-x': `${(i * 37) % 100}%`,
              '--piece-y': `${35 + ((i * 19) % 45)}%`,
              '--piece-dx': `${((i * 53) % 620) - 310}px`,
              '--piece-dy': `${-180 - ((i * 29) % 430)}px`,
              '--piece-delay': `${(i % 13) * 24}ms`,
              '--piece-rotate': `${(i * 47) % 720}deg`,
            } as React.CSSProperties} />
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
