import { Link } from 'react-router-dom';
import { formatTime, statusLabel, type Visit } from '../lib/visits';

const CHIP_BY_STATUS: Record<Visit['status'], string> = {
  scheduled: 'chip2--info',
  in_progress: 'chip2--accent',
  completed: 'chip2--ok',
  missed: 'chip2--alert',
  cancelled: 'chip2--neutral',
};

export function VisitCard({ visit }: { visit: Visit }) {
  return (
    <Link to={`/visits/${visit.id}`} className="card" style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <div className="t-heading-s">{visit.member_name}</div>
        <span className={`chip2 ${CHIP_BY_STATUS[visit.status]}`}>{statusLabel(visit.status)}</span>
      </div>
      <div className="t-body-m">
        {formatTime(visit.scheduled_start)} – {formatTime(visit.scheduled_end)} ·{' '}
        {visit.service_type}
      </div>
      {visit.member_location && <div className="t-body-s">{visit.member_location}</div>}
    </Link>
  );
}
