import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[MAILER] RESEND_API_KEY is not set — skipping email send');
    throw new Error('Email non configuré. Ajoutez RESEND_API_KEY dans vos variables d\'environnement Vercel.');
  }

  const fromAddress = process.env.SMTP_FROM || 'onboarding@resend.dev';
  const from = `STRAVON <${fromAddress}>`;

  console.log(`[MAILER] Sending email to=${to} subject="${subject}" from="${from}"`);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      replyTo: replyTo || undefined,
    });

    if (error) {
      console.error(`[MAILER] Resend API error:`, JSON.stringify(error));
      throw new Error(`Resend error: ${error.message || JSON.stringify(error)}`);
    }

    console.log(`[MAILER] Email sent successfully to=${to} id=${data?.id}`);
    return data;
  } catch (error) {
    console.error(`[MAILER] Failed to send email to=${to}:`, error);
    throw error;
  }
}
