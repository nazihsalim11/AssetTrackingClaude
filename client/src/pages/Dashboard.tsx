import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { DashboardSummary } from '../types';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data));
  }, []);

  if (!summary) return <p className="mono">loading dashboard…</p>;

  const assigned = summary.assignedVsAvailable.find((s) => s.status === 'assigned')?.count ?? 0;
  const available = summary.assignedVsAvailable.find((s) => s.status === 'available')?.count ?? 0;

  return (
    <div>
      <h2>Dashboard</h2>

      <div className="stat-grid">
        <div className="stat-cell">
          <div className="stat-value">{summary.totalAssets}</div>
          <div className="stat-label">Total Assets</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value">{assigned}</div>
          <div className="stat-label">Assigned</div>
        </div>
        <div className="stat-cell">
          <div className="stat-value ok">{available}</div>
          <div className="stat-label">Available</div>
        </div>
        <div className="stat-cell">
          <div className={`stat-value${summary.pendingPayments.count > 0 ? ' warn' : ''}`}>
            {summary.pendingPayments.count}
          </div>
          <div className="stat-label">Pending Payments</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 12 }}>
        <div className="card">
          <h3>AMC expiring &middot; next 30d [{summary.amcExpiring.length}]</h3>
          {summary.amcExpiring.length === 0 ? (
            <p className="mono">— none —</p>
          ) : (
            <table>
              <thead>
                <tr><th>Asset</th><th>Contract</th><th>Ends</th></tr>
              </thead>
              <tbody>
                {summary.amcExpiring.map((c) => (
                  <tr key={c.id}>
                    <td><span className="mono">{c.asset_code}</span> {c.asset_name}</td>
                    <td className="mono">{c.contract_number}</td>
                    <td className="mono">{new Date(c.end_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3>Warranty expiring &middot; next 30d [{summary.warrantyExpiring.length}]</h3>
          {summary.warrantyExpiring.length === 0 ? (
            <p className="mono">— none —</p>
          ) : (
            <table>
              <thead>
                <tr><th>Asset</th><th>Expires</th></tr>
              </thead>
              <tbody>
                {summary.warrantyExpiring.map((a) => (
                  <tr key={a.id}>
                    <td><span className="mono">{a.asset_code}</span> {a.name}</td>
                    <td className="mono">{new Date(a.warranty_expiry).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Recently added assets [{summary.recentAssets.length}]</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Type</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.recentAssets.map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.asset_code}</td>
                <td>{a.name}</td>
                <td>{a.type}</td>
                <td><span className="badge" data-s={a.status}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
