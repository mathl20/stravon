import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Stravon — Logiciel de gestion pour artisans du batiment';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #060608 0%, #1a1a2e 50%, #060608 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#6d28d9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 0 40px rgba(109, 40, 217, 0.4)',
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontSize: '48px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            STRAVON
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#f0f0f5',
            textAlign: 'center',
            maxWidth: '800px',
            lineHeight: 1.3,
            marginBottom: '20px',
          }}
        >
          Logiciel de gestion pour artisans du batiment
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '20px',
            color: '#a0a0b8',
            textAlign: 'center',
            maxWidth: '700px',
          }}
        >
          Devis, factures, planning, equipes et chantiers — tout dans un seul outil
        </div>

        {/* Pricing badges */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '48px',
          }}
        >
          {['Starter 19€', 'Pro 39€', 'Business 79€'].map((plan) => (
            <div
              key={plan}
              style={{
                padding: '10px 24px',
                borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.05)',
                color: '#d0d0e0',
                fontSize: '16px',
                fontWeight: 600,
              }}
            >
              {plan}/mois
            </div>
          ))}
        </div>

        {/* Trial badge */}
        <div
          style={{
            marginTop: '24px',
            fontSize: '16px',
            color: '#8b5cf6',
            fontWeight: 600,
          }}
        >
          Essai gratuit 14 jours — Sans carte bancaire
        </div>
      </div>
    ),
    { ...size }
  );
}
