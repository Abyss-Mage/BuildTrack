import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Unset counts as production so a missed setting can never unlock the dev-only defaults below
const NODE_ENV = process.env.NODE_ENV || 'production';
const isDev = NODE_ENV === 'development';

export const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET || (isDev ? 'dev_secret_construction_expense_tracker_2026_xyz' : ''),

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
  // Dev-only default; otherwise an unset value makes the init script generate a one-time password
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || (isDev ? 'Admin@123' : ''),
  INITIAL_ADMIN_NAME: process.env.INITIAL_ADMIN_NAME || 'Super Admin',
  INITIAL_ADMIN_PHONE: process.env.INITIAL_ADMIN_PHONE || '+91 98765 43210',

  // Uploads
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB) || 10,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/receipts',

  // WhatsApp Business Cloud API (bulk wage notifications)
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN || '',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_TEMPLATE_NAME: process.env.WHATSAPP_TEMPLATE_NAME || '',
  WHATSAPP_TEMPLATE_LANG: process.env.WHATSAPP_TEMPLATE_LANG || 'en',

  // Client URL for CORS
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production. Add it to the environment variables in hPanel.');
}
