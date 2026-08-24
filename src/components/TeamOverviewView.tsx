import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TeamMemberOverview, ShiftCode, SHIFT_DEFINITIONS } from '../types';
import { WeekSelectionModal } from './WeekSelectionModal';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  X,
  Save,
  Clock,
  Calendar,
  UserCheck,
  Filter,
  ArrowRight,
  Sliders,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

interface TeamOverviewViewProps {
  onNavigateToTeamPlanning?: () => void;
}

export const TeamOverviewView: React.FC<TeamOverviewViewProps> = ({ onNavigateToTeamPlanning }) => {
  const { user, canPlannerMode, isAdmin } = useAuth();
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);

  const [teamData, setTeamData] = useState<TeamMemberOverview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'conflict' | 'missing'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Day resolution modal state
  const [selectedDayDetail, setSelectedDayDetail] = useState<number | null>(null);
  const [dayEditState, setDayEditState] = useState<Record<string, ShiftCode>>({});
  const [isSavingDay, setIsSavingDay] = useState<boolean>(false);
  const [daySaveMessage, setDaySaveMessage] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getTeamOverview(currentYear, currentMonth);
      setTeamData(res.teamData || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kon teamoverzicht niet ophalen.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Unique roles for filter dropdown (excluding planning roles)
  const roles = useMemo(() => {
    const set = new Set<string>();
    teamData.forEach((t) => {
      const r = (t.user.role || '').trim().toLowerCase();
      if (r !== 'planning' && r !== 'planner' && t.user.role) {
        set.add(t.user.role);
      }
    });
    return Array.from(set);
  }, [teamData]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return teamData.filter((item) => {
      const r = (item.user.role || '').trim().toLowerCase();
      if (r === 'planning' || r === 'planner') return false;

      const matchesSearch =
        item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.user.role && item.user.role.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = selectedRole === 'all' || item.user.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [teamData, searchQuery, selectedRole]);

  // Daily totals summary calculation
  const dailyTotals = useMemo(() => {
    const totals: Record<
      number,
      {
        V: number;
        D: number;
        L: number;
        R: number;
        X: number;
        empty: number;
        byShift: {
          V: Array<{ userId: string; name: string; role?: string }>;
          D: Array<{ userId: string; name: string; role?: string }>;
          L: Array<{ userId: string; name: string; role?: string }>;
          R: Array<{ userId: string; name: string; role?: string }>;
          X: Array<{ userId: string; name: string; role?: string }>;
          none: Array<{ userId: string; name: string; role?: string }>;
        };
        isIdeal: boolean;
        hasConflict: boolean;
        isMissing: boolean;
        isWeekend: boolean;
        missingShifts: ShiftCode[];
        conflictShifts: ShiftCode[];
      }
    > = {};

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth - 1, d);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      totals[d] = {
        V: 0,
        D: 0,
        L: 0,
        R: 0,
        X: 0,
        empty: 0,
        byShift: { V: [], D: [], L: [], R: [], X: [], none: [] },
        isIdeal: false,
        hasConflict: false,
        isMissing: false,
        isWeekend,
        missingShifts: [],
        conflictShifts: [],
      };
    }

    filteredMembers.forEach((m) => {
      const days = m.planning?.days || {};
      for (let d = 1; d <= daysInMonth; d++) {
        const code = days[d];
        const memberInfo = { userId: m.user.id, name: m.user.name, role: m.user.role };
        if (code === 'V') {
          totals[d].V++;
          totals[d].byShift.V.push(memberInfo);
        } else if (code === 'D') {
          totals[d].D++;
          totals[d].byShift.D.push(memberInfo);
        } else if (code === 'L') {
          totals[d].L++;
          totals[d].byShift.L.push(memberInfo);
        } else if (code === 'R') {
          totals[d].R++;
          totals[d].byShift.R.push(memberInfo);
        } else if (code === 'X') {
          totals[d].X++;
          totals[d].byShift.X.push(memberInfo);
        } else {
          totals[d].empty++;
          totals[d].byShift.none.push(memberInfo);
        }
      }
    });

    // Evaluate statuses
    for (let d = 1; d <= daysInMonth; d++) {
      const t = totals[d];
      const missing: ShiftCode[] = [];
      const conflicts: ShiftCode[] = [];

      // Weekends do not require shifts by default (no shortage/missing for weekends)
      if (!t.isWeekend) {
        if (t.V === 0) missing.push('V');
        if (t.D === 0) missing.push('D');
        if (t.L === 0) missing.push('L');
      }

      if (t.V > 1) conflicts.push('V');
      if (t.D > 1) conflicts.push('D');
      if (t.L > 1) conflicts.push('L');

      t.missingShifts = missing;
      t.conflictShifts = conflicts;
      t.hasConflict = conflicts.length > 0;
      t.isMissing = !t.isWeekend && missing.length > 0;
      // Ideal for weekdays = exactly 1 V, 1 D, 1 L. For weekends: no conflicts.
      t.isIdeal = !t.isWeekend && t.V === 1 && t.D === 1 && t.L === 1;
    }

    return totals;
  }, [filteredMembers, daysInMonth, currentYear, currentMonth]);

  // Overall monthly health counts
  const monthlyCoverageStats = useMemo(() => {
    let idealDays = 0;
    let conflictDays = 0;
    let missingDays = 0;
    let weekdayCount = 0;
    let weekendCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const t = dailyTotals[d];
      if (t.isWeekend) {
        weekendCount++;
        if (t.hasConflict) {
          conflictDays++;
        }
      } else {
        weekdayCount++;
        if (t.isIdeal) {
          idealDays++;
        } else if (t.hasConflict) {
          conflictDays++;
        } else if (t.isMissing) {
          missingDays++;
        }
      }
    }

    return { idealDays, conflictDays, missingDays, weekdayCount, weekendCount, totalDays: daysInMonth };
  }, [dailyTotals, daysInMonth]);

  // Open day detail modal
  const handleOpenDayModal = (day: number) => {
    setSelectedDayDetail(day);
    setDaySaveMessage(null);
    // Initialize dayEditState with current assignments for that day
    const state: Record<string, ShiftCode> = {};
    filteredMembers.forEach((m) => {
      state[m.user.id] = (m.planning?.days?.[day] as ShiftCode) || '';
    });
    setDayEditState(state);
  };

  // Change a member's shift for the currently selected day
  const handleSetMemberShiftForDay = (userId: string, code: ShiftCode) => {
    setDayEditState((prev) => ({
      ...prev,
      [userId]: code,
    }));
    setDaySaveMessage(null);
  };

  // Save changes from day modal
  const handleSaveDayResolutions = async () => {
    if (!selectedDayDetail) return;
    setIsSavingDay(true);
    setDaySaveMessage(null);
    try {
      // Save for each member whose shift changed on this day
      const promises = filteredMembers.map(async (m) => {
        const currentCode = m.planning?.days?.[selectedDayDetail] || '';
        const newCode = dayEditState[m.user.id] || '';

        if (currentCode !== newCode) {
          const updatedDays = { ...(m.planning?.days || {}) };
          if (!newCode) {
            delete updatedDays[selectedDayDetail];
          } else {
            updatedDays[selectedDayDetail] = newCode;
          }
          return api.saveUserPlanningAsAdmin(m.user.id, currentYear, currentMonth, updatedDays);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      setDaySaveMessage('Wijzigingen voor deze dag zijn direct opgeslagen!');
      // Refresh whole overview
      await fetchOverview();
      setTimeout(() => {
        setSelectedDayDetail(null);
        setDaySaveMessage(null);
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Opslaan van dagwijzigingen mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSavingDay(false);
    }
  };

  const monthDisplay = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`.toUpperCase();

  return (
    <div className="p-2 sm:p-4 md:p-8 space-y-8 max-w-7xl mx-auto w-full font-sans overflow-x-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Team Overzicht
            </h2>
            <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-[9px] sm:text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
              LIVE ROOSTER
            </span>
          </div>
          <p className="text-[11px] md:text-sm text-slate-500 mt-1">
            Volledig maandoverzicht met automatische bezettings- en shift-controle.
          </p>
        </div>

        {/* Action button to Planner Mode & Month Navigation */}
        <div className="flex items-center gap-3">
          {(canPlannerMode || isAdmin) && (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Planning Afronden</span>
            </button>
          )}

          {(user?.canPlannerMode || isAdmin) && onNavigateToTeamPlanning && (
            <button
              onClick={onNavigateToTeamPlanning}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Team Plannen Modus</span>
            </button>
          )}

          {/* Month Navigation Control */}
          <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-200 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-50 cursor-pointer"
              title="Vorige maand"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs sm:text-sm px-4 min-w-[140px] text-center tracking-wide text-slate-900 uppercase">
              {monthDisplay}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-50 cursor-pointer"
              title="Volgende maand"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Search Filters */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-3.5 h-3.5 rounded-sm code-V inline-block"></span>
            <span className="text-slate-600 font-medium">Vroeg (V)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-3.5 h-3.5 rounded-sm code-D inline-block"></span>
            <span className="text-slate-600 font-medium">Dag (D)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-3.5 h-3.5 rounded-sm code-L inline-block"></span>
            <span className="text-slate-600 font-medium">Laat (L)</span>
          </div>
           <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-3.5 h-3.5 rounded-sm code-R inline-block"></span>
            <span className="text-slate-600 font-medium">Rustdag (R)</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="w-3.5 h-3.5 rounded-sm code-X inline-block"></span>
            <span className="text-slate-600 font-medium">Vrij (X)</span>
          </div>
        </div>

        {/* Search & Role Filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek teamlid..."
              className="w-full bg-white border border-slate-200 text-slate-900 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400 shadow-xs"
            />
          </div>

          {roles.length > 0 && (
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="bg-white border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 cursor-pointer shadow-xs"
              >
                <option value="all">Alle rollen</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: The Big Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs relative flex flex-col">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Teamrooster synchroniseren...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-500">Geen teamleden gevonden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full border-collapse text-xs text-left min-w-[900px]">
              {/* Table Header */}
              <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-50 p-4 font-bold text-slate-800 border-r border-slate-200 min-w-[120px] sm:min-w-[200px] uppercase tracking-wider text-[11px]">
                    Naam
                  </th>
                  {Array.from({ length: daysInMonth }, (_, idx) => {
                    const dayNum = idx + 1;
                    const date = new Date(currentYear, currentMonth - 1, dayNum);
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const dayName = DAY_NAMES[dayOfWeek];

                    const isToday =
                      new Date().getFullYear() === currentYear &&
                      new Date().getMonth() + 1 === currentMonth &&
                      new Date().getDate() === dayNum;

                    return (
                      <th
                        key={dayNum}
                        onClick={() => handleOpenDayModal(dayNum)}
                        className={`p-2 border-r border-slate-100 text-center text-[11px] min-w-[42px] cursor-pointer hover:bg-indigo-50 transition-colors ${
                          isToday
                            ? 'bg-indigo-50 text-indigo-700 font-bold border-b-2 border-b-indigo-600'
                            : isWeekend
                            ? 'text-slate-500 bg-slate-300/40'
                            : 'text-slate-600'
                        }`}
                        title={`Klik om bezetting en shifts van Dag ${dayNum} te inspecteren en bewerken`}
                      >
                        <div className="text-[9px] uppercase font-medium">{dayName}</div>
                        <div className="font-bold text-xs mt-0.5">{dayNum}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100">
                {filteredMembers.map((member) => {
                  const isCurrentLoggedUser = member.user.id === user?.id;
                  const pln = member.planning?.days || {};

                  return (
                    <tr
                      key={member.user.id}
                      className={`hover:bg-slate-50/70 transition-colors group ${
                        isCurrentLoggedUser ? 'bg-indigo-50/20' : ''
                      }`}
                    >
                      {/* Sticky Name Column */}
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 p-3 border-r border-slate-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center font-bold text-indigo-700 text-xs border border-indigo-100 shadow-xs shrink-0">
                            {member.user.avatar || member.user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <div className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors truncate flex items-center gap-1.5">
                              <span>{member.user.name}</span>
                              {isCurrentLoggedUser && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-medium uppercase">
                                  Jij
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate font-medium">
                              {member.user.role || 'Teamlid'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day Shift Cells */}
                      {Array.from({ length: daysInMonth }, (_, idx) => {
                        const dayNum = idx + 1;
                        const date = new Date(currentYear, currentMonth - 1, dayNum);
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const code = pln[dayNum] || '';

                        const isToday =
                          new Date().getFullYear() === currentYear &&
                          new Date().getMonth() + 1 === currentMonth &&
                          new Date().getDate() === dayNum;

                        let codeClass = 'text-slate-400';
                        if (code === 'V') codeClass = 'code-V';
                        else if (code === 'D') codeClass = 'code-D';
                        else if (code === 'L') codeClass = 'code-L';
                        else if (code === 'R') codeClass = 'code-R';
                        else if (code === 'X') codeClass = 'code-X';

                        return (
                          <td
                            key={dayNum}
                            onClick={() => handleOpenDayModal(dayNum)}
                            className={`p-1 text-center border-r border-slate-100 last:border-r-0 cursor-pointer hover:bg-indigo-50/50 ${
                              isToday ? 'bg-indigo-50/30' : isWeekend ? 'bg-slate-300/40' : ''
                            }`}
                          >
                            <div
                              className={`w-full h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-105 select-none ${
                                code ? codeClass : 'bg-slate-50 text-slate-300'
                              }`}
                              title={`${member.user.name} - Dag ${dayNum}: ${
                                code === 'V'
                                  ? 'Vroeg'
                                  : code === 'D'
                                  ? 'Dag'
                                  : code === 'L'
                                  ? 'Laat'
                                  : code === 'R'
                                  ? 'Rustdag'
                                  : code === 'X'
                                  ? 'Vrij'
                                  : 'Nog niet ingevuld'
                              } (Klik om te bewerken)`}
                            >
                              {code || '·'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Staff per Day Summary Footer Row */}
              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-[10px]">
                <tr>
                  <td className="sticky left-0 z-10 bg-slate-50 p-3 border-r border-slate-200 text-slate-800 uppercase tracking-wider">
                    Shift Totalen (V / D / L)
                  </td>
                  {Array.from({ length: daysInMonth }, (_, idx) => {
                    const dayNum = idx + 1;
                    const tot = dailyTotals[dayNum];
                    const working = tot.V + tot.D + tot.L;
                    const isCovered = tot.isIdeal;
                    const hasConflict = tot.hasConflict;
                    const date = new Date(currentYear, currentMonth - 1, dayNum);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                    return (
                      <td
                        key={dayNum}
                        onClick={() => handleOpenDayModal(dayNum)}
                        className={`p-1.5 text-center border-r border-slate-100 cursor-pointer hover:bg-indigo-100/50 transition-colors ${
                          hasConflict ? 'bg-amber-50/60' : isCovered ? 'bg-emerald-50/40' : ''
                        }${isWeekend ? ' bg-slate-300/40' : ''}`}
                        title={`Dag ${dayNum}: V:${tot.V}, D:${tot.D}, L:${tot.L} (Klik om te bekijken)`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-slate-900 font-bold">{working}</span>
                          {hasConflict && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Dubbele shift!"></span>
                          )}
                          {isCovered && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="1V 1D 1L in orde"></span>
                          )}
                        </div>
                        <div className="text-[8px] text-slate-400 mt-0.5 flex justify-center gap-1 font-mono">
                          <span className={`${tot.V === 1 ? 'text-emerald-700 font-bold' : tot.V > 1 ? 'text-amber-700 font-black' : 'text-slate-400'}`}>
                            {tot.V}
                          </span>
                          <span className={`${tot.D === 1 ? 'text-amber-700 font-bold' : tot.D > 1 ? 'text-amber-700 font-black' : 'text-slate-400'}`}>
                            {tot.D}
                          </span>
                          <span className={`${tot.L === 1 ? 'text-indigo-700 font-bold' : tot.L > 1 ? 'text-indigo-900 font-black' : 'text-slate-400'}`}>
                            {tot.L}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Dedicated Shift Bezetting & Dag-voor-Dag Controlepaneel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Shift Bezetting & Dag-voor-Dag Controle
                </h3>
                <p className="text-xs text-slate-500">
                  Controleert of er elke dag <strong>1 Vroeg (V), 1 Dag (D) en 1 Laat (L)</strong> ingepland is. Klik op een dag om de bezetting te bekijken of dubbele keuzes op te lossen.
                </p>
              </div>
            </div>
          </div>

          {/* Quick status counters */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Alle dagen ({daysInMonth})
            </button>

            <button
              onClick={() => setStatusFilter('ok')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'ok'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>In orde 1V 1D 1L ({monthlyCoverageStats.idealDays})</span>
            </button>

            <button
              onClick={() => setStatusFilter('conflict')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'conflict'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dubbel / Conflict ({monthlyCoverageStats.conflictDays})</span>
            </button>

            <button
              onClick={() => setStatusFilter('missing')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'missing'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Tekort / Onvolledig ({monthlyCoverageStats.missingDays})</span>
            </button>
          </div>
        </div>

        {/* Days Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {Array.from({ length: daysInMonth }, (_, idx) => {
            const dayNum = idx + 1;
            const tot = dailyTotals[dayNum];
            const date = new Date(currentYear, currentMonth - 1, dayNum);
            const dayOfWeek = date.getDay();
            const dayName = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'][dayOfWeek];
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isIdeal = tot.isIdeal;
            const hasConflict = tot.hasConflict;
            const isMissing = tot.isMissing;

            // Apply filter
            if (statusFilter === 'ok' && !isIdeal) return null;
            if (statusFilter === 'conflict' && (!hasConflict || isMissing)) return null;
            if (statusFilter === 'missing' && (!isMissing || isWeekend)) return null;

            return (
              <div
                key={dayNum}
                onClick={() => handleOpenDayModal(dayNum)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md group relative ${
                  hasConflict
                    ? 'bg-amber-50/40 border-amber-300 hover:border-amber-500'
                    : isIdeal
                    ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500'
                    : isWeekend
                    ? 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300 hover:bg-slate-100/50 opacity-85'
                    : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20'
                }`}
              >
                <div>
                  {/* Top Bar of Day Tile */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-black font-mono text-slate-800">
                        {dayNum}
                      </span>
                      <span className={`text-[11px] font-bold uppercase ${isWeekend ? 'text-amber-800' : 'text-slate-500'}`}>
                        {dayName}
                      </span>
                    </div>

                    {/* Status Badge */}
                    {hasConflict ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Dubbel
                      </span>
                    ) : isIdeal ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        In Orde
                      </span>
                    ) : isWeekend ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        Weekend
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                        Onvolledig
                      </span>
                    )}
                  </div>

                  {/* Shift Coverage Pills */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 text-center">
                    {/* Vroeg */}
                    <div
                      className={`p-1.5 rounded-lg border text-xs flex flex-col items-center justify-center ${
                        tot.V === 1
                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900 font-bold'
                          : tot.V > 1
                          ? 'bg-amber-200 border-amber-400 text-amber-950 font-black ring-1 ring-amber-500'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                      title={`Vroeg (05:00-13:00): ${tot.V} medewerker(s)`}
                    >
                      <span className="text-[9px] font-bold uppercase opacity-75">Vroeg</span>
                      <span className="text-xs font-mono font-bold">{tot.V}</span>
                    </div>

                    {/* Dag */}
                    <div
                      className={`p-1.5 rounded-lg border text-xs flex flex-col items-center justify-center ${
                        tot.D === 1
                          ? 'bg-amber-100/70 border-amber-300 text-amber-900 font-bold'
                          : tot.D > 1
                          ? 'bg-amber-200 border-amber-400 text-amber-950 font-black ring-1 ring-amber-500'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                      title={`Dag (08:30-17:00): ${tot.D} medewerker(s)`}
                    >
                      <span className="text-[9px] font-bold uppercase opacity-75">Dag</span>
                      <span className="text-xs font-mono font-bold">{tot.D}</span>
                    </div>

                    {/* Laat */}
                    <div
                      className={`p-1.5 rounded-lg border text-xs flex flex-col items-center justify-center ${
                        tot.L === 1
                          ? 'bg-indigo-100/70 border-indigo-300 text-indigo-900 font-bold'
                          : tot.L > 1
                          ? 'bg-amber-200 border-amber-400 text-amber-950 font-black ring-1 ring-amber-500'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                      title={`Laat (13:00-21:00): ${tot.L} medewerker(s)`}
                    >
                      <span className="text-[9px] font-bold uppercase opacity-75">Laat</span>
                      <span className="text-xs font-mono font-bold">{tot.L}</span>
                    </div>
                  </div>

                  {/* Summary of who chose what */}
                  <div className="mt-2.5 space-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                    {tot.byShift.V.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700 font-semibold font-mono">V:</span>
                        <span className="truncate max-w-[130px] font-medium text-slate-800">
                          {tot.byShift.V.map((u) => u.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    )}
                    {tot.byShift.D.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-amber-700 font-semibold font-mono">D:</span>
                        <span className="truncate max-w-[130px] font-medium text-slate-800">
                          {tot.byShift.D.map((u) => u.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    )}
                    {tot.byShift.L.length > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-700 font-semibold font-mono">L:</span>
                        <span className="truncate max-w-[130px] font-medium text-slate-800">
                          {tot.byShift.L.map((u) => u.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer action hint */}
                <div className="mt-3 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <span>Klik voor details & aanpassen</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: Dag Bezetting & Planner Conflict Oplosser */}
      {selectedDayDetail !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 space-y-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-100 font-mono">
                  {selectedDayDetail}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Dag {selectedDayDetail} - {DAY_NAMES[new Date(currentYear, currentMonth - 1, selectedDayDetail).getDay()]} {' '}
                    {selectedDayDetail} {MONTH_NAMES[currentMonth - 1]} {currentYear}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bekijk wie welke shift heeft gekozen en pas direct aan wie Vroeg, Dag of Laat krijgt.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Sluiten"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conflict / Status banner inside Modal */}
            {(() => {
              const modalDate = new Date(currentYear, currentMonth - 1, selectedDayDetail);
              const isModalWeekend = modalDate.getDay() === 0 || modalDate.getDay() === 6;

              // Calculate live counts based on dayEditState
              let v = 0, d = 0, l = 0;
              const conflictList: string[] = [];
              Object.values(dayEditState).forEach((code) => {
                if (code === 'V') v++;
                if (code === 'D') d++;
                if (code === 'L') l++;
              });

              if (v > 1) conflictList.push(`${v} personen op Vroeg (V)`);
              if (d > 1) conflictList.push(`${d} personen op Dag (D)`);
              if (l > 1) conflictList.push(`${l} personen op Laat (L)`);

              const isComplete = v === 1 && d === 1 && l === 1;

              if (conflictList.length > 0) {
                return (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Let op: Dubbele shift bezetting!</p>
                      <p className="text-amber-800 mt-0.5">
                        Er zijn momenteel {conflictList.join(' en ')}. Kies hieronder wie van de teamleden de dienst krijgt en verander de andere naar een vrije dag (X), Dagdienst (D) of Vroeg (V).
                      </p>
                    </div>
                  </div>
                );
              }

              if (isComplete) {
                return (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Perfecte Bezetting (1V, 1D, 1L in orde!)</p>
                      <p className="text-emerald-800 text-[11px]">Alle 3 de vereiste diensten zijn uniek ingevuld.</p>
                    </div>
                  </div>
                );
              }

              if (isModalWeekend) {
                return (
                  <div className="p-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      <strong>Weekend (Geen werkdag)</strong>: In het weekend geldt er geen verplichte shiftbezetting.
                    </span>
                  </div>
                );
              }

              return (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    Huidige bezetting: <strong>{v} Vroeg (V)</strong>, <strong>{d} Dag (D)</strong>, <strong>{l} Laat (L)</strong>.
                  </span>
                </div>
              );
            })()}

            {/* Save Message Notification */}
            {daySaveMessage && (
              <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>{daySaveMessage}</span>
              </div>
            )}

            {/* List of Team Members on this day with Shift Switcher */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>Teamlid</span>
                <span>Kies Shift voor Dag {selectedDayDetail}</span>
              </div>

              {filteredMembers.map((m) => {
                const currentShift = dayEditState[m.user.id] || '';
                const shiftCounts = Object.values(dayEditState).reduce((acc, code) => {
                  if (code && (code === 'V' || code === 'D' || code === 'L')) {
                    acc[code] = (acc[code] || 0) + 1;
                  }
                  return acc;
                }, {} as Record<string, number>);
                const isInConflict = currentShift && shiftCounts[currentShift] > 1;

                return (
                  <div
                    key={m.user.id}
                    className={`p-3.5 rounded-2xl transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                      isInConflict
                        ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                        isInConflict ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'
                      }`}>
                        {m.user.avatar || m.user.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isInConflict ? 'text-red-900' : 'text-slate-900'}`}>
                          {m.user.name}
                          {isInConflict && <span className="ml-1.5 text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full">Conflict</span>}
                        </p>
                        <p className="text-[11px] text-slate-500">{m.user.role || 'Medewerker'}</p>
                      </div>
                    </div>

                    {/* Shift Selector Buttons */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      {/* Quick remove button if in conflict */}
                      {(() => {
                        const shiftCounts = Object.values(dayEditState).reduce((acc, code) => {
                          if (code && (code === 'V' || code === 'D' || code === 'L')) {
                            acc[code] = (acc[code] || 0) + 1;
                          }
                          return acc;
                        }, {} as Record<string, number>);
                        
                        const isInConflict = currentShift && shiftCounts[currentShift] > 1;

                        if (isInConflict) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleSetMemberShiftForDay(m.user.id, 'X')}
                              className="px-3 h-8 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 text-[11px] font-bold transition-all flex items-center justify-center cursor-pointer mr-2"
                              title="Zet dit teamlid op vrij om het conflict op te lossen"
                            >
                              Verwijder uit dienst
                            </button>
                          );
                        }
                        return null;
                      })()}

                      {(['V', 'D', 'L', 'R', 'X'] as const).map((code) => {
                        const isSelected = currentShift === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => handleSetMemberShiftForDay(m.user.id, code)}
                            className={`w-9 h-8 rounded-xl font-mono font-bold text-xs transition-all flex items-center justify-center cursor-pointer ${
                              isSelected
                                ? code === 'V'
                                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                                  : code === 'D'
                                  ? 'bg-amber-500 text-white shadow-xs ring-2 ring-amber-300'
                                  : code === 'L'
                                  ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                                  : code === 'R'
                                  ? 'bg-sky-500 text-white shadow-xs ring-2 ring-sky-300'
                                  : 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-400'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                            title={`Zet op ${code}`}
                          >
                            {code}
                          </button>
                        );
                      })}

                      {/* Clear Button */}
                      <button
                        type="button"
                        onClick={() => handleSetMemberShiftForDay(m.user.id, '')}
                        className={`px-2 h-8 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center cursor-pointer ${
                          !currentShift
                            ? 'bg-slate-200 text-slate-700 font-bold'
                            : 'bg-white text-slate-400 border border-slate-200 hover:text-red-600 hover:bg-red-50'
                        }`}
                        title="Wis shift voor deze dag"
                      >
                        Geen
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Als planner kun je direct de definitieve keuze maken wie welke dienst draait.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedDayDetail(null)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  Annuleren
                </button>

                <button
                  type="button"
                  onClick={handleSaveDayResolutions}
                  disabled={isSavingDay}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSavingDay ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Opslaan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Wijzigingen Toepassen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
       <WeekSelectionModal
        show={showFinalizeModal}
        onClose={() => setShowFinalizeModal(false)}
        year={currentYear}
        month={currentMonth}
        daysInMonth={daysInMonth}
      />
    </div>
  );
};
