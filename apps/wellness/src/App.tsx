import { useEffect } from 'react';
import { injectIconSprite } from '@carebridge/design-system';
import '@carebridge/design-system/tokens.css';
import '@carebridge/design-system/components.css';
import '@carebridge/design-system/app.css';
import '@carebridge/design-system/mobile.css';

function App() {
  useEffect(() => {
    injectIconSprite();
  }, []);

  return (
    <main className="content">
      <div className="card">
        <h1 className="t-heading-s">Care Bridge Wellness</h1>
        <p className="t-body-m">Design-system pipeline check — scaffold only.</p>
        <button className="btn btn--primary" type="button">
          <svg className="icon">
            <use href="#i-dashboard" />
          </svg>
          Looks themed
        </button>
      </div>
    </main>
  );
}

export default App;
