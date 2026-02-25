import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getSelectedOrgId } from '../utils/org';

export default function AuditLog({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState('');
  const [orgId, setOrgId] = useState(user?.org_id || getSelectedOrgId());
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    api.uhpcms.getOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const params = { limit: 100 };
    if (orgId) params.org_id = orgId;
    if (module) params.module = module;
    setLoading(true);
    api.uhpcms.getAuditLog(params)
      .then((r) => setEntries(r.data || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [orgId, module]);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Audit & compliance</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {(user?.role === 'super_admin' || user?.role === 'role_super_admin') && (
            <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="">All orgs</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          )}
          <select value={module} onChange={(e) => setModule(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All modules</option>
            <option value="org_admin">Org admin</option>
            <option value="patient">Patient</option>
            <option value="triage">Triage</option>
            <option value="lab">Lab</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="clinic">Clinic</option>
          </select>
        </div>
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Time</th><th>User</th><th>Org</th><th>Module</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td>{e.created_at}</td>
                      <td>{e.user_id}</td>
                      <td>{e.org_id || '—'}</td>
                      <td>{e.module}</td>
                      <td>{e.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
