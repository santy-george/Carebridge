import './lib/sentry';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@carebridge/design-system/tokens.css';
import '@carebridge/design-system/components.css';
import '@carebridge/design-system/app.css';
import '@carebridge/design-system/mobile.css';
import { AuthProvider } from './auth/AuthProvider';
import { RedirectIfAuthenticated, RequireAuth, RequireSession } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { LinkMember } from './pages/LinkMember';
import { Home } from './pages/Home';
import { CheckIn } from './pages/CheckIn';
import { Medications } from './pages/Medications';
import { Care } from './pages/Care';
import { Sos } from './pages/Sos';
import { Health } from './pages/Health';
import { Profile } from './pages/Profile';
import { Reports } from './pages/Reports';
import { Education } from './pages/Education';
import { PreventivePlan } from './pages/PreventivePlan';
import { More } from './pages/More';
import { WithdrawConsent } from './pages/WithdrawConsent';
import { WithdrawalReceived } from './pages/WithdrawalReceived';
import { AppShell } from './shell/AppShell';
import { SubScreenShell } from './shell/SubScreenShell';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/consent-withdrawn" element={<WithdrawalReceived />} />
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route element={<RequireSession />}>
            <Route path="/link-member" element={<LinkMember />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/health" element={<Health />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/care" element={<Care />} />
              <Route path="/more" element={<More />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/education" element={<Education />} />
              <Route path="/preventive-plan" element={<PreventivePlan />} />
              <Route path="/withdraw-consent" element={<WithdrawConsent />} />
            </Route>
            {/* Sub-screens the mockup shows with a back button instead of the
                5-tab nav (Emergency.dc.html, CheckIn.dc.html both have zero
                .bnav) -- SubScreenShell, not AppShell. */}
            <Route element={<SubScreenShell />}>
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/sos" element={<Sos />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
