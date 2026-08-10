import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { supabase } from '../lib/supabase';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
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

    // Log the consent event given at this exact moment. If this write
    // fails, don't strand a successfully created account -- report to
    // Sentry and let signup proceed regardless.
    if (data.user) {
      // subject_email is a denormalized snapshot of who this consent event
      // was about -- consents.user_id is `on delete set null`, so without it
      // the audit row loses all identity the moment the account is erased.
      // No member_id: nothing is linked yet at signup (and the insert policy
      // now requires member_id to be null for direct client inserts).
      const { error: consentError } = await supabase
        .from('consents')
        .insert({ user_id: data.user.id, event: 'given', subject_email: email });
      if (consentError) {
        Sentry.captureException(consentError);
      }
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
        <div className="field field--full">
          <p style={{ fontSize: '13px', marginBottom: '8px' }}>
            Care Bridge Home will collect and use your name, contact details, medical information,
            vitals, medications, and location during SOS alerts to coordinate your home care. This
            is visible to your linked family members and assigned care coordinator.
          </p>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(event) => setConsentChecked(event.target.checked)}
            />
            <span>
              I agree to Care Bridge Home collecting and using this health and care-coordination
              data as described above.
            </span>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="mbtn mbtn--fill mbtn--block"
          type="submit"
          disabled={submitting || !consentChecked}
        >
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
