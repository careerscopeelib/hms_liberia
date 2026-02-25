import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { getEffectiveOrgId } from '../utils/org';

export default function Pharmacy({ user, onLogout }) {
  const [tab, setTab] = useState('prescriptions');
  const [drugs, setDrugs] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [stores, setStores] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEncounter, setFilterEncounter] = useState('');
  const [newDrugName, setNewDrugName] = useState('');
  const [newDrugCode, setNewDrugCode] = useState('');
  const [newRxEncounterId, setNewRxEncounterId] = useState('');
  const [newRxItems, setNewRxItems] = useState([{ drug_id: '', quantity: 1, dosage: '', duration: '' }]);
  const [dispenseStoreId, setDispenseStoreId] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');

  const currentOrgId = getEffectiveOrgId(user);

  const load = () => {
    if (!currentOrgId) return;
    setLoading(true);
    Promise.all([
      api.uhpcms.getDrugs(currentOrgId).then((r) => setDrugs(r.data || [])),
      api.uhpcms.getPrescriptions({ status: filterStatus || undefined, encounter_id: filterEncounter || undefined }).then((r) => setPrescriptions(r.data || [])),
      api.uhpcms.getPharmacyStores(currentOrgId).then((r) => setStores(r.data || [])),
      api.uhpcms.getEncounters({ org_id: currentOrgId }).then((r) => setEncounters(r.data || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [currentOrgId, filterStatus, filterEncounter]);

  useEffect(() => {
    if (!selectedStoreId) { setInventory([]); return; }
    api.uhpcms.getInventory(selectedStoreId).then((r) => setInventory(r.data || [])).catch(() => setInventory([]));
  }, [selectedStoreId]);

  const handleCreateDrug = async (e) => {
    e.preventDefault();
    setError('');
    if (!newDrugName) return;
    try {
      await api.uhpcms.createDrug({ org_id: currentOrgId, name: newDrugName, code: newDrugCode || undefined });
      setNewDrugName('');
      setNewDrugCode('');
      load();
    } catch (e) { setError(e.message); }
  };

  const addRxLine = () => setNewRxItems((prev) => [...prev, { drug_id: '', quantity: 1, dosage: '', duration: '' }]);
  const updateRxLine = (i, field, value) => setNewRxItems((prev) => prev.map((item, j) => (j === i ? { ...item, [field]: value } : item)));

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    setError('');
    const items = newRxItems.filter((it) => it.drug_id).map((it) => ({ drug_id: it.drug_id, quantity: Number(it.quantity) || 1, dosage: it.dosage || undefined, duration: it.duration || undefined }));
    if (!newRxEncounterId || items.length === 0) return;
    try {
      await api.uhpcms.createPrescription({ encounter_id: newRxEncounterId, items });
      setNewRxEncounterId('');
      setNewRxItems([{ drug_id: '', quantity: 1, dosage: '', duration: '' }]);
      load();
    } catch (e) { setError(e.message); }
  };

  const handleDispense = async (prescriptionId) => {
    setError('');
    try {
      await api.uhpcms.dispensePrescription(prescriptionId, { store_id: dispenseStoreId || undefined });
      setDispenseStoreId('');
      load();
    } catch (e) { setError(e.message); }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Pharmacy</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Drugs, prescriptions, dispense, inventory.</p>
        {!currentOrgId && (user?.role === 'super_admin' || user?.role === 'role_super_admin') && (
          <p className="login-error" style={{ marginBottom: '1rem' }}>Select an organization in the sidebar to use this page.</p>
        )}
        {error && <div className="login-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <button type="button" className={tab === 'prescriptions' ? 'flow-step active' : 'flow-step'} onClick={() => setTab('prescriptions')}>Prescriptions</button>
          <button type="button" className={tab === 'drugs' ? 'flow-step active' : 'flow-step'} onClick={() => setTab('drugs')}>Drugs</button>
          <button type="button" className={tab === 'inventory' ? 'flow-step active' : 'flow-step'} onClick={() => setTab('inventory')}>Inventory</button>
        </div>

        {tab === 'drugs' && (
          <div className="card card-interactive">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Drug catalog</h3>
              <form onSubmit={handleCreateDrug} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <input type="text" value={newDrugName} onChange={(e) => setNewDrugName(e.target.value)} placeholder="Drug name" required style={{ padding: '0.5rem' }} />
                <input type="text" value={newDrugCode} onChange={(e) => setNewDrugCode(e.target.value)} placeholder="Code" style={{ padding: '0.5rem' }} />
                <button type="submit" className="btn-primary" disabled={!currentOrgId}>Add drug</button>
              </form>
              <div className="table-wrap"><table className="table"><thead><tr><th>Name</th><th>Code</th><th>Unit</th></tr></thead><tbody>{drugs.map((d) => <tr key={d.id}><td>{d.name}</td><td>{d.code || '—'}</td><td>{d.unit}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}

        {tab === 'prescriptions' && (
          <>
            <div className="card card-interactive" style={{ marginBottom: '1.5rem' }}>
              <div className="card-body">
                <h3 style={{ marginTop: 0 }}>Create prescription</h3>
                <form onSubmit={handleCreatePrescription}>
                  <label>
                    Encounter
                    <select value={newRxEncounterId} onChange={(e) => setNewRxEncounterId(e.target.value)} required style={{ display: 'block', padding: '0.5rem', minWidth: 220, marginBottom: '0.5rem' }}>
                      <option value="">Select</option>
                      {encounters.map((enc) => <option key={enc.id} value={enc.id}>{enc.id} — {enc.patient_mrn}</option>)}
                    </select>
                  </label>
                  {newRxItems.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <select value={item.drug_id} onChange={(e) => updateRxLine(i, 'drug_id', e.target.value)} style={{ padding: '0.5rem', minWidth: 180 }}>
                        <option value="">Drug</option>
                        {drugs.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <input type="number" value={item.quantity} onChange={(e) => updateRxLine(i, 'quantity', e.target.value)} min={1} style={{ width: 70, padding: '0.5rem' }} />
                      <input type="text" value={item.dosage} onChange={(e) => updateRxLine(i, 'dosage', e.target.value)} placeholder="Dosage" style={{ width: 100, padding: '0.5rem' }} />
                      <input type="text" value={item.duration} onChange={(e) => updateRxLine(i, 'duration', e.target.value)} placeholder="Duration" style={{ width: 100, padding: '0.5rem' }} />
                    </div>
                  ))}
                  <button type="button" onClick={addRxLine} style={{ marginRight: '0.5rem' }}>+ Line</button>
                  <button type="submit" className="btn-primary">Create prescription</button>
                </form>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', marginRight: '0.5rem' }}><option value="">All status</option><option value="pending">pending</option><option value="dispensed">dispensed</option></select>
              <select value={filterEncounter} onChange={(e) => setFilterEncounter(e.target.value)} style={{ padding: '0.5rem' }}><option value="">All encounters</option>{encounters.map((enc) => <option key={enc.id} value={enc.id}>{enc.id}</option>)}</select>
            </div>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>ID</th><th>Encounter</th><th>Status</th><th>Dispensed</th><th>Actions</th></tr></thead>
                  <tbody>
                    {prescriptions.map((rx) => (
                      <tr key={rx.id}>
                        <td>{rx.id}</td>
                        <td>{rx.encounter_id}</td>
                        <td><span className="badge">{rx.status}</span></td>
                        <td>{rx.dispensed_at || '—'}</td>
                        <td>
                          {rx.status === 'pending' && (
                            <span style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                              <select value={dispenseStoreId} onChange={(e) => setDispenseStoreId(e.target.value)} style={{ padding: '0.25rem' }}><option value="">Store</option>{stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                              <button type="button" className="btn-primary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDispense(rx.id)}>Dispense</button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'inventory' && (
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Inventory by store</h3>
              <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
                <option value="">Select store</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="table-wrap"><table className="table"><thead><tr><th>Drug</th><th>Batch</th><th>Quantity</th><th>Expiry</th></tr></thead><tbody>{inventory.map((inv, i) => <tr key={i}><td>{inv.drug_name || inv.drug_id}</td><td>{inv.batch || '—'}</td><td>{inv.quantity}</td><td>{inv.expiry_date || '—'}</td></tr>)}</tbody></table></div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
