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
    <div className="card">
      <h1 className="t-heading-s">More</h1>

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
  );
}
