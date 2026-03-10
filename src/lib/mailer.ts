import nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    console.error('[MAILER] SMTP credentials are not set — skipping email send');
    throw new Error('Email non configuré. Ajoutez SMTP_HOST, SMTP_USER et SMTP_PASS dans vos variables d\'environnement.');
  }

  const fromAddress = `STRAVON <${from}>`;

  console.log(`[MAILER] Sending email to=${to} subject="${subject}" from="${fromAddress}"`);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const info = await transporter.sendMail({
      from: fromAddress,
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
