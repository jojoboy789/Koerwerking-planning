import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShiftCode, SHIFT_DEFINITIONS } from '../types';
import { ChevronLeft, ChevronRight, Save, CheckCircle2, AlertTriangle, Loader2, Sparkles, RotateCcw } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

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
  const [lastUpdatedInfo, setLastUpdatedInfo] = useState<{ at?: string; by?: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setDaysState(days);
      setInitialDaysState(days);
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
    for (let d = 1; d <= daysInMonth; d++) {
      if ((daysState[d] || '') !== (initialDaysState[d] || '')) {
        return true;
      }
    }
    return false;
  }, [daysState, initialDaysState, daysInMonth]);

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

  // Toggle shift for a day
  const handleSetShift = (day: number, code: ShiftCode) => {
    if (!canEditPlanning && !isAdmin) return;
    setDaysState((prev) => {
      const current = prev[day];
      // If clicking the active one, keep or toggle
      if (current === code) {
        // Deselect or retain
        return { ...prev, [day]: '' };
      }
      return { ...prev, [day]: code };
    });
    if (saveSuccessMessage) setSaveSuccessMessage(null);
  };

  // Batch auto-fill helpers
  const handleFillPattern = (pattern: 'weekdays-D' | 'weekends-X' | 'clear') => {
    if (!canEditPlanning && !isAdmin) return;
    setDaysState((prev) => {
      const updated = { ...prev };
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth - 1, day);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        if (pattern === 'weekdays-D' && !isWeekend) {
          updated[day] = 'D';
        } else if (pattern === 'weekends-X' && isWeekend) {
          updated[day] = 'X';
        } else if (pattern === 'clear') {
          delete updated[day];
        }
      }
      return updated;
    });
  };

  // Save planning
  const handleSave = async () => {
    if (!canEditPlanning && !isAdmin) return;
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const res = await api.savePlanning(currentYear, currentMonth, daysState);
      setInitialDaysState({ ...daysState });
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
    let vCount = 0;
    let dCount = 0;
    let lCount = 0;
    let xCount = 0;
    let filledCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const code = daysState[day];
      if (code === 'V') vCount++;
      else if (code === 'D') dCount++;
      else if (code === 'L') lCount++;
      else if (code === 'X') xCount++;
      if (code && code !== '') filledCount++;
    }

    return { vCount, dCount, lCount, xCount, filledCount, emptyCount: daysInMonth - filledCount };
  }, [daysState, daysInMonth]);

  const monthTitle = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-36 space-y-6 font-sans">
      {/* Month Navigation Banner - Bento Card */}
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <button
          id="btn-prev-month"
          onClick={handlePrevMonth}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer shadow-xs"
          title="Vorige maand"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600 hover:text-indigo-600" />
        </button>

        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {monthTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            {stats.filledCount} van de {daysInMonth} dagen ingevuld
          </p>
        </div>

        <button
          id="btn-next-month"
          onClick={handleNextMonth}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer shadow-xs"
          title="Volgende maand"
        >
          <ChevronRight className="w-5 h-5 text-slate-600 hover:text-indigo-600" />
        </button>
      </div>

      {/* Permissions Notice if not allowed to edit */}
      {!canEditPlanning && !isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Je hebt momenteel alleen leesrechten. Vraag een beheerder om <strong>Planning invullen</strong> in te schakelen
            om wijzigingen te kunnen opslaan.
          </span>
        </div>
      )}

      {/* Stats and Fast Fill Helpers - Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Vroeg (V)</div>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">
              {stats.vCount} <span className="text-xs font-normal text-slate-400">dagen</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700">
            V
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Dag (D)</div>
            <div className="text-xl font-bold text-amber-700 mt-0.5">
              {stats.dCount} <span className="text-xs font-normal text-slate-400">dagen</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-700">
            D
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Laat (L)</div>
            <div className="text-xl font-bold text-indigo-700 mt-0.5">
              {stats.lCount} <span className="text-xs font-normal text-slate-400">dagen</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700">
            L
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500 uppercase text-[10px] font-semibold tracking-wider">Vrij (X)</div>
            <div className="text-xl font-bold text-slate-700 mt-0.5">
              {stats.xCount} <span className="text-xs font-normal text-slate-400">dagen</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700">
            X
          </div>
        </div>
      </div>

      {/* Quick Pattern Tools */}
      {(canEditPlanning || isAdmin) && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Snelle hulpknoppen:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleFillPattern('weekdays-D')}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 hover:border-indigo-200 transition-colors font-medium cursor-pointer"
            >
              Weekdagen op Dag (D)
            </button>
            <button
              onClick={() => handleFillPattern('weekends-X')}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 text-slate-700 border border-slate-200 transition-colors font-medium cursor-pointer"
            >
              Weekenden op Vrij (X)
            </button>
            <button
              onClick={() => handleFillPattern('clear')}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 hover:border-red-200 transition-colors font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Wis maand
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">Planning laden...</p>
        </div>
      ) : (
        /* Day Rows List (Bento card row design) */
        <div className="space-y-2.5">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const dayNum = i + 1;
            const date = new Date(currentYear, currentMonth - 1, dayNum);
            const dayOfWeekIndex = date.getDay();
            const dayName = DAY_NAMES[dayOfWeekIndex];
            const isWeekend = dayOfWeekIndex === 0 || dayOfWeekIndex === 6;
            const weekNumber = getWeekNumber(date);
            const selectedShift = daysState[dayNum] || '';

            // Show week label only on Mondays or day 1
            const showWeekNumber = dayOfWeekIndex === 1 || dayNum === 1;

            const isToday =
              new Date().getFullYear() === currentYear &&
              new Date().getMonth() + 1 === currentMonth &&
              new Date().getDate() === dayNum;

            return (
              <div
                key={dayNum}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl transition-all duration-150 border ${
                  isToday
                    ? 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Date Badge and Day Name */}
                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                  <div
                    className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border font-sans transition-all ${
                      isWeekend
                        ? 'bg-slate-100 border-slate-200 text-slate-600'
                        : isToday
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {dayName}
                    </span>
                    <span className="text-base font-bold leading-none mt-0.5">
                      {String(dayNum).padStart(2, '0')}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {dayNum} {MONTH_NAMES[currentMonth - 1]}
                      </span>
                      {isToday && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                          Vandaag
                        </span>
                      )}
                    </div>
                    {showWeekNumber && (
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">
                        Week {weekNumber}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shift Selector Buttons [V] [D] [L] [X] */}
                <div className="flex items-center gap-2">
                  {(['V', 'D', 'L', 'X'] as ShiftCode[]).map((code) => {
                    const shiftDef = SHIFT_DEFINITIONS[code as Exclude<ShiftCode, ''>];
                    const isSelected = selectedShift === code;

                    return (
                      <button
                        key={code}
                        id={`btn-shift-${dayNum}-${code}`}
                        type="button"
                        disabled={!canEditPlanning && !isAdmin}
                        onClick={() => handleSetShift(dayNum, code)}
                        title={`${shiftDef.label}: ${shiftDef.description}`}
                        className={`w-11 h-10 sm:w-12 sm:h-10 rounded-xl font-bold text-sm transition-all duration-150 cursor-pointer flex items-center justify-center border ${
                          isSelected
                            ? `${shiftDef.activeClass} scale-105`
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Action Bar */}
      {(canEditPlanning || isAdmin) && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 z-30 shadow-lg px-6 md:px-10">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            {lastUpdatedInfo.at ? (
              <span>
                Laatst opgeslagen: <strong className="text-slate-800 font-semibold">{new Date(lastUpdatedInfo.at).toLocaleDateString('nl-NL')} {new Date(lastUpdatedInfo.at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</strong>
                {lastUpdatedInfo.by && ` (${lastUpdatedInfo.by})`}
              </span>
            ) : (
              <span>Nog niet opgeslagen voor deze maand</span>
            )}
            {hasUnsavedChanges && (
              <span className="block sm:inline sm:ml-2 text-amber-600 font-semibold">
                • Niet-opgeslagen wijzigingen
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveSuccessMessage && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-red-700 font-medium animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              id="save-planning-button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-100 transition-all duration-150 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Opslaan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Planning opslaan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
