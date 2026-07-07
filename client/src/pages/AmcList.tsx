import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Asset, Vendor } from '../types';

interface Amc {
  id: number;
  contract_number: string;
  asset_code: string;
  asset_name: string;
  vendor_name: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

const MANAGER_ROLES = ['super_admin', 'it_admin', 'facility_admin'];

export default function AmcList() {
  const { user } = useAuth();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);

  const [contracts, setContracts] = useState<Amc[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    assetId: '', vendorId: '', contractNumber: '', startDate: '', endDate: '', cost: '', serviceSchedule: '',
  });

  function load() {
    api.get('/amc').then((res) => setContracts(res.data));
  }

  useEffect(() => {
    load();
    api.get('/assets').then((res) => setAssets(res.data));
    if (canManage) api.get('/vendors').then((res) => setVendors(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/amc', {
        assetId: Number(form.assetId),
        vendorId: form.vendorId ? Number(form.vendorId) : undefined,
        contractNumber: form.contractNumber,
        startDate: form.startDate,
        endDate: form.endDate,
        cost: form.cost ? Number(form.cost) : undefined,
        serviceSchedule: form.serviceSchedule || undefined,
      });
      setForm({ assetId: '', vendorId: '', contractNumber: '', startDate: '', endDate: '', cost: '', serviceSchedule: '' });
      load();
    } catch {
      setError('Failed to create AMC contract. Check required fields.');
    }
  }

  return (
    <div>
      <h2>AMC Contracts</h2>
      <div className={canManage ? 'grid grid-2' : ''}>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Contract #</th><th>Asset</th><th>Vendor</th><th>Start</th><th>End</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.contract_number}</td>
                  <td>{c.asset_code} - {c.asset_name}</td>
                  <td>{c.vendor_name ?? '-'}</td>
                  <td>{new Date(c.start_date).toLocaleDateString()}</td>
                  <td>{new Date(c.end_date).toLocaleDateString()}</td>
                  <td><span className="badge" data-s={c.status}>{c.status}</span></td>
                </tr>
              ))}
              {contracts.length === 0 && <tr><td colSpan={6}>No AMC contracts yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form className="card" onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0 }}>New AMC Contract</h3>
            <div className="form-row">
              <label>Asset</label>
              <select required value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                <option value="">Select asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Vendor</label>
              <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Contract Number</label>
              <input required value={form.contractNumber} onChange={(e) => setForm({ ...form, contractNumber: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Start Date</label>
              <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="form-row">
              <label>End Date</label>
              <input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Cost</label>
              <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Service Schedule</label>
              <input placeholder="e.g. Quarterly" value={form.serviceSchedule} onChange={(e) => setForm({ ...form, serviceSchedule: e.target.value })} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit">Create Contract</button>
          </form>
        )}
      </div>
    </div>
  );
}
