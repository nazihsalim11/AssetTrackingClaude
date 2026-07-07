import { FormEvent, useEffect, useState } from 'react';
import { api } from '../api/client';
import { AppUser, Department, UserRole } from '../types';

const ROLES: UserRole[] = ['super_admin', 'it_admin', 'facility_admin', 'finance', 'employee', 'auditor'];

export default function Users() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'employee' as UserRole, departmentId: '' });

  function load() {
    api.get('/users').then((res) => setUsers(res.data));
  }

  useEffect(() => {
    load();
    api.get('/departments').then((res) => setDepartments(res.data));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        departmentId: form.departmentId ? Number(form.departmentId) : null,
      });
      setForm({ name: '', email: '', password: '', role: 'employee', departmentId: '' });
      load();
    } catch {
      setError('Failed to create user. Email may already exist.');
    }
  }

  return (
    <div>
      <h2>Users</h2>
      <div className="grid grid-2">
        <div className="card">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  <td>
                    <span className="badge" data-s={u.is_active ? 'active' : 'inactive'}>
                      {u.is_active ? 'active' : 'inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>New User</h3>
          <div className="form-row">
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="form-row">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Department</label>
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">None</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit">Create User</button>
        </form>
      </div>
    </div>
  );
}
