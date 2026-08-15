import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ShiftCode, SHIFT_DEFINITIONS, MonthlyPlanning } from '../types';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, Loader2 } from 'lucide-react';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export const FinalPlanningView: React.FC = () => {
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [planning, setPlanning] = useState<MonthlyPlanning | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchPlanning = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getPlanning(currentYear, currentMonth);
      setPlanning(res.planning);
    } catch {
      setPlanning(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchPlanning();
  }, [fetchPlanning]);

  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth, 0).getDate(), [currentYear, currentMonth]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Final Planning</h2>
        <div className="flex items-center gap-2">
            <button onClick={() => setCurrentMonth(prev => prev === 1 ? 12 : prev - 1)} className="p-2 border rounded-xl"><ChevronLeft className="w-4 h-4"/></button>
            <span className="font-bold text-sm">{MONTH_NAMES[currentMonth-1]} {currentYear}</span>
            <button onClick={() => setCurrentMonth(prev => prev === 12 ? 1 : prev + 1)} className="p-2 border rounded-xl"><ChevronRight className="w-4 h-4"/></button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin" /></div>
      ) : !planning?.isFinal ? (
        <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-200 text-slate-500">
           Er is nog geen definitieve planning beschikbaar voor deze maand.
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const requested = planning.days[day] || '';
            const final = planning.finalDays?.[day] || '';
            const isChanged = requested !== final;
            const date = new Date(currentYear, currentMonth - 1, day);
            
            return (
                <div key={day} className={`p-4 rounded-xl border flex items-center justify-between ${isChanged ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                    <div>
                        <span className="font-bold text-slate-900">{day} {MONTH_NAMES[currentMonth-1]}</span>
                        <span className="text-xs text-slate-400 ml-2">Week {getWeekNumber(date)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xs text-slate-500">Gevraagd: <span className="font-bold">{requested || '-'}</span></div>
                        <div className="text-xs text-slate-900">Definitief: <span className="font-bold text-indigo-700">{final || '-'}</span></div>
                    </div>
                </div>
            )
          })}
        </div>
      )}
    </div>
  );
};
