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

const mockDownloadAsync = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  downloadAsync: (...args: unknown[]) => mockDownloadAsync(...args),
  cacheDirectory: 'file:///cache/',
}));

import { downloadBookingIcs, downloadMyBookingsIcs } from '../bookings';
import { ApiError, saveToken, clearToken } from '../client';

describe('downloadIcs (via downloadBookingIcs / downloadMyBookingsIcs)', () => {
  beforeEach(async () => {
    await clearToken();
    mockDownloadAsync.mockReset();
  });

  it('attaches the bearer token and returns the local file uri on success', async () => {
    await saveToken('jwt-token');
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/campusbook-booking-42.ics', status: 200 });

    const uri = await downloadBookingIcs(42);

    expect(uri).toBe('file:///cache/campusbook-booking-42.ics');
    const [, , options] = mockDownloadAsync.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer jwt-token');
  });

  /**
   * This bypasses apiFetch entirely (FileSystem.downloadAsync needs a URI,
   * not a fetch Response), so without this check a missing token used to go
   * out with no Authorization header at all and come back as a generic
   * "could not export" — never the clear "please sign in again" apiFetch
   * gives everywhere else, and never even skipping the doomed network call.
   */
  it('throws a clear session-expired error without hitting the network when there is no token', async () => {
    await expect(downloadBookingIcs(42)).rejects.toBeInstanceOf(ApiError);
    await expect(downloadBookingIcs(42)).rejects.toMatchObject({
      status: 401,
      message: 'Your session has expired. Please log in again.',
    });
    expect(mockDownloadAsync).not.toHaveBeenCalled();
  });

  it('throws ApiError on a non-2xx download status', async () => {
    await saveToken('jwt-token');
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/x.ics', status: 404 });

    await expect(downloadMyBookingsIcs()).rejects.toMatchObject({
      status: 404,
      message: 'Could not export this booking to your calendar.',
    });
  });
});
