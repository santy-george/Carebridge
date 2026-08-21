import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';

export function ResetPassword() {
  const { session, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError('Something went wrong updating your password. Please try again.');
      return;
    }

    navigate('/');
  };

  if (loading) {
    return (
      <main className="content">
        <p className="t-body-m">Loading…</p>
      </main>
    );
  }

  // A recovery link exchanges its code for a real session on load (see
  // AuthProvider) -- no session here means the link was invalid, expired, or
  // this page was reached directly rather than via a real reset email.
  if (!session) {
    return (
      <div className="login">
        <div className="login__art">
          <span className="login__app">
            <svg className="icon">
              <use href="#i-pulse" />
            </svg>
            Wellness App
          </span>
          <h1>Link expired</h1>
          <p>This password reset link is invalid or has expired. Request a new one to continue.</p>
        </div>
        <div className="login__foot">
          <span>
            <Link to="/forgot-password">Request a new link</Link>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login__art">
        <span className="login__app">
          <svg className="icon">
            <use href="#i-pulse" />
          </svg>
          Wellness App
        </span>
        <h1>Set a new password</h1>
        <p>Choose a new password for your account.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="field">
          <label htmlFor="reset-password-confirm">Confirm new password</label>
          <input
            id="reset-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="mbtn mbtn--fill mbtn--block" type="submit" disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
