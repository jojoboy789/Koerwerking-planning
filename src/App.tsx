import React, { useState } from 'react';
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

const MainLayout: React.FC = () => {
  const { user, isLoading, canViewOverview, canEditPlanning, isAdmin, canPlannerMode } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
      </main>
      <CookieConsent />
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
