import mongoose, { Schema, Document } from 'mongoose';

export interface IGrievance extends Document {
  employee?: mongoose.Types.ObjectId; // Optional for anonymous submissions
  isAnonymous: boolean;
  title: string;
  description: string;
  status: 'Pending' | 'Reviewing' | 'Resolved';
  response?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GrievanceSchema: Schema<IGrievance> = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    isAnonymous: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      required: [true, 'Please provide grievance title'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please provide grievance description details'],
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Reviewing', 'Resolved'],
      default: 'Pending'
    },
    response: {
      type: String,
      trim: true
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Performance indexes
GrievanceSchema.index({ employee: 1 });
GrievanceSchema.index({ isAnonymous: 1 });
GrievanceSchema.index({ status: 1 });

const Grievance = mongoose.model<IGrievance>('Grievance', GrievanceSchema);
export default Grievance;
