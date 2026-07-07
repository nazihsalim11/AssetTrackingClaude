import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Asset, Vendor } from '../types';

interface Invoice {
  id: number;
  invoice_number: string;
  vendor_name: string | null;
  asset_name: string | null;
  amount: number;
  invoice_date: string;
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
}

const FINANCE_ROLES = ['super_admin', 'finance'];

export default function InvoiceList() {
  const { user } = useAuth();
  const canManage = !!user && FINANCE_ROLES.includes(user.role);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoiceNumber: '', vendorId: '', assetId: '', amount: '', gstAmount: '', invoiceDate: '', dueDate: '',
  });

  function load() {
    api.get('/invoices').then((res) => setInvoices(res.data));
  }

  useEffect(() => {
    load();
    if (canManage) {
      api.get('/assets').then((res) => setAssets(res.data));
      api.get('/vendors').then((res) => setVendors(res.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/invoices', {
        invoiceNumber: form.invoiceNumber,
        vendorId: form.vendorId ? Number(form.vendorId) : undefined,
        assetId: form.assetId ? Number(form.assetId) : undefined,
        amount: Number(form.amount),
        gstAmount: form.gstAmount ? Number(form.gstAmount) : undefined,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate || undefined,
      });
      setForm({ invoiceNumber: '', vendorId: '', assetId: '', amount: '', gstAmount: '', invoiceDate: '', dueDate: '' });
      load();
    } catch {
      setError('Failed to create invoice. Check required fields.');
    }
  }

  async function updateStatus(id: number, paymentStatus: string) {
    await api.patch(`/invoices/${id}/status`, { paymentStatus });
    load();
  }

  return (
    <div>
      <h2>Invoices</h2>
      <div className={canManage ? 'grid grid-2' : ''}>
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th><th>Vendor</th><th>Asset</th><th>Amount</th><th>Date</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id}>
                  <td>{i.invoice_number}</td>
                  <td>{i.vendor_name ?? '-'}</td>
                  <td>{i.asset_name ?? '-'}</td>
                  <td>{i.amount}</td>
                  <td>{new Date(i.invoice_date).toLocaleDateString()}</td>
                  <td>
                    {canManage ? (
                      <select value={i.payment_status} onChange={(e) => updateStatus(i.id, e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    ) : (
                      <span className="badge" data-s={i.payment_status}>{i.payment_status}</span>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={6}>No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {canManage && (
          <form className="card" onSubmit={handleSubmit}>
            <h3 style={{ marginTop: 0 }}>New Invoice</h3>
            <div className="form-row">
              <label>Invoice Number</label>
              <input required value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
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
              <label>Asset</label>
              <select value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                <option value="">Select asset</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label>Amount</label>
              <input type="number" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-row">
              <label>GST Amount</label>
              <input type="number" step="0.01" value={form.gstAmount} onChange={(e) => setForm({ ...form, gstAmount: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Invoice Date</label>
              <input type="date" required value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} />
            </div>
            <div className="form-row">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="btn" type="submit">Create Invoice</button>
          </form>
        )}
      </div>
    </div>
  );
}
