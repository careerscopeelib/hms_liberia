import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { getEffectiveOrgId } from '../utils/org';
import { Link } from 'react-router-dom';

export default function FinanceDashboard({ user, onLogout }) {
  const { formatMoney } = useCurrency();
  const orgId = getEffectiveOrgId(user);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return setLoading(false);
    setLoading(true);
    Promise.all([
      api.uhpcms.getInvoicesForOrg(orgId).then((r) => setInvoices(r.data || [])).catch(() => []),
      api.uhpcms.getPaymentsForOrg(orgId).then((r) => setPayments(r.data || [])).catch(() => []),
      api.uhpcms.getEncounters({ org_id: orgId }).then((r) => setEncounters(r.data || [])).catch(() => []),
    ]).finally(() => setLoading(false));
  }, [orgId]);

  const totalRevenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const pendingInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'partial');
  const pendingAmount = pendingInvoices.reduce((s, i) => s + (Number(i.total_amount) || 0), 0);
  const paidToday = payments.filter((p) => {
    const d = (p.created_at || '').slice(0, 10);
    return d === new Date().toISOString().slice(0, 10);
  });
  const revenueToday = paidToday.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const byMethod = payments.reduce((acc, p) => {
    const m = (p.method || 'cash').replace(/_/g, ' ');
    acc[m] = (acc[m] || 0) + (Number(p.amount) || 0);
    return acc;
  }, {});

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
        <h2 className="section-title">Finance Manager Dashboard</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Overview of hospital, clinic & pharmacy financials. Process bills, generate invoices, and record payments.
        </p>

        {!orgId && (user?.role === 'super_admin' || user?.role === 'role_super_admin') && (
          <p className="login-error" style={{ marginBottom: '1rem' }}>Select an organization in the sidebar to view financials.</p>
        )}

        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card stat-card--blue">
            <span className="stat-card-icon">💰</span>
            <div className="stat-card-label">Total Revenue (Collected)</div>
            <div className="stat-card-value">{formatMoney(totalRevenue, 'USD')}</div>
          </div>
          <div className="stat-card stat-card--green">
            <span className="stat-card-icon">📄</span>
            <div className="stat-card-label">Pending Invoices</div>
            <div className="stat-card-value">{pendingInvoices.length}</div>
            <div className="stat-card-sublabel">{formatMoney(pendingAmount, 'USD')} outstanding</div>
          </div>
          <div className="stat-card stat-card--orange">
            <span className="stat-card-icon">📅</span>
            <div className="stat-card-label">Revenue Today</div>
            <div className="stat-card-value">{formatMoney(revenueToday, 'USD')}</div>
            <div className="stat-card-sublabel">{paidToday.length} payment(s)</div>
          </div>
          <div className="stat-card">
            <span className="stat-card-icon">📋</span>
            <div className="stat-card-label">Total Invoices</div>
            <div className="stat-card-value">{invoices.length}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Revenue by payment method</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {Object.entries(byMethod).map(([method, amt]) => (
                  <li key={method} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <strong>{method}</strong>: {formatMoney(amt, 'USD')}
                  </li>
                ))}
                {Object.keys(byMethod).length === 0 && <li style={{ color: 'var(--color-text-muted)' }}>No payments yet</li>}
              </ul>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h3 style={{ marginTop: 0 }}>Quick actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link to="/billing" className="btn btn-primary">Process bills & create invoices</Link>
                <Link to="/billing?tab=invoices" className="btn">View invoice list</Link>
                <Link to="/billing?tab=payments" className="btn">View payment report</Link>
                <Link to="/insurance" className="btn">Manage insurance</Link>
                <Link to="/finance-reports" className="btn">Finance reports & export</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-body">
            <h3 style={{ marginTop: 0 }}>Recent encounters (billing source)</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              When a patient is registered and processed for treatment, generate the initial bill from Org setup → Services, then create invoice and record payment.
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Encounter ID</th><th>Patient MRN</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {(encounters || []).slice(0, 10).map((enc) => (
                    <tr key={enc.id}>
                      <td><code>{enc.id}</code></td>
                      <td>{enc.patient_mrn}</td>
                      <td><span className="badge">{enc.status}</span></td>
                      <td><Link to={`/billing?encounter_id=${enc.id}`} className="btn" style={{ padding: '0.25rem 0.5rem' }}>Bill & invoice</Link></td>
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
