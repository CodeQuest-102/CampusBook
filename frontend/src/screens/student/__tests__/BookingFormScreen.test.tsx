import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BookingFormScreen from '../BookingFormScreen';
import Button from '../../../components/Button';
import TextField from '../../../components/TextField';
import { PickerField, PickerSheet } from '../../../components/pickers';
import type { Room } from '../../../data/types';

const mockCreateBooking = jest.fn();
const mockCreateRecurring = jest.fn();
const mockGetAvailability = jest.fn();

jest.mock('../../../api', () => {
  const actual = jest.requireActual('../../../api/adapters');
  return {
    bookingsApi: {
      createBooking: (...args: unknown[]) => mockCreateBooking(...args),
      createRecurring: (...args: unknown[]) => mockCreateRecurring(...args),
    },
    hallsApi: {
      getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
    },
    toLocalDateTimeIso: actual.toLocalDateTimeIso,
    toLocalDateString: actual.toLocalDateString,
    availabilityToSchedule: actual.availabilityToSchedule,
    ApiError: class ApiError extends Error {
      status: number;
      constructor(status: number, message: string) {
        super(message);
        this.status = status;
      }
    },
  };
});

// WheelColumn (inside the time picker) schedules a requestAnimationFrame on
// mount with no cancellation on unmount — harmless in the real app, but under
// Jest it can fire after the environment tears down. Running it synchronously
// here avoids that without touching the component itself.
const originalRaf = global.requestAnimationFrame;
beforeAll(() => {
  global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof global.requestAnimationFrame;
});
afterAll(() => {
  global.requestAnimationFrame = originalRaf;
});

const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() } as any;

const room: Room = {
  id: '2',
  name: 'Room GF1',
  building: 'Science Complex Block',
  floor: '1',
  capacity: 120,
  facilities: [],
  status: 'available',
  description: '',
};

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

// Rendered trees per test, unmounted in afterEach — RoomAvailability's own
// fetch (mocked below) needs to settle and its effect needs to clean up
// before Jest tears the environment down, or a pending .then() lands after
// the environment is gone and crashes the whole run, not just this file.
let renderedTrees: renderer.ReactTestRenderer[] = [];

async function render() {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <BookingFormScreen route={{ params: { room } } as any} navigation={navigation} />
      </SafeAreaProvider>,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  renderedTrees.push(tree);
  return tree;
}

/** Fills in the purpose field so the time-window check is the only thing under test. */
function fillPurpose(tree: renderer.ReactTestRenderer, text: string) {
  const field = tree.root
    .findAllByType(TextField)
    .find((n) => n.props.label === 'Purpose / Event Title');
  act(() => {
    field!.props.onChangeText(text);
  });
}

/** Opens the named time field, drives the picker sheet's callbacks directly (as a
 *  real wheel gesture eventually would), and confirms — without simulating the
 *  scroll gesture itself, which PickerSheet's real component doesn't require here. */
function setTime(tree: renderer.ReactTestRenderer, label: 'Start Time' | 'End Time', value: string) {
  const field = tree.root.findAllByType(PickerField).find((n) => n.props.label === label);
  act(() => {
    field!.props.onPress();
  });

  const sheet = tree.root.findByType(PickerSheet);
  act(() => {
    sheet.props.onTimeChange(value);
  });
  act(() => {
    sheet.props.onDone();
  });
}

function submit(tree: renderer.ReactTestRenderer) {
  const button = tree.root.findAllByType(Button).find((n) => n.props.title === 'Submit Request');
  act(() => {
    button!.props.onPress();
  });
}

function hasText(tree: renderer.ReactTestRenderer, content: string): boolean {
  return tree.root.findAll((node) => node.props.children === content).length > 0;
}

describe('BookingFormScreen', () => {
  beforeEach(() => {
    mockCreateBooking.mockReset();
    mockCreateRecurring.mockReset();
    mockGetAvailability.mockResolvedValue({ hallId: 2, date: '2026-01-01', occupiedSlots: [] });
    navigation.replace.mockReset();
  });

  afterEach(() => {
    act(() => {
      renderedTrees.forEach((t) => t.unmount());
    });
    renderedTrees = [];
  });

  it('defaults to a valid start-before-end window and submits normally', async () => {
    mockCreateBooking.mockResolvedValue({});
    const tree = await render();
    fillPurpose(tree, 'Department Meeting');

    await act(async () => {
      submit(tree);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
    const payload = mockCreateBooking.mock.calls[0][0];
    expect(payload.startTime < payload.endTime).toBe(true);
  });

  /**
   * The gap this closes: previously nothing stopped an end-before-start
   * submission client-side — it only surfaced as an opaque server error
   * after a round trip. Now it's caught inline like every other field.
   */
  it('rejects a submission where the end time is not after the start time, without hitting the API', async () => {
    const tree = await render();
    fillPurpose(tree, 'Department Meeting');
    setTime(tree, 'Start Time', '1:00 PM'); // default end is 12:00 PM — now start > end

    submit(tree);

    expect(hasText(tree, 'End time must be after start time.')).toBe(true);
    expect(mockCreateBooking).not.toHaveBeenCalled();
    expect(mockCreateRecurring).not.toHaveBeenCalled();
  });

  it('rejects a submission where start and end are equal', async () => {
    const tree = await render();
    fillPurpose(tree, 'Department Meeting');
    setTime(tree, 'End Time', '10:00 AM'); // default start is 10:00 AM — now equal

    submit(tree);

    expect(hasText(tree, 'End time must be after start time.')).toBe(true);
    expect(mockCreateBooking).not.toHaveBeenCalled();
  });

  it('clears the time-window error once a valid time is chosen and purpose is filled', async () => {
    mockCreateBooking.mockResolvedValue({});
    const tree = await render();
    fillPurpose(tree, 'Department Meeting');
    setTime(tree, 'Start Time', '1:00 PM');
    submit(tree);
    expect(hasText(tree, 'End time must be after start time.')).toBe(true);

    setTime(tree, 'End Time', '3:00 PM'); // now after the 1:00 PM start

    await act(async () => {
      submit(tree);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockCreateBooking).toHaveBeenCalledTimes(1);
  });

  it('checks the time window before the purpose field', async () => {
    const tree = await render();
    // Purpose left blank *and* the time window is invalid — the time check
    // should win, since it comes first in the form's own layout.
    setTime(tree, 'Start Time', '1:00 PM');

    submit(tree);

    expect(hasText(tree, 'End time must be after start time.')).toBe(true);
  });
});
