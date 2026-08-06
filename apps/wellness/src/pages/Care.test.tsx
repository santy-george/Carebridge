import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Care } from './Care';
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

describe('Care', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
  });

  it('shows a loading state before the initial fetch resolves', () => {
    render(<Care />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when the coordinator has not added a care team', async () => {
    tableResponses.care_team = { data: [], error: null };
    render(<Care />);
    expect(await screen.findByText(/hasn.t added anyone/i)).toBeInTheDocument();
  });

  it('lists care team members with initials, role, and contact links', async () => {
    tableResponses.care_team = {
      data: [
        { id: 'c1', name: 'Rita Alvarez', role_label: 'Primary nurse', initials: null, phone: '555-0101', email: null },
        { id: 'c2', name: 'Tom Bennett', role_label: 'Care coordinator', initials: 'TB', phone: null, email: 'tom@carebridge.example' },
      ],
      error: null,
    };
    render(<Care />);

    expect(await screen.findByText('Rita Alvarez')).toBeInTheDocument();
    expect(screen.getByText('Primary nurse')).toBeInTheDocument();
    expect(screen.getByText('RA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /call rita alvarez/i })).toHaveAttribute('href', 'tel:555-0101');

    expect(screen.getByText('Tom Bennett')).toBeInTheDocument();
    expect(screen.getByText('TB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /email tom bennett/i })).toHaveAttribute(
      'href',
      'mailto:tom@carebridge.example',
    );
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    tableResponses.care_team = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Care />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
