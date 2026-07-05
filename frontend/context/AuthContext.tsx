import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
  AuthUser,
  login as loginService,
  register as registerService,
  LoginPayload,
  RegisterPayload,
} from '../services/authService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in when app starts
  useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const storedUser = await SecureStore.getItemAsync('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load stored user', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadStoredUser();
  }, []);

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = async (payload: LoginPayload) => {
    const userData = await loginService(payload);
    await SecureStore.setItemAsync('token', userData.token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setUser(userData);
  };

  // ─── Register ───────────────────────────────────────────────────────────────
  const register = async (payload: RegisterPayload) => {
    const userData = await registerService(payload);
    await SecureStore.setItemAsync('token', userData.token);
    await SecureStore.setItemAsync('user', JSON.stringify(userData));
    setUser(userData);
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook — use this in any screen to get the current user ───────────────────
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}