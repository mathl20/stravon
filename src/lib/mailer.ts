import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const useResend = !!process.env.RESEND_API_KEY;

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@stravon.fr';
  const from = `STRAVON <${fromAddress}>`;

  console.log(`[MAILER] Sending email to=${to} subject="${subject}" provider=${useResend ? 'resend' : 'smtp'}`);

  try {
    if (useResend) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
        replyTo: replyTo || undefined,
      });
      if (error) {
        throw new Error(`Resend error: ${JSON.stringify(error)}`);
      }
    } else {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Email non configuré. Ajoutez RESEND_API_KEY ou SMTP_HOST/SMTP_USER/SMTP_PASS dans vos variables d\'environnement.');
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      await transporter.sendMail({ from, to, subject, html, replyTo });
    }

    console.log(`[MAILER] Email sent successfully to=${to}`);
  } catch (error) {
    console.error(`[MAILER] Failed to send email to=${to}:`, error);
    throw error;
  }
}
