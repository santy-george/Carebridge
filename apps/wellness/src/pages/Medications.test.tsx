import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Medications } from './Medications';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const singleResponses: Record<string, { data: unknown; error: unknown }> = {};
const insertCalls: { table: string; payload: unknown }[] = [];
const upsertCalls: { table: string; payload: unknown; opts: unknown }[] = [];

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    maybeSingle: () => builder,
    single: () => Promise.resolve(singleResponses[table] ?? { data: null, error: null }),
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return builder;
    },
    upsert: (payload: unknown, opts: unknown) => {
      upsertCalls.push({ table, payload, opts });
      return Promise.resolve({ error: null });
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

describe('Medications', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    for (const key of Object.keys(singleResponses)) delete singleResponses[key];
    insertCalls.length = 0;
    upsertCalls.length = 0;
    tableResponses.medical_profile = { data: { allergies: ['Peanuts'] }, error: null };
    tableResponses.medications = {
      data: [
        {
          id: 'med1',
          name: 'Metformin',
          dosage: '500mg',
          high_risk: false,
          time_of_day: ['morning'],
        },
        { id: 'med2', name: 'Aspirin', dosage: '75mg', high_risk: true, time_of_day: ['morning'] },
      ],
      error: null,
    };
    tableResponses.medication_logs = {
      data: [{ medication_id: 'med1', time_of_day: 'morning', taken: true }],
      error: null,
    };
    tableResponses.med_stock = {
      data: [
        {
          id: 'stock1',
          name: 'Metformin',
          qty: 4,
          unit: 'tablets',
          doses_per_day: 2,
          high_risk: false,
        },
      ],
      error: null,
    };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    render(<Medications />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows allergies from the medical profile', async () => {
    render(<Medications />);
    expect(await screen.findByText('Peanuts')).toBeInTheDocument();
  });

  it('groups doses under Morning and marks the logged one taken', async () => {
    render(<Medications />);
    expect(await screen.findByText('Aspirin')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /mark metformin morning as not taken/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /mark aspirin morning as taken/i }),
    ).toBeInTheDocument();
  });

  it('shows the low-stock banner when a stock item is running low', async () => {
    render(<Medications />);
    expect(await screen.findByText(/running low on stock/i)).toBeInTheDocument();
    expect(screen.getByText(/metformin runs out in 2 days/i)).toBeInTheDocument();
  });

  it('toggles a dose and upserts the medication log', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Medications />);

    await user.click(await screen.findByRole('button', { name: /mark aspirin morning as taken/i }));

    await waitFor(() =>
      expect(upsertCalls).toContainEqual({
        table: 'medication_logs',
        payload: expect.objectContaining({
          medication_id: 'med2',
          member_id: 'm1',
          time_of_day: 'morning',
          taken: true,
        }),
        opts: { onConflict: 'medication_id,scheduled_date,time_of_day' },
      }),
    );
    expect(
      await screen.findByRole('button', { name: /mark aspirin morning as not taken/i }),
    ).toBeInTheDocument();
  });

  it('adds a medication through the sheet', async () => {
    singleResponses.medications = {
      data: {
        id: 'med3',
        name: 'Vitamin D3',
        dosage: '1 capsule',
        high_risk: false,
        time_of_day: ['noon'],
      },
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Medications />);

    await user.click(await screen.findByRole('button', { name: /add medication/i }));
    await user.type(screen.getByLabelText(/medication name/i), 'Vitamin D3');
    await user.type(screen.getByLabelText(/^dosage$/i), '1 capsule');
    await user.click(screen.getByRole('button', { name: 'Noon' }));
    await user.click(screen.getByRole('button', { name: /save medication/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'medications',
        payload: {
          member_id: 'm1',
          name: 'Vitamin D3',
          dosage: '1 capsule',
          time_of_day: ['noon'],
          high_risk: false,
        },
      }),
    );
    expect(await screen.findByText('Vitamin D3')).toBeInTheDocument();
  });

  it('refills stock through the sheet', async () => {
    singleResponses.med_stock = {
      data: {
        id: 'stock2',
        name: 'Aspirin',
        qty: 30,
        unit: 'tablets',
        doses_per_day: 1,
        high_risk: false,
      },
      error: null,
    };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    render(<Medications />);

    await user.click(await screen.findByRole('button', { name: /refill stock/i }));
    await user.type(screen.getByLabelText(/medicine name/i), 'Aspirin');
    await user.type(screen.getByLabelText(/quantity/i), '30');
    await user.click(screen.getByRole('button', { name: /save to stock/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'med_stock',
        payload: {
          member_id: 'm1',
          name: 'Aspirin',
          qty: 30,
          unit: 'tablets',
          doses_per_day: 1,
          high_risk: false,
        },
      }),
    );
  });
});
