import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

const ROLES = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'representative', label: 'Representative' },
  { value: 'patient', label: 'Patient' },
  { value: 'lab', label: 'Laboratory' },
];

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('legacy'); // 'legacy' | 'uhpcms'
  const [role, setRole] = useState('administrator');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'uhpcms') {
        const res = await api.uhpcms.login(email, password);
        if (res.ok && res.token && res.user) {
          sessionStorage.setItem('uhpcms_token', res.token);
          onLogin(res.user);
          const isAccountant = (res.user?.role || '').toLowerCase().includes('accountant');
          navigate(isAccountant ? '/finance-dashboard' : '/dashboard', { replace: true });
          return;
        }
      } else {
        const res = await api.uhpcms.legacyLogin(role, username, password);
        if (res.ok && res.token && res.user) {
          sessionStorage.setItem('uhpcms_token', res.token);
          onLogin(res.user);
          const isAccountant = (res.user?.role || '').toLowerCase().includes('accountant');
          navigate(isAccountant ? '/finance-dashboard' : '/dashboard', { replace: true });
          return;
        }
        const legacy = await api.login(role, username, password);
        if (legacy.ok) {
          onLogin({ id: legacy.id, role: legacy.role, username: legacy.username });
          const isAccountant = (legacy.role || '').toLowerCase().includes('accountant');
          navigate(isAccountant ? '/finance-dashboard' : '/dashboard', { replace: true });
          return;
        }
      }
    } catch (err) {
      const msg = err.message || 'Login failed';
      setError(msg);
      if (msg.toLowerCase().includes('suspended')) {
        setError('Organization is suspended. Contact your administrator or Super-Admin to reactivate.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">U-HPCMS</h1>
        <p className="login-subtitle">Unified Hospital, Clinic & Pharmacy Management System</p>

        <div className="currency-switcher" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
          <button type="button" className={`btn-currency ${mode === 'legacy' ? 'active' : ''}`} onClick={() => setMode('legacy')}>
            Role / Username
          </button>
          <button type="button" className={`btn-currency ${mode === 'uhpcms' ? 'active' : ''}`} onClick={() => setMode('uhpcms')}>
            Email (U-HPCMS)
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'uhpcms' ? (
            <>
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="e.g. super@uhpcms.local" />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" />
            </>
          ) : (
            <>
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} required>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <label htmlFor="username">Username</label>
              <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Username" />
              <label htmlFor="password">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" />
            </>
          )}
          {error && <div className="login-error">{error}</div>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        
        <div className="login-demo-list" style={{ textAlign: 'left', marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <p style={{ margin: '0.25rem 0' }}><strong>Super Admin:</strong> super@uhpcms.local / admin123</p>

        </div>
      </div>
    </div>
  );
}
