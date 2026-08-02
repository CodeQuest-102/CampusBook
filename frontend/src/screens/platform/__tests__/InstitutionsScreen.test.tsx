import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import InstitutionsScreen from '../InstitutionsScreen';
import TopBar from '../../../components/TopBar';
import type { InstitutionSummaryResponse } from '../../../api/types';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: (cb: () => void | (() => void)) => {
    const ReactActual = require('react');
    ReactActual.useEffect(() => cb(), []);
  },
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockListInstitutions = jest.fn();
jest.mock('../../../api', () => ({
  platformApi: { listInstitutions: (...args: unknown[]) => mockListInstitutions(...args) },
  ApiError: class ApiError extends Error {},
}));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

async function render() {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <SafeAreaProvider initialMetrics={metrics}>
        <InstitutionsScreen />
      </SafeAreaProvider>,
    );
  });
  return tree;
}

function hasText(tree: renderer.ReactTestRenderer, text: string) {
  return (
    tree.root.findAll((n) => n.type === (Text as any) && String(n.props.children) === text)
      .length > 0
  );
}

const institutions: InstitutionSummaryResponse[] = [
  {
    id: 1,
    name: 'KNUST',
    emailDomain: 'knust.edu.gh',
    tier: 'CAMPUS_PRO',
    hallCount: 6,
    bookingCount: 49,
    userCount: 36,
    createdAt: '2026-07-01T00:00:00',
  },
  {
    id: 2,
    name: 'Ridgeview University',
    emailDomain: 'ridgeview.edu',
    tier: 'FREE',
    hallCount: 0,
    bookingCount: 0,
    userCount: 5,
    createdAt: '2026-08-01T00:00:00',
  },
];

describe('InstitutionsScreen', () => {
  beforeEach(() => {
    mockListInstitutions.mockReset();
    mockNavigate.mockReset();
  });

  it('shows the empty state when there are no institutions', async () => {
    mockListInstitutions.mockResolvedValue([]);
    const tree = await render();

    expect(hasText(tree, 'No institutions yet. Add the first one to get started.')).toBe(true);
  });

  it('renders each institution with its domain, tier, and usage stats', async () => {
    mockListInstitutions.mockResolvedValue(institutions);
    const tree = await render();

    expect(hasText(tree, 'KNUST')).toBe(true);
    expect(hasText(tree, 'knust.edu.gh')).toBe(true);
    expect(hasText(tree, 'Campus Pro')).toBe(true);
    expect(hasText(tree, '6')).toBe(true);
    expect(hasText(tree, '49')).toBe(true);
    expect(hasText(tree, 'Ridgeview University')).toBe(true);
  });

  it('navigates to CreateInstitution when the add action is pressed', async () => {
    mockListInstitutions.mockResolvedValue([]);
    const tree = await render();

    act(() => {
      tree.root.findByType(TopBar).props.onRight();
    });

    expect(mockNavigate).toHaveBeenCalledWith('CreateInstitution');
  });
});
