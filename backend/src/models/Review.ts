import mongoose, { Schema, Document } from 'mongoose';

export interface IReview extends Document {
  employee: mongoose.Types.ObjectId;
  quarter: string;
  selfGoals: string;
  selfComments?: string;
  managerComments?: string;
  rating?: number;
  status: 'Draft' | 'Self-Submitted' | 'Manager-Reviewed' | 'Approved';
  raisePercentage: number;
  raiseApplied: boolean;
  reviewedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    quarter: { type: String, required: true },
    selfGoals: { type: String, required: true },
    selfComments: { type: String, default: '' },
    managerComments: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5 },
    status: {
      type: String,
      enum: ['Draft', 'Self-Submitted', 'Manager-Reviewed', 'Approved'],
      default: 'Draft'
    },
    raisePercentage: { type: Number, default: 0 },
    raiseApplied: { type: Boolean, default: false },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

// Ensure only one appraisal record exists per employee per quarter
ReviewSchema.index({ employee: 1, quarter: 1 }, { unique: true });

export default mongoose.model<IReview>('Review', ReviewSchema);
