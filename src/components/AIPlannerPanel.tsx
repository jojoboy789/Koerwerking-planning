import React, { useMemo, useState } from "react";
import { api } from "../services/api";
import {
  CalendarDays,
  ChevronDown,
  MessageCircle,
  Sparkles,
  WandSparkles,
  AlertTriangle,
  CheckCircle2,
  X,
  Send,
  Bot,
  Minus,
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

export const AIPlannerPanel: React.FC<AIPlannerPanelProps> = ({
  members,
  year,
  month,
  specialDays = [],
  canUse,
  onApplied,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [weekNumber, setWeekNumber] = useState<number>(() => getISOWeek(new Date(year, month - 1, 1)));
  const [proposal, setProposal] = useState<AIPlannerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatReply, setChatReply] = useState(
    "Hallo! Ik help je met een voorstel voor de koerplanning. Kies hieronder een week of maand, of stel een vraag."
  );

  const weekOptions = useMemo(() => {
    const values = new Set<number>();
    const count = new Date(year, month, 0).getDate();
    for (let day = 1; day <= count; day += 1) {
      values.add(getISOWeek(new Date(year, month - 1, day)));
    }
    return Array.from(values);
  }, [year, month]);

  // Geen knop en geen chatvenster renderen voor gewone gebruikers.
  if (!canUse) return null;

  const generate = () => {
    if (!canUse || busy || members.length === 0) return;
    setBusy(true);
    try {
      const result = generateAIPlanningProposal({
        members,
        year,
        month,
        period,
        weekNumber: period === "week" ? weekNumber : undefined,
        specialDays,
      });
      setProposal(result);
      setChatReply(
        `Voorstel klaar: ${result.stats.assignments} diensten verdeeld over ${result.stats.uniqueMembers} teamleden. Er zijn ${result.uncovered.length} openstaande diensten.`
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
    const confirmed = window.confirm(
      `AI-planning toepassen voor ${MONTHS[month - 1]} ${year}?\n\nDe eerste keuze wordt vervangen. Tweede en derde keuzes blijven behouden. Teamleden zonder dienst krijgen X. De planning wordt NIET definitief gemaakt.`
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
      setChatReply(error instanceof Error ? error.message : 'AI-planning toepassen is mislukt.');
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
      if (!response.ok) {
        throw new Error(data.error || `AI-verzoek mislukt (${response.status}).`);
      }

      setChatReply(String(data.reply || "De AI gaf geen antwoord terug."));
    } catch (error) {
      console.error("AI Koerplanner-chat mislukt:", error);
      setChatReply(
        error instanceof Error
          ? error.message
          : "De AI-assistent is momenteel niet bereikbaar. Probeer later opnieuw."
      );
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {isOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="AI Koerplanner"
          className="flex max-h-[min(82vh,780px)] w-[min(94vw,680px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 bg-[#17202b] px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffdc00] text-[#17202b]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-extrabold">AI Koerplanner</h3>
                <p className="truncate text-[11px] text-slate-300">
                  Planner-assistent · {MONTHS[month - 1]} {year}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="hidden rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-emerald-200 sm:inline-flex">
                Voorstelmodus
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="AI Koerplanner sluiten"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 space-y-4 overflow-y-auto p-3 sm:p-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[11px] leading-relaxed text-blue-900">
              <strong>Veilig werken:</strong> de assistent maakt eerst een voorstel. Pas na jouw bevestiging wordt alleen de eerste keuze aangepast. Definitief maken blijft een aparte manuele actie.
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <WandSparkles className="h-4 w-4 text-amber-500" />
                Snel een voorstel maken
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="block text-[11px] font-bold text-slate-600">
                  Periode
                  <span className="relative mt-1 block">
                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value as "week" | "month")}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    >
                      <option value="week">Eén week</option>
                      <option value="month">Volledige maand</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
                  </span>
                </label>

                {period === "week" ? (
                  <label className="block text-[11px] font-bold text-slate-600">
                    ISO-week
                    <span className="relative mt-1 block">
                      <select
                        value={weekNumber}
                        onChange={(event) => setWeekNumber(Number(event.target.value))}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                      >
                        {weekOptions.map((week) => (
                          <option key={week} value={week}>Week {week}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-3 h-4 w-4 text-slate-400" />
                    </span>
                  </label>
                ) : (
                  <div className="flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                    <CalendarDays className="h-4 w-4" />
                    {MONTHS[month - 1]} {year}
                  </div>
                )}

                <button
                  type="button"
                  onClick={generate}
                  disabled={busy || members.length === 0}
                  className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#ffdc00] px-3 py-2.5 text-xs font-extrabold text-[#17202b] transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <WandSparkles className="h-4 w-4" />
                  {busy ? "Bezig..." : "Genereer"}
                </button>
              </div>
            </div>

            {proposal && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Diensten", proposal.stats.assignments],
                    ["1e keuze", proposal.stats.firstChoices],
                    ["2e/3e keuze", proposal.stats.secondChoices + proposal.stats.thirdChoices],
                    ["Open diensten", proposal.uncovered.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                      <p className="mt-1 text-lg font-extrabold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>

                {proposal.uncovered.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-950">
                    <div className="mb-2 flex items-center gap-2 font-extrabold">
                      <AlertTriangle className="h-4 w-4" /> Niet alle diensten konden worden ingevuld
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.uncovered.map((item) => (
                        <span key={`${item.date}-${item.shift}`} className="rounded-lg bg-white px-2 py-1 font-semibold">
                          {item.date}: {item.shift}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" /> Alle vereiste V-, D- en L-diensten konden worden ingevuld.
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[500px] text-left text-[11px]">
                    <thead className="bg-slate-100 text-[9px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Datum</th>
                        <th className="px-3 py-2">Shift</th>
                        <th className="px-3 py-2">Teamlid</th>
                        <th className="px-3 py-2">Voorkeur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proposal.assignments.map((item) => (
                        <tr key={`${item.date}-${item.shift}`}>
                          <td className="px-3 py-2 font-semibold text-slate-700">{item.date}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-md bg-yellow-100 px-2 py-1 font-extrabold text-slate-900">{item.shift}</span>
                          </td>
                          <td className="px-3 py-2 text-slate-800">{item.memberName}</td>
                          <td className="px-3 py-2 text-slate-500">{item.preference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {proposal.assignments.length === 0 && (
                    <p className="p-3 text-[11px] text-slate-500">Geen toewijzingen gevonden voor deze periode.</p>
                  )}
                </div>

                <ul className="space-y-1 text-[10px] leading-relaxed text-slate-500">
                  {proposal.notes.map((note) => <li key={note}>• {note}</li>)}
                </ul>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-[11px] leading-relaxed text-amber-950">
                    Toepassen vervangt alleen de eerste keuze. Tweede en derde keuze blijven staan. Niet-ingezette teamleden krijgen X. Definitief maken gebeurt later manueel in het teamoverzicht.
                  </p>
                  <button type="button" onClick={() => void applyProposal()} disabled={busy || proposal.assignments.length === 0}
                    className="w-full rounded-xl bg-[#17202b] px-4 py-3 text-xs font-extrabold text-[#ffdc00] transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy ? 'Bezig met toepassen…' : 'AI-planning toepassen'}
                  </button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-slate-800">
                <MessageCircle className="h-4 w-4" /> Chat met de planner-assistent
              </div>
              <div className="mb-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
                {chatReply}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(event) => { event.preventDefault(); void sendChat(); }}
              >
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Bijv. waarom zijn er open diensten?"
                  disabled={chatBusy}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                />
                <button
                  type="submit"
                  aria-label="Bericht versturen"
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#17202b] px-3 py-2.5 text-white transition hover:bg-slate-700"
                >
                  {chatBusy ? <span className="text-xs">…</span> : <Send className="h-4 w-4 text-[#ffdc00]" />}
                </button>
              </form>
              <p className="mt-2 text-[9px] text-slate-400">
                De assistent licht de planning toe. Alleen de knop hierboven past een bevestigd voorstel toe.
              </p>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "AI Koerplanner sluiten" : "AI Koerplanner openen"}
        aria-expanded={isOpen}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-[#17202b] text-[#ffdc00] shadow-xl ring-1 ring-slate-900/10 transition duration-200 hover:-translate-y-1 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300"
      >
        {isOpen ? <Minus className="h-6 w-6" /> : <Bot className="h-7 w-7" />}
        {!isOpen && (
          <span className="absolute -left-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#ffdc00] px-1 text-[9px] font-black text-[#17202b]">
            AI
          </span>
        )}
        <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-lg bg-[#17202b] px-3 py-1.5 text-[10px] font-bold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
          Open AI Koerplanner
        </span>
      </button>
    </div>
  );
};

export default AIPlannerPanel;
