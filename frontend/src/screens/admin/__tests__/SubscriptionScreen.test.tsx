import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SubscriptionScreen from '../SubscriptionScreen';
import Button from '../../../components/Button';
import type { SubscriptionResponse, PlanResponse } from '../../../api/types';

// useApiData loads on focus via @react-navigation's useFocusEffect, which
// needs a real NavigationContainer to fire. Standing the whole screen up
// inside one would drag in the router just to get past this — a plain
// "run once on mount" stand-in is enough for what these tests check.
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = require('react');
    ReactActual.useEffect(() => cb(), []);
  },
}));

const mockGetSubscription = jest.fn();
const mockGetPlans = jest.fn();
const mockCheckout = jest.fn();
const mockUpgrade = jest.fn();

jest.mock('../../../api', () => ({
  subscriptionApi: {
    getSubscription: (...args: unknown[]) => mockGetSubscription(...args),
    getPlans: (...args: unknown[]) => mockGetPlans(...args),
    checkout: (...args: unknown[]) => mockCheckout(...args),
    upgrade: (...args: unknown[]) => mockUpgrade(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;

const plans: PlanResponse[] = [
  { tier: 'FREE', name: 'Free', priceLabel: 'GHS 0/mo', activeHallLimit: 5, monthlyBookingLimit: 20, selfServe: true, features: [] },
  {
    tier: 'CAMPUS_PRO',
    name: 'Campus Pro',
    priceLabel: 'GHS 500/mo',
    activeHallLimit: null,
    monthlyBookingLimit: null,
    selfServe: true,
    features: ['Unlimited rooms'],
  },
  { tier: 'ENTERPRISE', name: 'Enterprise', priceLabel: 'Custom', activeHallLimit: null, monthlyBookingLimit: null, selfServe: false, features: [] },
];

function freeSub(paymentEnabled: boolean): SubscriptionResponse {
  return {
    tier: 'FREE',
    planName: 'Free',
    priceLabel: 'GHS 0/mo',
    analytics: false,
    prioritySupport: false,
    customNotifications: false,
    apiIntegrations: false,
    activeHallLimit: 5,
    monthlyBookingLimit: 20,
    activeHallsUsed: 2,
    monthlyBookingsUsed: 4,
    features: [],
    paymentEnabled,
  };
}

function proSub(): SubscriptionResponse {
  return { ...freeSub(true), tier: 'CAMPUS_PRO', planName: 'Campus Pro', priceLabel: 'GHS 500/mo' };
}

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

async function render() {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <SubscriptionScreen navigation={navigation} route={{} as any} />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function pressButton(tree: renderer.ReactTestRenderer, title: string) {
  const button = tree.root.findAllByType(Button).find((n) => n.props.title === title);
  act(() => {
    button!.props.onPress();
  });
}

/** Presses the button labelled `label` in the most recent Alert.alert call. */
function pressAlertButton(label: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2] as { text: string; onPress?: () => void }[];
  const button = buttons.find((b) => b.text === label);
  act(() => {
    button?.onPress?.();
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SubscriptionScreen', () => {
  beforeEach(() => {
    mockGetSubscription.mockReset();
    mockGetPlans.mockReset();
    mockCheckout.mockReset();
    mockUpgrade.mockReset();
    navigation.navigate.mockReset();
    mockGetPlans.mockResolvedValue(plans);
    jest.restoreAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  /**
   * The load-bearing security property: when Paystack is configured, a paid
   * upgrade must go through checkout + the payment WebView — the tier can
   * only flip after server-side verification there. It must never call the
   * direct `upgrade()` endpoint, which would skip payment entirely.
   */
  it('when payment is enabled, upgrading routes through checkout + PaymentWebView, never a direct upgrade', async () => {
    mockGetSubscription.mockResolvedValue(freeSub(true));
    mockCheckout.mockResolvedValue({
      authorizationUrl: 'https://checkout.paystack.com/abc',
      reference: 'CB-1-abc',
      callbackUrl: 'https://app.campusbook.example/callback',
    });

    const tree = await render();
    pressButton(tree, 'Upgrade to Campus Pro');
    pressAlertButton('Continue to payment');
    await flush();

    expect(mockCheckout).toHaveBeenCalledWith('CAMPUS_PRO');
    expect(mockUpgrade).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('PaymentWebView', {
      authorizationUrl: 'https://checkout.paystack.com/abc',
      reference: 'CB-1-abc',
      callbackUrl: 'https://app.campusbook.example/callback',
      planName: 'Campus Pro',
    });
  });

  it('when payment is disabled, upgrading uses the simulated direct-upgrade call', async () => {
    mockGetSubscription.mockResolvedValue(freeSub(false));
    mockUpgrade.mockResolvedValue(proSub());

    const tree = await render();
    pressButton(tree, 'Upgrade to Campus Pro');
    pressAlertButton('Confirm & Pay');
    await flush();

    expect(mockUpgrade).toHaveBeenCalledWith('CAMPUS_PRO');
    expect(mockCheckout).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('downgrading uses the direct-upgrade call and never shows a payment success alert, even with Paystack on', async () => {
    mockGetSubscription.mockResolvedValue(proSub());
    mockUpgrade.mockResolvedValue(freeSub(true));

    const tree = await render();
    pressButton(tree, 'Switch to Free');
    pressAlertButton('Downgrade');
    await flush();

    expect(mockUpgrade).toHaveBeenCalledWith('FREE');
    expect(mockCheckout).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalledWith('Payment successful', expect.anything());
  });

  it('a failed checkout is surfaced and does not navigate to the payment WebView', async () => {
    mockGetSubscription.mockResolvedValue(freeSub(true));
    const { ApiError } = require('../../../api');
    mockCheckout.mockRejectedValue(new ApiError(500, 'Could not reach the payment provider.'));

    const tree = await render();
    pressButton(tree, 'Upgrade to Campus Pro');
    pressAlertButton('Continue to payment');
    await flush();

    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Could not start payment', 'Could not reach the payment provider.');
  });
});
