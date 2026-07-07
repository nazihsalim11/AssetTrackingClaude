import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const CRUMBS: [string, string][] = [
  ['/assets/new', 'assets / register'],
  ['/assets/', 'assets / detail'],
  ['/assets', 'assets'],
  ['/scan', 'scan'],
  ['/allocations', 'allocations'],
  ['/amc', 'amc-contracts'],
  ['/invoices', 'invoices'],
  ['/purchase-orders', 'purchase-orders'],
  ['/vendors', 'vendors'],
  ['/reports', 'reports'],
  ['/users', 'users'],
  ['/audit-logs', 'audit-log'],
];

function crumbFor(pathname: string): string {
  const match = CRUMBS.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : 'overview';
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const role = user?.role;

  const canManage = role === 'super_admin' || role === 'it_admin' || role === 'facility_admin';
  const canFinance = role === 'super_admin' || role === 'finance';
  const canAudit = role === 'super_admin' || role === 'auditor';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="wordmark">ASSET<span>/</span>TRACK</div>
          <div className="tagline">asset lifecycle console</div>
        </div>
        <nav>
          <div className="nav-group-label">Operations</div>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/assets">Assets</NavLink>
          <NavLink to="/scan">Scan QR</NavLink>
          <NavLink to="/allocations">Allocations</NavLink>

          <div className="nav-group-label">Contracts &amp; Finance</div>
          <NavLink to="/amc">AMC Contracts</NavLink>
          <NavLink to="/invoices">Invoices</NavLink>
          {(canFinance || canManage) && <NavLink to="/purchase-orders">Purchase Orders</NavLink>}
          {canManage && <NavLink to="/vendors">Vendors</NavLink>}

          {(canFinance || canAudit) && (
            <div className="nav-group-label">Administration</div>
          )}
          {(canFinance || canAudit) && <NavLink to="/reports">Reports</NavLink>}
          {role === 'super_admin' && <NavLink to="/users">Users</NavLink>}
          {canAudit && <NavLink to="/audit-logs">Audit Log</NavLink>}
        </nav>
        <div className="sidebar-foot">v1.0 &middot; rbac enforced</div>
      </aside>
      <main className="main-content">
        <div className="topbar-shell">
          <div className="crumb">
            asset-track <b>/ {crumbFor(pathname)}</b>
          </div>
          <div className="topbar-right">
            <NotificationBell />
            <span className="user-chip">
              {user?.name} <span className="role">[{user?.role}]</span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
