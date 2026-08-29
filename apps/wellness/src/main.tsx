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
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
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
import { Records } from './pages/Records';
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
          {/* Not under RequireSession or RedirectIfAuthenticated: both guards
              redirect before rendering based on session presence, which
              would make ResetPassword's own loading/no-session/session
              states unreachable. A recovery link may or may not have
              exchanged its code for a session yet by the time this mounts
              (see AuthProvider) -- the component handles all three states
              itself instead of a route guard picking one in advance. */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
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
              <Route path="/records" element={<Records />} />
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
