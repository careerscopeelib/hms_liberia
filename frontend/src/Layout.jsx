import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from './api';
import { getSelectedOrgId, setSelectedOrgId } from './utils/org';

// Role-based sidebar: groups with optional role filter. Optional module = hide when org has that module disabled.
const SIDEBAR_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Patient care',
    items: [
      { path: '/workflow', label: 'Patient flow', icon: '📝', module: ['hospital', 'clinic'] },
      { path: '/patients', label: 'Patients', icon: '👥', module: ['hospital', 'clinic'] },
      { path: '/lab', label: 'Lab', icon: '🔬', module: 'lab' },
      { path: '/inpatient', label: 'Inpatient', icon: '🛏️', module: 'hospital' },
      { path: '/pharmacy', label: 'Pharmacy', icon: '💊', module: 'pharmacy' },
      { path: '/appointments', label: 'Appointments', icon: '📅', module: 'clinic' },
    ],
  },
  {
    label: 'Finance & billing',
    items: [
      { path: '/billing', label: 'Billing', icon: '💰', module: 'billing' },
      { path: '/reporting', label: 'Reporting', icon: '📈', module: 'reporting' },
    ],
  },
  {
    label: 'Legacy HMS',
    items: [
      { path: '/employees', label: 'Employees', icon: '👥', roles: ['super_admin', 'role_super_admin', 'administrator', 'doctor'] },
      { path: '/legacy-patients', label: 'Patients', icon: '🧑‍⚕️', roles: ['super_admin', 'role_super_admin', 'administrator', 'doctor', 'receptionist'] },
      { path: '/opd', label: 'OPD Queue', icon: '📋', roles: ['super_admin', 'role_super_admin', 'administrator', 'doctor', 'receptionist'] },
    ],
  },
  {
    label: 'Organization',
    items: [
      { path: '/org-admin', label: 'Org setup', icon: '🏢' },
    ],
  },
  {
    label: 'System',
    items: [
      { path: '/audit', label: 'Audit log', icon: '📋' },
      { path: '/governance', label: 'Governance', icon: '⚙️', roles: ['super_admin', 'role_super_admin'] },
    ],
  },
];

function canShowByModule(item, enabledModules) {
  if (!item.module) return true;
  if (!Array.isArray(enabledModules)) return true; // super_admin or legacy: show all
  const mods = Array.isArray(item.module) ? item.module : [item.module];
  return mods.some((m) => enabledModules.includes(m));
}

function filterItems(items, userRole, enabledModules) {
  return items.filter((item) => {
    if (!canShowByModule(item, enabledModules)) return false;
    if (!item.roles) return true;
    if (userRole === 'org_admin' || userRole === 'administrator') return true; // admin can perform all role functions
    return item.roles.includes(userRole);
  });
}

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasToken = !!sessionStorage.getItem('uhpcms_token');
  const currentPath = location.pathname + (location.hash || '');

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'role_super_admin';
  const needsOrgSelector = isSuperAdmin && !user?.org_id;
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgIdState] = useState(getSelectedOrgId);

  useEffect(() => {
    if (!needsOrgSelector) return;
    api.uhpcms.getOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => []);
  }, [needsOrgSelector]);

  useEffect(() => {
    const stored = getSelectedOrgId();
    if (stored && organizations.length && !organizations.find((o) => o.id === stored)) setSelectedOrgIdState('');
    else if (stored) setSelectedOrgIdState(stored);
  }, [organizations]);

  const handleOrgChange = (e) => {
    const id = e.target.value || '';
    setSelectedOrgIdState(id);
    setSelectedOrgId(id);
  };

  const handleLogout = () => {
    setSelectedOrgId('');
    onLogout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">🏥</div>
          {hasToken ? 'U-HPCMS' : 'HMS'}
        </div>
        {needsOrgSelector && organizations.length > 0 && (
          <div className="sidebar-org-select" style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Organization</label>
            <select
              value={selectedOrgId}
              onChange={handleOrgChange}
              style={{ width: '100%', padding: '0.4rem', borderRadius: 4 }}
              title="Select organization to manage"
            >
              <option value="">— Select org —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
        <nav className="sidebar-nav">
          {SIDEBAR_GROUPS.map((group) => {
            const visibleItems = filterItems(group.items, user?.role, user?.enabled_modules);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="sidebar-group">
                <div className="sidebar-group-label">{group.label}</div>
                {visibleItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-nav-item ${currentPath === item.path ? 'active' : ''}`}
                  >
                    <span className="sidebar-nav-item-icon">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.username || user?.email}</strong>
            <br />
            <span className="sidebar-user-role">{(user?.role || '').replace(/_/g, ' ')}</span>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="main-header">
          <h1>{hasToken ? 'Unified Hospital, Clinic & Pharmacy Management' : 'Hospital Management System'}</h1>
        </header>
        <div className="main-body">{children}</div>
      </main>
    </div>
  );
}
