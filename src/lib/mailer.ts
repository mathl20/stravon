import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('[MAILER] SMTP_USER or SMTP_PASS is not set — skipping email send');
    throw new Error('Email non configuré. Ajoutez SMTP_USER et SMTP_PASS dans vos variables d\'environnement.');
  }

  const from = `STRAVON <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;

  console.log(`[MAILER] Sending email to=${to} subject="${subject}" from="${from}"`);

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });

    console.log(`[MAILER] Email sent successfully to=${to} messageId=${info.messageId}`);
    return { id: info.messageId };
  } catch (error) {
    console.error(`[MAILER] Failed to send email to=${to}:`, error);
    throw error;
  }
}
