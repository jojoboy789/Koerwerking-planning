import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, Users, Shield, LogOut, X, UserCheck } from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMobileNavOpen: boolean;
  onCloseMobileNav: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  isMobileNavOpen,
  onCloseMobileNav,
}) => {
  const { user, logout, canViewOverview, canEditPlanning, isPlanner, isAdmin } = useAuth();

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    onCloseMobileNav();
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: canEditPlanning || isAdmin,
    },
    {
      id: 'planning',
      label: 'Mijn Planning',
      icon: Calendar,
      show: canEditPlanning || isAdmin,
    },
    {
      id: 'team_planning',
      label: 'Team Plannen',
      icon: UserCheck,
      show: isPlanner || isAdmin || canViewOverview,
      badge: 'PLANNER',
    },
    {
      id: 'overview',
      label: 'Overzicht',
      icon: Users,
      show: canViewOverview,
      badge: 'LIVE',
    },
    {
      id: 'admin',
      label: 'Gebruikers',
      icon: Shield,
      show: isAdmin,
      badge: 'ADMIN',
    },
  ];

  const content = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-slate-200 shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md shadow-indigo-100">
              M
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-900">
                Mijn<br />Planning
              </h1>
            </div>
          </div>
          {isMobileNavOpen && (
            <button
              onClick={onCloseMobileNav}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <div className="p-4 space-y-1.5 font-sans">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-wider ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Footer User Info & Logout */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="mb-3 px-2 flex items-center gap-2.5 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="truncate">Ingelogd als <strong className="text-slate-800 font-semibold">{user?.name}</strong></span>
        </div>
        <button
          id="logout-button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-xs font-semibold uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" />
          <span>Uitloggen</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 h-full w-64 z-40">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileNav}
          ></div>
          <div className="relative w-72 max-w-[85vw] h-full z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
