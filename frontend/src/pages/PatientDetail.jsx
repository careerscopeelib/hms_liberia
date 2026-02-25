import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function PatientDetail({ user, onLogout, initialTab = 'overview' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(initialTab);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [transferShow, setTransferShow] = useState(null);
  const [transferForm, setTransferForm] = useState({ to_org_id: '', from_mrn: '', transfer_type: 'to_hospital', reason: '', summary_notes: '', create_encounter_at_dest: true });
  const [organizations, setOrganizations] = useState([]);
  const currentOrgId = getEffectiveOrgId(user);

  useEffect(() => {
    if (!id) return;
    api.uhpcms.getPatientFullRecord(id)
      .then((r) => { setData(r.data); setEditForm(r.data?.patient ? { ...r.data.patient } : null); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    api.uhpcms.getOrganizations().then((r) => setOrganizations(r.data || [])).catch(() => []);
  }, []);

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm || !id) return;
    setSaving(true);
    setError('');
    try {
      await api.uhpcms.updatePatient(id, {
        full_name: editForm.full_name,
        date_of_birth: editForm.date_of_birth,
        gender: editForm.gender,
        phone: editForm.phone,
        address: editForm.address,
        pid: editForm.pid,
      });
      const updated = await api.uhpcms.getPatientFullRecord(id);
      setData(updated.data);
      setEditForm(updated.data?.patient ? { ...updated.data.patient } : null);
      setTab('overview');
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this patient? Only possible when they have no encounters.')) return;
    setError('');
    try {
      await api.uhpcms.deletePatient(id);
      navigate('/patients');
    } catch (e) { setError(e.message); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!data?.patient || !transferForm.to_org_id) return;
    setError('');
    const isToHospital = transferShow === 'to_hospital';
    try {
      await api.uhpcms.transferPatient({
        from_org_id: isToHospital ? data.patient.org_id : transferForm.to_org_id,
        to_org_id: isToHospital ? transferForm.to_org_id : data.patient.org_id,
        from_mrn: isToHospital ? data.patient.mrn : (transferForm.from_mrn || data.patient.mrn),
        to_mrn: isToHospital ? undefined : data.patient.mrn,
        transfer_type: isToHospital ? 'to_hospital' : 'from_hospital',
        reason: transferForm.reason || undefined,
        summary_notes: transferForm.summary_notes || undefined,
        create_encounter_at_dest: transferForm.create_encounter_at_dest,
      });
      setTransferShow(null);
      const updated = await api.uhpcms.getPatientFullRecord(id);
      setData(updated.data);
    } catch (e) { setError(e.message); }
  };

  if (loading || !data) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="loading-state">{loading ? 'Loading…' : 'Patient not found.'}</div>
      </Layout>
    );
  }

  const { patient, encounters, transfer_history } = data;
  const hospitals = organizations.filter((o) => o.type === 'hospital');
  const clinics = organizations.filter((o) => o.type === 'clinic');

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Patient: {patient.full_name || patient.mrn}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={() => setTab('overview')}>Overview</button>
            <button type="button" className="btn" onClick={() => setTab('edit')}>Edit</button>
            <button type="button" className="btn" onClick={() => setTransferShow('to_hospital')}>Transfer to hospital</button>
            <button type="button" className="btn" onClick={() => setTransferShow('from_hospital')}>Transfer from hospital</button>
            <button type="button" className="btn" style={{ color: 'var(--color-error, #c00)' }} onClick={handleDelete}>Delete</button>
            <button type="button" className="btn" onClick={() => navigate('/patients')}>Back to list</button>
          </div>
        </div>
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {tab === 'overview' && (
          <>
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0 }}>Demographics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div><strong>MRN</strong><br />{patient.mrn}</div>
                <div><strong>Full name</strong><br />{patient.full_name || '—'}</div>
                <div><strong>PID</strong><br />{patient.pid || '—'}</div>
                <div><strong>DOB</strong><br />{patient.date_of_birth || '—'}</div>
                <div><strong>Gender</strong><br />{patient.gender || '—'}</div>
                <div><strong>Phone</strong><br />{patient.phone || '—'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Address</strong><br />{patient.address || '—'}</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0 }}>Medical records & encounters</h3>
              {encounters.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No encounters yet.</p>
              ) : (
                encounters.map((enc) => (
                  <div key={enc.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong>Encounter {enc.id}</strong>
                      <span>{enc.status} · {enc.registered_at ? new Date(enc.registered_at).toLocaleString() : ''}</span>
                    </div>
                    {enc.triage && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Triage:</strong> {enc.triage.severity || '—'} · {enc.triage.notes || '—'}
                      </div>
                    )}
                    {enc.soap_notes && <div style={{ marginBottom: '0.5rem' }}><strong>SOAP / Diagnosis:</strong><br /><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{enc.soap_notes}</pre></div>}
                    {enc.referral_notes && <div style={{ marginBottom: '0.5rem' }}><strong>Referral:</strong> {enc.referral_notes}</div>}
                    {enc.lab_orders?.length > 0 && (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Labs:</strong>
                        <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                          {enc.lab_orders.map((l) => <li key={l.id}>{l.test_name} {l.result_value != null ? `→ ${l.result_value} ${l.result_unit || ''}` : `(${l.status})`}</li>)}
                        </ul>
                      </div>
                    )}
                    {enc.prescriptions?.length > 0 && (
                      <div>
                        <strong>Prescriptions:</strong>
                        <ul style={{ margin: '0.25rem 0 0 1rem' }}>
                          {enc.prescriptions.map((rx) => (
                            <li key={rx.id}>
                              {rx.status} · {rx.items?.map((i) => `${i.drug_id} x${i.quantity}`).join(', ') || '—'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginTop: 0 }}>Transfer history</h3>
              {transfer_history?.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>No transfers.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                  {transfer_history?.map((t) => (
                    <li key={t.id}>
                      {t.direction === 'out' ? 'Out' : 'In'} → {t.direction === 'out' ? t.to_org_name : t.from_org_name} ({t.transferred_at ? new Date(t.transferred_at).toLocaleString() : ''}) {t.reason ? `— ${t.reason}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === 'edit' && editForm && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Edit patient</h3>
            <form onSubmit={handleSaveEdit} style={{ display: 'grid', gap: '0.75rem', maxWidth: 400 }}>
              <label>Full name <input type="text" value={editForm.full_name || ''} onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
              <label>Date of birth <input type="date" value={editForm.date_of_birth || ''} onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
              <label>Gender <select value={editForm.gender || ''} onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }}><option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></label>
              <label>Phone <input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
              <label>Address <textarea value={editForm.address || ''} onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.5rem' }} /></label>
              <label>PID (legacy) <input type="text" value={editForm.pid || ''} onChange={(e) => setEditForm((f) => ({ ...f, pid: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </form>
          </div>
        )}

        {transferShow && (
          <div className="card" style={{ marginTop: '1rem', maxWidth: 500 }}>
            <h3 style={{ marginTop: 0 }}>{transferShow === 'to_hospital' ? 'Transfer to hospital' : 'Transfer from hospital'}</h3>
            <form onSubmit={handleTransfer}>
              <label>Destination / Source organization</label>
              <select value={transferForm.to_org_id} onChange={(e) => setTransferForm((f) => ({ ...f, to_org_id: e.target.value }))} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}>
                <option value="">— Select —</option>
                {hospitals.filter((o) => o.id !== patient.org_id).map((o) => <option key={o.id} value={o.id}>{o.name} ({o.type})</option>)}
              </select>
              {transferShow === 'from_hospital' && (
                <label>MRN at hospital (if known)<input type="text" value={transferForm.from_mrn} onChange={(e) => setTransferForm((f) => ({ ...f, from_mrn: e.target.value }))} placeholder="e.g. MRN001" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} /></label>
              )}
              <label>Reason</label>
              <input type="text" value={transferForm.reason} onChange={(e) => setTransferForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Specialist care" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
              <label>Summary notes</label>
              <textarea value={transferForm.summary_notes} onChange={(e) => setTransferForm((f) => ({ ...f, summary_notes: e.target.value }))} rows={2} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="checkbox" checked={transferForm.create_encounter_at_dest} onChange={(e) => setTransferForm((f) => ({ ...f, create_encounter_at_dest: e.target.checked }))} />
                Create encounter at destination
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn-primary">Transfer</button>
                <button type="button" className="btn" onClick={() => setTransferShow(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
