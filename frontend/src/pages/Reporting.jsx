import { useState, useEffect } from 'react';
import Layout from '../Layout';
import { api } from '../api';
import { useCurrency } from '../context/CurrencyContext';
import { getEffectiveOrgId } from '../utils/org';

export default function Reporting({ user, onLogout }) {
  const { formatMoney } = useCurrency();
  const orgId = getEffectiveOrgId(user);
  const [dashboard, setDashboard] = useState(null);
  const [bedOccupancy, setBedOccupancy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleDisabled, setModuleDisabled] = useState(false);

  useEffect(() => {
    const dashboardOrgId = orgId || undefined;
    if (!dashboardOrgId) { setLoading(false); return; }
    setLoading(true);
    setModuleDisabled(false);
    const dashboardPromise = api.uhpcms.getReportingDashboard(dashboardOrgId)
      .then((r) => r.data)
      .catch((err) => {
        if (err.message && (err.message.includes('not enabled') || err.message.includes('403'))) setModuleDisabled(true);
        return null;
      });
    const bedPromise = dashboardOrgId
      ? api.uhpcms.getBedOccupancy(dashboardOrgId).then((r) => r.data || []).catch(() => [])
      : Promise.resolve([]);
    Promise.all([dashboardPromise, bedPromise])
      .then(([d, b]) => {
        setDashboard(d);
        setBedOccupancy(b || []);
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Reporting & analytics</h2>
        {loading ? (
          <div className="loading-state">Loading…</div>
        ) : moduleDisabled ? (
          <div className="card" style={{ padding: '1.5rem' }}>
            <p className="login-error" style={{ margin: 0 }}>Reporting is not enabled for your organization. Contact your administrator or Super-Admin to enable the reporting module.</p>
          </div>
        ) : (
          <>
            {dashboard && (
              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div className="stat-card-label">Total encounters</div>
                  <div className="stat-card-value">{dashboard.total_encounters}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Active encounters</div>
                  <div className="stat-card-value">{dashboard.active_encounters}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Total revenue (paid)</div>
                  <div className="stat-card-value">{formatMoney(dashboard.total_revenue ?? 0, 'USD')}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Pending lab orders</div>
                  <div className="stat-card-value">{dashboard.pending_lab_orders}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-label">Pending prescriptions</div>
                  <div className="stat-card-value">{dashboard.pending_prescriptions}</div>
                </div>
              </div>
            )}
            <h3 className="section-title">Bed occupancy</h3>
            <div className="card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Ward</th><th>Beds</th><th>Occupied</th></tr>
                  </thead>
                  <tbody>
                    {bedOccupancy.map((w) => (
                      <tr key={w.id}>
                        <td>{w.name}</td>
                        <td>{w.bed_count}</td>
                        <td>{w.occupied ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
