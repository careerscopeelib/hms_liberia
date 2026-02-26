import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';

const ORG_TYPES = [{ value: 'hospital', label: 'Hospital' }, { value: 'clinic', label: 'Clinic' }, { value: 'pharmacy', label: 'Pharmacy' }];
const DEFAULT_MODULES = ['triage', 'consultation', 'lab', 'inpatient', 'pharmacy', 'clinic', 'billing', 'reporting'];
const DEFAULT_ADDONS = ['insurance', 'assets', 'hr'];

export default function Governance({ user, onLogout }) {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('hospital');
  const [manageOrgId, setManageOrgId] = useState(null);
  const [orgModules, setOrgModules] = useState([]);
  const [orgAddons, setOrgAddons] = useState([]);
  const [orgStatus, setOrgStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [editOrgForm, setEditOrgForm] = useState({ name: '', type: 'hospital', subscription_plan: 'standard' });
  const [deleteOrgId, setDeleteOrgId] = useState(null);
  const [governanceUsers, setGovernanceUsers] = useState([]);
  const [governanceUsersOrgFilter, setGovernanceUsersOrgFilter] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ email: '', full_name: '', role_id: '', status: 'active', password: '' });
  const [savingUser, setSavingUser] = useState(false);
  const [editUserRoles, setEditUserRoles] = useState([]);

  useEffect(() => {
    api.uhpcms.getOrganizations()
      .then((r) => { setOrganizations(r.data || []); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!manageOrgId) return;
    const org = organizations.find((o) => o.id === manageOrgId);
    if (org) setOrgStatus(org.status);
    api.uhpcms.getOrgModules(manageOrgId).then((r) => setOrgModules(r.data || [])).catch(() => []);
    api.uhpcms.getOrgAddons(manageOrgId).then((r) => setOrgAddons(r.data || [])).catch(() => []);
  }, [manageOrgId, organizations]);

  const loadGovernanceUsers = () => {
    api.uhpcms.getGovernanceUsers(governanceUsersOrgFilter || undefined)
      .then((r) => setGovernanceUsers(r.data || []))
      .catch(() => setGovernanceUsers([]));
  };
  useEffect(() => { loadGovernanceUsers(); }, [governanceUsersOrgFilter]);

  useEffect(() => {
    if (!editUser?.org_id) { setEditUserRoles([]); return; }
    api.uhpcms.getRoles(editUser.org_id).then((r) => setEditUserRoles(r.data || [])).catch(() => setEditUserRoles([]));
  }, [editUser?.id, editUser?.org_id]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await api.uhpcms.createOrganization({ name, type, subscription_plan: 'standard' });
      const r = await api.uhpcms.getOrganizations();
      setOrganizations(r.data || []);
      setName('');
      setType('hospital');
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  };

  const modulesList = [...new Set([...DEFAULT_MODULES, ...orgModules.map((m) => m.module_name)])];
  const addonsList = [...new Set([...DEFAULT_ADDONS, ...orgAddons.map((a) => a.addon_name)])];

  const [moduleToggles, setModuleToggles] = useState({});
  const [addonToggles, setAddonToggles] = useState({});
  useEffect(() => {
    if (!manageOrgId) return;
    const m = {};
    [...DEFAULT_MODULES, ...orgModules.map((x) => x.module_name)].forEach((name) => {
      m[name] = orgModules.find((x) => x.module_name === name)?.enabled ? 1 : 0;
    });
    setModuleToggles(m);
  }, [manageOrgId, orgModules]);
  useEffect(() => {
    if (!manageOrgId) return;
    const a = {};
    [...DEFAULT_ADDONS, ...orgAddons.map((x) => x.addon_name)].forEach((name) => {
      a[name] = orgAddons.find((x) => x.addon_name === name)?.enabled ? 1 : 0;
    });
    setAddonToggles(a);
  }, [manageOrgId, orgAddons]);

  const modulesEdit = modulesList.map((name) => ({ name, enabled: moduleToggles[name] ?? 0 }));
  const addonsEdit = addonsList.map((name) => ({ name, enabled: addonToggles[name] ?? 0 }));

  const handleSaveStatus = async () => {
    if (!manageOrgId || !['active', 'suspended'].includes(orgStatus)) return;
    setSaving(true);
    setError('');
    try {
      await api.uhpcms.patchOrganization(manageOrgId, { status: orgStatus });
      const r = await api.uhpcms.getOrganizations();
      setOrganizations(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModules = async () => {
    if (!manageOrgId) return;
    setSaving(true);
    setError('');
    try {
      await api.uhpcms.setOrgModules(manageOrgId, modulesEdit.map((m) => ({ name: m.name, enabled: m.enabled })));
      const r = await api.uhpcms.getOrgModules(manageOrgId);
      setOrgModules(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddons = async () => {
    if (!manageOrgId) return;
    setSaving(true);
    setError('');
    try {
      await api.uhpcms.setOrgAddons(manageOrgId, addonsEdit.map((a) => ({ name: a.name, enabled: a.enabled })));
      const r = await api.uhpcms.getOrgAddons(manageOrgId);
      setOrgAddons(r.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditOrg = (org) => {
    setEditOrg(org);
    setEditOrgForm({ name: org.name, type: org.type, subscription_plan: org.subscription_plan || 'standard' });
  };
  const saveEditOrg = async () => {
    if (!editOrg) return;
    setError('');
    try {
      await api.uhpcms.updateOrganization(editOrg.id, editOrgForm);
      const r = await api.uhpcms.getOrganizations();
      setOrganizations(r.data || []);
      setEditOrg(null);
    } catch (e) {
      setError(e.message);
    }
  };
  const confirmDeleteOrg = async () => {
    if (!deleteOrgId) return;
    setError('');
    try {
      await api.uhpcms.deleteOrganization(deleteOrgId);
      const r = await api.uhpcms.getOrganizations();
      setOrganizations(r.data || []);
      setManageOrgId((id) => id === deleteOrgId ? null : id);
      setDeleteOrgId(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const openEditUser = (u) => {
    setEditUser(u);
    setEditUserForm({ email: u.email, full_name: u.full_name || '', role_id: u.role_id || '', status: u.status || 'active', password: '' });
  };
  const saveEditUser = async () => {
    if (!editUser) return;
    setSavingUser(true);
    setError('');
    try {
      await api.uhpcms.updateGovernanceUser(editUser.id, {
        email: editUserForm.email,
        full_name: editUserForm.full_name || null,
        role_id: editUserForm.role_id || null,
        status: editUserForm.status,
        ...(editUserForm.password ? { password: editUserForm.password } : {}),
      });
      loadGovernanceUsers();
      setEditUser(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingUser(false);
    }
  };
  const deleteGovernanceUserConfirm = async (id) => {
    if (!window.confirm('Deactivate this user? They will no longer be able to log in.')) return;
    setError('');
    try {
      await api.uhpcms.deleteGovernanceUser(id);
      loadGovernanceUsers();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleModule = (name) => setModuleToggles((prev) => ({ ...prev, [name]: prev[name] ? 0 : 1 }));
  const toggleAddon = (name) => setAddonToggles((prev) => ({ ...prev, [name]: prev[name] ? 0 : 1 }));

  if (user?.role !== 'super_admin' && user?.role !== 'role_super_admin') {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="error-state">Access denied. Super-admin only.</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">System Governance — Organizations</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Create hospitals, clinics, and pharmacies. Then assign an org admin in Org setup.
        </p>

        <div className="card card-interactive" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Create Organization</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
              <label style={{ flex: '1 1 200px' }}>
                Name
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="login-form input" style={{ width: '100%', padding: '0.5rem 0.75rem', marginTop: '0.25rem' }} required placeholder="Organization name" />
              </label>
              <label style={{ flex: '1 1 140px' }}>
                Type
                <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', marginTop: '0.25rem' }}>
                  {ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <button type="submit" className="btn-primary" disabled={creating} style={{ padding: '0.5rem 1.25rem' }}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </form>
            {error && <div className="login-error" style={{ marginTop: '1rem' }}>{error}</div>}
          </div>
        </div>

        <h3 className="section-title">Organizations ({organizations.length})</h3>
        {loading ? <div className="loading-state">Loading…</div> : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id}>
                      <td><strong>{org.name}</strong></td>
                      <td><span className="badge">{org.type}</span></td>
                      <td>{org.status}</td>
                      <td>{org.subscription_plan}</td>
                      <td>
                        <button type="button" className="btn-primary" style={{ padding: '0.35rem 0.75rem', marginRight: '0.35rem' }} onClick={() => setManageOrgId(manageOrgId === org.id ? null : org.id)}>
                          {manageOrgId === org.id ? 'Close' : 'Manage'}
                        </button>
                        <button type="button" className="btn" style={{ padding: '0.35rem 0.75rem', marginRight: '0.35rem' }} onClick={() => openEditOrg(org)}>Edit</button>
                        <button type="button" className="btn" style={{ padding: '0.35rem 0.75rem', color: 'var(--color-danger, #c00)' }} onClick={() => setDeleteOrgId(org.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {manageOrgId && (
          <div className="card card-interactive" style={{ marginTop: '1.5rem' }}>
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Manage: {organizations.find((o) => o.id === manageOrgId)?.name}</h3>
              <p style={{ marginBottom: '1rem' }}>
                <button type="button" className="btn-primary" onClick={() => navigate(`/org-admin?org_id=${manageOrgId}`)}>Add / assign Org Admin</button>
                <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>— Create a user with role &quot;Org Admin&quot; for this organization.</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <label>
                  Status
                  <select value={orgStatus} onChange={(e) => setOrgStatus(e.target.value)} style={{ display: 'block', padding: '0.5rem', width: '100%', marginTop: '0.25rem' }}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </label>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveStatus}>Save status</button>
                </div>
              </div>
              <h4 style={{ marginTop: '1rem' }}>Modules</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                {modulesList.map((name) => (
                  <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input type="checkbox" checked={!!(moduleToggles[name] ?? orgModules.find((m) => m.module_name === name)?.enabled)} onChange={() => toggleModule(name)} />
                    <span>{name}</span>
                  </label>
                ))}
                <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveModules} style={{ marginLeft: '0.5rem' }}>Save modules</button>
              </div>
              <h4 style={{ marginTop: '0.5rem' }}>Add-ons</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {addonsList.map((name) => (
                  <label key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input type="checkbox" checked={!!(addonToggles[name] ?? orgAddons.find((a) => a.addon_name === name)?.enabled)} onChange={() => toggleAddon(name)} />
                    <span>{name}</span>
                  </label>
                ))}
                <button type="button" className="btn-primary" disabled={saving} onClick={handleSaveAddons} style={{ marginLeft: '0.5rem' }}>Save add-ons</button>
              </div>
            </div>
          </div>
        )}

        {editOrg && (
          <div className="card card-interactive" style={{ marginTop: '1.5rem' }}>
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Edit organization</h3>
              <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 400, marginBottom: '1rem' }}>
                <label>Name <input type="text" className="login-form input" style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editOrgForm.name} onChange={(e) => setEditOrgForm((f) => ({ ...f, name: e.target.value }))} /></label>
                <label>Type <select style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editOrgForm.type} onChange={(e) => setEditOrgForm((f) => ({ ...f, type: e.target.value }))}>{ORG_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
                <label>Plan <input type="text" className="login-form input" style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editOrgForm.subscription_plan} onChange={(e) => setEditOrgForm((f) => ({ ...f, subscription_plan: e.target.value }))} /></label>
              </div>
              <button type="button" className="btn-primary" onClick={saveEditOrg}>Save</button>
              <button type="button" className="btn" style={{ marginLeft: '0.5rem' }} onClick={() => setEditOrg(null)}>Cancel</button>
            </div>
          </div>
        )}

        {deleteOrgId && (
          <div className="card card-interactive" style={{ marginTop: '1.5rem', borderColor: 'var(--color-danger, #c00)' }}>
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Delete organization?</h3>
              <p>This will remove &quot;{organizations.find((o) => o.id === deleteOrgId)?.name}&quot; and its modules/addons/roles. Users must be removed first.</p>
              <button type="button" className="btn" style={{ color: 'var(--color-danger, #c00)' }} onClick={confirmDeleteOrg}>Confirm delete</button>
              <button type="button" className="btn" style={{ marginLeft: '0.5rem' }} onClick={() => setDeleteOrgId(null)}>Cancel</button>
            </div>
          </div>
        )}

        <h3 className="section-title" style={{ marginTop: '2rem' }}>System users</h3>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>View, edit, or deactivate users across organizations.</p>
        <div style={{ marginBottom: '1rem' }}>
          <label>Filter by organization </label>
          <select value={governanceUsersOrgFilter} onChange={(e) => setGovernanceUsersOrgFilter(e.target.value)} style={{ padding: '0.5rem', marginLeft: '0.5rem' }}>
            <option value="">All</option>
            {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <button type="button" className="btn" style={{ marginLeft: '0.5rem' }} onClick={loadGovernanceUsers}>Refresh</button>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Full name</th>
                  <th>Organization</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {governanceUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name || '—'}</td>
                    <td>{organizations.find((o) => o.id === u.org_id)?.name || u.org_id}</td>
                    <td>{u.role_name === 'accountant' ? 'Finance Manager' : (u.role_name || u.role_id || '—').replace(/_/g, ' ')}</td>
                    <td>{u.status}</td>
                    <td>
                      <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem', marginRight: '0.25rem' }} onClick={() => openEditUser(u)}>Edit</button>
                      <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem', color: 'var(--color-danger, #c00)' }} onClick={() => deleteGovernanceUserConfirm(u.id)}>Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {editUser && (
          <div className="card card-interactive" style={{ marginTop: '1.5rem' }}>
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Edit user</h3>
              <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 400, marginBottom: '1rem' }}>
                <label>Email <input type="email" className="login-form input" style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editUserForm.email} onChange={(e) => setEditUserForm((f) => ({ ...f, email: e.target.value }))} /></label>
                <label>Full name <input type="text" className="login-form input" style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editUserForm.full_name} onChange={(e) => setEditUserForm((f) => ({ ...f, full_name: e.target.value }))} /></label>
                <label>Role <select style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editUserForm.role_id} onChange={(e) => setEditUserForm((f) => ({ ...f, role_id: e.target.value }))}>
                  <option value="">—</option>
                  {editUserRoles.map((r) => <option key={r.id} value={r.id}>{r.name === 'accountant' ? 'Finance Manager (Accountant)' : (r.name || r.id).replace(/_/g, ' ')}</option>)}
                </select></label>
                <label>Status <select style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editUserForm.status} onChange={(e) => setEditUserForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select></label>
                <label>New password (leave blank to keep) <input type="password" className="login-form input" style={{ width: '100%', padding: '0.5rem 0.75rem' }} value={editUserForm.password} onChange={(e) => setEditUserForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></label>
              </div>
              <button type="button" className="btn-primary" disabled={savingUser} onClick={saveEditUser}>Save</button>
              <button type="button" className="btn" style={{ marginLeft: '0.5rem' }} onClick={() => setEditUser(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
