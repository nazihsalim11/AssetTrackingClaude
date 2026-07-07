# Enterprise Asset Tracking & AMC Management System

Full implementation of [PRD.md](PRD.md) / [Instruction.md](Instruction.md): React + Node/Express + PostgreSQL.

## Structure

- `server/` — Express + TypeScript API, PostgreSQL via `pg`, JWT auth, RBAC, QR code generation, file uploads
- `client/` — React + TypeScript + Vite SPA

## What's implemented

- Auth (login, JWT) and role-based access control (super_admin, it_admin, facility_admin, finance, employee, auditor)
- User management (create employees/admins), departments, categories, vendors
- Asset Management: create/edit/archive/dispose/delete, auto asset code (`AST-00001`), auto-generated QR code label, printable label download
- QR scanning: camera-based scanner (`/scan`) using the device camera, plus manual code lookup — resolves an asset code or serial number straight to the asset detail page
- Employee Asset Allocation: assign / return, custody history
- Asset Movement: department/location transfers with full movement history per asset
- AMC Contracts: create, expiry tracking, service log entries
- Purchase Orders: create, status tracking (open/fulfilled/cancelled)
- Invoices: create, GST field, payment status tracking
- Document Repository: file upload (warranty certs, invoices, service reports, asset images, vendor files) attached to any asset, stored under `server/uploads/documents`
- Notifications: in-app notification bell, auto-generated hourly (and once at server startup) for AMC expiry, warranty expiry, service due, and pending/overdue invoices — scoped to the relevant roles
- Audit Log: every create/update/delete/transfer/dispose action is recorded with user, entity, and details; viewable by super_admin/auditor
- Reports: inventory, employee allocation, vendor assets, AMC renewals, invoice status, asset movement, disposal — each with CSV/Excel export (CSV, opens natively in Excel) and a browser-print PDF export
- Dashboard summary endpoint + widgets (totals, by category/department, assigned vs available, AMC/warranty expiring soon, pending payments, recent assets)

## Known limitations

- **Email notifications**: the PRD calls for email alerts alongside in-app ones. This scaffold only implements in-app notifications (no SMTP credentials configured). Wiring in an email provider (e.g. Nodemailer + SMTP or a transactional email API) is a follow-up.
- **Excel export**: "Excel export" is CSV (opens correctly in Excel/Google Sheets) rather than a native `.xlsx` file. Swap in a library like `exceljs` if a true binary workbook is required.
- **RFID, mobile app, ERP integration, approval workflows, AI analytics, predictive maintenance**: explicitly listed as *future enhancements* in the PRD — out of scope here.

## Prerequisites

- Node.js 18+
- A PostgreSQL database. This project is configured for **Supabase** (managed Postgres). A plain local Postgres also works — see the fallback note in `server/.env.example`.

## Database (Supabase)

The database has been migrated to a Supabase project (**AssetTracking-App**, ref `izlqklhmxznzdvtxwayh`, region `ap-southeast-2`). The full schema, reference data, demo accounts, and demo data for every module are already applied to that project — no `npm run migrate` needed.

To point the server at it, set the connection string in `server/.env`:

1. In the [Supabase dashboard](https://supabase.com/dashboard/project/izlqklhmxznzdvtxwayh), go to **Project Settings → Database → Database password** and reset/copy the password.
2. Copy the **Session pooler** URI from **Project Settings → Database → Connection string**.
3. Paste it into `DATABASE_URL` in `server/.env` (replacing `[YOUR-DB-PASSWORD]`), and keep `DATABASE_SSL=true`.

> `server/src/db/pool.ts` auto-enables TLS when the connection string points at Supabase (or when `DATABASE_SSL=true`).

## Setup

### Server

```bash
cd server
# .env is already scaffolded for Supabase — just paste your DB password into DATABASE_URL
npm install
npm run dev        # starts API on http://localhost:4000
```

(Re-running `npm run migrate` is only needed for a fresh/empty database — it applies `schema.sql` + `seed.sql`. The Supabase project is already seeded.)

### Client

```bash
cd client
npm install
npm run dev        # starts UI on http://localhost:5173
```

The client dev server proxies `/api` and `/uploads` to `http://localhost:4000`. The QR camera scanner needs either `localhost` (already satisfied in dev) or HTTPS to access the device camera.

## Login & demo accounts

Open http://localhost:5173/login. The login screen has **one-click demo buttons** for every role — click one and it signs you straight in. All demo accounts share the password `Demo1234!`.

| Role | Email |
| --- | --- |
| Super Admin | `superadmin@demo.com` |
| IT Admin | `itadmin@demo.com` |
| Facility Admin | `facility@demo.com` |
| Finance | `finance@demo.com` |
| Employee | `employee@demo.com` |
| Auditor | `auditor@demo.com` |

Extra employee accounts (`david.chen@demo.com`, `priya.nair@demo.com`, `marcus.webb@demo.com`, same password) exist so allocation/custody history has variety.

## Role-gated navigation

- **super_admin**: sees everything, including Users and Audit Log
- **it_admin / facility_admin**: Assets, Scan, Allocations, AMC, Purchase Orders, Vendors
- **finance**: Invoices, Purchase Orders, Reports
- **auditor**: Reports, Audit Log (read-only)
- **employee**: Dashboard, Assets (view), Allocations (view), Scan
