import { ImageResponse } from 'next/og';

// Self-contained: no remote font or image fetch, since the CDN serving them
// is not guaranteed at build/request time. Text falls back to next/og's
// bundled default font; `fontFamily` here only hints at a monospace/sans
// stack rather than depending on any font actually being resolvable.
export const alt = 'Apogée : tableau de bord des vols SpaceX';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: '#07080c',
        padding: '80px',
      }}
    >
      {/* orbit arc, mostly off-canvas: echoes the apogee mark from icon.svg */}
      <div
        style={{
          position: 'absolute',
          right: -220,
          top: -160,
          width: 900,
          height: 560,
          borderRadius: '50%',
          border: '2px solid #2c5ea8',
          opacity: 0.55,
          display: 'flex',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 260,
          top: 88,
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: '#4d8ff0',
          display: 'flex',
        }}
      />

      <div
        style={{
          display: 'flex',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 22,
          letterSpacing: 8,
          textTransform: 'uppercase',
          color: '#4d8ff0',
          marginBottom: 24,
        }}
      >
        SpaceX, activité de vol
      </div>

      <div
        style={{
          display: 'flex',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 108,
          fontWeight: 600,
          letterSpacing: 14,
          textTransform: 'uppercase',
          color: '#e8ecf5',
        }}
      >
        APOGÉE
      </div>

      <div
        style={{
          display: 'flex',
          marginTop: 28,
          fontSize: 30,
          color: '#a3abbd',
          maxWidth: 820,
        }}
      >
        Prochains départs, archives, matériel réutilisé et charges utiles, d&apos;après Launch Library 2.
      </div>
    </div>,
    { ...size },
  );
}
