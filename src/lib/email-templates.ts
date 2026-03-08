const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://app.stravon.fr');

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,sans-serif;background:#f4f4f5;">
  <div style="max-width:520px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="padding:32px 32px 0;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px;">
        <div style="width:36px;height:36px;background:#18181b;border-radius:8px;display:flex;align-items:center;justify-content:center;">
          <span style="color:white;font-size:16px;">⚡</span>
        </div>
        <span style="font-weight:800;font-size:1.2rem;color:#18181b;letter-spacing:-0.02em;">STRAVON</span>
      </div>
    </div>
    <div style="padding:0 32px 32px;">
      ${content}
    </div>
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e4e4e7;text-align:center;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">
        Cet email a été envoyé par STRAVON. Si vous n'êtes pas à l'origine de cette action, ignorez cet email.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function verifyEmailTemplate(token: string, firstName: string): { subject: string; html: string } {
  const link = `${APP_URL}/verify-email?token=${token}`;
  return {
    subject: 'Vérifiez votre adresse email — Stravon',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Bienvenue ${firstName} !</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Merci de vous être inscrit sur STRAVON. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous.
      </p>
      <a href="${link}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
        Vérifier mon email
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        Ce lien expire dans 24 heures.<br>
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${link}" style="color:#4f6ef7;word-break:break-all;">${link}</a>
      </p>
    `),
  };
}

export function resetPasswordTemplate(token: string, firstName: string): { subject: string; html: string } {
  const link = `${APP_URL}/reset-password?token=${token}`;
  return {
    subject: 'Réinitialisation de votre mot de passe — Stravon',
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Réinitialisation du mot de passe</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Bonjour ${firstName}, vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
      </p>
      <a href="${link}" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
        Réinitialiser mon mot de passe
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#a1a1aa;line-height:1.5;">
        Ce lien expire dans 1 heure.<br>
        Si vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe restera inchangé.<br>
        <a href="${link}" style="color:#4f6ef7;word-break:break-all;">${link}</a>
      </p>
    `),
  };
}
