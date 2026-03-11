import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: '#09090F',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        position: 'relative',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(108,99,255,0.25) 0%, transparent 70%)',
          top: 115,
          left: 300,
        }}
      />

      {/* Logo */}
      <div
        style={{
          width: 96,
          height: 96,
          borderRadius: 22,
          background: '#6C63FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 32,
        }}
      >
        <svg width="60" height="60" viewBox="0 0 24 24">
          <path d="M13 2L5 14H10L9 22L19 10H14L13 2Z" fill="white" />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          color: 'white',
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: '-1px',
          marginBottom: 16,
        }}
      >
        Stravon
      </div>

      {/* Subtitle */}
      <div
        style={{
          color: 'rgba(255,255,255,0.65)',
          fontSize: 28,
          fontWeight: 400,
          textAlign: 'center',
          maxWidth: 700,
        }}
      >
        Le logiciel tout-en-un pour artisans du bâtiment
      </div>

      {/* Features row */}
      <div
        style={{
          display: 'flex',
          gap: 24,
          marginTop: 48,
        }}
      >
        {['Devis', 'Factures', 'Planning', 'Équipe', 'IA'].map((item) => (
          <div
            key={item}
            style={{
              background: 'rgba(108,99,255,0.15)',
              border: '1px solid rgba(108,99,255,0.4)',
              borderRadius: 8,
              padding: '8px 20px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 20,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>,
    { ...size },
  );
}
