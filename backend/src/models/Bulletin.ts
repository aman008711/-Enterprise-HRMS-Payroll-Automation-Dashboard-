import mongoose, { Schema, Document } from 'mongoose';

export interface IBulletin extends Document {
  title: string;
  content: string;
  priority: 'Low' | 'Medium' | 'High';
  expiryDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BulletinSchema: Schema<IBulletin> = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide bulletin title'],
      trim: true
    },
    content: {
      type: String,
      required: [true, 'Please provide bulletin content'],
      trim: true
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please specify expiry date']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Optimize sorting for expiration and priorities
BulletinSchema.index({ expiryDate: 1 });
BulletinSchema.index({ createdAt: -1 });

const Bulletin = mongoose.model<IBulletin>('Bulletin', BulletinSchema);
export default Bulletin;
