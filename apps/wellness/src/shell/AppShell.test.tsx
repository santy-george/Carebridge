import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const selectMaybeSingle = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => selectMaybeSingle()),
      })),
    })),
  },
}));

function renderShell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>Home content</div>} />
          <Route path="/health" element={<div>Health content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    selectMaybeSingle.mockResolvedValue({ data: [], error: null });
  });

  it('renders all 5 bottom nav tabs with correct hrefs', () => {
    renderShell();
    const expected: [string, string][] = [
      ['Summary', '/'],
      ['My Health', '/health'],
      ['My Schedule', '/medications'],
      ['My Care', '/care'],
      ['More', '/more'],
    ];
    for (const [label, href] of expected) {
      const link = screen.getByRole('link', { name: new RegExp(label, 'i') });
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('marks the current route active', () => {
    renderShell('/');
    expect(screen.getByRole('link', { name: /summary/i })).toHaveClass('is-active');
  });

  it('renders the routed child content via Outlet', () => {
    renderShell('/');
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });

  it('links the Emergency icon to /sos and the bell to /medications', () => {
    renderShell();
    expect(screen.getByRole('link', { name: /emergency/i })).toHaveAttribute('href', '/sos');
    expect(screen.getByRole('link', { name: /medications/i })).toHaveAttribute(
      'href',
      '/medications',
    );
  });

  it('shows no low-stock dot when med_stock is empty', async () => {
    renderShell();
    const link = screen.getByRole('link', { name: /medications/i });
    await waitFor(() => expect(link.querySelector('.dot')).not.toBeInTheDocument());
  });

  it('shows the low-stock dot when a stock item is low', async () => {
    selectMaybeSingle.mockResolvedValue({ data: [{ qty: 2, doses_per_day: 1 }], error: null });
    renderShell();
    const link = screen.getByRole('link', { name: /medications/i });
    await waitFor(() => expect(link.querySelector('.dot')).toBeInTheDocument());
  });
});
