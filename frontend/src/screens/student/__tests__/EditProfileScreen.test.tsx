import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TextField from '../../../components/TextField';
import EditProfileScreen from '../EditProfileScreen';

// jest.mock factories are hoisted above these declarations, so the names they
// close over must be `mock`-prefixed.
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));

const mockUpdateMe = jest.fn().mockResolvedValue({});
jest.mock('../../../api', () => ({
  usersApi: { updateMe: (...args: unknown[]) => mockUpdateMe(...args) },
  ApiError: class ApiError extends Error {},
}));

const mockApp = {
  profile: {
    name: 'Abubakar Sadiq',
    email: 'student@campusbook.local',
    department: 'Computer Science',
    staffOrStudentId: '20551234',
  },
  updateProfile: jest.fn(),
  role: 'student' as 'student' | 'staff' | 'admin',
};
jest.mock('../../../navigation/AppContext', () => ({ useApp: () => mockApp }));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

function render() {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <EditProfileScreen />
      </SafeAreaProvider>,
    );
  });
  return tree.root.findAllByType(TextField).map((n) => n.props);
}

describe('EditProfileScreen', () => {
  it('shows the campus ID, labelled for the role and not editable', () => {
    const idField = render().find((p) => p.value === '20551234');
    expect(idField).toBeDefined();
    expect(idField!.label).toBe('Student ID');
    expect(idField!.editable).toBe(false);
  });

  it('labels the field Staff ID for staff', () => {
    mockApp.role = 'staff';
    try {
      expect(render().find((p) => p.value === '20551234')!.label).toBe('Staff ID');
    } finally {
      mockApp.role = 'student';
    }
  });

  it('keeps email and the campus ID read-only, name and department editable', () => {
    const byLabel = Object.fromEntries(render().map((p) => [p.label, p]));
    expect(byLabel['Email Address'].editable).toBe(false);
    expect(byLabel['Student ID'].editable).toBe(false);
    expect(byLabel['Full Name'].onChangeText).toBeInstanceOf(Function);
    expect(byLabel['Department'].onChangeText).toBeInstanceOf(Function);
    // The ID is display-only — no handler that could put it into the save payload.
    expect(byLabel['Student ID'].onChangeText).toBeUndefined();
  });
});
