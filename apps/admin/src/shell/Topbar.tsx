import { useEffect, useState } from 'react';

function formatIstDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatIstClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
}

export function Topbar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__search">
        <span className="icon">
          <svg>
            <use href="#i-search" />
          </svg>
        </span>
        <input placeholder="Search members, visits, invoices…" />
      </div>
      <div className="topbar__actions">
        <div className="topbar-right">
          <span className="date-chip">
            <span className="icon">
              <svg>
                <use href="#i-calendar" />
              </svg>
            </span>
            {formatIstDate(now)}
          </span>
          <span className="date-chip">
            <span className="icon">
              <svg>
                <use href="#i-clock" />
              </svg>
            </span>
            {formatIstClock(now)}&nbsp;IST
          </span>
        </div>
      </div>
    </header>
  );
}
