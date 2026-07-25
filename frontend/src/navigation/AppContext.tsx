import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import type { Role } from '../data/placeholder';
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

interface AppState {
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
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
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

  const signIn = useCallback(
    async (emailOrId: string, password: string) => {
      const auth = await authApi.login({ emailOrId, password });
      // Persist the token first so the follow-up /me call is authenticated.
      await saveToken(auth.token);
      // The login response omits department and the campus ID; one /me call
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

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const auth = await authApi.register({
        fullName: input.fullName,
        email: input.email,
        staffOrStudentId: input.staffOrStudentId,
        password: input.password,
        role: roleToBackend(input.role),
        department: input.department,
      });
      await applyAuth(auth, input.department ?? '', input.staffOrStudentId);
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await clearToken();
    await SecureStore.deleteItemAsync(SESSION_KEY);
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
        const raw = await SecureStore.getItemAsync(SESSION_KEY);
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
      SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
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
      signOut,
    }),
    [role, profile, updateProfile, isAuthenticated, isBootstrapping, signIn, signUp, signOut],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
