import type { MetadataRoute } from 'next';
import { getDb } from '@/lib/db/client';
import { listLaunchSlugs } from '@/lib/db/launches';
import { SITE } from '@/lib/seo';

type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

const STATIC_ROUTES: Array<{ path: string; changeFrequency: ChangeFreq; priority: number }> = [
  { path: '/', changeFrequency: 'hourly', priority: 1 },
  { path: '/vols', changeFrequency: 'hourly', priority: 0.9 },
  { path: '/materiel', changeFrequency: 'daily', priority: 0.7 },
  { path: '/charges-utiles', changeFrequency: 'daily', priority: 0.7 },
];

// listLaunchSlugs() orders most-recent-first (upcoming, then flown, newest to
// oldest); the first handful churn often (status/date updates), deep archive
// is effectively static once a flight has flown.
const RECENT_CUTOFF = 30;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${base}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // The snapshot is a build artefact of `npm run data` and may be absent
  // (e.g. a fresh checkout); fall back to the static routes rather than
  // throwing during the build.
  if (!getDb()) return entries;

  listLaunchSlugs().forEach((slug, i) => {
    const recent = i < RECENT_CUTOFF;
    entries.push({
      url: `${base}/vols/${slug}`,
      changeFrequency: recent ? 'daily' : 'yearly',
      priority: recent ? 0.8 : 0.4,
    });
  });

  return entries;
}
