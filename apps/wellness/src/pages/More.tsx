import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';

export function More() {
  const { memberLinks, selectedMemberId, selectMember } = useAuth();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <>
      <div className="tbar">
        <div className="tbar__title">
          <h1 className="sm">More</h1>
        </div>
      </div>

      <div className="card card--flush">
        <Link className="row tap" to="/profile">
          <div className="ic">
            <span className="icon">
              <svg>
                <use href="#i-user" />
              </svg>
            </span>
          </div>
          <div className="m">
            <div className="t">Profile &amp; settings</div>
            <div className="s">Personal details, plan, medical profile</div>
          </div>
          <span className="icon chev">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <Link className="row tap" to="/reports">
          <div className="ic">
            <span className="icon">
              <svg>
                <use href="#i-reports" />
              </svg>
            </span>
          </div>
          <div className="m">
            <div className="t">Wellness reports</div>
            <div className="s">Monthly summaries for you and your family</div>
          </div>
          <span className="icon chev">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
        <Link className="row tap" to="/education">
          <div className="ic">
            <span className="icon">
              <svg>
                <use href="#i-education" />
              </svg>
            </span>
          </div>
          <div className="m">
            <div className="t">Health education</div>
            <div className="s">Articles and tips</div>
          </div>
          <span className="icon chev">
            <svg>
              <use href="#i-chevron" />
            </svg>
          </span>
        </Link>
      </div>

      <div className="card">
        {memberLinks.length > 1 && (
          <div className="field">
            <label htmlFor="member-switcher">Viewing</label>
            <select
              id="member-switcher"
              value={selectedMemberId ?? ''}
              onChange={(event) => selectMember(event.target.value)}
            >
              {memberLinks.map((link) => (
                <option key={link.memberId} value={link.memberId}>
                  {link.relationshipLabel}
                </option>
              ))}
            </select>
          </div>
        )}

        <Link className="btn btn--secondary" to="/link-member">
          Link another member
        </Link>

        <button className="btn btn--secondary" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </>
  );
}
