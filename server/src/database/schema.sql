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

CREATE TABLE IF NOT EXISTS project_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  user_id INT NOT NULL,
  role_in_project ENUM('manager', 'engineer', 'viewer') NOT NULL DEFAULT 'engineer',
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_project_user (project_id, user_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_expenses_project (project_id),
  INDEX idx_expenses_status (status),
  INDEX idx_expenses_date (expense_date),
  INDEX idx_expenses_user (submitted_by)
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
