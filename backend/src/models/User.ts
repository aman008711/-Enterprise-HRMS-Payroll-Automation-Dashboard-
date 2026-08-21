import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define Document structure
export interface IUser extends Document {
  email: string;
  password?: string;
  role: 'Admin' | 'HR Manager' | 'Employee';
  matchPassword(enteredPassword: string): Promise<boolean>;
}

// Define User Schema
const UserSchema: Schema<IUser> = new Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address'
      ]
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Ensure password isn't returned in queries by default
    },
    role: {
      type: String,
      enum: ['Admin', 'HR Manager', 'Employee'],
      default: 'Employee'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to hash password using bcryptjs
UserSchema.pre<IUser>('save', async function (next) {
  // Only hash password if it has been modified or is new
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password!, salt);
    next();
  } catch (err: any) {
    next(err);
  }
});

// Compare password instance method
UserSchema.methods.matchPassword = async function (enteredPassword: string): Promise<boolean> {
  // Since password has select: false, when comparing we must verify we have the hash
  return await bcrypt.compare(enteredPassword, this.password || '');
};

const User = mongoose.model<IUser>('User', UserSchema);

export default User;
