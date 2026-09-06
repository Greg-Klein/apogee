import type { LinkRow } from '@/lib/db/launches';

/**
 * Webcast selection.
 *
 * Kept out of the client component so server code can call it directly rather than
 * receiving a client reference.
 */

const YOUTUBE = /(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{6,})/;

/** YouTube id when the URL is embeddable, null when it must open externally. */
export function embedIdOf(url: string): string | null {
  return YOUTUBE.exec(url)?.[1] ?? null;
}

/** Highest-priority webcast, preferring one that is live right now. */
export function primaryWebcast(links: LinkRow[]): LinkRow | null {
  const videos = links.filter((l) => l.kind === 'video');
  if (!videos.length) return null;
  return (
    videos.find((v) => v.is_live) ?? [...videos].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))[0]
  );
}
