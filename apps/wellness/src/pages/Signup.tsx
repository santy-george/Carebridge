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
      setError('Something went wrong creating your account. Please try again.');
      return;
    }

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
