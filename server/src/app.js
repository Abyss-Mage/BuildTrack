import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import approvalsRoutes from './modules/approvals/approvals.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import payrollRoutes from './modules/payroll/payroll.routes.js';
import advancesRoutes from './modules/advances/advances.routes.js';
import purchaseRequisitionsRoutes from './modules/purchaseRequisitions/purchaseRequisitions.routes.js';
import wageSheetsRoutes from './modules/wageSheets/wageSheets.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// Trust reverse proxies (ngrok, Hostinger Nginx, Cloudflare)
app.set('trust proxy', 1);

// Security Headers (relaxed CSP for embedded charts/images)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Request body parsers
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../uploads/receipts');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded receipts publicly
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Rate Limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000, // Per IP, and a whole office shares one
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

app.use('/api/auth/login', authLimiter);
app.use('/api', apiLimiter);

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount Module Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/advances', advancesRoutes);
app.use('/api/purchase-requisitions', purchaseRequisitionsRoutes);
app.use('/api/wage-sheets', wageSheetsRoutes);

// In production, serve the built React client
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Centralized error handling
app.use(errorHandler);
