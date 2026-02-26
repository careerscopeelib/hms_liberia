import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function CaseManager({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ patient_mrn: '', doctor_id: '', case_type: '', notes: '' });

  useEffect(() => {
    if (!orgId) return setLoading(false);
    api.uhpcms.getCases({ org_id: orgId })
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.patient_mrn.trim()) return;
    try {
      await api.uhpcms.createCase({ org_id: orgId, ...form });
      const r = await api.uhpcms.getCases({ org_id: orgId });
      setList(r.data || []);
      setModal(false);
      setForm({ patient_mrn: '', doctor_id: '', case_type: '', notes: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const setStatus = async (id, status) => {
    try {
      await api.uhpcms.updateCase(id, { status });
      setList((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Case Manager</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Add and manage patient cases.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>Add Case</button>
        </div>
        <div className="card">
          {loading ? <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Patient MRN</th>
                    <th>Doctor</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td><code>{c.patient_mrn}</code></td>
                      <td>{c.doctor_id || '—'}</td>
                      <td>{c.case_type || '—'}</td>
                      <td><span className="badge">{c.status}</span></td>
                      <td>{c.created_at}</td>
                      <td className="table-actions">
                        {c.status !== 'closed' && (
                          <button type="button" className="btn" onClick={() => setStatus(c.id, 'in_progress')}>In progress</button>
                        )}
                        {c.status !== 'closed' && (
                          <button type="button" className="btn" onClick={() => setStatus(c.id, 'closed')}>Close</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Case</h3><button type="button" className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <form className="modal-body" onSubmit={handleAdd}>
              <div className="modal-form form-grid">
                <div className="form-group form-group--span-2">
                  <label className="form-label">Patient MRN *</label>
                  <input type="text" className="form-input" value={form.patient_mrn} onChange={(e) => setForm({ ...form, patient_mrn: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor ID</label>
                  <input type="text" className="form-input" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Case type</label>
                  <input type="text" className="form-input" value={form.case_type} onChange={(e) => setForm({ ...form, case_type: e.target.value })} />
                </div>
                <div className="form-group form-group--span-2">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
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
