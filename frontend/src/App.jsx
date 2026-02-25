import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CurrencyProvider } from './context/CurrencyContext';
import Login from './Login';
import Dashboard from './Dashboard';
import Governance from './pages/Governance';
import Billing from './pages/Billing';
import PatientFlow from './pages/PatientFlow';
import Patients from './pages/Patients';
import PatientDetail from './pages/PatientDetail';
import LegacyEmployees from './pages/LegacyEmployees';
import LegacyPatients from './pages/LegacyPatients';
import OpdQueue from './pages/OpdQueue';
import Reporting from './pages/Reporting';
import AuditLog from './pages/AuditLog';
import OrgAdmin from './pages/OrgAdmin';
import Lab from './pages/Lab';
import Inpatient from './pages/Inpatient';
import Pharmacy from './pages/Pharmacy';
import Appointments from './pages/Appointments';
import { api } from './api';

const USER_KEY = 'hms_user';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const s = sessionStorage.getItem(USER_KEY);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });
  const [backendOk, setBackendOk] = useState(null);

  useEffect(() => {
    api.health()
      .then(() => setBackendOk(true))
      .catch(() => setBackendOk(false));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('uhpcms_token');
  };

  if (backendOk === false) {
    return (
      <div className="backend-error-page">
        <div>
          <h2>Backend not reachable</h2>
          <p>Start the API with: <code>cd backend && npm start</code></p>
          <p>Expected: <code>http://localhost:3000</code></p>
        </div>
      </div>
    );
  }

  return (
    <CurrencyProvider>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/dashboard" element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/governance" element={user ? <Governance user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/billing" element={user ? <Billing user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/workflow" element={user ? <PatientFlow user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/patients" element={user ? <Patients user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/patients/:id" element={user ? <PatientDetail user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/patients/:id/edit" element={user ? <PatientDetail user={user} onLogout={handleLogout} initialTab="edit" /> : <Navigate to="/login" replace />} />
        <Route path="/employees" element={user ? <LegacyEmployees user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/legacy-patients" element={user ? <LegacyPatients user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/opd" element={user ? <OpdQueue user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/org-admin" element={user ? <OrgAdmin user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/lab" element={user ? <Lab user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/inpatient" element={user ? <Inpatient user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/pharmacy" element={user ? <Pharmacy user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/appointments" element={user ? <Appointments user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/reporting" element={user ? <Reporting user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/audit" element={user ? <AuditLog user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />} />
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
      </Routes>
    </CurrencyProvider>
  );
}
