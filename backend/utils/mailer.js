const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendResetEmail(toEmail, fullName, resetLink) {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER / EMAIL_PASS not set in .env — skipping real email send.');
    console.log(`[DEV] Password reset link for ${toEmail}: ${resetLink}`);
    return;
  }

  const mailOptions = {
    from: `"Mero Planner" <${fromAddress}>`,
    to: toEmail,
    subject: 'Reset your Mero Planner password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#c0392b;">Mero Planner</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>We received a request to reset the password for your Mero Planner account.
           Click the button below to choose a new one. This link expires in 30 minutes.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${resetLink}"
             style="background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;
                    text-decoration:none;font-weight:600;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
        <p style="color:#999;font-size:12px;word-break:break-all;">${resetLink}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
  
    console.error('Failed to send reset email:', err.message);
    console.log(`[DEV FALLBACK] Password reset link for ${toEmail}: ${resetLink}`);
  }
}

async function sendVerificationEmail(toEmail, fullName, verifyLink) {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER / EMAIL_PASS not set in .env — skipping real email send.');
    console.log(`[DEV] Email verification link for ${toEmail}: ${verifyLink}`);
    return;
  }

  const mailOptions = {
    from: `"Mero Planner" <${fromAddress}>`,
    to: toEmail,
    subject: 'Verify your Mero Planner account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#c0392b;">Mero Planner</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>Thanks for creating an account. Click the button below to verify your email
           and activate your account. This link expires in 24 hours.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${verifyLink}"
             style="background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;
                    text-decoration:none;font-weight:600;display:inline-block;">
            Verify Email
          </a>
        </p>
        <p>If you didn't create this account, you can safely ignore this email.</p>
        <p style="color:#999;font-size:12px;word-break:break-all;">${verifyLink}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send verification email:', err.message);
    console.log(`[DEV FALLBACK] Email verification link for ${toEmail}: ${verifyLink}`);
  }
}

async function sendAccountDeletionEmail(toEmail, fullName, confirmLink) {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER / EMAIL_PASS not set in .env — skipping real email send.');
    console.log(`[DEV] Account deletion confirmation link for ${toEmail}: ${confirmLink}`);
    return;
  }

  const mailOptions = {
    from: `"Mero Planner" <${fromAddress}>`,
    to: toEmail,
    subject: 'Confirm deletion of your Mero Planner account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#c0392b;">Mero Planner</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>We received a request to permanently delete your Mero Planner account. This will
           remove your events, guests, budgets, bookings, and all other account data.
           This action cannot be undone.</p>
        <p>If you want to proceed, click the button below. This link expires in 15 minutes.</p>
        <p style="text-align:center; margin: 28px 0;">
          <a href="${confirmLink}"
             style="background:#c0392b;color:#fff;padding:12px 24px;border-radius:8px;
                    text-decoration:none;font-weight:600;display:inline-block;">
            Permanently Delete My Account
          </a>
        </p>
        <p>If you didn't request this, you can safely ignore this email — your account is safe
           and no changes will be made.</p>
        <p style="color:#999;font-size:12px;word-break:break-all;">${confirmLink}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send account deletion email:', err.message);
    console.log(`[DEV FALLBACK] Account deletion confirmation link for ${toEmail}: ${confirmLink}`);
  }
}

async function sendCollaborationInviteEmail(toEmail, fullName, eventName, inviterName) {
  const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER / EMAIL_PASS not set in .env — skipping real email send.');
    console.log(`[DEV] ${inviterName} invited ${toEmail} to collaborate on "${eventName}"`);
    return;
  }

  const mailOptions = {
    from: `"Mero Planner" <${fromAddress}>`,
    to: toEmail,
    subject: `${inviterName} invited you to collaborate on "${eventName}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#c0392b;">Mero Planner</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p><strong>${inviterName}</strong> has invited you to collaborate on
           <strong>"${eventName}"</strong> on Mero Planner.</p>
        <p>Log in to Mero Planner to accept or decline the invitation.</p>
        <p style="color:#999;font-size:12px;">If you weren't expecting this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('Failed to send collaboration invite email:', err.message);
    console.log(`[DEV FALLBACK] ${inviterName} invited ${toEmail} to collaborate on "${eventName}"`);
  }
}

module.exports = { sendResetEmail, sendVerificationEmail, sendCollaborationInviteEmail, sendAccountDeletionEmail };
