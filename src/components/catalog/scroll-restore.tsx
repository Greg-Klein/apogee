'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const KEY = 'apogee.catalog-scroll';

/**
 * Restores the reading position when the visitor comes back from a flight page.
 *
 * The list itself is already restored by the URL; this puts the viewport back
 * where it was, keyed on the exact query so a different search starts at the top.
 */
export function ScrollRestore() {
  const pathname = usePathname();
  const params = useSearchParams();
  const key = `${pathname}?${params?.toString() ?? ''}`;

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(KEY);
    } catch {
      stored = null;
    }
    if (stored) {
      try {
        const saved = JSON.parse(stored) as { key: string; y: number };
        if (saved.key === key && saved.y > 0) {
          window.scrollTo({ top: saved.y, behavior: 'auto' });
        }
      } catch {
        /* malformed entry: start at the top */
      }
    }

    const save = () => {
      try {
        window.sessionStorage.setItem(KEY, JSON.stringify({ key, y: window.scrollY }));
      } catch {
        /* storage unavailable: position simply is not restored */
      }
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('click', save, { capture: true });
    return () => {
      save();
      window.removeEventListener('pagehide', save);
      document.removeEventListener('click', save, { capture: true });
    };
  }, [key]);

  return null;
}
