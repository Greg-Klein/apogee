/**
 * Decorative orbital arcs behind the overview hero.
 * Pure SVG, no animation loop: the drift is a single CSS transform.
 */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 520 520"
      className={className}
      fill="none"
      style={{ animation: 'drift 220s linear infinite' }}
    >
      <defs>
        <linearGradient id="orbit-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4d8ff0" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#4d8ff0" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#4d8ff0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="orbit-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8ecf5" stopOpacity="0.22" />
          <stop offset="70%" stopColor="#e8ecf5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="260" cy="260" r="238" stroke="url(#orbit-a)" strokeWidth="1" />
      <circle cx="260" cy="260" r="182" stroke="url(#orbit-b)" strokeWidth="1" />
      <ellipse
        cx="260"
        cy="260"
        rx="238"
        ry="96"
        stroke="url(#orbit-a)"
        strokeWidth="1"
        transform="rotate(-22 260 260)"
      />
      <ellipse
        cx="260"
        cy="260"
        rx="150"
        ry="235"
        stroke="url(#orbit-b)"
        strokeWidth="1"
        transform="rotate(14 260 260)"
      />
      <circle cx="498" cy="260" r="2.5" fill="#4d8ff0" />
      <circle cx="260" cy="78" r="1.8" fill="#e8ecf5" fillOpacity="0.5" />
    </svg>
  );
}
