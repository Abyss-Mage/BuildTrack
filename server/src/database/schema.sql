-- ========================================================
-- Construction Expense Tracker - MySQL Schema (Hostinger)
-- ========================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'site_in_charge', 'accountant') NOT NULL DEFAULT 'site_in_charge',
  phone VARCHAR(20) DEFAULT NULL,
  approval_limit DECIMAL(15, 2) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  location VARCHAR(200) NOT NULL,
  description TEXT,
  total_budget DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status ENUM('active', 'completed', 'on_hold') NOT NULL DEFAULT 'active',
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_projects_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50) DEFAULT 'receipt',
  description VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference_no VARCHAR(50) NOT NULL UNIQUE,
  project_id INT NOT NULL,
  category_id INT NOT NULL,
  submitted_by INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  expense_date DATE NOT NULL,
  vendor_name VARCHAR(150) DEFAULT NULL,
  payment_method ENUM('cash', 'upi', 'bank_transfer', 'cheque', 'credit_card') NOT NULL DEFAULT 'cash',
  status ENUM('draft', 'pending', 'approved', 'rejected', 'processed') NOT NULL DEFAULT 'pending',
  rejection_reason TEXT DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  approval_comments TEXT DEFAULT NULL,
  processed_by INT DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  payment_reference VARCHAR(100) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_expenses_project (project_id),
  INDEX idx_expenses_status (status),
  INDEX idx_expenses_date (expense_date),
  INDEX idx_expenses_user (submitted_by),
  INDEX idx_expenses_approved_by (approved_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receipts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  INDEX idx_receipts_expense (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS approvals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  expense_id INT NOT NULL,
  approver_id INT NOT NULL,
  action ENUM('approved', 'rejected') NOT NULL,
  comments TEXT DEFAULT NULL,
  approval_level INT NOT NULL DEFAULT 1,
  acted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
  FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_approvals_expense (expense_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Full Audit Log for Super Admin Access Only
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  user_name VARCHAR(100) DEFAULT NULL,
  user_email VARCHAR(150) DEFAULT NULL,
  user_role VARCHAR(50) DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(50) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(255) DEFAULT NULL,
  details TEXT DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at),
  INDEX idx_audit_action (action),
  INDEX idx_audit_entity (entity_type),
  INDEX idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Money handed to a Site In-Charge, spent down by expense entries
CREATE TABLE IF NOT EXISTS advances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  site_in_charge_id INT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  allocation_date DATE NOT NULL,
  period_type ENUM('weekly', 'fortnightly', 'monthly', 'custom') NOT NULL DEFAULT 'custom',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by INT DEFAULT NULL,
  approved_at DATETIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (site_in_charge_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_advances_project (project_id),
  INDEX idx_advances_in_charge (site_in_charge_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase Requisitions, laid out like the company's PR sheet
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pr_no VARCHAR(50) NOT NULL UNIQUE,
  document_no VARCHAR(50) NOT NULL,
  pr_date DATE NOT NULL,
  project_id INT NOT NULL,
  site_description VARCHAR(255) DEFAULT NULL,
  department VARCHAR(100) DEFAULT NULL,
  required_date DATE DEFAULT NULL,
  priority ENUM('Low', 'Normal', 'High', 'Urgent') NOT NULL DEFAULT 'Normal',
  justification TEXT DEFAULT NULL,
  requested_by INT DEFAULT NULL,
  verified_by INT DEFAULT NULL,
  purchase_by INT DEFAULT NULL,
  accounts_by INT DEFAULT NULL,
  approved_by INT DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (accounts_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_pr_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_requisition_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requisition_id INT NOT NULL,
  sr_no INT NOT NULL,
  item VARCHAR(200) NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  unit VARCHAR(30) NOT NULL,
  quantity DECIMAL(15, 3) NOT NULL,
  required_date DATE DEFAULT NULL,
  vendor VARCHAR(150) DEFAULT NULL,
  rate DECIMAL(15, 2) DEFAULT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  remarks VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (requisition_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  INDEX idx_pr_items (requisition_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site workers from uploaded wage sheets (most have no login)
CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  father_name VARCHAR(150) NOT NULL DEFAULT '',
  designation VARCHAR(100) DEFAULT NULL,
  uan VARCHAR(30) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_employees_uan (uan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One uploaded Excel wage sheet for one site and period
CREATE TABLE IF NOT EXISTS wage_sheets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  period_type ENUM('weekly', 'fortnightly', 'monthly', 'custom') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_wage_sheets_project (project_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Values are stored exactly as Excel calculated them
CREATE TABLE IF NOT EXISTS wage_rows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sheet_id INT NOT NULL,
  employee_id INT NOT NULL,
  designation VARCHAR(100) DEFAULT NULL,
  rate DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  monthly_salary DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  joining_date VARCHAR(30) DEFAULT NULL,
  departure_date VARCHAR(30) DEFAULT NULL,
  days_present DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  total_salary DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  ta_up DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  ta_down DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  salary_advance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  pf_deduction DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  net_payable DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  paid DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  whatsapp_sent_at DATETIME DEFAULT NULL,
  whatsapp_error VARCHAR(255) DEFAULT NULL,
  FOREIGN KEY (sheet_id) REFERENCES wage_sheets(id) ON DELETE CASCADE,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT,
  INDEX idx_wage_rows_sheet (sheet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
