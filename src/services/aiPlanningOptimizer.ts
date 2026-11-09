export type Shift = "V" | "D" | "L";

export interface AIPlannerMember {
  user: {
    id: string;
    name: string;
    role?: string;
    deploymentPriority?: "high" | "normal" | "low" | "none";
  };
  planning?: {
    days?: Record<number, string>;
    secondChoices?: Record<number, string>;
    thirdChoices?: Record<number, string>;
    isFinal?: boolean;
    finalDays?: Record<number, string>;
  };
}

export interface AIPlannerSpecialDay {
  date: string;
  type: "replacementHoliday" | "strike";
}

export interface AIPlannerAssignment {
  date: string;
  day: number;
  memberId: string;
  memberName: string;
  shift: Shift;
  preference: "1e keuze" | "2e keuze" | "3e keuze" | "Geen voorkeur";
  score: number;
}

export interface AIRestDayWarning {
  date: string;
  memberId: string;
  memberName: string;
  assignedShift: Shift;
  preference: AIPlannerAssignment["preference"];
  message: string;
}

export interface AIPlannerResult {
  assignments: AIPlannerAssignment[];
  uncovered: Array<{ date: string; shift: Shift }>;
  skippedDates: Array<{ date: string; reason: string }>;
  restDayWarnings: AIRestDayWarning[];
  stats: {
    assignments: number;
    firstChoices: number;
    secondChoices: number;
    thirdChoices: number;
    noPreference: number;
    uniqueMembers: number;
  };
  notes: string[];
}

const SHIFT_ORDER: Shift[] = ["V", "D", "L"];
const WEIGHTS: Record<Shift, number> = { V: 100, D: 100, L: 100 };
const CHOICE_WEIGHT = { first: 100, second: 65, third: 35, none: 0 };

const DEPLOYMENT_PRIORITY_WEIGHT: Record<"high" | "normal" | "low" | "none", number> = {
  high: 18,
  normal: 0,
  low: -9,
  none: 0,
};

function deploymentPriorityWeight(member: AIPlannerMember): number {
  const priority = member.user.deploymentPriority || "normal";
  return DEPLOYMENT_PRIORITY_WEIGHT[priority] ?? 0;
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function easterSunday(year: number): Date {
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
  const m = Math.floor((a + 11 * l + 22 * h) / 451);
  const monthNumber = Math.floor((h + l - 7 * m + 114) / 31);
  const dayNumber = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, monthNumber - 1, dayNumber);
}

function isBelgianPublicHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const fixed = new Set(["1-1", "5-1", "7-21", "8-15", "11-1", "11-11", "12-25"]);
  if (fixed.has(`${month}-${day}`)) return true;
  const easter = easterSunday(year);
  const movable = [1, 39, 50].map((offset) =>
    new Date(year, easter.getMonth(), easter.getDate() + offset)
  );
  return movable.some(
    (holiday) =>
      holiday.getFullYear() === year &&
      holiday.getMonth() === date.getMonth() &&
      holiday.getDate() === date.getDate()
  );
}

function isoWeek(date: Date): number {
  const value = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  return Math.ceil((((value.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function preferenceFor(member: AIPlannerMember, day: number, shift: Shift) {
  const first = member.planning?.days?.[day] || "";
  const second = member.planning?.secondChoices?.[day] || "";
  const third = member.planning?.thirdChoices?.[day] || "";

  if (first === shift) return { label: "1e keuze" as const, weight: CHOICE_WEIGHT.first };
  if (second === shift) return { label: "2e keuze" as const, weight: CHOICE_WEIGHT.second };
  if (third === shift) return { label: "3e keuze" as const, weight: CHOICE_WEIGHT.third };
  return { label: "Geen voorkeur" as const, weight: CHOICE_WEIGHT.none };
}

/**
 * Creates a read-only proposal. It does not save or modify any planning data.
 * Existing finalised days are skipped. X is unavailable; R may be reconsidered via alternatives.
 */
export function generateAIPlanningProposal(input: {
  members: AIPlannerMember[];
  year: number;
  month: number; // 1-12
  period: "week" | "month";
  weekNumber?: number;
  specialDays?: AIPlannerSpecialDay[];
}): AIPlannerResult {
  const { members, year, month, period, weekNumber, specialDays = [] } = input;
  const assignments: AIPlannerAssignment[] = [];
  const uncovered: AIPlannerResult["uncovered"] = [];
  const skippedDates: AIPlannerResult["skippedDates"] = [];
  const restDayWarnings: AIRestDayWarning[] = [];
  const assignedCount = new Map<string, number>();
  const assignedByShift = new Map<string, number>();

  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month - 1, day);
    const key = dateKey(year, month, day);

    if (period === "week" && weekNumber && isoWeek(date) !== weekNumber) continue;
    if (date.getDay() === 0 || date.getDay() === 6) {
      skippedDates.push({ date: key, reason: "Weekend: geen verplichte V/D/L-bezetting." });
      continue;
    }
    if (isBelgianPublicHoliday(date)) {
      skippedDates.push({ date: key, reason: "Belgische feestdag." });
      continue;
    }
    if (specialDays.some((item) => item.date === key)) {
      skippedDates.push({ date: key, reason: "Speciale kalenderdag." });
      continue;
    }

    // Een definitieve toewijzing op deze dag mag nooit door het voorstel worden gewijzigd.
    const finalisedForDay = members.some((member) =>
      Boolean(member.planning?.finalDays?.[day])
    );
    if (finalisedForDay) {
      skippedDates.push({ date: key, reason: "Definitieve planning: dag wordt niet aangepast." });
      continue;
    }

    /*
     * Zoek de beste combinatie voor V, D en L in één keer.
     * Dit voorkomt de oude greedy-fout waarbij de eerste keuze voor V
     * iemand bezet houdt die de enige kandidaat voor D is, terwijl een
     * andere medewerker V als tweede keuze kan doen.
     *
     * Prioriteit: (1) zoveel mogelijk diensten invullen,
     * (2) voorkeuren respecteren, (3) admin-inzetprioriteit,
     * (4) eerlijke spreiding over de maand.
     */
    type DailyCandidate = {
      member: AIPlannerMember;
      shift: Shift;
      preference: ReturnType<typeof preferenceFor>;
      score: number;
    };

    const candidatesByShift = new Map<Shift, DailyCandidate[]>();

    for (const shift of SHIFT_ORDER) {
      const candidates: DailyCandidate[] = [];

      for (const member of members) {
        const first = member.planning?.days?.[day] || "";

        // X is altijd een harde uitsluiting.
        if (first === "X") continue;

        const preference = preferenceFor(member, day, shift);

        // Geen dienst zonder expliciete 1e, 2e of 3e keuze.
        if (preference.weight <= 0) continue;

        const total = assignedCount.get(member.user.id) || 0;
        const sameShift = assignedByShift.get(`${member.user.id}:${shift}`) || 0;
        const fairnessPenalty = total * 7 + sameShift * 4;
        const priorityBonus = deploymentPriorityWeight(member);

        // Rustdag als eerste keuze is alleen toegestaan als de medewerker
        // deze shift expliciet als tweede/derde keuze heeft opgegeven.
        const restDayPenalty = first === "R" ? 12 : 0;

        candidates.push({
          member,
          shift,
          preference,
          score: preference.weight + priorityBonus - fairnessPenalty - restDayPenalty,
        });
      }

      candidates.sort((a, b) =>
        b.score - a.score ||
        a.member.user.name.localeCompare(b.member.user.name)
      );
      candidatesByShift.set(shift, candidates);
    }

    let bestAssignments: DailyCandidate[] = [];
    let bestFilled = -1;
    let bestScore = Number.NEGATIVE_INFINITY;

    const searchCombinations = (
      shiftIndex: number,
      usedMemberIds: Set<string>,
      chosen: DailyCandidate[],
      score: number
    ) => {
      if (shiftIndex >= SHIFT_ORDER.length) {
        const filled = chosen.length;
        if (
          filled > bestFilled ||
          (filled === bestFilled && score > bestScore)
        ) {
          bestFilled = filled;
          bestScore = score;
          bestAssignments = [...chosen];
        }
        return;
      }

      const shift = SHIFT_ORDER[shiftIndex];
      const candidates = candidatesByShift.get(shift) || [];

      // Eerst alle geldige kandidaten proberen voor deze dienst.
      for (const candidate of candidates) {
        const memberId = candidate.member.user.id;
        if (usedMemberIds.has(memberId)) continue;

        usedMemberIds.add(memberId);
        chosen.push(candidate);
        searchCombinations(shiftIndex + 1, usedMemberIds, chosen, score + candidate.score);
        chosen.pop();
        usedMemberIds.delete(memberId);
      }

      // Ook onderzoeken of deze dienst open moet blijven om een betere
      // combinatie voor de overige diensten te kunnen maken.
      searchCombinations(shiftIndex + 1, usedMemberIds, chosen, score);
    };

    searchCombinations(0, new Set<string>(), [], 0);

    const assignedShifts = new Set<Shift>();
    for (const chosen of bestAssignments) {
      assignedShifts.add(chosen.shift);
      const memberId = chosen.member.user.id;

      assignedCount.set(memberId, (assignedCount.get(memberId) || 0) + 1);
      assignedByShift.set(
        `${memberId}:${chosen.shift}`,
        (assignedByShift.get(`${memberId}:${chosen.shift}`) || 0) + 1
      );

      assignments.push({
        date: key,
        day,
        memberId,
        memberName: chosen.member.user.name,
        shift: chosen.shift,
        preference: chosen.preference.label,
        score: chosen.score,
      });

      if ((chosen.member.planning?.days?.[day] || "") === "R") {
        restDayWarnings.push({
          date: key,
          memberId,
          memberName: chosen.member.user.name,
          assignedShift: chosen.shift,
          preference: chosen.preference.label,
          message: "Deze medewerker had een rustdag als eerste keuze. De dienst komt uit een expliciete tweede of derde keuze. Controleer manueel of de rustdag verantwoord kan verschuiven.",
        });
      }
    }

    for (const shift of SHIFT_ORDER) {
      if (!assignedShifts.has(shift)) {
        uncovered.push({ date: key, shift });
      }
    }
  }

  const stats = {
    assignments: assignments.length,
    firstChoices: assignments.filter((item) => item.preference === "1e keuze").length,
    secondChoices: assignments.filter((item) => item.preference === "2e keuze").length,
    thirdChoices: assignments.filter((item) => item.preference === "3e keuze").length,
    noPreference: assignments.filter((item) => item.preference === "Geen voorkeur").length,
    uniqueMembers: new Set(assignments.map((item) => item.memberId)).size,
  };

  return {
    assignments,
    uncovered,
    skippedDates,
    restDayWarnings,
    stats,
    notes: [
      "Dit is een lokaal gegenereerd voorstel, geen opgeslagen planning.",
      "Eerste, tweede en derde keuze worden alleen gelezen tijdens het genereren. Bij toepassen wordt alleen de eerste keuze vervangen.",
      "X is een harde uitsluiting. R kan alleen via een expliciete tweede of derde keuze worden overwogen en geeft een waarschuwing.",
      "Per gewone werkdag wordt maximaal één V, één D en één L voorgesteld.",
      "Weekends, Belgische feestdagen en speciale kalenderdagen worden overgeslagen.",
      "Per dag wordt de combinatie V/D/L gezamenlijk geoptimaliseerd: eerst zoveel mogelijk diensten invullen, daarna voorkeur, admin-inzetprioriteit en eerlijke spreiding meewegen.",
      "Definitieve dagen worden overgeslagen. Controleer de uitkomst altijd vóór manuele overname.",
    ],
  };
}
