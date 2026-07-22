import React from 'react';
import renderer, { act } from 'react-test-renderer';
import SplashScreen from '../SplashScreen';

// The splash exists to be seen: bootstrapping finishes in ~100ms, so without an
// enforced minimum it flickers past. These tests pin that guarantee down.
describe('SplashScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const advance = (ms: number) => act(() => void jest.advanceTimersByTime(ms));

  it('stays on screen for its full beat even when bootstrapping is instant', () => {
    const onFinish = jest.fn();
    act(() => {
      renderer.create(<SplashScreen canExit onFinish={onFinish} />);
    });

    advance(1500);
    expect(onFinish).not.toHaveBeenCalled();

    // Past the hold, the exit fade runs and only then does it report done.
    advance(1000);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('waits for canExit before starting its exit', () => {
    const onFinish = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SplashScreen canExit={false} onFinish={onFinish} />);
    });

    // Session restore is still in flight — the splash holds regardless of time.
    advance(5000);
    expect(onFinish).not.toHaveBeenCalled();

    act(() => {
      tree.update(<SplashScreen canExit onFinish={onFinish} />);
    });
    advance(1000);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
