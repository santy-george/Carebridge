import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError('Incorrect email or password');
      return;
    }

    navigate('/');
  };

  return (
    <main
      className="content"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '380px' }}>
        <h1 className="t-heading-s">Welcome back</h1>
        <p className="t-body-m">Sign in to the coordinator portal.</p>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
        >
          <div className="field">
            <label htmlFor="login-email">Work email</label>
            <div className="control">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="control">
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--primary btn--block" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
