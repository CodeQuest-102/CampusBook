const store: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(store[key] ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    store[key] = value;
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    delete store[key];
    return Promise.resolve();
  }),
}));

import {
  apiFetch,
  ApiError,
  saveToken,
  clearToken,
  loadToken,
  setUnauthorizedHandler,
} from '../client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('apiFetch', () => {
  beforeEach(async () => {
    await clearToken();
    setUnauthorizedHandler(null);
    global.fetch = jest.fn();
  });

  it('attaches the bearer token from storage when auth is required', async () => {
    await saveToken('abc123');
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiFetch('/api/halls');

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer abc123');
  });

  it('omits the Authorization header when auth is false', async () => {
    await saveToken('abc123');
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(200, { ok: true }));

    await apiFetch('/api/auth/login', { auth: false });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('returns undefined for a 204 response without parsing a body', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ status: 204, ok: true, text: () => Promise.resolve('') });

    await expect(apiFetch('/api/notifications/mark-all-read', { method: 'POST' })).resolves.toBeUndefined();
  });

  it('throws ApiError carrying the backend message on a non-2xx response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(400, { message: 'Start time must be before end time' }));

    await expect(apiFetch('/api/bookings', { method: 'POST' })).rejects.toMatchObject({
      status: 400,
      message: 'Start time must be before end time',
    });
  });

  it('falls back to a generic message when the error body has none', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ status: 500, ok: false, text: () => Promise.resolve('') });

    await expect(apiFetch('/api/halls')).rejects.toMatchObject({
      status: 500,
      message: 'Request failed (500)',
    });
  });

  it('wraps a network failure (fetch throwing) as ApiError(0, ...)', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiFetch('/api/halls')).rejects.toMatchObject({ status: 0 });
  });

  /**
   * A proxy or gateway in front of the real backend can return a non-JSON
   * body (an HTML error page, plain text) on failure. This must still come
   * out as an ApiError carrying the real status — not a raw SyntaxError that
   * skips every `e instanceof ApiError` check callers rely on, and loses the
   * status code in the process.
   */
  it('wraps a non-JSON error body as ApiError carrying the real status, not a raw SyntaxError', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 502,
      ok: false,
      text: () => Promise.resolve('<html><body>502 Bad Gateway</body></html>'),
    });

    await expect(apiFetch('/api/halls')).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/api/halls')).rejects.toMatchObject({ status: 502 });
  });

  it('wraps a non-JSON body on an otherwise-2xx response the same way', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      status: 200,
      ok: true,
      text: () => Promise.resolve('not json'),
    });

    await expect(apiFetch('/api/halls')).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/api/halls')).rejects.toMatchObject({ status: 200 });
  });

  /**
   * A 401 is a session-wide event, not just this request's problem: the stored
   * token is stale everywhere, so it must be cleared and the global handler
   * fired — this is what forces the app back to the login screen from any screen.
   */
  it('on 401: clears the stored token and fires the global unauthorized handler', async () => {
    await saveToken('stale-token');
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(401, { message: 'Unauthorized' }));

    await expect(apiFetch('/api/halls')).rejects.toBeInstanceOf(ApiError);
    await expect(apiFetch('/api/halls')).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalled();
    expect(await loadToken()).toBeNull();
  });

  it('does not fire the unauthorized handler for a plain 403', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(403, { message: 'Forbidden' }));

    await expect(apiFetch('/api/halls')).rejects.toMatchObject({ status: 403 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
