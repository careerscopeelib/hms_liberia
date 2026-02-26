import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

const STATUS_OPTIONS = ['pending', 'sample_collected', 'processing', 'result_ready', 'cancelled'];

export default function Lab({ user, onLogout }) {
  const [searchParams] = useSearchParams();
  const encounterIdFromUrl = searchParams.get('encounter_id') || '';
  const [orders, setOrders] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEncounter, setFilterEncounter] = useState(encounterIdFromUrl);
  const [createEncounterId, setCreateEncounterId] = useState(encounterIdFromUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testName, setTestName] = useState('');
  const [testCode, setTestCode] = useState('');
  const [editingResultId, setEditingResultId] = useState(null);
  const [resultValue, setResultValue] = useState('');
  const [resultUnit, setResultUnit] = useState('');
  const [statusUpdateId, setStatusUpdateId] = useState(null);
  const [statusUpdateVal, setStatusUpdateVal] = useState('');

  const orgId = getEffectiveOrgId(user);

  const load = () => {
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterEncounter) params.encounter_id = filterEncounter;
    setLoading(true);
    Promise.all([
      api.uhpcms.getLabOrders(params).then((r) => setOrders(r.data || [])),
      api.uhpcms.getEncounters(orgId ? { org_id: orgId } : {}).then((r) => setEncounters(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [orgId, filterStatus, filterEncounter]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setError('');
    if (!createEncounterId || !testName) return;
    try {
      await api.uhpcms.createLabOrder({ encounter_id: createEncounterId, test_name: testName, test_code: testCode || undefined });
      setCreateEncounterId('');
      setTestName('');
      setTestCode('');
      load();
    } catch (e) { setError(e.message); }
  };

  const handleUpdateStatus = async (id) => {
    if (!statusUpdateVal) return;
    setError('');
    try {
      await api.uhpcms.updateLabStatus(id, statusUpdateVal);
      setStatusUpdateId(null);
      setStatusUpdateVal('');
      load();
    } catch (e) { setError(e.message); }
  };

  const handleSubmitResult = async (id) => {
    setError('');
    try {
      await api.uhpcms.submitLabResult(id, { result_value: resultValue, result_unit: resultUnit || undefined });
      setEditingResultId(null);
      setResultValue('');
      setResultUnit('');
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Lab / Investigations</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Add investigation reports, manage orders, update status, submit results.</p>
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div id="add-report" className="card card-interactive" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Add Investigation Report</h3>
            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
              <label>
                Encounter
                <select value={createEncounterId} onChange={(e) => setCreateEncounterId(e.target.value)} required style={{ display: 'block', padding: '0.5rem', minWidth: 220 }}>
                  <option value="">Select</option>
                  {encounters.map((enc) => <option key={enc.id} value={enc.id}>{enc.id} — {enc.patient_mrn}</option>)}
                </select>
              </label>
              <label>
                Test name
                <input type="text" value={testName} onChange={(e) => setTestName(e.target.value)} required placeholder="e.g. CBC" style={{ display: 'block', padding: '0.5rem' }} />
              </label>
              <label>
                Test code
                <input type="text" value={testCode} onChange={(e) => setTestCode(e.target.value)} placeholder="Optional" style={{ display: 'block', padding: '0.5rem' }} />
              </label>
              <button type="submit" className="btn-primary">Create order</button>
            </form>
          </div>
        </div>

        <h3 className="section-title" style={{ fontSize: '1rem' }}>Manage Investigation Report</h3>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <label>
            Status
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ display: 'block', padding: '0.5rem' }}>
              <option value="">All</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Encounter
            <select value={filterEncounter} onChange={(e) => setFilterEncounter(e.target.value)} style={{ display: 'block', padding: '0.5rem', minWidth: 200 }}>
              <option value="">All</option>
              {encounters.map((enc) => <option key={enc.id} value={enc.id}>{enc.id}</option>)}
            </select>
          </label>
        </div>

        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Encounter</th>
                  <th>Test</th>
                  <th>Status</th>
                  <th>Result</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={6}>Loading…</td></tr> : orders.length === 0 ? <tr><td colSpan={6}>No orders</td></tr> : orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.encounter_id}</td>
                    <td>{o.test_name} {o.test_code ? `(${o.test_code})` : ''}</td>
                    <td><span className="badge">{o.status}</span></td>
                    <td>{o.result_value != null ? `${o.result_value} ${o.result_unit || ''}` : '—'}</td>
                    <td>
                      {statusUpdateId === o.id ? (
                        <span style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <select value={statusUpdateVal} onChange={(e) => setStatusUpdateVal(e.target.value)} style={{ padding: '0.25rem' }}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleUpdateStatus(o.id)}>Save</button>
                          <button type="button" onClick={() => { setStatusUpdateId(null); setStatusUpdateVal(''); }}>Cancel</button>
                        </span>
                      ) : (
                        <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem', marginRight: '0.35rem' }} onClick={() => { setStatusUpdateId(o.id); setStatusUpdateVal(o.status); }}>Status</button>
                      )}
                      {editingResultId === o.id ? (
                        <span style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                          <input type="text" value={resultValue} onChange={(e) => setResultValue(e.target.value)} placeholder="Value" style={{ width: 80, padding: '0.25rem' }} />
                          <input type="text" value={resultUnit} onChange={(e) => setResultUnit(e.target.value)} placeholder="Unit" style={{ width: 60, padding: '0.25rem' }} />
                          <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleSubmitResult(o.id)}>Submit</button>
                          <button type="button" onClick={() => { setEditingResultId(null); setResultValue(''); setResultUnit(''); }}>Cancel</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => { setEditingResultId(o.id); setResultValue(o.result_value || ''); setResultUnit(o.result_unit || ''); }}>Result</button>
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
