import { NextResponse } from 'next/server';
import { search } from '@/lib/db/search';
import { getDb } from '@/lib/db/client';

/** Backs the header search palette. Read-only, no caching beyond the process. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!getDb()) {
    return NextResponse.json({ error: 'source_unavailable' }, { status: 503 });
  }
  if (q.length < 2) return NextResponse.json({ groups: {} });
  return NextResponse.json({ groups: search(q, 5) });
}
