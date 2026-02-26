import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Appointments({ user, onLogout }) {
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [viewToday, setViewToday] = useState(false);
  const [newPatientMrn, setNewPatientMrn] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [checkInEncounterId, setCheckInEncounterId] = useState({});
  const orgId = getEffectiveOrgId(user);

  const todayStr = (() => { const d = new Date(); return d.toISOString().slice(0, 10); })();

  const load = () => {
    if (!orgId) return;
    setLoading(true);
    const params = { org_id: orgId };
    if (filterStatus) params.status = filterStatus;
    if (viewToday) {
      const d = new Date();
      const today = d.toISOString().slice(0, 10);
      params.from_date = today;
      params.to_date = today;
    }
    Promise.all([
      api.uhpcms.getAppointments(params).then((r) => setAppointments(r.data || [])),
      api.uhpcms.getDepartments(orgId).then((r) => setDepartments(r.data || [])),
      api.uhpcms.getEncounters({ org_id: orgId }).then((r) => setEncounters(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orgId, filterStatus, viewToday]);
  useEffect(() => {
    if (!orgId) return;
    const interval = setInterval(load, 45000);
    return () => clearInterval(interval);
  }, [orgId, filterStatus, viewToday]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPatientMrn || !newScheduledAt) return;
    try {
      await api.uhpcms.createAppointment({ org_id: orgId, patient_mrn: newPatientMrn, scheduled_at: newScheduledAt, department_id: newDepartmentId || undefined });
      setNewPatientMrn('');
      setNewScheduledAt('');
      load();
    } catch (e) { setError(e.message); }
  };

  const handleCheckIn = async (aptId) => {
    setError('');
    const encounterId = checkInEncounterId[aptId];
    try {
      await api.uhpcms.checkInAppointment(aptId, { encounter_id: encounterId || undefined });
      setCheckInEncounterId((prev) => ({ ...prev, [aptId]: undefined }));
      load();
    } catch (e) { setError(e.message); }
  };

  const handleComplete = async (aptId) => {
    setError('');
    try {
      await api.uhpcms.completeAppointment(aptId);
      load();
    } catch (e) { setError(e.message); }
  };

  const handleCancel = async (aptId) => {
    if (!window.confirm('Cancel this appointment?')) return;
    setError('');
    try {
      await api.uhpcms.cancelAppointment(aptId);
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Clinic — Appointments</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Book, check-in, complete. Link encounter on check-in.</p>
        {!orgId && (user?.role === 'super_admin' || user?.role === 'role_super_admin') && (
          <p className="login-error" style={{ marginBottom: '1rem' }}>Select an organization in the sidebar to use this page.</p>
        )}
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div className="card card-interactive" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>New appointment</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <label>
                Patient MRN
                <input type="text" value={newPatientMrn} onChange={(e) => setNewPatientMrn(e.target.value)} required placeholder="MRN" style={{ display: 'block', padding: '0.5rem' }} />
              </label>
              <label>
                Date & time
                <input type="datetime-local" value={newScheduledAt} onChange={(e) => setNewScheduledAt(e.target.value)} required style={{ display: 'block', padding: '0.5rem' }} />
              </label>
              <label>
                Department
                <select value={newDepartmentId} onChange={(e) => setNewDepartmentId(e.target.value)} style={{ display: 'block', padding: '0.5rem' }}>
                  <option value="">Optional</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <button type="submit" className="btn-primary" disabled={!orgId}>Create</button>
            </form>
          </div>
        </div>

        <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.5rem' }}>
            <option value="">All status</option>
            <option value="scheduled">scheduled</option>
            <option value="checked_in">checked_in</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button
            type="button"
            className={`btn ${viewToday ? 'btn-primary' : ''}`}
            onClick={() => setViewToday(!viewToday)}
          >
            {viewToday ? `Today (${appointments.length}) — Show all` : "View today's appointments"}
          </button>
          {viewToday && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              Showing appointments for {todayStr}
            </span>
          )}
        </div>

        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Patient MRN</th><th>Scheduled</th><th>Status</th><th>Encounter</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6}>Loading…</td></tr> : appointments.length === 0 ? <tr><td colSpan={6}>No appointments</td></tr> : appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>{apt.id}</td>
                    <td>{apt.patient_mrn}</td>
                    <td>{apt.scheduled_at}</td>
                    <td><span className="badge">{apt.status}</span></td>
                    <td>{apt.encounter_id || '—'}</td>
                    <td>
                      {apt.status === 'scheduled' && (
                        <span style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select value={checkInEncounterId[apt.id] || ''} onChange={(e) => setCheckInEncounterId((prev) => ({ ...prev, [apt.id]: e.target.value }))} style={{ padding: '0.25rem' }}>
                            <option value="">Encounter (optional)</option>
                            {encounters.map((enc) => <option key={enc.id} value={enc.id}>{enc.id}</option>)}
                          </select>
                          <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleCheckIn(apt.id)}>Check-in</button>
                          <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleCancel(apt.id)}>Cancel</button>
                        </span>
                      )}
                      {apt.status === 'checked_in' && (
                        <span style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleComplete(apt.id)}>Complete</button>
                          <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleCancel(apt.id)}>Cancel</button>
                        </span>
                      )}
                    </td>
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
