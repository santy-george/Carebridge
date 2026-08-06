import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Sos } from './Sos';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const insertCalls: { table: string; payload: unknown }[] = [];
let insertError: { message: string } | null = null;

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return Promise.resolve({ error: insertError });
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

function renderSos() {
  return render(
    <MemoryRouter initialEntries={['/sos']}>
      <Routes>
        <Route path="/sos" element={<Sos />} />
        <Route path="/" element={<div>Home content</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Sos', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    insertCalls.length = 0;
    insertError = null;
    tableResponses.care_team = {
      data: [{ id: 'c1', name: 'Rita Alvarez', role_label: 'Primary nurse', initials: null }],
      error: null,
    };
    vi.stubGlobal('navigator', {
      ...navigator,
      geolocation: {
        getCurrentPosition: (success: (pos: unknown) => void) =>
          success({ coords: { latitude: 12.9, longitude: 77.6 } }),
      },
    });
  });

  it('shows the confirmation screen with the care team who will be notified', async () => {
    renderSos();
    expect(screen.getByText(/send an emergency alert/i)).toBeInTheDocument();
    expect(await screen.findByText('Rita Alvarez')).toBeInTheDocument();
    expect(screen.getByText(/primary nurse · will be notified/i)).toBeInTheDocument();
  });

  it('sends the alert with location and shows the sent confirmation', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderSos();

    await user.click(screen.getByRole('button', { name: /confirm — send alert/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'sos_alerts',
        payload: {
          member_id: 'm1',
          alert_type: 'manual',
          location_lat: 12.9,
          location_lng: 77.6,
        },
      }),
    );
    expect(await screen.findByText(/alert sent/i)).toBeInTheDocument();
  });

  it('sends the alert with no location when geolocation is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined });
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderSos();

    await user.click(screen.getByRole('button', { name: /confirm — send alert/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'sos_alerts',
        payload: {
          member_id: 'm1',
          alert_type: 'manual',
          location_lat: null,
          location_lng: null,
        },
      }),
    );
    expect(await screen.findByText(/alert sent/i)).toBeInTheDocument();
  });

  it('shows an inline error and stays on the confirm screen when the insert fails', async () => {
    insertError = { message: 'insert failed' };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderSos();

    await user.click(screen.getByRole('button', { name: /confirm — send alert/i }));

    expect(await screen.findByText(/couldn.t send your alert/i)).toBeInTheDocument();
    expect(screen.queryByText(/alert sent/i)).not.toBeInTheDocument();
  });

  it('cancel navigates back home', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderSos();

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(await screen.findByText('Home content')).toBeInTheDocument();
  });
});
