import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../Layout';
import { api } from '../api';
import CurrencySwitcher from '../components/CurrencySwitcher';
import { useCurrency } from '../context/CurrencyContext';

export default function Settings({ user, onLogout }) {
  const { currency } = useCurrency();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.uhpcms.getSettings().then((r) => setSettings(r)).catch(() => setSettings({}));
  }, []);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Settings</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          User-friendly settings for the hospital system.
        </p>
        <div className="card card--padded" style={{ maxWidth: 560 }}>
          <h3 style={{ marginTop: 0 }}>Currency</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', marginBottom: '0.75rem' }}>
            Choose display currency for billing and reports.
          </p>
          <CurrencySwitcher />
          <h3 style={{ marginTop: '1.5rem' }}>Account</h3>
          <ul className="detail-list">
            <li><span className="detail-label">User</span><span className="detail-value">{user?.username || user?.email}</span></li>
            <li><span className="detail-label">Role</span><span className="detail-value">{(user?.role || '').replace(/_/g, ' ')}</span></li>
          </ul>
          <h3 style={{ marginTop: '1.5rem' }}>Documents</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
            View or upload documents (e.g. reports, IDs) from your patient record. Open your record from the Patient list, then use the Documents tab.
          </p>
          <Link to="/patients" className="btn btn-primary" style={{ display: 'inline-block' }}>Go to Patient list</Link>
        </div>
      </div>
    </Layout>
  );
}
