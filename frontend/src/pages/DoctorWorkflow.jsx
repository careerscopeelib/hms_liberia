import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

const ENCOUNTER_STATUS = ['on_treatment', 'admitted', 'discharged'];

function toCsv(rows) {
  if (!rows.length) return '';
  const header = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [header.join(','), ...rows.map((r) => header.map((k) => esc(r[k])).join(','))].join('\n');
}

function download(name, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DoctorWorkflow({ user, onLogout }) {
  const [searchParams] = useSearchParams();
  const encounterFromUrl = searchParams.get('encounter_id') || '';
  const role = String(user?.role || '').toLowerCase();
  const canEdit = role.includes('admin') || role.includes('doctor');
  const orgId = getEffectiveOrgId(user);
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounterFromUrl);
  const [drugs, setDrugs] = useState([]);
  const [wards, setWards] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const [form, setForm] = useState({
    consultation_notes: '',
    diagnosis: '',
    treatment_needed: '',
    note: '',
    referral_notes: '',
    lab_name: '',
    lab_code: '',
    rx_drug_id: '',
    rx_qty: 1,
    rx_dosage: '',
    rx_note: '',
    status: 'on_treatment',
    ward_id: '',
  });

  const selectedEncounter = useMemo(
    () => encounters.find((e) => e.id === selectedEncounterId) || null,
    [encounters, selectedEncounterId]
  );

  const previousRecords = useMemo(
    () => encounters.filter((e) => selectedPatient && e.patient_mrn === selectedPatient.mrn),
    [encounters, selectedPatient]
  );

  const loadWorkflowData = async () => {
    if (!orgId) return;
    await Promise.all([
      api.uhpcms.getPatients({ org_id: orgId }).then((r) => setPatients(r.data || [])).catch(() => setPatients([])),
      api.uhpcms.getEncounters({ org_id: orgId }).then((r) => setEncounters(r.data || [])).catch(() => setEncounters([])),
      api.uhpcms.getDrugs(orgId).then((r) => setDrugs(r.data || [])).catch(() => setDrugs([])),
      api.uhpcms.getWards(orgId).then((r) => setWards(r.data || [])).catch(() => setWards([])),
    ]);
  };

  useEffect(() => {
    if (!orgId) return;
    loadWorkflowData();
    const interval = setInterval(loadWorkflowData, 8000);
    return () => clearInterval(interval);
  }, [orgId]);

  useEffect(() => {
    if (!selectedEncounter) return;
    // Keep form in sync with selected encounter so save/edit behaves predictably.
    setForm((prev) => ({
      ...prev,
      consultation_notes: selectedEncounter.soap_notes || prev.consultation_notes,
      referral_notes: selectedEncounter.referral_notes || '',
      status: selectedEncounter.status || prev.status,
    }));
  }, [selectedEncounterId, selectedEncounter]);

  useEffect(() => {
    if (!encounterFromUrl || !encounters.length) return;
    const match = encounters.find((e) => e.id === encounterFromUrl);
    if (!match) return;
    setSelectedEncounterId(match.id);
    const patient = patients.find((p) => p.mrn === match.patient_mrn);
    if (patient) setSelectedPatient(patient);
  }, [encounterFromUrl, encounters, patients]);

  const handleCreateEncounter = async () => {
    if (!selectedPatient?.mrn || !orgId || !canEdit) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      const created = await api.uhpcms.createEncounter({
        org_id: orgId,
        patient_mrn: selectedPatient.mrn,
        department_id: null,
      });
      await loadWorkflowData();
      if (created?.id) setSelectedEncounterId(created.id);
      setOk('New encounter created and selected.');
    } catch (err) {
      setError(err.message || 'Failed to create encounter');
    } finally {
      setSaving(false);
    }
  };

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients.slice(0, 20);
    return patients.filter((p) =>
      (p.mrn || '').toLowerCase().includes(q) ||
      (p.pid || '').toLowerCase().includes(q) ||
      (p.full_name || '').toLowerCase().includes(q) ||
      encounters.some((e) => e.patient_mrn === p.mrn && (e.id || '').toLowerCase().includes(q))
    ).slice(0, 30);
  }, [query, patients, encounters]);

  const pickPatient = (p) => {
    setSelectedPatient(p);
    const firstEncounter = encounters.find((e) => e.patient_mrn === p.mrn);
    setSelectedEncounterId(firstEncounter?.id || '');
    setOk('');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!selectedEncounterId) return;
    setSaving(true);
    setError('');
    setOk('');
    try {
      const composedNotes = [
        `Consultation Notes:\n${form.consultation_notes || '-'}`,
        `Diagnosis:\n${form.diagnosis || '-'}`,
        `Treatment Needed:\n${form.treatment_needed || '-'}`,
        `Doctor Note:\n${form.note || '-'}`,
        form.rx_note ? `Prescription Note:\n${form.rx_note}` : null,
      ].filter(Boolean).join('\n\n');
      await api.uhpcms.updateEncounter(selectedEncounterId, {
        soap_notes: composedNotes,
        referral_notes: form.referral_notes || undefined,
        status: form.status,
      });

      if (form.status === 'admitted' && form.ward_id) {
        await api.uhpcms.createAdmission({ encounter_id: selectedEncounterId, ward_id: form.ward_id });
      }
      if (form.lab_name.trim()) {
        await api.uhpcms.createLabOrder({
          encounter_id: selectedEncounterId,
          test_name: form.lab_name.trim(),
          test_code: form.lab_code.trim() || undefined,
        });
      }
      if (form.rx_drug_id) {
        await api.uhpcms.createPrescription({
          encounter_id: selectedEncounterId,
          items: [{ drug_id: form.rx_drug_id, quantity: Number(form.rx_qty) || 1, dosage: form.rx_dosage || undefined }],
        });
      }
      await loadWorkflowData();
      window.dispatchEvent(new CustomEvent('uhpcms:workflow-updated', { detail: { encounterId: selectedEncounterId } }));
      setOk('Saved. Lab order sent to Lab Technician and prescription sent to Pharmacist.');
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const exportRecords = () => {
    if (!selectedPatient) return;
    const rows = previousRecords.map((r) => ({
      encounter_id: r.id,
      patient_mrn: r.patient_mrn,
      status: r.status,
      registered_at: r.registered_at,
      referral_notes: r.referral_notes || '',
    }));
    download(`doctor-records-${selectedPatient.mrn}.csv`, toCsv(rows), 'text/csv');
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Doctor Workflow</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Search by Patient ID, name, or encounter ID. Review previous records and save consultation, diagnosis, labs, treatment, drugs, referrals, and admission/discharge status.
        </p>
        {!canEdit && (
          <div className="login-success" style={{ marginBottom: '1rem' }}>
            Read-only mode for this account. Doctors and admins can edit/save workflow notes.
          </div>
        )}
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        {ok && <div className="login-success" style={{ marginBottom: '1rem' }}>{ok}</div>}

        <div className="card card-body" style={{ marginBottom: '1rem' }}>
          <label>
            Search patient
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Patient ID / Name / Encounter ID"
              style={{ display: 'block', width: '100%', maxWidth: 420, padding: '0.5rem', marginTop: '0.35rem' }}
            />
          </label>
          <div className="table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="table">
              <thead><tr><th>MRN</th><th>Name</th><th>PID</th><th /></tr></thead>
              <tbody>
                {searchResults.map((p) => (
                  <tr key={p.id}>
                    <td>{p.mrn}</td>
                    <td>{p.full_name || '—'}</td>
                    <td>{p.pid || '—'}</td>
                    <td><button type="button" className="btn btn-primary" onClick={() => pickPatient(p)}>Select</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selectedPatient && (
          <>
            <div className="card card-body" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Patient: {selectedPatient.full_name || selectedPatient.mrn}</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn" onClick={() => window.print()}>Print</button>
                  <button type="button" className="btn" onClick={exportRecords}>Export CSV</button>
                </div>
              </div>
              <p style={{ marginBottom: '0.5rem' }}>
                MRN: <strong>{selectedPatient.mrn}</strong> | PID: <strong>{selectedPatient.pid || '—'}</strong>
              </p>
              <label>
                Encounter
                <select value={selectedEncounterId} onChange={(e) => setSelectedEncounterId(e.target.value)} style={{ display: 'block', marginTop: '0.35rem', padding: '0.5rem', minWidth: 280 }}>
                  <option value="">Select encounter</option>
                  {previousRecords.map((e) => (
                    <option key={e.id} value={e.id}>{e.id} - {e.status}</option>
                  ))}
                </select>
              </label>
              <div style={{ marginTop: '0.5rem' }}>
                <button type="button" className="btn" onClick={handleCreateEncounter} disabled={!canEdit || saving}>
                  + New encounter for this patient
                </button>
              </div>
            </div>

            <div className="card card-body" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0 }}>Previous Records & Treatment</h3>
              {previousRecords.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No previous records.</p>
              ) : (
                <ul className="detail-list">
                  {previousRecords.slice(0, 8).map((r) => (
                    <li key={r.id}>
                      <span className="detail-label">{r.id}</span>
                      <span className="detail-value">{r.status} | {r.referral_notes || 'No referral notes'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form className="card card-body" onSubmit={handleSave}>
              <h3 style={{ marginTop: 0 }}>Doctor Notes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '0.75rem' }}>
                <label>Consultation notes<textarea rows={3} value={form.consultation_notes} readOnly={!canEdit} onChange={(e) => setForm((f) => ({ ...f, consultation_notes: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
                <label>Diagnosis<textarea rows={3} value={form.diagnosis} readOnly={!canEdit} onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
                <label>Treatment needed<textarea rows={3} value={form.treatment_needed} readOnly={!canEdit} onChange={(e) => setForm((f) => ({ ...f, treatment_needed: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
                <label>Note for patient<textarea rows={3} value={form.note} readOnly={!canEdit} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
                <label>Referral & note<textarea rows={3} value={form.referral_notes} readOnly={!canEdit} onChange={(e) => setForm((f) => ({ ...f, referral_notes: e.target.value }))} style={{ width: '100%', padding: '0.5rem' }} /></label>
              </div>

              <h4>Lab Order (including extended lab)</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input type="text" placeholder="Lab test name" readOnly={!canEdit} value={form.lab_name} onChange={(e) => setForm((f) => ({ ...f, lab_name: e.target.value }))} style={{ padding: '0.5rem', minWidth: 220 }} />
                <input type="text" placeholder="Lab code" readOnly={!canEdit} value={form.lab_code} onChange={(e) => setForm((f) => ({ ...f, lab_code: e.target.value }))} style={{ padding: '0.5rem', minWidth: 160 }} />
              </div>

              <h4>Drug Prescription</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select disabled={!canEdit} value={form.rx_drug_id} onChange={(e) => setForm((f) => ({ ...f, rx_drug_id: e.target.value }))} style={{ padding: '0.5rem', minWidth: 220 }}>
                  <option value="">Select drug</option>
                  {drugs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="number" min={1} readOnly={!canEdit} value={form.rx_qty} onChange={(e) => setForm((f) => ({ ...f, rx_qty: e.target.value }))} style={{ padding: '0.5rem', width: 90 }} />
                <input type="text" placeholder="Dosage to administer" readOnly={!canEdit} value={form.rx_dosage} onChange={(e) => setForm((f) => ({ ...f, rx_dosage: e.target.value }))} style={{ padding: '0.5rem', minWidth: 180 }} />
                <input type="text" placeholder="Prescription note" readOnly={!canEdit} value={form.rx_note} onChange={(e) => setForm((f) => ({ ...f, rx_note: e.target.value }))} style={{ padding: '0.5rem', minWidth: 180 }} />
              </div>

              <h4>Disposition</h4>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select disabled={!canEdit} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={{ padding: '0.5rem', minWidth: 190 }}>
                  {ENCOUNTER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {form.status === 'admitted' && (
                  <select disabled={!canEdit} value={form.ward_id} onChange={(e) => setForm((f) => ({ ...f, ward_id: e.target.value }))} style={{ padding: '0.5rem', minWidth: 220 }}>
                    <option value="">Select ward</option>
                    {wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                )}
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn-primary" disabled={!canEdit || saving || !selectedEncounterId}>
                  {saving ? 'Saving...' : (canEdit ? 'Save workflow' : 'Read only')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </Layout>
  );
}
