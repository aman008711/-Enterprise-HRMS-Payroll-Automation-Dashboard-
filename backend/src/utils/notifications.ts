import nodemailer from 'nodemailer';
import Settings from '../models/Settings';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

interface ChatField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color?: number;
  fields?: ChatField[];
  timestamp?: string;
}

// Native Node.js POST request sender to avoid fetch compatibility issues on older Node versions
const postRequest = (urlStr: string, payload: any): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const postData = JSON.stringify(payload);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        (res) => {
          resolve(!!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300));
        }
      );

      req.on('error', (err) => {
        console.error(`Post request to ${urlStr} failed:`, err);
        resolve(false);
      });

      req.write(postData);
      req.end();
    } catch (err) {
      console.error(`Invalid URL or post request failed:`, err);
      resolve(false);
    }
  });
};

// Helper: Query settings from database with safety fallback
const getMergedSettings = async (): Promise<any> => {
  try {
    const dbConfig = await Settings.findOne().lean();
    return dbConfig || {};
  } catch (err) {
    return {};
  }
};

// 1. Centralized Email sender via SMTP (Nodemailer)
export const sendEmail = async (options: SendEmailOptions): Promise<boolean> => {
  const { to, subject, html, attachments } = options;

  const config = await getMergedSettings();

  const host = config.smtpHost || process.env.SMTP_HOST;
  const port = parseInt(String(config.smtpPort || process.env.SMTP_PORT || '2525'), 10);
  const user = config.smtpUser || process.env.SMTP_USER;
  const pass = config.smtpPass || process.env.SMTP_PASS;
  const fromEmail = config.fromEmail || process.env.FROM_EMAIL || 'noreply@company.com';
  const fromName = config.fromName || process.env.FROM_NAME || 'Enterprise HRMS';

  // Fallback if SMTP parameters are missing
  if (!host || !user || !pass) {
    console.log('\n=================== SMTP EMAIL SIMULATOR ===================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`From:    "${fromName}" <${fromEmail}>`);
    console.log(`Has Attachments: ${attachments && attachments.length > 0 ? 'Yes' : 'No'}`);
    console.log('--- Body (HTML) ---');
    console.log(html);
    console.log('============================================================\n');
    return true;
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false // Permissive TLS check for developer dev environment SMTP servers
      }
    });

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      attachments
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email successfully dispatched via SMTP (MessageID: ${info.messageId})`);
    return true;
  } catch (err) {
    console.error('SMTP Email dispatch failed:', err);
    return false;
  }
};

// 2. Centralized Chat sender via Webhook (Discord / Slack)
export const sendChatNotification = async (embed: DiscordEmbed): Promise<boolean> => {
  const config = await getMergedSettings();

  const discordUrl = config.discordWebhookUrl || process.env.DISCORD_WEBHOOK_URL;
  const slackUrl = config.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;

  // Compile standard payload
  const discordPayload = {
    embeds: [
      {
        ...embed,
        color: embed.color || 5793266, // Default brand purple
        timestamp: embed.timestamp || new Date().toISOString()
      }
    ]
  };

  // Log to console if no webhooks are configured
  if (!discordUrl && !slackUrl) {
    console.log('\n================= CHAT WEBHOOK SIMULATOR =================');
    console.log(`Title:       ${embed.title}`);
    console.log(`Description: ${embed.description}`);
    if (embed.fields) {
      console.log('Fields:');
      embed.fields.forEach((f) => console.log(`  - ${f.name}: ${f.value}`));
    }
    console.log('==========================================================\n');
    return true;
  }

  let success = false;

  // Fire Discord Webhook
  if (discordUrl) {
    const ok = await postRequest(discordUrl, discordPayload);
    if (ok) success = true;
  }

  // Fire Slack Webhook (Fallback formatting)
  if (slackUrl) {
    const slackPayload = {
      text: `*${embed.title}*\n${embed.description}\n` + 
        (embed.fields ? embed.fields.map(f => `>${f.name}: ${f.value}`).join('\n') : '')
    };
    const ok = await postRequest(slackUrl, slackPayload);
    if (ok) success = true;
  }

  return success;
};
