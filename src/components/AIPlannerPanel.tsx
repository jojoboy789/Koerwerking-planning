import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import {
  ArrowLeft,
  CalendarDays,
  CalendarRange,
  MessageCircle,
  Sparkles,
  WandSparkles,
  AlertTriangle,
  CheckCircle2,
  Send,
  Users,
  Clock3,
  ClipboardCheck,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import {
  generateAIPlanningProposal,
  type AIPlannerMember,
  type AIPlannerResult,
  type AIPlannerSpecialDay,
} from "../services/aiPlanningOptimizer";

interface AIPlannerPanelProps {
  members: AIPlannerMember[];
  year: number;
  month: number;
  specialDays?: AIPlannerSpecialDay[];
  canUse: boolean;
  onApplied?: () => Promise<void> | void;
  onBack: () => void;
  onMonthChange: (year: number, month: number) => void;
}

const MONTHS = [
  "Januari", "Februari", "Maart", "April", "Mei", "Juni",
  "Juli", "Augustus", "September", "Oktober", "November", "December",
];

function getISOWeek(date: Date): number {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil((((value.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("nl-BE", {
    weekday: "short", day: "2-digit", month: "long",
  });
}

export const AIPlannerPanel: React.FC<AIPlannerPanelProps> = ({
  members,
  year,
  month,
  specialDays = [],
  canUse,
  onApplied,
  onBack,
  onMonthChange,
}) => {
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [weekNumber, setWeekNumber] = useState<number>(() => getISOWeek(new Date(year, month - 1, 1)));
  const [proposal, setProposal] = useState<AIPlannerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatReply, setChatReply] = useState(
    "Hallo! Ik help je het AI-voorstel begrijpen. Genereer eerst een voorstel en bekijk daarna de resultaten per dag of week."
  );
  const [resultView, setResultView] = useState<"day" | "week" | "month">("week");
  const [selectedDay, setSelectedDay] = useState("");

  useEffect(() => {
    const firstWeek = getISOWeek(new Date(year, month - 1, 1));
    setWeekNumber(firstWeek);
    setProposal(null);
    setSelectedDay("");
  }, [year, month]);

  const weekOptions = useMemo(() => {
    const values = new Set<number>();
    const count = new Date(year, month, 0).getDate();
    for (let day = 1; day <= count; day += 1) values.add(getISOWeek(new Date(year, month - 1, day)));
    return Array.from(values);
  }, [year, month]);

  const resultDates = useMemo(() => {
    if (!proposal) return [];
    return Array.from(new Set([
      ...proposal.assignments.map((item) => item.date),
      ...proposal.uncovered.map((item) => item.date),
      ...proposal.skippedDates.map((item) => item.date),
    ])).sort();
  }, [proposal]);

  const visibleDates = useMemo(() => {
    if (resultView === "day") return selectedDay ? resultDates.filter((date) => date === selectedDay) : resultDates.slice(0, 1);
    if (resultView === "week") {
      return resultDates.filter((date) => {
        const [y, m, d] = date.split("-").map(Number);
        return getISOWeek(new Date(y, m - 1, d)) === weekNumber;
      });
    }
    return resultDates;
  }, [resultDates, resultView, selectedDay, weekNumber]);

  if (!canUse) return null;

  const generate = () => {
    if (!canUse || busy || members.length === 0) return;
    setBusy(true);
    try {
      const result = generateAIPlanningProposal({
        members, year, month, period,
        weekNumber: period === "week" ? weekNumber : undefined,
        specialDays,
      });
      setProposal(result);
      setResultView(period);
      setSelectedDay(result.assignments[0]?.date || result.uncovered[0]?.date || "");
      setChatReply(
        `Voorstel klaar: ${result.stats.assignments} diensten verdeeld over ${result.stats.uniqueMembers} teamleden. Er zijn ${result.uncovered.length} openstaande diensten en ${result.restDayWarnings.length} rustdagwaarschuwingen.`
      );
    } catch (error) {
      console.error("AI-planningsvoorstel maken mislukt:", error);
      setChatReply("Het voorstel kon niet worden gemaakt. Controleer de gegevens en probeer opnieuw.");
    } finally {
      setBusy(false);
    }
  };

  const applyProposal = async () => {
    if (!proposal || busy || !canUse) return;
    const days = Array.from(new Set([
      ...proposal.assignments.map((item) => item.day),
      ...proposal.uncovered.map((item) => Number(item.date.slice(-2))),
    ])).sort((a, b) => a - b);
    if (days.length === 0) return;
    const restWarningText = proposal.restDayWarnings.length
      ? `\\n\\nLET OP: ${proposal.restDayWarnings.length} rustdag(en) moeten mogelijk verplaatst worden. Controleer de waarschuwingen op de AI-pagina.`
      : "";
    const confirmed = window.confirm(
      `AI-planning toepassen voor ${period === "week" ? `week ${weekNumber}` : `${MONTHS[month - 1]} ${year}`}?${restWarningText}\\n\\nAlleen de eerste keuze wordt aangepast binnen deze periode. Tweede en derde keuzes blijven behouden. Teamleden zonder dienst krijgen X. De planning wordt NIET definitief gemaakt.`
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const result = await api.applyAIPlanningProposal(
        year, month,
        proposal.assignments.map(({ memberId, day, shift }) => ({ memberId, day, shift })),
        days
      );
      setChatReply(result.message);
      setProposal(null);
      await onApplied?.();
    } catch (error) {
      setChatReply(error instanceof Error ? error.message : "AI-planning toepassen is mislukt.");
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async () => {
    const question = chatInput.trim();
    if (!question || chatBusy) return;
    setChatInput("");
    setChatBusy(true);
    try {
      const token = api.getAuthToken();
      const response = await fetch("/api/ai-planner/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: question, year, month }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `AI-verzoek mislukt (${response.status}).`);
      setChatReply(String(data.reply || "De AI gaf geen antwoord terug."));
    } catch (error) {
      setChatReply(error instanceof Error ? error.message : "De AI-assistent is momenteel niet bereikbaar.");
    } finally {
      setChatBusy(false);
    }
  };

  const countForDate = (date: string) => ({
    V: proposal?.assignments.filter((item) => item.date === date && item.shift === "V").length || 0,
    D: proposal?.assignments.filter((item) => item.date === date && item.shift === "D").length || 0,
    L: proposal?.assignments.filter((item) => item.date === date && item.shift === "L").length || 0,
    open: proposal?.uncovered.filter((item) => item.date === date).length || 0,
  });

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-6 px-3 py-4 sm:px-6 sm:py-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50" aria-label="Terug naar teamoverzicht">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffdc00] text-[#17202b]"><Sparkles className="h-4 w-4" /></span>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">AI-planning</h1>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">Voorstelmodus</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Maak, controleer en pas een voorstel toe voor {MONTHS[month - 1]} {year}.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 shadow-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
            <span className="sr-only">Kies maand</span>
            <select
              aria-label="Kies maand voor AI-planning"
              value={month}
              onChange={(event) => onMonthChange(year, Number(event.target.value))}
              className="min-w-0 bg-transparent text-sm font-bold text-slate-900 outline-none"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index + 1}>{name}</option>
              ))}
            </select>
            <select
              aria-label="Kies jaar voor AI-planning"
              value={year}
              onChange={(event) => onMonthChange(Number(event.target.value), month)}
              className="bg-transparent text-sm font-bold text-slate-900 outline-none"
            >
              {Array.from({ length: 9 }, (_, index) => year - 4 + index).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-sm">
            <span className="font-bold text-slate-900">{members.length}</span> teamleden beschikbaar
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <h2 className="text-sm font-extrabold text-blue-950">Jij blijft aan het stuur</h2>
            <p className="mt-1 text-xs leading-relaxed text-blue-900">
              De AI maakt alleen een voorstel. Pas na jouw bevestiging worden de eerste keuzes aangepast voor de gekozen week of maand. Tweede en derde keuzes blijven behouden. De AI maakt de planning nooit definitief. Dat doe je nadien zelf via <strong>Planning Afronden</strong> in Teamoverzicht.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <WandSparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-extrabold text-slate-900">1. Genereer een voorstel</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Periode
              <span className="relative mt-1.5 block">
                <select value={period} onChange={(event) => setPeriod(event.target.value as "week" | "month")} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100">
                  <option value="week">Eén week</option>
                  <option value="month">Volledige maand</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              </span>
            </label>
            {period === "week" ? (
              <label className="text-xs font-bold text-slate-600">
                ISO-week
                <span className="relative mt-1.5 block">
                  <select value={weekNumber} onChange={(event) => setWeekNumber(Number(event.target.value))} className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-9 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100">
                    {weekOptions.map((week) => <option key={week} value={week}>Week {week}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
                </span>
              </label>
            ) : (
              <div className="flex items-end">
                <div className="flex w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-700"><CalendarDays className="h-4 w-4" />{MONTHS[month - 1]} {year}</div>
              </div>
            )}
          </div>
          <button type="button" onClick={generate} disabled={busy || members.length === 0} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ffdc00] px-4 py-3 text-sm font-extrabold text-[#17202b] shadow-sm transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50">
            <WandSparkles className="h-4 w-4" />{busy ? "Voorstel wordt berekend..." : "Genereer AI-voorstel"}
          </button>
          {members.length === 0 && <p className="mt-2 text-xs text-rose-600">Er zijn geen teamleden beschikbaar om in te plannen.</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-slate-700" /><h2 className="text-base font-extrabold text-slate-900">2. Wat gebeurt er daarna?</h2></div>
          <ol className="space-y-3 text-xs text-slate-600">
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-800">1</span><span><strong className="text-slate-900">Bekijk de resultaten.</strong><br />Controleer per dag welke medewerker V, D of L krijgt.</span></li>
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-800">2</span><span><strong className="text-slate-900">Los waarschuwingen op.</strong><br />Controleer open diensten en eventuele opmerkingen van de AI.</span></li>
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-800">3</span><span><strong className="text-slate-900">Pas bewust toe.</strong><br />Alleen na jouw bevestiging worden de eerste keuzes bijgewerkt.</span></li>
            <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-slate-800">4</span><span><strong className="text-slate-900">Rond manueel af.</strong><br />Ga terug naar Teamoverzicht en klik zelf op Planning Afronden.</span></li>
          </ol>
        </div>
      </section>

      {proposal && (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">3. Resultaten van het voorstel</h2>
              <p className="mt-1 text-xs text-slate-500">{period === "week" ? `Week ${weekNumber}` : `${MONTHS[month - 1]} ${year}`} · nog niet toegepast</p>
            </div>
            <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">Wacht op jouw controle</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {[
              { label: "Toegewezen diensten", value: proposal.stats.assignments, icon: Clock3 },
              { label: "Eerste keuze", value: proposal.stats.firstChoices, icon: CheckCircle2 },
              { label: "Tweede / derde keuze", value: proposal.stats.secondChoices + proposal.stats.thirdChoices, icon: Users },
              { label: "Open diensten", value: proposal.uncovered.length, icon: AlertTriangle },
              { label: "Teamleden ingezet", value: proposal.stats.uniqueMembers, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Icon className="h-4 w-4 text-slate-400" />
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          {proposal.restDayWarnings.length > 0 && (
            <div className="rounded-2xl border border-orange-300 bg-orange-50 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-700" />
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-orange-950">
                    Rustdag mogelijk verplaatsen ({proposal.restDayWarnings.length})
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-orange-900">
                    De AI heeft onderstaande teamleden op een dienst gezet terwijl hun eerste keuze een rustdag (R) is. De planner moet zelf beoordelen of de rustdag kan of moet verschuiven. De AI verplaatst de rustdag niet automatisch.
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {proposal.restDayWarnings.map((warning) => (
                  <div key={`${warning.memberId}-${warning.date}`} className="rounded-xl border border-orange-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">{warning.memberName}</p>
                        <p className="mt-0.5 text-[11px] text-slate-600">{formatDate(warning.date)} · Dienst {warning.assignedShift} · {warning.preference}</p>
                      </div>
                      <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-extrabold text-orange-900">Rustdag controleren</span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-orange-900">{warning.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {proposal.uncovered.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-sm font-extrabold text-amber-950"><AlertTriangle className="h-5 w-5" />Er zijn openstaande diensten</div>
              <p className="mt-1 text-xs text-amber-900">Voor deze diensten kon de AI geen geschikte medewerker vinden. Controleer ze vóór je toepast.</p>
              <div className="mt-3 flex flex-wrap gap-2">{proposal.uncovered.map((item) => <span key={`${item.date}-${item.shift}`} className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-900">{formatDate(item.date)} · {item.shift}</span>)}</div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-5 w-5" />Alle vereiste V-, D- en L-diensten konden worden ingevuld.</div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="text-base font-extrabold text-slate-900">Dag-, week- en maandoverzicht</h3><p className="mt-1 text-xs text-slate-500">Bekijk de voorgestelde bezetting op het detailniveau dat je nodig hebt.</p></div>
              <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                {(["day", "week", "month"] as const).map((view) => <button key={view} type="button" onClick={() => setResultView(view)} className={`rounded-lg px-3 py-2 text-xs font-bold transition ${resultView === view ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>{view === "day" ? "Dag" : view === "week" ? "Week" : "Maand"}</button>)}
              </div>
            </div>

            {resultView === "day" && (
              <label className="mt-4 block max-w-sm text-xs font-bold text-slate-600">Kies een dag
                <select value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900">
                  {resultDates.map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}
                </select>
              </label>
            )}
            {resultView === "week" && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-600"><CalendarRange className="h-4 w-4" />Week {weekNumber} · {visibleDates.length} dagen met resultaten</div>
            )}
            {resultView === "month" && <div className="mt-4 flex items-center gap-2 text-xs text-slate-600"><CalendarDays className="h-4 w-4" />{MONTHS[month - 1]} {year} · {visibleDates.length} dagen met resultaten</div>}

            <div className="mt-4 space-y-3">
              {visibleDates.map((date) => {
                const totals = countForDate(date);
                const assignments = proposal.assignments.filter((item) => item.date === date);
                const uncovered = proposal.uncovered.filter((item) => item.date === date);
                return (
                  <article key={date} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                      <h4 className="text-sm font-extrabold capitalize text-slate-900">{formatDate(date)}</h4>
                      <div className="flex gap-1.5 text-[10px] font-extrabold">
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-emerald-800">V {totals.V}</span>
                        <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">D {totals.D}</span>
                        <span className="rounded-md bg-indigo-100 px-2 py-1 text-indigo-800">L {totals.L}</span>
                        {totals.open > 0 && <span className="rounded-md bg-rose-100 px-2 py-1 text-rose-800">Open {totals.open}</span>}
                      </div>
                    </div>
                    {assignments.length ? (
                      <div className="divide-y divide-slate-100">
                        {assignments.map((item) => (
                          <div key={`${item.memberId}-${item.shift}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                            <div><p className="text-sm font-bold text-slate-900">{item.memberName}</p><p className="text-[11px] text-slate-500">{item.preference}</p></div>
                            <span className={`flex h-9 w-10 items-center justify-center rounded-lg text-sm font-black ${item.shift === "V" ? "bg-emerald-100 text-emerald-800" : item.shift === "D" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"}`}>{item.shift}</span>
                          </div>
                        ))}
                      </div>
                    ) : <p className="px-4 py-3 text-xs text-slate-500">Geen toewijzingen voor deze dag.</p>}
                    {uncovered.length > 0 && <div className="border-t border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-900">Open: {uncovered.map((item) => item.shift).join(", ")}</div>}
                  </article>
                );
              })}
              {visibleDates.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Geen resultaten voor deze weergave.</p>}
            </div>
          </div>

          {proposal.skippedDates.length > 0 && (
            <details className="rounded-2xl border border-slate-200 bg-white p-4">
              <summary className="cursor-pointer text-sm font-bold text-slate-800">Overgeslagen dagen ({proposal.skippedDates.length})</summary>
              <ul className="mt-3 space-y-1 text-xs text-slate-600">{proposal.skippedDates.map((item) => <li key={`${item.date}-${item.reason}`}>{formatDate(item.date)}: {item.reason}</li>)}</ul>
            </details>
          )}

          {proposal.notes.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-extrabold text-slate-900">Opmerkingen van de AI</h3>
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-600">{proposal.notes.map((note) => <li key={note}>• {note}</li>)}</ul>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
            <h3 className="text-sm font-extrabold text-amber-950">4. Voorstel toepassen</h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-900">Bij toepassen worden de eerste keuzes in de geselecteerde periode vervangen door het AI-resultaat. Teamleden zonder toegewezen dienst krijgen X. Tweede en derde keuzes blijven ongewijzigd. Dit maakt de planning niet definitief.</p>
            <button type="button" onClick={() => void applyProposal()} disabled={busy || proposal.assignments.length === 0} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#17202b] px-4 py-3 text-sm font-extrabold text-[#ffdc00] shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle2 className="h-4 w-4" />{busy ? "Bezig met toepassen..." : "Ik heb gecontroleerd, pas AI-planning toe"}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-slate-700" /><h2 className="text-base font-extrabold text-slate-900">Vraag het aan de AI-assistent</h2></div>
        <div className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{chatReply}</div>
        <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); void sendChat(); }}>
          <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Bijv. waarom zijn er open diensten?" disabled={chatBusy} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100" />
          <button type="submit" disabled={chatBusy || !chatInput.trim()} aria-label="Bericht versturen" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#17202b] text-white transition hover:bg-slate-700 disabled:opacity-50"><Send className="h-4 w-4 text-[#ffdc00]" /></button>
        </form>
      </section>
    </main>
  );
};

export default AIPlannerPanel;
