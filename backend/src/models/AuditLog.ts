import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  user?: mongoose.Types.ObjectId;
  action: string;
  targetModel?: string;
  targetId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema<IAuditLog> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      required: [true, 'Action type is required'],
      index: true
    },
    targetModel: {
      type: String
    },
    targetId: {
      type: String
    },
    details: {
      type: String
    },
    ipAddress: {
      type: String
    },
    userAgent: {
      type: String
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false } // Audit logs are read-only write-once records
  }
);

// Performance indices
AuditLogSchema.index({ user: 1 });
AuditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
