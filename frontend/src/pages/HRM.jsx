import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function HRM({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return setLoading(false);
    api.uhpcms.getUsers(orgId)
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Human Resource Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          View HRM. Add staff via Org setup → Users. Attendance and salary can be extended via add-ons.
        </p>
        <div className="card">
          {loading ? <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name || '—'}</td>
                      <td><code>{u.email}</code></td>
                      <td><span className="badge">{u.role_name || u.role_id || '—'}</span></td>
                      <td>{u.status || 'active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
