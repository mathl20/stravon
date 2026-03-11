import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: 40,
        background: '#6C63FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width="110" height="110" viewBox="0 0 24 24">
        <path d="M13 2L5 14H10L9 22L19 10H14L13 2Z" fill="white" />
      </svg>
    </div>,
    { ...size },
  );
}
