import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    setSubmitting(false);

    if (signUpError) {
      // With this project's actual V1 setting ("Confirm email" OFF), a
      // duplicate signup returns a real error -- HTTP 422 with
      // error_code "user_already_exists" (surfaced by supabase-js as
      // `.code`), message "User already registered". Check that first;
      // fall back to matching the message text in case of an SDK version
      // where `.code` isn't populated.
      const isDuplicateEmail =
        signUpError.code === 'user_already_exists' ||
        /already registered/i.test(signUpError.message);

      if (isDuplicateEmail) {
        setError('An account already exists for this email — sign in instead.');
        return;
      }

      setError('Something went wrong creating your account. Please try again.');
      return;
    }

    // Secondary fallback: with "Confirm email" enabled (not this project's
    // current setting), a duplicate signup instead succeeds with an empty
    // `identities` array rather than an error. Harmless to keep checking.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setError('An account already exists for this email — sign in instead.');
      return;
    }

    navigate('/link-member');
  };

  return (
    <div className="login">
      <div className="login__art">
        <span className="login__app">
          <svg className="icon">
            <use href="#i-pulse" />
          </svg>
          Wellness App
        </span>
        <h1>Create your account</h1>
        <p>Sign up to link your family&apos;s Care Bridge Home account.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && (
          <p className="t-body-m" style={{ color: 'var(--danger-text)' }} role="alert">
            {error}
          </p>
        )}
        <button className="mbtn mbtn--fill mbtn--block" type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Sign up'}
        </button>
      </form>
      <div className="login__foot">
        <span>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      </div>
    </div>
  );
}
