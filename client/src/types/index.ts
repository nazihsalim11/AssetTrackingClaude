export type UserRole =
  | 'super_admin'
  | 'it_admin'
  | 'facility_admin'
  | 'finance'
  | 'employee'
  | 'auditor';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  departmentId: number | null;
}

export interface Department {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'office' | 'it';
}

export interface Vendor {
  id: number;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address?: string | null;
  gst_number?: string | null;
}

export interface AppUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number | null;
  vendor_name?: string;
  order_date: string;
  total_amount: number | null;
  status: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name?: string;
  action: string;
  entity: string;
  entity_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AssetMovement {
  id: number;
  asset_id: number;
  from_department_name?: string;
  to_department_name?: string;
  from_location: string | null;
  to_location: string | null;
  moved_at: string;
  moved_by_name?: string;
  reason: string | null;
}

export interface AssetDocument {
  id: number;
  related_type: string;
  related_id: number;
  doc_type: string;
  file_url: string;
  uploaded_by_name?: string;
  uploaded_at: string;
}

export interface Asset {
  id: number;
  asset_code: string;
  name: string;
  category_id: number | null;
  category_name?: string;
  type: 'office' | 'it';
  serial_number: string | null;
  status: 'available' | 'assigned' | 'in_repair' | 'retired' | 'disposed';
  condition: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  warranty_expiry: string | null;
  location: string | null;
  department_id: number | null;
  department_name?: string;
  vendor_name?: string;
  qr_code_url: string | null;
  created_at: string;
}

export interface DashboardSummary {
  totalAssets: number;
  assetsByCategory: { category: string; count: number }[];
  assetsByDepartment: { department: string; count: number }[];
  assignedVsAvailable: { status: string; count: number }[];
  amcExpiring: { id: number; contract_number: string; end_date: string; asset_name: string; asset_code: string }[];
  warrantyExpiring: { id: number; name: string; asset_code: string; warranty_expiry: string }[];
  pendingPayments: { count: number; total: number };
  recentAssets: Asset[];
}
