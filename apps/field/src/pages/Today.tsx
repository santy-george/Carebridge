import { useEffect, useState } from 'react';
import { useAuth } from '../auth/useAuth';
import { VisitCard } from '../components/VisitCard';
import { fetchMyVisits, localDayRange, nextVisit, type Visit } from '../lib/visits';

export function Today() {
  const { fullName } = useAuth();
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const { from, to } = localDayRange(new Date());
    fetchMyVisits(from, to)
      .then((rows) => {
        if (isMounted) setVisits(rows);
      })
      .catch(() => {
        if (isMounted) setError(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const firstName = fullName?.split(/\s+/)[0];
  const next = visits ? nextVisit(visits) : null;
  const doneCount = visits?.filter((v) => v.status === 'completed').length ?? 0;

  return (
    <>
      <div className="tbar">
        <div className="tbar__title">
          <div className="eyebrow">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </div>
          <h1>{firstName ? `Hello, ${firstName}` : 'Today'}</h1>
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          We couldn&apos;t load your visits. Check your connection and try again.
        </p>
      )}
      {!error && visits === null && <p className="t-body-m">Loading…</p>}

      {visits && visits.length === 0 && (
        <div className="empty">
          <p>No visits scheduled for today.</p>
        </div>
      )}

      {visits && visits.length > 0 && (
        <>
          <p className="t-body-m">
            {doneCount} of {visits.length} visits completed
          </p>
          {next && (
            <>
              <div className="t-overline">
                {next.status === 'in_progress' ? 'In progress' : 'Up next'}
              </div>
              <VisitCard visit={next} />
            </>
          )}
          <div className="t-overline">All visits today</div>
          {visits.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </>
      )}
    </>
  );
}
