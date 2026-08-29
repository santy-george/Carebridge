import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CheckIn } from './CheckIn';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const upsertCalls: { table: string; payload: unknown; opts: unknown }[] = [];
let insertError: { message: string } | null = null;

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      upsert: (payload: unknown, opts: unknown) => {
        upsertCalls.push({ table, payload, opts });
        return Promise.resolve({ error: insertError });
      },
    })),
  },
}));

function todayLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function renderCheckIn() {
  return render(
    <MemoryRouter initialEntries={['/check-in']}>
      <Routes>
        <Route path="/check-in" element={<CheckIn />} />
        <Route path="/" element={<div>Home content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CheckIn', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    upsertCalls.length = 0;
    insertError = null;
  });

  it('upserts the default selections (one row per day) and navigates home', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderCheckIn();

    await user.click(screen.getByRole('button', { name: /save check-in/i }));

    await waitFor(() =>
      expect(upsertCalls).toContainEqual({
        table: 'checkins',
        payload: {
          member_id: 'm1',
          checkin_date: todayLocalDate(),
          mood: 'good',
          sleep: 'good',
          energy: 'medium',
          aches: 'none',
          notes: null,
          wellness_score: 90,
        },
        opts: { onConflict: 'member_id,checkin_date' },
      }),
    );
    expect(await screen.findByText('Home content')).toBeInTheDocument();
  });

  it('saves the picked choices and trimmed note', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderCheckIn();

    // "Low" appears in both the Mood and Energy choice rows; Mood renders first.
    await user.click(screen.getAllByText('Low')[0]);
    await user.type(screen.getByLabelText(/add a note/i), '  feeling tired  ');
    await user.click(screen.getByRole('button', { name: /save check-in/i }));

    await waitFor(() =>
      expect(upsertCalls).toContainEqual({
        table: 'checkins',
        payload: expect.objectContaining({
          mood: 'low',
          notes: 'feeling tired',
        }),
        opts: { onConflict: 'member_id,checkin_date' },
      }),
    );
  });

  it('shows an inline error when the insert fails', async () => {
    insertError = { message: 'insert failed' };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderCheckIn();

    await user.click(screen.getByRole('button', { name: /save check-in/i }));

    expect(await screen.findByText(/couldn.t save your check-in/i)).toBeInTheDocument();
  });
});
