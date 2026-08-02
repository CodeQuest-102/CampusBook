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
   * The gap this closes: switching roles used to truncate the ID to the new
   * role's length instead of clearing it, so a 9-digit staff ID switched to
   * student silently became a same-length-but-wrong 8-digit "student ID" —
   * never the user's actual one, yet indistinguishable from a valid entry.
   */
  it('clears the campus ID when switching to a role whose ID is shorter, instead of truncating it', () => {
    const tree = render();
    pressRoleChip(tree, 'Lecturer');
    act(() => {
      idField(tree).props.onChangeText('200912345');
    });
    expect(idField(tree).props.value).toBe('200912345');

    pressRoleChip(tree, 'Student Leader');

    expect(idField(tree).props.value).toBe('');
    expect(idField(tree).props.label).toBe('Student ID');
  });

  it('leaves an ID untouched when switching to a role whose ID is the same or a longer length', () => {
    const tree = render();
    // Default role is student (8 digits); type a too-short, still-in-progress id.
    act(() => {
      idField(tree).props.onChangeText('2055');
    });

    pressRoleChip(tree, 'Lecturer');

    // 4 digits doesn't exceed staff's 9-digit cap, so nothing was corrupted —
    // it's still incomplete, but that's what the field's own validation is for.
    expect(idField(tree).props.value).toBe('2055');
  });
});
