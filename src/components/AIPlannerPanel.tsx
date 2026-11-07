import React, { useEffect, useMemo, useState } from "react";
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

function formatDisplayDate(dateValue: string): string {
  // Toont ISO-datums (ook wanneer er een tijdstip achter staat) als DD/MM/JJJJ.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(dateValue);
  if (!match) return dateValue;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export const AIPlannerPanel: React.FC<AIPlannerPanelProps> = ({
  members,
  year,
  month,
  specialDays = [],
  canUse,
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

  // Houd de weekselectie synchroon met de actuele maand.
  // Dit voorkomt dat de eerste generatie een oude week uit een vorige maand gebruikt.
  useEffect(() => {
    const defaultWeek = getISOWeek(new Date(year, month - 1, 1));
    setWeekNumber((currentWeek) =>
      weekOptions.includes(currentWeek) ? currentWeek : defaultWeek
    );
    setProposal(null);
  }, [year, month, weekOptions]);

  // Verwijder een oud voorstel zodra de gebruiker een andere periode/week kiest.
  useEffect(() => {
    setProposal(null);
  }, [period, weekNumber]);

  // Geen knop en geen chatvenster renderen voor gewone gebruikers.
  if (!canUse) return null;

  const generate = () => {
    if (!canUse || busy || members.length === 0) return;
    setBusy(true);
    setProposal(null);
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
        result.stats.assignments > 0
          ? `Voorstel klaar: ${result.stats.assignments} diensten verdeeld over ${result.stats.uniqueMembers} teamleden. Er zijn ${result.uncovered.length} openstaande diensten en ${result.assignments.filter((item) => item.restDayMoveWarning).length} rustdagen die de planner moet verplaatsen/controleren.`
          : "Er werd geen enkele dienst gegenereerd. Dit voorstel is niet bruikbaar. Controleer of de planningsgegevens voor deze week geladen zijn."
      );
    } catch (error) {
      console.error("AI-planningsvoorstel maken mislukt:", error);
      setChatReply("Het voorstel kon niet worden gemaakt. Controleer de gegevens en probeer opnieuw.");
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
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3">
      {isOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="AI Koerplanner"
          className="flex h-[min(82vh,820px)] max-h-[calc(100dvh-2rem)] w-[min(92vw,1040px)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.42)] sm:rounded-3xl"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-r from-[#17202b] via-[#1d2938] to-[#17202b] px-5 py-4 text-white sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffdc00] text-[#17202b] shadow-sm">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-base font-extrabold tracking-tight sm:text-lg">AI Koerplanner</h3>
                <p className="truncate text-xs text-slate-300 sm:text-sm">
                  Planner-assistent · {MONTHS[month - 1]} {year}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="hidden rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 sm:inline-flex">
                Voorstelmodus
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="AI Koerplanner sluiten"
                className="rounded-xl p-2.5 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffdc00]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="min-h-0 space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50/90 px-4 py-3 text-sm leading-relaxed text-blue-950">
              <strong>Veilig werken:</strong> de assistent maakt alleen een voorstel. Er wordt niets opgeslagen en je bestaande planning wordt niet aangepast.
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2.5 text-sm font-extrabold text-slate-900 sm:text-base">
                <WandSparkles className="h-4 w-4 text-amber-500" />
                Snel een voorstel maken
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="block text-xs font-bold text-slate-700 sm:text-sm">
                  Periode
                  <span className="relative mt-1 block">
                    <select
                      value={period}
                      onChange={(event) => setPeriod(event.target.value as "week" | "month")}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100/80"
                    >
                      <option value="week">Eén week</option>
                      <option value="month">Volledige maand</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                  </span>
                </label>

                {period === "week" ? (
                  <label className="block text-xs font-bold text-slate-700 sm:text-sm">
                    ISO-week
                    <span className="relative mt-1 block">
                      <select
                        value={weekNumber}
                        onChange={(event) => setWeekNumber(Number(event.target.value))}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-9 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100/80"
                      >
                        {weekOptions.map((week) => (
                          <option key={week} value={week}>Week {week}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                    </span>
                  </label>
                ) : (
                  <div className="flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-sm font-medium text-slate-700">
                    <CalendarDays className="h-4 w-4" />
                    {MONTHS[month - 1]} {year}
                  </div>
                )}

                <button
                  type="button"
                  onClick={generate}
                  disabled={busy || members.length === 0}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#ffdc00] px-5 py-3 text-sm font-extrabold text-[#17202b] shadow-sm transition hover:-translate-y-0.5 hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <WandSparkles className="h-4 w-4" />
                  {busy ? "Bezig..." : "Genereer"}
                </button>
              </div>
            </div>

            {proposal && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 sm:text-lg">Resultaat van het voorstel</h4>
                    <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">Bekijk eerst de samenvatting en controleer daarna de diensten hieronder.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600">Niet automatisch opgeslagen</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Diensten", proposal.stats.assignments],
                    ["1e keuze", proposal.stats.firstChoices],
                    ["2e/3e keuze", proposal.stats.secondChoices + proposal.stats.thirdChoices],
                    ["Open diensten", proposal.uncovered.length],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                      <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                {proposal.assignments.some((item) => item.restDayMoveWarning) && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50/90 p-4 text-sm leading-relaxed text-orange-950">
                    <div className="mb-2 flex items-center gap-2 font-extrabold sm:text-base">
                      <AlertTriangle className="h-4 w-4" />
                      Diensten ingevuld met te verplaatsen rustdag
                    </div>
                    <p className="mb-2">
                      Deze diensten zijn toegewezen op basis van een tweede of derde keuze terwijl de eerste keuze R was.
                      De planner moet de rustdag controleren en verplaatsen vóór goedkeuring.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.assignments.filter((item) => item.restDayMoveWarning).map((item) => (
                        <span key={`rest-${item.date}-${item.shift}`} className="rounded-lg bg-white px-2 py-1 font-semibold">
                          {formatDisplayDate(item.date)}: {item.memberName} · {item.shift} ({item.preference})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {proposal.uncovered.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm leading-relaxed text-amber-950">
                    <div className="mb-2 flex items-center gap-2 font-extrabold">
                      <AlertTriangle className="h-4 w-4" /> Niet alle diensten konden worden ingevuld
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.uncovered.map((item) => (
                        <span key={`${item.date}-${item.shift}`} className="rounded-lg bg-white px-2 py-1 font-semibold">
                          {formatDisplayDate(item.date)}: {item.shift}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : proposal.stats.assignments > 0 ? (
                  <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-950">
                    <CheckCircle2 className="h-4 w-4" /> Alle vereiste V-, D- en L-diensten konden worden ingevuld.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-bold text-amber-950">
                    <AlertTriangle className="h-4 w-4" />
                    Er werd geen enkele dienst gegenereerd. Dit is geen geslaagd voorstel. Controleer de geselecteerde week en de beschikbare planningsgegevens.
                  </div>
                )}

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-white px-4 py-3"><h5 className="text-sm font-extrabold text-slate-900">Voorgestelde diensten</h5><p className="mt-0.5 text-xs text-slate-600">Elke regel toont de datum, dienst, medewerker en gebruikte voorkeur.</p></div>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-3.5 py-3">Datum</th>
                        <th className="px-3.5 py-3">Shift</th>
                        <th className="px-3.5 py-3">Teamlid</th>
                        <th className="px-3.5 py-3">Voorkeur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proposal.assignments.map((item) => (
                        <tr key={`${item.date}-${item.shift}`} className="transition-colors hover:bg-yellow-50/70">
                          <td className="px-3.5 py-3 font-semibold text-slate-700">{formatDisplayDate(item.date)}</td>
                          <td className="px-3.5 py-3">
                            <span className="inline-flex min-w-8 justify-center rounded-md bg-yellow-100 px-2.5 py-1.5 font-extrabold text-slate-900">{item.shift}</span>
                          </td>
                          <td className="px-3.5 py-3 text-slate-800">{item.memberName}</td>
                          <td className="px-3.5 py-3 text-slate-600">
                            <span className="font-semibold">{item.preference}</span>
                            {item.restDayMoveWarning && (
                              <span className="ml-1 inline-flex rounded-md bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-900">
                                Rustdag verplaatsen
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {proposal.assignments.length === 0 && (
                    <p className="p-4 text-sm text-slate-600">Geen toewijzingen gevonden voor deze periode.</p>
                  )}
                  </div>
                </div>

                <ul className="space-y-1.5 text-xs leading-relaxed text-slate-600">
                  {proposal.notes.map((note) => <li key={note}>• {note}</li>)}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center gap-2.5 text-sm font-extrabold text-slate-900 sm:text-base">
                <MessageCircle className="h-4 w-4" /> Chat met de planner-assistent
              </div>
              <div className="mb-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
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
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100/80"
                />
                <button
                  type="submit"
                  aria-label="Bericht versturen"
                  className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-xl bg-[#17202b] px-4 py-3 text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
                >
                  {chatBusy ? <span className="text-xs">…</span> : <Send className="h-4 w-4 text-[#ffdc00]" />}
                </button>
              </form>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Gemini beantwoordt vragen op basis van de actuele planningsgegevens. Er wordt niets opgeslagen.
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
