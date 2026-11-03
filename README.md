# 🏗️ BuildTrack — Construction Expense Tracking Platform

> **Web-based Expense Tracking, Cost Control & Site Voucher Management System for Construction Companies.**
> Designed for high-reliability hosting on **Hostinger Cloud / Business Node Apps** with native MySQL.

---

## 🌟 Key Features

### 1. 👷 Site Field Expense Submission
- **Field-Optimized**: Responsive UI for smartphones and tablets used by foremen and site engineers.
- **Smart Receipt Compression**: Uploads photos of invoices and challans directly from phone cameras or file picker. Images are automatically auto-rotated (EXIF) and compressed to progressive JPEGs (~150-250 KB) using Sharp, conserving Hostinger NVMe disk space. Also accepts PDF invoices.
- **Auto-Generated Sequential Vouchers**: `EXP-YYYYMM-XXXX` (e.g., `EXP-202611-0001`).

### 2. ⚡ Multi-Level Approval Workflow
```
[Site Engineer] ──Creates──> [Pending] ──PM Approves──> [Approved] ──Accountant Settles──> [Processed & Paid]
                                   │
                                Rejects (with reason)
                                   ▼
                              [Rejected] ──Engineer edits & resubmits──> [Pending]
```
- **Project Manager Tier**: Reviews bills against physical deliveries and vendor agreements. Can approve or reject with a required comment.
- **Finance & Accounting Tier**: Disburses payments, records banking references (NEFT/RTGS/UPI), and marks vouchers as reconciled.

### 3. 📊 Construction-Specific Financial Analytics
- **Live Interactive Dashboard**: Monthly expenditure trajectory, category distribution pie charts, and project budget utilization bar charts.
- **Project P&L Statement**: Real-time comparison of allocated budget vs actual site expenditure with variance calculation (healthy vs overrun).
- **Audit-Ready Exports**:
  - **PDF Export**: Generates branded expense summaries and itemized P&L statements using PDFKit.
  - **Excel Export**: Generates formatted XLSX spreadsheets with styled headers and currency formats using ExcelJS.

### 4. 👥 Role-Based Access Control (RBAC)
- **Admin / Company Owner**: Full access across all sites, teams, settings, and approvals.
- **Project Manager**: Oversees assigned sites, reviews expenditures, and approves vouchers.
- **Site Engineer / Foreman**: Submits site vouchers and bills from the field.
- **Accountant / Finance**: Reconciles payments, manages ledgers, and generates PDF/Excel reports.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TailwindCSS, Zustand, Recharts, Lucide Icons, Axios |
| **Backend** | Node.js, Express.js 4, mysql2/promise, Zod, Multer, Sharp, PDFKit, ExcelJS |
| **Database** | MySQL (Native Hostinger Cloud) with built-in SQLite auto-fallback for zero-config local dev |
| **Security** | JWT (jsonwebtoken), bcryptjs, Helmet, CORS, Rate-Limiting |
| **Hosting Target** | Hostinger Cloud Hosting (Startup/Professional/Enterprise) or Business Web Hosting |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js v18+ (tested on Node.js v24)
- npm v9+

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd ExpenseTracker

# Install dependencies for both server and client
npm run install:all
```

### 2. Initialize Database
Initializes the database tables and master categories, and creates the primary Super Admin account:
```bash
npm run db:init
```

### 3. Start Application
```bash
# Starts Express API on port 5000 and Vite React dev server on port 5173
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🔑 Initial Super Admin Credentials

When the system is first initialized, the initial Super Admin account is provisioned:

| Credential | Value | Configurable In `.env` |
|---|---|---|
| **Email** | `admin@construction.com` | `INITIAL_ADMIN_EMAIL` |
| **Password** | `Admin@123` | `INITIAL_ADMIN_PASSWORD` |
| **Role** | Super Admin (Company Owner) | Full Access |

> [!NOTE]
> All other users (Project Managers, Site Engineers, Accountants) and Projects are created directly through the **Team Users** and **Projects** management pages by the Admin. There is zero fake or demo data.

---

## 🌐 Deploying to Hostinger Node Apps & MySQL

### Step 1: Create the MySQL Database in hPanel
1. Log into your **Hostinger hPanel**.
2. Go to **Websites** ➔ Select your domain ➔ **Databases** ➔ **Management**.
3. Create a new database:
   - **Database Name**: e.g. `u123456789_expense_db`
   - **Username**: e.g. `u123456789_expense_usr`
   - **Password**: `YourStrongPassword#2026`
4. Note down your full database name and username.

### Step 2: Configure the Node.js Application in hPanel
1. In hPanel, navigate to **Websites** ➔ Select your domain ➔ **Node.js** (or **Web Apps**).
2. Connect your **GitHub repository** or upload your project archive.
3. Configure the application settings:
   - **Node.js Version**: Select `20.x` or `22.x`
   - **Application Root**: `/` (repository root)
   - **Application Startup File**: `server/src/server.js`
   - **Build Command**:
     ```bash
     cd client && npm install && npm run build && cd ../server && npm install
     ```
   - **Run Command**:
     ```bash
     npm start
     ```

### Step 3: Set Environment Variables in hPanel
Under **Environment Variables** in the Node.js app dashboard, add:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=generate_a_random_64_character_hex_string_here

# HOSTINGER MYSQL CONFIGURATION
DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=u123456789_expense_usr
DB_PASSWORD=YourStrongPassword#2026
DB_NAME=u123456789_expense_db

# INITIAL SUPER ADMIN CREDENTIALS
INITIAL_ADMIN_EMAIL=admin@yourcompany.com
INITIAL_ADMIN_PASSWORD=SetYourSecureInitialPassword
INITIAL_ADMIN_NAME=Your Name

MAX_FILE_SIZE_MB=10
UPLOAD_DIR=uploads/receipts
```

> [!IMPORTANT]
> **Hostinger MySQL IP Warning (`127.0.0.1` vs `localhost`):**
> Always set `DB_HOST=127.0.0.1`. On modern Node.js versions, `localhost` resolves to the IPv6 loopback (`::1`), which causes Hostinger's MySQL server to throw an `"Access denied for user ... @'::1'"` error.

### Step 4: Run Initial Database Migration on Hostinger
You can initialize the MySQL tables and seeds either:
1. **Via hPanel Web Terminal / SSH**:
   ```bash
   cd /home/u123456789/domains/yourdomain.com/public_html
   node server/src/database/init.js
   ```
2. **Or via phpMyAdmin**:
   Open phpMyAdmin in hPanel, select your database, and import `server/src/database/schema.sql` followed by `server/src/database/seed.sql`.

### Step 5: Start & Verify Application
Click **Deploy / Restart** in your Hostinger Node.js dashboard. The unified Express server will serve both the REST API and the React SPA under your custom domain with SSL.

---

## 📁 Repository Structure

```
ExpenseTracker/
├── package.json                    # Root scripts (install:all, dev, build, start)
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
├── README.md                       # Documentation & Hostinger deployment guide
│
├── server/                         # ── Express Backend ──
│   ├── package.json
│   ├── uploads/receipts/           # Auto-compressed receipt images
│   ├── data/                       # Local SQLite fallback storage
│   └── src/
│       ├── app.js                  # Express setup, security headers, static SPA serving
│       ├── server.js               # Entry point, DB connection, graceful shutdown
│       ├── config/
│       │   ├── env.js              # Environment variable loader
│       │   └── database.js         # Unified MySQL pool & SQLite dev engine
│       ├── database/
│       │   ├── schema.sql          # Native MySQL DDL schema
│       │   ├── seed.sql            # Master categories & super admin
│       │   └── init.js             # Automated DB migration and admin provisioner
│       ├── middleware/
│       │   ├── auth.js             # JWT verification & active user check
│       │   ├── authorize.js        # Role-based access control
│       │   ├── validate.js         # Zod schema validation
│       │   ├── upload.js           # Multer + Sharp receipt image compression
│       │   └── errorHandler.js     # Centralized error handler
│       ├── modules/
│       │   ├── auth/               # Login, JWT, password change
│       │   ├── users/              # User management (Admin)
│       │   ├── projects/           # Construction sites & budget tracking
│       │   ├── expenses/           # Core expense ledger & receipt uploads
│       │   ├── approvals/          # PM approval & Accountant settlement queue
│       │   ├── categories/         # Category CRUD
│       │   ├── dashboard/          # Aggregated metrics & chart data
│       │   └── reports/            # PDF and Excel report generation
│       └── utils/
│           ├── ApiError.js         # Custom operational error class
│           ├── asyncHandler.js     # Express async try/catch wrapper
│           ├── pdfGenerator.js     # Branded PDF report builder (PDFKit)
│           └── excelGenerator.js   # Excel spreadsheet builder (ExcelJS)
│
└── client/                         # ── React Frontend (Vite) ──
    ├── package.json
    ├── vite.config.js              # Vite configuration with API proxy
    ├── tailwind.config.js          # Construction Amber/Slate theme tokens
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                 # React Router setup & protected routes
        ├── index.css               # Tailwind CSS & custom scrollbars
        ├── api/client.js           # Axios instance with JWT interceptors
        ├── store/                  # Zustand state stores (authStore, uiStore)
        ├── components/
        │   ├── layout/             # Sidebar, Navbar, MainLayout
        │   ├── ui/                 # StatusBadge, Modal, ReceiptViewerModal, Toast
        │   └── charts/             # CategoryPieChart, MonthlySpendChart, ProjectBudgetBarChart
        └── pages/
            ├── Login.jsx           # Clean corporate login screen
            ├── Dashboard.jsx       # Overview, charts, KPI summary cards
            ├── Projects.jsx        # Project list, budget progress bars, site creation
            ├── ProjectDetail.jsx   # Project P&L, budget variance, site expenses
            ├── Expenses.jsx        # Searchable expense ledger, filters, receipts
            ├── ExpenseFormModal.jsx# Expense entry with camera/image compression
            ├── ExpenseDetailModal.jsx # Detailed voucher view & audit trail
            ├── Approvals.jsx       # PM/Accountant multi-tier approval workflow
            ├── Reports.jsx         # Custom report builder, PDF & Excel downloads
            ├── Users.jsx           # User management
            └── Categories.jsx      # Construction category management
```

---

## 📄 License
ISC License. Built for Construction Cost Optimization.
