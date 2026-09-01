import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Care } from './Care';
import { useAuth } from '../auth/useAuth';
import { loadDraft, saveDraft } from '../lib/draftForm';

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }));

const tableResponses: Record<string, { data: unknown; error: unknown }> = {};
const singleResponses: Record<string, { data: unknown; error: unknown }> = {};
const insertCalls: { table: string; payload: unknown }[] = [];
const rpcCalls: { fn: string; args: unknown }[] = [];
let rpcResponse: { data: unknown; error: unknown } = { data: null, error: null };

function mockTable(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    single: () => Promise.resolve(singleResponses[table] ?? { data: null, error: null }),
    insert: (payload: unknown) => {
      insertCalls.push({ table, payload });
      return builder;
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(tableResponses[table] ?? { data: null, error: null }),
  };
  return builder;
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => mockTable(table)),
    rpc: vi.fn((fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return Promise.resolve(rpcResponse);
    }),
  },
}));

describe('Care', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ selectedMemberId: 'm1' } as never);
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
    for (const key of Object.keys(singleResponses)) delete singleResponses[key];
    insertCalls.length = 0;
    rpcCalls.length = 0;
    rpcResponse = { data: null, error: null };
    tableResponses.member_links = { data: [], error: null };
    localStorage.clear();
  });

  it('shows a loading state before the initial fetch resolves', () => {
    render(<Care />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows an empty state when there is no care team yet', async () => {
    tableResponses.care_team = { data: [], error: null };
    render(<Care />);
    expect(await screen.findByText(/no one on your care team yet/i)).toBeInTheDocument();
  });

  it('lists care team members with initials, role, and contact links', async () => {
    tableResponses.care_team = {
      data: [
        {
          id: 'c1',
          name: 'Rita Alvarez',
          role_label: 'Primary nurse',
          initials: null,
          phone: '555-0101',
          email: null,
        },
        {
          id: 'c2',
          name: 'Tom Bennett',
          role_label: 'Care coordinator',
          initials: 'TB',
          phone: null,
          email: 'tom@carebridge.example',
        },
      ],
      error: null,
    };
    render(<Care />);

    expect(await screen.findByText('Rita Alvarez')).toBeInTheDocument();
    expect(screen.getByText('Primary nurse')).toBeInTheDocument();
    expect(screen.getByText('RA')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /call rita alvarez/i })).toHaveAttribute(
      'href',
      'tel:555-0101',
    );

    expect(screen.getByText('Tom Bennett')).toBeInTheDocument();
    expect(screen.getByText('TB')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /message tom bennett/i })).toHaveAttribute(
      'href',
      'mailto:tom@carebridge.example',
    );
  });

  it('shows a dismissible error banner when the fetch fails', async () => {
    tableResponses.care_team = { data: null, error: { message: 'network error' } };
    const user = userEvent.setup();
    render(<Care />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('adds a care team member through the sheet', async () => {
    tableResponses.care_team = { data: [], error: null };
    singleResponses.care_team = {
      data: {
        id: 'c3',
        name: 'Dr. Priya Menon',
        role_label: 'Primary physician',
        initials: null,
        phone: null,
        email: null,
      },
      error: null,
    };
    const user = userEvent.setup();
    render(<Care />);

    await user.click(await screen.findByText('+ Add'));
    await user.type(screen.getByLabelText(/^name$/i), 'Dr. Priya Menon');
    await user.type(screen.getByLabelText(/description \/ role/i), 'Primary physician');
    await user.click(screen.getByRole('button', { name: /save care member/i }));

    await waitFor(() =>
      expect(insertCalls).toContainEqual({
        table: 'care_team',
        payload: {
          member_id: 'm1',
          name: 'Dr. Priya Menon',
          role_label: 'Primary physician',
          phone: null,
          email: null,
          address: null,
          notes: null,
        },
      }),
    );
    expect(await screen.findByText('Dr. Priya Menon')).toBeInTheDocument();
  });

  it('shows an empty state and lists Family Circle members with permission chips', async () => {
    tableResponses.care_team = { data: [], error: null };
    tableResponses.member_links = {
      data: [
        { id: 'l1', relationship_label: 'Daughter', permission_level: 'full' },
        { id: 'l2', relationship_label: 'Son', permission_level: 'view' },
      ],
      error: null,
    };
    const { container } = render(<Care />);

    expect(await screen.findByText('Daughter')).toBeInTheDocument();
    expect(screen.getByText('Son')).toBeInTheDocument();
    const chips = Array.from(container.querySelectorAll('.perm')).map((el) => el.textContent);
    expect(chips).toEqual(['Full access', 'View only']);
  });

  it('generates and shows an invite code, then offers to email it', async () => {
    tableResponses.care_team = { data: [], error: null };
    rpcResponse = { data: 'ABCD1234', error: null };
    vi.stubGlobal('location', { href: '' });
    const user = userEvent.setup();
    render(<Care />);

    await user.click(await screen.findByRole('button', { name: /invite family member/i }));
    await user.type(screen.getByLabelText(/relationship/i), 'Daughter');
    await user.click(screen.getByRole('button', { name: 'View only' }));
    await user.click(screen.getByRole('button', { name: /generate code/i }));

    await waitFor(() =>
      expect(rpcCalls).toContainEqual({
        fn: 'create_family_invite',
        args: { p_member_id: 'm1', p_relationship_label: 'Daughter', p_permission_level: 'view' },
      }),
    );
    expect(await screen.findByText('ABCD1234')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /share via email/i }));
    expect(window.location.href).toContain('mailto:');
    expect(window.location.href).toContain('ABCD1234');
    vi.unstubAllGlobals();
  });

  it('restores an unsaved care team draft left over from before the app was backgrounded', async () => {
    tableResponses.care_team = { data: [], error: null };
    saveDraft('care-team-member', {
      careName: 'Dr. Priya Menon',
      careDesc: 'Primary physician',
      carePhone: '',
      careEmail: '',
      careAddress: '',
      careNotes: '',
    });
    const user = userEvent.setup();
    render(<Care />);

    await user.click(await screen.findByText('+ Add'));

    expect(await screen.findByLabelText(/^name$/i)).toHaveValue('Dr. Priya Menon');
    expect(screen.getByLabelText(/description \/ role/i)).toHaveValue('Primary physician');
  });

  it('clears the care team draft once the form is saved', async () => {
    tableResponses.care_team = { data: [], error: null };
    singleResponses.care_team = {
      data: {
        id: 'c3',
        name: 'Dr. Priya Menon',
        role_label: 'Primary physician',
        initials: null,
        phone: null,
        email: null,
      },
      error: null,
    };
    const user = userEvent.setup();
    render(<Care />);

    await user.click(await screen.findByText('+ Add'));
    await user.type(screen.getByLabelText(/^name$/i), 'Dr. Priya Menon');
    await user.click(screen.getByRole('button', { name: /save care member/i }));

    await waitFor(() => expect(loadDraft('care-team-member')).toBeNull());
  });

  it('clears the care team draft when the sheet is closed without saving', async () => {
    tableResponses.care_team = { data: [], error: null };
    const user = userEvent.setup();
    render(<Care />);

    await user.click(await screen.findByText('+ Add'));
    await user.type(screen.getByLabelText(/^name$/i), 'Dr. Priya Menon');
    await waitFor(() => expect(loadDraft('care-team-member')).not.toBeNull());

    await user.click(screen.getAllByRole('button', { name: /close/i })[0]);
    expect(loadDraft('care-team-member')).toBeNull();
  });

  it('reopens the care team sheet left open from before the app was backgrounded', async () => {
    tableResponses.care_team = { data: [], error: null };
    saveDraft('open-sheet:care', 'care');
    saveDraft('care-team-member', {
      careName: 'Dr. Priya Menon',
      careDesc: 'Primary physician',
      carePhone: '',
      careEmail: '',
      careAddress: '',
      careNotes: '',
    });
    render(<Care />);

    expect(await screen.findByLabelText(/^name$/i)).toHaveValue('Dr. Priya Menon');
  });
});
