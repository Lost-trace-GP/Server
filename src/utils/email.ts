import logger from '../utils/logger';
import nodemailer from 'nodemailer';

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_FROM,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  resetUrl: string,
) => {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}?token=${resetToken}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};
export const sendMatchFoundEmail = async (
  email: string,
  personName: string,
  matchedReportId: string | null | undefined,
) => {
  const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard/reports/${matchedReportId}`;

  await transporter.sendMail({
    to: email,
    subject: `🔍 Possible Match Found for ${personName}`,
    html: `
      <h2>Good News from Lost Trace</h2>
      <p>We’ve detected a <strong>potential match</strong> for your missing person report involving:</p>
      <ul>
        <li><strong>Person Name:</strong> ${personName}</li>
        <li><strong>Match Report ID:</strong> ${matchedReportId || 'N/A'}</li>
      </ul>

      <p>Please <a href="${dashboardUrl}">click here</a> or visit your <strong>Lost Trace Dashboard</strong> to review the details of this match.</p>

      <p>If you believe this is a valid match, please contact the reporting user or local authorities immediately.</p>

      <hr/>
      <p>This is an automated alert from the Lost Trace system. Stay hopeful — we’re here to help.</p>
    `,
  });

  logger.info(`Match alert email sent to ${email}`);
};
