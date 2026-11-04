import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mysqlPool = null;
let sqliteDb = null;
let activeClient = env.DB_CLIENT;

// Ensure local data directory exists for SQLite
const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database connection
if (activeClient === 'mysql' && env.DB_USER) {
  try {
    mysqlPool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      timezone: '+05:30',
      dateStrings: true,
    });
    console.log(`[Database] MySQL pool created targeting ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  } catch (err) {
    console.warn('[Database] Failed to initialize MySQL pool, falling back to SQLite:', err.message);
    activeClient = 'sqlite';
  }
} else {
  activeClient = 'sqlite';
}

if (activeClient === 'sqlite') {
  const sqliteFile = path.join(dataDir, 'app.sqlite');
  // Loaded lazily: node:sqlite requires Node 22.5+, and MySQL deployments must not depend on it
  const { DatabaseSync } = await import('node:sqlite');
  sqliteDb = new DatabaseSync(sqliteFile);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log(`[Database] Using SQLite storage at ${sqliteFile}`);
}

/**
 * Universal Database Wrapper
 */
export const db = {
  getClientType: () => activeClient,

  /**
   * Execute arbitrary SQL query
   */
  async query(sql, params = []) {
    if (activeClient === 'mysql' && mysqlPool) {
      try {
        const [result] = await mysqlPool.query(sql, params);
        return result;
      } catch (err) {
        console.error('[MySQL Error]', sql, params, err.message);
        throw err;
      }
    } else {
      try {
        const trimmed = sql.trim();
        const isSelect = /^SELECT|^PRAGMA|^SHOW/i.test(trimmed);
        const stmt = sqliteDb.prepare(sql);

        if (isSelect) {
          return stmt.all(...params);
        } else {
          const info = stmt.run(...params);
          return {
            insertId: Number(info.lastInsertRowid),
            affectedRows: info.changes,
          };
        }
      } catch (err) {
        console.error('[SQLite Error]', sql, params, err.message);
        throw err;
      }
    }
  },

  /**
   * Fetch a single row (or null)
   */
  async getOne(sql, params = []) {
    const rows = await this.getAll(sql, params);
    return rows && rows.length > 0 ? rows[0] : null;
  },

  /**
   * Fetch multiple rows
   */
  async getAll(sql, params = []) {
    if (activeClient === 'mysql' && mysqlPool) {
      const [rows] = await mysqlPool.query(sql, params);
      return Array.isArray(rows) ? rows : [];
    } else {
      const stmt = sqliteDb.prepare(sql);
      const rows = stmt.all(...params);
      return Array.isArray(rows) ? rows : [];
    }
  },

  /**
   * Execute an INSERT and return the inserted primary key ID
   */
  async insert(sql, params = []) {
    if (activeClient === 'mysql' && mysqlPool) {
      const [result] = await mysqlPool.query(sql, params);
      return result.insertId;
    } else {
      const stmt = sqliteDb.prepare(sql);
      const info = stmt.run(...params);
      return Number(info.lastInsertRowid);
    }
  },

  /**
   * Execute an UPDATE/DELETE and return the number of affected rows
   */
  async execute(sql, params = []) {
    if (activeClient === 'mysql' && mysqlPool) {
      const [result] = await mysqlPool.query(sql, params);
      return result.affectedRows;
    } else {
      const stmt = sqliteDb.prepare(sql);
      const info = stmt.run(...params);
      return info.changes;
    }
  },

  /**
   * Execute raw multi-statement SQL (e.g. migration / DDL script)
   */
  async exec(sql) {
    if (activeClient === 'mysql' && mysqlPool) {
      // Execute statement by statement
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const statement of statements) {
        await mysqlPool.query(statement);
      }
    } else {
      sqliteDb.exec(sql);
    }
  },

  /**
   * Close connections gracefully
   */
  async close() {
    if (mysqlPool) {
      await mysqlPool.end();
    }
    if (sqliteDb) {
      sqliteDb.close();
    }
  },
};

export default db;
