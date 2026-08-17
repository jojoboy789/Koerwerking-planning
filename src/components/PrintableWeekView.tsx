import React from 'react';
import { TeamMemberOverview, SHIFT_DEFINITIONS } from '../types';

const DAY_NAMES = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];

interface PrintableWeekViewProps {
  weekNumber: number;
  year: number;
  month: number;
  weekData: Array<{ day: number; date: Date }>;
  teamData: TeamMemberOverview[];
}

export const PrintableWeekView: React.FC<PrintableWeekViewProps> = ({ weekNumber, weekData, teamData, year, month }) => {
  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
  const monthName = monthNames[month - 1];

  return (
    <div id={`printable-week-${weekNumber}`} style={{ backgroundColor: 'white', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>Week {weekNumber}</h1>
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#4b5563', marginBottom: '1.5rem' }}>{monthName} {year}</h2>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', fontSize: '0.875rem', textAlign: 'left', color: '#6b7280' }}>
          <thead style={{ fontSize: '0.75rem', color: '#374151', textTransform: 'uppercase', backgroundColor: '#f9fafb' }}>
            <tr>
              <th scope="col" style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold' }}>Teamlid</th>
              {weekData.map(({ day, date }) => (
                <th key={day} scope="col" style={{ padding: '0.75rem 1.5rem', textAlign: 'center', fontWeight: 'bold' }}>
                  {DAY_NAMES[date.getDay()]} <br /> {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamData.map(member => (
              <tr key={member.user.id} style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: '500', color: '#111827', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid #c7d2fe', marginRight: '0.75rem' }}>
                    {member.user.avatar || member.user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600' }}>{member.user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{member.user.role || 'Teamlid'}</div>
                  </div>
                </td>
                {weekData.map(({ day }) => {
                  const shiftCode = member.planning?.finalDays?.[day] || member.planning?.days?.[day] || '';

                  let bgColor = '#f3f4f6';
                  if (shiftCode === 'V') bgColor = '#dcfce7';
                  if (shiftCode === 'D') bgColor = '#fef9c3';
                  if (shiftCode === 'L') bgColor = '#dbeafe';
                  if (shiftCode === 'X') bgColor = '#d1d5db';

                  return (
                    <td key={day} style={{ padding: '1rem 1.5rem', textAlign: 'center', backgroundColor: bgColor }}>
                      <span style={{ fontWeight: 'bold', color: '#1f2937' }}>{shiftCode}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1rem' }}>Dienstcodes Legenda</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          {Object.entries(SHIFT_DEFINITIONS).map(([code, { shortLabel, description }]) => (
            <div key={code} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', marginRight: '0.75rem', backgroundColor: code === 'V' ? '#22c55e' : code === 'D' ? '#f59e0b' : code === 'L' ? '#3b82f6' : '#6b7280' }}>
                {code}
              </div>
              <div>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{shortLabel}</div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>{description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
