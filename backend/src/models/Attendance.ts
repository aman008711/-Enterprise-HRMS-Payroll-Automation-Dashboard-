import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  dateString: string; // YYYY-MM-DD format
  clockIn?: Date;
  clockOut?: Date;
  status: 'On Time' | 'Late' | 'Half Day' | 'Absent';
  clockInLat?: number;
  clockInLon?: number;
  clockOutLat?: number;
  clockOutLon?: number;
  clockInIp?: string;
  clockOutIp?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema: Schema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Please associate an employee profile']
    },
    dateString: {
      type: String,
      required: true
    },
    clockIn: {
      type: Date
    },
    clockOut: {
      type: Date
    },
    status: {
      type: String,
      enum: ['On Time', 'Late', 'Half Day', 'Absent'],
      default: 'Absent'
    },
    clockInLat: { type: Number },
    clockInLon: { type: Number },
    clockOutLat: { type: Number },
    clockOutLon: { type: Number },
    clockInIp: { type: String },
    clockOutIp: { type: String }
  },
  {
    timestamps: true
  }
);

// Create compound index for single record per employee per day
AttendanceSchema.index({ employee: 1, dateString: 1 }, { unique: true });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
