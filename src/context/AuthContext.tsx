import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { CheckCircle2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (accessCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  canViewOverview: boolean;
  canEditPlanning: boolean;
  canPlannerMode: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPlannerReminder, setShowPlannerReminder] = useState(false);


  const checkSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getSession();
      setUser(res.user);
    } catch {
      setUser(null);
      api.clearToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (user && (user.canPlannerMode || user.isAdmin)) {
      setShowPlannerReminder(true);
    }
  }, [user]);

  const login = async (accessCode: string) => {
    setError(null);
    try {
      const res = await api.login(accessCode);
      api.setToken(res.token);
      setUser(res.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Inloggen mislukt.';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await api.getSession();
      setUser(res.user);
    } catch {
      setUser(null);
    }
  };

  const canViewOverview = Boolean(user?.canViewOverview || user?.isAdmin);
  const canEditPlanning = Boolean(user?.canEditPlanning || user?.isAdmin);
  const isAdmin = Boolean(user?.isAdmin);
  const roleName = (user?.role || '').toLowerCase().trim();
  const canPlannerMode = Boolean(isAdmin || user?.canPlannerMode || roleName === 'planning' || roleName === 'planner' || (canEditPlanning && canViewOverview));

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        refreshUser,
        canViewOverview,
        canEditPlanning,
        canPlannerMode,
        isAdmin,
      }}
    >
      {children}
      {showPlannerReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900">
                Herinnering voor Planners
              </h3>
              <p className="text-sm text-slate-600 mt-2">
                Vergeet niet de <strong>Planning volledig</strong> knop te klikken om de definitieve planning door te geven.
              </p>
            </div>
            <button
              onClick={() => setShowPlannerReminder(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all cursor-pointer"
            >
              Ik begrijp het
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
