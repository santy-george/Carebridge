import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, invoke, browserOpen } = vi.hoisted(() => ({
  rpc: vi.fn(),
  invoke: vi.fn(),
  browserOpen: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpc(...a),
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
  },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/browser', () => ({
  Browser: { open: (...a: unknown[]) => browserOpen(...a) },
}));

import { FitbitConnection } from './FitbitConnection';

describe('FitbitConnection', () => {
  beforeEach(() => {
    rpc.mockReset();
    invoke.mockReset();
    browserOpen.mockReset();
  });

  it('offers Connect with the Google disclosure when not connected', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    render(<FitbitConnection memberId="m1" />);
    expect(await screen.findByRole('button', { name: 'Connect Fitbit' })).toBeInTheDocument();
    expect(screen.getByText(/collects health and fitness data/i)).toBeInTheDocument();
  });

  it('opens Google consent in the system browser', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    invoke.mockResolvedValue({ data: { url: 'https://accounts.google.com/x' }, error: null });
    render(<FitbitConnection memberId="m1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Connect Fitbit' }));
    expect(invoke).toHaveBeenCalledWith('google-health-connect', { body: { member_id: 'm1' } });
    await waitFor(() =>
      expect(browserOpen).toHaveBeenCalledWith({ url: 'https://accounts.google.com/x' }),
    );
  });

  it('shows connected state with Disconnect', async () => {
    rpc.mockResolvedValue({
      data: [{ provider: 'google_health', status: 'ok', connected_at: 'x', last_synced_at: null }],
      error: null,
    });
    render(<FitbitConnection memberId="m1" />);
    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect Fitbit' })).toBeInTheDocument();
  });

  it('asks to reconnect when Google access was revoked', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          provider: 'google_health',
          status: 'needs_reconnect',
          connected_at: 'x',
          last_synced_at: null,
        },
      ],
      error: null,
    });
    render(<FitbitConnection memberId="m1" />);
    expect(await screen.findByRole('button', { name: 'Reconnect Fitbit' })).toBeInTheDocument();
    expect(screen.getByText('Needs reconnecting')).toBeInTheDocument();
  });

  it('disconnects and reloads the status', async () => {
    rpc
      .mockResolvedValueOnce({
        data: [
          { provider: 'google_health', status: 'ok', connected_at: 'x', last_synced_at: null },
        ],
        error: null,
      })
      .mockResolvedValue({ data: [], error: null });
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    render(<FitbitConnection memberId="m1" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Disconnect Fitbit' }));
    expect(invoke).toHaveBeenCalledWith('google-health-disconnect', { body: { member_id: 'm1' } });
    expect(await screen.findByRole('button', { name: 'Connect Fitbit' })).toBeInTheDocument();
  });
});
