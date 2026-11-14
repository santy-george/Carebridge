import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VisitReports } from './VisitReports';

const rpc = vi.fn();
vi.mock('../lib/supabase', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

function renderPage() {
  return render(
    <MemoryRouter>
      <VisitReports />
    </MemoryRouter>,
  );
}

describe('VisitReports', () => {
  beforeEach(() => rpc.mockReset());

  it('shows an empty state', async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    renderPage();
    expect(await screen.findByText(/no submitted reports yet/i)).toBeInTheDocument();
  });

  it('lists a report with vitals and notes', async () => {
    rpc.mockResolvedValue({
      data: [
        {
          visit_id: 'v1',
          member_id: 'm1',
          member_name: 'Asha Menon',
          staff_name: 'Sree Rekha',
          service_type: 'Nursing visit',
          scheduled_start: new Date(2026, 10, 15, 9, 0).toISOString(),
          bp_systolic: 120,
          bp_diastolic: 80,
          pulse: null,
          spo2: 98,
          glucose_mgdl: null,
          temperature_c: null,
          notes: 'Resting well',
          submitted_at: new Date().toISOString(),
        },
      ],
      error: null,
    });
    renderPage();
    expect(await screen.findByText('Asha Menon')).toBeInTheDocument();
    expect(screen.getByText('BP 120/80 · SpO₂ 98%')).toBeInTheDocument();
    expect(screen.getByText('Resting well')).toBeInTheDocument();
  });
});
