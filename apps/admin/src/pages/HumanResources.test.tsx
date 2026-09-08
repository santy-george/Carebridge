import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { HumanResources } from './HumanResources';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    order: () => builder,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(tableResponses[table] ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn((table: string) => mockTable(table)) },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <HumanResources />
    </MemoryRouter>,
  );
}

describe('HumanResources', () => {
  beforeEach(() => {
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    tableResponses.staff_profiles = { data: [], error: null };
  });

  it('shows a loading state before the initial fetch resolves', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state with no staff', async () => {
    renderPage();
    expect(await screen.findByText(/no staff on file yet/i)).toBeInTheDocument();
  });

  it('lists a staff member with discipline, PCC status, service area, and employment status', async () => {
    tableResponses.staff_profiles = {
      data: [
        {
          id: 's1',
          discipline: 'nurse',
          qualification: 'BSc Nursing',
          pcc_status: 'verified',
          service_area: 'Kakkanad',
          employment_status: 'active',
          profiles: { full_name: 'Sree Rekha R.' },
        },
      ],
      error: null,
    };

    renderPage();

    expect(await screen.findByText('Sree Rekha R.')).toBeInTheDocument();
    expect(screen.getByText('Nurse')).toBeInTheDocument();
    expect(screen.getByText('BSc Nursing')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Kakkanad')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);
  });

  it('shows a real total-staff count in the metric row, and active/inactive breakdown', async () => {
    tableResponses.staff_profiles = {
      data: [
        { id: 's1', discipline: 'nurse', qualification: null, pcc_status: 'verified', service_area: null, employment_status: 'active', profiles: { full_name: 'A' } },
        { id: 's2', discipline: 'caregiver', qualification: null, pcc_status: 'pending', service_area: null, employment_status: 'inactive', profiles: { full_name: 'B' } },
      ],
      error: null,
    };

    renderPage();

    expect(await screen.findByText('2')).toBeInTheDocument(); // Total staff
    expect(screen.getAllByText('1')).toHaveLength(2); // Active: 1, Inactive: 1
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    tableResponses.staff_profiles = { data: null, error: { message: 'network error' } };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});