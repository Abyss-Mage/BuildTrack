-- ========================================================
-- Construction Expense Tracker - MySQL Schema (Hostinger)
-- ========================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'project_manager', 'site_engineer', 'accountant') NOT NULL DEFAULT 'site_engineer',
  phone VARCHAR(20) DEFAULT NULL,
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

-- Per Role Expenditure Approval Allocation per Project
CREATE TABLE IF NOT EXISTS project_role_approval_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  role ENUM('admin', 'project_manager', 'site_engineer', 'accountant') NOT NULL,
  can_approve TINYINT(1) NOT NULL DEFAULT 1,
  max_amount_per_expense DECIMAL(15, 2) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_role_limit (project_id, role),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  INDEX idx_role_limits_proj (project_id)
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


-- Construction Payroll System
CREATE TABLE IF NOT EXISTS payroll (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  payroll_month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  allowances DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  deductions DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  net_salary DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status ENUM('draft', 'pending', 'paid') NOT NULL DEFAULT 'pending',
  payment_method ENUM('bank_transfer', 'upi', 'cash', 'cheque') NOT NULL DEFAULT 'bank_transfer',
  payment_date DATE DEFAULT NULL,
  payment_reference VARCHAR(100) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  whatsapp_sent_at DATETIME DEFAULT NULL,
  created_by INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_month (user_id, payroll_month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_payroll_month (payroll_month),
  INDEX idx_payroll_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
