import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="login">
      <div className="login__art">
        <span className="login__app">
          <svg className="icon">
            <use href="#i-pulse" />
          </svg>
          Wellness App
        </span>
        <h1>Welcome back</h1>
        <p>Sign in to see today&apos;s check-in, medications and vitals.</p>
      </div>
      <form className="login__form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="mbtn mbtn--fill mbtn--block" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="login__foot">
        <span>
          No account? <Link to="/signup">Sign up</Link>
        </span>
      </div>
    </div>
  );
}
