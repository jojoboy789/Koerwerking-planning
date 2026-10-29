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
  const add = (date: Date, label: string) => holidays.set(dateKey(date), label);
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

function getShiftColors(code: string): { background: string; foreground: string } {
  switch (code) {
    case 'V': return { background: '#d1fae5', foreground: '#065f46' };
    case 'D': return { background: '#fef3c7', foreground: '#92400e' };
    case 'L': return { background: '#f3e8ff', foreground: '#6b21a8' };
    case 'R': return { background: '#dbeafe', foreground: '#1d4ed8' };
    case 'X': return { background: '#e2e8f0', foreground: '#334155' };
    default: return { background: '#f8fafc', foreground: '#64748b' };
  }
}

export const PrintableWeekView: React.FC<PrintableWeekViewProps> = ({
  weekNumber,
  weekData,
  teamData,
  year,
  month,
}) => {
  const monthName = MONTH_NAMES[month - 1];
  const holidays = getBelgianHolidays(year);
  const pageStyle: React.CSSProperties = {
    width: '1100px',
    boxSizing: 'border-box',
    padding: '28px',
    backgroundColor: '#ffffff',
    color: '#17202b',
    fontFamily: 'Arial, Helvetica, sans-serif',
  };

  return (
    <div id={`printable-week-${weekNumber}`} style={pageStyle}>
      <div style={{
        backgroundColor: '#17202b',
        borderTop: '8px solid #ffdc00',
        padding: '22px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        marginBottom: '18px',
      }}>
        <div>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#ffdc00',
            color: '#17202b',
            padding: '5px 9px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            marginBottom: '9px',
          }}>
            Definitieve planning
          </div>
          <h1 style={{ margin: 0, color: '#ffffff', fontSize: '28px', lineHeight: 1.15, fontWeight: 800 }}>
            Week {weekNumber}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#cbd5e1', fontSize: '15px', fontWeight: 600 }}>
            {monthName} {year}
          </p>
        </div>
        <div style={{ textAlign: 'right', color: '#ffffff', fontSize: '11px', lineHeight: 1.7 }}>
          <div style={{ color: '#ffdc00', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
            Teamoverzicht
          </div>
          <div>{teamData.length} teamlid{teamData.length === 1 ? '' : 'en'}</div>
          <div>{weekData.length} dagen in deze week</div>
        </div>
      </div>

      <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '12px' }}>
          <colgroup>
              <col style={{ width: '25%' }} />
              {weekData.map(({ day }) => (
                <col
                  key={day}
                  style={{ width: `${75 / weekData.length}%` }}
                />
              ))}
            </colgroup>
          <thead>
            <tr>
              <th
                scope="col"
                style={{
                  padding: '12px 14px',
                  textAlign: 'left',
                  color: '#ffffff',
                  backgroundColor: '#17202b',
                  borderRight: '1px solid #475569',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                }}
              >
                Teamlid
              </th>
              {weekData.map(({ day, date }) => {
                const holidayName = holidays.get(dateKey(date));
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                return (
                  <th
                    key={day}
                    scope="col"
                    title={holidayName || undefined}
                    style={{
                      padding: '8px 4px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      boxSizing: 'border-box',
                      color: holidayName ? '#78350f' : isWeekend ? '#334155' : '#ffffff',
                      backgroundColor: holidayName ? '#fde68a' : isWeekend ? '#cbd5e1' : '#17202b',
                      borderLeft: '1px solid #ffffff30',
                    }}
                  >
                    <div style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}>
                        {DAY_NAMES[date.getDay()]}
                      </div>

                      <div
                        style={{
                          marginTop: '5px',
                          fontSize: '19px',
                          fontWeight: 800,
                          textAlign: 'center',
                          lineHeight: 1.3,
                          padding: '2px 0',
                        }}
                      >
                        {day}
                      </div>
                    {holidayName && (
                      <div style={{ marginTop: '3px', fontSize: '8px', lineHeight: 1.1, fontWeight: 800 }}>
                        FEESTDAG
                      </div>
                    )}
                    {!holidayName && isWeekend && (
                      <div style={{ marginTop: '3px', fontSize: '8px', fontWeight: 700 }}>WEEKEND</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {teamData.map((member, index) => (
              <tr key={member.user.id} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                <td style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid #e2e8f0',
                  borderRight: '1px solid #cbd5e1',
                  boxSizing: 'border-box',
                  verticalAlign: 'middle',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      flexShrink: 0,
                      borderRadius: '7px',
                      backgroundColor: '#ffdc00',
                      border: '1px solid #eab308',
                      color: '#17202b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '10px',
                    }}>
                      {member.user.avatar || member.user.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#17202b', fontSize: '11px', fontWeight: 800, lineHeight: 1.3 }}>
                        {member.user.name}
                      </div>
                      <div style={{ marginTop: '2px', color: '#64748b', fontSize: '9px', lineHeight: 1.2 }}>
                        {member.user.role || 'Teamlid'}
                      </div>
                    </div>
                  </div>
                </td>
                {weekData.map(({ day, date }) => {
                  const shiftCode = member.planning?.finalDays?.[day] || member.planning?.days?.[day] || '';
                  const colors = getShiftColors(shiftCode);
                  const holidayName = holidays.get(dateKey(date));
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                   
                  <td
                    key={day}
                    title={holidayName || undefined}
                    style={{
                      padding: '5px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      borderBottom: '1px solid #e2e8f0',
                      borderLeft: '1px solid #e2e8f0',
                      backgroundColor: holidayName
                        ? '#fffbeb'
                        : isWeekend
                          ? '#f1f5f9'
                          : 'transparent',
                    }}
                  >
                    <span
                      style={{
                        width: '100%',
                        height: '36px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: 1,
                        padding: 0,
                        margin: '0 auto',
                        borderRadius: '6px',
                        border: `1px solid ${shiftCode ? colors.background : '#e2e8f0'}`,
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        fontWeight: 700,
                        fontSize: '15px',
                      }}
                    >
                      {shiftCode || ''}
                    </span>
                  </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <h2 style={{
          margin: 0,
          color: '#17202b',
          fontSize: '12px',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
        }}>
          Legenda dienstcodes
        </h2>
        <div style={{ color: '#64748b', fontSize: '9px' }}>
          Geel = Belgische feestdag · Grijs = weekend
        </div>
      </div>

      <div style={{
        marginTop: '9px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: '8px',
      }}>
        {Object.entries(SHIFT_DEFINITIONS).map(([code, { shortLabel, description }]) => {
          const colors = getShiftColors(code);
          return (
            <div
              key={code}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '9px',
                padding: '8px 10px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div style={{
                width: '27px',
                height: '27px',
                flexShrink: 0,
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '11px',
                color: colors.foreground,
                backgroundColor: colors.background,
                border: `1px solid ${colors.background}`,
              }}>
                {code}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#17202b', fontSize: '10px', fontWeight: 800 }}>{shortLabel}</div>
                <div style={{ color: '#64748b', fontSize: '9px', lineHeight: 1.25 }}>{description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '18px',
        paddingTop: '9px',
        borderTop: '2px solid #ffdc00',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '12px',
        color: '#64748b',
        fontSize: '9px',
      }}>
        <span>Definitieve teamplanning · {monthName} {year}</span>
        <span>Week {weekNumber}</span>
      </div>
    </div>
  );
};
