import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';
import DocumentList from '../components/DocumentList';

export default function HRM({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsForUserId, setDocsForUserId] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return setLoading(false);
    api.uhpcms.getUsers(orgId)
      .then((r) => setUsers(r.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!docsForUserId || !orgId) return;
    api.uhpcms.getDocuments({ org_id: orgId, entity_type: 'employee', entity_id: docsForUserId })
      .then((r) => setUserDocuments(r.data || []))
      .catch(() => setUserDocuments([]));
  }, [docsForUserId, orgId]);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Human Resource Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          View staff. Add staff via Org setup → Users. Attach employee documents (contracts, IDs) per user.
        </p>
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
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
                    <th>Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.full_name || '—'}</td>
                      <td><code>{u.email}</code></td>
                      <td><span className="badge">{u.role_name || u.role_id || '—'}</span></td>
                      <td>{u.status || 'active'}</td>
                      <td>
                        <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDocsForUserId(docsForUserId === u.id ? null : u.id)}>Documents</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {docsForUserId && orgId && (
          <div style={{ marginTop: '1rem' }}>
            <DocumentList
              documents={userDocuments}
              onRefresh={(list) => setUserDocuments(list || [])}
              uploadConfig={{ orgId, entityType: 'employee', entityId: docsForUserId }}
              setError={setError}
              title={`Employee documents — ${users.find((u) => u.id === docsForUserId)?.full_name || users.find((u) => u.id === docsForUserId)?.email || docsForUserId}`}
              emptyMessage="No documents. Upload contract or ID."
            />
            <button type="button" className="btn" style={{ marginTop: '0.5rem' }} onClick={() => setDocsForUserId(null)}>Close</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
