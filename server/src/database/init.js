import bcrypt from 'bcryptjs';
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

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role_in_project TEXT NOT NULL DEFAULT 'engineer',
  assigned_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE(project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT
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
    const salt = await bcrypt.genSalt(10);
    const adminPasswordHash = await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, salt);

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
