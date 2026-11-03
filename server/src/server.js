import { app } from './app.js';
import { env } from './config/env.js';
import db from './config/database.js';
import { initializeDatabase } from './database/init.js';

async function startServer() {
  try {
    // Ensure database tables and initial seeds exist
    await initializeDatabase();

    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`Construction Expense Tracker API`);
      console.log(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
      console.log(`Database engine: ${db.getClientType().toUpperCase()}`);
      console.log(`Uploads hosted at: /uploads/receipts`);
      console.log(`====================================================`);
    });

    const gracefulShutdown = async (signal) => {
      console.log(`[Server] ${signal} signal received: closing HTTP server...`);
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        await db.close();
        console.log('[Server] Database pool closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    console.error('[Server Start Failure]', err);
    process.exit(1);
  }
}

startServer();
