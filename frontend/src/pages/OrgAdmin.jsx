import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId, getSelectedOrgId, setSelectedOrgId } from '../utils/org';

const TABS = [
  { id: 'departments', label: 'Departments', icon: '🏢' },
  { id: 'wards', label: 'Wards', icon: '🛏️' },
  { id: 'stores', label: 'Pharmacy stores', icon: '💊' },
  { id: 'services', label: 'Services (billing)', icon: '📋' },
  { id: 'users', label: 'Users', icon: '👤' },
];

export default function OrgAdmin({ user, onLogout }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState('departments');
  const [orgId, setOrgId] = useState(user?.org_id || getSelectedOrgId() || searchParams.get('org_id') || '');
  const [organizations, setOrganizations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [wards, setWards] = useState([]);
  const [stores, setStores] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [createdUserEmail, setCreatedUserEmail] = useState('');
  const [form, setForm] = useState({ name: '', bed_count: '', code: '', default_amount: '', default_currency: 'USD', email: '', password: '', role_id: '', full_name: '', department_id: '' });

  const currentOrgId = (user?.org_id ? user.org_id : getEffectiveOrgId(user)) || orgId || organizations[0]?.id;

  useEffect(() => {
    if (!user) return;
    api.uhpcms.getOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => []);
    if (user.org_id) setOrgId(user.org_id);
    const qOrg = searchParams.get('org_id');
    if (qOrg) {
      setOrgId(qOrg);
      setSelectedOrgId(qOrg);
    }
  }, [user, searchParams]);

  useEffect(() => {
    if (!currentOrgId) return;
    setLoading(true);
    const q = { org_id: currentOrgId };
    Promise.all([
      api.uhpcms.getDepartments(currentOrgId).then((r) => r.data || []),
      api.uhpcms.getWards(currentOrgId).then((r) => r.data || []),
      api.uhpcms.getPharmacyStores(currentOrgId).then((r) => r.data || []),
      api.uhpcms.getServices(currentOrgId).then((r) => r.data || []),
      api.uhpcms.getUsers(currentOrgId).then((r) => r.data || []),
      api.uhpcms.getRoles(currentOrgId).then((r) => r.data || []),
    ]).then(([d, w, s, sv, u, r]) => {
      setDepartments(d);
      setWards(w);
      setStores(s);
      setServices(sv);
      setUsers(u);
      setRoles(r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [currentOrgId]);

  const refresh = () => {
    if (!currentOrgId) return;
    Promise.all([
      api.uhpcms.getDepartments(currentOrgId).then((r) => setDepartments(r.data || [])),
      api.uhpcms.getWards(currentOrgId).then((r) => setWards(r.data || [])),
      api.uhpcms.getPharmacyStores(currentOrgId).then((r) => setStores(r.data || [])),
      api.uhpcms.getServices(currentOrgId).then((r) => setServices(r.data || [])),
      api.uhpcms.getUsers(currentOrgId).then((r) => setUsers(r.data || [])),
    ]).catch(() => {});
  };

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.uhpcms.createDepartment({ org_id: currentOrgId, name: form.name });
      setForm((f) => ({ ...f, name: '' }));
      refresh();
    } catch (e) { setError(e.message); }
  };

  const handleCreateWard = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.uhpcms.createWard({ org_id: currentOrgId, name: form.name, bed_count: form.bed_count || 0 });
      setForm((f) => ({ ...f, name: '', bed_count: '' }));
      refresh();
    } catch (e) { setError(e.message); }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.uhpcms.createPharmacyStore({ org_id: currentOrgId, name: form.name });
      setForm((f) => ({ ...f, name: '' }));
      refresh();
    } catch (e) { setError(e.message); }
  };

  const handleCreateService = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.uhpcms.createService({
        org_id: currentOrgId,
        code: form.code,
        name: form.name,
        default_amount: form.default_amount ? parseFloat(form.default_amount) : null,
        default_currency: form.default_currency || 'USD',
      });
      setForm((f) => ({ ...f, code: '', name: '', default_amount: '' }));
      refresh();
    } catch (e) { setError(e.message); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setCreatedUserEmail('');
    try {
      await api.uhpcms.createUser({
        org_id: currentOrgId,
        email: form.email,
        password: form.password,
        role_id: form.role_id || undefined,
        department_id: form.department_id || undefined,
        full_name: form.full_name || undefined,
      });
      const emailCreated = form.email;
      setForm((f) => ({ ...f, email: '', password: '', full_name: '', role_id: '', department_id: '' }));
      setSuccessMsg('User created. Share credentials securely with the user.');
      setCreatedUserEmail(emailCreated);
      refresh();
    } catch (e) { setError(e.message); }
  };

  const copyCreatedEmail = () => {
    if (!createdUserEmail) return;
    navigator.clipboard?.writeText(createdUserEmail).then(() => {
      setSuccessMsg('Email copied to clipboard.');
    }).catch(() => {});
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Organization setup</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Departments, wards, pharmacy stores, services (billing codes), and users.
        </p>
        {(user?.role === 'super_admin' || user?.role === 'role_super_admin') && !user?.org_id && (
          <select value={orgId} onChange={(e) => { const id = e.target.value; setOrgId(id); setSelectedOrgId(id); }} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
            <option value="">Select organization</option>
            {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        {!currentOrgId && <p className="login-error">Select an organization.</p>}
        <div className="flow-step" style={{ flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          {TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'active' : ''} onClick={() => { setTab(t.id); setSuccessMsg(''); setCreatedUserEmail(''); }}>{t.icon} {t.label}</button>
          ))}
        </div>
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {successMsg && <div className="login-success" style={{ marginBottom: '1rem' }}>{successMsg}{createdUserEmail && <button type="button" onClick={copyCreatedEmail} className="btn" style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Copy email</button>}</div>}

        {tab === 'departments' && (
          <div className="card card-interactive">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Departments</h3>
              <form onSubmit={handleCreateDepartment} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ padding: '0.5rem' }} />
                <button type="submit" className="btn-primary" disabled={!currentOrgId || loading}>Add</button>
              </form>
              <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>ID</th></tr></thead><tbody>{departments.map((d) => <tr key={d.id}><td>{d.name}</td><td>{d.id}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {tab === 'wards' && (
          <div className="card card-interactive">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Wards</h3>
              <form onSubmit={handleCreateWard} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ padding: '0.5rem' }} />
                <input type="number" value={form.bed_count} onChange={(e) => setForm((f) => ({ ...f, bed_count: e.target.value }))} placeholder="Beds" style={{ padding: '0.5rem', width: 80 }} />
                <button type="submit" className="btn-primary" disabled={!currentOrgId || loading}>Add</button>
              </form>
              <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Beds</th><th>ID</th></tr></thead><tbody>{wards.map((w) => <tr key={w.id}><td>{w.name}</td><td>{w.bed_count}</td><td>{w.id}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {tab === 'stores' && (
          <div className="card card-interactive">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Pharmacy stores</h3>
              <form onSubmit={handleCreateStore} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Store name" style={{ padding: '0.5rem' }} />
                <button type="submit" className="btn-primary" disabled={!currentOrgId || loading}>Add</button>
              </form>
              <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>ID</th></tr></thead><tbody>{stores.map((s) => <tr key={s.id}><td>{s.name}</td><td>{s.id}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {tab === 'services' && (
          <div className="card card-interactive">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Services (billing codes)</h3>
              <form onSubmit={handleCreateService} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Code" style={{ padding: '0.5rem', width: 100 }} />
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" style={{ padding: '0.5rem', width: 180 }} />
                <input type="number" value={form.default_amount} onChange={(e) => setForm((f) => ({ ...f, default_amount: e.target.value }))} placeholder="Amount" style={{ padding: '0.5rem', width: 90 }} />
                <select value={form.default_currency} onChange={(e) => setForm((f) => ({ ...f, default_currency: e.target.value }))} style={{ padding: '0.5rem' }}><option value="USD">USD</option><option value="LRD">LRD</option></select>
                <button type="submit" className="btn-primary" disabled={!currentOrgId || loading}>Add</button>
              </form>
              <div className="table-wrap"><table className="table"><thead><tr><th>Code</th><th>Name</th><th>Amount</th><th>Currency</th></tr></thead><tbody>{services.map((s) => <tr key={s.id}><td>{s.code}</td><td>{s.name}</td><td>{s.default_amount != null ? s.default_amount : '—'}</td><td>{s.default_currency}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="card card-interactive">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Users — Create & assign role</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>Create a user for this organization and assign a role (e.g. Org Admin, doctor, nurse).</p>
              <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem', maxWidth: 400 }}>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" required style={{ padding: '0.5rem' }} />
                <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Password" required style={{ padding: '0.5rem' }} />
                <input type="text" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Full name" style={{ padding: '0.5rem' }} />
                <select value={form.role_id} onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))} style={{ padding: '0.5rem' }}>
                  <option value="">Role (optional — defaults to Org Admin)</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <select value={form.department_id} onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))} style={{ padding: '0.5rem' }}>
                  <option value="">Department (optional)</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <button type="submit" className="btn-primary" disabled={!currentOrgId || loading}>Create user</button>
              </form>
              <div className="table-wrap"><table className="table"><thead><tr><th>Email</th><th>Full name</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.map((u) => <tr key={u.id}><td>{u.email}</td><td>{u.full_name || '—'}</td><td>{roles.find((r) => r.id === u.role_id)?.name || u.role_id || '—'}</td><td>{u.status}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
