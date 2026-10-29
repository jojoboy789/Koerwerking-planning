import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShiftCode, SHIFT_DEFINITIONS } from '../types';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, AlertTriangle, Loader2, CalendarDays, ClipboardList } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

// Belgische wettelijke feestdagen, inclusief de verplaatsbare feestdagen.
function getBelgianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const add = (month: number, day: number, name: string) => {
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    holidays.set(key, name);
  };

  add(1, 1, 'Nieuwjaar');
  add(5, 1, 'Dag van de Arbeid');
  add(7, 21, 'Nationale feestdag');
  add(8, 15, 'O.L.V. Hemelvaart');
  add(11, 1, 'Allerheiligen');
  add(11, 11, 'Wapenstilstand');
  add(12, 25, 'Kerstmis');

  // Meeus/Jones/Butcher algorithm calculates Easter Sunday.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, easterMonth - 1, easterDay);
  const addOffset = (offset: number, name: string) => {
    const date = new Date(easter);
    date.setDate(date.getDate() + offset);
    add(date.getMonth() + 1, date.getDate(), name);
  };
  addOffset(1, 'Paasmaandag');
  addOffset(39, 'O.H. Hemelvaart');
  addOffset(50, 'Pinkstermaandag');

  return holidays;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Helper to get ISO week number
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const MyPlanningView: React.FC = () => {
  const { user, canEditPlanning, isAdmin } = useAuth();

  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1); // 1-12

  const [daysState, setDaysState] = useState<Record<number, ShiftCode>>({});
  const [initialDaysState, setInitialDaysState] = useState<Record<number, ShiftCode>>({});
  const [secondChoices, setSecondChoices] = useState<Record<number, ShiftCode>>({});
  const [initialSecondChoices, setInitialSecondChoices] = useState<Record<number, ShiftCode>>({});
  const [thirdChoices, setThirdChoices] = useState<Record<number, ShiftCode>>({});
  const [initialThirdChoices, setInitialThirdChoices] = useState<Record<number, ShiftCode>>({});
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState<{ at?: string; by?: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { isLockedForEditing, deadlineFormatted } = useMemo(() => {
    if (!user || user.canPlannerMode || user.isAdmin) {
      return { isLockedForEditing: false, deadlineFormatted: '' };
    }
    const now = new Date();
    const deadline = new Date(currentYear, currentMonth - 2, 8); // Deadline is 8th of the month BEFORE the one being edited
    const deadlineStr = `7 ${MONTH_NAMES[(currentMonth - 2 + 12) % 12].toLowerCase()} ${deadline.getFullYear()}`;
    return { 
        isLockedForEditing: now >= deadline, 
        deadlineFormatted: deadlineStr 
    };
  }, [currentYear, currentMonth, user]);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  // Load planning for active month
  const fetchPlanning = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      const res = await api.getPlanning(currentYear, currentMonth);

      const days = (res.planning?.days as Record<number, ShiftCode>) || {};
      const loadedSecondChoices = (res.planning?.secondChoices as Record<number, ShiftCode>) || {};
      const loadedThirdChoices = (res.planning?.thirdChoices as Record<number, ShiftCode>) || {};
      const holidays = getBelgianHolidays(currentYear);
      const holidayDayNumbers = Array.from({ length: new Date(currentYear, currentMonth, 0).getDate() }, (_, i) => i + 1)
        .filter((day) => holidays.has(dateKey(new Date(currentYear, currentMonth - 1, day))));
      const withoutHolidayChoices = (choices: Record<number, ShiftCode>) => {
        const cleaned = { ...choices };
        holidayDayNumbers.forEach((day) => { delete cleaned[day]; });
        return cleaned;
      };

      // Holiday preferences are cleared locally; saving the planning removes any old stored selections too.
      const cleanDays = withoutHolidayChoices(days);
      const cleanSecondChoices = withoutHolidayChoices(loadedSecondChoices);
      const cleanThirdChoices = withoutHolidayChoices(loadedThirdChoices);
      setDaysState(cleanDays);
      setInitialDaysState(cleanDays);
      setSecondChoices(cleanSecondChoices);
      setInitialSecondChoices(cleanSecondChoices);
      setThirdChoices(cleanThirdChoices);
      setInitialThirdChoices(cleanThirdChoices);
      setLastUpdatedInfo({
        at: res.planning?.updatedAt,
        by: res.planning?.updatedBy,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kon planning niet ophalen.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (isLockedForEditing) return false;

    for (let d = 1; d <= daysInMonth; d++) {
      if ((daysState[d] || '') !== (initialDaysState[d] || '')) {
        return true;
      }

      if ((secondChoices[d] || '') !== (initialSecondChoices[d] || '')) {
        return true;
      }

      if ((thirdChoices[d] || '') !== (initialThirdChoices[d] || '')) {
        return true;
      }
    }

    return false;
  }, [
  daysState,
  initialDaysState,
  secondChoices,
  initialSecondChoices,
  thirdChoices,
  initialThirdChoices,
  daysInMonth,
  isLockedForEditing,
]);

  // Navigate months
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

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
  };

  // Toggle shift for a day
  const handleSetShift = (day: number, code: ShiftCode) => {
    if (isLockedForEditing || (!canEditPlanning && !isAdmin)) return;

    const nextCode = daysState[day] === code ? '' : code;

    setDaysState((prev) => ({
      ...prev,
      [day]: nextCode,
    }));

    if (nextCode) {
      setSecondChoices((prev) =>
        prev[day] === nextCode ? { ...prev, [day]: '' } : prev
      );

      setThirdChoices((prev) =>
        prev[day] === nextCode ? { ...prev, [day]: '' } : prev
      );
    }

    setSaveSuccessMessage(null);
  };

  // Save planning
  const handleSave = async () => {
    if (isLockedForEditing || !hasUnsavedChanges || (!canEditPlanning && !isAdmin)) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
const res = await api.savePlanning(
  currentYear,
  currentMonth,
  daysState,
  secondChoices,
  thirdChoices
);

setInitialDaysState({ ...daysState });
setInitialSecondChoices({ ...secondChoices });
setInitialThirdChoices({ ...thirdChoices });

      setLastUpdatedInfo({
        at: res.planning.updatedAt,
        by: res.planning.updatedBy,
      });
      setSaveSuccessMessage('Planning succesvol opgeslagen.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Opslaan van planning is mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Monthly stats summary
  const stats = useMemo(() => {
    let vCount = 0, dCount = 0, lCount = 0, rCount = 0, xCount = 0, filledCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const code = daysState[day];
      if (code === 'V') vCount++;
      else if (code === 'D') dCount++;
      else if (code === 'L') lCount++;
      else if (code === 'R') rCount++;
      else if (code === 'X') xCount++;
      if (code) filledCount++;
    }

    return { vCount, dCount, lCount, rCount, xCount, filledCount, emptyCount: daysInMonth - filledCount };
  }, [daysState, daysInMonth]);

  const monthTitle = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`.toUpperCase();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth;
  const completionPercentage = Math.round((stats.filledCount / daysInMonth) * 100);
  const canEdit = (canEditPlanning || isAdmin) && !isLockedForEditing;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 pb-32 font-sans sm:px-5 sm:py-5">
      {/* Month header */}
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100">
                <ClipboardList className="h-4 w-4" />
                Mijn planning
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{MONTH_NAMES[currentMonth - 1]} {currentYear}</h2>
              <p className="mt-1.5 text-sm text-indigo-100">
                {stats.filledCount} van {daysInMonth} dagen ingevuld
                <span className="mx-2 text-indigo-300">•</span>
                {stats.emptyCount === 0 ? 'Maand volledig ingevuld' : `Nog ${stats.emptyCount} ${stats.emptyCount === 1 ? 'dag' : 'dagen'} open`}
              </p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 sm:flex">
              <CalendarDays className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/20" role="progressbar" aria-label="Ingevulde dagen" aria-valuemin={0} aria-valuemax={daysInMonth} aria-valuenow={stats.filledCount}>
            <div className="h-full rounded-full bg-white transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] font-medium text-indigo-100">
            <span>Voortgang</span>
            <span>{completionPercentage}%</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
          <button
            id="btn-prev-month"
            type="button"
            onClick={handlePrevMonth}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            title="Vorige maand"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Vorige</span>
          </button>
          <button
            type="button"
            onClick={handleGoToToday}
            disabled={isCurrentMonth}
            className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-default disabled:opacity-50"
          >
            Vandaag
          </button>
          <button
            id="btn-next-month"
            type="button"
            onClick={handleNextMonth}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            title="Volgende maand"
          >
            <span className="hidden sm:inline">Volgende</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {!isLockedForEditing && !canEditPlanning && !isAdmin && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Alleen-lezen</p>
            <p className="mt-0.5 text-xs leading-relaxed text-amber-800">Je kunt je planning bekijken, maar momenteel geen wijzigingen opslaan. Vraag een beheerder om <strong>Planning invullen</strong> in te schakelen.</p>
          </div>
        </div>
      )}

      {isLockedForEditing && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <h4 className="font-bold">Planning is vergrendeld</h4>
            <p className="mt-1 text-xs leading-relaxed text-rose-800">De deadline voor het invullen was {deadlineFormatted}. Aanpassingen kunnen alleen nog door een planner worden gedaan.</p>
          </div>
        </div>
      )}

      {/* Compact monthly summary */}
      <section aria-label="Maandoverzicht" className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800">Maandoverzicht</h3>
          <span className="text-[11px] font-medium text-slate-400">Aantal dagen per keuze</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { code: 'V', label: 'Vroeg', count: stats.vCount, color: 'emerald' },
            { code: 'D', label: 'Dag', count: stats.dCount, color: 'amber' },
            { code: 'L', label: 'Laat', count: stats.lCount, color: 'purple' },
            { code: 'R', label: 'Rust', count: stats.rCount, color: 'sky' },
            { code: 'X', label: 'Niet inplannen', count: stats.xCount, color: 'slate' },
          ].map((item) => {
            const colorClasses: Record<string, string> = {
              emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
              amber: 'bg-amber-50 text-amber-800 border-amber-100',
              purple: 'bg-purple-50 text-purple-800 border-purple-100',
              sky: 'bg-sky-50 text-sky-800 border-sky-100',
              slate: 'bg-slate-100 text-slate-700 border-slate-200',
            };
            return (
              <div key={item.code} className={`flex min-w-0 items-center gap-2.5 rounded-xl border p-3 ${colorClasses[item.color]}`}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-extrabold shadow-sm">{item.code}</span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold opacity-80">{item.label}</p>
                  <p className="text-lg font-extrabold leading-tight">{item.count} <span className="text-[10px] font-medium">dagen</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Daily planning */}
      <section>
        <div className="mb-2 flex items-end justify-between gap-3 px-1">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Dagplanning</h3>
            <p className="mt-0.5 text-xs text-slate-500">Kies per dag je eerste, tweede en derde voorkeur.</p>
          </div>
          <div className="hidden items-center gap-1.5 text-[10px] font-medium text-slate-400 sm:flex">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Feestdag
            <span className="ml-2 h-2 w-2 rounded-full bg-indigo-500" /> Vandaag
            <span className="ml-2 h-2 w-2 rounded-full bg-slate-300" /> Weekend
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-medium text-slate-500">Planning laden...</p>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <p className="mt-2 font-bold text-rose-900">Planning kon niet geladen worden</p>
            <p className="mt-1 text-sm text-rose-800">{errorMessage}</p>
            <button type="button" onClick={fetchPlanning} className="mt-4 rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-800">Opnieuw proberen</button>
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const dayNum = i + 1;
              const date = new Date(currentYear, currentMonth - 1, dayNum);
              const dayOfWeekIndex = date.getDay();
              const dayName = DAY_NAMES[dayOfWeekIndex];
              const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
              const holidayName = getBelgianHolidays(currentYear).get(dateKey(date));
              const isHoliday = Boolean(holidayName);
              const weekNumber = getWeekNumber(date);
              const selectedShift = daysState[dayNum] || '';
              const selectedSecondChoice = secondChoices[dayNum] || '';
              const selectedThirdChoice = thirdChoices[dayNum] || '';
              const showWeekNumber = dayOfWeekIndex === 1 || dayNum === 1;
              const isToday = today.getFullYear() === currentYear && today.getMonth() + 1 === currentMonth && today.getDate() === dayNum;

              const renderChoiceButtons = (choiceType: 'primary' | 'second' | 'third') => {
                const selectedCode = choiceType === 'primary' ? selectedShift : choiceType === 'second' ? selectedSecondChoice : selectedThirdChoice;
                return (['V', 'D', 'L', 'R', 'X'] as ShiftCode[]).map((code) => {
                  const shiftDef = SHIFT_DEFINITIONS[code as Exclude<ShiftCode, ''>];
                  const isSelected = selectedCode === code;
                  const isPrimaryChoice = selectedShift === code;
                  const isSecondChoice = selectedSecondChoice === code;
                  const isThirdChoice = selectedThirdChoice === code;
                  const isDisabled = !canEdit || isHoliday || isWeekend ||
                    (choiceType === 'second' && (isPrimaryChoice || isThirdChoice)) ||
                    (choiceType === 'third' && (isPrimaryChoice || isSecondChoice));

                  const handleClick = () => {
                    if (choiceType === 'primary') {
                      handleSetShift(dayNum, code);
                    } else if (choiceType === 'second') {
                      const nextChoice = secondChoices[dayNum] === code ? '' : code;
                      setSecondChoices((prev) => ({ ...prev, [dayNum]: nextChoice }));
                      if (nextChoice) {
                        setThirdChoices((prev) => prev[dayNum] === nextChoice ? { ...prev, [dayNum]: '' } : prev);
                      }
                      setSaveSuccessMessage(null);
                    } else {
                      setThirdChoices((prev) => ({ ...prev, [dayNum]: prev[dayNum] === code ? '' : code }));
                      setSaveSuccessMessage(null);
                    }
                  };

                  const title = isPrimaryChoice && choiceType !== 'primary'
                    ? 'Deze keuze is al je eerste keuze'
                    : isSecondChoice && choiceType === 'third'
                      ? 'Deze keuze is al je tweede keuze'
                      : `${choiceType === 'primary' ? 'Eerste' : choiceType === 'second' ? 'Tweede' : 'Derde'} keuze: ${shiftDef.label}${shiftDef.description ? `, ${shiftDef.description}` : ''}`;

                  return (
                    <button
                      key={`${choiceType}-${dayNum}-${code}`}
                      id={`btn-${choiceType === 'primary' ? 'shift' : `${choiceType}-shift`}-${dayNum}-${code}`}
                      type="button"
                      disabled={isDisabled}
                      onClick={handleClick}
                      title={title}
                      aria-label={`${title}${isSelected ? ', geselecteerd' : ''}`}
                      aria-pressed={isSelected}
                      className={choiceType === 'primary'
                        ? `flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 text-sm font-extrabold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:h-10 sm:w-10 sm:text-sm ${isSelected ? `${shiftDef.activeClass} scale-[1.03] shadow-md ring-2 ring-current/10` : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm'} disabled:cursor-not-allowed disabled:opacity-35 active:scale-95`
                        : `flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 sm:h-8 sm:w-8 ${isSelected ? `${shiftDef.activeClass} border-current shadow-sm ring-1 ring-current/10` : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm'} disabled:cursor-not-allowed disabled:opacity-30 active:scale-95`}
                    >
                      {code}
                    </button>
                  );
                });
              };

              return (
                <article key={dayNum} className={`overflow-hidden rounded-xl border transition-colors ${isHoliday ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-100' : isToday ? 'border-indigo-300 bg-indigo-50/40 ring-1 ring-indigo-100' : isWeekend ? 'border-blue-200 bg-blue-50/80 hover:border-blue-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                  <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 md:flex-row md:items-center md:gap-4">
                    {/* Daggegevens */}
                    <div className="flex min-w-0 items-center gap-3 md:w-40 md:shrink-0">
                      <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border ${isHoliday ? 'border-amber-400 bg-amber-300 text-amber-950' : isToday ? 'border-indigo-600 bg-indigo-600 text-white' : isWeekend ? 'border-blue-300 bg-blue-100 text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-800'}`}>
                        <span className="text-[9px] font-bold uppercase tracking-wide">{dayName}</span>
                        <span className="text-base font-extrabold leading-4">{String(dayNum).padStart(2, '0')}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900">{dayNum} {MONTH_NAMES[currentMonth - 1]}</span>
                          {isHoliday && <span className="rounded-full bg-amber-300 px-1.5 py-0.5 text-[9px] font-bold text-amber-950">Feestdag</span>}
                          {isToday && <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">Vandaag</span>}
                          {isWeekend && !isHoliday && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">Weekend</span>}
                        </div>
                        <p className={`mt-0.5 text-[10px] ${isHoliday ? 'font-semibold text-amber-800' : 'text-slate-500'}`}>{isHoliday ? holidayName : showWeekNumber ? `Week ${weekNumber}` : isWeekend ? 'Weekenddag' : 'Werkdag'}</p>
                      </div>
                    </div>

                    {/* Keuzes: drie kolommen op brede schermen, compacte rijen op mobiel */}
                    {isHoliday || isWeekend ? (
                      <div className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg border px-4 py-4 sm:px-5 ${isHoliday ? 'border-amber-300 bg-amber-100/80 text-amber-950' : 'border-blue-200 bg-blue-100/80 text-blue-950'}`}>
                        <CalendarDays className={`h-5 w-5 shrink-0 ${isHoliday ? 'text-amber-700' : 'text-blue-700'}`} />
                        <div>
                          <p className="text-sm font-extrabold">{isHoliday ? 'Deze dag geen geplande koerdienst' : 'Weekend geen geplande koerdienst'}</p>
                          <p className={`mt-0.5 text-xs ${isHoliday ? 'text-amber-800' : 'text-blue-800'}`}>{isHoliday ? `Belgische wettelijke feestdag: ${holidayName}. Dienstkeuzes zijn uitgeschakeld.` : 'Zaterdag en zondag zijn niet beschikbaar voor koerdienst. Dienstkeuzes zijn uitgeschakeld.'}</p>
                        </div>
                      </div>
                    ) : (
                    <div className="grid min-w-0 flex-1 grid-cols-1 gap-1.5 lg:grid-cols-3 lg:gap-2">
                      {([
                        { type: 'primary' as const, label: 'Eerste keuze', selected: selectedShift },
                        { type: 'second' as const, label: 'Tweede keuze', selected: selectedSecondChoice },
                        { type: 'third' as const, label: 'Derde keuze', selected: selectedThirdChoice },
                      ]).map((choice) => (
                        <div
                          key={choice.type}
                          className={`min-w-0 rounded-lg border px-2 py-1.5 lg:px-2.5 lg:py-2 ${
                            choice.type === 'primary'
                              ? 'border-indigo-100 bg-indigo-50/80'
                              : 'border-slate-100 bg-slate-50/70'
                          }`}
                        >
                          <div className="flex min-w-0 items-center justify-between gap-1.5 lg:mb-2">
                            <span className={`text-[9px] font-extrabold uppercase tracking-wide sm:text-[10px] ${choice.type === 'primary' ? 'text-indigo-800' : 'text-slate-600'}`}>
                              {choice.label}
                            </span>
                            {choice.type === 'primary' ? (
                              <span className="shrink-0 text-[9px] font-medium text-indigo-500">Verplicht</span>
                            ) : (
                              <span className="shrink-0 text-[9px] text-slate-400">Optioneel</span>
                            )}
                          </div>
                          <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                            {renderChoiceButtons(choice.type)}
                          </div>
                          {choice.selected && (
                            <p className={`mt-1 hidden truncate text-[10px] font-medium lg:block ${choice.type === 'primary' ? 'text-indigo-700' : 'text-slate-500'}`}>
                              {SHIFT_DEFINITIONS[choice.selected as Exclude<ShiftCode, ''>]?.label || choice.selected}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Sticky save bar */}
      {(canEditPlanning || isAdmin) && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl md:left-64 md:px-8">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 text-center text-xs sm:text-left">
              {lastUpdatedInfo.at ? (
                <p className="text-slate-500">
                  Laatst opgeslagen <strong className="font-semibold text-slate-800">{new Date(lastUpdatedInfo.at).toLocaleDateString('nl-BE')} om {new Date(lastUpdatedInfo.at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</strong>
                  {lastUpdatedInfo.by && <span> door {lastUpdatedInfo.by}</span>}
                </p>
              ) : <p className="text-slate-500">Nog niet opgeslagen voor deze maand</p>}
              {hasUnsavedChanges && <p className="mt-0.5 font-bold text-amber-600">● Je hebt niet-opgeslagen wijzigingen</p>}
              {!hasUnsavedChanges && !isLockedForEditing && <p className="mt-0.5 inline-flex items-center gap-1 font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Alles opgeslagen</p>}
              {isLockedForEditing && <p className="mt-0.5 font-bold text-rose-600">Planning vergrendeld</p>}
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {saveSuccessMessage && <div role="status" className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{saveSuccessMessage}</div>}
              {errorMessage && !isLoading && <div role="alert" className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" /><span className="max-w-xs">{errorMessage}</span></div>}
              <button
                id="save-planning-button"
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLockedForEditing || !hasUnsavedChanges || (!canEditPlanning && !isAdmin)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
              >
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Opslaan...</span></> : <><Save className="h-4 w-4" /><span>Planning opslaan</span></>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
