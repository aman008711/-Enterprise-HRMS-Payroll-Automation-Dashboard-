import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  employee: mongoose.Types.ObjectId;
  title: string;
  category: 'Travel' | 'Medical' | 'Hardware' | 'Other';
  amount: number;
  description?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Paid';
  approvedBy?: mongoose.Types.ObjectId;
  processedInPayroll?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema: Schema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Please associate an employee profile']
    },
    title: {
      type: String,
      required: [true, 'Please provide an expense claim title'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Please specify an expense category'],
      enum: ['Travel', 'Medical', 'Hardware', 'Other']
    },
    amount: {
      type: Number,
      required: [true, 'Please specify the expense amount'],
      min: [1, 'Expense amount must be at least $1']
    },
    description: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending'
    },
    paymentStatus: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid'
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee'
    },
    processedInPayroll: {
      type: Schema.Types.ObjectId,
      ref: 'Payroll'
    }
  },
  {
    timestamps: true
  }
);

// Indexing for query speed
ExpenseSchema.index({ employee: 1, status: 1 });
ExpenseSchema.index({ paymentStatus: 1 });

export default mongoose.model<IExpense>('Expense', ExpenseSchema);
