import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
  employee: mongoose.Types.ObjectId;
  type: 'Sick' | 'Vacation' | 'Personal' | 'Maternity' | 'Paternity';
  startDate: Date;
  endDate: Date;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approver?: mongoose.Types.ObjectId;
  comments?: string;
}

const LeaveRequestSchema: Schema<ILeaveRequest> = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Please specify the requesting employee']
    },
    type: {
      type: String,
      enum: ['Sick', 'Vacation', 'Personal', 'Maternity', 'Paternity'],
      required: [true, 'Please specify the type of leave']
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify the starting date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please specify the ending date']
    },
    reason: {
      type: String,
      required: [true, 'Please provide the reason for leave request'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    approver: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    comments: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Optimize indexes for dashboard queue queries and employee histories
LeaveRequestSchema.index({ employee: 1 });
LeaveRequestSchema.index({ status: 1 });

const LeaveRequest = mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);

export default LeaveRequest;
