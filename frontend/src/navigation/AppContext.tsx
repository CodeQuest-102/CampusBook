import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as Storage from '../storage';
import type { Role } from '../data/types';
import { authApi, usersApi, roleFromBackend, roleToBackend } from '../api';
import {
  saveToken,
  clearToken,
  loadToken,
  setUnauthorizedHandler,
} from '../api/client';

export interface Profile {
  name: string;
  email: string;
  department: string;
  /** KNUST staff/student ID — read-only identity, also usable as a login handle. */
  staffOrStudentId: string;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  staffOrStudentId: string;
  password: string;
  role: Role;
  department?: string;
}

export interface AppState {
  role: Role;
  /** Editable profile for the signed-in user. */
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  /** Convenience alias for profile.name (used across the app's headers). */
  displayName: string;

  isAuthenticated: boolean;
  /** True while restoring a persisted session on app start. */
  isBootstrapping: boolean;

  signIn: (emailOrId: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  /** Finishes the sign-in that /verify-email's response has just earned. */
  completeVerification: (auth: { token: string; fullName: string; email: string; role: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | undefined>(undefined);

const SESSION_KEY = 'campusbook.session';

interface PersistedSession {
  role: Role;
  profile: Profile;
}

const EMPTY_PROFILE: Profile = { name: '', email: '', department: '', staffOrStudentId: '' };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('student');
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const persistSession = useCallback(async (session: PersistedSession) => {
    await Storage.setItemAsync(SESSION_KEY, JSON.stringify(session));
  }, []);

  const applyAuth = useCallback(
    async (
      auth: { token: string; fullName: string; email: string; role: string },
      department: string,
      staffOrStudentId: string,
    ) => {
      const nextRole = roleFromBackend(auth.role as any);
      const nextProfile: Profile = {
        name: auth.fullName,
        email: auth.email,
        department,
        staffOrStudentId,
      };
      await saveToken(auth.token);
      await persistSession({ role: nextRole, profile: nextProfile });
      setRole(nextRole);
      setProfile(nextProfile);
      setIsAuthenticated(true);
    },
    [persistSession],
  );

  // Shared by signIn and completeVerification — both end with a real, usable
  // token that needs the same "fetch /me, then establish the session" handling.
  const establishSession = useCallback(
    async (auth: { token: string; fullName: string; email: string; role: string }) => {
      // Persist the token first so the follow-up /me call is authenticated.
      await saveToken(auth.token);
      // The auth response omits department and the campus ID; one /me call
      // fills in both.
      let department = '';
      let staffOrStudentId = '';
      try {
        const me = await usersApi.getMe();
        department = me.department ?? '';
        staffOrStudentId = me.staffOrStudentId ?? '';
      } catch {
        // non-fatal — profile just shows an empty department until next edit
      }
      await applyAuth(auth, department, staffOrStudentId);
    },
    [applyAuth],
  );

  const signIn = useCallback(
    async (emailOrId: string, password: string) => {
      const auth = await authApi.login({ emailOrId, password });
      await establishSession(auth);
    },
    [establishSession],
  );

  const completeVerification = useCallback(
    async (auth: { token: string; fullName: string; email: string; role: string }) => {
      await establishSession(auth);
    },
    [establishSession],
  );

  const signUp = useCallback(async (input: SignUpInput) => {
    await authApi.register({
      fullName: input.fullName,
      email: input.email,
      staffOrStudentId: input.staffOrStudentId,
      password: input.password,
      role: roleToBackend(input.role),
      department: input.department,
    });
    // No session established here — the account can't log in until its email
    // is verified. The caller (SignUpScreen) navigates to VerifyEmail.
  }, []);

  const signOut = useCallback(async () => {
    await clearToken();
    await Storage.deleteItemAsync(SESSION_KEY);
    setIsAuthenticated(false);
    setProfile(EMPTY_PROFILE);
    setRole('student');
  }, []);

  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      setProfile((p) => {
        const next = { ...p, ...patch };
        persistSession({ role, profile: next }).catch(() => {});
        return next;
      });
    },
    [role, persistSession],
  );

  // Restore a persisted session (token + profile) on app start.
  useEffect(() => {
    (async () => {
      try {
        const token = await loadToken();
        const raw = await Storage.getItemAsync(SESSION_KEY);
        if (token && raw) {
          const session: PersistedSession = JSON.parse(raw);
          setRole(session.role);
          // Sessions persisted before the campus ID was stored lack the field.
          setProfile({ ...EMPTY_PROFILE, ...session.profile });
          setIsAuthenticated(true);
        }
      } catch {
        // ignore — treated as signed out
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  // A 401 from any request forces a global sign-out.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
      setProfile(EMPTY_PROFILE);
      setRole('student');
      Storage.deleteItemAsync(SESSION_KEY).catch(() => {});
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      role,
      profile,
      updateProfile,
      displayName: profile.name,
      isAuthenticated,
      isBootstrapping,
      signIn,
      signUp,
      completeVerification,
      signOut,
    }),
    [
      role,
      profile,
      updateProfile,
      isAuthenticated,
      isBootstrapping,
      signIn,
      signUp,
      completeVerification,
      signOut,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
