import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Records } from './Records';
import { useAuth } from '../auth/useAuth';

function renderRecords() {
  return render(
    <MemoryRouter>
      <Records />
    </MemoryRouter>,
  );
}

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

let documentsData: unknown[];
let documentsError: unknown;
const insertResponses: { data: unknown; error: unknown }[] = [];
const insertCalls: unknown[] = [];
const removeCalls: string[][] = [];
const deleteCalls: string[] = [];
let uploadError: unknown;
let removeError: unknown;
let deleteError: unknown;
let signedUrlResult: { data: unknown; error: unknown };

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== 'documents') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: documentsData, error: documentsError }),
          }),
        }),
        insert: (payload: unknown) => {
          insertCalls.push(payload);
          return {
            select: () => ({
              single: () => Promise.resolve(insertResponses.shift() ?? { data: null, error: null }),
            }),
          };
        },
        delete: () => ({
          eq: (_col: string, id: string) => {
            deleteCalls.push(id);
            return Promise.resolve({ error: deleteError ?? null });
          },
        }),
      };
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ error: uploadError ?? null }),
        remove: (paths: string[]) => {
          removeCalls.push(paths);
          return Promise.resolve({ error: removeError ?? null });
        },
        createSignedUrl: () => Promise.resolve(signedUrlResult),
      }),
    },
  },
}));

describe('Records', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      selectedMemberId: 'm1',
      session: { user: { id: 'u1' } },
    } as never);
    documentsData = [];
    documentsError = null;
    insertResponses.length = 0;
    insertCalls.length = 0;
    removeCalls.length = 0;
    deleteCalls.length = 0;
    uploadError = null;
    removeError = null;
    deleteError = null;
    signedUrlResult = { data: { signedUrl: 'https://example.com/signed' }, error: null };
    window.open = vi.fn();
  });

  it('shows an empty state when there are no records', async () => {
    renderRecords();
    expect(await screen.findByText(/no records uploaded yet/i)).toBeInTheDocument();
  });

  it('lists uploaded documents with category and date', async () => {
    documentsData = [
      {
        id: 'd1',
        category: 'lab_report',
        file_name: 'blood-test.pdf',
        storage_path: 'm1/blood-test.pdf',
        created_at: '2026-08-01T00:00:00Z',
      },
    ];
    renderRecords();
    expect(await screen.findByText('blood-test.pdf')).toBeInTheDocument();
    expect(screen.getByText(/lab report · 1 aug 2026/i)).toBeInTheDocument();
  });

  it('filters the list by category', async () => {
    documentsData = [
      {
        id: 'd1',
        category: 'lab_report',
        file_name: 'blood-test.pdf',
        storage_path: 'm1/blood-test.pdf',
        created_at: '2026-08-01T00:00:00Z',
      },
      {
        id: 'd2',
        category: 'prescription',
        file_name: 'rx.pdf',
        storage_path: 'm1/rx.pdf',
        created_at: '2026-08-02T00:00:00Z',
      },
    ];
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    renderRecords();
    await screen.findByText('blood-test.pdf');

    await user.click(screen.getAllByRole('button', { name: 'Prescription' })[0]);
    expect(screen.queryByText('blood-test.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('rx.pdf')).toBeInTheDocument();
  });

  it('uploads a chosen file and adds it to the list', async () => {
    insertResponses.push({
      data: {
        id: 'd1',
        category: 'other',
        file_name: 'photo.jpg',
        storage_path: 'm1/uuid-photo.jpg',
        created_at: '2026-08-10T00:00:00Z',
      },
      error: null,
    });
    renderRecords();
    await screen.findByText(/no records uploaded yet/i);

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(await screen.findByText('photo.jpg')).toBeInTheDocument();
    expect(insertCalls).toContainEqual(
      expect.objectContaining({ member_id: 'm1', file_name: 'photo.jpg', uploaded_by: 'u1' }),
    );
  });

  it('rejects a file larger than 10MB before uploading', async () => {
    renderRecords();
    await screen.findByText(/no records uploaded yet/i);

    const bigFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.upload(input, bigFile);

    expect(await screen.findByText(/larger than 10mb/i)).toBeInTheDocument();
    expect(insertCalls.length).toBe(0);
  });

  it('shows an error when the storage upload fails', async () => {
    uploadError = { message: 'storage failure' };
    renderRecords();
    await screen.findByText(/no records uploaded yet/i);

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.upload(input, file);

    expect(await screen.findByText(/couldn.t upload that file/i)).toBeInTheDocument();
  });

  it('deletes a document from storage and the table', async () => {
    documentsData = [
      {
        id: 'd1',
        category: 'lab_report',
        file_name: 'blood-test.pdf',
        storage_path: 'm1/blood-test.pdf',
        created_at: '2026-08-01T00:00:00Z',
      },
    ];
    renderRecords();
    await screen.findByText('blood-test.pdf');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /delete blood-test.pdf/i }));

    await waitFor(() => expect(screen.queryByText('blood-test.pdf')).not.toBeInTheDocument());
    expect(removeCalls).toContainEqual(['m1/blood-test.pdf']);
    expect(deleteCalls).toContain('d1');
  });

  it('opens a signed URL when viewing a document', async () => {
    documentsData = [
      {
        id: 'd1',
        category: 'lab_report',
        file_name: 'blood-test.pdf',
        storage_path: 'm1/blood-test.pdf',
        created_at: '2026-08-01T00:00:00Z',
      },
    ];
    renderRecords();
    await screen.findByText('blood-test.pdf');

    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /view blood-test.pdf/i }));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/signed',
        '_blank',
        'noopener,noreferrer',
      ),
    );
  });
});
