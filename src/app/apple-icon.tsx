import { ImageResponse } from 'next/og';

// Same mark as icon.svg (dark ground, dim ion-blue orbit ellipse, bright
// ion-blue apogee dot at its high point), scaled to Apple's 180x180 touch
// icon and redrawn with divs since satori (which ImageResponse uses) does
// not render arbitrary <svg> markup.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        background: '#07080c',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 33.75,
          top: 73.125,
          width: 112.5,
          height: 67.5,
          borderRadius: '50%',
          border: '2.6px solid #2c5ea8',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 76.5,
          top: 59.625,
          width: 27,
          height: 27,
          borderRadius: '50%',
          background: '#4d8ff0',
        }}
      />
    </div>,
    { ...size },
  );
}
