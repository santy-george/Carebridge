import { Link } from 'react-router-dom';

export function WithdrawalReceived() {
  return (
    <div
      className="vbody"
      style={{ alignItems: 'center', textAlign: 'center', justifyContent: 'center' }}
    >
      <h2>Request received</h2>
      <p style={{ maxWidth: '280px', margin: '0 auto' }}>
        You&apos;ve been signed out. Your coordinator will contact you to confirm this wasn&apos;t
        accidental before anything is removed.
      </p>
      <Link to="/login">
        <button
          type="button"
          className="mbtn mbtn--ghost mbtn--block"
          style={{ marginTop: '16px' }}
        >
          Back to sign in
        </button>
      </Link>
    </div>
  );
}
