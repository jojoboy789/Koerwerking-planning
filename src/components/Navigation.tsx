
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Calendar, Users, Shield, LogOut, X, UserCheck, Menu, CalendarCheck, MessageSquare, Send, Key, BusFront, Clock, } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { user, logout, canViewOverview, canEditPlanning, isAdmin, canPlannerMode } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, show: canEditPlanning || isAdmin },
    { id: 'planning', label: 'Mijn Planning', icon: Calendar, show: canEditPlanning || isAdmin },
    { id: 'final_planning', label: 'Final Planning', icon: CalendarCheck, show: canEditPlanning || canViewOverview },
    { id: 'team_planning', label: 'Team Plannen', icon: UserCheck, show: canPlannerMode || isAdmin, badge: 'PLANNER' },
    { id: 'chat', label: 'Planner Chat', icon: MessageSquare, show: canPlannerMode || isAdmin },
    { id: 'overview', label: 'Overzicht', icon: Users, show: canViewOverview, badge: 'LIVE' },
    { id: 'admin', label: 'Gebruikers', icon: Shield, show: isAdmin, badge: 'ADMIN' },
    { id: 'oc_planning', label: 'OC Planning', icon: BusFront, show: Boolean(user), badge: 'LIVE' },
  ];

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        setShowChangePasswordModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
              <Menu className="w-6 h-6 text-slate-700" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
              <h1 className="font-bold text-lg text-slate-900">Mijn Planning</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 truncate max-w-[100px]">{user?.name}</span>
            <button onClick={logout} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide-in Menu Container */}
      <div className={`fixed inset-0 z-50 ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        
        {/* Backdrop Overlay */}
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsMenuOpen(false)}
        />
        
        {/* Menu Panel */}
        <div
          className={`relative w-80 max-w-[85vw] h-full bg-white shadow-2xl flex flex-col p-6 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">M</div>
              <h2 className="font-bold text-lg text-slate-900">Menu</h2>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.filter(item => item.show).map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isActive ? 'bg-indigo-500 text-indigo-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                        {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          
          <div className="mt-4 space-y-2">
            <button
              onClick={() => {
                setShowChangePasswordModal(true);
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-base font-semibold text-slate-700 hover:bg-slate-100"
            >
              <Key className="w-5 h-5 text-slate-400" />
              <span>Verander wachtwoord</span>
            </button>
          </div>

          {/* Telegram Invitation Link */}
<div className="mt-8 space-y-2">
  <a
    href="https://t.me/+B0GMB0QZaM01ZWJk"
    target="_blank"
    rel="noopener noreferrer"
    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors bg-sky-100 text-sky-700 hover:bg-sky-200 border border-sky-200/80"
  >
    <Send className="w-5 h-5 text-sky-600" />
    <span>Word lid van Telegram</span>
  </a>

  {/* Uur prestatie */}
  <a
    href="https://studio--studio-7879467716-81e7e.us-central1.hosted.app/"
    target="_blank"
    rel="noopener noreferrer"
    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors bg-[#ffdc00] text-slate-900 hover:bg-[#f0d000] border border-yellow-400/80 shadow-sm"
  >
    <Clock className="w-5 h-5 text-slate-900" />
    <span>Uur prestatie</span>
  </a>
</div>

          {/* Footer with User Info */}
          <div className="mt-4 pt-4 border-t border-slate-200">
             <div className="text-xs text-slate-500">
                Ingelogd als <span className="font-bold text-slate-700">{user?.name}</span>
             </div>
          </div>
        </div>
      </div>
      {showChangePasswordModal && <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />}
    </>
  );
};