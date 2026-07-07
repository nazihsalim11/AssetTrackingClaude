import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AssetList from './pages/AssetList';
import AssetCreate from './pages/AssetCreate';
import AssetDetail from './pages/AssetDetail';
import AllocationList from './pages/AllocationList';
import AmcList from './pages/AmcList';
import InvoiceList from './pages/InvoiceList';
import Vendors from './pages/Vendors';
import Users from './pages/Users';
import PurchaseOrders from './pages/PurchaseOrders';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import ScanQR from './pages/ScanQR';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<AssetList />} />
        <Route path="assets/new" element={<AssetCreate />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="scan" element={<ScanQR />} />
        <Route path="allocations" element={<AllocationList />} />
        <Route path="amc" element={<AmcList />} />
        <Route path="invoices" element={<InvoiceList />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="audit-logs" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}
