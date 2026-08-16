import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SHIFT_DEFINITIONS } from '../types';
import { TelegramInvitationModal } from './TelegramInvitationModal';
import {
  Calendar, Users, Shield, ArrowRight, Sparkles, CheckCircle2,
  Clock, ShieldCheck
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const TELEGRAM_INVITE_URL = 'https://t.me/+B0GMB0QZaM01ZWJk';

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
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
  }>({ v: 0, d: 0, l: 0, x: 0, total: 0 });

  useEffect(() => {
    api.getPlanning(currentYear, currentMonth).then((res) => {
      const days = (res.planning?.days as Record<number, string>) || {};
      let v = 0, d = 0, l = 0, x = 0, total = 0;
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
    }).catch(() => {
      // ignore
    });

    // Check if we should show the Telegram invite modal
    const hasSeenInvite = localStorage.getItem('hasSeenTelegramInvite');
    const userRole = user?.role?.toLowerCase() || '';

    if (userRole.includes('teamlid') && !hasSeenInvite) {
      setShowInviteModal(true);
    }

  }, [currentYear, currentMonth, user]);

  const handleCloseInvite = () => {
    try {
      localStorage.setItem('hasSeenTelegramInvite', 'true');
    } catch (e) {
      console.error("Could not save to localStorage", e);
    }
    setShowInviteModal(false);
  };

  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const remainingDays = Math.max(0, daysInCurrentMonth - planningStats.total);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 pb-24 font-sans">
      {showInviteModal && (
        <TelegramInvitationModal 
          onClose={handleCloseInvite}
          inviteUrl={TELEGRAM_INVITE_URL}
        />
      )}

      {/* Top Bento Row: Welcome & Month Control */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Welkom terug, {user?.name}! 👋
              </h1>
            </div>
            <p className="text-slate-500 text-sm">
              {remainingDays > 0
                ? `Je hebt nog ${remainingDays} niet ingevulde dagen deze maand.`
                : 'Je planning voor deze maand is compleet ingevuld!'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="px-3 py-1 bg-slate-100 rounded-full font-mono text-xs text-slate-600 border border-slate-200 font-semibold">
              {user?.role || 'Teamlid'}
            </span>
          </div>
        </div>

        <div className="md:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-center items-center text-center">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
            Huidige Periode
          </div>
          <div className="text-xl font-bold text-indigo-700">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-medium">
            {planningStats.total} / {daysInCurrentMonth} dagen ingepland
          </div>
        </div>
      </div>

      {/* Main Grid: Bento Action Cards & Live Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Quick Navigation Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* My Planning Card */}
          <div
            onClick={() => onNavigate('planning')}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                Mijn Planning
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Bekijk of pas je diensten aan voor {MONTH_NAMES[currentMonth - 1]}. ({planningStats.total} dagen ingevuld).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
              <span className="uppercase tracking-wider">Planning openen</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Team Overview Card */}
          {canViewOverview ? (
            <div
              onClick={() => onNavigate('overview')}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Team Overzicht
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-bold">
                    LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Raadpleeg het complete matrixrooster van alle collega&apos;s en controleer de dagelijkse shiftbezetting.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span className="uppercase tracking-wider">Overzicht bekijken</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-slate-50/70 border border-slate-200/80 opacity-60 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-400">Team Overzicht</h3>
                <p className="text-xs text-slate-400 mt-1.5">
                  Alleen beschikbaar voor accounts met het recht &apos;Overzicht bekijken&apos;.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/50 text-xs text-slate-400">
                Geen toegang
              </div>
            </div>
          )}

          {/* Admin Portal Card */}
          {isAdmin ? (
            <div
              onClick={() => onNavigate('admin')}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 group cursor-pointer flex flex-col justify-between sm:col-span-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-amber-700 transition-colors">
                      Adminportaal
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
                      BEHEER
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-lg">
                    Maak nieuwe gebruikers aan, genereer toegangscodes en pas individuele maandplanningen van medewerkers aan.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700">
                <span className="uppercase tracking-wider">Gebruikers beheren</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between sm:col-span-2">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg text-slate-900">Toegangsstatus</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Je bent veilig ingelogd met je unieke toegangscode.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Planning invullen: {canEditPlanning ? 'Actief' : 'Niet toegestaan'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Overzicht bekijken: {canViewOverview ? 'Actief' : 'Niet toegestaan'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 4 cols: Stats Bento Box (Indigo Theme matching Design HTML) */}
        <div className="lg:col-span-4 bg-indigo-600 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 flex flex-col justify-between">
          <div>
            <h3 className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-6">
              Statistieken Deze Maand
            </h3>
            <div className="space-y-5">
              <div>
                <div className="text-4xl font-bold tracking-tight">
                  {planningStats.v + planningStats.d + planningStats.l}
                </div>
                <div className="text-indigo-200 text-xs uppercase tracking-wider font-semibold mt-1">
                  Diensten ingepland (V, D, L)
                </div>
              </div>
              <div className="h-px bg-indigo-500/60 w-full"></div>
              <div>
                <div className="text-4xl font-bold tracking-tight">{planningStats.x}</div>
                <div className="text-indigo-200 text-xs uppercase tracking-wider font-semibold mt-1">
                  Vrije dagen (X)
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-indigo-500/50 mt-6">
            <div className="text-[11px] text-indigo-200 leading-tight">
              Alle gegevens worden veilig gesynchroniseerd in de cloud.
            </div>
          </div>
        </div>
      </div>

      {/* Shift Codes Legend Bento Box */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Dienstcodes Legenda
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(SHIFT_DEFINITIONS).map((shift) => (
            <div
              key={shift.code}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${shift.colorClass} shrink-0`}
              >
                {shift.code}
              </div>
              <div>
                <div className="font-bold text-sm text-slate-800">{shift.label}</div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{shift.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
