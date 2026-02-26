import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Beds({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [beds, setBeds] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ward_id: '', bed_number: '' });

  useEffect(() => {
    if (!orgId) return setLoading(false);
    Promise.all([
      api.uhpcms.getBeds({ org_id: orgId }).then((r) => r.data || []).catch(() => []),
      api.uhpcms.getBedAssignments({ org_id: orgId }).then((r) => r.data || []).catch(() => []),
      api.uhpcms.getWards(orgId).then((r) => r.data || []).catch(() => []),
    ]).then(([b, a, w]) => {
      setBeds(b);
      setAssignments(a);
      setWards(w);
    }).finally(() => setLoading(false));
  }, [orgId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.ward_id || !form.bed_number.trim()) return;
    try {
      await api.uhpcms.createBed(form);
      const r = await api.uhpcms.getBeds({ org_id: orgId });
      setBeds(r.data || []);
      setModal(false);
      setForm({ ward_id: '', bed_number: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Bed Manager</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Bed list and assignments.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>Add Bed</button>
        </div>
        <h3 className="section-title" style={{ fontSize: '1rem' }}>Bed list</h3>
        <div className="card">
          {loading ? <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ward</th>
                    <th>Bed #</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((b) => (
                    <tr key={b.id}>
                      <td>{b.ward_name}</td>
                      <td><code>{b.bed_number}</code></td>
                      <td><span className="badge">{b.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <h3 className="section-title" style={{ fontSize: '1rem' }}>Bed assign list (current admissions)</h3>
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ward</th>
                  <th>Bed</th>
                  <th>Encounter</th>
                  <th>Admitted</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.admission_id}>
                    <td>{a.ward_name}</td>
                    <td><code>{a.bed}</code></td>
                    <td>{a.encounter_id}</td>
                    <td>{a.admitted_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-dialog modal-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Bed</h3><button type="button" className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <form className="modal-body" onSubmit={handleAdd}>
              <div className="modal-form form-group">
                <label className="form-label">Ward</label>
                <select className="form-select" value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value })} required>
                  <option value="">Select</option>
                  {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="modal-form form-group">
                <label className="form-label">Bed number</label>
                <input type="text" className="form-input" value={form.bed_number} onChange={(e) => setForm({ ...form, bed_number: e.target.value })} required />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
