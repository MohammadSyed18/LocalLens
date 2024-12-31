import {createHash} from 'node:crypto';
import {dedupe, extract, validate, type Notice} from './notices.js';

export type DigestOptions = {
  includeTags?: string[];
  excludeTags?: string[];
  since?: string;
  now?: string;
  limit?: number;
  cursor?: string;
};
export type DigestItem = {notice: Notice; score: number; action: string | null; deadline: string | null; reasons: string[]};
export type Digest = {items: DigestItem[]; total: number; nextCursor: string | null; generatedAt: string};

function tags(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) throw new Error('Expected nonempty tag strings');
  return [...new Set(value.map(item => item.trim().toLowerCase()))].sort();
}
function timestamp(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${label}`);
  return parsed;
}

/** Stable pagination is bound to the exact notice content and personalization scope. */
export function createDigest(values: Notice[], options: DigestOptions = {}): Digest {
  const include = tags(options.includeTags ?? []), exclude = tags(options.excludeTags ?? []);
  if (include.some(tag => exclude.includes(tag))) throw new Error('A tag cannot be included and excluded');
  const limit = options.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Limit must be 1..100');
  const now = new Date(timestamp(options.now ?? new Date().toISOString(), 'now')).toISOString();
  const end = timestamp(now, 'now'), start = options.since ? timestamp(options.since, 'since') : -Infinity;
  if (start > end) throw new Error('Since must precede now');
  const candidates = dedupe(values.map(validate)).filter(notice => {
    const published = Date.parse(notice.publishedAt), noticeTags = notice.tags.map(tag => tag.toLowerCase());
    return published > start && published <= end && !exclude.some(tag => noticeTags.includes(tag))
      && (!include.length || include.some(tag => noticeTags.includes(tag)));
  });
  const items: DigestItem[] = candidates.map(notice => {
    const matched = include.filter(tag => notice.tags.map(item => item.toLowerCase()).includes(tag));
    const ageDays = Math.max(0, (end - Date.parse(notice.publishedAt)) / 86400000);
    const summary = extract(notice);
    const urgent = /\b(urgent|closure|deadline)\b/i.test(notice.title + ' ' + notice.body);
    const score = Number((matched.length * 3 + (urgent ? 2 : 0) + Math.exp(-ageDays / 14)).toFixed(6));
    return {notice, ...summary, score, reasons: [...matched.map(tag => `Matches ${tag}`), ...(urgent ? ['Time-sensitive wording'] : [])]};
  }).sort((a,b) => b.score - a.score || b.notice.publishedAt.localeCompare(a.notice.publishedAt) || a.notice.id.localeCompare(b.notice.id));
  const scope = createHash('sha256').update(JSON.stringify({items, include, exclude, now, since: options.since ? new Date(start).toISOString() : null, limit})).digest('hex');
  let offset = 0;
  if (options.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(options.cursor, 'base64url').toString('utf8'));
      if (decoded.scope !== scope || !Number.isInteger(decoded.offset) || decoded.offset < 0 || decoded.offset > items.length) throw new Error();
      offset = decoded.offset;
    } catch { throw new Error('Stale or invalid digest cursor; keep the original now value when paging'); }
  }
  const next = offset + limit;
  return {items: items.slice(offset,next), total: items.length, generatedAt: new Date(end).toISOString(),
    nextCursor: next < items.length ? Buffer.from(JSON.stringify({scope,offset:next})).toString('base64url') : null};
}

function xml(value: string): string {
  return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
export function digestToRss(digest: Digest, title = 'LocalLens briefing'): string {
  const items = digest.items.map(({notice}) => `<item><guid isPermaLink="false">${xml(notice.id)}</guid><title>${xml(notice.title)}</title><link>${xml(notice.source.url)}</link><pubDate>${new Date(notice.publishedAt).toUTCString()}</pubDate><description>${xml(notice.body)}</description></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${xml(title)}</title><link>http://localhost:8080/</link><description>Personalized notices with original source links</description><lastBuildDate>${new Date(digest.generatedAt).toUTCString()}</lastBuildDate>${items}</channel></rss>`;
}
