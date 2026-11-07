export type Shift = "V" | "D" | "L";

export interface AIPlannerMember {
  user: {
    id: string;
    name: string;
    role?: string;
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

export interface AIPlannerResult {
  assignments: AIPlannerAssignment[];
  uncovered: Array<{ date: string; shift: Shift }>;
  skippedDates: Array<{ date: string; reason: string }>;
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

    // If a finalised shift exists for this date, do not propose changes on that date.
    const finalisedForDay = members.some((member) =>
      Boolean(member.planning?.finalDays?.[day])
    );
    if (finalisedForDay) {
      skippedDates.push({ date: key, reason: "Definitieve planning: dag wordt niet aangepast." });
      continue;
    }

    const usedToday = new Set<string>();

    for (const shift of SHIFT_ORDER) {
      const candidates = members
        .filter((member) => {
          const first = member.planning?.days?.[day] || "";
          // X is een harde uitsluiting. R mag via tweede of derde keuze worden herbekeken.
          if (first === "X") return false;
          return !usedToday.has(member.user.id);
        })
        .map((member) => {
          const preference = preferenceFor(member, day, shift);
          const total = assignedCount.get(member.user.id) || 0;
          const sameShift = assignedByShift.get(`${member.user.id}:${shift}`) || 0;
          const fairnessPenalty = total * 12 + sameShift * 8;
          return {
            member,
            preference,
            score: WEIGHTS[shift] * 0 + preference.weight - fairnessPenalty,
          };
        })
        .sort((a, b) => b.score - a.score || a.member.user.name.localeCompare(b.member.user.name));

      const chosen = candidates[0];
      if (!chosen || chosen.preference.weight === 0) {
        uncovered.push({ date: key, shift });
        continue;
      }

      usedToday.add(chosen.member.user.id);
      assignedCount.set(chosen.member.user.id, (assignedCount.get(chosen.member.user.id) || 0) + 1);
      assignedByShift.set(
        `${chosen.member.user.id}:${shift}`,
        (assignedByShift.get(`${chosen.member.user.id}:${shift}`) || 0) + 1
      );
      assignments.push({
        date: key,
        day,
        memberId: chosen.member.user.id,
        memberName: chosen.member.user.name,
        shift,
        preference: chosen.preference.label,
        score: chosen.score,
      });
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
    stats,
    notes: [
      "Dit is een lokaal gegenereerd voorstel, geen opgeslagen planning.",
      "Eerste, tweede en derde keuze worden alleen gelezen tijdens het genereren. Bij toepassen wordt alleen de eerste keuze vervangen.",
      "X is een harde uitsluiting. Bij R mogen tweede en derde keuzes worden overwogen; controleer of de rustdag moet verschuiven.",
      "Per gewone werkdag wordt maximaal één V, één D en één L voorgesteld.",
      "Weekends, Belgische feestdagen en speciale kalenderdagen worden overgeslagen.",
      "Definitieve dagen worden overgeslagen. Controleer de uitkomst altijd vóór manuele overname.",
    ],
  };
}
