import { Request } from 'express';
import AuditLog from '../models/AuditLog';

interface AuditLogOptions {
  userId?: any;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  req?: Request;
}

// Global logger helper for security and operational audit trails
export const createAuditLog = async (options: AuditLogOptions): Promise<void> => {
  try {
    const { userId, action, targetModel, targetId, details, req } = options;

    // Retrieve IP safely supporting reverse proxies
    const ipAddress = req 
      ? req.headers['x-forwarded-for'] as string || req.ip || req.socket.remoteAddress 
      : undefined;

    await AuditLog.create({
      user: userId || (req as any)?.user?._id,
      action,
      targetModel,
      targetId,
      details,
      ipAddress,
      userAgent: req ? req.get('User-Agent') : undefined
    });
  } catch (err) {
    // Avoid interrupting critical request flows if audit logger fails
    console.error('Audit Log failed to write:', err);
  }
};
