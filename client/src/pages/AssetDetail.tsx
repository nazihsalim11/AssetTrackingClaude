import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, resolveFileUrl } from '../api/client';
import { uploadToSignedUrl } from '../api/storage';
import { useAuth } from '../context/AuthContext';
import { Asset, AssetDocument, AssetMovement, AppUser, Department } from '../types';

const MANAGER_ROLES = ['super_admin', 'it_admin', 'facility_admin'];
const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'Enterprise Asset Tracking';

interface AllocationRow {
  id: number;
  employee_name: string;
  assigned_date: string;
  returned_date: string | null;
  status: 'active' | 'returned';
}

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = !!user && MANAGER_ROLES.includes(user.role);
  const isSuperAdmin = user?.role === 'super_admin';

  const [asset, setAsset] = useState<Asset | null>(null);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [documents, setDocuments] = useState<AssetDocument[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [transferDeptId, setTransferDeptId] = useState('');
  const [transferLocation, setTransferLocation] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [disposeReason, setDisposeReason] = useState('');
  const [docType, setDocType] = useState('warranty_certificate');
  const [docFile, setDocFile] = useState<File | null>(null);

  function loadAll() {
    api.get(`/assets/${id}`).then((res) => setAsset(res.data));
    api.get('/allocations', { params: { assetId: id } }).then((res) => setAllocations(res.data));
    api.get('/movements', { params: { assetId: id } }).then((res) => setMovements(res.data));
    api.get('/documents', { params: { relatedType: 'asset', relatedId: id } }).then((res) => setDocuments(res.data));
  }

  useEffect(() => {
    loadAll();
    api.get('/departments').then((res) => setDepartments(res.data));
    if (canManage) api.get('/users').then((res) => setUsers(res.data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!assignEmployeeId) return;
    await api.post('/allocations/assign', { assetId: Number(id), employeeId: Number(assignEmployeeId) });
    setAssignEmployeeId('');
    setMessage('Asset assigned.');
    loadAll();
  }

  async function handleReturn(allocationId: number) {
    await api.post(`/allocations/${allocationId}/return`);
    setMessage('Asset returned.');
    loadAll();
  }

  async function handleTransfer(e: FormEvent) {
    e.preventDefault();
    await api.post('/movements', {
      assetId: Number(id),
      toDepartmentId: transferDeptId ? Number(transferDeptId) : undefined,
      toLocation: transferLocation || undefined,
      reason: transferReason || undefined,
    });
    setTransferDeptId('');
    setTransferLocation('');
    setTransferReason('');
    setMessage('Asset transferred.');
    loadAll();
  }

  async function handleDispose(e: FormEvent) {
    e.preventDefault();
    await api.post(`/assets/${id}/dispose`, { reason: disposeReason || undefined });
    setDisposeReason('');
    setMessage('Asset marked as disposed.');
    loadAll();
  }

  async function handleArchive() {
    await api.post(`/assets/${id}/archive`);
    setMessage('Asset archived.');
    loadAll();
  }

  async function handleDelete() {
    if (!asset) return;
    const confirmed = window.confirm(
      `Permanently delete asset ${asset.asset_code} (${asset.name})?\n\n` +
        'This also removes its allocation, movement, AMC and document records and cannot be undone.'
    );
    if (!confirmed) return;
    await api.delete(`/assets/${id}`);
    navigate('/assets');
  }

  async function handleUploadDoc(e: FormEvent) {
    e.preventDefault();
    if (!docFile) return;
    const { data } = await api.post('/documents/upload-url', { fileName: docFile.name });
    await uploadToSignedUrl('documents', data.path, data.token, docFile);
    await api.post('/documents', {
      relatedType: 'asset',
      relatedId: Number(id),
      docType,
      fileUrl: data.publicUrl,
    });
    setDocFile(null);
    setMessage('Document uploaded.');
    loadAll();
  }

  if (!asset) return <p>Loading...</p>;

  const activeAllocation = allocations.find((a) => a.status === 'active');

  return (
    <div>
      <div className="topbar">
        <h2 style={{ margin: 0 }}>{asset.name}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManage && asset.status !== 'disposed' && (
            <button className="btn btn-ghost" onClick={handleArchive}>Archive</button>
          )}
          {isSuperAdmin && (
            <button className="btn btn-ghost btn-danger" onClick={handleDelete}>Delete</button>
          )}
        </div>
      </div>
      {message && <p className="ok-text">&#10003; {message}</p>}

      <div className="grid grid-2" style={{ marginBottom: 12 }}>
        <div className="card">
          <h3>Specification</h3>
          <table className="kv">
            <tbody>
              <tr><td>Asset Code</td><td>{asset.asset_code}</td></tr>
              <tr><td>Type</td><td>{asset.type}</td></tr>
              <tr><td>Category</td><td>{asset.category_name ?? '-'}</td></tr>
              <tr><td>Serial Number</td><td>{asset.serial_number ?? '-'}</td></tr>
              <tr><td>Status</td><td><span className="badge" data-s={asset.status}>{asset.status}</span></td></tr>
              <tr><td>Condition</td><td>{asset.condition ?? '-'}</td></tr>
              <tr><td>Department</td><td>{asset.department_name ?? '-'}</td></tr>
              <tr><td>Location</td><td>{asset.location ?? '-'}</td></tr>
              <tr><td>Vendor</td><td>{asset.vendor_name ?? '-'}</td></tr>
              <tr><td>Purchase Date</td><td>{asset.purchase_date ? new Date(asset.purchase_date).toLocaleDateString() : '-'}</td></tr>
              <tr><td>Purchase Cost</td><td>{asset.purchase_cost ?? '-'}</td></tr>
              <tr><td>Warranty Expiry</td><td>{asset.warranty_expiry ? new Date(asset.warranty_expiry).toLocaleDateString() : '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ textAlign: 'left' }}>QR Label</h3>
          {asset.qr_code_url ? (
            <img
              src={resolveFileUrl(asset.qr_code_url)}
              alt="QR Code"
              width={190}
              height={190}
              style={{ background: '#fff', padding: 8, border: '1px solid var(--border)' }}
            />
          ) : (
            <p className="mono">— no QR code generated —</p>
          )}
          <div className="qr-label-meta">
            <div className="qr-company">{COMPANY_NAME}</div>
            <div className="mono" style={{ letterSpacing: '0.1em' }}>{asset.asset_code}</div>
            <div className="mono qr-label-sub">{asset.type.toUpperCase()}</div>
            {asset.serial_number && <div className="mono qr-label-sub">SN: {asset.serial_number}</div>}
          </div>
          {asset.qr_code_url && (
            <a className="btn" href={resolveFileUrl(asset.qr_code_url)} download target="_blank" rel="noreferrer">
              Print / Download Label
            </a>
          )}
        </div>
      </div>

      {canManage && (
        <div className="grid grid-2" style={{ marginBottom: 16 }}>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Allocation</h3>
            {activeAllocation ? (
              <div>
                <p>Currently assigned to <strong>{activeAllocation.employee_name}</strong> since {new Date(activeAllocation.assigned_date).toLocaleDateString()}</p>
                <button className="btn" onClick={() => handleReturn(activeAllocation.id)}>Return Asset</button>
              </div>
            ) : (
              <form onSubmit={handleAssign} style={{ display: 'flex', gap: 8 }}>
                <select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Select employee</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button className="btn" type="submit">Assign</button>
              </form>
            )}

            <h4>Custody History</h4>
            <table>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id}>
                    <td>{a.employee_name}</td>
                    <td>{new Date(a.assigned_date).toLocaleDateString()}</td>
                    <td>{a.returned_date ? new Date(a.returned_date).toLocaleDateString() : '-'}</td>
                    <td><span className="badge" data-s={a.status}>{a.status}</span></td>
                  </tr>
                ))}
                {allocations.length === 0 && <tr><td>No allocation history.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Transfer / Movement</h3>
            <form onSubmit={handleTransfer}>
              <div className="form-row">
                <label>New Department</label>
                <select value={transferDeptId} onChange={(e) => setTransferDeptId(e.target.value)}>
                  <option value="">Keep current</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label>New Location</label>
                <input value={transferLocation} onChange={(e) => setTransferLocation(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Reason</label>
                <input value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
              </div>
              <button className="btn" type="submit">Transfer</button>
            </form>

            <h4>Movement History</h4>
            <table>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.moved_at).toLocaleDateString()}</td>
                    <td>{m.from_department_name ?? '-'} &rarr; {m.to_department_name ?? '-'}</td>
                    <td>{m.to_location ?? '-'}</td>
                  </tr>
                ))}
                {movements.length === 0 && <tr><td>No movement history.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Documents</h3>
          {canManage && (
            <form onSubmit={handleUploadDoc} style={{ marginBottom: 12 }}>
              <div className="form-row">
                <label>Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  <option value="warranty_certificate">Warranty Certificate</option>
                  <option value="purchase_invoice">Purchase Invoice</option>
                  <option value="service_report">Service Report</option>
                  <option value="asset_image">Asset Image</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-row">
                <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] ?? null)} />
              </div>
              <button className="btn" type="submit">Upload</button>
            </form>
          )}
          <ul>
            {documents.map((d) => (
              <li key={d.id}>
                <a href={resolveFileUrl(d.file_url)} target="_blank" rel="noreferrer">{d.doc_type}</a>
                {' '}({new Date(d.uploaded_at).toLocaleDateString()})
              </li>
            ))}
            {documents.length === 0 && <li>No documents uploaded.</li>}
          </ul>
        </div>

        {canManage && asset.status !== 'disposed' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Dispose Asset</h3>
            <form onSubmit={handleDispose}>
              <div className="form-row">
                <label>Disposal Reason</label>
                <textarea value={disposeReason} onChange={(e) => setDisposeReason(e.target.value)} />
              </div>
              <button className="btn" type="submit">Mark as Disposed</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
