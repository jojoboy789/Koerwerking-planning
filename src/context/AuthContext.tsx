import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (accessCode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  canViewOverview: boolean;
  canEditPlanning: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        isAdmin,
      }}
    >
      {children}
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
