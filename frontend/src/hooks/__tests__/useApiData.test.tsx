import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useApiData } from '../useApiData';

// useFocusEffect needs a real NavigationContainer to fire; a "run once on
// mount" stand-in is enough for what these tests check.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = require('react');
    ReactActual.useEffect(() => cb(), []);
  },
}));

let hookResult!: ReturnType<typeof useApiData<string>>;

function Harness({ loader }: { loader: () => Promise<string> }) {
  hookResult = useApiData(loader);
  return null;
}

function render(loader: () => Promise<string>) {
  act(() => {
    renderer.create(<Harness loader={loader} />);
  });
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useApiData', () => {
  it('loads on mount and exposes the result', async () => {
    const loader = jest.fn().mockResolvedValue('hello');
    render(loader);
    await flush();

    expect(hookResult.data).toBe('hello');
    expect(hookResult.loading).toBe(false);
    expect(hookResult.error).toBeNull();
  });

  /**
   * The bug this guards against: two overlapping loads (e.g. a rapid
   * blur/refocus) can resolve out of order. Without a request-generation
   * check, whichever resolves *last* wins regardless of which was started
   * last — so a slow earlier response can silently stomp a fresher one.
   */
  it('does not let an out-of-order (superseded) response overwrite a newer one', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const loader = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    render(loader); // load() #1, pending on `first`
    act(() => {
      hookResult.reload(); // load() #2, pending on `second`
    });

    // Resolve the *later* call first — the exact race the guard exists for.
    await act(async () => {
      second.resolve('fresh');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hookResult.data).toBe('fresh');

    await act(async () => {
      first.resolve('stale');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hookResult.data).toBe('fresh');
  });

  it('an error from a superseded request does not clobber a fresher success', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const loader = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    render(loader);
    act(() => {
      hookResult.reload();
    });

    await act(async () => {
      second.resolve('fresh');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hookResult.data).toBe('fresh');
    expect(hookResult.loading).toBe(false);

    await act(async () => {
      first.reject(new Error('too slow'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookResult.data).toBe('fresh');
    expect(hookResult.error).toBeNull();
    expect(hookResult.loading).toBe(false);
  });

  it('refresh() applies its result and still guards against a stale response', async () => {
    const loader = jest.fn().mockResolvedValue('initial');
    render(loader);
    await flush();

    const pending = deferred<string>();
    loader.mockReturnValueOnce(pending.promise);
    act(() => {
      hookResult.refresh();
    });
    expect(hookResult.refreshing).toBe(true);
    expect(hookResult.loading).toBe(false);

    await act(async () => {
      pending.resolve('refreshed');
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(hookResult.data).toBe('refreshed');
    expect(hookResult.refreshing).toBe(false);
  });
});
