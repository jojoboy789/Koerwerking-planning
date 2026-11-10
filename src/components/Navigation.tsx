import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Shield,
  LogOut,
  X,
  UserCheck,
  Menu,
  CalendarCheck,
  MessageSquare,
  Send,
  KeyRound,
  BusFront,
  ClipboardList,
  Clock3,
  ChevronRight,
  Sparkles,
  PanelLeftClose,
} from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';

/**
 * Koppel gebruikersnamen aan afbeeldingsbestanden in de map public.
 * Voorbeeld: 'Jonas': 'jonasje.PNG'
 */
const USER_AVATARS: Record<string, string> = {
  Jonas: 'jonasje.PNG',
  Dylan: 'Dylantje.PNG',
  Illya: 'illyatje.PNG',
  Jordy: 'Jordyyyy.PNG',
  Bruno: 'Brunotje.PNG',
  Kurt: 'Kurtje.PNG',
  Kristof: 'kristoff.png',
};

interface NavigationProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  show: boolean;
  badge?: string;
  description: string;
};

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const {
    user,
    logout,
    canViewOverview,
    canEditPlanning,
    isAdmin,
    canPlannerMode,
  } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ src: string; alt: string } | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      show: canEditPlanning || isAdmin,
      description: 'Startpagina en meldingen',
    },
    {
      id: 'planning',
      label: 'Mijn Planning',
      icon: CalendarDays,
      show: canEditPlanning || isAdmin,
      description: 'Je persoonlijke planning',
    },
    {
      id: 'final_planning',
      label: 'Final Planning',
      icon: CalendarCheck,
      show: canEditPlanning || canViewOverview,
      description: 'De definitieve planning',
    },
    {
      id: 'team_planning',
      label: 'Team Plannen',
      icon: UserCheck,
      show: canPlannerMode || isAdmin,
      badge: 'PLANNER',
      description: 'Planning voor het team beheren',
    },
    {
      id: 'chat',
      label: 'Planner Chat',
      icon: MessageSquare,
      show: canPlannerMode || isAdmin,
      description: 'Overleg met planners',
    },
    {
      id: 'overview',
      label: 'Overzicht',
      icon: Users,
      show: canViewOverview,
      badge: 'LIVE',
      description: 'Live teamoverzicht',
    },
    {
      id: 'admin',
      label: 'Admin beheer',
      icon: Shield,
      show: isAdmin,
      badge: 'ADMIN',
      description: 'Gebruikers en instellingen',
    },
    {
      id: 'oc_planning',
      label: 'OC Planning',
      icon: BusFront,
      show: Boolean(user),
      badge: 'LIVE',
      description: 'Operationele planning',
    },
    {
      id: 'koerdienst',
      label: 'Koerdienst uitvoeren',
      icon: ClipboardList,
      show: Boolean(user),
      description: 'Dagelijkse koerdienstfiche',
    },
  ];

  const visibleItems = useMemo(() => navItems.filter((item) => item.show), [
    canViewOverview,
    canEditPlanning,
    isAdmin,
    canPlannerMode,
    user,
  ]);
  const activeItem = visibleItems.find((item) => item.id === currentTab);
  const avatarFile = user?.name ? USER_AVATARS[user.name.trim()] : undefined;
  const avatarSrc = avatarFile && !avatarFailed ? `/${avatarFile}` : undefined;
  const initials = user?.avatar || (user?.name ? user.name.substring(0, 2).toUpperCase() : 'U');

  const handleTabClick = (tab: string) => {
    onSelectTab(tab);
    setIsMenuOpen(false);
  };

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.name]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        setShowChangePasswordModal(false);
        setPhotoPreview(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800/70 bg-[#111827] text-white shadow-lg shadow-slate-950/10">
        <div className="mx-auto flex min-h-[72px] max-w-[1600px] items-center justify-between gap-3 px-3 sm:px-5 lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white transition hover:border-[#ffdc00]/50 hover:bg-[#ffdc00] hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-[#ffdc00] focus:ring-offset-2 focus:ring-offset-[#111827]"
              aria-label="Navigatiemenu openen"
              aria-expanded={isMenuOpen}
              aria-controls="main-navigation-drawer"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex min-w-0 items-center gap-3">
              <button
              type="button"
              onClick={() => setPhotoPreview({
                src: '/koermannenbus.png',
                alt: 'Koerwerking buslogo',
              })}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#ffdc00] shadow-[0_5px_18px_rgba(255,220,0,0.18)] transition hover:scale-105 cursor-zoom-in"
              aria-label="Bekijk Koerwerking logo in groot formaat"
            >
              <img
                src="/koermannenbus.png"
                alt="Koerwerking"
                className="h-full w-full object-cover"
              />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#111827] bg-emerald-400" />
            </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black tracking-wide text-white sm:text-base">
                    KOERWERKING
                  </p>
                  <span className="hidden rounded-md border border-[#ffdc00]/25 bg-[#ffdc00]/10 px-1.5 py-0.5 text-[9px] font-black tracking-[0.16em] text-[#ffdc00] sm:inline-flex">
                    PORTAAL
                  </span>
                </div>
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-400">
                  <span className="truncate">{activeItem?.label || 'Planning en teambeheer'}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" />
                  <span className="hidden truncate text-slate-500 sm:inline">Werkruimte</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-bold text-white">{user?.name || 'Gebruiker'}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">Aangemeld</p>
            </div>
            <button
              type="button"
              onClick={() => avatarSrc && setPhotoPreview({
                src: avatarSrc,
                alt: `Profielfoto van ${user?.name || 'gebruiker'}`,
              })}
              disabled={!avatarSrc}
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#ffdc00] to-amber-500 text-xs font-black text-slate-950 shadow-md transition hover:scale-[1.04] disabled:cursor-default"
              title={avatarSrc ? `Bekijk foto van ${user?.name}` : (user?.name || 'Gebruiker')}
              aria-label={avatarSrc ? `Bekijk profielfoto van ${user?.name}` : 'Profielfoto niet beschikbaar'}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={`Profielfoto van ${user?.name || 'gebruiker'}`}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarFailed(true)}
                />
              ) : initials}
            </button>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-500/10 text-rose-300 transition hover:border-rose-400/40 hover:bg-rose-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              aria-label="Uitloggen"
              title="Uitloggen"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-[#ffdc00] via-[#ffdc00]/70 to-transparent" />
      </header>

      {/* Navigatiedrawer */}
      <div
        className={`fixed inset-0 z-[60] ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!isMenuOpen}
      >
        <button
          type="button"
          tabIndex={isMenuOpen ? 0 : -1}
          aria-label="Menu sluiten"
          onClick={() => setIsMenuOpen(false)}
          className={`absolute inset-0 h-full w-full bg-slate-950/65 backdrop-blur-sm transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <aside
          id="main-navigation-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Hoofdnavigatie"
          className={`absolute left-0 top-0 flex h-full w-[min(390px,88vw)] flex-col overflow-hidden border-r border-white/10 bg-[#111827] text-white shadow-2xl transition-transform duration-300 ease-out ${
            isMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-[#1f2937] to-[#111827] px-5 pb-5 pt-6">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[28px] border-[#ffdc00]/[0.06]" />
            <div className="pointer-events-none absolute -right-2 top-16 h-20 w-20 rounded-full bg-[#ffdc00]/[0.06] blur-2xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => setPhotoPreview({
                      src: '/koermannenbus.png',
                      alt: 'Koerwerking buslogo',
                    })}
                    className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#ffdc00] shadow-lg shadow-yellow-500/10 transition hover:scale-105 cursor-zoom-in"
                    aria-label="Bekijk Koerwerking logo in groot formaat"
                  >
                    <img
                      src="/koermannenbus.png"
                      alt="Koerwerking"
                      className="h-full w-full object-cover"
                    />
                  </button>
                <div>
                  <p className="text-sm font-black tracking-[0.12em]">KOERWERKING</p>
                  <p className="mt-1 text-xs text-slate-400">Planning & teamomgeving</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffdc00]"
                aria-label="Menu sluiten"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ffdc00] text-sm font-black text-slate-950">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={`Profielfoto van ${user?.name || 'gebruiker'}`}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{user?.name || 'Gebruiker'}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  Sessie actief
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-[#ffdc00]/70" />
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5" aria-label="Hoofdnavigatie">
            <div className="mb-3 flex items-center justify-between px-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Werkruimte</p>
              <span className="rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-bold tabular-nums text-slate-400">
                {visibleItems.length} {visibleItems.length === 1 ? 'pagina' : 'pagina’s'}
              </span>
            </div>

            <div className="space-y-1.5">
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTabClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-3 text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ffdc00] ${
                      isActive
                        ? 'bg-[#ffdc00] text-slate-950 shadow-lg shadow-yellow-500/10'
                        : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-slate-950/10 text-slate-950'
                        : 'bg-white/[0.06] text-slate-400 group-hover:bg-white/10 group-hover:text-[#ffdc00]'
                    }`}>
                      <Icon className="h-[19px] w-[19px]" strokeWidth={2.1} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">{item.label}</span>
                      <span className={`mt-0.5 block truncate text-[10px] ${
                        isActive ? 'text-slate-800/70' : 'text-slate-500 group-hover:text-slate-400'
                      }`}>
                        {item.description}
                      </span>
                    </span>

                    {item.badge && (
                      <span className={`rounded-md px-2 py-1 text-[9px] font-black tracking-wider ${
                        isActive
                          ? 'bg-slate-950/10 text-slate-900'
                          : item.badge === 'ADMIN'
                            ? 'border border-rose-400/20 bg-rose-400/10 text-rose-300'
                            : item.badge === 'PLANNER'
                              ? 'border border-violet-400/20 bg-violet-400/10 text-violet-300'
                              : 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <span className="absolute bottom-3 left-0 top-3 w-[3px] rounded-r-full bg-slate-950/70" />}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-white/10 bg-black/10 px-4 py-4">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Extra</p>

            <button
              type="button"
              onClick={() => {
                setShowChangePasswordModal(true);
                setIsMenuOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#ffdc00]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-slate-400">
                <KeyRound className="h-4 w-4" />
              </span>
              <span className="flex-1">Verander wachtwoord</span>
              <ChevronRight className="h-4 w-4 text-slate-600" />
            </button>

            <a
              href="https://www.buymeacoffee.com/jonasapp"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex min-h-[46px] w-full items-center justify-center rounded-xl transition-transform duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#BD5FFF] focus:ring-offset-2 focus:ring-offset-[#111827]"
              aria-label="Trakteer Jonas op een Monster via Buy Me a Coffee"
            >
              <img
                src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20Monster&emoji=%F0%9F%91%BE&slug=jonasapp&button_colour=BD5FFF&font_colour=ffffff&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00"
                alt="Buy me a Monster"
                className="h-auto w-full max-w-[220px]"
              />
            </a>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <a
                href="https://t.me/+B0GMB0QZaM01ZWJk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/10 px-2 py-2 text-center text-[11px] font-bold text-sky-200 transition hover:border-sky-300/40 hover:bg-sky-400/20 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <Send className="h-4 w-4 shrink-0" />
                Telegram
              </a>
              <a
                href="https://studio--studio-7879467716-81e7e.us-central1.hosted.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#ffdc00]/30 bg-[#ffdc00] px-2 py-2 text-center text-[11px] font-black text-slate-950 transition hover:bg-[#f2d000] focus:outline-none focus:ring-2 focus:ring-[#ffdc00] focus:ring-offset-2 focus:ring-offset-[#111827]"
              >
                <Clock3 className="h-4 w-4 shrink-0" />
                Uur prestatie
              </a>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] px-3 py-2.5 text-xs font-bold text-rose-300 transition hover:bg-rose-500/15 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              <LogOut className="h-4 w-4" />
              Uitloggen
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3 text-[9px] font-medium text-slate-600">
              <span>Koerwerking planning</span>
              <span className="flex items-center gap-1"><PanelLeftClose className="h-3 w-3" /> Navigatie</span>
            </div>
          </div>
        </aside>
      </div>

      {photoPreview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Profielfoto in groot formaat"
          onClick={() => setPhotoPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffdc00]"
            onClick={() => setPhotoPreview(null)}
            aria-label="Foto sluiten"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={photoPreview.src}
            alt={photoPreview.alt}
            className="h-auto w-auto max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
            style={{
              width: 'min(900px, 95vw)',
            }}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {showChangePasswordModal && (
        <ChangePasswordModal onClose={() => setShowChangePasswordModal(false)} />
      )}
    </>
  );
};
