import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Insurance({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ patient_mrn: '', provider_name: '', policy_number: '', coverage_details: '' });

  useEffect(() => {
    if (!orgId) return setLoading(false);
    api.uhpcms.getInsurancePolicies({ org_id: orgId })
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.provider_name.trim()) return;
    try {
      await api.uhpcms.createInsurancePolicy({ org_id: orgId, ...form });
      const r = await api.uhpcms.getInsurancePolicies({ org_id: orgId });
      setList(r.data || []);
      setModal(false);
      setForm({ patient_mrn: '', provider_name: '', policy_number: '', coverage_details: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this policy?')) return;
    try {
      await api.uhpcms.deleteInsurancePolicy(id);
      setList((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Insurance Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Add and manage insurance policies.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>Add Insurance</button>
        </div>
        <div className="card">
          {loading ? <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Policy #</th>
                    <th>Patient MRN</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td>{p.provider_name}</td>
                      <td><code>{p.policy_number || '—'}</code></td>
                      <td>{p.patient_mrn || '—'}</td>
                      <td><span className="badge">{p.status}</span></td>
                      <td><button type="button" className="btn btn--danger" onClick={() => handleDelete(p.id)}>Delete</button></td>
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
            <div className="modal-header"><h3>Add Insurance</h3><button type="button" className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <form className="modal-body" onSubmit={handleAdd}>
              <div className="modal-form form-grid">
                <div className="form-group">
                  <label className="form-label">Provider name *</label>
                  <input type="text" className="form-input" value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Policy number</label>
                  <input type="text" className="form-input" value={form.policy_number} onChange={(e) => setForm({ ...form, policy_number: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Patient MRN</label>
                  <input type="text" className="form-input" value={form.patient_mrn} onChange={(e) => setForm({ ...form, patient_mrn: e.target.value })} />
                </div>
                <div className="form-group form-group--span-2">
                  <label className="form-label">Coverage details</label>
                  <textarea className="form-textarea" value={form.coverage_details} onChange={(e) => setForm({ ...form, coverage_details: e.target.value })} />
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
