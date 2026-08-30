import mongoose, { Schema, Document } from 'mongoose';

export interface IShift extends Document {
  employee: mongoose.Types.ObjectId;
  title: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  color?: string;
  scheduledBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShiftSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    notes: { type: String, default: '' },
    color: { type: String, default: 'indigo' },
    scheduledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true
  }
);

// Optimize conflict check queries by indexing employee and shift intervals
ShiftSchema.index({ employee: 1, startTime: 1, endTime: 1 });

export default mongoose.model<IShift>('Shift', ShiftSchema);
