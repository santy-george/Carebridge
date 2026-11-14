import './lib/sentry';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import '@carebridge/design-system/tokens.css';
import '@carebridge/design-system/components.css';
import '@carebridge/design-system/app.css';
import '@carebridge/design-system/mobile.css';
import { AuthProvider } from './auth/AuthProvider';
import { RedirectIfAuthenticated, RequireFieldStaff } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { Today } from './pages/Today';
import { Visits } from './pages/Visits';
import { VisitDetail } from './pages/VisitDetail';
import { Profile } from './pages/Profile';
import { FieldShell } from './shell/FieldShell';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<RequireFieldStaff />}>
            <Route element={<FieldShell />}>
              <Route path="/" element={<Today />} />
              <Route path="/visits" element={<Visits />} />
              <Route path="/visits/:id" element={<VisitDetail />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
