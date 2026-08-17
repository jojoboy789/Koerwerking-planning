export type ShiftCode = 'V' | 'D' | 'L' | 'X' | '';

export interface ShiftInfo {
  code: ShiftCode;
  label: string;
  shortLabel: string;
  description: string;
  colorClass: string;
  activeClass: string;
  textColor: string;
}

export const SHIFT_DEFINITIONS: Record<Exclude<ShiftCode, ''>, ShiftInfo> = {
  V: {
    code: 'V',
    label: 'Vroege dienst',
    shortLabel: 'Vroeg',
    description: 'vroege shift (05:00-13:00)',
    colorClass: 'code-V',
    activeClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-200 border-emerald-600',
    textColor: '#047857',
  },
  D: {
    code: 'D',
    label: 'Dagdienst',
    shortLabel: 'Dag',
    description: 'Dagdienst (08:00-16 of 09:00-17:00)',
    colorClass: 'code-D',
    activeClass: 'bg-amber-500 text-white shadow-md shadow-amber-200 border-amber-500',
    textColor: '#b45309',
  },
  L: {
    code: 'L',
    label: 'Late dienst',
    shortLabel: 'Laat',
    description: 'Late shift (13:00-21:00)',
    colorClass: 'code-L',
    activeClass: 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border-indigo-600',
    textColor: '#4338ca',
  },
  X: {
    code: 'X',
    label: 'Vrij / Niet werken',
    shortLabel: 'Vrij',
    description: 'Rustdag / weekend / niet ingeroosterd',
    colorClass: 'code-X',
    activeClass: 'bg-slate-700 text-white shadow-md shadow-slate-300 border-slate-700',
    textColor: '#475569',
  },
};

export interface User {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  rawCode?: string;
  isActive: boolean;
  canViewOverview: boolean;
  canEditPlanning: boolean;
  canPlannerMode: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserSession {
  token: string;
  user: User;
}

export interface MonthlyPlanning {
  id: string;
  userId: string;
  userName?: string;
  year: number;
  month: number; // 1 - 12
  days: Record<number, ShiftCode>;
  finalDays: Record<number, ShiftCode> | null;
  isFinal: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface TeamMemberOverview {
  user: User;
  planning: MonthlyPlanning | null;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  canEditPlanningCount: number;
  canViewOverviewCount: number;
  adminCount: number;
  totalPlanningsThisMonth: number;
}
