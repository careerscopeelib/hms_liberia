import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { getEffectiveOrgId } from '../utils/org';

export default function Billing({ user, onLogout }) {
  const [searchParams] = useSearchParams();
  const encounterIdFromUrl = searchParams.get('encounter_id');
  const { formatMoney } = useCurrency();
  const [encounters, setEncounters] = useState([]);
  const [selectedEnc, setSelectedEnc] = useState(encounterIdFromUrl || null);
  const [charges, setCharges] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCharge, setNewCharge] = useState({ service_code: '', description: '', amount: '', currency: 'USD' });
  const [newPayment, setNewPayment] = useState({ amount: '', currency: 'USD', invoice_id: '' });

  const orgId = getEffectiveOrgId(user);

  useEffect(() => {
    if (encounterIdFromUrl) setSelectedEnc(encounterIdFromUrl);
  }, [encounterIdFromUrl]);

  useEffect(() => {
    api.uhpcms.getEncounters(orgId ? { org_id: orgId } : {})
      .then((r) => setEncounters(r.data || []))
      .catch(() => setEncounters([]))
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!selectedEnc) { setCharges([]); setInvoices([]); return; }
    setError('');
    Promise.all([
      api.uhpcms.getCharges(selectedEnc).then((r) => r.data || []).catch(() => []),
      api.uhpcms.getInvoices(selectedEnc).then((r) => r.data || []).catch(() => []),
    ]).then(([c, i]) => {
      setCharges(c);
      setInvoices(i);
    });
  }, [selectedEnc]);

  const handleAddCharge = async (e) => {
    e.preventDefault();
    if (!selectedEnc || !newCharge.service_code || !newCharge.amount) return;
    setError('');
    try {
      await api.uhpcms.addCharge({
        encounter_id: selectedEnc,
        service_code: newCharge.service_code,
        description: newCharge.description,
        amount: parseFloat(newCharge.amount),
        currency: newCharge.currency,
      });
      const r = await api.uhpcms.getCharges(selectedEnc);
      setCharges(r.data || []);
      setNewCharge({ service_code: '', description: '', amount: '', currency: 'USD' });
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedEnc) return;
    setError('');
    try {
      await api.uhpcms.createInvoice({ encounter_id: selectedEnc, currency: 'USD' });
      const r = await api.uhpcms.getInvoices(selectedEnc);
      setInvoices(r.data || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.invoice_id || !newPayment.amount) return;
    setError('');
    try {
      await api.uhpcms.addPayment({
        invoice_id: newPayment.invoice_id,
        amount: parseFloat(newPayment.amount),
        currency: newPayment.currency,
      });
      const r = await api.uhpcms.getInvoices(selectedEnc);
      setInvoices(r.data || []);
      setNewPayment({ amount: '', currency: 'USD', invoice_id: '' });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Billing & Financial Workflow</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Create charges and invoices in USD. Generate invoices and record payments.
        </p>

        <div className="card card-interactive" style={{ marginBottom: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Select encounter</h3>
            {loading ? <p>Loading encounters…</p> : (
              <select
                value={selectedEnc || ''}
                onChange={(e) => setSelectedEnc(e.target.value || null)}
                style={{ padding: '0.5rem 0.75rem', minWidth: 280 }}
              >
                <option value="">— Select encounter —</option>
                {encounters.map((enc) => (
                  <option key={enc.id} value={enc.id}>{enc.id} — MRN: {enc.patient_mrn} ({enc.status})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {selectedEnc && (
          <>
            <section className="section">
              <h3 className="section-title">Charges (USD)</h3>
              <form onSubmit={handleAddCharge} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <input placeholder="Service code" value={newCharge.service_code} onChange={(e) => setNewCharge((s) => ({ ...s, service_code: e.target.value }))} style={{ padding: '0.5rem', width: 120 }} />
                <input placeholder="Description" value={newCharge.description} onChange={(e) => setNewCharge((s) => ({ ...s, description: e.target.value }))} style={{ padding: '0.5rem', flex: 1, minWidth: 140 }} />
                <input type="number" step="0.01" placeholder="Amount (USD)" value={newCharge.amount} onChange={(e) => setNewCharge((s) => ({ ...s, amount: e.target.value }))} style={{ padding: '0.5rem', width: 100 }} />
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Add charge</button>
              </form>
              <div className="card">
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Code</th><th>Description</th><th>Amount (USD)</th></tr></thead>
                    <tbody>
                      {charges.map((c) => (
                        <tr key={c.id}>
                          <td>{c.service_code}</td>
                          <td>{c.description || '—'}</td>
                          <td className="money-usd">{formatMoney(c.amount, 'USD')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="section">
              <h3 className="section-title">Invoices & payments</h3>
              <button type="button" className="btn-primary" style={{ marginBottom: '1rem' }} onClick={handleCreateInvoice}>
                Create invoice (USD)
              </button>
              <div className="card">
                <ul className="opd-list">
                  {invoices.map((inv) => (
                    <li key={inv.id}>
                      <strong>{inv.id}</strong> — {formatMoney(inv.total_amount, 'USD')} — {inv.status}
                    </li>
                  ))}
                </ul>
              </div>
              <form onSubmit={handleAddPayment} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                <select value={newPayment.invoice_id} onChange={(e) => setNewPayment((s) => ({ ...s, invoice_id: e.target.value }))} style={{ padding: '0.5rem', minWidth: 200 }} required>
                  <option value="">Select invoice</option>
                  {invoices.filter((i) => i.status !== 'paid').map((i) => (
                    <option key={i.id} value={i.id}>{i.id} — {formatMoney(i.total_amount, 'USD')}</option>
                  ))}
                </select>
                <input type="number" step="0.01" placeholder="Amount (USD)" value={newPayment.amount} onChange={(e) => setNewPayment((s) => ({ ...s, amount: e.target.value }))} style={{ padding: '0.5rem', width: 100 }} required />
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }}>Record payment</button>
              </form>
            </section>
          </>
        )}

        {error && <div className="login-error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>
    </Layout>
  );
}
