import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { RedirectIfAuthenticated, RequireCoordinator } from './auth/RequireAuth';
import { Login } from './pages/Login';
import { SosInbox } from './pages/SosInbox';
import { MemberList } from './pages/MemberList';
import { MemberDashboard } from './pages/MemberDashboard';
import { Leads } from './pages/Leads';
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
              <Route path="/members" element={<MemberList />} />
              <Route path="/members/:id" element={<MemberDashboard />} />
              <Route path="/leads" element={<Leads />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
