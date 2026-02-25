import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';

const STATUS_LABEL = { 0: 'In queue', 1: 'With doctor', 2: 'Completed' };

export default function OpdQueue({ user, onLogout }) {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ pid: '', doctorid: '' });
  const [showView, setShowView] = useState(null);
  const [viewDetails, setViewDetails] = useState(null);
  const [showEdit, setShowEdit] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([api.getOpd(), api.getPatients(), api.getDoctors()])
      .then(([opdRes, pr, dr]) => {
        setList(Array.isArray(opdRes?.data) ? opdRes.data : []);
        setPatients(Array.isArray(pr?.data) ? pr.data : []);
        setDoctors(Array.isArray(dr?.data) ? dr.data : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    load();
  }, [user, navigate]);

  const openAdd = () => { setAddForm({ pid: '', doctorid: '' }); setShowAdd(true); };
  const closeAdd = () => setShowAdd(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.pid || !addForm.doctorid) return;
    setSaving(true);
    setError('');
    try {
      await api.createOpd({ pid: addForm.pid, doctorid: addForm.doctorid });
      closeAdd();
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const openView = async (row) => {
    setShowView(row);
    setViewDetails(null);
    try {
      const r = await api.getOpdDetails(row.opdid);
      setViewDetails(r?.data ?? null);
    } catch {
      setViewDetails(null);
    }
  };
  const closeView = () => { setShowView(null); setViewDetails(null); };

  const openEdit = async (row) => {
    setShowEdit(row);
    let details = null;
    try {
      const r = await api.getOpdDetails(row.opdid);
      details = r?.data;
    } catch {}
    setEditForm({
      symptoms: details?.symptoms ?? '',
      diagnosis: details?.diagnosis ?? '',
      medicinesDose: details?.medicinesDose ?? '',
      dos: details?.dos ?? '',
      donts: details?.donts ?? '',
      investigations: details?.investigations ?? '',
      followupDate: details?.followupDate ?? '',
      fees: details?.fees ?? '',
    });
  };
  const closeEdit = () => { setShowEdit(null); setEditForm(null); };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    if (!showEdit || !editForm) return;
    setSaving(true);
    setError('');
    try {
      await api.updateOpdDetails(showEdit.opdid, editForm);
      closeEdit();
      load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleComplete = async (row) => {
    setError('');
    try {
      await api.completeOpd(row.opdid);
      load();
      if (showView?.opdid === row.opdid) closeView();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove OPD entry #${row.opdid} (patient ${row.pid}) from queue?`)) return;
    setError('');
    try {
      await api.deleteOpd(row.opdid);
      load();
      closeView();
      closeEdit();
    } catch (e) { setError(e.message); }
  };

  const patientName = (pid) => {
    const p = patients.find((x) => x.pid === pid);
    return p ? [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ') : pid;
  };
  const doctorName = (eid) => {
    const d = doctors.find((x) => x.eid === eid);
    return d ? [d.firstName, d.middleName, d.lastName].filter(Boolean).join(' ') : eid || '—';
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">OPD Queue</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Add patients to the queue, view or edit visit details, complete visits, or remove from queue.
        </p>
        <p style={{ marginBottom: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={openAdd}>Add to queue</button>
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
                    <th>OPD ID</th>
                    <th>Visit date</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row) => (
                    <tr key={row.opdid}>
                      <td><strong>{row.opdid}</strong></td>
                      <td>{row.visitdate ?? '—'}</td>
                      <td>{patientName(row.pid)} ({row.pid})</td>
                      <td>{doctorName(row.doctorid)}</td>
                      <td>{STATUS_LABEL[row.status] ?? row.status}</td>
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
            {list.length === 0 && <p style={{ padding: '1rem', margin: 0, color: 'var(--color-text-muted)' }}>No OPD entries.</p>}
          </div>
        )}

        {showAdd && (
          <div className="modal-overlay" onClick={closeAdd}>
            <div className="modal-dialog modal-dialog--sm" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add to OPD queue</h3>
                <button type="button" className="modal-close" onClick={closeAdd} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <form className="modal-form" onSubmit={handleAdd}>
                  <div className="form-grid form-grid--full">
                    <div className="form-group">
                      <label className="form-label">Patient</label>
                      <select className="form-select" value={addForm.pid} onChange={(e) => setAddForm((f) => ({ ...f, pid: e.target.value }))} required>
                        <option value="">— Select —</option>
                        {patients.map((p) => <option key={p.pid} value={p.pid}>{[p.firstName, p.lastName].filter(Boolean).join(' ')} ({p.pid})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Doctor</label>
                      <select className="form-select" value={addForm.doctorid} onChange={(e) => setAddForm((f) => ({ ...f, doctorid: e.target.value }))} required>
                        <option value="">— Select —</option>
                        {doctors.map((d) => <option key={d.eid} value={d.eid}>{[d.firstName, d.lastName].filter(Boolean).join(' ')}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Add'}</button>
                    <button type="button" className="btn" onClick={closeAdd}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {showView && (
          <div className="modal-overlay" onClick={closeView}>
            <div className="modal-dialog modal-dialog--md" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>OPD #{showView.opdid}</h3>
                <button type="button" className="modal-close" onClick={closeView} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <ul className="detail-list">
                  <li><span className="detail-label">Visit date</span><span className="detail-value">{showView.visitdate}</span></li>
                  <li><span className="detail-label">Patient</span><span className="detail-value">{patientName(showView.pid)} ({showView.pid})</span></li>
                  <li><span className="detail-label">Doctor</span><span className="detail-value">{doctorName(showView.doctorid)}</span></li>
                  <li><span className="detail-label">Status</span><span className="detail-value">{STATUS_LABEL[showView.status] ?? showView.status}</span></li>
                  {viewDetails && (
                    <>
                      <li><span className="detail-label">Symptoms</span><span className="detail-value">{viewDetails.symptoms || '—'}</span></li>
                      <li><span className="detail-label">Diagnosis</span><span className="detail-value">{viewDetails.diagnosis || '—'}</span></li>
                      <li><span className="detail-label">Medicines</span><span className="detail-value">{viewDetails.medicinesDose || '—'}</span></li>
                      <li><span className="detail-label">Follow-up</span><span className="detail-value">{viewDetails.followupDate || '—'}</span></li>
                      <li><span className="detail-label">Fees</span><span className="detail-value">{viewDetails.fees ?? '—'}</span></li>
                    </>
                  )}
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => { closeView(); openEdit(showView); }}>Edit details</button>
                {showView.status !== 2 && <button type="button" className="btn" onClick={() => handleComplete(showView)}>Mark complete</button>}
                <button type="button" className="btn btn--danger" onClick={() => handleDelete(showView)}>Remove from queue</button>
                <button type="button" className="btn btn-primary" onClick={closeView}>Close</button>
              </div>
            </div>
          </div>
        )}

        {showEdit && editForm && (
          <div className="modal-overlay" onClick={closeEdit}>
            <div className="modal-dialog modal-dialog--md" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit OPD #{showEdit.opdid} details</h3>
                <button type="button" className="modal-close" onClick={closeEdit} aria-label="Close">×</button>
              </div>
              <div className="modal-body">
                <form className="modal-form" onSubmit={handleSaveDetails}>
                  <div className="form-grid form-grid--full">
                    <div className="form-group">
                      <label className="form-label">Symptoms</label>
                      <input type="text" className="form-input" value={editForm.symptoms} onChange={(e) => setEditForm((f) => ({ ...f, symptoms: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Diagnosis</label>
                      <input type="text" className="form-input" value={editForm.diagnosis} onChange={(e) => setEditForm((f) => ({ ...f, diagnosis: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Medicines / dose</label>
                      <input type="text" className="form-input" value={editForm.medicinesDose} onChange={(e) => setEditForm((f) => ({ ...f, medicinesDose: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Do&apos;s</label>
                      <input type="text" className="form-input" value={editForm.dos} onChange={(e) => setEditForm((f) => ({ ...f, dos: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Don&apos;ts</label>
                      <input type="text" className="form-input" value={editForm.donts} onChange={(e) => setEditForm((f) => ({ ...f, donts: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Investigations</label>
                      <input type="text" className="form-input" value={editForm.investigations} onChange={(e) => setEditForm((f) => ({ ...f, investigations: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Follow-up date</label>
                      <input type="text" className="form-input" value={editForm.followupDate} onChange={(e) => setEditForm((f) => ({ ...f, followupDate: e.target.value }))} placeholder="YYYY-MM-DD" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fees</label>
                      <input type="text" className="form-input" value={editForm.fees} onChange={(e) => setEditForm((f) => ({ ...f, fees: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    <button type="button" className="btn" onClick={closeEdit}>Cancel</button>
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
