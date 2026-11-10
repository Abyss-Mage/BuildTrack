import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'site_in_charge',
  phone TEXT,
  approval_limit REAL DEFAULT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  location TEXT NOT NULL,
  description TEXT,
  total_budget REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT,
  end_date TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'receipt',
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference_no TEXT NOT NULL UNIQUE,
  project_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  submitted_by INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL,
  expense_date TEXT NOT NULL,
  vendor_name TEXT,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  approved_by INTEGER DEFAULT NULL,
  approved_at TEXT DEFAULT NULL,
  approval_comments TEXT DEFAULT NULL,
  processed_by INTEGER DEFAULT NULL,
  processed_at TEXT DEFAULT NULL,
  payment_reference TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_id INTEGER NOT NULL,
  approver_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  comments TEXT,
  approval_level INTEGER NOT NULL DEFAULT 1,
  acted_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Full Audit Log for Super Admin Access Only
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT NULL,
  user_name TEXT,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS advances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  site_in_charge_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  allocation_date TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'custom',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by INTEGER DEFAULT NULL,
  approved_at TEXT DEFAULT NULL,
  notes TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (site_in_charge_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_no TEXT NOT NULL UNIQUE,
  document_no TEXT NOT NULL,
  pr_date TEXT NOT NULL,
  project_id INTEGER NOT NULL,
  site_description TEXT,
  department TEXT,
  required_date TEXT,
  priority TEXT NOT NULL DEFAULT 'Normal',
  justification TEXT,
  requested_by INTEGER DEFAULT NULL,
  verified_by INTEGER DEFAULT NULL,
  purchase_by INTEGER DEFAULT NULL,
  accounts_by INTEGER DEFAULT NULL,
  approved_by INTEGER DEFAULT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (accounts_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS purchase_requisition_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requisition_id INTEGER NOT NULL,
  sr_no INTEGER NOT NULL,
  item TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  quantity REAL NOT NULL,
  required_date TEXT,
  vendor TEXT,
  rate REAL DEFAULT NULL,
  amount REAL NOT NULL DEFAULT 0.0,
  remarks TEXT,
  FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  father_name TEXT NOT NULL DEFAULT '',
  designation TEXT,
  uan TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS wage_sheets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  period_type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  source_file TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS wage_rows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sheet_id INTEGER NOT NULL,
  employee_id INTEGER NOT NULL,
  designation TEXT,
  rate REAL NOT NULL DEFAULT 0.0,
  monthly_salary REAL NOT NULL DEFAULT 0.0,
  joining_date TEXT,
  departure_date TEXT,
  days_present REAL NOT NULL DEFAULT 0.0,
  total_salary REAL NOT NULL DEFAULT 0.0,
  ta_up REAL NOT NULL DEFAULT 0.0,
  ta_down REAL NOT NULL DEFAULT 0.0,
  salary_advance REAL NOT NULL DEFAULT 0.0,
  pf_deduction REAL NOT NULL DEFAULT 0.0,
  net_payable REAL NOT NULL DEFAULT 0.0,
  paid REAL NOT NULL DEFAULT 0.0,
  whatsapp_sent_at TEXT,
  whatsapp_error TEXT,
  FOREIGN KEY (sheet_id) REFERENCES wage_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
);
`;

// Standard Construction Master Categories
const DEFAULT_CATEGORIES = [
  { id: 1, name: 'Materials (Cement, Steel, Aggregates)', icon: 'brick-wall', description: 'Raw building materials including cement, TMT steel, sand, stone, bricks' },
  { id: 2, name: 'Labor & Daily Wages', icon: 'hard-hat', description: 'Direct site labor wages, contractor labor bills, attendance payouts' },
  { id: 3, name: 'Equipment & Machinery', icon: 'tractor', description: 'Crane/JCB rental, concrete mixers, generator fuel, machine maintenance' },
  { id: 4, name: 'Transportation & Logistics', icon: 'truck', description: 'Delivery of materials, freight transport, site vehicle fuel' },
  { id: 5, name: 'Subcontractor Payments', icon: 'users', description: 'Electrical, plumbing, painting, fabrication, and HVAC specialists' },
  { id: 6, name: 'Permits, Testing & Legal', icon: 'file-text', description: 'Municipal approvals, soil/concrete lab tests, compliance & safety inspections' },
  { id: 7, name: 'Safety Equipment & PPE', icon: 'shield-check', description: 'Helmets, boots, vests, safety harnesses, scaffolding nets' },
  { id: 8, name: 'Site Utilities & Electricity', icon: 'zap', description: 'Site power connections, diesel generators, water supply tankers' },
  { id: 9, name: 'Miscellaneous & Petty Cash', icon: 'wallet', description: 'Urgent site purchases, printing drawings, snacks/tea, office supplies' },
];

export async function initializeDatabase() {
  console.log(`[Database Init] Starting initialization using ${db.getClientType()}...`);

  if (db.getClientType() === 'mysql') {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await db.exec(schemaSql);
    console.log('[Database Init] MySQL schema tables verified.');
  } else {
    await db.exec(SQLITE_SCHEMA);
    console.log('[Database Init] SQLite schema tables verified.');
  }

  // Safe migrations for newly added columns if table previously existed
  const newCols = [
    { table: 'users', col: 'approval_limit', def: 'REAL DEFAULT NULL' },
    { table: 'expenses', col: 'approved_by', def: 'INTEGER DEFAULT NULL' },
    { table: 'expenses', col: 'approved_at', def: 'TEXT DEFAULT NULL' },
    { table: 'expenses', col: 'approval_comments', def: 'TEXT DEFAULT NULL' },
    { table: 'expenses', col: 'processed_by', def: 'INTEGER DEFAULT NULL' },
    { table: 'expenses', col: 'processed_at', def: 'TEXT DEFAULT NULL' },
    { table: 'expenses', col: 'payment_reference', def: 'TEXT DEFAULT NULL' },
    { table: 'projects', col: 'po_number', def: 'VARCHAR(100) DEFAULT NULL' },
    { table: 'projects', col: 'po_date', def: 'DATE DEFAULT NULL' },
    { table: 'expenses', col: 'advance_id', def: 'INT DEFAULT NULL' },
  ];

  for (const { table, col, def } of newCols) {
    try {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  try {
    await db.execute('CREATE INDEX idx_expenses_advance ON expenses (advance_id)');
  } catch (e) {
    // Index already exists, safe to ignore
  }

  // Three roles only: Project Managers and Site Engineers become Site In-Charge
  await db.execute('DROP TABLE IF EXISTS project_role_approval_limits');
  const oldRoleColumn = db.getClientType() === 'mysql'
    && (await db.getOne("SHOW COLUMNS FROM users LIKE 'role'")).Type.includes('site_engineer');
  if (oldRoleColumn) {
    await db.execute("ALTER TABLE users MODIFY role ENUM('admin', 'project_manager', 'site_engineer', 'site_in_charge', 'accountant') NOT NULL DEFAULT 'site_in_charge'");
  }
  await db.execute("UPDATE users SET role = 'site_in_charge' WHERE role IN ('project_manager', 'site_engineer')");
  if (oldRoleColumn) {
    await db.execute("ALTER TABLE users MODIFY role ENUM('admin', 'site_in_charge', 'accountant') NOT NULL DEFAULT 'site_in_charge'");
  }

  // User updates used to log the new password in plain text: strip it from old audit rows
  const leakedRows = await db.getAll(
    `SELECT id, details FROM audit_logs WHERE action = 'USER_UPDATE' AND details LIKE '%"password"%'`
  );
  for (const row of leakedRows) {
    const { password, ...changes } = JSON.parse(row.details);
    await db.execute('UPDATE audit_logs SET details = ? WHERE id = ?', [JSON.stringify(changes), row.id]);
  }

  // Seed standard master categories if missing
  for (const cat of DEFAULT_CATEGORIES) {
    const existing = await db.getOne('SELECT id FROM categories WHERE name = ?', [cat.name]);
    if (!existing) {
      await db.execute(
        'INSERT INTO categories (name, icon, description, is_active) VALUES (?, ?, ?, 1)',
        [cat.name, cat.icon, cat.description]
      );
    }
  }
  console.log('[Database Init] Master categories verified.');

  // Check if any Super Admin user exists in the system
  const existingAdmin = await db.getOne("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");

  if (!existingAdmin) {
    // No well-known default in production: generate a one-time password and print it once
    const generatedPassword = env.INITIAL_ADMIN_PASSWORD ? null : crypto.randomBytes(12).toString('base64url');
    const initialPassword = env.INITIAL_ADMIN_PASSWORD || generatedPassword;

    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash(initialPassword, salt);

    await db.insert(
      'INSERT INTO users (name, email, password_hash, role, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [
        env.INITIAL_ADMIN_NAME,
        env.INITIAL_ADMIN_EMAIL.toLowerCase().trim(),
        adminPasswordHash,
        'admin',
        env.INITIAL_ADMIN_PHONE || null,
      ]
    );

    console.log('[Database Init] Initial Super Admin account created:');
    console.log(`  - Email: ${env.INITIAL_ADMIN_EMAIL}`);
    console.log(`  - Role: Super Admin (Company Owner)`);
    if (generatedPassword) {
      console.log(`  - One-time password (change it after first login): ${generatedPassword}`);
    }
  } else {
    console.log('[Database Init] Admin account already exists. Skipping user creation.');
  }

  console.log('[Database Init] Production database ready (zero demo projects, zero demo expenses).');
}

// If executed directly: `node src/database/init.js`
if (process.argv[1] && process.argv[1].endsWith('init.js')) {
  initializeDatabase()
    .then(async () => {
      await db.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Database Init Error]', err);
      await db.close();
      process.exit(1);
    });
}
