import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

export function LinkMember() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { refreshMemberLinks } = useAuth();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: rpcError } = await supabase.rpc('redeem_invite_code', { p_code: code.trim() });

    setSubmitting(false);

    if (rpcError) {
      setError('That code is invalid or has expired — check with your coordinator.');
      return;
    }

    await refreshMemberLinks();
    navigate('/');
  };

  return (
    <div className="login">
      <div className="login__art">
        <h1>Link your account</h1>
        <p>Enter the invite code your coordinator gave you to connect your account to a member.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="invite-code">Invite code</label>
          <input
            id="invite-code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="mbtn mbtn--fill mbtn--block" type="submit" disabled={submitting}>
          {submitting ? 'Linking…' : 'Link account'}
        </button>
      </form>
    </div>
  );
}
