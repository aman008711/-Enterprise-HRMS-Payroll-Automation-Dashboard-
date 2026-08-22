import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  code: string;
  manager?: mongoose.Types.ObjectId;
}

const DepartmentSchema: Schema<IDepartment> = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a department name'],
      unique: true,
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Please provide a department code'],
      unique: true,
      uppercase: true,
      trim: true
    },
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'Employee' // Reference pointing to the Employee model (defined next)
    }
  },
  {
    timestamps: true
  }
);

const Department = mongoose.model<IDepartment>('Department', DepartmentSchema);

export default Department;
