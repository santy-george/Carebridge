import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { StaffProfile } from './StaffProfile';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
let lastUpdatePayload: unknown = null;

function mockTable() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    update: (payload: unknown) => {
      lastUpdatePayload = payload;
      return builder;
    },
    maybeSingle: () =>
      Promise.resolve(tableResponses.staff_profiles ?? { data: null, error: null }),
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

const SAMPLE_STAFF = {
  id: 's1',
  discipline: 'nurse' as const,
  qualification: 'BSc Nursing',
  pcc_status: 'verified' as const,
  experience_years: 8,
  languages: ['Malayalam', 'English'],
  service_area: 'Kakkanad',
  service_radius_km: 10,
  employment_status: 'active' as const,
  rate_type: 'per_visit' as const,
  visit_rate: 400,
  emergency_duty_rate: 600,
  profiles: { full_name: 'Sree Rekha R.' },
};

describe('StaffProfile', () => {
  beforeEach(() => {
    delete tableResponses.staff_profiles;
    lastUpdatePayload = null;
    vi.mocked(useAuth).mockReturnValue({ isAdmin: false } as never);
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

  it("shows the staff member's profile, and payment settings", async () => {
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

  it('hides the Edit action for a non-admin coordinator', async () => {
    tableResponses.staff_profiles = { data: SAMPLE_STAFF, error: null };
    renderPage();
    await screen.findAllByText('Sree Rekha R.');
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('lets an admin edit and save profile fields', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as never);
    tableResponses.staff_profiles = { data: SAMPLE_STAFF, error: null };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByText('Sree Rekha R.');
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    const qualificationInput = screen.getByLabelText('Qualification');
    await user.clear(qualificationInput);
    await user.type(qualificationInput, 'MSc Nursing');

    tableResponses.staff_profiles = {
      data: { ...SAMPLE_STAFF, qualification: 'MSc Nursing' },
      error: null,
    };
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(supabase.from).toHaveBeenCalledWith('staff_profiles');
    expect(lastUpdatePayload).toMatchObject({ qualification: 'MSc Nursing' });
    expect(await screen.findByText('MSc Nursing')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('shows an error and stays in edit mode when the save fails', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAdmin: true } as never);
    tableResponses.staff_profiles = { data: SAMPLE_STAFF, error: null };
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderPage();

    await screen.findAllByText('Sree Rekha R.');
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    tableResponses.staff_profiles = { data: null, error: { message: 'network error' } };
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});
