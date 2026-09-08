import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StaffProfile } from './StaffProfile';

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};

function mockTable() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(tableResponses.staff_profiles ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn(() => mockTable()) },
}));

function renderPage(id = 's1') {
  return render(
    <MemoryRouter initialEntries={[`/human-resources/${id}`]}>
      <Routes>
        <Route path="/human-resources/:id" element={<StaffProfile />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StaffProfile', () => {
  beforeEach(() => {
    delete tableResponses.staff_profiles;
  });

  it('shows a loading state before the fetch resolves', () => {
    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows a not-found message when no matching row is readable', async () => {
    tableResponses.staff_profiles = { data: null, error: null };
    renderPage();
    expect(await screen.findByText(/not found/i)).toBeInTheDocument();
  });

  it('shows the staff member\'s profile, and payment settings', async () => {
    tableResponses.staff_profiles = {
      data: {
        id: 's1',
        discipline: 'nurse',
        qualification: 'BSc Nursing',
        pcc_status: 'verified',
        experience_years: 8,
        languages: ['Malayalam', 'English'],
        service_area: 'Kakkanad',
        service_radius_km: 10,
        employment_status: 'active',
        rate_type: 'per_visit',
        visit_rate: 400,
        emergency_duty_rate: 600,
        profiles: { full_name: 'Sree Rekha R.' },
      },
      error: null,
    };

    renderPage();

    expect((await screen.findAllByText('Sree Rekha R.')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('BSc Nursing')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Malayalam, English')).toBeInTheDocument();
    expect(screen.getByText('Per visit')).toBeInTheDocument();
    expect(screen.getByText('₹400')).toBeInTheDocument();
    expect(screen.getByText('₹600')).toBeInTheDocument();
  });
});