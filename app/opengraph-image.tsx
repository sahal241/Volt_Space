import { ImageResponse } from 'next/og';
export const alt = 'VoltSpace AI — Understand your power. Control your bill.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#10171c',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 80,
        color: '#edf3f4',
        justifyContent: 'center',
      }}
    >
      <div style={{ color: '#37d3b6', fontSize: 30, marginBottom: 40 }}>VOLTSPACE AI</div>
      <div style={{ fontSize: 66, lineHeight: 1.1, maxWidth: 950 }}>Understand your power.</div>
      <div style={{ fontSize: 66, lineHeight: 1.1, color: '#37d3b6' }}>Control your bill.</div>
      <div style={{ fontSize: 24, marginTop: 40, color: '#b7c3cb' }}>
        Energy intelligence for Indian homes.
      </div>
    </div>,
    size,
  );
}
