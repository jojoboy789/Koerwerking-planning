import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, ShiftCode, SHIFT_DEFINITIONS, MonthlyPlanning } from '../types';
import { WeekSelectionModal } from './WeekSelectionModal';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Search,
  Users,
  UserCheck,
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  Briefcase,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const TeamPlanningView: React.FC = () => {
  const { user: currentUser, canPlannerMode, isAdmin } = useAuth();

  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  
  const [showFinalizeModal, setShowFinalizeModal] = useState<boolean>(false);

  const [members, setMembers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');

  // Planning data for all members in current month (for overview badges)
  const [overviewPlannings, setOverviewPlannings] = useState<Record<string, Record<number, ShiftCode>>>({});

  // Active selected member planning state
  const [selectedUserPlanning, setSelectedUserPlanning] = useState<MonthlyPlanning | null>(null);
  const [daysState, setDaysState] = useState<Record<number, ShiftCode>>({});
  const [initialDaysState, setInitialDaysState] = useState<Record<number, ShiftCode>>({});

  // Active brush tool for quick clicking
  const [activeBrushCode, setActiveBrushCode] = useState<ShiftCode>('D');

  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(true);
  const [isLoadingPlanning, setIsLoadingPlanning] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Load list of members
  const fetchMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    setErrorMessage(null);
    try {
      // Fetch overview data to populate monthly badges for all members at once
      const [membersRes, overviewRes] = await Promise.allSettled([
        api.getPlannerMembers(),
        api.getTeamOverview(currentYear, currentMonth),
      ]);

      let userList: User[] = [];
      if (membersRes.status === 'fulfilled' && membersRes.value?.members) {
        userList = membersRes.value.members;
      } else if (overviewRes.status === 'fulfilled' && overviewRes.value?.teamData) {
        userList = overviewRes.value.teamData.map((t) => t.user);
      }

      setMembers(userList);

      // Populate overview map
      if (overviewRes.status === 'fulfilled' && overviewRes.value?.teamData) {
        const map: Record<string, Record<number, ShiftCode>> = {};
        overviewRes.value.teamData.forEach((t) => {
          map[t.user.id] = (t.planning?.days as Record<number, ShiftCode>) || {};
        });
        setOverviewPlannings(map);
      }

      // Auto-select first user if none selected or not in list
      if (userList.length > 0) {
        setSelectedUserId((prev) => {
          if (prev && userList.some((u) => u.id === prev)) {
            return prev;
          }
          return userList[0].id;
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fout bij het ophalen van teamleden.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Load planning for selected member
  const fetchSelectedUserPlanning = useCallback(async () => {
    if (!selectedUserId) return;
    setIsLoadingPlanning(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      const res = await api.getUserPlanning(selectedUserId, currentYear, currentMonth);
      const days = (res.planning?.days as Record<number, ShiftCode>) || {};
      setSelectedUserPlanning(res.planning);
      setDaysState(days);
      setInitialDaysState(days);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kon planning van medewerker niet laden.';
      setErrorMessage(msg);
    } finally {
      setIsLoadingPlanning(false);
    }
  }, [selectedUserId, currentYear, currentMonth]);

  useEffect(() => {
    if (selectedUserId) {
      fetchSelectedUserPlanning();
    }
  }, [selectedUserId, fetchSelectedUserPlanning]);

  const selectedUser = useMemo(() => {
    return members.find((m) => m.id === selectedUserId) || null;
  }, [members, selectedUserId]);

  // Roles list for filter
  const uniqueRoles = useMemo(() => {
    const s = new Set<string>();
    members.forEach((m) => {
      if (m.role) s.add(m.role);
    });
    return Array.from(s);
  }, [members]);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.role && m.role.toLowerCase().includes(memberSearch.toLowerCase()));
      const matchesRole =
        selectedRoleFilter === 'all' || m.role?.toLowerCase() === selectedRoleFilter.toLowerCase();
      return matchesSearch && matchesRole;
    });
  }, [members, memberSearch, selectedRoleFilter]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    for (let d = 1; d <= daysInMonth; d++) {
      if ((daysState[d] || '') !== (initialDaysState[d] || '')) {
        return true;
      }
    }
    return false;
  }, [daysState, initialDaysState, daysInMonth]);

  // Set shift for single day
  const handleSetShift = (day: number, code: ShiftCode) => {
    setDaysState((prev) => {
      const next = { ...prev };
      if (!code) {
        delete next[day];
      } else {
        next[day] = code;
      }
      return next;
    });
    setSaveSuccessMessage(null);
  };

  // Toggle shift with active brush
  const handleDayClick = (day: number) => {
    const current = daysState[day] || '';
    if (current === activeBrushCode) {
      handleSetShift(day, '');
    } else {
      handleSetShift(day, activeBrushCode);
    }
  };

  // Bulk presets
  const handleFillWeekdays = (code: ShiftCode) => {
    setDaysState((prev) => {
      const next = { ...prev };
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(currentYear, currentMonth - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Zo, 6 = Za
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          next[day] = code;
        }
      }
      return next;
    });
    setSaveSuccessMessage(null);
  };

  const handleClearAll = () => {
    setDaysState({});
    setSaveSuccessMessage(null);
  };

  const handleResetToSaved = () => {
    setDaysState(initialDaysState);
    setSaveSuccessMessage(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      const res = await api.saveUserPlanningAsAdmin(selectedUserId, currentYear, currentMonth, daysState);
      setInitialDaysState(daysState);
      setSelectedUserPlanning(res.planning);
      setSaveSuccessMessage(`Planning voor ${selectedUser?.name || 'medewerker'} is succesvol opgeslagen!`);

      // Update overview badge state
      setOverviewPlannings((prev) => ({
        ...prev,
        [selectedUserId]: daysState,
      }));

      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Opslaan van planning mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch to next or previous member
  const handleNavigateMember = (direction: 'prev' | 'next') => {
    if (filteredMembers.length === 0 || !selectedUserId) return;
    const currentIndex = filteredMembers.findIndex((m) => m.id === selectedUserId);
    if (currentIndex === -1) return;

    if (direction === 'prev') {
      const prevIndex = (currentIndex - 1 + filteredMembers.length) % filteredMembers.length;
      setSelectedUserId(filteredMembers[prevIndex].id);
    } else {
      const nextIndex = (currentIndex + 1) % filteredMembers.length;
      setSelectedUserId(filteredMembers[nextIndex].id);
    }
  };

  // Month navigation
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

  // Calculate statistics for selected user
  const stats = useMemo(() => {
    let vCount = 0;
    let dCount = 0;
    let lCount = 0;
    let rCount = 0;
    let xCount = 0;
    let workDaysCount = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const code = daysState[d];
      if (code === 'V') {
        vCount++;
        workDaysCount++;
      } else if (code === 'D') {
        dCount++;
        workDaysCount++;
      } else if (code === 'L') {
        lCount++;
        workDaysCount++;
      } else if (code === 'R') {
        rCount++;
      } else if (code === 'X') {
        xCount++;
      }
    }

    const totalHours = workDaysCount * 8;
    return { vCount, dCount, lCount, rCount, xCount, workDaysCount, totalHours };
  }, [daysState, daysInMonth]);

  // Calendar weeks computation
  const calendarWeeks = useMemo(() => {
    const weeks: Array<Array<{ day: number; date: Date; isCurrentMonth: boolean }>> = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 1 is Monday...
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // 0 = Mon, 6 = Sun

    let currentWeek: Array<{ day: number; date: Date; isCurrentMonth: boolean }> = [];

    // Fill leading empty days from previous month
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate();
    for (let i = adjustedStartDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      currentWeek.push({
        day: dayNum,
        date: new Date(currentYear, currentMonth - 2, dayNum),
        isCurrentMonth: false,
      });
    }

    // Fill days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push({
        day,
        date: new Date(currentYear, currentMonth - 1, day),
        isCurrentMonth: true,
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing days from next month
    if (currentWeek.length > 0) {
      let nextMonthDay = 1;
      while (currentWeek.length < 7) {
        currentWeek.push({
          day: nextMonthDay,
          date: new Date(currentYear, currentMonth, nextMonthDay),
          isCurrentMonth: false,
        });
        nextMonthDay++;
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [currentYear, currentMonth, daysInMonth]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Team Plannen & Diensten Beheren
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md uppercase">
                  Planner Mode
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecteer een teamlid om shifts (V, D, L, R, X) direct per dag aan te passen en op te slaan.
              </p>
            </div>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
          {(canPlannerMode || isAdmin) && (
            <button
              onClick={() => setShowFinalizeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Planning Afronden</span>
            </button>
          )}
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Vorige maand"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-3 py-1 font-bold text-sm text-slate-800 min-w-[150px] text-center flex items-center justify-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>{MONTH_NAMES[currentMonth - 1]} {currentYear}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white hover:text-indigo-600 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Volgende maand"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Left = User List, Right = Interactive Planner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: All Employees List (Span 4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[750px]">
          {/* Header of user list */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-800">
                  Alle Medewerkers ({filteredMembers.length})
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">Klik om te bewerken</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Zoek medewerker..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Role Filter Chips if available */}
            {uniqueRoles.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                <button
                  onClick={() => setSelectedRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedRoleFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Alles
                </button>
                {uniqueRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedRoleFilter === role
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User List Scrollable Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {isLoadingMembers ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span className="text-xs">Medewerkers laden...</span>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400 text-xs">
                Geen medewerkers gevonden voor deze zoekopdracht.
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = m.id === selectedUserId;
                const userDays = overviewPlannings[m.id] || {};
                const filledShiftsCount = Object.keys(userDays).length;

                // Mini counters
                let v = 0, d = 0, l = 0, r = 0, x = 0;
                Object.values(userDays).forEach((code) => {
                  if (code === 'V') v++;
                  if (code === 'D') d++;
                  if (code === 'L') l++;
                  if (code === 'R') r++;
                  if (code === 'X') x++;
                });

                return (
                  <button
                    key={m.id}
                    id={`select-user-${m.id}`}
                    onClick={() => setSelectedUserId(m.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-950 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {m.avatar || m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold truncate">{m.name}</p>
                          {m.isAdmin && (
                            <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {m.role || 'Medewerker'}
                        </p>
                      </div>
                    </div>

                    {/* Shift Counts mini pills */}
                    <div className="shrink-0 text-right">
                      {filledShiftsCount === 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                          Nog leeg
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {v > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono font-bold" title={`${v} Vroege shifts`}>
                              V:{v}
                            </span>
                          )}
                          {d > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold" title={`${d} Dagdiensten`}>
                              D:{d}
                            </span>
                          )}
                          {l > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold" title={`${l} Late shifts`}>
                              L:{l}
                            </span>
                          )}
                          {r > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 font-mono font-bold" title={`${r} Rustdagen`}>
                              R:{r}
                            </span>
                          )}
                          {x > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-bold" title={`${x} Vrije dagen`}>
                              X:{x}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Planning Grid & Controls (Span 8) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
              {/* Member banner & switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-indigo-100">
                    {selectedUser.avatar || selectedUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{selectedUser.name}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
                        {selectedUser.role || 'Medewerker'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Planning voor <strong>{MONTH_NAMES[currentMonth - 1]} {currentYear}</strong>
                      {selectedUserPlanning?.updatedAt && (
                        <span className="ml-2 text-slate-400">
                          (Laatst gewijzigd door {selectedUserPlanning.updatedBy || 'onbekend'})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Quick Next / Prev Member Arrows */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleNavigateMember('prev')}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    title="Vorige medewerker in lijst"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Vorige</span>
                  </button>
                  <button
                    onClick={() => handleNavigateMember('next')}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    title="Volgende medewerker in lijst"
                  >
                    <span>Volgende</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Shift Picker Tool Palette */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Selecteer actieve shift (klik daarna op een dag in de kalender):
                  </span>

                  {/* Bulk Fill presets */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleFillWeekdays('D')}
                      className="text-[11px] font-medium px-2 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Vul alle werkdagen (Ma-Vr) in als Dagdienst"
                    >
                      Ma-Vr: Dag (D)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillWeekdays('V')}
                      className="text-[11px] font-medium px-2 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Vul alle werkdagen (Ma-Vr) in als Vroege dienst"
                    >
                      Ma-Vr: Vroeg (V)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFillWeekdays('L')}
                      className="text-[11px] font-medium px-2 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Vul alle werkdagen (Ma-Vr) in als Late dienst"
                    >
                      Ma-Vr: Laat (L)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] font-medium px-2 py-1 bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                      title="Wis alle ingevulde shifts van deze maand"
                    >
                      Alles wissen
                    </button>
                  </div>
                </div>

                {/* Shift codes buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(['V', 'D', 'L', 'R', 'X'] as const).map((code) => {
                    const def = SHIFT_DEFINITIONS[code];
                    const isSelectedBrush = activeBrushCode === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => setActiveBrushCode(code)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelectedBrush
                            ? def.activeClass
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center ${
                              isSelectedBrush ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {code}
                          </span>
                          <div>
                            <p className="text-xs font-bold leading-tight">{def.shortLabel}</p>
                            <p className="text-[10px] opacity-80 leading-tight">
                              {def.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Feedback messages */}
              {saveSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex items-center gap-2 animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Calendar Grid View */}
              {isLoadingPlanning ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-xs">Planning voor {selectedUser.name} laden...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Calendar Weekday Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 py-1 border-b border-slate-100">
                    {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((dayName, idx) => (
                      <div key={dayName} className={idx >= 5 ? 'text-amber-600' : ''}>
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days Matrix */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarWeeks.flatMap((week) =>
                      week.map((item, index) => {
                        if (!item.isCurrentMonth) {
                          return (
                            <div
                              key={`other-${index}-${item.day}`}
                              className="min-h-[70px] p-2 bg-slate-50/40 rounded-xl border border-slate-100 opacity-30 flex flex-col justify-between"
                            >
                              <span className="text-[11px] font-mono text-slate-400">{item.day}</span>
                            </div>
                          );
                        }

                        const dayNum = item.day;
                        const shiftCode = daysState[dayNum] || '';
                        const dateObj = item.date;
                        const dayOfWeek = dateObj.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        return (
                          <div
                            key={`curr-${dayNum}`}
                            onClick={() => handleDayClick(dayNum)}
                            className={`min-h-[72px] p-2 rounded-xl border transition-all flex flex-col justify-between cursor-pointer group hover:shadow-xs relative ${
                              shiftCode === 'V'
                                ? 'bg-emerald-50/60 border-emerald-300 hover:border-emerald-500'
                                : shiftCode === 'D'
                                ? 'bg-amber-50/60 border-amber-300 hover:border-amber-500'
                                : shiftCode === 'L'
                                ? 'bg-indigo-50/60 border-indigo-300 hover:border-indigo-500'
                                : shiftCode === 'R'
                                ? 'bg-sky-50/60 border-sky-300 hover:border-sky-500'
                                : shiftCode === 'X'
                                ? 'bg-slate-100 border-slate-300 hover:border-slate-400'
                                : isWeekend
                                ? 'bg-amber-50/20 border-slate-200 hover:bg-slate-50'
                                : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-xs font-bold font-mono ${
                                  isWeekend ? 'text-amber-700' : 'text-slate-700'
                                }`}
                              >
                                {dayNum}
                              </span>
                              {shiftCode && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSetShift(dayNum, '');
                                  }}
                                  className="w-4 h-4 rounded-full bg-slate-200 hover:bg-red-500 hover:text-white text-slate-600 text-[10px] flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                                  title="Shift wissen"
                                >
                                  ×
                                </button>
                              )}
                            </div>

                            {/* Shift Badge display */}
                            <div className="mt-1">
                              {shiftCode ? (
                                <div
                                  className={`px-1.5 py-0.5 rounded-lg text-center font-mono font-bold text-xs ${
                                    shiftCode === 'V'
                                      ? 'bg-emerald-600 text-white'
                                      : shiftCode === 'D'
                                      ? 'bg-amber-500 text-white'
                                      : shiftCode === 'L'
                                      ? 'bg-indigo-600 text-white'
                                      : shiftCode === 'R'
                                      ? 'bg-sky-500 text-white'
                                      : 'bg-slate-700 text-white'
                                  }`}
                                >
                                  {shiftCode}
                                </div>
                              ) : (
                                <div className="text-[10px] text-center text-slate-300 group-hover:text-indigo-400 font-medium">
                                  + {activeBrushCode}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Monthly Stats Summary for Selected User */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Vroege shifts (V)</p>
                  <p className="text-lg font-bold text-emerald-900 mt-0.5">{stats.vCount} <span className="text-[10px] font-normal text-emerald-700">({stats.vCount * 8}u)</span></p>
                </div>
                <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Dagdiensten (D)</p>
                  <p className="text-lg font-bold text-amber-900 mt-0.5">{stats.dCount} <span className="text-[10px] font-normal text-amber-700">({stats.dCount * 8}u)</span></p>
                </div>
                <div className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-200">
                  <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Late shifts (L)</p>
                  <p className="text-lg font-bold text-indigo-900 mt-0.5">{stats.lCount} <span className="text-[10px] font-normal text-indigo-700">({stats.lCount * 8}u)</span></p>
                </div>
                 <div className="bg-sky-50/60 p-2.5 rounded-xl border border-sky-200">
                  <p className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Rustdagen (R)</p>
                  <p className="text-lg font-bold text-sky-900 mt-0.5">{stats.rCount} <span className="text-[10px] font-normal text-sky-700">dagen</span></p>
                </div>
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Vrij / Verlof (X)</p>
                  <p className="text-lg font-bold text-slate-800 mt-0.5">{stats.xCount} <span className="text-[10px] font-normal text-slate-500">dagen</span></p>
                </div>
                <div className="bg-slate-900 text-white p-2.5 rounded-xl col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Totaal Uren</p>
                  <p className="text-lg font-bold text-white mt-0.5">{stats.totalHours} <span className="text-[10px] font-normal text-slate-300">uur ({stats.workDaysCount}d)</span></p>
                </div>
              </div>

              {/* Bottom Action Footer with Save Button */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 gap-3">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  {hasUnsavedChanges ? (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Er zijn niet-opgeslagen wijzigingen voor {selectedUser.name}.
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Alle wijzigingen zijn opgeslagen.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {hasUnsavedChanges && (
                    <button
                      type="button"
                      onClick={handleResetToSaved}
                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Herstellen</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Opslaan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Planning Opslaan voor {selectedUser.name.split(' ')[0]}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center text-slate-400 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">Geen medewerker geselecteerd</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kies een teamlid uit de lijst aan de linkerkant om de maandplanning te bekijken of diensten aan te passen.
              </p>
            </div>
          )}
        </div>
      </div>
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
