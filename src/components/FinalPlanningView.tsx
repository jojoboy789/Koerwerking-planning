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
  if (!shift) {
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

  const fetchTeamOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getTeamOverview(currentYear, currentMonth);
      const finalData = res.teamData.filter((member) => {
        if (!member.planning || !member.planning.isFinal || !member.planning.finalDays) {
          return false;
        }
        const shifts = Object.values(member.planning.finalDays);
        return shifts.some((shift) => shift && shift !== 'X');
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
          return Boolean(shift && shift !== 'X');
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
        if (shift && shift !== 'X') {
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

  const handleDownloadPdf = async (weekNumber: number) => {
    setIsPrinting(weekNumber);
    const input = document.getElementById(`printable-week-${weekNumber}`);

    if (!input) {
      setIsPrinting(null);
      return;
    }

    try {
      const canvas = await html2canvas(input, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
          const head = clonedDoc.head;
          if (head) {
            head.querySelectorAll('style, link[rel="stylesheet"]').forEach((style) => style.remove());
          }
        },
      });

      
const pdf = new jsPDF('l', 'mm', 'a4');

const pdfWidth = pdf.internal.pageSize.getWidth();
const pdfHeight = pdf.internal.pageSize.getHeight();

const margin = 10;
const contentWidth = pdfWidth - margin * 2;
const contentHeight = pdfHeight - margin * 2;

const pixelsPerMm = canvas.width / contentWidth;
const pageHeightPx = Math.floor(contentHeight * pixelsPerMm);

let sourceY = 0;
let pageNumber = 0;

while (sourceY < canvas.height) {
  const sliceHeight = Math.min(
    pageHeightPx,
    canvas.height - sourceY,
  );

  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = canvas.width;
  pageCanvas.height = sliceHeight;

  const context = pageCanvas.getContext('2d');

  if (!context) {
    throw new Error('PDF-pagina kon niet worden opgebouwd.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

  context.drawImage(
    canvas,
    0,
    sourceY,
    canvas.width,
    sliceHeight,
    0,
    0,
    canvas.width,
    sliceHeight,
  );

  if (pageNumber > 0) {
    pdf.addPage('a4', 'landscape');
  }

  const imageData = pageCanvas.toDataURL('image/png');
  const imageHeight = sliceHeight / pixelsPerMm;

  pdf.addImage(
    imageData,
    'PNG',
    margin,
    margin,
    contentWidth,
    imageHeight,
  );

  sourceY += sliceHeight;
  pageNumber += 1;
}

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
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = pdfHeight - margin * 2;

    let pageAdded = false;

    for (const { week } of weeks) {
      const input = document.getElementById(`printable-week-${week}`);

      if (!input) {
        console.warn(`Week ${week} werd niet gevonden en is overgeslagen.`);
        continue;
      }

      const canvas = await html2canvas(input, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
          const head = clonedDoc.head;

          if (head) {
            head
              .querySelectorAll('style, link[rel="stylesheet"]')
              .forEach((style) => style.remove());
          }
        },
      });

      const imageData = canvas.toDataURL('image/png');

      const scale = Math.min(
        contentWidth / canvas.width,
        contentHeight / canvas.height,
      );

      const imageWidth = canvas.width * scale;
      const imageHeight = canvas.height * scale;

      const x = (pdfWidth - imageWidth) / 2;
      const y = (pdfHeight - imageHeight) / 2;

      if (pageAdded) {
        pdf.addPage('a4', 'landscape');
      }

      pdf.addImage(
        imageData,
        'PNG',
        x,
        y,
        imageWidth,
        imageHeight,
      );

      pageAdded = true;
    }

    if (pageAdded) {
      pdf.save(`definitieve-planning-${currentYear}-maand-${currentMonth + 1}.pdf`);
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
  };

  const renderWeeklyPlanning = () => (
    <div className="space-y-5">
      {weeks.map(({ week, days }) => {
        const membersForWeek = teamData.filter((member) =>
          days.some(({ day }) => {
            const shift = member.planning?.finalDays?.[day];
            return Boolean(shift && shift !== 'X');
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
                        const shift = (member.planning?.finalDays?.[day] as ShiftCode | null) || null;
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
        renderWeeklyPlanning()
      )}

      <p className="text-center text-[11px] text-slate-400">
        Definitieve planning · {MONTH_NAMES[currentMonth - 1]} {currentYear}
      </p>
    </div>
  );
};