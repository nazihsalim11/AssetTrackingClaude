import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AuditLog } from '../types';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.get('/audit-logs').then((res) => setLogs(res.data));
  }, []);

  return (
    <div>
      <h2>Audit Log</h2>
      <div className="card">
        <table>
          <thead>
            <tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Entity ID</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.created_at).toLocaleString()}</td>
                <td>{l.user_name ?? 'System'}</td>
                <td><span className="badge">{l.action}</span></td>
                <td>{l.entity}</td>
                <td>{l.entity_id ?? '-'}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5}>No audit entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
