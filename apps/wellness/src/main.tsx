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
import App from './App.tsx';

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
            <Route path="/" element={<App />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
