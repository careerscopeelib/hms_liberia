import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { api } from './api';
import { getSelectedOrgId, setSelectedOrgId } from './utils/org';
import { getEffectiveOrgId } from './utils/org';

// Full sidebar (for org_admin, administrator, super_admin)
const FULL_SIDEBAR_GROUPS = [
  {
    label: 'Overview',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    ],
  },
  {
    label: 'Main',
    items: [
      { path: '/departments', label: 'Departments', icon: '🏢' },
      { path: '/doctors', label: 'Doctors', icon: '👨‍⚕️' },
      { path: '/patients', label: 'Patients', icon: '👥', module: ['hospital', 'clinic'] },
      { path: '/schedule', label: 'Schedule', icon: '📅', module: 'clinic' },
      { path: '/appointments', label: 'Appointments', icon: '📅', module: 'clinic' },
      { path: '/workflow', label: 'Patient flow', icon: '📝', module: ['hospital', 'clinic'] },
      { path: '/prescriptions', label: 'Prescriptions', icon: '💊', module: 'pharmacy' },
      { path: '/lab', label: 'Lab / Investigations', icon: '🔬', module: 'lab' },
      { path: '/inpatient', label: 'Inpatient', icon: '🛏️', module: 'hospital' },
      { path: '/pharmacy', label: 'Pharmacy', icon: '💊', module: 'pharmacy' },
      { path: '/beds', label: 'Bed Manager', icon: '🛏️', module: 'hospital' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/billing', label: 'Billing & Account', icon: '💰', module: 'billing' },
      { path: '/insurance', label: 'Insurance', icon: '🛡️' },
      { path: '/reporting', label: 'Reports', icon: '📈', module: 'reporting' },
    ],
  },
  {
    label: 'HR & Operations',
    items: [
      { path: '/hrm', label: 'HRM', icon: '👥' },
      { path: '/noticeboard', label: 'Noticeboard', icon: '📌' },
      { path: '/cases', label: 'Case Manager', icon: '📋' },
      { path: '/activities', label: 'Activities', icon: '📊' },
      { path: '/chat', label: 'Chat', icon: '💬' },
    ],
  },
  {
    label: 'Legacy HMS',
    items: [
      { path: '/employees', label: 'Employees', icon: '👥' },
      { path: '/legacy-patients', label: 'Legacy Patients', icon: '🧑‍⚕️' },
      { path: '/opd', label: 'OPD Queue', icon: '📋' },
    ],
  },
  {
    label: 'Organization & System',
    items: [
      { path: '/org-admin', label: 'Org setup', icon: '⚙️' },
      { path: '/settings', label: 'Settings', icon: '🔧' },
      { path: '/audit', label: 'Audit log', icon: '📋' },
      { path: '/governance', label: 'Governance', icon: '⚙️', roles: ['super_admin', 'role_super_admin'] },
    ],
  },
];

// Portal-specific sidebars (role sees only these items)
const PORTAL_SIDEBARS = {
  doctor: [
    { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Doctor Portal',
      items: [
        { path: '/patients', label: 'Patient List', icon: '👥' },
        { path: '/schedule', label: 'Schedule Management', icon: '📅' },
        { path: '/appointments', label: 'Appointment Management', icon: '📅' },
        { path: '/prescriptions', label: 'Prescription Management', icon: '💊' },
        { path: '/noticeboard', label: 'Noticeboard', icon: '📌' },
        { path: '/activities', label: 'Hospital Activities', icon: '📊' },
        { path: '/beds', label: 'Bed Manager', icon: '🛏️' },
        { path: '/cases', label: 'Case Manager', icon: '📋' },
      ],
    },
  ],
  nurse: [
    { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Nurse Portal',
      items: [
        { path: '/noticeboard', label: 'Noticeboard', icon: '📌' },
        { path: '/beds', label: 'Bed Manager', icon: '🛏️' },
        { path: '/reporting', label: 'Reports', icon: '📈' },
      ],
    },
  ],
  accountant: [
    { label: 'Overview', items: [{ path: '/finance-dashboard', label: 'Finance Dashboard', icon: '📊' }] },
    {
      label: 'Billing & Invoicing',
      items: [
        { path: '/billing', label: 'Process Bills & Invoices', icon: '💰' },
        { path: '/billing', label: 'Invoice List', icon: '📄', hash: '?tab=invoices' },
        { path: '/billing', label: 'Payment Report', icon: '💵', hash: '?tab=payments' },
        { path: '/billing', label: 'Debit Report (Pending)', icon: '📋', hash: '?tab=debit' },
        { path: '/billing', label: 'Credit Report (Payments)', icon: '✅', hash: '?tab=credit' },
      ],
    },
    {
      label: 'Insurance & Finance',
      items: [
        { path: '/insurance', label: 'Insurance Policies', icon: '🛡️' },
        { path: '/finance-reports', label: 'Finance Reports & Analytics', icon: '📈' },
        { path: '/reporting', label: 'General Reports', icon: '📊' },
      ],
    },
    {
      label: 'Reference',
      items: [
        { path: '/patients', label: 'Patient List', icon: '👥' },
      ],
    },
  ],
  receptionist: [
    { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Receptionist Portal',
      items: [
        { path: '/doctors', label: 'Doctor List', icon: '👨‍⚕️' },
        { path: '/patients', label: 'Manage Patient', icon: '👥' },
        { path: '/schedule', label: 'View Schedule', icon: '📅' },
        { path: '/appointments', label: 'Appointment Management', icon: '📅' },
        { path: '/noticeboard', label: 'Noticeboard', icon: '📌' },
      ],
    },
  ],
  pharmacist: [
    { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Pharmacist Portal',
      items: [
        { path: '/pharmacy', label: 'Manage Medicine List', icon: '💊' },
        { path: '/pharmacy', label: 'Medicine Category', icon: '📦', hash: '#categories' },
        { path: '/noticeboard', label: 'Noticeboard', icon: '📌' },
      ],
    },
  ],
  representative: [
    { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Representative Portal',
      items: [
        { path: '/patients', label: 'Manage Patient', icon: '👥' },
        { path: '/schedule', label: 'View Schedule', icon: '📅' },
        { path: '/appointments', label: 'Manage Appointment', icon: '📅' },
      ],
    },
  ],
  lab: [
    { label: 'Overview', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Laboratories Portal',
      items: [
        { path: '/lab', label: 'Add Investigation Report', icon: '🔬' },
        { path: '/lab', label: 'Manage Investigation Report', icon: '📋' },
        { path: '/noticeboard', label: 'Noticeboard', icon: '📌' },
      ],
    },
  ],
  patient: [
    { label: 'My Portal', items: [{ path: '/dashboard', label: 'Dashboard', icon: '📊' }] },
    {
      label: 'Patient Portal',
      items: [
        { path: '/patients', label: 'Patient Status View', icon: '👤' },
        { path: '/prescriptions', label: 'Prescription View', icon: '💊' },
        { path: '/settings', label: 'Documents & Settings', icon: '🔧' },
      ],
    },
  ],
};

// Roles that see the full sidebar (no portal filter)
const FULL_SIDEBAR_ROLES = ['super_admin', 'role_super_admin', 'org_admin', 'administrator'];

function normalizeRole(role) {
  if (!role) return '';
  const r = role.toLowerCase();
  if (FULL_SIDEBAR_ROLES.includes(r)) return r;
  if (r.includes('doctor')) return 'doctor';
  if (r.includes('nurse')) return 'nurse';
  if (r.includes('accountant')) return 'accountant';
  if (r.includes('receptionist')) return 'receptionist';
  if (r.includes('pharmacist')) return 'pharmacist';
  if (r.includes('representative')) return 'representative';
  if (r.includes('lab') || r.includes('laboratory')) return 'lab';
  if (r.includes('patient')) return 'patient';
  return r;
}

function getSidebarGroups(user) {
  const role = normalizeRole(user?.role);
  if (FULL_SIDEBAR_ROLES.includes(role)) return FULL_SIDEBAR_GROUPS;
  const portal = PORTAL_SIDEBARS[role];
  if (portal) return portal;
  return FULL_SIDEBAR_GROUPS;
}

function canShowByModule(item, enabledModules) {
  if (!item.module) return true;
  if (!Array.isArray(enabledModules)) return true;
  const mods = Array.isArray(item.module) ? item.module : [item.module];
  return mods.some((m) => enabledModules.includes(m));
}

function filterItems(items, userRole, enabledModules) {
  return items.filter((item) => {
    if (!canShowByModule(item, enabledModules)) return false;
    if (!item.roles || item.roles.length === 0) return true;
    if (userRole === 'org_admin' || userRole === 'administrator') return true;
    return item.roles.includes(userRole);
  });
}

export default function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname + (location.search || '') + (location.hash || '');

  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'role_super_admin';
  const needsOrgSelector = isSuperAdmin && !user?.org_id;
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgId, setSelectedOrgIdState] = useState(getSelectedOrgId);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState({ patients: [], users: [], notices: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const searchRef = useRef(null);
  const orgIdForSearch = getEffectiveOrgId(user);

  useEffect(() => {
    if (!needsOrgSelector) return;
    api.uhpcms.getOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => []);
  }, [needsOrgSelector]);

  // Notifications: fetch when open, poll every 30s for real-time updates
  useEffect(() => {
    if (!notificationsOpen) return;
    const fetchNotices = () => {
      setNotificationsLoading(true);
      const orgId = getEffectiveOrgId(user);
      if (!orgId && !isSuperAdmin) return setNotificationsLoading(false);
      api.uhpcms.getNoticeboard({ org_id: orgId || selectedOrgId }).then((r) => {
        setNotifications(r.data || []);
      }).catch(() => setNotifications([])).finally(() => setNotificationsLoading(false));
    };
    fetchNotices();
    const interval = setInterval(fetchNotices, 30000);
    return () => clearInterval(interval);
  }, [notificationsOpen, user, selectedOrgId, isSuperAdmin]);

  // Click outside: close profile, notifications, search dropdown
  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) setNotificationsOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchFocused(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Debounced global search using backend global search API (patients, users, notices)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults({ patients: [], users: [], notices: [] });
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.uhpcms.globalSearch({ q, org_id: orgIdForSearch });
        const data = res.data || {};
        setSearchResults({
          patients: data.patients || [],
          users: data.users || [],
          notices: data.notices || [],
        });
      } catch (_) {
        setSearchResults({ patients: [], users: [], notices: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, orgIdForSearch]);

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

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearchFocused(false);
    navigate(`/patients?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="app-layout">
      <aside className="sidebar sidebar--dark">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">➕</div>
          <span className="sidebar-brand-text">Hospital</span>
        </div>
        <div className="sidebar-subtitle">Hospital Management System</div>
        {needsOrgSelector && organizations.length > 0 && (
          <div className="sidebar-org-select">
            <label>Organization</label>
            <select value={selectedOrgId} onChange={handleOrgChange} title="Select organization">
              <option value="">— Select org —</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
        <nav className="sidebar-nav">
          {useMemo(() => {
            const groups = getSidebarGroups(user);
            return groups.map((group) => {
              const visibleItems = filterItems(group.items, user?.role, user?.enabled_modules);
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label} className="sidebar-group">
                  <div className="sidebar-group-label">{group.label}</div>
                  {visibleItems.map((item) => {
                    const to = item.path + (item.hash || '');
                    const isActive = currentPath === to || (currentPath === item.path && !item.hash);
                    return (
                      <Link
                        key={item.path + (item.hash || '')}
                        to={to}
                        className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      >
                        <span className="sidebar-nav-item-icon">{item.icon}</span>
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              );
            });
          }, [user, currentPath])}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <strong>{user?.username || user?.email}</strong>
            <span className="sidebar-user-role">{(user?.role || '').replace(/_/g, ' ')}</span>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="main-header main-header--bar">
          <div className="header-search-wrap" ref={searchRef}>
            <form className="header-search" onSubmit={handleSearch}>
              <input
                type="search"
                placeholder="Search patients, doctors, employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                className="header-search-input"
                aria-label="Search"
              />
              <button type="submit" className="header-search-btn" aria-label="Search">🔍</button>
            </form>
            {searchFocused && searchQuery.trim().length >= 2 && (
              <div className="header-search-dropdown">
                {searchLoading ? (
                  <div className="header-search-dropdown-item header-search-dropdown-loading">Searching…</div>
                ) : (searchResults.patients?.length > 0 || searchResults.users?.length > 0 || searchResults.notices?.length > 0) ? (
                  <>
                    {searchResults.patients?.length > 0 && (
                      <>
                        <div className="header-search-dropdown-label">Patients</div>
                        {searchResults.patients.map((p) => (
                          <Link
                            key={p.id || p.mrn}
                            to={p.id ? `/patients/${p.id}` : `/patients?q=${encodeURIComponent(searchQuery.trim())}`}
                            className="header-search-dropdown-item"
                            onClick={() => setSearchFocused(false)}
                          >
                            <span className="header-search-dropdown-icon">👤</span>
                            <span>{p.full_name || p.mrn}</span>
                            <span className="header-search-dropdown-meta">{p.mrn}</span>
                          </Link>
                        ))}
                      </>
                    )}
                    {searchResults.users?.length > 0 && (
                      <>
                        <div className="header-search-dropdown-label">Doctors / Staff</div>
                        {searchResults.users.map((u) => (
                          <Link
                            key={u.id}
                            to="/doctors"
                            className="header-search-dropdown-item"
                            onClick={() => setSearchFocused(false)}
                          >
                            <span className="header-search-dropdown-icon">👨‍⚕️</span>
                            <span>{u.full_name || u.email}</span>
                            <span className="header-search-dropdown-meta">{(u.role_id || '').replace('role_', '')}</span>
                          </Link>
                        ))}
                      </>
                    )}
                    {searchResults.notices?.length > 0 && (
                      <>
                        <div className="header-search-dropdown-label">Notices</div>
                        {searchResults.notices.map((n) => (
                          <Link
                            key={n.id}
                            to="/noticeboard"
                            className="header-search-dropdown-item"
                            onClick={() => setSearchFocused(false)}
                          >
                            <span className="header-search-dropdown-icon">📌</span>
                            <span>{n.title}</span>
                          </Link>
                        ))}
                      </>
                    )}
                    <Link
                      to={`/patients?q=${encodeURIComponent(searchQuery.trim())}`}
                      className="header-search-dropdown-item header-search-dropdown-viewall"
                      onClick={() => setSearchFocused(false)}
                    >
                      View all results →
                    </Link>
                  </>
                ) : (
                  <div className="header-search-dropdown-item">No matches. Try different keywords.</div>
                )}
              </div>
            )}
          </div>
          <div className="header-actions">
            <Link to="/noticeboard" className="header-badge-link" title="View notices and updates">
              NEW UPDATE
            </Link>
            <div className="header-notifications-wrap" ref={notificationsRef}>
              <button
                type="button"
                className="header-icon-btn"
                onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                aria-label="Notifications"
                title="Notifications"
              >
                🔔
                {notifications.length > 0 && <span className="header-notification-dot" />}
              </button>
              {notificationsOpen && (
                <div className="header-dropdown header-notifications-panel">
                  <div className="header-dropdown-title">Notifications</div>
                  {notificationsLoading ? (
                    <div className="header-dropdown-item">Loading…</div>
                  ) : notifications.length === 0 ? (
                    <div className="header-dropdown-item">No new notices.</div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div key={n.id} className="header-notification-item">
                        <strong>{n.title}</strong>
                        {n.content && <p className="header-notification-content">{n.content}</p>}
                        <span className="header-notification-time">{n.created_at}</span>
                      </div>
                    ))
                  )}
                  <Link to="/noticeboard" className="header-dropdown-item header-dropdown-viewall" onClick={() => setNotificationsOpen(false)}>
                    View all notices →
                  </Link>
                </div>
              )}
            </div>
            <div className="header-profile-wrap" ref={profileRef}>
              <button
                type="button"
                className="header-avatar"
                onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
                title="Profile"
                aria-label="Profile"
              >
                {(user?.full_name || user?.username || user?.email || 'U').toString().charAt(0).toUpperCase()}
              </button>
              {profileOpen && (
                <div className="header-dropdown header-profile-dropdown">
                  <div className="header-profile-info">
                    <div className="header-profile-name">{user?.full_name || user?.username || user?.email || 'User'}</div>
                    <div className="header-profile-email">{(user?.email || user?.username || '').toString()}</div>
                    <div className="header-profile-role">{(user?.role || '').replace(/_/g, ' ')}</div>
                    {user?.org_id && <div className="header-profile-org">Org ID: {user.org_id}</div>}
                  </div>
                  <Link to="/settings" className="header-dropdown-item" onClick={() => setProfileOpen(false)}>⚙️ Settings</Link>
                  <button type="button" className="header-dropdown-item header-dropdown-logout" onClick={() => { setProfileOpen(false); handleLogout(); }}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="main-body">{children}</div>
      </main>
    </div>
  );
}
