import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_secret_construction_expense_tracker_2026_xyz',
  
  // Database configuration
  // For Hostinger Cloud: set DB_CLIENT=mysql, DB_HOST=127.0.0.1
  DB_CLIENT: process.env.DB_CLIENT || (process.env.DB_USER ? 'mysql' : 'sqlite'),
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: Number(process.env.DB_PORT) || 3306,
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'expense_tracker',

  // Initial Super Admin Setup (Used when database is initialized)
  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || 'admin@construction.com',
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123',
  INITIAL_ADMIN_NAME: process.env.INITIAL_ADMIN_NAME || 'Super Admin',
  INITIAL_ADMIN_PHONE: process.env.INITIAL_ADMIN_PHONE || '+91 98765 43210',

  // Uploads
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/receipts',

  // Client URL for CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production. Add it to the environment variables in hPanel.');
}
