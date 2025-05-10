import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configurations
const emailConfig = {
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
};

// Create reusable transporter object
const transporter = nodemailer.createTransport(emailConfig);

// Verify connection configuration
transporter.verify((error) => {
    if (error) {
        console.error('❌ Email server connection error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

/**
 * Send email with professional templating
 * @param {Object} mailOptions - Email options
 * @param {string} mailOptions.to - Recipient email
 * @param {string} mailOptions.subject - Email subject
 * @param {string} mailOptions.text - Plain text body
 * @param {string} mailOptions.html - HTML body
 * @param {Array} [mailOptions.attachments] - File attachments
 * @returns {Promise} Promise that resolves when email is sent
 */
const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
    try {
        const info = await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'College 2.0'}" <${process.env.EMAIL_HOST}>`,
            to,
            subject,
            text,
            html,
            attachments,
        });

        console.log('📧 Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Email sending error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
    }
};

/**
 * Send verification email with token
 * @param {string} email - Recipient email
 * @param {string} token - Verification token
 * @returns {Promise}
 */
const resetPasswordEmail = async (email, token, expiresIn) => {
    const resetURL = `${process.env.TEST_FRONTEND_URL}/reset-password?token=${token}&email=${email}`; // change it to the actual frontend url later

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Email Verification</h2>
      <p>Please reset your password by clicking the link below:</p>
      <a href="${resetURL}" 
         style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">
         Verify Email
      </a>
      <p style="margin-top: 20px;">Or copy this link: ${resetURL}</p>
      <p style="margin-top: 20px;">Link expires in: ${expiresIn}</p>
    </div>
  `;

    return sendEmail({
        to: email,
        subject: 'Reset Your Password',
        text: `Please reset your password by visiting: ${resetURL}`,
        html,
    });
};

export { transporter, sendEmail, resetPasswordEmail };