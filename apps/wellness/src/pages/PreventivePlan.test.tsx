import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { PreventivePlan } from './PreventivePlan';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(tableResponses[table] ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => mockTable(table)),
  },
}));

function renderPlan() {
  return render(
    <MemoryRouter initialEntries={['/preventive-plan']}>
      <Routes>
        <Route path="/preventive-plan" element={<PreventivePlan />} />
        <Route path="/more" element={<div>More content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PreventivePlan', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    tableResponses.preventive_plan_goals = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderPlan();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when the coordinator has not added goals', async () => {
    renderPlan();
    expect(await screen.findByText(/hasn.t added any goals/i)).toBeInTheDocument();
  });

  it('shows progress and goal list, done vs pending', async () => {
    tableResponses.preventive_plan_goals = {
      data: [
        {
          id: 'g1',
          title: 'Annual flu vaccination',
          icon: 'bandage',
          due_date: '2026-07-31',
          completed_at: '2026-07-02T00:00:00Z',
          completed_note: 'Completed 2 Jul at Riverside Clinic',
        },
        {
          id: 'g2',
          title: 'Annual eye exam',
          icon: 'eye',
          due_date: '2026-07-31',
          completed_at: null,
          completed_note: null,
        },
      ],
      error: null,
    };
    renderPlan();

    expect(await screen.findByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('Annual flu vaccination')).toBeInTheDocument();
    expect(screen.getByText('Completed 2 Jul at Riverside Clinic')).toBeInTheDocument();
    expect(screen.getByText('Annual eye exam')).toBeInTheDocument();
    expect(screen.getByText('Due by 2026-07-31')).toBeInTheDocument();
    // 1 of 2 goals done (50%) is below the 60% "on track" bar.
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
  });

  it('shows On track when completion is at or above 60%', async () => {
    tableResponses.preventive_plan_goals = {
      data: [
        {
          id: 'g1',
          title: 'Annual flu vaccination',
          icon: 'bandage',
          due_date: null,
          completed_at: '2026-07-02T00:00:00Z',
          completed_note: null,
        },
        {
          id: 'g2',
          title: 'Reduce sodium intake',
          icon: 'food',
          due_date: null,
          completed_at: '2026-07-01T00:00:00Z',
          completed_note: null,
        },
        {
          id: 'g3',
          title: 'Annual eye exam',
          icon: 'eye',
          due_date: '2026-07-31',
          completed_at: null,
          completed_note: null,
        },
      ],
      error: null,
    };
    renderPlan();
    expect(await screen.findByText('On track')).toBeInTheDocument();
  });

  it('shows Needs attention when completion is low', async () => {
    tableResponses.preventive_plan_goals = {
      data: [
        {
          id: 'g1',
          title: 'Bone density scan',
          icon: 'lab',
          due_date: null,
          completed_at: null,
          completed_note: null,
        },
      ],
      error: null,
    };
    renderPlan();
    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
  });

  it('back link goes to /more', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPlan();

    await user.click(await screen.findByRole('link', { name: /back to more/i }));
    expect(await screen.findByText('More content')).toBeInTheDocument();
  });
});
