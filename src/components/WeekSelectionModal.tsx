import React, { useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { X, Loader2, CheckCircle2, AlertTriangle, Calendar, Layers } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

interface WeekSelectionModalProps {
  show: boolean;
  onClose: () => void;
  year: number;
  month: number;
  daysInMonth: number;
}

function getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const WeekSelectionModal: React.FC<WeekSelectionModalProps> = ({
  show,
  onClose,
  year,
  month,
  daysInMonth,
}) => {
  const [isFinalizing, setIsFinalizing] = useState<number | 'all' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const weeks = useMemo(() => {
    const weeksMap: { [week: number]: { startDay: number, endDay: number } } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekNum = getWeekNumber(date);
      if (!weeksMap[weekNum]) {
        weeksMap[weekNum] = { startDay: day, endDay: day };
      } else {
        weeksMap[weekNum].endDay = day;
      }
    }
    return Object.entries(weeksMap)
      .map(([week, info]) => ({
        week: parseInt(week),
        startDay: info.startDay,
        endDay: info.endDay,
      }))
      .sort((a, b) => a.week - b.week);
  }, [year, month, daysInMonth]);

  const handleFinalize = useCallback(async (week: number | 'all') => {
    setIsFinalizing(week);
    setErrorMessage(null);
    try {
      if (week === 'all') {
        await api.finalizePlanning(year, month);
      } else {
        // Assuming the API can take a week number
        await api.finalizePlanning(year, month, week);
      }
      onClose();
      window.location.reload(); // Reload to see the final planning
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fout bij afronden van de planning.';
      setErrorMessage(msg);
      // Keep modal open to show error
      setIsFinalizing(null);
    }
  }, [year, month, onClose]);


  if (!show) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-base text-slate-900">Planning Afronden</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500">
                Kies welke week je als definitief wilt markeren. Eenmaal afgerond, kan een planning niet meer gewijzigd worden.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-2">
                {weeks.map(({ week, startDay, endDay }) => (
                    <button
                        key={week}
                        onClick={() => handleFinalize(week)}
                        disabled={!!isFinalizing}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-emerald-50 border-2 border-slate-200 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            <div>
                                <span className="font-bold text-sm text-slate-800">Week {week}</span>
                                <p className="text-xs text-slate-500">{startDay} - {endDay} {MONTH_NAMES[month-1]}</p>
                            </div>
                        </div>
                        {isFinalizing === week ? (
                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                        ) : (
                           <span className="text-xs font-bold text-emerald-700">Afronden</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
                 <button
                    onClick={() => handleFinalize('all')}
                    disabled={!!isFinalizing}
                    className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-100 hover:bg-emerald-100 border-2 border-slate-200 hover:border-emerald-300 transition-all cursor-pointer disabled:opacity-50"
                >
                    <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        <div>
                            <span className="font-bold text-sm text-slate-800">Volledige Maand</span>
                            <p className="text-xs text-slate-500">Rond de planning voor de hele maand in één keer af.</p>
                        </div>
                    </div>
                    {isFinalizing === 'all' ? (
                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                    ) : (
                       <span className="text-xs font-bold text-emerald-700">Alles Afronden</span>
                    )}
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};