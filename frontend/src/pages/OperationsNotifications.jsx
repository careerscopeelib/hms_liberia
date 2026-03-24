import { useEffect, useState } from 'react';
import Layout from '../Layout';
import { api } from '../api';

export default function OperationsNotifications({ user, onLogout }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [labRes, rxRes] = await Promise.all([
          api.uhpcms.getLabOrders({ status: 'pending' }).catch(() => ({ data: [] })),
          api.uhpcms.getPrescriptions({ status: 'pending' }).catch(() => ({ data: [] })),
        ]);
        const labItems = (labRes.data || []).map((x) => ({
          id: `lab-${x.id}`,
          kind: 'Lab',
          title: `${x.test_name}`,
          ref: x.id,
          encounter: x.encounter_id,
          at: x.ordered_at,
        }));
        const rxItems = (rxRes.data || []).map((x) => ({
          id: `rx-${x.id}`,
          kind: 'Pharmacy',
          title: `Prescription pending`,
          ref: x.id,
          encounter: x.encounter_id,
          at: x.prescribed_at,
        }));
        setItems([...labItems, ...rxItems].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)));
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout user={user} onLogout={onLogout}>
      <div className="page-enter page-enter-active">
        <h2 className="section-title">Operations Notifications</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
          Real-time queue for pending lab orders and prescriptions.
        </p>
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Type</th><th>Reference</th><th>Encounter</th><th>Detail</th><th>Created</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}>Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={5}>No pending operational notifications.</td></tr>
                ) : items.map((i) => (
                  <tr key={i.id}>
                    <td><span className="badge">{i.kind}</span></td>
                    <td>{i.ref}</td>
                    <td>{i.encounter}</td>
                    <td>{i.title}</td>
                    <td>{i.at || '—'}</td>
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
