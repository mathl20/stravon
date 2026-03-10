import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[MAILER] RESEND_API_KEY is not set — skipping email send');
    throw new Error('Email non configuré. Ajoutez RESEND_API_KEY dans vos variables d\'environnement.');
  }

  const from = process.env.EMAIL_FROM || 'STRAVON <onboarding@resend.dev>';

  console.log(`[MAILER] Sending email to=${to} subject="${subject}" from="${from}"`);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    });

    if (error) {
      console.error(`[MAILER] Resend error to=${to}:`, error);
      throw new Error(error.message);
    }

    console.log(`[MAILER] Email sent successfully to=${to} id=${data?.id}`);
    return { id: data?.id };
  } catch (error) {
    console.error(`[MAILER] Failed to send email to=${to}:`, error);
    throw error;
  }
}
