import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId, getSelectedOrgId, setSelectedOrgId } from '../utils/org';

export default function Patients({ user, onLogout }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryQ = searchParams.get('q') || '';
  const [organizations, setOrganizations] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentOrgId = getEffectiveOrgId(user);

  const filteredPatients = queryQ.trim()
    ? patients.filter((p) => {
        const q = queryQ.toLowerCase();
        return (p.mrn && p.mrn.toLowerCase().includes(q)) ||
          (p.full_name && p.full_name.toLowerCase().includes(q)) ||
          (p.phone && p.phone.includes(q)) ||
          (p.pid && String(p.pid).toLowerCase().includes(q));
      })
    : patients;

  useEffect(() => {
    api.uhpcms.getOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => []);
  }, [user]);

  useEffect(() => {
    if (!currentOrgId) { setLoading(false); return; }
    const fetchPatients = () => {
      setLoading(true);
      api.uhpcms.getPatients({ org_id: currentOrgId })
        .then((r) => setPatients(r.data || []))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    };
    fetchPatients();
    const interval = setInterval(fetchPatients, 60000);
    return () => clearInterval(interval);
  }, [currentOrgId]);

  const handleDelete = async (id, mrn) => {
    if (!window.confirm(`Delete patient ${mrn}? This is only allowed when they have no encounters.`)) return;
    setError('');
    try {
      await api.uhpcms.deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Patients</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          View, edit, delete, or transfer patients. Open a patient to see full medical records, labs, diagnosis, and transfer history.
        </p>
        {queryQ && (
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
            Search: &quot;{queryQ}&quot; — {filteredPatients.length} result(s)
          </p>
        )}
        {(user?.role === 'super_admin' || user?.role === 'role_super_admin') && !user?.org_id && (
          <select
            value={getSelectedOrgId()}
            onChange={(e) => { const id = e.target.value; setSelectedOrgId(id); }}
            style={{ padding: '0.5rem', marginBottom: '1rem' }}
          >
            <option value="">Select organization</option>
            {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
        {!currentOrgId && <p className="login-error">Select an organization.</p>}
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {currentOrgId && (
          <p style={{ marginBottom: '1rem' }}>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/workflow')}>Register new patient</button>
            <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Opens Patient flow to register with optional demographics.</span>
          </p>
        )}
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : (
          <div className="card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>MRN</th>
                    <th>Name</th>
                    <th>PID</th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((p) => (
                    <tr key={p.id}>
                      <td><strong>{p.mrn}</strong></td>
                      <td>{p.full_name || '—'}</td>
                      <td>{p.pid || '—'}</td>
                      <td>{p.gender || '—'}</td>
                      <td>{p.phone || '—'}</td>
                      <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                      <td>
                        <button type="button" className="btn btn-primary" style={{ marginRight: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => navigate(`/patients/${p.id}`)}>View</button>
                        <button type="button" className="btn" style={{ marginRight: '0.25rem', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => navigate(`/patients/${p.id}/edit`)}>Edit</button>
                        <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', color: 'var(--color-error, #c00)' }} onClick={() => handleDelete(p.id, p.mrn)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {patients.length === 0 && currentOrgId && <p style={{ padding: '1rem', margin: 0, color: 'var(--color-text-muted)' }}>No patients yet. Register from Patient flow.</p>}
            {patients.length > 0 && filteredPatients.length === 0 && queryQ && <p style={{ padding: '1rem', margin: 0, color: 'var(--color-text-muted)' }}>No patients match &quot;{queryQ}&quot;.</p>}
          </div>
        )}
      </div>
    </Layout>
  );
}
