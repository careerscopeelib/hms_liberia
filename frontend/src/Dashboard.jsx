import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';
import { api } from './api';
import Layout from './Layout';
import { useCurrency } from './context/CurrencyContext';

const ADMIN_ROLES = ['super_admin', 'role_super_admin', 'org_admin', 'administrator'];

export default function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { formatMoney } = useCurrency();
  const [stats, setStats] = useState(null);
  const [uhpcmsDashboard, setUhpcmsDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [patients, setPatients] = useState([]);
  const [opd, setOpd] = useState([]);
  const [doctorOpd, setDoctorOpd] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const hasToken = !!sessionStorage.getItem('uhpcms_token');
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [s, e, p, o] = await Promise.all([
          api.getStats().catch(() => null),
          api.getEmployees().catch(() => ({ data: [] })),
          api.getPatients().catch(() => ({ data: [] })),
          api.getOpd().catch(() => ({ data: [] })),
        ]);
        setStats(s?.data ?? null);
        setEmployees(Array.isArray(e?.data) ? e.data : []);
        setPatients(Array.isArray(p?.data) ? p.data : []);
        setOpd(Array.isArray(o?.data) ? o.data : []);
        if (user.role === 'doctor') {
          const docOpd = await api.getOpdForDoctor(user.id).catch(() => ({ data: [] }));
          setDoctorOpd(Array.isArray(docOpd?.data) ? docOpd.data : []);
        }
        if (hasToken) {
          const orgId = user.org_id || undefined;
          const [dashRes, analyticsRes] = await Promise.all([
            api.uhpcms.getReportingDashboard(orgId).catch(() => null),
            isAdmin ? api.uhpcms.getReportingAnalytics(orgId).catch(() => null) : Promise.resolve(null),
          ]);
          setUhpcmsDashboard(dashRes?.data ?? null);
          setAnalytics(analyticsRes?.data ?? null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate, hasToken, isAdmin]);

  // Scroll to sidebar hash (e.g. /dashboard#employees) after content is loaded so sections exist in DOM
  useEffect(() => {
    const hash = location.hash?.replace('#', '');
    if (!hash || loading) return;
    const scrollToSection = () => {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scrollToSection();
    const t = setTimeout(scrollToSection, 300);
    return () => clearTimeout(t);
  }, [location.hash, loading]);

  if (!user) return null;

  if (loading) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="loading-state">Loading…</div>
      </Layout>
    );
  }

  if (error && !stats && !uhpcmsDashboard) {
    return (
      <Layout user={user} onLogout={onLogout}>
        <div className="error-state">
          {error} — Is the backend running on port 3000?
        </div>
      </Layout>
    );
  }

  const statusBarData = analytics?.encounters_by_status
    ? Object.entries(analytics.encounters_by_status).map(([status, count]) => ({ status, count }))
    : [];
  const encountersByDay = analytics?.encounters_by_day?.length
    ? analytics.encounters_by_day
    : [];
  const revenueByDay = analytics?.revenue_by_day?.length
    ? analytics.revenue_by_day
    : [];

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Dashboard</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          {isAdmin ? 'Overview and analytics' : 'Your overview'}
        </p>

        {/* KPI cards — U-HPCMS */}
        {uhpcmsDashboard && (
          <>
            <h3 className="section-title" style={{ fontSize: '1.125rem', marginTop: 0 }}>Key metrics</h3>
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div className="stat-card-label">Total encounters</div>
                <div className="stat-card-value">{uhpcmsDashboard.total_encounters}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Active</div>
                <div className="stat-card-value">{uhpcmsDashboard.active_encounters}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Revenue (paid)</div>
                <div className="stat-card-value">{formatMoney(uhpcmsDashboard.total_revenue || 0, 'USD')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Pending lab</div>
                <div className="stat-card-value">{uhpcmsDashboard.pending_lab_orders}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Pending prescriptions</div>
                <div className="stat-card-value">{uhpcmsDashboard.pending_prescriptions}</div>
              </div>
            </div>
          </>
        )}

        {/* Admin: charts */}
        {isAdmin && hasToken && analytics && (
          <>
            <h3 className="section-title" style={{ fontSize: '1.125rem' }}>Analysis</h3>
            <div className="dashboard-charts">
              {statusBarData.length > 0 && (
                <div className="dashboard-chart-card">
                  <h3>Encounters by status</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={statusBarData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {encountersByDay.length > 0 && (
                <div className="dashboard-chart-card">
                  <h3>Encounters (last 7 days)</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={encountersByDay} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} name="Encounters" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {revenueByDay.length > 0 && (
                <div className="dashboard-chart-card">
                  <h3>Revenue (last 7 days, USD)</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={revenueByDay} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`USD ${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'Revenue']} />
                      <Area type="monotone" dataKey="total" stroke="var(--color-primary)" fill="var(--color-primary-light)" name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {statusBarData.length === 0 && encountersByDay.length === 0 && revenueByDay.length === 0 && (
              <div className="card card-interactive" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                  No chart data yet. Create encounters and invoices to see analytics here.
                </p>
              </div>
            )}
          </>
        )}

        {/* Legacy HMS stats */}
        {stats && (
          <>
            <h3 className="section-title" style={{ fontSize: '1.125rem' }}>Legacy HMS stats</h3>
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card">
                <div className="stat-card-label">Doctors</div>
                <div className="stat-card-value">{stats.doctors}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Patients</div>
                <div className="stat-card-value">{stats.patients}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Employees</div>
                <div className="stat-card-value">{stats.employees}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">OPD income</div>
                <div className="stat-card-value">{formatMoney(stats.total_opd_income || 0, 'USD')}</div>
              </div>
            </div>
          </>
        )}

        {/* Employees — admin / doctor / super_admin */}
        {(user.role === 'administrator' || user.role === 'doctor' || user.role === 'super_admin' || user.role === 'role_super_admin' || user.role === 'org_admin') && (
          <section className="section" id="employees">
            <h3 className="section-title">Employees ({employees.length})</h3>
            <div className="card">
              {employees.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', padding: '1rem', margin: 0 }}>No legacy HMS employees. Use U-HPCMS Org setup to manage users.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>EID</th>
                        <th>Name</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.slice(0, 15).map((emp) => (
                        <tr key={emp.eid}>
                          <td><strong>{emp.eid}</strong></td>
                          <td>{[emp.firstName, emp.middleName, emp.lastName].filter(Boolean).join(' ')}</td>
                          <td><span className="badge">{emp.role}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Patients — receptionist / admin / doctor / super_admin */}
        {(user.role === 'receptionist' || user.role === 'administrator' || user.role === 'doctor' || user.role === 'super_admin' || user.role === 'role_super_admin' || user.role === 'org_admin') && (
          <section className="section" id="patients">
            <h3 className="section-title">Patients ({patients.length})</h3>
            <div className="card">
              {patients.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', padding: '1rem', margin: 0 }}>No legacy HMS patients. Use Patient flow to register patients.</p>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>PID</th>
                        <th>Name</th>
                        <th>Doctor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patients.slice(0, 15).map((p) => (
                        <tr key={p.pid}>
                          <td><strong>{p.pid}</strong></td>
                          <td>{[p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ')}</td>
                          <td>{p.doctorId || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* OPD — doctor */}
        {user.role === 'doctor' && (
          <section className="section" id="opd">
            <h3 className="section-title">Your OPD queue ({doctorOpd.length})</h3>
            <div className="card">
              {doctorOpd.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', padding: '1rem', margin: 0 }}>No patients in your OPD queue.</p>
              ) : (
                <ul className="opd-list">
                  {doctorOpd.map((o) => (
                    <li key={o.opdid}>OPD #{o.opdid} — PID: {o.pid}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {/* OPD — non-doctor (receptionist, admin, super_admin) */}
        {user.role !== 'doctor' && (
          <section className="section" id="opd">
            <h3 className="section-title">OPD entries ({opd.length})</h3>
            <div className="card">
              {opd.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', padding: '1rem', margin: 0 }}>No legacy OPD queue entries.</p>
              ) : (
                <ul className="opd-list">
                  {opd.slice(0, 15).map((o) => (
                    <li key={o.opdid}>
                      #{o.opdid} — PID: {o.pid}, Doctor: {o.doctorid}, Status: {o.status === 0 ? 'Queue' : o.status === 1 ? 'With doctor' : 'Done'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
