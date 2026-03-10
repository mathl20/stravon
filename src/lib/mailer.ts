import { Resend } from 'resend';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('Email non configuré. Ajoutez RESEND_API_KEY dans vos variables d\'environnement.');
    _resend = new Resend(apiKey);
  }
  return _resend;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions) {
  const resend = getResend();

  const from = process.env.EMAIL_FROM || 'STRAVON <no-reply@stravon.fr>';

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
