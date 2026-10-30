import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { TeamMemberOverview, ShiftCode, SHIFT_DEFINITIONS } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Download,
  Users,
  CalendarDays,
  BriefcaseBusiness,
  Sun,
  Grid3X3,
  List,
} from 'lucide-react';
import { PrintableWeekView } from './PrintableWeekView';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Calculate Easter Sunday using the Gregorian calendar algorithm.
function getEasterSunday(year: number): Date {
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
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getShiftInfo(shift: ShiftCode | null | undefined) {
  if (!shift || !Object.prototype.hasOwnProperty.call(SHIFT_DEFINITIONS, shift)) {
    return undefined;
  }

  return SHIFT_DEFINITIONS[shift as keyof typeof SHIFT_DEFINITIONS];
}

// Alleen effectieve koerdiensten tonen in de definitieve planning.
// R (rust), X (niet inplannen) en lege waarden zijn geen ingeplande diensten.
function isVisibleWorkShift(
  shift: unknown
): shift is keyof typeof SHIFT_DEFINITIONS {
  return (
    typeof shift === 'string' &&
    Object.prototype.hasOwnProperty.call(SHIFT_DEFINITIONS, shift) &&
    shift !== 'R' &&
    shift !== 'X'
  );
}

function getBelgianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const add = (date: Date, name: string) => holidays.set(dateKey(date), name);
  const easter = getEasterSunday(year);
  const offset = (days: number) => {
    const date = new Date(easter);
    date.setDate(date.getDate() + days);
    return date;
  };

  add(new Date(year, 0, 1), 'Nieuwjaar');
  add(offset(1), 'Paasmaandag');
  add(new Date(year, 4, 1), 'Dag van de Arbeid');
  add(offset(39), 'O.L.H. Hemelvaart');
  add(offset(50), 'Pinkstermaandag');
  add(new Date(year, 6, 21), 'Nationale feestdag');
  add(new Date(year, 7, 15), 'O.L.V. Hemelvaart');
  add(new Date(year, 10, 1), 'Allerheiligen');
  add(new Date(year, 10, 11), 'Wapenstilstand');
  add(new Date(year, 11, 25), 'Kerstmis');

  return holidays;
}

const DayHeader: React.FC<{
  day: number;
  month: number;
  year: number;
  holidayName?: string;
}> = ({ day, month, year, holidayName }) => {
  const date = new Date(year, month - 1, day);
  const dayName = DAY_NAMES[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      title={holidayName ? `${dayName} ${day}: ${holidayName}` : `${dayName} ${day}`}
      className={`min-h-[58px] rounded-xl px-1.5 py-2 text-center ${
        holidayName
          ? 'border border-amber-300 bg-amber-100'
          : isWeekend
            ? 'bg-slate-100'
            : 'bg-white'
      }`}
    >
      <div className={`text-[10px] font-extrabold uppercase tracking-wide ${
        holidayName ? 'text-amber-800' : isWeekend ? 'text-slate-600' : 'text-slate-500'
      }`}>
        {dayName}
      </div>
      <div className={`mt-0.5 text-sm font-extrabold ${
        holidayName ? 'text-slate-950' : 'text-slate-800'
      }`}>
        {day}
      </div>
      {holidayName && (
        <div className="mt-1 text-[9px] font-bold leading-tight text-amber-900">
          Feestdag
        </div>
      )}
    </div>
  );
};

const ShiftCell: React.FC<{
  shift: ShiftCode | null;
  memberName: string;
  day: number;
}> = ({ shift, memberName, day }) => {
  if (!isVisibleWorkShift(shift)) {
    return (
      <div
        className="flex h-9 w-full items-center justify-center rounded-lg bg-slate-100/70 text-slate-400"
        title={`${memberName} - Dag ${day}: Niet ingepland`}
      >
        <span className="text-xs">·</span>
      </div>
    );
  }

  const shiftInfo = SHIFT_DEFINITIONS[shift];
  if (!shiftInfo) {
    return (
      <div
        className="flex h-9 w-full items-center justify-center rounded-lg bg-slate-100 text-slate-400"
        title={`${memberName} - Dag ${day}: Onbekend`}
      >
        ?
      </div>
    );
  }

  const title = `${memberName} - Dag ${day}: ${shiftInfo.label}`;

  return (
    <div
      className={`flex h-9 w-full items-center justify-center rounded-lg border border-black/5 text-xs font-extrabold select-none ${shiftInfo.colorClass}`}
      title={title}
      aria-label={title}
    >
      {shift === 'X' ? 'X' : shift}
    </div>
  );
};

export const FinalPlanningView: React.FC = () => {
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [teamData, setTeamData] = useState<TeamMemberOverview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<number | null>(null);
  const [isPrintingMonth, setIsPrintingMonth] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [calendarMode, setCalendarMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
  );

  const fetchTeamOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getTeamOverview(currentYear, currentMonth);
      const finalData = res.teamData.filter((member) => {
        if (!member.planning || !member.planning.isFinal || !member.planning.finalDays) {
          return false;
        }
        const shifts = Object.values(member.planning.finalDays);
        return shifts.some((shift) => isVisibleWorkShift(shift));
      });
      setTeamData(finalData);
    } catch {
      setTeamData([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchTeamOverview();
  }, [fetchTeamOverview]);

  const daysInMonth = useMemo(
    () => new Date(currentYear, currentMonth, 0).getDate(),
    [currentYear, currentMonth],
  );

  const holidays = useMemo(() => getBelgianHolidays(currentYear), [currentYear]);

  const weeks = useMemo(() => {
    const weeksMap: Record<number, { days: { day: number; date: Date }[]; hasWorkday: boolean }> = {};

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const weekNum = getWeekNumber(date);
      if (!weeksMap[weekNum]) {
        weeksMap[weekNum] = { days: [], hasWorkday: false };
      }
      weeksMap[weekNum].days.push({ day, date });
    }

    teamData.forEach((member) => {
      Object.keys(weeksMap).forEach((weekNum) => {
        const weekInfo = weeksMap[Number(weekNum)];
        const hasWorkDayInWeek = weekInfo.days.some(({ day }) => {
          const shift = member.planning?.finalDays?.[day];
          return isVisibleWorkShift(shift);
        });
        if (hasWorkDayInWeek) weekInfo.hasWorkday = true;
      });
    });

    return Object.entries(weeksMap)
      .map(([week, info]) => ({ week: Number(week), ...info }))
      .filter((week) => week.hasWorkday)
      .sort((a, b) => a.week - b.week);
  }, [teamData, currentYear, currentMonth, daysInMonth]);

  const statistics = useMemo(() => {
    let plannedShifts = 0;
    const staffedDays = new Set<number>();

    teamData.forEach((member) => {
      Object.entries(member.planning?.finalDays || {}).forEach(([dayKey, shift]) => {
        if (isVisibleWorkShift(shift)) {
          plannedShifts += 1;
          staffedDays.add(Number(dayKey));
        }
      });
    });

    return {
      teamMembers: teamData.length,
      plannedShifts,
      staffedDays: staffedDays.size,
    };
  }, [teamData]);

  const capturePrintableWeek = async (weekNumber: number): Promise<HTMLCanvasElement> => {
    const input = document.getElementById(`printable-week-${weekNumber}`);

    if (!input) {
      throw new Error(`De afdrukweergave voor week ${weekNumber} werd niet gevonden.`);
    }

    return html2canvas(input, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: 1120,
      onclone: (clonedDoc) => {
        // De PDF-weergave gebruikt inline stijlen. Externe stylesheets verwijderen
        // voorkomt dat de website-CSS de afdruklayout onbedoeld beïnvloedt.
        clonedDoc.head
          .querySelectorAll('style, link[rel="stylesheet"]')
          .forEach((style) => style.remove());
      },
    });
  };

  const addCanvasToPdfPage = (pdf: jsPDF, canvas: HTMLCanvasElement, addPage = false) => {
    if (addPage) {
      pdf.addPage('a4', 'landscape');
    }

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availableWidth = pdfWidth - margin * 2;
    const availableHeight = pdfHeight - margin * 2;

    // Behoud de verhouding van de afbeelding en centreer ze op A4 liggend.
    const scale = Math.min(
      availableWidth / canvas.width,
      availableHeight / canvas.height,
    );

    const imageWidth = canvas.width * scale;
    const imageHeight = canvas.height * scale;
    const x = (pdfWidth - imageWidth) / 2;
    const y = (pdfHeight - imageHeight) / 2;

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      x,
      y,
      imageWidth,
      imageHeight,
      undefined,
      'FAST',
    );
  };

  const handleDownloadPdf = async (weekNumber: number) => {
    setIsPrinting(weekNumber);

    try {
      const canvas = await capturePrintableWeek(weekNumber);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      addCanvasToPdfPage(pdf, canvas);
      pdf.save(`definitieve-planning-${currentYear}-week-${weekNumber}.pdf`);
    } catch (error) {
      console.error('PDF exporteren is mislukt:', error);
    } finally {
      setIsPrinting(null);
    }
  };

  const handleDownloadMonthPdf = async () => {
    setIsPrintingMonth(true);

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      let pageAdded = false;

      for (const { week } of weeks) {
        try {
          const canvas = await capturePrintableWeek(week);
          addCanvasToPdfPage(pdf, canvas, pageAdded);
          pageAdded = true;
        } catch (error) {
          console.error(`PDF-pagina voor week ${week} kon niet worden aangemaakt:`, error);
        }
      }

      if (pageAdded) {
        const monthNumber = String(currentMonth).padStart(2, '0');
        pdf.save(`definitieve-planning-${currentYear}-maand-${monthNumber}.pdf`);
      } else {
        console.error('Er werden geen weektabellen gevonden voor de maand-PDF.');
      }
    } catch (error) {
      console.error('Maand-PDF exporteren is mislukt:', error);
    } finally {
      setIsPrintingMonth(false);
    }
  };

  const handleMonthChange = (direction: 1 | -1) => {
    const newDate = new Date(currentYear, currentMonth - 1 + direction, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
    setSelectedCalendarDate(newDate);
  };

  const getShiftForDate = (member: TeamMemberOverview, date: Date): ShiftCode | null => {
    if (date.getMonth() + 1 !== currentMonth || date.getFullYear() !== currentYear) return null;
    return (member.planning?.finalDays?.[date.getDate()] as ShiftCode | null) || null;
  };

  const getCalendarDates = (): Date[] => {
    if (calendarMode === 'day') {
      return [new Date(currentYear, currentMonth - 1, selectedCalendarDate.getDate())];
    }

    if (calendarMode === 'week') {
      const start = new Date(selectedCalendarDate);
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
      });
    }

    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  };

  const changeCalendarPeriod = (direction: -1 | 1) => {
    if (calendarMode === 'month') {
      handleMonthChange(direction);
      return;
    }

    const next = new Date(selectedCalendarDate);
    next.setDate(next.getDate() + (calendarMode === 'week' ? 7 : 1) * direction);
    setSelectedCalendarDate(next);
    if (next.getMonth() !== currentMonth - 1 || next.getFullYear() !== currentYear) {
      setCurrentYear(next.getFullYear());
      setCurrentMonth(next.getMonth() + 1);
    }
  };

  const renderCalendarPlanning = () => {
    const dates = getCalendarDates();
    const selectedKey = dateKey(selectedCalendarDate);
    const shiftOrder: Record<string, number> = { V: 0, D: 1, L: 2 };

    const sortByShiftOrder = <T extends { shift: ShiftCode | null }>(items: T[]) =>
      [...items].sort((a, b) =>
        (shiftOrder[a.shift || ''] ?? 99) - (shiftOrder[b.shift || ''] ?? 99)
      );

    const selectedMembers = sortByShiftOrder(
      teamData
        .map((member) => ({ member, shift: getShiftForDate(member, selectedCalendarDate) }))
        .filter(({ shift }) => isVisibleWorkShift(shift))
    );

    const periodLabel = calendarMode === 'month'
      ? `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`
      : calendarMode === 'week'
        ? `Week ${getWeekNumber(selectedCalendarDate)} · ${dates[0].getDate()} ${MONTH_NAMES[dates[0].getMonth()]} t.e.m. ${dates[6].getDate()} ${MONTH_NAMES[dates[6].getMonth()]}`
        : `${selectedCalendarDate.getDate()} ${MONTH_NAMES[selectedCalendarDate.getMonth()]} ${selectedCalendarDate.getFullYear()}`;

    return (
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900">{periodLabel}</h3>
              <p className="mt-1 text-xs text-slate-500">Selecteer een dag om de definitieve bezetting te bekijken.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeCalendarPeriod(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" aria-label="Vorige periode">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => {
                const today = new Date();
                setCurrentYear(today.getFullYear());
                setCurrentMonth(today.getMonth() + 1);
                setSelectedCalendarDate(today);
              }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Vandaag
              </button>
              <button type="button" onClick={() => changeCalendarPeriod(1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50" aria-label="Volgende periode">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {calendarMode !== 'day' && (
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((day) => (
                <div key={day} className="p-2 text-center text-[11px] font-extrabold uppercase text-slate-500">{day}</div>
              ))}
            </div>
          )}

          <div className={calendarMode === 'day' ? 'grid grid-cols-1' : 'grid grid-cols-7'}>
            {dates.map((date) => {
              const inCurrentMonth = date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
              const holidayName = getBelgianHolidays(date.getFullYear()).get(dateKey(date));
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const isToday = dateKey(date) === dateKey(new Date());
              const isSelected = dateKey(date) === selectedKey;
              const shifts = sortByShiftOrder(
                teamData
                  .map((member) => ({ member, shift: getShiftForDate(member, date) }))
                  .filter(({ shift }) => isVisibleWorkShift(shift))
              );

              return (
                <button
                  type="button"
                  key={dateKey(date)}
                  onClick={() => {
                    setSelectedCalendarDate(date);
                    if (!inCurrentMonth) {
                      setCurrentYear(date.getFullYear());
                      setCurrentMonth(date.getMonth() + 1);
                    }
                  }}
                  className={`min-h-[112px] border-b border-r border-slate-100 p-1.5 text-left transition-colors sm:min-h-[132px] sm:p-2 ${
                    holidayName ? 'bg-amber-50 hover:bg-amber-100' :
                    isWeekend ? 'bg-blue-50/70 hover:bg-blue-100' :
                    'bg-white hover:bg-yellow-50'
                  } ${!inCurrentMonth ? 'opacity-40' : ''} ${isSelected ? 'ring-2 ring-inset ring-[#ffdc00]' : ''}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-1">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                      isToday ? 'bg-[#ffdc00] text-[#17202b]' : holidayName ? 'bg-amber-200 text-amber-950' : isWeekend ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                    }`}>{date.getDate()}</span>
                    {holidayName && <span className="truncate rounded-full bg-amber-200 px-2 py-1 text-[9px] font-extrabold text-amber-900">Feestdag</span>}
                    {!holidayName && isWeekend && <span className="truncate rounded-full bg-blue-100 px-2 py-1 text-[9px] font-extrabold text-blue-800">Weekend</span>}
                  </div>

                  {holidayName ? (
                    <div className="flex min-h-[76px] items-start gap-2 rounded-lg border border-amber-300 bg-[#fff4cc] p-2 text-amber-950 sm:min-h-[88px] sm:p-2.5">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold leading-tight sm:text-xs">Deze dag geen geplande koerdienst</div>
                        <div className="mt-1 text-[9px] leading-snug text-amber-800 sm:text-[10px]">
                          Belgische wettelijke feestdag: {holidayName}. Dienstkeuzes zijn uitgeschakeld.
                        </div>
                      </div>
                    </div>
                  ) : isWeekend ? (
                    <div className="flex min-h-[76px] items-start gap-2 rounded-lg border border-blue-200 bg-[#dbeafe] p-2 text-blue-950 sm:min-h-[88px] sm:p-2.5">
                      <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold leading-tight sm:text-xs">Weekend geen geplande koerdienst</div>
                        <div className="mt-1 text-[9px] leading-snug text-blue-800 sm:text-[10px]">
                          Zaterdag en zondag zijn niet beschikbaar voor koerdienst. Dienstkeuzes zijn uitgeschakeld.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {shifts.slice(0, 3).map(({ member, shift }) => {
                        const info = getShiftInfo(shift as ShiftCode | null);
                        return (
                          <div key={member.user.id} className={`truncate rounded px-1.5 py-1 text-[9px] font-bold sm:text-[10px] ${info?.colorClass || 'bg-slate-100 text-slate-700'}`}>
                            <span className="font-black">{shift}</span>
                            <span className="ml-1 hidden sm:inline">{member.user.name}</span>
                          </div>
                        );
                      })}
                      {shifts.length > 3 && <div className="px-1 text-[9px] font-bold text-slate-500">+{shifts.length - 3} meer</div>}
                      {calendarMode === 'day' && shifts.length === 0 && <p className="p-3 text-sm text-slate-400">Geen ingeplande werkdagen.</p>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-[#17202b] px-4 py-3 text-white">
            <h3 className="font-bold">Bezetting op {selectedCalendarDate.getDate()} {MONTH_NAMES[selectedCalendarDate.getMonth()]}</h3>
            <p className="mt-0.5 text-xs text-slate-300">{selectedMembers.length} ingeplande teamleden</p>
          </div>
          {selectedMembers.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Geen definitieve diensten gevonden voor deze dag.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {selectedMembers.map(({ member, shift }) => {
                const info = getShiftInfo(shift as ShiftCode | null);
                return (
                  <div key={member.user.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{member.user.name}</div>
                      <div className="text-xs text-slate-500">{member.user.role || 'Teamlid'}</div>
                    </div>
                    <span className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${info?.colorClass || 'bg-slate-100 text-slate-700'}`}>{shift}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderWeeklyPlanning = () => (
    <div className="space-y-5">
      {weeks.map(({ week, days }) => {
        const membersForWeek = teamData.filter((member) =>
          days.some(({ day }) => {
            const shift = member.planning?.finalDays?.[day];
            return isVisibleWorkShift(shift);
          }),
        );

        if (membersForWeek.length === 0) return null;

        return (
          <section
            key={week}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            aria-labelledby={`week-title-${week}`}
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-[#17202b] px-4 py-4 text-white sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffdc00] text-sm font-black text-[#17202b]">
                  {week}
                </div>
                <div>
                  <h3 id={`week-title-${week}`} className="font-bold text-white">
                    Week {week}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {days.length === 1
                      ? `${days[0].day} ${MONTH_NAMES[currentMonth - 1]}`
                      : `${days[0].day} t.e.m. ${days[days.length - 1].day} ${MONTH_NAMES[currentMonth - 1]}`}
                    {' · '}{membersForWeek.length} teamlid{membersForWeek.length === 1 ? '' : 'en'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDownloadPdf(week)}
                disabled={isPrinting !== null}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#ffdc00] px-4 py-2 text-xs font-extrabold text-[#17202b] transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPrinting === week
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
                {isPrinting === week ? 'PDF maken…' : 'Download PDF'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="sticky left-0 z-20 w-52 min-w-52 border-r border-slate-200 bg-slate-50 p-3 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600">
                      Teamlid
                    </th>
                    {days.map(({ day }) => (
                      <th key={day} className="min-w-[66px] p-1.5">
                        <DayHeader
                          day={day}
                          month={currentMonth}
                          year={currentYear}
                          holidayName={holidays.get(dateKey(new Date(currentYear, currentMonth - 1, day)))}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {membersForWeek.map((member) => (
                    <tr
                      key={member.user.id}
                      className="group border-b border-slate-100 last:border-b-0 hover:bg-yellow-50/40"
                    >
                      <td className="sticky left-0 z-10 border-r border-slate-200 bg-white p-2.5 group-hover:bg-yellow-50/40">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-yellow-300 bg-[#ffdc00] text-xs font-black text-[#17202b]">
                            {member.user.avatar || member.user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-slate-900">
                              {member.user.name}
                            </div>
                            <div className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {member.user.role || 'Teamlid'}
                            </div>
                          </div>
                        </div>
                      </td>
                      {days.map(({ day, date }) => {
                        const rawShift = (member.planning?.finalDays?.[day] as ShiftCode | null) || null;
                        const shift = isVisibleWorkShift(rawShift) ? rawShift : null;
                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                        const holidayName = holidays.get(dateKey(date));

                        return (
                          <td
                            key={day}
                            className={`border-r border-slate-100 p-1.5 text-center last:border-r-0 ${
                              holidayName ? 'bg-amber-50' : isWeekend ? 'bg-slate-50/80' : ''
                            }`}
                            title={holidayName || undefined}
                          >
                            <ShiftCell shift={shift} memberName={member.user.name} day={day} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
              <span>{membersForWeek.length} teamlid{membersForWeek.length === 1 ? '' : 'en'} met ingeplande werkdagen</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-100" />
                Feestdag
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
                Weekend
              </span>
            </div>

            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -100 }}>
              <PrintableWeekView
                weekNumber={week}
                weekData={days}
                teamData={membersForWeek}
                year={currentYear}
                month={currentMonth}
              />
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
      <header className="overflow-hidden rounded-2xl bg-[#17202b] shadow-sm">
        <div className="h-2 bg-[#ffdc00]" />
        <div className="flex flex-col gap-5 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffdc00] text-[#17202b]">
              <CalendarDays className="h-6 w-6" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-300" />
                Definitief
              </div>
              <h2 className="text-xl font-extrabold text-white sm:text-2xl">
                Definitieve teamplanning
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-300">
                Het goedgekeurde werkrooster voor {MONTH_NAMES[currentMonth - 1]} {currentYear}.
              </p>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/5 p-1.5 sm:w-auto sm:justify-start">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              aria-label="Vorige maand"
              className="rounded-lg p-2.5 text-white transition-colors hover:bg-white/10 hover:text-yellow-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-36 px-2 text-center">
              <div className="text-sm font-extrabold text-white">
                {MONTH_NAMES[currentMonth - 1]}
              </div>
              <div className="text-xs font-medium text-slate-300">{currentYear}</div>
            </div>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              aria-label="Volgende maand"
              className="rounded-lg p-2.5 text-white transition-colors hover:bg-white/10 hover:text-yellow-300"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          
          </div>

          <button
            type="button"
            onClick={handleDownloadMonthPdf}
            disabled={isPrintingMonth || isPrinting !== null || isLoading || weeks.length === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffdc00] px-4 py-3 text-sm font-extrabold text-[#17202b] transition-colors hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPrintingMonth ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isPrintingMonth ? 'Maand-PDF maken…' : 'Maand-PDF downloaden'}
          </button>
        </div>
      </header>


      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Planningstatistieken">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-slate-900">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900">{statistics.teamMembers}</div>
            <div className="text-xs font-semibold text-slate-500">Teamleden met definitieve planning</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#17202b]">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900">{statistics.plannedShifts}</div>
            <div className="text-xs font-semibold text-slate-500">Ingeplande werkdagen</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Sun className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold tabular-nums text-slate-900">{statistics.staffedDays}</div>
            <div className="text-xs font-semibold text-slate-500">Dagen met minstens één werkshift</div>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-2" aria-label="Legende dienstcodes">
        <span className="mr-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">Dienstcodes</span>
        {Object.values(SHIFT_DEFINITIONS).map((shift) => (
          <div
            key={shift.code}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
            title={shift.label}
          >
            <span className={`flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-[11px] font-extrabold ${shift.colorClass}`}>
              {shift.code}
            </span>
            <span className="text-xs font-semibold text-slate-600">{shift.shortLabel}</span>
          </div>
        ))}
        <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="h-3 w-3 rounded-sm border border-amber-300 bg-amber-100" />
          <span className="text-xs font-semibold text-amber-900">Feestdag</span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2">
          <span className="h-3 w-3 rounded-sm bg-slate-300" />
          <span className="text-xs font-semibold text-slate-600">Weekend</span>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800">Weergave</h3>
          <p className="text-xs text-slate-500">Kies hoe je de definitieve planning wilt bekijken.</p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'table' ? 'bg-[#17202b] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <List className="h-4 w-4" /> Tabelweergave
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'calendar' ? 'bg-[#17202b] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Grid3X3 className="h-4 w-4" /> Kalenderweergave
          </button>
        </div>
      </section>

      {viewMode === 'calendar' && (
        <div className="flex flex-wrap gap-2">
          {([
            ['month', 'Maand'],
            ['week', 'Week'],
            ['day', 'Dag'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setCalendarMode(mode)}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${calendarMode === mode ? 'bg-[#ffdc00] text-[#17202b]' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-52 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin text-[#17202b]" />
            Definitieve planning laden…
          </div>
        </div>
      ) : weeks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-slate-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="font-extrabold text-slate-900">Geen actieve planning</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Er is geen definitieve planning met werkdagen gevonden voor {MONTH_NAMES[currentMonth - 1]} {currentYear}.
          </p>
        </div>
      ) : (
        viewMode === 'calendar' ? renderCalendarPlanning() : renderWeeklyPlanning()
      )}

      <p className="text-center text-[11px] text-slate-400">
        Definitieve planning · {MONTH_NAMES[currentMonth - 1]} {currentYear}
      </p>
    </div>
  );
};