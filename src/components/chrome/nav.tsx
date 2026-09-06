'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from '@/lib/clsx';

const ENTRIES = [
  { href: '/', label: "Vue d'ensemble", match: (p: string) => p === '/' },
  { href: '/vols', label: 'Vols', match: (p: string) => p.startsWith('/vols') },
  { href: '/materiel', label: 'Matériel', match: (p: string) => p.startsWith('/materiel') },
  { href: '/charges-utiles', label: 'Charges utiles', match: (p: string) => p.startsWith('/charges-utiles') },
];

/**
 * Primary navigation. The active entry is marked by a rail that slides between
 * items via a shared layout id, so the transition reads as one object moving.
 */
export function Nav() {
  const pathname = usePathname() ?? '/';
  return (
    <nav aria-label="Navigation principale" className="flex items-center gap-0.5">
      {ENTRIES.map((e) => {
        const active = e.match(pathname);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative rounded-md px-2.5 py-1.5 text-xs transition-colors duration-200',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {e.label}
            <span
              aria-hidden
              className={clsx(
                'absolute inset-x-2.5 -bottom-[13px] h-px origin-center bg-ion transition-transform duration-300',
                active ? 'scale-x-100' : 'scale-x-0',
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}
            />
          </Link>
        );
      })}
    </nav>
  );
}
