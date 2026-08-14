import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, Menu, ShieldCheck } from 'lucide-react';

interface TopHeaderProps {
  currentTab: string;
  onOpenMobileNav: () => void;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  showSearch?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTab,
  onOpenMobileNav,
  searchTerm = '',
  onSearchChange,
  showSearch = false,
}) => {
  const { user } = useAuth();

  const getBreadcrumbTitle = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'planning':
        return 'Mijn Planning';
      case 'team_planning':
        return 'Team Plannen & Diensten Beheren';
      case 'overview':
        return 'Overzicht';
      case 'admin':
        return 'Gebruikersbeheer';
      default:
        return 'Mijn Planning';
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 flex justify-between items-center px-4 md:px-8 py-3.5 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileNav}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base md:text-lg font-bold text-slate-900 tracking-tight">
            {getBreadcrumbTitle()}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        {showSearch && onSearchChange && (
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Zoek teamlid..."
              className="bg-slate-50 border border-slate-200 text-slate-900 text-xs md:text-sm rounded-xl pl-9 pr-4 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all w-48 md:w-60 placeholder:text-slate-400"
            />
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-3 text-slate-500">
          {/* Firebase Cloud status indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-full text-[11px] font-medium text-amber-900 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-semibold text-slate-700">Firebase:</span>
            <span className="font-mono text-amber-700">planning-koer-gbr</span>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.avatar || (user?.name ? user.name.substring(0, 2).toUpperCase() : 'U')}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px] flex items-center gap-1">
                {user?.name}
                {user?.isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" title="Admin" />}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                {user?.isAdmin ? 'Beheerder' : user?.role || 'Teamlid'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
