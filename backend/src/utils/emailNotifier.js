import { createCheckInAccessToken } from './checkinAccess.js';

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!local || !domain) return '<invalid-email>';
  return `${local.slice(0, 2)}***@${domain}`;
}

function classifySmtpError(error) {
  const code = String(error?.code || '').toUpperCase();
  const responseCode = Number(error?.responseCode || 0);
  if (code.includes('AUTH') || responseCode === 535 || responseCode === 534) return 'authentication';
  if (code.includes('ECONN') || code.includes('ETIMEDOUT') || code.includes('ENOTFOUND')) return 'connection';
  if (responseCode >= 400 && responseCode < 500) return 'smtp-client';
  if (responseCode >= 500) return 'smtp-server';
  return 'unknown';
}

function getSmtpConfig() {
  const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((name) => !String(process.env[name] || '').trim());
  if (missing.length) {
    return { error: 'SMTP credentials are not configured.', missing };
  }

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
}

async function createVerifiedTransporter() {
  const config = getSmtpConfig();
  if (config.error) return config;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  try {
    await transporter.verify();
    return { transporter, from: config.from };
  } catch (error) {
    return {
      error: 'SMTP connection or authentication failed.',
      category: classifySmtpError(error),
    };
  }
}

export async function verifyEmailTransport() {
  const result = await createVerifiedTransporter();
  if (result.error) {
    console.error(`[CHECK-IN EMAIL] SMTP verification failed: category=${result.category || 'configuration'} error=${result.error}`);
    return { success: false, error: result.error, category: result.category || 'configuration' };
  }

  console.log('[CHECK-IN EMAIL] SMTP transporter verified successfully.');
  return { success: true };
}

/** Send the reservation-specific guest check-in link. */
export async function sendCheckInEmail({ guestEmail, guestName, guestId, reservationId, roomId, checkInDate }) {
  const recipient = maskEmail(guestEmail);
  console.log(`[CHECK-IN EMAIL] send attempted recipient=${recipient} reservation=${reservationId}`);

  try {
    const normalizedEmail = String(guestEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const error = 'Guest email address is missing or invalid.';
      console.error(`[CHECK-IN EMAIL] failed recipient=${recipient} category=invalid-recipient error=${error}`);
      return { success: false, emailSent: false, error, category: 'invalid-recipient' };
    }

    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const checkInToken = createCheckInAccessToken({
      reservationId,
      guestId,
    });
    const checkInUrl = `${appBaseUrl.replace(/\/$/, '')}/checkin?resId=${reservationId}&token=${encodeURIComponent(checkInToken)}`;

    const smtp = await createVerifiedTransporter();
    if (smtp.error) {
      console.error(`[CHECK-IN EMAIL] failed recipient=${maskEmail(normalizedEmail)} category=${smtp.category || 'configuration'} error=${smtp.error}`);
      return { success: false, emailSent: false, checkInUrl, error: smtp.error, category: smtp.category || 'configuration' };
    }

    const mailInfo = await smtp.transporter.sendMail({
          from: `"InnKeeper Motel Front Desk" <${smtp.from}>`,
          to: normalizedEmail,
          subject: `Complete Your Express Room Check-In (Reservation #${reservationId})`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
                <h2 style="color: #059669; margin-top: 0;">Welcome to InnKeeper Motel!</h2>
                <p>Hello <strong>${guestName}</strong>,</p>
                <p>Complete your Driving Licence verification, Razorpay payment, and check-in to receive your digital room key.</p>
                <div style="background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Reservation ID:</strong> #${reservationId}</p>
                  <p style="margin: 4px 0;"><strong>Room Assigned:</strong> Room #${roomId || 101}</p>
                  <p style="margin: 4px 0;"><strong>Check-In Date:</strong> ${new Date(checkInDate).toLocaleDateString()}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${checkInUrl}" style="background-color: #059669; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Complete Express Check-In Now &rarr;
                  </a>
                </div>
                <p style="font-size: 12px; color: #64748b; text-align: center;">If you did not request this booking, please contact front desk support.</p>
              </div>
            </div>
          `,
    });

    console.log(`[CHECK-IN EMAIL] sent recipient=${maskEmail(normalizedEmail)} reservation=${reservationId} messageId=${mailInfo.messageId}`);
    return { success: true, emailSent: true, email: normalizedEmail, checkInUrl, messageId: mailInfo.messageId };
  } catch (err) {
    const category = classifySmtpError(err);
    console.error(`[CHECK-IN EMAIL] failed recipient=${recipient} reservation=${reservationId} category=${category} error=Unable to deliver the check-in email.`);
    return { success: false, emailSent: false, error: 'Unable to deliver the check-in email.', category };
  }
}

/**
 * Send password reset email to guest or staff
 */
export async function sendPasswordResetEmail({ toEmail, resetToken }) {
  try {
    const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const resetUrl = `${appBaseUrl}/reset-password?email=${encodeURIComponent(toEmail)}&token=${encodeURIComponent(resetToken)}`;

    console.log(`\n======================================================`);
    console.log(`[PASSWORD RESET EMAIL DISPATCH]`);
    console.log(`To: ${toEmail}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`======================================================\n`);

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return { success: false, error: 'SMTP email is not configured.' };
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailInfo = await transporter.sendMail({
      from: `"InnKeeper Portal Support" <${process.env.SMTP_FROM || smtpUser}>`,
      to: toEmail,
      subject: 'Reset Your InnKeeper Account Password',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
            <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>We received a request to reset your password for your InnKeeper account (<strong>${toEmail}</strong>).</p>
            <p>Click the button below to choose a new password. This link is valid for 1 hour.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; display: inline-block;">
                Reset Password Now &rarr;
              </a>
            </div>
            <p style="font-size: 13px; color: #64748b;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; color: #2563eb; word-break: break-all;">${resetUrl}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });

    console.log(`[SMTP Mail Delivered Successfully]: Message ID ${mailInfo.messageId}`);
    return { success: true, resetUrl, messageId: mailInfo.messageId };
  } catch (err) {
    console.error('[SMTP Mail Delivery Error]:', err.message);
    return { success: false, error: err.message };
  }
}
