import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TouchableOpacity, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SignUpScreen from '../SignUpScreen';
import TextField from '../../components/TextField';

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

describe('SignUpScreen', () => {
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
