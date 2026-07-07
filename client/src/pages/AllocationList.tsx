import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Allocation {
  id: number;
  asset_code: string;
  asset_name: string;
  employee_name: string;
  assigned_date: string;
  returned_date: string | null;
  status: 'active' | 'returned';
}

export default function AllocationList() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);

  function load() {
    api.get('/allocations').then((res) => setAllocations(res.data));
  }

  useEffect(load, []);

  async function handleReturn(id: number) {
    await api.post(`/allocations/${id}/return`);
    load();
  }

  return (
    <div>
      <h2>Allocations</h2>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Asset</th><th>Employee</th><th>Assigned</th><th>Returned</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((a) => (
              <tr key={a.id}>
                <td>{a.asset_code} - {a.asset_name}</td>
                <td>{a.employee_name}</td>
                <td>{new Date(a.assigned_date).toLocaleDateString()}</td>
                <td>{a.returned_date ? new Date(a.returned_date).toLocaleDateString() : '-'}</td>
                <td><span className="badge" data-s={a.status}>{a.status}</span></td>
                <td>
                  {a.status === 'active' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleReturn(a.id)}>Return</button>
                  )}
                </td>
              </tr>
            ))}
            {allocations.length === 0 && <tr><td colSpan={6}>No allocations yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
