import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Role } from '../data/placeholder';

export interface Profile {
  name: string;
  email: string;
  department: string;
}

interface AppState {
  role: Role;
  setRole: (r: Role) => void;
  /** Editable profile for the signed-in user. */
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  /** Convenience alias for profile.name (used across the app's headers). */
  displayName: string;
}

const AppContext = createContext<AppState | undefined>(undefined);

/** Per-role default profile shown in the mockups before any edits. */
const DEFAULTS: Record<Role, Profile> = {
  student: { name: 'Abubakar Sadiq', email: 'abubakar.sadiq@st.knust.edu.gh', department: 'Computer Science' },
  staff: { name: 'Dr. Kwaku Mensah', email: 'k.mensah@knust.edu.gh', department: 'Computer Science' },
  admin: { name: 'Admin', email: 'admin@knust.edu.gh', department: 'Administration' },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>('student');
  // Edits layered on top of the role default; cleared when the role changes.
  const [overrides, setOverrides] = useState<Partial<Profile>>({});

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    setOverrides({});
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setOverrides((o) => ({ ...o, ...patch }));
  }, []);

  const value = useMemo<AppState>(() => {
    const profile: Profile = { ...DEFAULTS[role], ...overrides };
    return { role, setRole, profile, updateProfile, displayName: profile.name };
  }, [role, overrides, setRole, updateProfile]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
