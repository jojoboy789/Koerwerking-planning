import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/api';
import { TeamMemberOverview, ShiftCode, SHIFT_DEFINITIONS } from '../types';
import { ChevronLeft, ChevronRight, AlertTriangle, Loader2, Download } from 'lucide-react';
import { PrintableWeekView } from './PrintableWeekView';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

const DayHeader: React.FC<{ day: number, month: number, year: number }> = ({ day, month, year }) => {
    const date = new Date(year, month - 1, day);
    const dayName = DAY_NAMES[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
        <div className={`text-center p-2 rounded-lg ${isWeekend ? 'bg-slate-100/80' : ''}`}>
            <div className={`text-[10px] uppercase font-bold ${isWeekend ? 'text-amber-700' : 'text-slate-500'}`}>{dayName}</div>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{day}</div>
        </div>
    );
};

const ShiftCell: React.FC<{shift: ShiftCode | null, memberName: string, day: number}> = ({ shift, memberName, day }) => {
    if (!shift) {
      return <div className="w-full h-9 flex items-center justify-center rounded-lg bg-slate-100/70 text-slate-400" title={`${memberName} - Dag ${day}: Niet ingepland`}></div>;
    }

    const shiftInfo = SHIFT_DEFINITIONS[shift];
    if (!shiftInfo) {
        return <div className="w-full h-9 flex items-center justify-center rounded-lg bg-slate-100/70 text-slate-400" title={`${memberName} - Dag ${day}: Onbekend`}>?</div>;
    }
    
    const classNames = `w-full h-9 flex items-center justify-center rounded-lg text-xs font-bold select-none ${shiftInfo.colorClass}`;
    const title = `${memberName} - Dag ${day}: ${shiftInfo.label}`;

    return (
        <div className={classNames} title={title}>
            {shift === 'X' ? '' : shift}
        </div>
    );
}

export const FinalPlanningView: React.FC = () => {
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [teamData, setTeamData] = useState<TeamMemberOverview[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPrinting, setIsPrinting] = useState<number | null>(null);

  const fetchTeamOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getTeamOverview(currentYear, currentMonth);
      const finalData = res.teamData.filter(member => {
        if (!member.planning || !member.planning.isFinal || !member.planning.finalDays) {
          return false;
        }
        const shifts = Object.values(member.planning.finalDays);
        return shifts.some(shift => shift && shift !== 'X');
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

  const daysInMonth = useMemo(() => new Date(currentYear, currentMonth, 0).getDate(), [currentYear, currentMonth]);

  const weeks = useMemo(() => {
    const weeksMap: { [week: number]: {days: { day: number; date: Date }[], hasWorkday: boolean} } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth - 1, day);
      const weekNum = getWeekNumber(date);
      if (!weeksMap[weekNum]) {
        weeksMap[weekNum] = { days: [], hasWorkday: false };
      }
      weeksMap[weekNum].days.push({ day, date });
    }

    teamData.forEach(member => {
        Object.keys(weeksMap).forEach(weekNum => {
            const weekInfo = weeksMap[parseInt(weekNum)];
            const hasWorkDayInWeek = weekInfo.days.some(({ day }) => {
                const shift = member.planning?.finalDays?.[day];
                return shift && shift !== 'X';
            });
            if(hasWorkDayInWeek) {
                weekInfo.hasWorkday = true;
            }
        });
    });

    return Object.entries(weeksMap)
      .map(([week, info]) => ({ week: parseInt(week), ...info }))
      .filter(week => week.hasWorkday)
      .sort((a,b) => a.week - b.week);

  }, [teamData, currentYear, currentMonth, daysInMonth]);

  const handleDownloadPdf = async (weekNumber: number) => {
    setIsPrinting(weekNumber);
    const input = document.getElementById(`printable-week-${weekNumber}`);
    if (input) {
      html2canvas(input, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        onclone: (clonedDoc) => {
            // Aggressively remove all styles to prevent oklch color errors
            const head = clonedDoc.head;
            if (head) {
                const styles = head.querySelectorAll('style, link[rel="stylesheet"]');
                styles.forEach(style => style.remove());
            }
        }
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;
        let width = pdfWidth - 20; // with margin
        let height = width / ratio;

        if (height > pdfHeight - 20) {
          height = pdfHeight - 20; // respect margin
          width = height * ratio;
        }

        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;

        pdf.addImage(imgData, 'PNG', x, y, width, height);
        pdf.save(`planning-week-${currentYear}-${weekNumber}.pdf`);
      }).finally(() => {
        setIsPrinting(null);
      });
    } else {
      setIsPrinting(null);
    }
  };

  const renderWeeklyPlanning = () => (
    <div className="space-y-6">
      {weeks.map(({ week, days }) => {
        const membersForWeek = teamData.filter(member => {
            const hasWorkDayInWeek = days.some(({ day }) => {
                const shift = member.planning?.finalDays?.[day];
                return shift && shift !== 'X';
            });
            return hasWorkDayInWeek;
        });

        if (membersForWeek.length === 0) return null;

        return (
          <div key={week}>
            <div className="overflow-x-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-3 ml-1">
                    <h3 className="font-bold text-lg text-indigo-700">Week {week}</h3>
                    <button 
                      onClick={() => handleDownloadPdf(week)} 
                      disabled={isPrinting !== null}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPrinting === week ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span>{isPrinting === week ? 'Moment...' : 'Download PDF'}</span>
                    </button>
                </div>
                <table className="w-full border-collapse min-w-[600px]">
                    <thead>
                        <tr className="border-b border-slate-200">
                            <th className="sticky left-0 z-10 bg-white p-2 font-bold text-slate-700 text-left text-sm w-48">Teamlid</th>
                            {days.map(({ day }) => (
                              <th key={day} className="p-1 min-w-[70px]">
                                  <DayHeader day={day} month={currentMonth} year={currentYear} />
                              </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {membersForWeek.map(member => (
                            <tr key={member.user.id} className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors group">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 p-2 font-semibold text-sm text-slate-800 whitespace-nowrap border-r border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs border border-indigo-200 shrink-0">
                                            {member.user.avatar || member.user.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900 text-sm">{member.user.name}</div>
                                            <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{member.user.role || 'Teamlid'}</div>
                                        </div>
                                    </div>
                                </td>
                                {days.map(({ day }) => {
                                    const shift = (member.planning?.finalDays?.[day] as ShiftCode | null) || null;
                                    return (
                                        <td key={day} className="p-1 text-center border-r border-slate-100">
                                          <ShiftCell shift={shift} memberName={member.user.name} day={day} />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Off-screen component for printing, using inline styles only */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', zIndex: -100 }}>
                <PrintableWeekView weekNumber={week} weekData={days} teamData={membersForWeek} year={currentYear} month={currentMonth} />
            </div>
          </div>
        )
      })}
    </div>
  );

  const handleMonthChange = (direction: 1 | -1) => {
    const newDate = new Date(currentYear, currentMonth -1 + direction, 1);
    setCurrentYear(newDate.getFullYear());
    setCurrentMonth(newDate.getMonth() + 1);
  }

  return (
    <div className="max-w-full mx-auto px-4 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Definitieve Team Planning</h2>
                <p className="text-sm text-slate-500 mt-1">Wekelijks overzicht van de goedgekeurde planning voor {MONTH_NAMES[currentMonth-1]} {currentYear}.</p>
            </div>
            <div className="flex items-center bg-white rounded-2xl p-1 border border-slate-200 shadow-xs">
                <button onClick={() => handleMonthChange(-1)} className="p-2.5 text-slate-500 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-100"><ChevronLeft className="w-5 h-5"/></button>
                <span className="font-bold text-sm w-36 text-center tracking-wide text-slate-900 uppercase">{MONTH_NAMES[currentMonth-1]} {currentYear}</span>
                <button onClick={() => handleMonthChange(1)} className="p-2.5 text-slate-500 hover:text-indigo-600 transition-colors rounded-xl hover:bg-slate-100"><ChevronRight className="w-5 h-5"/></button>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {Object.values(SHIFT_DEFINITIONS).map(shift => (
                <div key={shift.code} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                    <span className={`w-4 h-4 rounded-md ${shift.colorClass}`}></span>
                    <span className="text-slate-600 font-medium text-xs">{shift.shortLabel} ({shift.code})</span>
                </div>
            ))}
        </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-20 bg-white rounded-2xl border border-slate-200"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : weeks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 shadow-sm">
           <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-slate-400" />
           <h3 className="font-bold text-slate-800">Geen actieve planning</h3>
           <p className="text-sm">Er is geen definitieve planning met werkdagen gevonden voor deze maand.</p>
        </div>
      ) : (
        renderWeeklyPlanning()
      )}
    </div>
  );
};
