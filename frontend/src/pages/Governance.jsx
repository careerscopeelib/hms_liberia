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
                        <button type="button" className="btn-primary" style={{ padding: '0.35rem 0.75rem' }} onClick={() => setManageOrgId(manageOrgId === org.id ? null : org.id)}>
                          {manageOrgId === org.id ? 'Close' : 'Manage'}
                        </button>
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
      </div>
    </Layout>
  );
}
