import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { computeProgress } from '../lib/preventivePlan';

interface Goal {
  id: string;
  title: string;
  icon: string;
  due_date: string | null;
  completed_at: string | null;
  completed_note: string | null;
}

export function PreventivePlan() {
  const { selectedMemberId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (!selectedMemberId) return;

    Promise.all([
      supabase
        .from('preventive_plan_goals')
        .select('id, title, icon, due_date, completed_at, completed_note')
        .eq('member_id', selectedMemberId)
        .order('display_order', { ascending: true }),
    ]).then(([{ data, error }]) => {
      if (!isMounted) return;
      setLoading(false);
      setFetchError(!!error);
      setGoals((data as Goal[] | null) ?? []);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMemberId]);

  if (loading) {
    return <div className="card">Loading…</div>;
  }

  const progress = computeProgress(goals);

  return (
    <>
      <style>{`.tbar__title h1, .sec, .tt, h2, h3 { color: var(--purple-700); }`}</style>

      {fetchError && (
        <div className="card" role="alert">
          <span>Something went wrong loading your data.</span>
          <button type="button" onClick={() => setFetchError(false)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="tbar">
        <Link className="backbtn" to="/more" aria-label="Back to more">
          <span className="icon">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <div className="tbar__title">
          <h1 className="sm">Preventive health plan</h1>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="card">
          <span>Your care coordinator hasn&apos;t added any goals yet.</span>
        </div>
      ) : (
        <>
          <div
            className="card reveal"
            style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
          >
            <div
              className="ring"
              style={
                {
                  '--p': progress.percent,
                  width: '72px',
                  height: '72px',
                } as CSSProperties
              }
            >
              <b>
                {progress.completed}/{progress.total}
              </b>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-heading)' }}>
                {progress.percent >= 60 ? 'On track' : 'Needs attention'}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Put together with your care team
              </div>
            </div>
          </div>

          <div className="sec">This month&apos;s goals</div>
          <div className="card reveal">
            <div className="wplan">
              {goals.map((goal) => (
                <div className={`wplan__item${goal.completed_at ? ' done' : ''}`} key={goal.id}>
                  <div className="wplan__ic">
                    <span className="icon">
                      <svg>
                        <use href={`#i-${goal.icon}`} />
                      </svg>
                    </span>
                  </div>
                  <div className="wplan__txt">
                    <div className="t">{goal.title}</div>
                    <div className="s">
                      {goal.completed_at
                        ? (goal.completed_note ??
                          `Completed ${new Date(goal.completed_at).toLocaleDateString()}`)
                        : goal.due_date
                          ? `Due by ${goal.due_date}`
                          : 'No due date'}
                    </div>
                  </div>
                  {goal.completed_at && (
                    <div className="wplan__check">
                      <span className="icon">
                        <svg>
                          <use href="#i-check" />
                        </svg>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
