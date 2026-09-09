import nodemailer from 'nodemailer';

/**
 * Next.js compatible email service for password reset and notifications.
 */
export async function sendPasswordResetEmail({
  to,
  token,
  name,
}: {
  to: string;
  token: string;
  name?: string;
}): Promise<{ success: boolean; messageId?: string; resetUrl: string; error?: string }> {
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    'http://localhost:5173';

  const resetUrl = `${appBaseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  const firstName = name ? name.trim().split(' ')[0] : 'User';

  const smtpHost = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const smtpPort = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const smtpUser = process.env.EMAIL_USER || process.env.SMTP_USER;
  const smtpPass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASS;
  const smtpFrom =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    `"InnKeeper Support" <${smtpUser || 'no-reply@innkeeper.com'}>`;
  const isSecure = process.env.EMAIL_SECURE === 'true' || smtpPort === 465;

  if (!smtpHost || !smtpUser || !smtpPass) {
    const errorMsg = 'SMTP credentials (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD) are missing in .env';
    console.error(`[Email Service (Next.js)] SMTP Error: ${errorMsg}`);
    return { success: false, error: errorMsg, resetUrl };
  }

  console.log(`[Email Service (Next.js)] Attempting to send password reset email to ${to}...`);

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to,
      subject: 'Reset your InnKeeper password',
      text: [
        `Hello ${firstName},`,
        ``,
        `We received a request to reset your InnKeeper account password.`,
        ``,
        `You can use the following link to reset your password:`,
        `${resetUrl}`,
        ``,
        `This password reset link will expire after 30 minutes.`,
        ``,
        `If you didn't request a password reset, you can safely ignore this email.`,
        ``,
        `Thanks,`,
        `The InnKeeper Team`,
      ].join('\n'),
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your InnKeeper password</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f6f8fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #24292f; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f6f8fa; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Outer Card Container -->
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #d0d7de; border-radius: 8px; border-collapse: separate; overflow: hidden; box-shadow: 0 3px 6px rgba(140,149,159,0.15);">
                  
                  <!-- Header Brand Bar -->
                  <tr>
                    <td style="padding: 28px 32px 16px 32px; text-align: left; border-bottom: 1px solid #hsla(210,18%,87%,1);">
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="vertical-align: middle;">
                            <div style="background-color: #2f6c85; color: #ffffff; font-weight: bold; width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px; font-size: 18px; font-family: Arial, sans-serif;">
                              IK
                            </div>
                          </td>
                          <td style="vertical-align: middle; padding-left: 12px;">
                            <span style="font-size: 18px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">InnKeeper PMS</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Main Content Area -->
                  <tr>
                    <td style="padding: 24px 32px 32px 32px;">
                      <h1 style="font-size: 20px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 20px;">
                        Reset your InnKeeper password
                      </h1>

                      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 16px;">
                        Hello <strong>${firstName}</strong>,
                      </p>

                      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 20px;">
                        We received a request to reset your InnKeeper account password. You can use the following button to reset your password:
                      </p>

                      <!-- Action Button -->
                      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                        <tr>
                          <td align="center" style="border-radius: 6px; background-color: #2f6c85;">
                            <a href="${resetUrl}" target="_blank" style="font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 600; color: #ffffff; text-decoration: none; display: inline-block; padding: 12px 24px; border-radius: 6px; border: 1px solid #2f6c85;">
                              Reset your password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- Expiration and Safety notice -->
                      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 24px; margin-bottom: 12px;">
                        This password reset link will expire after <strong>30 minutes</strong>.
                      </p>

                      <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 0; margin-bottom: 24px;">
                        If you didn't request a password reset, you can safely ignore this email.
                      </p>

                      <!-- Signoff -->
                      <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-top: 0; margin-bottom: 0;">
                        Thanks,<br>
                        <strong>The InnKeeper Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
                      <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                        &copy; ${new Date().getFullYear()} InnKeeper PMS. All rights reserved.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log(`[Email Service (Next.js)] Password reset email dispatched to ${to} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, resetUrl };
  } catch (error: any) {
    console.error('[Email Service (Next.js)] Error sending email via SMTP:', error.message);
    return { success: false, error: error.message, resetUrl };
  }
}
