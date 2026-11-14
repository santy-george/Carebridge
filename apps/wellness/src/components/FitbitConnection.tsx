import { useEffect, useState } from 'react';
import {
  disconnectFitbit,
  fetchFitbitConnection,
  startFitbitConnect,
  type FitbitConnection as Connection,
} from '../lib/fitbit';

// Shown only on the member's own record: the Google account belongs to the
// person wearing the watch.
export function FitbitConnection({ memberId }: { memberId: string }) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetchFitbitConnection(memberId)
      .then((c) => {
        if (!ignore) setConnection(c);
      })
      .catch(() => {
        if (!ignore) setError('Could not load your Fitbit connection.');
      });
    return () => {
      ignore = true;
    };
  }, [memberId, reloadKey]);

  // Consent happens in the system browser; re-check when the member comes back.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setReloadKey((k) => k + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await startFitbitConnect(memberId);
    } catch {
      setError('Could not open Google sign-in. Please try again.');
    }
    setBusy(false);
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await disconnectFitbit(memberId);
      setReloadKey((k) => k + 1);
    } catch {
      setError('Could not disconnect. Please try again.');
    }
    setBusy(false);
  };

  if (!connection && !error) return null;

  return (
    <div className="card">
      <div className="card__title">Fitbit</div>
      {connection?.status === 'ok' && (
        <>
          <p>
            <span className="chip2 chip2--ok">Connected</span>
          </p>
          <p className="s">
            Your blood oxygen from Fitbit is added each morning after it is processed.
          </p>
          <button className="btn btn--secondary" type="button" disabled={busy} onClick={disconnect}>
            {busy ? 'Disconnecting…' : 'Disconnect Fitbit'}
          </button>
        </>
      )}
      {connection && connection.status !== 'ok' && (
        <>
          {connection.status === 'needs_reconnect' && (
            <p>
              <span className="chip2 chip2--warn">Needs reconnecting</span>
            </p>
          )}
          {/* Google requires this disclosure in the app, during normal use. */}
          <p className="s">
            Care Bridge Home collects health and fitness data from your Fitbit through Google to
            show your blood oxygen to you, your family and your care team.
          </p>
          <button className="btn btn--primary" type="button" disabled={busy} onClick={connect}>
            {busy
              ? 'Opening Google…'
              : connection.status === 'needs_reconnect'
                ? 'Reconnect Fitbit'
                : 'Connect Fitbit'}
          </button>
        </>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
