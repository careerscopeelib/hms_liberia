import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';

const EMPTY_EMP = {
  firstName: '', middleName: '', lastName: '', birthdate: '', gender: '', emailID: '', mobileno: '', adharNo: '',
  country: '', state: '', city: '', residentialAddress: '', permanentAddress: '', role: 'receptionist', qualification: '', specialization: '', createLogin: true,
};

export default function LegacyEmployees({ user, onLogout }) {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_EMP);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.getEmployees()
      .then((r) => setList(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    load();
  }, [user, navigate]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_EMP);
    setShowForm(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      firstName: row.firstName ?? '', middleName: row.middleName ?? '', lastName: row.lastName ?? '', birthdate: row.birthdate ?? '',
      gender: row.gender ?? '', emailID: row.emailID ?? '', mobileno: row.mobileno ?? '', adharNo: row.adharNo ?? '',
      country: row.country ?? '', state: row.state ?? '', city: row.city ?? '',
      residentialAddress: row.residentialAddress ?? '', permanentAddress: row.permanentAddress ?? '',
      qualification: row.qualification ?? '', specialization: row.specialization ?? '',
    });
    setShowForm(true);
  };

  const openView = (row) => setShowView(row);
  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_EMP); };
  const closeView = () => setShowView(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await api.updateEmployee(editing.eid, form);
      } else {
        await api.createEmployee(form);
      }
      closeForm();
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove employee ${row.firstName} ${row.lastName} (${row.eid})?`)) return;
    setError('');
    try {
      await api.deleteEmployee(row.eid);
      load();
      closeView();
    } catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Employees</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Manage staff: add, view, edit, or remove employees.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={openAdd}>Add employee</button>
        </p>
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : (
          <div className="card card--padded">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>EID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Email</th>
                    <th>Mobile</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.eid}>
                      <td><strong>{row.eid}</strong></td>
                      <td>{[row.firstName, row.middleName, row.lastName].filter(Boolean).join(' ') || '—'}</td>
                      <td>{row.role || '—'}</td>
                      <td>{row.emailID || '—'}</td>
                      <td>{row.mobileno ?? '—'}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-primary" onClick={() => openView(row)}>View</button>
                          <button type="button" className="btn" onClick={() => openEdit(row)}>Edit</button>
                          <button type="button" className="btn btn--danger" onClick={() => handleDelete(row)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.length === 0 && <p style={{ padding: '1rem', margin: 0, color: 'var(--color-text-muted)' }}>No employees.</p>}
          </div>
        )}

        {showView && (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal-dialog modal-dialog--md" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Employee: {showView.eid}</h3>
                <button type="button" className="modal-close" onClick={closeView} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <ul className="detail-list">
                  <li><span className="detail-label">Name</span><span className="detail-value">{[showView.firstName, showView.middleName, showView.lastName].filter(Boolean).join(' ') || '—'}</span></li>
                  <li><span className="detail-label">Role</span><span className="detail-value">{showView.role || '—'}</span></li>
                  <li><span className="detail-label">Qualification</span><span className="detail-value">{showView.qualification || '—'}</span></li>
                  <li><span className="detail-label">Specialization</span><span className="detail-value">{showView.specialization || '—'}</span></li>
                  <li><span className="detail-label">Email</span><span className="detail-value">{showView.emailID || '—'}</span></li>
                  <li><span className="detail-label">Mobile</span><span className="detail-value">{showView.mobileno ?? '—'}</span></li>
                  <li><span className="detail-label">Address</span><span className="detail-value">{showView.residentialAddress || showView.city || '—'}</span></li>
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => { closeView(); openEdit(showView); }}>Edit</button>
                <button type="button" className="btn btn--danger" onClick={() => handleDelete(showView)}>Delete</button>
                <button type="button" className="btn btn-primary" onClick={closeView}>Close</button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={closeForm}>
            <div className="modal-dialog modal-dialog--lg" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editing ? 'Edit employee' : 'Add employee'}</h3>
                <button type="button" className="modal-close" onClick={closeForm} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <form className="modal-form" onSubmit={handleSubmit}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">First name</label>
                      <input type="text" className="form-input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Last name</label>
                      <input type="text" className="form-input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Middle name</label>
                      <input type="text" className="form-input" value={form.middleName} onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Birthdate</label>
                      <input type="date" className="form-input" value={form.birthdate} onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <input type="text" className="form-input" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))} placeholder="M/F" />
                    </div>
                    {!editing && (
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <select className="form-select" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                          <option value="receptionist">Receptionist</option>
                          <option value="doctor">Doctor</option>
                          <option value="administrator">Administrator</option>
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-input" value={form.emailID} onChange={(e) => setForm((f) => ({ ...f, emailID: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile</label>
                      <input type="text" className="form-input" value={form.mobileno} onChange={(e) => setForm((f) => ({ ...f, mobileno: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Aadhar</label>
                      <input type="text" className="form-input" value={form.adharNo} onChange={(e) => setForm((f) => ({ ...f, adharNo: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Qualification</label>
                      <input type="text" className="form-input" value={form.qualification} onChange={(e) => setForm((f) => ({ ...f, qualification: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Specialization</label>
                      <input type="text" className="form-input" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
                    </div>
                    <div className="form-group form-group--span-2">
                      <label className="form-label">Residential address</label>
                      <input type="text" className="form-input" value={form.residentialAddress} onChange={(e) => setForm((f) => ({ ...f, residentialAddress: e.target.value }))} />
                    </div>
                    <div className="form-group form-group--span-2">
                      <label className="form-label">Permanent address</label>
                      <input type="text" className="form-input" value={form.permanentAddress} onChange={(e) => setForm((f) => ({ ...f, permanentAddress: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <input type="text" className="form-input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">State</label>
                      <input type="text" className="form-input" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input type="text" className="form-input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                    </div>
                    {!editing && (
                      <div className="form-group form-group--span-2">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="checkbox" checked={form.createLogin} onChange={(e) => setForm((f) => ({ ...f, createLogin: e.target.checked }))} />
                          <span className="form-label" style={{ margin: 0 }}>Create login (username = EID, password = Aadhar)</span>
                        </label>
                      </div>
                    )}
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" className="btn" onClick={closeForm}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
