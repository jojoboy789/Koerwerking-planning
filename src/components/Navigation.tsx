import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, Users, Shield, LogOut, X, UserCheck, Menu, CalendarCheck } from 'lucide-react';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { user, logout, canViewOverview, canEditPlanning, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: canEditPlanning || isAdmin },
    { id: 'planning', label: 'Mijn Planning', icon: Calendar, show: canEditPlanning || isAdmin },
    { id: 'final_planning', label: 'Final Planning', icon: CalendarCheck, show: canEditPlanning || canViewOverview },
    { id: 'team_planning', label: 'Team Plannen', icon: UserCheck, show: user?.canPlannerMode || isAdmin, badge: 'PLANNER' },
    { id: 'overview', label: 'Overzicht', icon: Users, show: canViewOverview, badge: 'LIVE' },
    { id: 'admin', label: 'Gebruikers', icon: Shield, show: isAdmin, badge: 'ADMIN' },
  ];

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-lg hover:bg-slate-100">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
            <h1 className="font-bold text-lg text-slate-900">Mijn Planning</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 truncate max-w-[100px]">{user?.name}</span>
            <button onClick={logout} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><LogOut className="w-5 h-5"/></button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-lg p-4 space-y-2 z-50">
          {navItems.filter((item) => item.show).map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {item.label}
                </div>
                {item.badge && <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100">{item.badge}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
