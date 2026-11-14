import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Visit } from '../lib/visits';

const mocks = vi.hoisted(() => ({
  fetchMyVisits: vi.fn(),
  fetchVisitReport: vi.fn(),
  checkInVisit: vi.fn(),
  checkOutVisit: vi.fn(),
  saveVisitReport: vi.fn(),
  getPosition: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/geo', () => ({ getPosition: mocks.getPosition }));
vi.mock('../lib/visits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/visits')>()),
  fetchMyVisits: mocks.fetchMyVisits,
  fetchVisitReport: mocks.fetchVisitReport,
  checkInVisit: mocks.checkInVisit,
  checkOutVisit: mocks.checkOutVisit,
  saveVisitReport: mocks.saveVisitReport,
}));

import { VisitDetail } from './VisitDetail';

function visit(overrides: Partial<Visit> = {}): Visit {
  return {
    id: 'v1',
    member_id: 'm1',
    member_name: 'Test Member',
    member_phone: '9999999999',
    member_address: '1 Test Road',
    member_location: 'Ernakulam',
    conditions: ['diabetes'],
    allergies: ['penicillin'],
    service_type: 'Nursing visit',
    scheduled_start: '2026-11-15T04:00:00.000Z',
    scheduled_end: '2026-11-15T05:00:00.000Z',
    status: 'scheduled',
    checkin_at: null,
    checkout_at: null,
    report_submitted: false,
    ...overrides,
  };
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/visits/v1']}>
      <Routes>
        <Route path="/visits/:id" element={<VisitDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VisitDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPosition.mockResolvedValue({ lat: 9.98, lng: 76.28 });
    mocks.fetchVisitReport.mockResolvedValue(null);
  });

  it('shows member info, conditions and allergies', async () => {
    mocks.fetchMyVisits.mockResolvedValue([visit()]);
    renderDetail();
    expect(await screen.findByText('Test Member')).toBeInTheDocument();
    expect(screen.getByText(/diabetes/)).toBeInTheDocument();
    expect(screen.getByText(/penicillin/)).toBeInTheDocument();
  });

  it('checks in with the GPS position, then reloads', async () => {
    mocks.fetchMyVisits
      .mockResolvedValueOnce([visit()])
      .mockResolvedValueOnce([visit({ status: 'in_progress' })]);
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    expect(mocks.checkInVisit).toHaveBeenCalledWith('v1', { lat: 9.98, lng: 76.28 });
    expect(await screen.findByText('Visit report')).toBeInTheDocument();
  });

  it('still checks in when GPS is unavailable', async () => {
    mocks.getPosition.mockResolvedValue(null);
    mocks.fetchMyVisits.mockResolvedValue([visit()]);
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    expect(mocks.checkInVisit).toHaveBeenCalledWith('v1', null);
  });

  it('submits the report with blank vitals as null, not zero', async () => {
    mocks.fetchMyVisits.mockResolvedValue([visit({ status: 'in_progress' })]);
    renderDetail();
    await userEvent.type(await screen.findByLabelText(/Pulse/), '72');
    await userEvent.type(screen.getByLabelText('Notes'), 'All well');
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }));
    await waitFor(() => expect(mocks.saveVisitReport).toHaveBeenCalled());
    const [id, report, submit] = mocks.saveVisitReport.mock.calls[0]!;
    expect(id).toBe('v1');
    expect(report).toMatchObject({ pulse: 72, spo2: null, bpSystolic: null, notes: 'All well' });
    expect(submit).toBe(true);
  });

  it('offers check-out only after the report is submitted', async () => {
    mocks.fetchMyVisits.mockResolvedValue([
      visit({ status: 'in_progress', report_submitted: true }),
    ]);
    renderDetail();
    expect(await screen.findByRole('button', { name: 'Check out' })).toBeInTheDocument();
    expect(screen.queryByText('Visit report')).not.toBeInTheDocument();
  });

  it('shows an error and stays on the screen when check-in fails', async () => {
    mocks.fetchMyVisits.mockResolvedValue([visit()]);
    mocks.checkInVisit.mockRejectedValue(new Error('visit_not_checkable_in'));
    renderDetail();
    await userEvent.click(await screen.findByRole('button', { name: 'Check in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Check-in failed');
  });
});
