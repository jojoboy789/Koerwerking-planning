import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Bus, CalendarDays, Check, ClipboardList, Clock3, Plus,
  RefreshCw, Save, Trash2, Droplets, Wrench, Sparkles, Loader2, Download
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../services/api';

type OCSlide = { id: string; title: string; dated: boolean; html: string; updated_at?: string };
type ExtraItem = { id: string; text: string };
type KoerDienstRecord = {
  date: string;
  wasbussen: string;
  extra: ExtraItem[];
  updatedAt?: string | null;
  updatedBy?: string | null;
};
type PutAssignment = { put: string; bus: string; description: string };
type TransportTask = { bus: string; description: string; glazing: boolean; keuring: boolean; extra: boolean };

const localDateValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const dateLabel = (value: string) => {
  if (!value) return '';
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('nl-BE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
};
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function getParagraphTexts(html: string): string[] {
  if (!html || typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const paragraphs = Array.from(doc.body.querySelectorAll('p'));
  return (paragraphs.length ? paragraphs : [doc.body]).map((p) => (p.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Haalt P12 t.e.m. P20 uit de aparte P-rubrieken. SPARE en andere rubrieken tellen niet mee. */
function extractPutAssignments(html: string): PutAssignment[] {
  const assignments: PutAssignment[] = [];
  for (const text of getParagraphTexts(html)) {
    const match = text.match(/\b(P1[2-9]|P20)\s*:\s*(.*)/i);
    if (!match) continue;
    const put = match[1].toUpperCase();
    const content = match[2];
    const busMatch = content.match(/\b(\d{4})\b/);
    if (!busMatch) continue;
    const bus = busMatch[1];
    const afterBus = content.slice((busMatch.index || 0) + bus.length).trim();
    const description = (afterBus.match(/^\[([^\]]+)\]/)?.[1] || afterBus.replace(/^[:\-–]\s*/, '')).trim();
    assignments.push({ put, bus, description });
  }
  return assignments;
}

/** Alleen de expliciete rubriek Transport door Koer wordt verwerkt. */
function extractTransportTasks(html: string): TransportTask[] {
  const paragraphs = getParagraphTexts(html);
  const markerIndex = paragraphs.findIndex((text) => /Transport\s+door\s+Koer\s*:/i.test(text));
  if (markerIndex < 0) return [];

  const section = paragraphs[markerIndex].replace(/^.*?Transport\s+door\s+Koer\s*:\s*/i, '');
  const tasks: TransportTask[] = [];
  const taskPattern = /\b(\d{4})\b\s*(?:\[([^\]]*)\])?/g;
  let match: RegExpExecArray | null;
  while ((match = taskPattern.exec(section)) !== null) {
    const bus = match[1];
    const description = (match[2] || section.slice(match.index + match[0].length).split(/\s*(?:&&|&{1}|\b\d{4}\b)/)[0] || '').replace(/\s+/g, ' ').trim();
    const lower = description.toLowerCase();
    const glazing = /glazing|ruiten|glas\b/.test(lower);
    const keuring = /keuring|keuringsrit|keuren/.test(lower);
    const extra = /testrit|test\s*rit|proefrit/.test(lower) || (!glazing && !keuring);
    tasks.push({ bus, description, glazing, keuring, extra });
  }
  return tasks.filter((task, index, list) => list.findIndex((item) => item.bus === task.bus) === index);
}

const Card: React.FC<{ title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode; accent?: string }> =
({ title, subtitle, icon: Icon, children, accent = 'bg-[#ffdc00]' }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} text-[#17202b]`}><Icon className="h-5 w-5" /></div>
      <div><h2 className="font-extrabold text-[#17202b]">{title}</h2><p className="text-xs text-slate-500">{subtitle}</p></div>
    </div>
    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

export const KoerdienstView: React.FC = () => {
  const [date, setDate] = useState(localDateValue);
  const [slides, setSlides] = useState<OCSlide[]>([]);
  const [record, setRecord] = useState<KoerDienstRecord>({ date: localDateValue(), wasbussen: '', extra: [] });
  const [newExtra, setNewExtra] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const authHeaders = useCallback((): HeadersInit => {
    const token = api.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const [planningResponse, recordResponse] = await Promise.all([
        fetch('/api/oc-planning', { headers: authHeaders(), cache: 'no-store' }),
        fetch(`/api/koerdienst/${encodeURIComponent(date)}`, { headers: authHeaders(), cache: 'no-store' }),
      ]);
      const planningData = await planningResponse.json();
      const recordData = await recordResponse.json();
      if (!planningResponse.ok) throw new Error(planningData.error || 'OC Planning kon niet worden opgehaald.');
      if (!recordResponse.ok) throw new Error(recordData.error || 'De koerdienstfiche kon niet worden geladen.');
      setSlides(Array.isArray(planningData.slides) ? planningData.slides : []);
      setRecord(recordData.record || { date, wasbussen: '', extra: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een onverwachte fout opgetreden.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authHeaders, date]);

  useEffect(() => { void load(); }, [load]);

  const selectedSlide = useMemo(() => {
    const [year, month, day] = date.split('-');
    const dayMonth = `${day}/${month}`;
    return slides.find((slide) => slide.dated && (
      slide.title?.includes(dayMonth) ||
      new RegExp(`\\b${escapeRegExp(dayMonth)}\\b`).test(slide.html || '')
    ));
  }, [slides, date]);

  const putAssignments = useMemo(() => extractPutAssignments(selectedSlide?.html || ''), [selectedSlide]);
  const transportTasks = useMemo(() => extractTransportTasks(selectedSlide?.html || ''), [selectedSlide]);
  const glazingTasks = transportTasks.filter((task) => task.glazing);
  const keuringTasks = transportTasks.filter((task) => task.keuring);
  const automaticExtraTasks = transportTasks.filter((task) => task.extra);

  const addExtra = () => {
    const text = newExtra.trim();
    if (!text) return;
    setRecord((current) => ({ ...current, extra: [...current.extra, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text }] }));
    setNewExtra('');
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/koerdienst/${encodeURIComponent(date)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ wasbussen: record.wasbussen, extra: record.extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Opslaan is mislukt.');
      setRecord(data.record);
      setNotice('De koerdienstfiche is opgeslagen en gedeeld met alle gebruikers.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opslaan is mislukt.');
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = () => {
    // A5 liggend: één compacte, afdrukklare werkfiche.
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 7;
    const gap = 6;
    const colWidth = (pageWidth - margin * 2 - gap) / 2;
    const leftX = margin;
    const rightX = margin + colWidth + gap;
    const bottom = pageHeight - 6;

    const header = () => {
      pdf.setFillColor(23, 32, 43);
      pdf.roundedRect(margin, 5, pageWidth - margin * 2, 19, 2, 2, 'F');
      pdf.setFillColor(255, 220, 0);
      pdf.roundedRect(margin + 3, 8, 1.6, 13, 0.8, 0.8, 'F');
      pdf.setTextColor(255, 220, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('DAGELIJKSE KOERWERKING', margin + 8, 10.5);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(15);
      pdf.text('KOERDIENST UITVOEREN', margin + 8, 17.2);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(225, 231, 239);
      pdf.text(dateLabel(date), pageWidth - margin - 4, 15, { align: 'right' });
    };

    const section = (x: number, y: number, width: number, title: string) => {
      pdf.setFillColor(23, 32, 43);
      pdf.roundedRect(x, y, width, 6, 1.2, 1.2, 'F');
      pdf.setTextColor(255, 220, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7.2);
      pdf.text(title.toUpperCase(), x + 2.5, y + 4.1);
      return y + 8;
    };

    const compactRow = (x: number, y: number, width: number, label: string, value: string, index: number) => {
      if (index % 2 === 0) {
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(x, y - 3.2, width, 5.2, 0.8, 0.8, 'F');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(23, 32, 43);
      pdf.text(label, x + 2, y);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      const available = width - Math.min(34, pdf.getTextWidth(label) + 5) - 3;
      const lines = pdf.splitTextToSize(value || '-', Math.max(15, available));
      pdf.text(lines.slice(0, 1), x + Math.min(34, pdf.getTextWidth(label) + 5), y);
      return y + 5.4;
    };

    const writingLines = (x: number, y: number, width: number, count: number, label?: string) => {
      if (label) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.2);
        pdf.setTextColor(100, 116, 139);
        pdf.text(label, x + 1, y);
        y += 2.5;
      }
      pdf.setDrawColor(190, 199, 210);
      for (let i = 0; i < count; i++) {
        y += 5.2;
        pdf.line(x + 1, y, x + width - 1, y);
      }
      return y + 2;
    };

    header();
    let leftY = 28;
    let rightY = 28;

    // Linkerkolom: PUT, GLAZING en WASBUSSEN.
    leftY = section(leftX, leftY, colWidth, 'PUT · OC PLANNING');
    if (putAssignments.length) {
      putAssignments.forEach((item, index) => {
        leftY = compactRow(leftX, leftY, colWidth, `${item.put}  ${item.bus}`, item.description, index);
      });
    } else {
      leftY = compactRow(leftX, leftY, colWidth, '', 'Geen toegewezen bussen', 0);
    }

    leftY += 1;
    leftY = section(leftX, leftY, colWidth, 'GLAZING');
    if (glazingTasks.length) {
      glazingTasks.forEach((item, index) => {
        leftY = compactRow(leftX, leftY, colWidth, item.bus, item.description, index);
      });
    } else {
      leftY = compactRow(leftX, leftY, colWidth, '', 'Geen opdrachten', 0);
    }

    leftY += 1;
    leftY = section(leftX, leftY, colWidth, 'WASBUSSEN');
    const washRows = [
      { loop: '15.51', binnen: '9:38', buiten: '14:39' },
      { loop: '17.06', binnen: '9:46', buiten: '15:22' },
      { loop: '18.28', binnen: '9:26', buiten: '15:12' },
    ];
    let washBuses: string[] = ['', '', ''];
    try {
      const parsed = JSON.parse(record.wasbussen || '{}');
      if (Array.isArray(parsed.buses)) washBuses = [...parsed.buses, '', ''].slice(0, 3);
      else if (typeof parsed.bus === 'string') washBuses[0] = parsed.bus;
    } catch {
      if (record.wasbussen && !record.wasbussen.startsWith('{')) washBuses[0] = record.wasbussen;
    }
    pdf.setFillColor(235, 239, 244);
    pdf.roundedRect(leftX, leftY - 2.5, colWidth, 5, 0.8, 0.8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(6.2);
    pdf.setTextColor(71, 85, 105);
    pdf.text('LOOP', leftX + 2, leftY + 0.7);
    pdf.text('BUS', leftX + 23, leftY + 0.7);
    pdf.text('BINNEN', leftX + 54, leftY + 0.7);
    pdf.text('BUITEN', leftX + 74, leftY + 0.7);
    leftY += 6;
    washRows.forEach((item, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(245, 247, 250);
        pdf.roundedRect(leftX, leftY - 3.2, colWidth, 5.2, 0.8, 0.8, 'F');
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.setTextColor(23, 32, 43);
      pdf.text(item.loop, leftX + 2, leftY);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      pdf.text(String(washBuses[index] || '________'), leftX + 23, leftY);
      pdf.text(item.binnen, leftX + 54, leftY);
      pdf.text(item.buiten, leftX + 74, leftY);
      leftY += 5.4;
    });

    // Rechterkolom: KEURING en EXTRA, met schrijfruimte op papier.
    rightY = section(rightX, rightY, colWidth, 'KEURING');
    if (keuringTasks.length) {
      keuringTasks.forEach((item, index) => {
        rightY = compactRow(rightX, rightY, colWidth, item.bus, item.description, index);
      });
    } else {
      rightY = compactRow(rightX, rightY, colWidth, '', 'Geen opdrachten', 0);
    }
    rightY = writingLines(rightX, rightY + 1, colWidth, 3, 'AANVULLINGEN / NOTITIES');

    rightY += 1;
    rightY = section(rightX, rightY, colWidth, 'EXTRA');
    let extraIndex = 0;
    automaticExtraTasks.forEach((item) => {
      rightY = compactRow(rightX, rightY, colWidth, item.bus, item.description || 'Extra opdracht', extraIndex++);
    });
    record.extra.forEach((item) => {
      rightY = compactRow(rightX, rightY, colWidth, 'Manueel', item.text, extraIndex++);
    });
    if (!extraIndex) rightY = compactRow(rightX, rightY, colWidth, '', 'Geen extra opdrachten', 0);
    rightY = writingLines(rightX, rightY + 1, colWidth, 4, 'VRIJE EXTRA OPDRACHTEN / NOTITIES');

    // Kleine footer op hetzelfde A5-blad.
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, pageHeight - 4.5, pageWidth - margin, pageHeight - 4.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.8);
    pdf.setTextColor(100, 116, 139);
    pdf.text('KOERWERKING · INTERNE KOERDIENSTFICHE', margin, pageHeight - 2);
    pdf.text('A5 LIGGEND', pageWidth - margin, pageHeight - 2, { align: 'right' });

    // Indien er uitzonderlijk veel opdrachten zijn, blijft alles leesbaar op extra A5-pagina's.
    // De normale dagfiche is ontworpen om op één A5-landscape blad te passen.
    pdf.save(`Koerdienst-${date}-A5-liggend.pdf`);
  };

  const taskList = (items: TransportTask[], empty: string) => items.length ? (
    <div className="space-y-2">
      {items.map((task) => (
        <div key={task.bus} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-[#17202b] px-3 py-1.5 font-black tracking-wide text-white">{task.bus}</span>
            <span className="text-sm text-slate-700">{task.description || 'Geen bijkomende omschrijving'}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">OC Planning</span>
        </div>
      ))}
    </div>
  ) : <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">{empty}</p>;

  return (
    <main className="min-h-screen bg-[#f3f5f8] px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="relative overflow-hidden rounded-3xl bg-[#17202b] p-6 text-white shadow-xl sm:p-8">
          <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.05]" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-[#ffdc00]"><ClipboardList className="h-3.5 w-3.5" /> Dagelijkse koerwerking</div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Koerdienst <span className="text-[#ffdc00]">uitvoeren</span></h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Eén gedeelde fiche met de opdrachten uit OC Planning en de manuele aanvullingen.</p>
            </div>
            <label className="block min-w-48">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">Werkdatum</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-xl border border-white/15 bg-white px-3 py-3 font-bold text-[#17202b] outline-none focus:ring-2 focus:ring-[#ffdc00]" />
            </label>
          </div>
          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-300">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#ffdc00]" />{dateLabel(date)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={downloadPdf} disabled={loading || !date} className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-extrabold text-white transition hover:bg-white/20 disabled:opacity-50"><Download className="h-4 w-4 text-[#ffdc00]" /> Download PDF</button>
              <button type="button" onClick={() => void load()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg bg-[#ffdc00] px-3 py-2 font-extrabold text-[#17202b] disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Vernieuwen</button>
            </div>
          </div>
        </header>

        {error && <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><Check className="h-4 w-4" />{notice}</div>}

        {loading ? <div className="flex min-h-48 items-center justify-center gap-3 rounded-2xl bg-white text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" />Koerdienstfiche laden...</div> : <>
          <Card title="PUT" subtitle="Automatisch uit de P12 t.e.m. P20-rubrieken van OC Planning" icon={Bus}>
            {selectedSlide ? (putAssignments.length ? <div className="space-y-2">{putAssignments.map((item) => <div key={`${item.put}-${item.bus}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-3"><div className="flex items-center gap-3"><span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600">{item.put}</span><span className="rounded-lg bg-[#17202b] px-3 py-1.5 font-black tracking-wide text-white">{item.bus}</span><span className="text-sm text-slate-700">{item.description || 'Geen bijkomende omschrijving'}</span></div><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">OC Planning</span></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500">Geen toegewezen bussen gevonden bij P12 t.e.m. P20.</p>) : <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Geen dagplanning gevonden voor deze datum. Controleer of de datum in OC Planning beschikbaar is.</p>}
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="GLAZING" subtitle="Automatisch herkend in Transport door Koer" icon={Droplets} accent="bg-sky-100">
              {taskList(glazingTasks, 'Geen glazing-opdrachten herkend.')}
            </Card>
            <Card title="KEURING" subtitle="Automatisch herkend in Transport door Koer" icon={Wrench} accent="bg-amber-100">
              {taskList(keuringTasks, 'Geen keuringsopdrachten herkend.')}
            </Card>
          </div>

          <Card title="WASBUSSEN" subtitle="Vul voor elke loop zelf het busnummer in" icon={Sparkles} accent="bg-cyan-100">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#17202b] text-white">
                    <th className="px-4 py-3 font-bold">Loop</th>
                    <th className="px-4 py-3 font-bold">Bus</th>
                    <th className="px-4 py-3 font-bold">Binnen</th>
                    <th className="px-4 py-3 font-bold">Buiten</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { loop: '15.51', binnen: '9:38', buiten: '14:39' },
                    { loop: '17.06', binnen: '9:46', buiten: '15:22' },
                    { loop: '18.28', binnen: '9:26', buiten: '15:12' },
                  ].map((row, index) => (
                    <tr key={row.loop} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/80'}>
                      <td className="whitespace-nowrap px-4 py-3.5 font-extrabold text-[#17202b]">{row.loop}</td>
                      <td className="px-4 py-3.5">
                        <input
                          value={(() => {
                            try {
                              const parsed = JSON.parse(record.wasbussen || '{}');
                              if (Array.isArray(parsed.buses)) return parsed.buses[index] || '';
                              // Oude opgeslagen fiche: behoud het bestaande busnummer bij de eerste loop.
                              if (index === 0 && typeof parsed.bus === 'string') return parsed.bus;
                              if (index === 0 && !record.wasbussen.startsWith('{')) return record.wasbussen;
                              return '';
                            } catch {
                              return index === 0 ? record.wasbussen : '';
                            }
                          })()}
                          onChange={(event) => setRecord((current) => {
                            let buses = ['', '', ''];
                            try {
                              const parsed = JSON.parse(current.wasbussen || '{}');
                              if (Array.isArray(parsed.buses)) buses = [...parsed.buses, '', ''].slice(0, 3);
                              else if (typeof parsed.bus === 'string') buses[0] = parsed.bus;
                            } catch {
                              if (current.wasbussen && !current.wasbussen.startsWith('{')) buses[0] = current.wasbussen;
                            }
                            buses[index] = event.target.value;
                            return { ...current, wasbussen: JSON.stringify({ buses }) };
                          })}
                          maxLength={100}
                          placeholder="Busnummer invullen"
                          aria-label={`Busnummer wasbussen loop ${row.loop}`}
                          className="w-full max-w-48 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none transition focus:border-[#17202b] focus:bg-white focus:ring-2 focus:ring-[#ffdc00]/60"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-700">{row.binnen}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-700">{row.buiten}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-500">Vul bij elke loop afzonderlijk het busnummer in. De drie busnummers mogen verschillend zijn.</p>
          </Card>

          <Card title="EXTRA" subtitle="Automatische testritten uit Transport door Koer en manuele aanvullingen" icon={Plus} accent="bg-violet-100">
            {automaticExtraTasks.length > 0 && <div className="mb-4 space-y-2">{automaticExtraTasks.map((task) => <div key={`auto-${task.bus}`} className="flex flex-wrap items-center gap-3 rounded-xl bg-violet-50 px-3 py-3"><span className="rounded-lg bg-[#17202b] px-3 py-1.5 font-black text-white">{task.bus}</span><span className="text-sm text-slate-700">{task.description || 'Extra transportopdracht'}</span><span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-violet-700">OC Planning</span></div>)}</div>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={newExtra} onChange={(event) => setNewExtra(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addExtra(); } }} maxLength={500} placeholder="Omschrijving van extra opdracht..." className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-[#17202b] focus:bg-white focus:ring-2 focus:ring-[#ffdc00]/60" />
              <button type="button" onClick={addExtra} disabled={!newExtra.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#17202b] px-4 py-3 text-sm font-bold text-white disabled:opacity-40"><Plus className="h-4 w-4" /> Toevoegen</button>
            </div>
            {record.extra.length > 0 ? <div className="mt-3 space-y-2">{record.extra.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3"><span className="min-w-0 break-words text-sm text-slate-800">{item.text}</span><button type="button" onClick={() => setRecord((current) => ({ ...current, extra: current.extra.filter((entry) => entry.id !== item.id) }))} aria-label="Verwijder extra opdracht" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div>)}</div> : <p className="mt-3 text-sm text-slate-500">Nog geen extra opdrachten toegevoegd.</p>}
          </Card>

          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">{record.updatedAt ? <>Laatst opgeslagen door <strong>{record.updatedBy || 'een gebruiker'}</strong> · {new Date(record.updatedAt).toLocaleString('nl-BE')}</> : 'Nog niet opgeslagen voor deze datum.'}</p>
            <button type="button" onClick={() => void save()} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffdc00] px-6 py-3 text-sm font-black text-[#17202b] shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Opslaan...' : 'Fiche opslaan'}</button>
          </div>
        </>}
      </div>
    </main>
  );
};

export default KoerdienstView;
