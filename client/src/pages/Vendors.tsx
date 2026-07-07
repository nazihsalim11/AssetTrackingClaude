import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { Vendor } from '../types';

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', contactEmail: '', contactPhone: '', address: '', gstNumber: '' });

  function load() {
    api.get('/vendors').then((res) => setVendors(res.data));
  }

  useEffect(load, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/vendors', {
        name: form.name,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        address: form.address || undefined,
        gstNumber: form.gstNumber || undefined,
      });
      setForm({ name: '', contactEmail: '', contactPhone: '', address: '', gstNumber: '' });
      load();
    } catch {
      setError('Failed to create vendor.');
    }
  }

  return (
    <div>
      <h2>Vendors</h2>
      <div className="grid grid-2">
        <div className="card">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Phone</th><th>GST</th></tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id}>
                  <td>{v.name}</td>
                  <td>{v.contact_email ?? '-'}</td>
                  <td>{v.contact_phone ?? '-'}</td>
                  <td>{v.gst_number ?? '-'}</td>
                </tr>
              ))}
              {vendors.length === 0 && <tr><td colSpan={4}>No vendors yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>New Vendor</h3>
          <div className="form-row">
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Contact Email</label>
            <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Contact Phone</label>
            <input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Address</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="form-row">
            <label>GST Number</label>
            <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit">Create Vendor</button>
        </form>
      </div>
    </div>
  );
}
