import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, ShiftCode, SHIFT_DEFINITIONS } from '../types';
import { api } from '../services/api';
import { X, ChevronLeft, ChevronRight, Save, CheckCircle2, AlertTriangle, Loader2, Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

interface AdminPlanningModalProps {
  user: User;
  onClose: () => void;
  onSaved?: () => void;
}

export const AdminPlanningModal: React.FC<AdminPlanningModalProps> = ({
  user,
  onClose,
  onSaved,
}) => {
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);

  const [daysState, setDaysState] = useState<Record<number, ShiftCode>>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [updatedBy, setUpdatedBy] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 0).getDate();
  }, [currentYear, currentMonth]);

  const fetchUserPlanning = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.getUserPlanning(user.id, currentYear, currentMonth);
      const days = (res.planning?.days as Record<number, ShiftCode>) || {};
      setDaysState(days);
      setLastUpdated(res.planning?.updatedAt || '');
      setUpdatedBy(res.planning?.updatedBy || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kon planning van gebruiker niet laden.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user.id, currentYear, currentMonth]);

  useEffect(() => {
    fetchUserPlanning();
  }, [fetchUserPlanning]);

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

  const handleSetShift = (day: number, code: ShiftCode) => {
    setDaysState((prev) => {
      const current = prev[day];
      if (current === code) {
        return { ...prev, [day]: '' };
      }
      return { ...prev, [day]: code };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.saveUserPlanningAsAdmin(user.id, currentYear, currentMonth, daysState);
      setSuccessMessage(`Planning voor ${user.name} succesvol opgeslagen!`);
      setLastUpdated(res.planning.updatedAt);
      setUpdatedBy(res.planning.updatedBy);
      if (onSaved) onSaved();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Opslaan mislukt.';
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
              {user.avatar || user.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900">
                  Planning van {user.name}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
                  Admin Modus
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rol: {user.role || 'Teamlid'} • Wijzigingen worden gelogd als beheerder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month Navigation */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm text-slate-900 uppercase tracking-wider">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Days list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2 custom-scrollbar bg-slate-50/50">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Planning laden...</p>
            </div>
          ) : (
            Array.from({ length: daysInMonth }, (_, idx) => {
              const dayNum = idx + 1;
              const date = new Date(currentYear, currentMonth - 1, dayNum);
              const dayName = DAY_NAMES[date.getDay()];
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const selectedShift = daysState[dayNum] || '';

              return (
                <div
                  key={dayNum}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center font-bold text-xs border ${
                        isWeekend
                          ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[9px] uppercase leading-none">{dayName}</span>
                      <span className="leading-none mt-0.5">{dayNum}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      {dayNum} {MONTH_NAMES[currentMonth - 1]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(['V', 'D', 'L', 'X'] as ShiftCode[]).map((code) => {
                      const shiftDef = SHIFT_DEFINITIONS[code as Exclude<ShiftCode, ''>];
                      const isSelected = selectedShift === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => handleSetShift(dayNum, code)}
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border transition-all cursor-pointer ${
                            isSelected
                              ? `${shiftDef.activeClass} scale-105 shadow-xs`
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 hover:bg-slate-100'
                          }`}
                        >
                          {code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Save */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {lastUpdated ? (
              <span>
                Laatst bewerkt: {new Date(lastUpdated).toLocaleDateString('nl-NL')} door {updatedBy || 'Systeem'}
              </span>
            ) : (
              <span>Nog geen opgeslagen planning voor deze maand</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {successMessage && (
              <div className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="flex items-center gap-1 text-xs font-medium text-red-700">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 cursor-pointer transition-colors"
            >
              Sluiten
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Opslaan als Admin</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
