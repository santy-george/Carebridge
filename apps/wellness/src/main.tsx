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
import { More } from './pages/More';
import { AppShell } from './shell/AppShell';
import { ComingSoon } from './shell/ComingSoon';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/health" element={<Health />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/care" element={<Care />} />
              <Route path="/more" element={<More />} />
              <Route path="/sos" element={<Sos />} />
              <Route path="/profile" element={<ComingSoon title="Profile" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
