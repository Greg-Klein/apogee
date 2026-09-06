'use client';

import { useState } from 'react';
import { clsx } from '@/lib/clsx';

/**
 * Hero backdrop.
 *
 * The image is decorative: it fades into the ground colour so the text above it
 * keeps its contrast, and a failed load simply leaves the gradient panel intact.
 * Rendered as a background layer rather than a content image, so it never shifts
 * layout and carries no alt text to read out.
 */
export function HeroBackdrop({
  src,
  credit,
  className,
}: {
  src: string | null;
  credit?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <div aria-hidden className={clsx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {/* Probe the URL with a real element so a 404 can switch the layer off. */}
      <img src={src} alt="" className="hidden" onError={() => setFailed(true)} />

      {/* From md up, the photograph occupies the right side of the panel at full
          strength and dissolves before it reaches the text column, so it reads as an
          image rather than as a wash behind the copy. Below md there is no room for a
          side-by-side split, so it drops to a faint full-width texture instead of
          sitting under the paragraph. */}
      <div
        className="absolute inset-y-0 right-0 w-full bg-cover bg-center opacity-[0.18] md:w-[62%] md:opacity-100"
        style={{
          backgroundImage: `url(${JSON.stringify(src)})`,
          maskImage: 'linear-gradient(to right, transparent, #000 42%, #000)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 42%, #000)',
        }}
      />
      {/* Two soft passes keep contrast on the overlay text without flattening the photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-ground via-ground/85 to-ground/40 md:via-ground/70 md:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-ground/90 via-transparent to-ground/40" />

      {credit ? (
        <span className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-wider text-ink-3/70">
          {credit}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Mission patch.
 *
 * Published for about four flights in five; the slot collapses entirely when the
 * source has none rather than showing a placeholder badge.
 */
export function MissionPatch({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  /** Controls the rendered size, so callers can shrink the patch on small screens. */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={`Écusson de la mission ${name}`}
      width={104}
      height={104}
      loading="lazy"
      onError={() => setFailed(true)}
      className={clsx(
        'shrink-0 object-contain drop-shadow-[0_8px_24px_rgb(0_0_0/0.55)]',
        'transition-transform duration-500 hover:scale-105',
        className,
      )}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
    />
  );
}

/**
 * Thumbnail for cards. Fixed aspect, lazy, and removed on failure so a broken
 * asset never leaves an empty grey box behind.
 */
export function Thumb({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <span className={clsx('relative block overflow-hidden rounded-lg bg-surface-2', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover opacity-80 transition-all duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
        style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
      />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ground/80 to-transparent" />
    </span>
  );
}
