import React from 'react';
import { TeamMemberOverview, SHIFT_DEFINITIONS } from '../types';

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
];

interface PrintableWeekViewProps {
  weekNumber: number;
  year: number;
  month: number;
  weekData: Array<{ day: number; date: Date }>;
  teamData: TeamMemberOverview[];
}

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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getBelgianHolidays(year: number): Map<string, string> {
  const holidays = new Map<string, string>();
  const fixed: Record<string, string> = {
    '1-1': 'Nieuwjaar',
    '5-1': 'Dag van de Arbeid',
    '7-21': 'Nationale feestdag',
    '8-15': 'O.L.V. Hemelvaart',
    '11-1': 'Allerheiligen',
    '11-11': 'Wapenstilstand',
    '12-25': 'Kerstmis',
  };

  Object.entries(fixed).forEach(([key, name]) => {
    const [month, day] = key.split('-').map(Number);
    holidays.set(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, name);
  });

  const easter = getEasterSunday(year);
  const movable = [
    { offset: 1, name: 'Paasmaandag' },
    { offset: 39, name: 'O.H. Hemelvaart' },
    { offset: 50, name: 'Pinkstermaandag' },
  ];

  movable.forEach(({ offset, name }) => {
    const date = new Date(year, easter.getMonth(), easter.getDate() + offset);
    holidays.set(dateKey(date), name);
  });

  return holidays;
}

function getShiftColors(code: string): { background: string; foreground: string; border: string } {
  switch (code) {
    case 'V': return { background: '#d1fae5', foreground: '#065f46', border: '#6ee7b7' };
    case 'D': return { background: '#fef3c7', foreground: '#92400e', border: '#fcd34d' };
    case 'L': return { background: '#f3e8ff', foreground: '#6b21a8', border: '#d8b4fe' };
    case 'R': return { background: '#dbeafe', foreground: '#1d4ed8', border: '#93c5fd' };
    case 'X': return { background: '#e2e8f0', foreground: '#334155', border: '#cbd5e1' };
    default: return { background: '#f1f5f9', foreground: '#475569', border: '#cbd5e1' };
  }
}

export const PrintableWeekView: React.FC<PrintableWeekViewProps> = ({
  weekNumber,
  weekData,
  teamData,
  year,
  month,
}) => {
  const monthName = MONTH_NAMES[month - 1] || '';
  const holidays = getBelgianHolidays(year);

  const pageStyle: React.CSSProperties = {
    width: '1120px',
    boxSizing: 'border-box',
    padding: '28px 30px 22px',
    backgroundColor: '#ffffff',
    color: '#17202b',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  return (
    <div id={`printable-week-${weekNumber}`} style={pageStyle}>
      <div style={{
        background: '#17202b',
        borderTop: '9px solid #ffdc00',
        borderRadius: '10px',
        padding: '20px 25px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        marginBottom: '18px',
      }}>
        <div>
          <div style={{
            display: 'inline-block',
            background: '#ffdc00',
            color: '#17202b',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '10px',
            fontWeight: 900,
            letterSpacing: '1.2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Definitieve planning
          </div>
          <h1 style={{ margin: 0, color: '#ffffff', fontSize: '32px', lineHeight: 1.05, fontWeight: 900 }}>
            Week {weekNumber}
          </h1>
          <div style={{ marginTop: '7px', color: '#cbd5e1', fontSize: '15px', fontWeight: 700 }}>
            {monthName} {year}
          </div>
        </div>

        <div style={{ textAlign: 'right', color: '#e2e8f0', fontSize: '12px', lineHeight: 1.8 }}>
          <div style={{ color: '#ffdc00', fontSize: '10px', fontWeight: 900, letterSpacing: '1.1px', textTransform: 'uppercase' }}>
            Koerwerking · Teamoverzicht
          </div>
          <div><strong style={{ color: '#ffffff', fontSize: '19px' }}>{teamData.length}</strong> teamleden</div>
          <div>{weekData.length} dagen in deze week</div>
          <div style={{ color: '#94a3b8', fontSize: '10px' }}>
            {weekData.length ? `${weekData[0].day} t.e.m. ${weekData[weekData.length - 1].day} ${monthName}` : ''}
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #cbd5e1', borderRadius: '9px', overflow: 'hidden' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
          <colgroup>
            <col style={{ width: '25%' }} />
            {weekData.map(({ day }) => <col key={day} style={{ width: `${75 / Math.max(weekData.length, 1)}%` }} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={{
                padding: '13px 15px',
                textAlign: 'left',
                color: '#ffffff',
                background: '#263445',
                borderRight: '1px solid #475569',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                Teamlid
              </th>
              {weekData.map(({ day, date }) => {
                const holidayName = holidays.get(dateKey(date));
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <th key={day} title={holidayName || undefined} style={{
                    padding: '9px 4px',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    color: holidayName ? '#92400e' : isWeekend ? '#0057a8' : '#ffffff',
                    background: holidayName ? '#fef3c7' : isWeekend ? '#dbeafe' : '#263445',
                    borderLeft: '1px solid #ffffff30',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.4px' }}>
                      {DAY_NAMES[date.getDay()]}
                    </div>
                    <div style={{ marginTop: '3px', fontSize: '22px', lineHeight: 1.1, fontWeight: 900 }}>
                      {day}
                    </div>
                    <div style={{ marginTop: '4px', minHeight: '11px', fontSize: '8px', fontWeight: 900, letterSpacing: '0.5px' }}>
                      {holidayName ? 'FEESTDAG' : isWeekend ? 'WEEKEND' : '\u00a0'}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {teamData.slice(0, 6).map((member, index) => (
              <tr key={member.user.id} style={{ background: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #e2e8f0',
                  borderRight: '1px solid #cbd5e1',
                  verticalAlign: 'middle',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      flexShrink: 0,
                      borderRadius: '8px',
                      background: '#ffdc00',
                      border: '1px solid #eab308',
                      color: '#17202b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '11px',
                    }}>
                      {member.user.avatar || member.user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#17202b', fontSize: '13px', fontWeight: 900, lineHeight: 1.25 }}>
                        {member.user.name}
                      </div>
                      <div style={{ marginTop: '3px', color: '#64748b', fontSize: '10px', fontWeight: 600 }}>
                        {member.user.role || 'Teamlid'}
                      </div>
                    </div>
                  </div>
                </td>
                {weekData.map(({ day, date }) => {
                  const shiftCode = member.planning?.finalDays?.[day] || '';
                  const colors = getShiftColors(shiftCode);
                  const holidayName = holidays.get(dateKey(date));
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <td key={day} title={holidayName || (isWeekend ? 'Weekend geen geplande koerdienst' : undefined)} style={{
                      padding: '7px 6px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      borderBottom: '1px solid #e2e8f0',
                      borderLeft: '1px solid #e2e8f0',
                      background: holidayName ? '#fffbeb' : isWeekend ? '#eaf4ff' : 'transparent',
                    }}>
                      {(isWeekend || holidayName) ? (
                        <div style={{
                          height: '43px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: holidayName ? '#b45309' : '#0072bc',
                          fontWeight: 900,
                          fontSize: '18px',
                          lineHeight: 1,
                        }}>
                          —
                        </div>
                      ) : (
                        <div style={{
                          height: '43px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '7px',
                          border: `1px solid ${shiftCode ? colors.border : '#e2e8f0'}`,
                          background: shiftCode ? colors.background : '#f8fafc',
                          color: shiftCode ? colors.foreground : '#94a3b8',
                          fontWeight: 900,
                          fontSize: '18px',
                          lineHeight: 1,
                        }}>
                          {shiftCode || '·'}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: '17px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ color: '#17202b', fontSize: '12px', fontWeight: 900, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
          Legenda dienstcodes
        </div>
        <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 600 }}>
          Blauw = weekend: geen geplande koerdienst&nbsp;&nbsp;·&nbsp;&nbsp;Amber = Belgische feestdag: geen geplande koerdienst
        </div>
      </div>

      <div style={{
        marginTop: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '7px',
      }}>
        {Object.entries(SHIFT_DEFINITIONS).map(([code, { shortLabel, description }]) => {
          const colors = getShiftColors(code);
          return (
            <div key={code} style={{
              minHeight: '48px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '6px 9px',
              border: '1px solid #e2e8f0',
              borderRadius: '7px',
              background: '#f8fafc',
            }}>
              <div style={{
                width: '30px',
                height: '30px',
                flexShrink: 0,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '12px',
                color: colors.foreground,
                background: colors.background,
                border: `1px solid ${colors.border}`,
              }}>
                {code}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#17202b', fontSize: '10px', fontWeight: 900 }}>{shortLabel}</div>
                <div style={{ color: '#64748b', fontSize: '9px', lineHeight: 1.2 }}>{description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '15px',
        paddingTop: '8px',
        borderTop: '3px solid #ffdc00',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        color: '#64748b',
        fontSize: '9px',
        fontWeight: 700,
      }}>
        <span>DEFINITIEVE TEAMPLANNING · {monthName.toUpperCase()} {year}</span>
        <span>WEEK {weekNumber}</span>
      </div>
    </div>
  );
};
