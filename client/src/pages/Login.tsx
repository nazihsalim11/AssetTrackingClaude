import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MODULES = [
  'asset registry + qr labeling',
  'employee allocation & custody history',
  'amc contracts & warranty alerts',
  'procurement, invoices, payments',
  'movement tracking & disposal records',
  'reports, exports, full audit trail',
];

const DEMO_PASSWORD = 'Demo1234!';
const DEMO_ACCOUNTS: { label: string; email: string }[] = [
  { label: 'Super Admin', email: 'superadmin@demo.com' },
  { label: 'IT Admin', email: 'itadmin@demo.com' },
  { label: 'Facility Admin', email: 'facility@demo.com' },
  { label: 'Finance', email: 'finance@demo.com' },
  { label: 'Employee', email: 'employee@demo.com' },
  { label: 'Auditor', email: 'auditor@demo.com' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await doLogin(email, password);
  }

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate('/');
    } catch {
      setError('ERR: invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    await doLogin(demoEmail, DEMO_PASSWORD);
  }

  return (
    <div className="login-wrap">
      <div className="login-panel">
        <div className="login-brand">
          <div className="wordmark">ASSET<span>/</span>TRACK</div>
          <div className="sub">enterprise asset lifecycle console</div>
          <ul className="login-modules">
            {MODULES.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <div className="login-meta">
            v1.0 &middot; role-based access &middot; every action audited
          </div>
        </div>
        <form className="login-card" onSubmit={handleSubmit}>
          <h3>Authenticate</h3>
          <div className="form-row">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? 'AUTHENTICATING…' : 'SIGN IN →'}
          </button>

          <div className="demo-block">
            <div className="demo-title">demo accounts · one-click sign in</div>
            <div className="demo-grid">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className="demo-btn"
                  disabled={loading}
                  onClick={() => demoLogin(acc.email)}
                  title={`${acc.email} · ${DEMO_PASSWORD}`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
            <div className="demo-hint">all demo accounts use password <code>{DEMO_PASSWORD}</code></div>
          </div>

          <p style={{ fontSize: 11, marginTop: 16, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>
            access is provisioned by your administrator
          </p>
        </form>
      </div>
    </div>
  );
}
