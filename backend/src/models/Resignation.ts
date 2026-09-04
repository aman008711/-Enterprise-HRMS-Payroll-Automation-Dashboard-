import mongoose, { Schema, Document } from 'mongoose';

export interface IResignation extends Document {
  employee: mongoose.Types.ObjectId;
  proposedLastWorkingDay: Date;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  feedback?: string;
  processedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResignationSchema: Schema<IResignation> = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Resignation must be linked to an employee'],
      unique: true // Prevent multiple pending/approved resignation entries per employee
    },
    proposedLastWorkingDay: {
      type: Date,
      required: [true, 'Please provide proposed last working day']
    },
    reason: {
      type: String,
      required: [true, 'Please provide reason for resignation'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    feedback: {
      type: String,
      trim: true
    },
    processedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Performance indexes
ResignationSchema.index({ status: 1 });

const Resignation = mongoose.model<IResignation>('Resignation', ResignationSchema);
export default Resignation;
