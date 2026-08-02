import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CreateInstitutionScreen from '../CreateInstitutionScreen';
import TextField from '../../../components/TextField';
import Button from '../../../components/Button';
import SuccessOverlay from '../../../components/SuccessOverlay';

const mockCreateInstitution = jest.fn();
jest.mock('../../../api', () => ({
  platformApi: { createInstitution: (...args: unknown[]) => mockCreateInstitution(...args) },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const navigation = { goBack: jest.fn(), navigate: jest.fn() } as any;

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

let mounted: renderer.ReactTestRenderer | undefined;

function render() {
  act(() => {
    mounted = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <CreateInstitutionScreen navigation={navigation} route={{} as any} />
      </SafeAreaProvider>,
    );
  });
  return mounted!;
}

function fieldByLabel(tree: renderer.ReactTestRenderer, label: string) {
  return tree.root.findAllByType(TextField).find((n) => n.props.label === label)!;
}

function fillValidForm(tree: renderer.ReactTestRenderer) {
  act(() => {
    fieldByLabel(tree, 'Institution Name').props.onChangeText('Legon');
    fieldByLabel(tree, 'Email Domain').props.onChangeText('ug.edu.gh');
    fieldByLabel(tree, 'Full Name').props.onChangeText('Legon Admin');
    fieldByLabel(tree, 'Email Address').props.onChangeText('admin@ug.edu.gh');
    fieldByLabel(tree, 'Staff ID').props.onChangeText('LEGON001');
    fieldByLabel(tree, 'Temporary Password').props.onChangeText('password1');
  });
}

function submit(tree: renderer.ReactTestRenderer) {
  const button = tree.root.findAllByType(Button).find((n) => n.props.title === 'Create Institution')!;
  act(() => {
    button.props.onPress();
  });
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('CreateInstitutionScreen', () => {
  beforeEach(() => {
    mockCreateInstitution.mockReset();
  });

  afterEach(() => {
    // SuccessOverlay schedules a setTimeout while visible; unmount so it's
    // cleared instead of firing after the test (and the Jest env) tear down.
    act(() => {
      mounted?.unmount();
    });
    mounted = undefined;
  });

  it('blocks submission and shows field errors when required fields are blank', () => {
    const tree = render();
    submit(tree);

    expect(mockCreateInstitution).not.toHaveBeenCalled();
    expect(fieldByLabel(tree, 'Institution Name').props.error).toBeTruthy();
    expect(fieldByLabel(tree, 'Email Domain').props.error).toBeTruthy();
  });

  it('rejects an email domain that is not a bare domain', () => {
    const tree = render();
    fillValidForm(tree);
    act(() => {
      fieldByLabel(tree, 'Email Domain').props.onChangeText('not a domain');
    });
    submit(tree);

    expect(mockCreateInstitution).not.toHaveBeenCalled();
    expect(fieldByLabel(tree, 'Email Domain').props.error).toBeTruthy();
  });

  it('submits the trimmed, FREE-tier payload and shows the success overlay', async () => {
    mockCreateInstitution.mockResolvedValue({
      id: 7,
      name: 'Legon',
      emailDomain: 'ug.edu.gh',
      tier: 'FREE',
      hallCount: 0,
      bookingCount: 0,
      userCount: 1,
      createdAt: '2026-08-02T00:00:00',
    });

    const tree = render();
    fillValidForm(tree);
    submit(tree);
    await flush();

    expect(mockCreateInstitution).toHaveBeenCalledWith({
      institutionName: 'Legon',
      emailDomain: 'ug.edu.gh',
      tier: 'FREE',
      adminFullName: 'Legon Admin',
      adminEmail: 'admin@ug.edu.gh',
      adminStaffOrStudentId: 'LEGON001',
      adminPassword: 'password1',
      adminDepartment: undefined,
    });
    expect(tree.root.findByType(SuccessOverlay).props.visible).toBe(true);
  });

  it('surfaces a duplicate-domain error from the server without navigating away', async () => {
    const { ApiError } = require('../../../api');
    mockCreateInstitution.mockRejectedValue(
      new ApiError(400, 'An institution with the domain "ug.edu.gh" already exists.'),
    );

    const tree = render();
    fillValidForm(tree);
    submit(tree);
    await flush();

    const errorText = tree.root.findAll(
      (n) => typeof n.props.children === 'string' && n.props.children.includes('already exists'),
    );
    expect(errorText.length).toBeGreaterThan(0);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
