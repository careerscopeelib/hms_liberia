import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Departments({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orgId) return setLoading(false);
    api.uhpcms.getDepartments(orgId)
      .then((r) => setList(r.data || []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Name required');
    try {
      await api.uhpcms.createDepartment({ org_id: orgId, name: name.trim() });
      const r = await api.uhpcms.getDepartments(orgId);
      setList(r.data || []);
      setModal(false);
      setName('');
    } catch (err) {
      setError(err.message || 'Failed to add');
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Department Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Add and manage departments.
        </p>
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>
            Add Department
          </button>
        </div>
        <div className="card">
          {loading ? (
            <p style={{ padding: '1.5rem', margin: 0, color: 'var(--color-text-muted)' }}>Loading…</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((d) => (
                    <tr key={d.id}>
                      <td><code>{d.id}</code></td>
                      <td>{d.name}</td>
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
          <div className="modal-dialog modal-dialog--sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Department</h3>
              <button type="button" className="modal-close" onClick={() => setModal(false)}>×</button>
            </div>
            <form className="modal-body" onSubmit={handleAdd}>
              {error && <div className="login-error">{error}</div>}
              <div className="modal-form form-group">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" />
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
