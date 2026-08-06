import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Profile } from './Profile';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const upsertCalls: { table: string; payload: unknown; opts: unknown }[] = [];
let upsertError: { message: string } | null = null;

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => builder,
    upsert: (payload: unknown, opts: unknown) => {
      upsertCalls.push({ table, payload, opts });
      return Promise.resolve({ error: upsertError });
    },
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

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Routes>
        <Route path="/profile" element={<Profile />} />
        <Route path="/more" element={<div>More content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Profile', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    upsertCalls.length = 0;
    upsertError = null;
    tableResponses.members = {
      data: {
        full_name: 'Jane Doe',
        date_of_birth: '1954-03-01',
        created_at: '2025-01-15T00:00:00Z',
        care_model: 'self_care',
        plan_level: 'standard',
      },
      error: null,
    };
    tableResponses.medical_profile = { data: null, error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderProfile();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows identity, age, member-since, and tier badge', async () => {
    renderProfile();
    expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
    expect(screen.getByText(/years old · member since jan 2025/i)).toBeInTheDocument();
    expect(screen.getByText(/self care · standard/i)).toBeInTheDocument();
  });

  it('prompts to add a health profile when none is on file', async () => {
    renderProfile();
    expect(await screen.findByText(/add your health profile/i)).toBeInTheDocument();
  });

  it('shows the medical summary when a profile exists', async () => {
    tableResponses.medical_profile = {
      data: {
        conditions: ['Diabetes'],
        conditions_other: null,
        allergies: ['Peanuts'],
        notes: null,
      },
      error: null,
    };
    renderProfile();
    expect(await screen.findByText('1 condition · 1 allergy')).toBeInTheDocument();
  });

  it('opens the medical profile sheet and saves selections', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Medical profile Add your health profile' }),
    );
    await user.click(screen.getByRole('button', { name: 'Diabetes' }));
    await user.type(screen.getByLabelText(/allergies/i), 'Peanuts, Penicillin');
    await user.click(screen.getByRole('button', { name: /save medical profile/i }));

    await waitFor(() =>
      expect(upsertCalls).toContainEqual({
        table: 'medical_profile',
        payload: {
          member_id: 'm1',
          conditions: ['Diabetes'],
          conditions_other: null,
          allergies: ['Peanuts', 'Penicillin'],
          notes: null,
        },
        opts: { onConflict: 'member_id' },
      }),
    );
    expect(await screen.findByText('1 condition · 2 allergies')).toBeInTheDocument();
  });

  it('shows an inline error when saving the medical profile fails', async () => {
    upsertError = { message: 'insert failed' };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderProfile();

    await user.click(
      await screen.findByRole('button', { name: 'Medical profile Add your health profile' }),
    );
    await user.click(screen.getByRole('button', { name: /save medical profile/i }));

    expect(await screen.findByText(/couldn.t save your medical profile/i)).toBeInTheDocument();
  });

  it('manage account link goes to /more', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderProfile();

    await user.click(await screen.findByRole('button', { name: /manage account/i }));
    expect(await screen.findByText('More content')).toBeInTheDocument();
  });
});
