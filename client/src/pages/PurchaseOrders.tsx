import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { PurchaseOrder, Vendor } from '../types';

export default function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ poNumber: '', vendorId: '', orderDate: '', totalAmount: '' });

  function load() {
    api.get('/purchase-orders').then((res) => setOrders(res.data));
  }

  useEffect(() => {
    load();
    api.get('/vendors').then((res) => setVendors(res.data));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/purchase-orders', {
        poNumber: form.poNumber,
        vendorId: form.vendorId ? Number(form.vendorId) : undefined,
        orderDate: form.orderDate || undefined,
        totalAmount: form.totalAmount ? Number(form.totalAmount) : undefined,
      });
      setForm({ poNumber: '', vendorId: '', orderDate: '', totalAmount: '' });
      load();
    } catch {
      setError('Failed to create purchase order. PO number may already exist.');
    }
  }

  async function updateStatus(id: number, status: string) {
    await api.patch(`/purchase-orders/${id}/status`, { status });
    load();
  }

  return (
    <div>
      <h2>Purchase Orders</h2>
      <div className="grid grid-2">
        <div className="card">
          <table>
            <thead>
              <tr><th>PO #</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{o.po_number}</td>
                  <td>{o.vendor_name ?? '-'}</td>
                  <td>{new Date(o.order_date).toLocaleDateString()}</td>
                  <td>{o.total_amount ?? '-'}</td>
                  <td><span className="badge" data-s={o.status}>{o.status}</span></td>
                  <td>
                    <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                      <option value="open">Open</option>
                      <option value="fulfilled">Fulfilled</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={6}>No purchase orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>New Purchase Order</h3>
          <div className="form-row">
            <label>PO Number</label>
            <input required value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} />
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
            <label>Order Date</label>
            <input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Total Amount</label>
            <input type="number" step="0.01" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit">Create Purchase Order</button>
        </form>
      </div>
    </div>
  );
}
