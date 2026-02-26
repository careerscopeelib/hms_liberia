import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';
import DocumentList from '../components/DocumentList';

export default function Prescriptions({ user, onLogout }) {
  const navigate = useNavigate();
  const orgId = getEffectiveOrgId(user);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [docsForPrescriptionId, setDocsForPrescriptionId] = useState(null);
  const [prescriptionDocuments, setPrescriptionDocuments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.uhpcms.getPrescriptions(orgId ? { org_id: orgId } : {})
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!docsForPrescriptionId || !orgId) return;
    api.uhpcms.getDocuments({ org_id: orgId, entity_type: 'prescription', entity_id: docsForPrescriptionId })
      .then((r) => setPrescriptionDocuments(r.data || []))
      .catch(() => setPrescriptionDocuments([]));
  }, [docsForPrescriptionId, orgId]);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Prescription Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          View and manage prescriptions. Attach scanned prescriptions or notes per prescription.
        </p>
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/pharmacy')}>
            Open Pharmacy
          </button>
        </div>
        <div className="card">
          {loading ? <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Encounter</th>
                    <th>Prescribed by</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td><code>{p.id}</code></td>
                      <td>{p.encounter_id}</td>
                      <td>{p.prescribed_by || '—'}</td>
                      <td><span className="badge">{p.status}</span></td>
                      <td>{p.prescribed_at || p.created_at}</td>
                      <td>
                        <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setDocsForPrescriptionId(docsForPrescriptionId === p.id ? null : p.id)}>Documents</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {docsForPrescriptionId && orgId && (
          <div style={{ marginTop: '1rem' }}>
            <DocumentList
              documents={prescriptionDocuments}
              onRefresh={(list) => setPrescriptionDocuments(list || [])}
              uploadConfig={{ orgId, entityType: 'prescription', entityId: docsForPrescriptionId }}
              setError={setError}
              title={`Prescription documents — ${docsForPrescriptionId}`}
              emptyMessage="No documents. Upload scanned prescription or note."
            />
            <button type="button" className="btn" style={{ marginTop: '0.5rem' }} onClick={() => setDocsForPrescriptionId(null)}>Close</button>
          </div>
        )}
      </div>
    </Layout>
  );
}
