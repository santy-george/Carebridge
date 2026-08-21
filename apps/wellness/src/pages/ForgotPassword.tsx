import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSubmitting(false);

    if (resetError) {
      setError('Something went wrong sending the reset email. Please try again.');
      return;
    }

    // Always show the same success state regardless of whether the email is
    // registered -- Supabase's API itself doesn't leak account existence, and
    // neither should this screen.
    setSent(true);
  };

  if (sent) {
    return (
      <div className="login">
        <div className="login__art">
          <span className="login__app">
            <svg className="icon">
              <use href="#i-pulse" />
            </svg>
            Wellness App
          </span>
          <h1>Check your email</h1>
          <p>
            If an account exists for {email}, we&apos;ve sent a link to reset the password. It may
            take a few minutes to arrive.
          </p>
        </div>
        <div className="login__foot">
          <span>
            <Link to="/login">Back to sign in</Link>
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
        <h1>Reset your password</h1>
        <p>Enter your account email and we&apos;ll send you a reset link.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="mbtn mbtn--fill mbtn--block" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <div className="login__foot">
        <span>
          Remembered your password? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </div>
  );
}
