const nodemailer = require('nodemailer');
const config = require('../config');

let transporter;

if (config.smtp.host) {
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass
    }
  });
}

const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn('[Email] SMTP not configured - email not sent');
    return { success: false, reason: 'SMTP not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: config.smtp.from,
      to,
      subject,
      html,
      text
    });
    
    console.log(`[Email] Sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed to send:', error.message);
    return { success: false, reason: error.message };
  }
};

const sendPasswordResetEmail = async (email, resetToken, firstName) => {
  const resetUrl = `${config.appUrl}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi ${firstName},</p>
      <p>You requested to reset your password for the Marks Tracking System.</p>
      <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #007bff; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">
        If you didn't request this password reset, please ignore this email.
        Your password will remain unchanged.
      </p>
    </div>
  `;

  const text = `
Hi ${firstName},

You requested to reset your password for the Marks Tracking System.

Click this link to reset your password (expires in 1 hour):
${resetUrl}

If you didn't request this password reset, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset - Marks Tracking System',
    html,
    text
  });
};

const sendVerificationEmail = async (email, verificationToken, firstName) => {
  const verifyUrl = `${config.appUrl}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Verify Your Email</h2>
      <p>Hi ${firstName},</p>
      <p>Welcome to the Marks Tracking System! Please verify your email address to complete your registration.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" 
           style="background-color: #28a745; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">
        This verification link will expire in 24 hours.
        If you didn't create an account, please ignore this email.
      </p>
    </div>
  `;

  const text = `
Hi ${firstName},

Welcome to the Marks Tracking System! Please verify your email address.

Click this link to verify your email (expires in 24 hours):
${verifyUrl}

If you didn't create an account, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: 'Verify Your Email - Marks Tracking System',
    html,
    text
  });
};

const sendInvitationEmail = async (email, invitationToken, role, inviterName) => {
  const inviteUrl = `${config.appUrl}/accept-invitation.html?token=${invitationToken}`;
  
  const roleText = role === 'admin' ? 'an Administrator' : role === 'teacher' ? 'a Teacher' : 'a Parent';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You're Invited!</h2>
      <p>Hello,</p>
      <p>${inviterName} has invited you to join the Marks Tracking System as ${roleText}.</p>
      <p>Click the button below to accept the invitation and create your account. This link will expire in 7 days.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" 
           style="background-color: #28a745; color: white; padding: 12px 30px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${inviteUrl}</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">
        If you didn't expect this invitation, please ignore this email.
      </p>
    </div>
  `;

  const text = `
Hello,

${inviterName} has invited you to join the Marks Tracking System as ${roleText}.

Click this link to accept the invitation (expires in 7 days):
${inviteUrl}

If you didn't expect this invitation, please ignore this email.
  `;

  return sendEmail({
    to: email,
    subject: `You're Invited to Join Marks Tracking System`,
    html,
    text
  });
};

const verifyConnection = async () => {
  if (!transporter) {
    return { connected: false, reason: 'SMTP not configured' };
  }
  
  try {
    await transporter.verify();
    return { connected: true };
  } catch (error) {
    return { connected: false, reason: error.message };
  }
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendInvitationEmail,
  verifyConnection
};
