import mongoose, { Schema, Document } from 'mongoose';
import { encrypt, decrypt } from '../utils/crypto';

export interface IEmployee extends Document {
  user: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  employeeId: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
  bio?: string;
  skills?: string[];
  linkedin?: string;
  dateOfBirth?: Date;
  jobTitle: string;
  department: mongoose.Types.ObjectId;
  manager?: mongoose.Types.ObjectId;
  status: 'Active' | 'On Leave' | 'Terminated';
  baseSalary: number;
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
    address: {
      type: String,
      trim: true
    },
    emergencyContact: {
      type: String,
      trim: true
    },
    bio: {
      type: String,
      trim: true
    },
    skills: {
      type: [String],
      default: []
    },
    linkedin: {
      type: String,
      trim: true
    },
    dateOfBirth: {
      type: Date
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
    baseSalary: {
      type: Number,
      default: 0,
      min: [0, 'Base salary cannot be negative']
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
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ manager: 1 });

const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);

export default Employee;
