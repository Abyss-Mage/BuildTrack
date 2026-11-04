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
  role TEXT NOT NULL DEFAULT 'site_engineer',
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

-- Construction Weekly Payroll System
CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  payroll_period TEXT NOT NULL,
  payroll_month TEXT,
  start_date TEXT,
  end_date TEXT,
  base_salary REAL NOT NULL DEFAULT 0.0,
  allowances REAL NOT NULL DEFAULT 0.0,
  deductions REAL NOT NULL DEFAULT 0.0,
  net_salary REAL NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_date TEXT,
  payment_reference TEXT,
  notes TEXT,
  whatsapp_sent_at TEXT,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(user_id, payroll_period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Per-project, per-role approval caps (read by the approvals queue)
CREATE TABLE IF NOT EXISTS project_role_approval_limits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  max_amount_per_expense REAL DEFAULT NULL,
  can_approve INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(project_id, role),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
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
    { table: 'payroll', col: 'payroll_period', def: 'TEXT' },
    { table: 'payroll', col: 'start_date', def: 'TEXT' },
    { table: 'payroll', col: 'end_date', def: 'TEXT' },
  ];

  for (const { table, col, def } of newCols) {
    try {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    } catch (e) {
      // Column already exists, safe to ignore
    }
  }

  // Backfill payroll_period from payroll_month if any exists
  try {
    await db.execute("UPDATE payroll SET payroll_period = payroll_month WHERE payroll_period IS NULL AND payroll_month IS NOT NULL");
  } catch (e) {
    // safe to ignore
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
