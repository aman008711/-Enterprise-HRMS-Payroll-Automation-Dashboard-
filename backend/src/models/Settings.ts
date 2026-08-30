import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
  fromName?: string;
  discordWebhookUrl?: string;
  slackWebhookUrl?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema(
  {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 2525 },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    fromEmail: { type: String, default: 'noreply@company.com' },
    fromName: { type: String, default: 'Enterprise HRMS' },
    discordWebhookUrl: { type: String, default: '' },
    slackWebhookUrl: { type: String, default: '' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  {
    timestamps: true
  }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
