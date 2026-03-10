const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://stravon-weld.vercel.app');

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

// ── Ambassador email templates ──────────────────────────────

export function ambassadorRewardTemplate(firstName: string, rank: number, amount: number, month: string, referralsCount: number): { subject: string; html: string } {
  const medals = ['🥇', '🥈', '🥉'];
  const medal = medals[rank - 1] || '';
  const positions = ['1er', '2ème', '3ème'];
  const position = positions[rank - 1] || `${rank}ème`;
  return {
    subject: `${medal} Félicitations ! Vous êtes ${position} du classement — Stravon`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">${medal} Bravo ${firstName} !</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Vous avez terminé <strong>${position}</strong> du classement ambassadeur du mois de <strong>${month}</strong> avec <strong>${referralsCount} artisans</strong> parrainés !
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
        <p style="margin:0;font-size:28px;font-weight:800;color:#16a34a;">+${amount}€</p>
        <p style="margin:4px 0 0;font-size:13px;color:#15803d;">Bonus ajouté à votre solde</p>
      </div>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Ce bonus sera versé avec vos prochaines commissions via Stripe Connect. Continuez comme ça ! 💪
      </p>
      <a href="${APP_URL}/ambassadeur/dashboard" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
        Voir mon dashboard
      </a>
    `),
  };
}

export function ambassadorTierUnlockTemplate(firstName: string, tierName: string): { subject: string; html: string } {
  return {
    subject: `🎉 Félicitations ! Vous avez atteint le palier ${tierName} — Stravon`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">🎉 Nouveau palier débloqué !</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Bravo ${firstName} ! Vous avez atteint le palier <strong>${tierName}</strong> !
      </p>
      ${tierName === 'Argent' ? `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:15px;font-weight:600;color:#1d4ed8;">🏆 Classement mensuel débloqué !</p>
        <p style="margin:8px 0 0;font-size:14px;color:#3b82f6;line-height:1.5;">
          Vous participez désormais au classement mensuel et pouvez gagner des récompenses : 🥇 100€, 🥈 50€, 🥉 25€ chaque mois !
        </p>
      </div>` : ''}
      <a href="${APP_URL}/ambassadeur/dashboard" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
        Voir mon dashboard
      </a>
    `),
  };
}

export function ambassadorRankUpTemplate(firstName: string, newRank: number, month: string): { subject: string; html: string } {
  const positions = ['1er', '2ème', '3ème', '4ème', '5ème'];
  const position = positions[newRank - 1] || `${newRank}ème`;
  return {
    subject: `📈 Vous êtes maintenant ${position} du classement — Stravon`,
    html: baseTemplate(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">📈 Montée au classement !</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        ${firstName}, vous venez de passer <strong>${position}</strong> au classement ambassadeur de <strong>${month}</strong> !
      </p>
      ${newRank <= 3 ? `
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:15px;font-weight:600;color:#a16207;">Vous êtes en position de remporter un bonus !</p>
        <p style="margin:8px 0 0;font-size:14px;color:#ca8a04;">🥇 100€ · 🥈 50€ · 🥉 25€</p>
      </div>` : `
      <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6;">
        Continuez à parrainer des artisans pour atteindre le top 3 et gagner un bonus !
      </p>`}
      <a href="${APP_URL}/ambassadeur/dashboard" style="display:inline-block;padding:14px 32px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:600;font-size:15px;">
        Voir le classement
      </a>
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
