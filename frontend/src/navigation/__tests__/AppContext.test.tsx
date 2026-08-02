import React from 'react';
import renderer, { act } from 'react-test-renderer';

// jest.mock factories are hoisted above these declarations, so the names they
// close over must be `mock`-prefixed.
const mockSecureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureStore[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureStore[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete mockSecureStore[key];
    return Promise.resolve();
  }),
}));

const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockGetMe = jest.fn();

jest.mock('../../api', () => {
  const actual = jest.requireActual('../../api/adapters');
  return {
    authApi: {
      login: (...args: unknown[]) => mockLogin(...args),
      register: (...args: unknown[]) => mockRegister(...args),
    },
    usersApi: { getMe: (...args: unknown[]) => mockGetMe(...args) },
    roleFromBackend: actual.roleFromBackend,
    roleToBackend: actual.roleToBackend,
  };
});

// AppContext talks to client.ts directly for token storage and the global 401
// hook. Keep the real implementation (backed by the SecureStore mock above —
// so token persistence is genuine, not a stand-in) but capture the handler it
// registers, so a test can fire it exactly the way apiFetch does on a real 401.
let mockCapturedUnauthorizedHandler: (() => void) | null = null;
jest.mock('../../api/client', () => {
  const actual = jest.requireActual('../../api/client');
  return {
    ...actual,
    setUnauthorizedHandler: (handler: (() => void) | null) => {
      mockCapturedUnauthorizedHandler = handler;
    },
  };
});

import { AppProvider, useApp, type AppState } from '../AppContext';
import { loadToken, clearToken } from '../../api/client';

function Probe({ onReady }: { onReady: (app: AppState) => void }) {
  const app = useApp();
  onReady(app);
  return null;
}

/**
 * Returns a function that always reads the *latest* AppState — destructuring a
 * single snapshot (`const { app } = ...`) would freeze it at render time and
 * miss every update from signIn/signOut/the 401 handler.
 */
async function renderApp(): Promise<() => AppState> {
  let latest!: AppState;
  await act(async () => {
    renderer.create(
      <AppProvider>
        <Probe onReady={(app) => (latest = app)} />
      </AppProvider>,
    );
  });
  return () => latest;
}

describe('AppContext', () => {
  beforeEach(async () => {
    Object.keys(mockSecureStore).forEach((k) => delete mockSecureStore[k]);
    // client.ts caches the token in module-level state (by design — see its
    // comment), which outlives any one test in this file.
    await clearToken();
    mockLogin.mockReset();
    mockRegister.mockReset();
    mockGetMe.mockReset();
    mockCapturedUnauthorizedHandler = null;
  });

  it('starts signed out and finishes bootstrapping when there is no persisted session', async () => {
    const current = await renderApp();

    expect(current().isBootstrapping).toBe(false);
    expect(current().isAuthenticated).toBe(false);
  });

  it('signIn saves the token, fetches the profile, and flips to authenticated', async () => {
    mockLogin.mockResolvedValue({
      token: 'jwt-token',
      fullName: 'Abubakar Sadiq',
      email: 'student@campusbook.local',
      role: 'STUDENT_LEADER',
    });
    mockGetMe.mockResolvedValue({ department: 'Computer Science', staffOrStudentId: '20551234' });

    const current = await renderApp();
    await act(async () => {
      await current().signIn('student@campusbook.local', 'student12345');
    });

    expect(await loadToken()).toBe('jwt-token');
    expect(current().isAuthenticated).toBe(true);
    expect(current().role).toBe('student');
    expect(current().profile).toMatchObject({
      name: 'Abubakar Sadiq',
      email: 'student@campusbook.local',
      department: 'Computer Science',
      staffOrStudentId: '20551234',
    });
  });

  /**
   * The /me call fills in department + campus ID but is best-effort — a hiccup
   * there shouldn't strand the user on the login screen after a real password
   * check already succeeded.
   */
  it('signIn still authenticates when the follow-up /me call fails', async () => {
    mockLogin.mockResolvedValue({
      token: 'jwt-token',
      fullName: 'Dr. Kwaku Mensah',
      email: 'lecturer@campusbook.local',
      role: 'LECTURER',
    });
    mockGetMe.mockRejectedValue(new Error('network blip'));

    const current = await renderApp();
    await act(async () => {
      await current().signIn('lecturer@campusbook.local', 'lecturer12345');
    });

    expect(current().isAuthenticated).toBe(true);
    expect(current().profile.department).toBe('');
  });

  it('signIn does not authenticate when the credentials are rejected', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    const current = await renderApp();
    await expect(
      act(async () => {
        await current().signIn('student@campusbook.local', 'wrong');
      }),
    ).rejects.toThrow();

    expect(current().isAuthenticated).toBe(false);
    expect(await loadToken()).toBeNull();
  });

  it('signOut clears the token, the persisted session, and resets profile/role', async () => {
    mockLogin.mockResolvedValue({
      token: 'jwt-token',
      fullName: 'Abubakar Sadiq',
      email: 'student@campusbook.local',
      role: 'STUDENT_LEADER',
    });
    mockGetMe.mockResolvedValue({ department: 'CS', staffOrStudentId: '20551234' });

    const current = await renderApp();
    await act(async () => {
      await current().signIn('student@campusbook.local', 'x');
    });
    expect(current().isAuthenticated).toBe(true);

    await act(async () => {
      await current().signOut();
    });

    expect(current().isAuthenticated).toBe(false);
    expect(current().profile.name).toBe('');
    expect(current().role).toBe('student');
    expect(await loadToken()).toBeNull();
    expect(mockSecureStore['campusbook.session']).toBeUndefined();
  });

  /**
   * A 401 anywhere in the app means the token is now stale everywhere — it must
   * force sign-out globally, not just fail the one request that hit it.
   */
  it('a global 401 forces sign-out even without calling signOut', async () => {
    mockLogin.mockResolvedValue({
      token: 'jwt-token',
      fullName: 'Abubakar Sadiq',
      email: 'student@campusbook.local',
      role: 'STUDENT_LEADER',
    });
    mockGetMe.mockResolvedValue({ department: 'CS', staffOrStudentId: '20551234' });

    const current = await renderApp();
    await act(async () => {
      await current().signIn('student@campusbook.local', 'x');
    });
    expect(current().isAuthenticated).toBe(true);
    expect(mockCapturedUnauthorizedHandler).toBeInstanceOf(Function);

    act(() => {
      mockCapturedUnauthorizedHandler?.();
    });

    expect(current().isAuthenticated).toBe(false);
    expect(current().profile.name).toBe('');
    expect(current().role).toBe('student');
    expect(mockSecureStore['campusbook.session']).toBeUndefined();
  });

  it('restores a persisted session on mount without calling signIn', async () => {
    mockSecureStore['campusbook.token'] = 'persisted-token';
    mockSecureStore['campusbook.session'] = JSON.stringify({
      role: 'staff',
      profile: {
        name: 'Dr. Kwaku Mensah',
        email: 'lecturer@campusbook.local',
        department: 'CS',
        staffOrStudentId: '200912345',
      },
    });

    const current = await renderApp();

    expect(current().isBootstrapping).toBe(false);
    expect(current().isAuthenticated).toBe(true);
    expect(current().role).toBe('staff');
    expect(current().profile.name).toBe('Dr. Kwaku Mensah');
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('ignores a persisted token with no matching session data', async () => {
    mockSecureStore['campusbook.token'] = 'orphaned-token';
    // no 'campusbook.session' entry

    const current = await renderApp();

    expect(current().isAuthenticated).toBe(false);
  });
});
