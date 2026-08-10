import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

type Status = 'confirm' | 'submitting' | 'error';
type Scope = 'self' | 'all';

export function WithdrawConsent() {
  const { selectedMemberId, memberLinks } = useAuth();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>('self');
  const [confirmText, setConfirmText] = useState('');
  const [status, setStatus] = useState<Status>('confirm');

  const selectedLink = memberLinks.find((link) => link.memberId === selectedMemberId);
  const isSelf = selectedLink?.isSelf ?? false;
  const canSubmit = confirmText.trim().toUpperCase() === 'WITHDRAW';

  const handleWithdraw = async () => {
    if (!selectedMemberId || !canSubmit) return;
    setStatus('submitting');
    const { error: rpcError } = await supabase.rpc('request_consent_withdrawal', {
      p_member_id: selectedMemberId,
      p_scope: scope,
    });
    if (rpcError) {
      setStatus('error');
      return;
    }
    await supabase.auth.signOut();
    navigate('/consent-withdrawn', { replace: true });
  };

  return (
    <>
      <div className="tbar">
        <Link className="backbtn" to="/profile" aria-label="Back to profile">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Withdraw consent</h1>
        </div>
      </div>

      <div className="vbody has-cta">
        <p>
          Withdrawing consent stops Care Bridge Home and your care team from receiving your health
          updates.
          {isSelf &&
            ' Because this is your own record, it also pauses monitoring for anyone linked to your account.'}{' '}
          This can&apos;t be undone in the app — you&apos;d need to contact your coordinator to
          resume.
        </p>

        <div className="field field--full" style={{ marginTop: '16px' }}>
          <label>What should be withdrawn?</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input
              type="radio"
              name="withdraw-scope"
              value="self"
              checked={scope === 'self'}
              onChange={() => setScope('self')}
            />
            Just remove my own access
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
            <input
              type="radio"
              name="withdraw-scope"
              value="all"
              checked={scope === 'all'}
              onChange={() => setScope('all')}
            />
            Withdraw for everyone linked to this record
          </label>
        </div>

        <div className="field field--full" style={{ marginTop: '16px' }}>
          <label htmlFor="confirm-text">Type WITHDRAW to confirm</label>
          <input
            id="confirm-text"
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </div>

        {status === 'error' && (
          <p className="form-error" role="alert">
            Something went wrong submitting your request — try again.
          </p>
        )}
      </div>

      <div className="cta-bar">
        <button
          type="button"
          className="mbtn mbtn--danger mbtn--block"
          disabled={!canSubmit || status === 'submitting'}
          onClick={handleWithdraw}
        >
          {status === 'submitting' ? 'Submitting…' : 'Withdraw consent'}
        </button>
        <Link to="/profile">
          <button
            type="button"
            className="mbtn mbtn--ghost mbtn--block"
            style={{ marginTop: '8px' }}
          >
            Cancel
          </button>
        </Link>
      </div>
    </>
  );
}
