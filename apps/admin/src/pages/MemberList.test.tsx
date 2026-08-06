import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemberList } from './MemberList';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
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

function renderList() {
  return render(
    <MemoryRouter>
      <MemberList />
    </MemoryRouter>,
  );
}

describe('MemberList', () => {
  beforeEach(() => {
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    tableResponses.members = { data: [], error: null };
    tableResponses.care_assignments = { data: [], error: null };
    tableResponses.profiles = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderList();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state with no assigned members', async () => {
    renderList();
    expect(await screen.findByText(/no members assigned to you yet/i)).toBeInTheDocument();
  });

  it('lists a member with care model, plan, district, and assigned staff', async () => {
    tableResponses.members = {
      data: [
        {
          id: 'm1',
          full_name: 'Jane Doe',
          date_of_birth: '1954-03-01',
          gender: 'F',
          location: 'Ernakulam',
          care_model: 'direct_care',
          plan_level: 'premium',
        },
      ],
      error: null,
    };
    tableResponses.care_assignments = {
      data: [{ member_id: 'm1', coordinator_id: 'c1' }],
      error: null,
    };
    tableResponses.profiles = { data: [{ id: 'c1', full_name: 'Priya Nair' }], error: null };

    renderList();

    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Direct Care')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Ernakulam')).toBeInTheDocument();
    expect(screen.getByText('Priya Nair')).toBeInTheDocument();
  });

  it('shows a dismissible error banner when the members fetch fails', async () => {
    tableResponses.members = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderList();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
