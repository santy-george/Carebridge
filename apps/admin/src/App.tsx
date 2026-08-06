import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RedirectIfAuthenticated, RequireCoordinator } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { SosInbox } from './pages/SosInbox';
import { AdminShell } from './shell/AdminShell';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<Login />} />
          </Route>
          <Route element={<RequireCoordinator />}>
            <Route element={<AdminShell />}>
              <Route path="/" element={<SosInbox />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
