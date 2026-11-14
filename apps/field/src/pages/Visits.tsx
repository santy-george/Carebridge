import { useEffect, useState } from 'react';
import { VisitCard } from '../components/VisitCard';
import { fetchMyVisits, formatDay, localRange, type Visit } from '../lib/visits';

export function Visits() {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const { from, to } = localRange(new Date(), 7, 7);
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

  const groups = new Map<string, Visit[]>();
  for (const visit of visits ?? []) {
    const label = formatDay(visit.scheduled_start);
    groups.set(label, [...(groups.get(label) ?? []), visit]);
  }

  return (
    <>
      <div className="tbar">
        <div className="tbar__title">
          <h1>Visits</h1>
          <div className="eyebrow">Last 7 days and next 7 days</div>
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
          <p>No visits in this period.</p>
        </div>
      )}
      {[...groups.entries()].map(([label, rows]) => (
        <section key={label}>
          <div className="t-overline">{label}</div>
          {rows.map((visit) => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </section>
      ))}
    </>
  );
}
