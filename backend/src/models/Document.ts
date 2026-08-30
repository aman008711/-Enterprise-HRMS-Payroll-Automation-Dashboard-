import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  employee: mongoose.Types.ObjectId;
  title: string;
  category: 'NDA' | 'Employment Contract' | 'Tax Form' | 'Identification' | 'Other';
  status: 'Pending Signature' | 'Signed' | 'Submitted' | 'Approved' | 'Rejected';
  content?: string;
  fileUrl?: string;
  needsSignature: boolean;
  signedAt?: Date;
  signatureName?: string;
  signatureIp?: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema: Schema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['NDA', 'Employment Contract', 'Tax Form', 'Identification', 'Other'],
      required: true
    },
    status: {
      type: String,
      enum: ['Pending Signature', 'Signed', 'Submitted', 'Approved', 'Rejected'],
      default: 'Submitted'
    },
    content: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    needsSignature: { type: Boolean, default: false },
    signedAt: { type: Date },
    signatureName: { type: String, default: '' },
    signatureIp: { type: String, default: '' },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true
  }
);

DocumentSchema.index({ employee: 1, status: 1 });

export default mongoose.model<IDocument>('Document', DocumentSchema);
