import db from '../config/database.js';

/**
 * Universal Audit Logging Helper
 * Records actions strictly for Super Admin monitoring and compliance
 */
export async function logAudit(req, { action, entityType, entityId = null, details = null }) {
  try {
    const user = req?.user || null;
    // Capped to the column size: an over-long value would make the insert fail and lose the entry
    const ip = (req?.ip || '127.0.0.1').slice(0, 45);
    const userAgent = req?.headers?.['user-agent'] || null;
    const detailsStr = details
      ? typeof details === 'object'
        ? JSON.stringify(details)
        : String(details)
      : null;

    await db.execute(
      `INSERT INTO audit_logs (
        user_id, user_name, user_email, user_role,
        action, entity_type, entity_id, ip_address, user_agent, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user?.id || null,
        user?.name || (user ? 'Unknown' : 'System'),
        user?.email || null,
        user?.role || null,
        action,
        entityType,
        entityId ? String(entityId) : null,
        ip,
        userAgent ? userAgent.slice(0, 255) : null,
        detailsStr,
      ]
    );
  } catch (err) {
    console.error('[Audit Logger Error]', err.message);
  }
}
