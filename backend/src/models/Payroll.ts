import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  employee: mongoose.Types.ObjectId;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'Unpaid' | 'Paid';
  paymentDate?: Date;
  paymentMethod: 'Bank Transfer' | 'Cheque' | 'Cash';
}

const PayrollSchema: Schema<IPayroll> = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Please specify the employee']
    },
    payPeriodStart: {
      type: Date,
      required: [true, 'Please specify the starting date of the pay period']
    },
    payPeriodEnd: {
      type: Date,
      required: [true, 'Please specify the ending date of the pay period']
    },
    baseSalary: {
      type: Number,
      required: [true, 'Please specify the base salary'],
      min: [0, 'Base salary cannot be negative']
    },
    allowances: {
      type: Number,
      default: 0,
      min: [0, 'Allowances cannot be negative']
    },
    deductions: {
      type: Number,
      default: 0,
      min: [0, 'Deductions cannot be negative']
    },
    netSalary: {
      type: Number,
      required: [true, 'Net salary is required'],
      min: [0, 'Net salary cannot be negative']
    },
    status: {
      type: String,
      enum: ['Unpaid', 'Paid'],
      default: 'Unpaid'
    },
    paymentDate: {
      type: Date
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'Cheque', 'Cash'],
      default: 'Bank Transfer'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save validation hook to calculate net salary automatically
PayrollSchema.pre<IPayroll>('validate', function (next) {
  const calculated = this.baseSalary + this.allowances - this.deductions;
  this.netSalary = calculated < 0 ? 0 : calculated;
  next();
});

// Indexes for rapid filtering
PayrollSchema.index({ employee: 1 });
PayrollSchema.index({ payPeriodStart: 1, payPeriodEnd: 1 });

const Payroll = mongoose.model<IPayroll>('Payroll', PayrollSchema);

export default Payroll;
