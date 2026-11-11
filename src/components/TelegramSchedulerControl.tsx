import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Loader2, Plus, Trash2, Sunrise, Sun, Moon, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { TelegramBlockedRun, TelegramScheduledTime } from '../services/api';

const TIMES: Array<{ value: TelegramScheduledTime; label: string; subtitle: string; Icon: React.ElementType }> = [
  { value: '04:50', label: '04:50', subtitle: 'Ochtend', Icon: Sunrise },
  { value: '12:30', label: '12:30', subtitle: 'Middag', Icon: Sun },
  { value: '21:00', label: '21:00', subtitle: 'Avond', Icon: Moon },
];

function getBelgianToday(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('nl-BE', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Brussels',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export const TelegramSchedulerControl: React.FC = () => {
  const [date, setDate] = useState(getBelgianToday);
  const [time, setTime] = useState<TelegramScheduledTime>('12:30');
  const [runs, setRuns] = useState<TelegramBlockedRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getTelegramBlockedRuns();
      setRuns(result.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blokkeringen konden niet worden geladen.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const addBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!date || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.addTelegramBlockedRun(date, time);
      setRuns(result.runs || []);
      setSuccess(result.message || 'Verzendmoment geblokkeerd.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blokkering kon niet worden toegevoegd.');
    } finally {
      setSaving(false);
    }
  };

  const removeBlock = async (runId: string) => {
    setDeletingId(runId);
    setError(null);
    setSuccess(null);
    try {
      const result = await api.deleteTelegramBlockedRun(runId);
      setRuns(result.runs || []);
      setSuccess(result.message || 'Blokkering verwijderd.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blokkering kon niet worden verwijderd.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-xl font-sans space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700"><CalendarDays className="h-5 w-5" /></div>
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-900">Telegram Scheduler Control</h3>
            <p className="mt-1 text-xs text-slate-500">Blokkeer een automatische verzending op een specifieke datum.</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> FIRESTORE</span>
      </div>

      <form onSubmit={addBlock} className="space-y-4">
        <div>
          <label htmlFor="telegram-block-date" className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Datum kiezen</label>
          <input id="telegram-block-date" type="date" value={date} min={getBelgianToday()} onChange={event => setDate(event.target.value)} required className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none focus:border-cyan-500" />
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Verzendmoment blokkeren</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TIMES.map(({ value, label, subtitle, Icon }) => (
              <button key={value} type="button" onClick={() => setTime(value)} aria-pressed={time === value} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${time === value ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100' : 'border-slate-200 bg-white hover:border-cyan-300'}`}>
                <Icon className={`h-5 w-5 ${time === value ? 'text-cyan-700' : 'text-slate-400'}`} />
                <span><span className="block text-sm font-bold text-slate-800">{label}</span><span className="block text-[10px] text-slate-500">{subtitle}</span></span>
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={saving || !date} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} BLOKKERING TOEVOEGEN
        </button>
      </form>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">{success}</p>}

      <div className="border-t border-slate-100 pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">Geblokkeerde momenten</h4><p className="mt-1 text-[10px] text-slate-500">Tijdzone: Europe/Brussels</p></div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> VERVERSEN</button>
        </div>
        {loading ? <div className="flex items-center gap-2 py-5 text-xs text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Blokkeringen laden…</div> : runs.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">Er zijn nog geen blokkeringen.</div> : (
          <div className="space-y-2">
            {runs.map(run => (
              <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <div className="flex items-center gap-3"><div className="rounded-lg bg-white p-2 text-amber-700"><Clock3 className="h-4 w-4" /></div><div><p className="text-xs font-bold text-slate-800">{formatDate(run.date)}</p><p className="mt-0.5 text-[10px] text-slate-600">{run.time} · Automatische verzending overgeslagen</p></div></div>
                <button type="button" onClick={() => void removeBlock(run.id)} disabled={deletingId === run.id} title="Blokkering verwijderen" className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">{deletingId === run.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} VERWIJDER</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
