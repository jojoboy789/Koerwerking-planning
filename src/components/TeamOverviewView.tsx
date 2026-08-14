import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TeamMemberOverview } from '../types';
import { ChevronLeft, ChevronRight, Search, Users, Loader2, Sparkles, Filter } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

export const TeamOverviewView: React.FC = () => {
  const { user } = useAuth();
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);

  const [teamData, setTeamData] = useState<TeamMemberOverview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    const totals: Record<number, { V: number; D: number; L: number; X: number; empty: number }> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      totals[d] = { V: 0, D: 0, L: 0, X: 0, empty: 0 };
    }

    filteredMembers.forEach((m) => {
      const days = m.planning?.days || {};
      for (let d = 1; d <= daysInMonth; d++) {
        const code = days[d];
        if (code === 'V') totals[d].V++;
        else if (code === 'D') totals[d].D++;
        else if (code === 'L') totals[d].L++;
        else if (code === 'X') totals[d].X++;
        else totals[d].empty++;
      }
    });

    return totals;
  }, [filteredMembers, daysInMonth]);

  const monthDisplay = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`.toUpperCase();

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full font-sans">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Team Overzicht
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-200 rounded-full text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
              LIVE
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Rooster status en bezettingsdekking voor alle teamleden.
          </p>
        </div>

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

      {/* The Matrix Bento Box */}
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
                  <th className="sticky left-0 z-30 bg-slate-50 p-4 font-bold text-slate-800 border-r border-slate-200 min-w-[200px] uppercase tracking-wider text-[11px]">
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
                        className={`p-2 border-r border-slate-100 text-center text-[11px] min-w-[42px] ${
                          isToday
                            ? 'bg-indigo-50 text-indigo-700 font-bold border-b-2 border-b-indigo-600'
                            : isWeekend
                            ? 'text-slate-500 bg-slate-100/60'
                            : 'text-slate-600'
                        }`}
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
                        else if (code === 'X') codeClass = 'code-X';

                        return (
                          <td
                            key={dayNum}
                            className={`p-1 text-center border-r border-slate-100 last:border-r-0 ${
                              isToday ? 'bg-indigo-50/30' : isWeekend ? 'bg-slate-50/50' : ''
                            }`}
                          >
                            <div
                              className={`w-full h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-transform hover:scale-105 cursor-default select-none ${
                                code ? codeClass : 'bg-slate-50 text-slate-300'
                              }`}
                              title={`${member.user.name} - Dag ${dayNum}: ${
                                code === 'V'
                                  ? 'Vroeg'
                                  : code === 'D'
                                  ? 'Dag'
                                  : code === 'L'
                                  ? 'Laat'
                                  : code === 'X'
                                  ? 'Vrij'
                                  : 'Nog niet ingevuld'
                              }`}
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
                    Bezetting / Shift Totalen
                  </td>
                  {Array.from({ length: daysInMonth }, (_, idx) => {
                    const dayNum = idx + 1;
                    const tot = dailyTotals[dayNum];
                    const working = tot.V + tot.D + tot.L;
                    return (
                      <td key={dayNum} className="p-1.5 text-center border-r border-slate-100">
                        <div className="text-slate-900 font-bold">{working}</div>
                        <div className="text-[8px] text-slate-400 mt-0.5 flex justify-center gap-1">
                          <span className="text-emerald-700 font-semibold">{tot.V}</span>
                          <span className="text-amber-700 font-semibold">{tot.D}</span>
                          <span className="text-indigo-700 font-semibold">{tot.L}</span>
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
    </div>
  );
};
