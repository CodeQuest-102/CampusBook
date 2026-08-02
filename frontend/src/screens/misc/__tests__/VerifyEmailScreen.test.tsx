import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VerifyEmailScreen from '../VerifyEmailScreen';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';

const mockCompleteVerification = jest.fn();
jest.mock('../../../navigation/AppContext', () => ({
  useApp: () => ({ completeVerification: mockCompleteVerification }),
}));

const mockVerifyEmail = jest.fn();
const mockResendVerification = jest.fn();
jest.mock('../../../api', () => ({
  authApi: {
    verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args),
    resendVerification: (...args: unknown[]) => mockResendVerification(...args),
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
const route = { params: { emailOrId: 'new.student@knust.edu.gh' } } as any;

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

let mounted: renderer.ReactTestRenderer | undefined;

function render() {
  act(() => {
    mounted = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <VerifyEmailScreen navigation={navigation} route={route} />
      </SafeAreaProvider>,
    );
  });
  return mounted!;
}

function otpField(tree: renderer.ReactTestRenderer) {
  return tree.root.findAllByType(TextField).find((n) => n.props.label === '6-digit code')!;
}

function pressButton(tree: renderer.ReactTestRenderer, title: string) {
  const button = tree.root.findAllByType(Button).find((n) => n.props.title === title)!;
  act(() => {
    button.props.onPress();
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('VerifyEmailScreen', () => {
  beforeEach(() => {
    mockCompleteVerification.mockReset();
    mockVerifyEmail.mockReset();
    mockResendVerification.mockReset();
  });

  afterEach(() => {
    // The resend cooldown schedules a setInterval while running; unmount so
    // it's cleared instead of leaking past the test (and the Jest env).
    act(() => {
      mounted?.unmount();
    });
    mounted = undefined;
  });

  it('truncates the OTP field to 6 digits', () => {
    const tree = render();
    act(() => {
      otpField(tree).props.onChangeText('12345678');
    });
    expect(otpField(tree).props.value).toBe('123456');
  });

  it('strips non-digit characters from the OTP field', () => {
    const tree = render();
    act(() => {
      otpField(tree).props.onChangeText('12-34ab');
    });
    expect(otpField(tree).props.value).toBe('1234');
  });

  it('submits the code and completes verification on success', async () => {
    mockVerifyEmail.mockResolvedValue({
      token: 'tok',
      fullName: 'Abubakar Sadiq',
      email: 'new.student@knust.edu.gh',
      role: 'STUDENT_LEADER',
    });

    const tree = render();
    act(() => {
      otpField(tree).props.onChangeText('123456');
    });
    pressButton(tree, 'Verify');
    await flush();

    expect(mockVerifyEmail).toHaveBeenCalledWith({
      emailOrId: 'new.student@knust.edu.gh',
      otp: '123456',
    });
    expect(mockCompleteVerification).toHaveBeenCalledWith({
      token: 'tok',
      fullName: 'Abubakar Sadiq',
      email: 'new.student@knust.edu.gh',
      role: 'STUDENT_LEADER',
    });
  });

  it('surfaces a bad-code error without completing verification', async () => {
    const { ApiError } = require('../../../api');
    mockVerifyEmail.mockRejectedValue(
      new ApiError(401, 'That code is invalid or has expired. Request a new one.'),
    );

    const tree = render();
    act(() => {
      otpField(tree).props.onChangeText('000000');
    });
    pressButton(tree, 'Verify');
    await flush();

    expect(mockCompleteVerification).not.toHaveBeenCalled();
    const errorText = tree.root.findAll(
      (n) =>
        typeof n.props.children === 'string' &&
        n.props.children.includes('invalid or has expired'),
    );
    expect(errorText.length).toBeGreaterThan(0);
  });

  function isResendLabel(children: unknown): children is string {
    return typeof children === 'string' && children.startsWith('Resend code');
  }

  function resendTouchable(tree: renderer.ReactTestRenderer) {
    return tree.root
      .findAllByType(TouchableOpacity as any)
      .find((t) => t.findAllByType(Text as any).some((txt) => isResendLabel(txt.props.children)))!;
  }

  it('resends the code and starts the cooldown', async () => {
    mockResendVerification.mockResolvedValue(undefined);
    const tree = render();

    const textOf = (t: renderer.ReactTestInstance) =>
      t.findAllByType(Text as any).find((txt) => isResendLabel(txt.props.children))!.props.children;

    expect(textOf(resendTouchable(tree))).toBe('Resend code');

    await act(async () => {
      await (resendTouchable(tree).props as any).onPress();
    });

    expect(mockResendVerification).toHaveBeenCalledWith({ emailOrId: 'new.student@knust.edu.gh' });
    expect(textOf(resendTouchable(tree))).toBe('Resend code in 30s');
  });
});
