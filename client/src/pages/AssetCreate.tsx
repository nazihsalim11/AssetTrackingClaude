import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Category, Department, Vendor } from '../types';

export default function AssetCreate() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'it' as 'it' | 'office',
    categoryId: '',
    serialNumber: '',
    departmentId: '',
    vendorId: '',
    location: '',
    purchaseDate: '',
    purchaseCost: '',
    warrantyExpiry: '',
  });

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
    api.get('/departments').then((res) => setDepartments(res.data));
    api.get('/vendors').then((res) => setVendors(res.data));
  }, []);

  const filteredCategories = categories.filter((c) => c.type === form.type);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.post('/assets', {
        name: form.name,
        type: form.type,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        serialNumber: form.serialNumber || undefined,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
        vendorId: form.vendorId ? Number(form.vendorId) : null,
        location: form.location || undefined,
        purchaseDate: form.purchaseDate || undefined,
        purchaseCost: form.purchaseCost ? Number(form.purchaseCost) : undefined,
        warrantyExpiry: form.warrantyExpiry || undefined,
      });
      navigate(`/assets/${res.data.id}`);
    } catch {
      setError('Failed to create asset. Check required fields.');
    }
  }

  return (
    <div>
      <h2>New Asset</h2>
      <form className="card" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="form-row">
          <label>Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'it' | 'office', categoryId: '' })}>
            <option value="it">IT Asset</option>
            <option value="office">Office Asset</option>
          </select>
        </div>
        <div className="form-row">
          <label>Category</label>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">Select category</option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label>Serial Number</label>
          <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Department</label>
          <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
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
          <label>Location</label>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Purchase Date</label>
          <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Purchase Cost</label>
          <input type="number" step="0.01" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} />
        </div>
        <div className="form-row">
          <label>Warranty Expiry</label>
          <input type="date" value={form.warrantyExpiry} onChange={(e) => setForm({ ...form, warrantyExpiry: e.target.value })} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit">Create Asset</button>
      </form>
    </div>
  );
}
