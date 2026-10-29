
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SHIFT_DEFINITIONS } from '../types';
import { TelegramInvitationModal } from './TelegramInvitationModal';
import {
  Calendar,
  Users,
  Shield,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Info,
  BusFront,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maart',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Augustus',
  'September',
  'Oktober',
  'November',
  'December',
];

const TELEGRAM_INVITE_URL = 'https://t.me/+B0GMB0QZaM01ZWJk';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
}) => {
  const { user, canViewOverview, canEditPlanning, isAdmin } = useAuth();

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [showInviteModal, setShowInviteModal] = useState(false);

  const [planningStats, setPlanningStats] = useState<{
    v: number;
    d: number;
    l: number;
    x: number;
    total: number;
    lastSaved?: string;
  }>({
    v: 0,
    d: 0,
    l: 0,
    x: 0,
    total: 0,
  });

  useEffect(() => {
    api
      .getPlanning(currentYear, currentMonth)
      .then((res) => {
        const days = (res.planning?.days as Record<number, string>) || {};

        let v = 0;
        let d = 0;
        let l = 0;
        let x = 0;
        let total = 0;

        Object.values(days).forEach((code) => {
          if (code === 'V') v++;
          else if (code === 'D') d++;
          else if (code === 'L') l++;
          else if (code === 'X') x++;

          if (code) total++;
        });

        setPlanningStats({
          v,
          d,
          l,
          x,
          total,
          lastSaved: res.planning?.updatedAt,
        });
      })
      .catch(() => {
        // Behoud de bestaande statistieken als de API-aanroep mislukt.
      });

    const hasSeenInvite = localStorage.getItem('hasSeenTelegramInvite');
    const userRole = user?.role?.toLowerCase() || '';

    if (userRole.includes('teamlid') && !hasSeenInvite) {
      setShowInviteModal(true);
    }
  }, [currentYear, currentMonth, user]);

  const handleCloseInvite = () => {
    try {
      localStorage.setItem('hasSeenTelegramInvite', 'true');
    } catch (error) {
      console.error('Could not save to localStorage', error);
    }

    setShowInviteModal(false);
  };

  const daysInCurrentMonth = new Date(
    currentYear,
    currentMonth,
    0,
  ).getDate();

  const remainingDays = Math.max(
    0,
    daysInCurrentMonth - planningStats.total,
  );

  const progressPercentage = Math.min(
    100,
    (planningStats.total / daysInCurrentMonth) * 100,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 bg-slate-50 px-3 py-5 pb-24 font-sans sm:px-5 md:space-y-7 md:px-8 md:py-7">
      {showInviteModal && (
        <TelegramInvitationModal
          onClose={handleCloseInvite}
          inviteUrl={TELEGRAM_INVITE_URL}
        />
      )}

      {/* Welkomstbalk en huidige periode */}
      <section
        className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6"
        aria-label="Welkom en maandvoortgang"
      >
        <div className="relative flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl border border-slate-700 bg-[#17202b] p-6 shadow-sm sm:flex-row sm:items-center sm:p-8 md:col-span-8">
          <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-[#ffdc00]" />

          <div className="relative min-w-0 pl-2">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-yellow-300">
              <span className="h-2 w-2 rounded-full bg-[#ffdc00]" />
              Koerwerking · Dashboard
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Welkom terug, {user?.name}! 👋
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {remainingDays > 0
                ? `Je hebt nog ${remainingDays} niet ingevulde dagen deze maand.`
                : 'Je planning voor deze maand is compleet ingevuld!'}
            </p>
          </div>

          <div className="relative shrink-0 pl-2">
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white">
              <ShieldCheck className="mr-2 h-4 w-4 text-[#ffdc00]" />
              {user?.role || 'Teamlid'}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-700 bg-[#17202b] p-6 text-center shadow-sm md:col-span-4">
          <div className="absolute left-0 top-0 h-1.5 w-full bg-[#ffdc00]" />

          <div className="mb-2 mt-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-300">
            Huidige periode
          </div>

          <div className="text-2xl font-extrabold tracking-tight text-[#ffdc00]">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </div>

          <div className="mt-2 text-sm font-semibold text-white">
            {planningStats.total} van {daysInCurrentMonth} dagen ingevuld
          </div>

          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-label="Voortgang van de maandplanning"
            aria-valuemin={0}
            aria-valuemax={daysInCurrentMonth}
            aria-valuenow={Math.min(
              planningStats.total,
              daysInCurrentMonth,
            )}
          >
            <div
              className="h-full rounded-full bg-[#ffdc00] transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            {Math.round(progressPercentage)}% ingevuld
          </p>
        </div>
      </section>

      {/* Informatie voor gebruikers die de planning mogen aanpassen */}
      {canEditPlanning && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <p className="leading-relaxed">
            <strong>Let op:</strong> Je kunt de planning voor een maand
            invullen of wijzigen tot en met de 7e van de maand ervoor.
          </p>
        </div>
      )}

      {/* Hoofdnavigatie en OC BUS GBR */}
      <section
        className="grid grid-cols-1 gap-6 lg:grid-cols-12"
        aria-label="Dashboardfuncties"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-8">
          {/* Mijn Planning */}
          <button
            type="button"
            onClick={() => onNavigate('planning')}
            className="group flex min-h-64 flex-col justify-between rounded-3xl border border-slate-200 border-t-4 border-t-[#ffdc00] bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00] focus-visible:ring-offset-2"
          >
            <div>
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ffdc00] text-[#17202b] transition-transform group-hover:scale-105">
                <Calendar className="h-6 w-6" />
              </div>

              <h2 className="text-lg font-extrabold text-slate-900">
                Mijn Planning
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Bekijk of pas je diensten aan voor{' '}
                {MONTH_NAMES[currentMonth - 1]}.
              </p>

              <div className="mt-4 inline-flex items-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                {planningStats.total} dagen ingevuld
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-extrabold uppercase tracking-wider text-slate-700">
              <span>Planning openen</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Team Overzicht */}
          {canViewOverview ? (
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="group flex min-h-64 flex-col justify-between rounded-3xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <Users className="h-6 w-6" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Team Overzicht
                  </h2>

                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                    LIVE
                  </span>
                </div>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Bekijk het matrixrooster van alle collega&apos;s en
                  controleer de dagelijkse shiftbezetting.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                <span>Overzicht bekijken</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ) : (
            <div className="flex min-h-64 flex-col justify-between rounded-3xl border border-slate-200 bg-slate-100/70 p-6 opacity-70">
              <div>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-200 text-slate-500">
                  <Users className="h-6 w-6" />
                </div>

                <h2 className="text-lg font-extrabold text-slate-500">
                  Team Overzicht
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Alleen beschikbaar voor accounts met het recht
                  &apos;Overzicht bekijken&apos;.
                </p>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Geen toegang
              </div>
            </div>
          )}

          {/* Adminportaal of toegangsstatus */}
          {isAdmin ? (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="group flex min-h-56 flex-col justify-between rounded-3xl border border-slate-200 border-t-4 border-t-amber-400 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 sm:col-span-2"
            >
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                  <Shield className="h-6 w-6" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Adminportaal
                  </h2>

                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                    Beheer
                  </span>
                </div>

                <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                  Maak nieuwe gebruikers aan, genereer toegangscodes en
                  pas individuele maandplanningen van medewerkers aan.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-extrabold uppercase tracking-wider text-amber-800">
                <span>Gebruikers beheren</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ) : (
            <div className="flex min-h-56 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2">
              <div>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#17202b] text-[#ffdc00]">
                  <ShieldCheck className="h-6 w-6" />
                </div>

                <h2 className="text-lg font-extrabold text-slate-900">
                  Toegangsstatus
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Je bent veilig ingelogd met je unieke toegangscode.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-xs font-semibold">
                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Planning invullen:{' '}
                      {canEditPlanning ? 'Actief' : 'Niet toegestaan'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>
                      Overzicht bekijken:{' '}
                      {canViewOverview ? 'Actief' : 'Niet toegestaan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rechterkolom */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {/* OC BUS GBR Dagplanning */}
          <button
            type="button"
            onClick={() => onNavigate('oc_planning')}
            className="group w-full rounded-3xl border border-slate-200 border-t-4 border-t-[#ffdc00] bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00] focus-visible:ring-offset-2 sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-slate-900 transition-colors group-hover:bg-[#ffdc00]">
                  <BusFront className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    OC BUS GBR
                  </p>

                  <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                    Dagplanning
                  </h2>
                </div>
              </div>

              <ExternalLink className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-slate-900" />
            </div>

            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Bekijk de actuele dagplanning en mededelingen van OC BUS GBR.
            </p>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-extrabold uppercase tracking-wider text-slate-700">
              <span>Planning bekijken</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* Statistieken */}
          <section
            className="relative overflow-hidden rounded-3xl bg-[#17202b] p-5 text-white shadow-sm sm:p-6"
            aria-label="Statistieken deze maand"
          >
            <div className="absolute left-0 top-0 h-1.5 w-full bg-[#ffdc00]" />

            <h2 className="mb-5 mt-1 text-xs font-extrabold uppercase tracking-widest text-slate-300">
              Statistieken deze maand
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-extrabold tracking-tight text-[#ffdc00]">
                  {planningStats.v + planningStats.d + planningStats.l}
                </div>

                <div className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-wider text-slate-300">
                  Diensten ingepland
                  <span className="mt-1 block text-slate-400">
                    V, D en L
                  </span>
                </div>
              </div>

              <div className="border-l border-white/15 pl-4">
                <div className="text-3xl font-extrabold tracking-tight text-white">
                  {planningStats.x}
                </div>

                <div className="mt-2 text-[10px] font-semibold uppercase leading-relaxed tracking-wider text-slate-300">
                  Vrije dagen
                  <span className="mt-1 block text-slate-400">
                    Code X
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-white/15 pt-4">
              <p className="text-xs leading-relaxed text-slate-400">
                Alle gegevens worden veilig gesynchroniseerd in de cloud.
              </p>
            </div>
          </section>
        </div>
      </section>

      {/* Dienstcodeslegenda */}
      <section
        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-label="Legende van dienstcodes"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#17202b] text-[#ffdc00]">
            <Calendar className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
              Dienstcodes
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Overzicht van de beschikbare dienstcodes
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(SHIFT_DEFINITIONS).map((shift) => (
            <div
              key={shift.code}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-slate-300 hover:bg-white"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-extrabold ${shift.colorClass}`}
              >
                {shift.code}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800">
                  {shift.label}
                </div>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {shift.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="pb-2 text-center text-[11px] text-slate-400">
        Koerwerking-planning · {MONTH_NAMES[currentMonth - 1]} {currentYear}
      </footer>
    </div>
  );
};
