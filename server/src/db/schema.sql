-- Enterprise Asset Tracking & AMC Management System
-- PostgreSQL schema covering PRD.md / Instruction.md core modules

CREATE TYPE user_role AS ENUM (
  'super_admin', 'it_admin', 'facility_admin', 'finance', 'employee', 'auditor'
);

CREATE TYPE asset_type AS ENUM ('office', 'it');

CREATE TYPE asset_status AS ENUM (
  'available', 'assigned', 'in_repair', 'retired', 'disposed'
);

CREATE TYPE allocation_status AS ENUM ('active', 'returned');

CREATE TYPE payment_status AS ENUM (
  'pending', 'partially_paid', 'paid', 'overdue'
);

CREATE TYPE amc_status AS ENUM ('active', 'expired', 'cancelled');

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'employee',
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type asset_type NOT NULL,
  UNIQUE (name, type)
);

CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  address TEXT,
  gst_number VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  type asset_type NOT NULL,
  serial_number VARCHAR(150),
  status asset_status NOT NULL DEFAULT 'available',
  condition VARCHAR(50) DEFAULT 'good',
  purchase_date DATE,
  purchase_cost NUMERIC(14, 2),
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  warranty_expiry DATE,
  location VARCHAR(200),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  image_url TEXT,
  depreciation_rate NUMERIC(5, 2),
  current_value NUMERIC(14, 2),
  qr_code_url TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  disposed_at DATE,
  disposal_reason TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_serial ON assets(serial_number);

CREATE TABLE allocations (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  status allocation_status NOT NULL DEFAULT 'active',
  notes TEXT,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_allocations_asset ON allocations(asset_id);
CREATE INDEX idx_allocations_employee ON allocations(employee_id);

CREATE TABLE asset_movements (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  to_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  from_location VARCHAR(200),
  to_location VARCHAR(200),
  moved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  moved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT
);

CREATE TABLE amc_contracts (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  contract_number VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  cost NUMERIC(14, 2),
  service_schedule VARCHAR(100),
  agreement_doc_url TEXT,
  status amc_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_amc_end_date ON amc_contracts(end_date);

CREATE TABLE amc_services (
  id SERIAL PRIMARY KEY,
  amc_id INTEGER NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  next_service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(100) NOT NULL UNIQUE,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(14, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
  asset_id INTEGER REFERENCES assets(id) ON DELETE SET NULL,
  amount NUMERIC(14, 2) NOT NULL,
  gst_amount NUMERIC(14, 2) DEFAULT 0,
  invoice_date DATE NOT NULL,
  due_date DATE,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_status ON invoices(payment_status);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  related_type VARCHAR(50) NOT NULL, -- asset | amc | invoice | vendor
  related_id INTEGER NOT NULL,
  doc_type VARCHAR(80) NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80) NOT NULL,
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
