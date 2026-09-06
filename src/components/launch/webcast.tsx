'use client';

import { useState } from 'react';
import { clsx } from '@/lib/clsx';
import type { LinkRow } from '@/lib/db/launches';
import { embedIdOf } from '@/lib/domain/webcast';

/**
 * Webcasts attached to a flight.
 *
 * Consultation never depends on the embed: every entry is a working external link
 * first. The player is a click-to-load facade, so no third-party frame is created
 * until the visitor asks for it, and a non-embeddable source simply opens outward.
 */

export function WebcastPlayer({ video }: { video: LinkRow }) {
  const [playing, setPlaying] = useState(false);
  const id = embedIdOf(video.url);

  if (!id) {
    return (
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer noopener"
        className="group flex flex-col gap-2 rounded-xl border border-hairline bg-surface/40 p-4 transition-colors hover:border-ion/35"
      >
        <span className="text-sm text-ink transition-colors group-hover:text-ion">
          {video.title ?? 'Retransmission'}
        </span>
        <span className="text-[11px] text-ink-3">
          Cette source ne peut pas être intégrée. Le lien ouvre la retransmission sur{' '}
          {video.source ?? 'le site de la source'}.
        </span>
      </a>
    );
  }

  return (
    <figure className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-xl border border-hairline bg-surface-2">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={video.title ?? 'Retransmission du lancement'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex items-center justify-center"
            aria-label={`Lire la retransmission : ${video.title ?? 'lancement'}`}
          >
            {video.feature_image ? (
              <img
                src={video.feature_image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-65 transition-all duration-500 group-hover:scale-[1.03] group-hover:opacity-85"
                style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
              />
            ) : null}
            <span
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-ground via-ground/20 to-transparent"
            />
            <span
              aria-hidden
              className={clsx(
                'relative flex h-14 w-14 items-center justify-center rounded-full',
                'border border-white/15 bg-ground/70 backdrop-blur-md',
                'shadow-[inset_0_1px_0_rgb(255_255_255/0.15)]',
                'transition-transform duration-300 group-hover:scale-110 group-active:scale-95',
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M4.5 3.2 12.5 8l-8 4.8V3.2Z" fill="#4d8ff0" />
              </svg>
            </span>
            {video.is_live ? (
              <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-go/30 bg-go/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-go">
                <span aria-hidden className="breathe text-[7px]">
                  ●
                </span>
                En direct
              </span>
            ) : null}
          </button>
        )}
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-ink-2">{video.title ?? 'Retransmission'}</span>
        <a
          href={video.url}
          target="_blank"
          rel="noreferrer noopener"
          className="shrink-0 font-mono text-[10px] text-ink-4 transition-colors hover:text-ion"
        >
          {video.publisher ?? video.source ?? 'source'} ↗
        </a>
      </figcaption>
      <p className="text-[10px] leading-relaxed text-ink-4">
        La lecture ne démarre qu&apos;après un clic&nbsp;: aucun lecteur tiers n&apos;est chargé avant.
      </p>
    </figure>
  );
}

/** Prominent header action pointing at the webcast. */
export function WebcastButton({ video }: { video: LinkRow }) {
  // SQLite hands booleans back as 0 or 1.
  const live = Boolean(video.is_live);
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noreferrer noopener"
      className={clsx(
        'group inline-flex items-center gap-2.5 rounded-lg border px-4 py-2 text-sm transition-all duration-200 active:scale-[0.98]',
        live
          ? 'border-go/40 bg-go/10 text-go hover:bg-go/15'
          : 'border-hairline-2 bg-surface/60 text-ink-2 hover:border-ion/40 hover:text-ink',
      )}
    >
      <span aria-hidden className={clsx('text-[8px]', live && 'breathe')}>
        {live ? '●' : '▶'}
      </span>
      {live ? 'Direct en cours' : 'Voir la retransmission'}
      <span className="font-mono text-[10px] opacity-60">{video.publisher ?? video.source}</span>
    </a>
  );
}
