import { User, MonthlyPlanning, TeamMemberOverview, AdminStats } from '../types';

const API_BASE = '/api';

export interface SpecialDay { date: string; type: 'replacementHoliday' | 'strike'; createdAt?: string; createdBy?: string; }

export interface MaintenanceStatus {
  enabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export type TelegramScheduledTime = '04:50' | '12:30' | '21:00';

export interface TelegramBlockedRun {
  id: string;
  date: string;
  time: TelegramScheduledTime;
  status: 'blocked';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TelegramBlockedRunsResponse {
  success: boolean;
  runs: TelegramBlockedRun[];
}

class ApiClient {
  private memoryToken: string | null = null;

  private getToken(): string | null {
    if (this.memoryToken) return this.memoryToken;
    try {
      const stored = localStorage.getItem('neon_auth_token') || sessionStorage.getItem('neon_auth_token');
      if (stored) {
        this.memoryToken = stored;
        return stored;
      }
    } catch {
      // Ignore iframe security error
    }
    return this.memoryToken;
  }
    public getAuthToken(): string | null {
    return this.getToken();
  }

  public setToken(token: string, remember = true) {
    this.memoryToken = token;
    try {
      if (remember) {
        localStorage.setItem('neon_auth_token', token);
      } else {
        sessionStorage.setItem('neon_auth_token', token);
      }
    } catch {
      // Ignore iframe storage exceptions
    }
  }

  public clearToken() {
    this.memoryToken = null;
    try {
      localStorage.removeItem('neon_auth_token');
      sessionStorage.removeItem('neon_auth_token');
    } catch {
      // Ignore iframe storage exceptions
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({ error: 'Onverwachte serverfout opgetreden.' }));

    if (!res.ok) {
      throw new Error(data.error || `Verzoek mislukt met code ${res.status}`);
    }

    return data as T;
  }

  // Authentication
  async getSetupInfo() {
    return this.request<{
      hasAdmin: boolean;
      demoPresets: Array<{ name: string; code: string; rights: string }>;
    }>('/auth/setup-info');
  }

  async login(accessCode: string) {
    return this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ accessCode }),
    });
  }

  async getSession() {
    return this.request<{ token: string; user: User }>('/auth/session');
  }

  async logout() {
    try {
      await this.request<{ success: boolean }>('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async changeMyPassword({ oldCode, newCode }: { oldCode: string; newCode: string }) {
    return this.request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldCode, newCode }),
    });
  }

  // Planning (Current User)
  async getPlanning(year: number, month: number) {
    return this.request<{ year: number; month: number; planning: MonthlyPlanning }>(`/planning/${year}/${month}`);
  }

async savePlanning(
  year: number,
  month: number,
  days: Record<number, string>,
  secondChoices: Record<number, string> = {},
  thirdChoices?: Record<number, string>
) {
  return this.request<{
    success: boolean;
    message: string;
    planning: MonthlyPlanning;
  }>(`/planning/${year}/${month}`, {
    method: 'POST',
    body: JSON.stringify({
      days,
      secondChoices,
      ...(thirdChoices !== undefined ? { thirdChoices } : {}),
    }),
  });
}

  // Team Overview
  async getTeamOverview(year: number, month: number) {
    return this.request<{ year: number; month: number; teamData: TeamMemberOverview[] }>(`/overview/${year}/${month}`);
  }

  // Planner Roster Members
  async getPlannerMembers() {
    return this.request<{ members: User[] }>('/planner/members');
  }

// Maintenance Mode

// Publieke status ophalen, ook zonder ingelogde gebruiker.
async getMaintenanceStatus() {
  return this.request<MaintenanceStatus>('/maintenance/status');
}

// Onderhoudsmodus wijzigen, uitsluitend voor beheerders.
async updateMaintenanceMode(enabled: boolean) {
  return this.request<{
    success: boolean;
    maintenance: MaintenanceStatus;
    message: string;
  }>('/admin/maintenance', {
    method: 'PUT',
    body: JSON.stringify({ enabled }),
  });
}

  // Admin Portal
  async getAdminStats() {
    return this.request<AdminStats>('/admin/stats');
  }

  async getAdminUsers() {
    return this.request<{ users: User[] }>('/admin/users');
  }

  async generateAccessCode(prefix = 'GBR') {
    return this.request<{ code: string }>('/admin/generate-code', {
      method: 'POST',
      body: JSON.stringify({ prefix }),
    });
  }

  async createUser(payload: {
    name: string;
    role?: string;
    accessCode: string;
    canViewOverview: boolean;
    canEditPlanning: boolean;
    canPlannerMode: boolean;
    isAdmin: boolean;
    isActive: boolean;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      user: User;
      generatedCode: string;
    }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateUser(id: string, payload: Partial<User>) {
    return this.request<{ success: boolean; message: string; user: User }>(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async changeUserCode(id: string, newAccessCode: string) {
    return this.request<{ success: boolean; message: string; newCode: string }>(`/admin/users/${id}/code`, {
      method: 'PUT',
      body: JSON.stringify({ newAccessCode }),
    });
  }

  async deleteUser(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserPlanning(userId: string, year: number, month: number) {
    return this.request<{ user: User; planning: MonthlyPlanning }>(`/admin/users/${userId}/planning/${year}/${month}`);
  }

  async applyAIPlanningProposal(
    year: number,
    month: number,
    assignments: Array<{ memberId: string; day: number; shift: 'V' | 'D' | 'L' }>,
    days: number[]
  ) {
    return this.request<{ success: boolean; updated: number; markedUnavailable: number; message: string }>(
      `/admin/planning/${year}/${month}/apply-ai-proposal`,
      { method: 'POST', body: JSON.stringify({ assignments, days }) }
    );
  }

  async finalizePlanning(year: number, month: number, week?: number | 'all') {
    return this.request<{ success: boolean; message: string }>(
      `/admin/planning/${year}/${month}/finalize`,
      {
        method: 'POST',
        body: JSON.stringify({ week: week === 'all' ? undefined : week }),
      }
    );
  }

async saveUserPlanningAsAdmin(
  userId: string,
  year: number,
  month: number,
  days: Record<number, string>,
  secondChoices: Record<number, string> = {},
  thirdChoices?: Record<number, string>
) {
  return this.request<{
    success: boolean;
    message: string;
    planning: MonthlyPlanning;
  }>(
    `/admin/users/${userId}/planning/${year}/${month}`,
    {
      method: 'POST',
      body: JSON.stringify({
        days,
        secondChoices,
        ...(thirdChoices !== undefined ? { thirdChoices } : {}),
      }),
    }
  );
}


  async getFirebaseStatus() {
    return this.request<{
      connected: boolean;
      projectId: string;
      authDomain: string;
      storageBucket: string;
      lastSyncAt: string;
    }>('/firebase/status');
  }

  async syncFirebase() {
    return this.request<{ success: boolean; message: string; projectId: string }>('/firebase/sync', {
      method: 'POST',
    });
  }

  // General Chat
  async sendTelegramMessage(message: string) {
    return this.request<{ success: boolean; message: string }>('/chat/send-message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  // OC BUS GBR Dagplanning naar Telegram
  async sendOcPlanningToTelegram() {
    return this.request<{ success: boolean; message: string }>(
      '/oc-planning/send-telegram',
      {
        method: 'POST',
      }
    );
  }
  // Telegram Scheduler Control: blokkeringen per datum en verzendmoment.
  async getTelegramBlockedRuns() {
    return this.request<TelegramBlockedRunsResponse>('/admin/telegram-scheduler/blocked');
  }

  async addTelegramBlockedRun(date: string, time: TelegramScheduledTime) {
    return this.request<TelegramBlockedRunsResponse & { message: string }>(
      '/admin/telegram-scheduler/blocked',
      { method: 'POST', body: JSON.stringify({ date, time }) }
    );
  }

  async deleteTelegramBlockedRun(runId: string) {
    return this.request<TelegramBlockedRunsResponse & { message: string }>(
      `/admin/telegram-scheduler/blocked/${encodeURIComponent(runId)}`,
      { method: 'DELETE' }
    );
  }

  // Speciale kalenderdagen (vervangende feestdagen en stakingen)
  async getSpecialDays() {
    return this.request<{ specialDays: SpecialDay[] }>('/special-days');
  }

  async addSpecialDay(date: string, type: SpecialDay['type']) {
    return this.request<{ success: boolean; specialDays: SpecialDay[] }>('/admin/special-days', {
      method: 'POST',
      body: JSON.stringify({ date, type }),
    });
  }

  async deleteSpecialDay(date: string) {
    return this.request<{ success: boolean; specialDays: SpecialDay[] }>(`/admin/special-days/${date}`, {
      method: 'DELETE',
    });
  }

}

export const api = new ApiClient();
