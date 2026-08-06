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
              <Route path="/health" element={<ComingSoon title="My Health" />} />
              <Route path="/medications" element={<ComingSoon title="My Schedule" />} />
              <Route path="/care" element={<ComingSoon title="My Care" />} />
              <Route path="/more" element={<ComingSoon title="More" />} />
              <Route path="/sos" element={<ComingSoon title="Emergency SOS" />} />
              <Route path="/profile" element={<ComingSoon title="Profile" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
