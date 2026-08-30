import { Response, NextFunction } from 'express';
import Settings from '../models/Settings';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import nodemailer from 'nodemailer';

// @desc    Get global integrations settings
// @route   GET /api/settings
// @access  Private (Admin only)
export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update global integrations settings
// @route   POST /api/settings
// @access  Private (Admin only)
export const updateSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const {
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromEmail,
      fromName,
      discordWebhookUrl,
      slackWebhookUrl
    } = req.body;

    settings.smtpHost = smtpHost !== undefined ? smtpHost : settings.smtpHost;
    settings.smtpPort = smtpPort !== undefined ? smtpPort : settings.smtpPort;
    settings.smtpUser = smtpUser !== undefined ? smtpUser : settings.smtpUser;
    settings.smtpPass = smtpPass !== undefined ? smtpPass : settings.smtpPass;
    settings.fromEmail = fromEmail !== undefined ? fromEmail : settings.fromEmail;
    settings.fromName = fromName !== undefined ? fromName : settings.fromName;
    settings.discordWebhookUrl = discordWebhookUrl !== undefined ? discordWebhookUrl : settings.discordWebhookUrl;
    settings.slackWebhookUrl = slackWebhookUrl !== undefined ? slackWebhookUrl : settings.slackWebhookUrl;
    settings.updatedBy = req.user?._id;

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings
    });

    createAuditLog({
      action: 'SETTINGS_UPDATE',
      targetModel: 'Settings',
      targetId: settings._id.toString(),
      details: 'Updated integration configurations for SMTP and Chat webhooks',
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Test SMTP email dispatch with unsaved settings
// @route   POST /api/settings/test-email
// @access  Private (Admin only)
export const sendTestEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, fromName } = req.body;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return next(new ErrorResponse('Please provide SMTP host, username, and password to execute test', 400));
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort || '2525', 10),
      secure: parseInt(smtpPort, 10) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false // Permissive TLS check for developer dev environment SMTP servers
      }
    });

    const mailOptions = {
      from: `"${fromName || 'Enterprise HRMS'}" <${fromEmail || 'noreply@company.com'}>`,
      to: req.user?.email || 'test@company.com',
      subject: '📄 Enterprise HRMS: SMTP Integration Test Connection',
      html: `
        <h3>SMTP Connection Verification Success!</h3>
        <p>Congratulations, your SMTP server settings are correctly configured and authenticated.</p>
        <p>Sender Name: <strong>${fromName || 'Enterprise HRMS'}</strong></p>
        <p>Sender Email: <strong>${fromEmail || 'noreply@company.com'}</strong></p>
        <br/>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({
      success: true,
      message: `Test email successfully dispatched to ${req.user?.email}`
    });
  } catch (err: any) {
    next(new ErrorResponse(`SMTP Integration test failed: ${err.message}`, 500));
  }
};

// @desc    Test Chat Webhook dispatch with unsaved settings
// @route   POST /api/settings/test-chat
// @access  Private (Admin only)
export const sendTestChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { discordWebhookUrl, slackWebhookUrl } = req.body;

  if (!discordWebhookUrl && !slackWebhookUrl) {
    return next(new ErrorResponse('Please provide a Discord or Slack webhook URL to execute test', 400));
  }

  try {
    let discordSent = false;
    let slackSent = false;

    if (discordWebhookUrl) {
      const resDiscord = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: '🔌 Integration Connection Success!',
              description: 'This is a test notification confirming your Discord Webhook configuration is active.',
              color: 3447003,
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
      if (resDiscord.ok) discordSent = true;
    }

    if (slackWebhookUrl) {
      const resSlack = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '🔌 *Slack Webhook Connection Success!*\nThis is a test notification confirming your Slack Webhook configuration is active.'
        })
      });
      if (resSlack.ok) slackSent = true;
    }

    res.status(200).json({
      success: true,
      message: 'Integration test completed.',
      discordStatus: discordSent ? 'Delivered' : 'Failed / Not Configured',
      slackStatus: slackSent ? 'Delivered' : 'Failed / Not Configured'
    });
  } catch (err: any) {
    next(new ErrorResponse(`Chat Webhook Integration test failed: ${err.message}`, 500));
  }
};
