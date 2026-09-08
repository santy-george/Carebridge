import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { injectIconSprite } from '@carebridge/design-system';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    injectIconSprite();
  }, []);

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
    <div className="auth">
      <div className="auth__art">
        <img src="/cbh-logo.png" alt="Care Bridge Home" />
        <div>
          <h2>Run care operations with calm and clarity.</h2>
          <p>
            Members, SOS alerts and consent — one connected control centre for Care Bridge Home
            coordinators.
          </p>
          <div className="feat">
            <span className="icon">
              <svg>
                <use href="#i-emergency" />
              </svg>
            </span>
            Real-time SOS alert inbox
          </div>
          <div className="feat">
            <span className="icon">
              <svg>
                <use href="#i-members" />
              </svg>
            </span>
            Members, care teams &amp; care models
          </div>
          <div className="feat">
            <span className="icon">
              <svg>
                <use href="#i-shield" />
              </svg>
            </span>
            Consent &amp; data-rights requests
          </div>
        </div>
        <span style={{ opacity: 0.7, fontSize: '13px' }}>© 2026 Care Bridge Home</span>
      </div>
      <div className="auth__form">
        <div className="auth__box">
          <img className="auth__logo" src="/cbh-logo.png" alt="Care Bridge Home" />
          <h1>Welcome back</h1>
          <p className="lead">Sign in to the coordinator portal.</p>
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
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
      </div>
    </div>
  );
}
