import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Inpatient({ user, onLogout }) {
  const [admissions, setAdmissions] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [newEncounterId, setNewEncounterId] = useState('');
  const [newWardId, setNewWardId] = useState('');
  const [newBed, setNewBed] = useState('');

  const orgId = getEffectiveOrgId(user);

  const load = () => {
    setLoading(true);
    const params = {};
    if (orgId) params.org_id = orgId;
    if (activeOnly) params.status = 'active';
    Promise.all([
      api.uhpcms.getAdmissions(params).then((r) => setAdmissions(r.data || [])),
      api.uhpcms.getEncounters({ org_id: orgId }).then((r) => setEncounters(r.data || [])),
      api.uhpcms.getWards(orgId).then((r) => setWards(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orgId, activeOnly]);

  const handleAdmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEncounterId || !newWardId || !newBed) return;
    try {
      await api.uhpcms.createAdmission({ encounter_id: newEncounterId, ward_id: newWardId, bed: newBed });
      setNewEncounterId('');
      setNewWardId('');
      setNewBed('');
      load();
    } catch (e) { setError(e.message); }
  };

  const handleDischarge = async (id) => {
    setError('');
    try {
      await api.uhpcms.dischargeAdmission(id);
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Inpatient — Admissions</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Admit from encounter, assign ward and bed; discharge when ready.</p>
        {!orgId && (user?.role === 'super_admin' || user?.role === 'role_super_admin') && (
          <p className="login-error" style={{ marginBottom: '1rem' }}>Select an organization in the sidebar to use this page.</p>
        )}
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="card card-interactive" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>New admission</h3>
            <form onSubmit={handleAdmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <label>
                Encounter
                <select value={newEncounterId} onChange={(e) => setNewEncounterId(e.target.value)} required style={{ display: 'block', padding: '0.5rem', minWidth: 220 }}>
                  <option value="">Select</option>
                  {encounters.filter((e) => e.status !== 'discharged').map((e) => <option key={e.id} value={e.id}>{e.id} — {e.patient_mrn}</option>)}
                </select>
              </label>
              <label>
                Ward
                <select value={newWardId} onChange={(e) => setNewWardId(e.target.value)} required style={{ display: 'block', padding: '0.5rem' }}>
                  <option value="">Select</option>
                  {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              <label>
                Bed
                <input type="text" value={newBed} onChange={(e) => setNewBed(e.target.value)} required placeholder="e.g. 101" style={{ display: 'block', padding: '0.5rem' }} />
              </label>
              <button type="submit" className="btn-primary">Admit</button>
            </form>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Active only
        </label>

        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Encounter</th>
                  <th>Ward</th>
                  <th>Bed</th>
                  <th>Admitted</th>
                  <th>Discharged</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={7}>Loading…</td></tr> : admissions.length === 0 ? <tr><td colSpan={7}>No admissions</td></tr> : admissions.map((a) => (
                  <tr key={a.id}>
                    <td>{a.id}</td>
                    <td>{a.encounter_id}</td>
                    <td>{a.ward_id}</td>
                    <td>{a.bed}</td>
                    <td>{a.admitted_at || '—'}</td>
                    <td>{a.discharged_at || '—'}</td>
                    <td>{!a.discharged_at && <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDischarge(a.id)}>Discharge</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
