import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SignUpScreen from '../SignUpScreen';
import TextField from '../../components/TextField';
import Button from '../../components/Button';

const mockSignUp = jest.fn();
jest.mock('../../navigation/AppContext', () => ({ useApp: () => ({ signUp: mockSignUp }) }));

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function render() {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <SignUpScreen navigation={navigation} route={{} as any} />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function idField(tree: renderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(TextField)
    .find((n) => n.props.label === 'Student ID' || n.props.label === 'Staff ID')!;
}

function pressRoleChip(tree: renderer.ReactTestRenderer, label: 'Student Leader' | 'Lecturer') {
  // `as any`: a nested @types/react version under react-test-renderer doesn't
  // line up with the project's, so raw RN primitives fail findAllByType's
  // ElementType constraint at the type level only — this is unaffected at runtime.
  const chip = tree.root
    .findAllByType(TouchableOpacity as any)
    .find((t) => t.findAllByType(Text as any).some((txt) => txt.props.children === label));
  act(() => {
    (chip!.props as { onPress: () => void }).onPress();
  });
}

function fieldByLabel(tree: renderer.ReactTestRenderer, label: string) {
  return tree.root.findAllByType(TextField).find((n) => n.props.label === label)!;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SignUpScreen', () => {
  beforeEach(() => {
    mockSignUp.mockReset();
    navigation.navigate.mockReset();
  });

  /**
   * After a successful sign-up the account still can't log in — its email
   * needs verifying first — so this must land on VerifyEmail, not the
   * authenticated app.
   */
  it('navigates to VerifyEmail with the submitted address after a successful sign-up', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const tree = render();

    act(() => {
      fieldByLabel(tree, 'Full Name').props.onChangeText('Abubakar Sadiq');
      fieldByLabel(tree, 'Email Address').props.onChangeText('new.student@knust.edu.gh');
      idField(tree).props.onChangeText('20551234');
      fieldByLabel(tree, 'Password').props.onChangeText('password1');
      fieldByLabel(tree, 'Confirm Password').props.onChangeText('password1');
    });

    const submit = tree.root.findAllByType(Button).find((n) => n.props.title === 'Sign Up')!;
    act(() => {
      submit.props.onPress();
    });
    await flush();

    expect(mockSignUp).toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith('VerifyEmail', {
      emailOrId: 'new.student@knust.edu.gh',
    });
  });

  /**
   * Institution-issued IDs have no fixed format anymore (CAMPUS_ID_LENGTH is 0
   * for every self-registerable role), so switching roles has nothing to
   * truncate or clear — a typed ID survives the switch untouched. This used to
   * auto-clear a same-length-but-now-wrong value when the two roles had
   * different digit counts; that whole code path only fires again if a future
   * role sets a length back on CAMPUS_ID_LENGTH.
   */
  it('leaves a typed campus ID untouched when switching roles', () => {
    const tree = render();
    act(() => {
      idField(tree).props.onChangeText('20551234');
    });
    expect(idField(tree).props.value).toBe('20551234');

    pressRoleChip(tree, 'Lecturer');

    expect(idField(tree).props.value).toBe('20551234');
    expect(idField(tree).props.label).toBe('Staff ID');
  });
});
