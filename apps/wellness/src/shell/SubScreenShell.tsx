import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { injectIconSprite } from '@carebridge/design-system';

// For routes that replace the 5-tab bottom nav with a back button instead
// (CheckIn, Sos) -- matching the mockup, where these screens never show
// .bnav. Renders .stack directly (no AppShell/.bnav) so a page's own
// .vbody/.cta-bar sit at the right level in the box for position:absolute
// to actually pin to the viewport, same fix as AppShell's own root chain.
export function SubScreenShell() {
  useEffect(() => {
    injectIconSprite();
  }, []);

  return (
    <div className="stack">
      <Outlet />
    </div>
  );
}
