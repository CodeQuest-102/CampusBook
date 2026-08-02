import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PaymentWebViewScreen from '../PaymentWebViewScreen';
import { ApiError } from '../../../api';

const mockVerifyPayment = jest.fn();
jest.mock('../../../api', () => ({
  subscriptionApi: { verifyPayment: (...args: unknown[]) => mockVerifyPayment(...args) },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

// Captures whatever props the screen hands the WebView, so the test can drive
// its navigation-interception callbacks directly without a real native view.
let mockWebViewProps: Record<string, unknown> = {};
jest.mock('react-native-webview', () => {
  const RN = require('react');
  const { View } = require('react-native');
  return {
    WebView: (props: Record<string, unknown>) => {
      mockWebViewProps = props;
      return RN.createElement(View, { testID: 'webview' });
    },
  };
});

const CALLBACK_URL = 'https://app.campusbook.example/payment/callback';

const route = {
  params: {
    authorizationUrl: 'https://checkout.paystack.com/abc',
    reference: 'CB-1-abc',
    callbackUrl: CALLBACK_URL,
    planName: 'Campus Pro',
  },
} as any;

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function render() {
  act(() => {
    renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <PaymentWebViewScreen route={route} navigation={navigation} />
      </SafeAreaProvider>,
    );
  });
}

/** Lets the promise chain inside `finish()` (verify -> Alert) settle. */
async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('PaymentWebViewScreen', () => {
  beforeEach(() => {
    mockVerifyPayment.mockReset();
    navigation.goBack.mockReset();
    jest.restoreAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('lets ordinary in-checkout navigation through untouched', () => {
    render();

    const allowed = (mockWebViewProps.onShouldStartLoadWithRequest as (req: { url: string }) => boolean)({
      url: 'https://checkout.paystack.com/pay/xyz',
    });

    expect(allowed).toBe(true);
    expect(mockVerifyPayment).not.toHaveBeenCalled();
  });

  /**
   * The core trust property of this screen: it must verify using the reference
   * the *backend* handed it at checkout time (route.params.reference), never
   * something parsed out of the redirect URL — a WebView can be redirected
   * anywhere, so the URL is not a trustworthy source for what to verify.
   */
  it('intercepts the callback URL, blocks the navigation, and verifies with the backend-issued reference', async () => {
    mockVerifyPayment.mockResolvedValue({});
    render();

    let allowed!: boolean;
    act(() => {
      allowed = (mockWebViewProps.onShouldStartLoadWithRequest as (req: { url: string }) => boolean)({
        url: `${CALLBACK_URL}?reference=SOMETHING-ELSE&trxref=SOMETHING-ELSE&status=success`,
      });
    });
    await flush();

    expect(allowed).toBe(false);
    expect(mockVerifyPayment).toHaveBeenCalledWith('CB-1-abc');
    expect(mockVerifyPayment).toHaveBeenCalledTimes(1);
  });

  it('does not verify twice when onNavigationStateChange also fires for the callback', async () => {
    mockVerifyPayment.mockResolvedValue({});
    render();

    act(() => {
      (mockWebViewProps.onShouldStartLoadWithRequest as (req: { url: string }) => boolean)({ url: CALLBACK_URL });
      (mockWebViewProps.onNavigationStateChange as (nav: { url: string }) => void)({ url: CALLBACK_URL });
    });
    await flush();

    expect(mockVerifyPayment).toHaveBeenCalledTimes(1);
  });

  it('ignores the fallback navigation-change hook until the callback is actually hit', () => {
    render();

    act(() => {
      (mockWebViewProps.onNavigationStateChange as (nav: { url: string }) => void)({
        url: 'https://checkout.paystack.com/pay/xyz',
      });
    });

    expect(mockVerifyPayment).not.toHaveBeenCalled();
  });

  it('shows a success alert and navigates back only after the backend confirms the payment', async () => {
    mockVerifyPayment.mockResolvedValue({});
    render();

    act(() => {
      (mockWebViewProps.onShouldStartLoadWithRequest as (req: { url: string }) => boolean)({ url: CALLBACK_URL });
    });
    await flush();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Payment successful',
      "You're now on Campus Pro.",
      expect.any(Array),
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    act(() => buttons[0].onPress());
    expect(navigation.goBack).toHaveBeenCalled();
  });

  /**
   * If Paystack's verify call fails or the payment genuinely didn't go
   * through, the screen must say so plainly — never a success message the
   * tier change didn't actually earn.
   */
  it('shows the backend error and does not claim success when verification fails', async () => {
    mockVerifyPayment.mockRejectedValue(new ApiError(402, 'Payment was not completed.'));
    render();

    act(() => {
      (mockWebViewProps.onShouldStartLoadWithRequest as (req: { url: string }) => boolean)({ url: CALLBACK_URL });
    });
    await flush();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Payment not confirmed',
      'Payment was not completed.',
      expect.any(Array),
    );
    expect(Alert.alert).not.toHaveBeenCalledWith('Payment successful', expect.anything(), expect.anything());
  });

  it('falls back to a generic message when verification fails without an ApiError', async () => {
    mockVerifyPayment.mockRejectedValue(new Error('boom'));
    render();

    act(() => {
      (mockWebViewProps.onShouldStartLoadWithRequest as (req: { url: string }) => boolean)({ url: CALLBACK_URL });
    });
    await flush();

    expect(Alert.alert).toHaveBeenCalledWith(
      'Payment not confirmed',
      'We could not confirm your payment. No change was made.',
      expect.any(Array),
    );
  });
});
