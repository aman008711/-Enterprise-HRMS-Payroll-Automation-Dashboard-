import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto';

export interface IEmployee extends Document {
  user: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  employeeId: string;
  phone?: string;
  jobTitle: string;
  department: mongoose.Types.ObjectId;
  manager?: mongoose.Types.ObjectId;
  status: 'Active' | 'On Leave' | 'Terminated';
  hireDate: Date;
}

const EmployeeSchema: Schema<IEmployee> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide an associated user credentials account'],
      unique: true
    },
    firstName: {
      type: String,
      required: [true, 'Please provide employee first name'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Please provide employee last name'],
      trim: true
    },
    employeeId: {
      type: String,
      required: [true, 'Please provide unique employee ID'],
      unique: true,
      uppercase: true,
      trim: true
    },
    phone: {
      type: String,
      trim: true,
      get: decrypt,
      set: encrypt
    },
    jobTitle: {
      type: String,
      required: [true, 'Please provide employee job title'],
      trim: true
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Please assign a department']
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'Employee' // Self reference to Employee
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Terminated'],
      default: 'Active'
    },
    hireDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Optimize indexes for relational joins and aggregate lookups
EmployeeSchema.index({ employeeId: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ manager: 1 });

const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
