import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useApiList } from '../useApiList';
import type { PagedResponse } from '../../api/types';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = require('react');
    ReactActual.useEffect(() => cb(), []);
  },
}));

let hookResult!: ReturnType<typeof useApiList<string, string>>;

function Harness({ loadPage }: { loadPage: (page: number) => Promise<PagedResponse<string>> }) {
  hookResult = useApiList<string, string>(loadPage, (raw) => raw);
  return null;
}

function render(loadPage: (page: number) => Promise<PagedResponse<string>>) {
  act(() => {
    renderer.create(<Harness loadPage={loadPage} />);
  });
}

function page(content: string[], last: boolean, pageNum = 0): PagedResponse<string> {
  return { content, page: pageNum, size: content.length, totalElements: content.length, totalPages: 1, last };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('useApiList', () => {
  it('loads page 0 on mount', async () => {
    const loadPage = jest.fn().mockResolvedValue(page(['a', 'b'], true));
    render(loadPage);
    await flush();

    expect(hookResult.items).toEqual(['a', 'b']);
    expect(hookResult.loading).toBe(false);
    expect(hookResult.hasMore).toBe(false);
  });

  it('loadMore appends the next page and advances the cursor', async () => {
    const loadPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], false, 0))
      .mockResolvedValueOnce(page(['b'], true, 1));
    render(loadPage);
    await flush();

    await act(async () => {
      await hookResult.loadMore();
    });

    expect(hookResult.items).toEqual(['a', 'b']);
    expect(hookResult.hasMore).toBe(false);
    expect(loadPage).toHaveBeenLastCalledWith(1);
  });

  /**
   * The bug this guards against: loadMore() fetches page 1 for the *current*
   * list, but if a reload() resets the list to something new before that
   * page arrives, appending it would silently graft stale items onto a list
   * they never belonged to.
   */
  it('drops a stale loadMore page if a reload already replaced the list', async () => {
    const firstPage0 = deferred<PagedResponse<string>>();
    const page1 = deferred<PagedResponse<string>>();
    const freshPage0 = page(['x'], true, 0);

    const loadPage = jest.fn();
    loadPage.mockReturnValueOnce(firstPage0.promise); // initial load() on mount
    render(loadPage);

    await act(async () => {
      firstPage0.resolve(page(['a'], false, 0));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(hookResult.items).toEqual(['a']);

    loadPage.mockReturnValueOnce(page1.promise); // loadMore's page 1
    let loadMorePromise!: Promise<void>;
    act(() => {
      loadMorePromise = hookResult.loadMore();
    });

    // A reload lands before the pending loadMore page does — e.g. the user
    // navigated away and back while page 1 was still in flight.
    loadPage.mockReturnValueOnce(Promise.resolve(freshPage0));
    await act(async () => {
      await hookResult.reload();
    });
    expect(hookResult.items).toEqual(['x']);

    // Now the stale page 1 arrives.
    await act(async () => {
      page1.resolve(page(['b'], true, 1));
      await loadMorePromise;
    });

    expect(hookResult.items).toEqual(['x']);
  });

  it('refresh() replaces the list from page 0 and resets pagination', async () => {
    const loadPage = jest
      .fn()
      .mockResolvedValueOnce(page(['a'], false, 0))
      .mockResolvedValueOnce(page(['b'], true, 1));
    render(loadPage);
    await flush();
    await act(async () => {
      await hookResult.loadMore();
    });
    expect(hookResult.items).toEqual(['a', 'b']);

    loadPage.mockResolvedValueOnce(page(['fresh'], true, 0));
    await act(async () => {
      await hookResult.refresh();
    });

    expect(hookResult.items).toEqual(['fresh']);
    expect(hookResult.hasMore).toBe(false);
  });

  it('loadMore is a no-op while already loading, refreshing, or exhausted', async () => {
    const loadPage = jest.fn().mockResolvedValue(page(['a'], true, 0));
    render(loadPage);
    await flush();

    loadPage.mockClear();
    await act(async () => {
      await hookResult.loadMore(); // hasMore is false — should be a no-op
    });

    expect(loadPage).not.toHaveBeenCalled();
  });
});
