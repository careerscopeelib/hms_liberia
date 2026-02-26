import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Doctors({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [doctors, setDoctors] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDoctors().then((r) => r.data || []).catch(() => []),
      orgId ? api.uhpcms.getUsers(orgId).then((r) => (r.data || []).filter((u) => (u.role_name || u.role_id || '').toString().toLowerCase().includes('doctor'))) : Promise.resolve([]),
    ]).then(([legacy, orgUsers]) => {
      setDoctors(Array.isArray(legacy) ? legacy : []);
      setUsers(orgUsers);
    }).finally(() => setLoading(false));
  }, [orgId]);

  const list = doctors.length ? doctors : users.map((u) => ({ eid: u.id, firstName: u.full_name, role: u.role_name || 'doctor' }));

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Doctor Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Doctor list. Add doctors via Org setup → Users (assign doctor role).
        </p>
        <div className="card">
          {loading ? (
            <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Role / Specialty</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.eid || d.id}>
                      <td><code>{d.eid || d.id}</code></td>
                      <td>{d.firstName || [d.firstName, d.middleName, d.lastName].filter(Boolean).join(' ') || d.full_name}</td>
                      <td><span className="badge">{d.role || d.role_name || 'doctor'}</span></td>
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
