import { useState, useEffect, useRef } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { getEffectiveOrgId } from '../utils/org';

function useFinanceData(orgId) {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!orgId) return setLoading(false);
    setLoading(true);
    Promise.all([
      api.uhpcms.getInvoicesForOrg(orgId).then((r) => setInvoices(r.data || [])).catch(() => []),
      api.uhpcms.getPaymentsForOrg(orgId).then((r) => setPayments(r.data || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [orgId]);
  return { invoices, payments, loading };
}

function exportToCSV(rows, headers, filename) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (row) => headers.map((h) => escape(row[h.key] ?? row[h])).join(',');
  const headerLine = headers.map((h) => escape(typeof h === 'string' ? h : h.label || h.key)).join(',');
  const csv = [headerLine, ...rows.map((r) => line(r))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function FinanceReports({ user, onLogout }) {
  const { formatMoney } = useCurrency();
  const orgId = getEffectiveOrgId(user);
  const { invoices, payments, loading } = useFinanceData(orgId);
  const printRef = useRef(null);

  const totalRevenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pending = invoices.filter((i) => i.status === 'pending' || i.status === 'partial');
  const pendingAmount = pending.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const byMethod = payments.reduce((acc, p) => {
    const m = (p.method || 'cash').replace(/_/g, ' ');
    acc[m] = (acc[m] || 0) + (Number(p.amount) || 0);
    return acc;
  }, {});

  const handleExportPDF = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    win.document.write(printRef.current.innerHTML);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  const handleExportExcelInvoices = () => {
    const headers = [
      { key: 'id', label: 'Invoice ID' },
      { key: 'encounter_id', label: 'Encounter ID' },
      { key: 'patient_mrn', label: 'Patient MRN' },
      { key: 'total_amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'status', label: 'Status' },
      { key: 'created_at', label: 'Created' },
      { key: 'paid_at', label: 'Paid At' },
    ];
    exportToCSV(
      invoices.map((i) => ({ ...i, total_amount: i.total_amount })),
      headers,
      `finance-invoices-${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleExportExcelPayments = () => {
    const headers = [
      { key: 'id', label: 'Payment ID' },
      { key: 'invoice_id', label: 'Invoice ID' },
      { key: 'patient_mrn', label: 'Patient MRN' },
      { key: 'amount', label: 'Amount' },
      { key: 'currency', label: 'Currency' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
      { key: 'created_at', label: 'Date' },
    ];
    exportToCSV(payments, headers, `finance-payments-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="loading-state">Loading…</div>
      </Layout>
    );
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Finance Reports & Analytics</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Detailed financial analysis for hospital, clinic & pharmacy. Export to PDF or Excel (CSV).
        </p>

        {!orgId && (user?.role === 'super_admin' || user?.role === 'role_super_admin') && (
          <p className="login-error" style={{ marginBottom: '1rem' }}>Select an organization to view reports.</p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={handleExportPDF}>
            Export report as PDF
          </button>
          <button type="button" className="btn" onClick={handleExportExcelInvoices}>
            Export invoices (Excel/CSV)
          </button>
          <button type="button" className="btn" onClick={handleExportExcelPayments}>
            Export payments (Excel/CSV)
          </button>
        </div>

        <div ref={printRef} className="finance-report-print" style={{ padding: '1rem', background: '#fff', color: '#111' }}>
          <h3>Finance Summary</h3>
          <p><strong>Total revenue (collected):</strong> {formatMoney(totalRevenue, 'USD')}</p>
          <p><strong>Pending invoices:</strong> {pending.length} — {formatMoney(pendingAmount, 'USD')} outstanding</p>
          <h4>Revenue by payment method</h4>
          <ul>
            {Object.entries(byMethod).map(([method, amt]) => (
              <li key={method}>{method}: {formatMoney(amt, 'USD')}</li>
            ))}
          </ul>
          <h4>All invoices</h4>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>Invoice ID</th><th>Encounter</th><th>Patient MRN</th><th>Amount</th><th>Status</th><th>Created</th></tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.id}</td>
                  <td>{i.encounter_id}</td>
                  <td>{i.patient_mrn || '—'}</td>
                  <td>{formatMoney(i.total_amount, i.currency)}</td>
                  <td>{i.status}</td>
                  <td>{i.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>All payments</h4>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><th>Payment ID</th><th>Invoice</th><th>Patient MRN</th><th>Amount</th><th>Method</th><th>Date</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.invoice_id}</td>
                  <td>{p.patient_mrn || '—'}</td>
                  <td>{formatMoney(p.amount, p.currency)}</td>
                  <td>{(p.method || 'cash').replace(/_/g, ' ')}</td>
                  <td>{p.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Invoice list</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice ID</th><th>Encounter</th><th>Patient MRN</th><th>Amount</th><th>Status</th><th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((i) => (
                    <tr key={i.id}>
                      <td><code>{i.id}</code></td>
                      <td>{i.encounter_id}</td>
                      <td>{i.patient_mrn || '—'}</td>
                      <td className="money-usd">{formatMoney(i.total_amount, i.currency)}</td>
                      <td><span className="badge">{i.status}</span></td>
                      <td>{i.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Payment list (by method)</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Payment ID</th><th>Invoice</th><th>Patient MRN</th><th>Amount</th><th>Method</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td><code>{p.id}</code></td>
                      <td>{p.invoice_id}</td>
                      <td>{p.patient_mrn || '—'}</td>
                      <td className="money-usd">{formatMoney(p.amount, p.currency)}</td>
                      <td>{(p.method || 'cash').replace(/_/g, ' ')}</td>
                      <td>{p.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
