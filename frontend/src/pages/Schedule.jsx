import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Schedule({ user, onLogout }) {
  const orgId = getEffectiveOrgId(user);
  const [schedules, setSchedules] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ doctor_id: '', department_id: '', day_of_week: 0, start_time: '09:00', end_time: '17:00' });

  useEffect(() => {
    if (!orgId) return setLoading(false);
    Promise.all([
      api.uhpcms.getSchedules({ org_id: orgId }),
      api.uhpcms.getDepartments(orgId).catch(() => ({ data: [] })),
      api.uhpcms.getUsers(orgId).catch(() => ({ data: [] })),
    ]).then(([s, d, u]) => {
      setSchedules(s.data || []);
      setDepartments(d.data || []);
      setDoctors((u.data || []).filter((x) => (x.role_name || '').toLowerCase().includes('doctor')));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [orgId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.uhpcms.createSchedule({ org_id: orgId, ...form });
      const r = await api.uhpcms.getSchedules({ org_id: orgId });
      setSchedules(r.data || []);
      setModal(false);
      setForm({ doctor_id: '', department_id: '', day_of_week: 0, start_time: '09:00', end_time: '17:00' });
    } catch (err) {
      alert(err.message || 'Failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this schedule slot?')) return;
    try {
      await api.uhpcms.deleteSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Schedule Management</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Add and manage doctor schedules (weekly slots).
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={() => setModal(true)}>Add Schedule</button>
        </div>
        <div className="card">
          {loading ? <p style={{ padding: '1.5rem', margin: 0 }}>Loading…</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td>{s.doctor_id}</td>
                      <td>{DAYS[s.day_of_week] ?? s.day_of_week}</td>
                      <td>{s.start_time} – {s.end_time}</td>
                      <td>
                        <button type="button" className="btn table-actions btn--danger" onClick={() => handleDelete(s.id)}>Delete</button>
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
            <div className="modal-header"><h3>Add Schedule</h3><button type="button" className="modal-close" onClick={() => setModal(false)}>×</button></div>
            <form className="modal-body" onSubmit={handleAdd}>
              <div className="modal-form form-grid">
                <div className="form-group">
                  <label className="form-label">Doctor ID</label>
                  <select className="form-select" value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })} required>
                    <option value="">Select</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name || d.id}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <select className="form-select" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Start</label>
                  <input type="time" className="form-input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">End</label>
                  <input type="time" className="form-input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
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
