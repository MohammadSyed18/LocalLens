import {createServer, type ServerResponse} from 'node:http';
import {briefing, Store, validate} from './notices.js';
import {createDigest, digestToRss, type DigestOptions} from './digest.js';

const store = new Store(process.env.LOCALLENS_DB ?? 'data/notices.json');
const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://local');
    if (req.method === 'GET' && url.pathname === '/briefing') {
      return send(res,200,briefing(await store.load(),url.searchParams.getAll('interest')));
    }
    if (req.method === 'GET' && ['/digest','/feed.xml'].includes(url.pathname)) {
      const options: DigestOptions = {includeTags:url.searchParams.getAll('include'),excludeTags:url.searchParams.getAll('exclude')};
      for (const key of ['since','now','cursor'] as const) {
        const value = url.searchParams.get(key); if (value !== null) options[key] = value;
      }
      if (url.searchParams.has('limit')) options.limit = Number(url.searchParams.get('limit'));
      const digest = createDigest(await store.load(),options);
      if (url.pathname === '/feed.xml') {
        res.writeHead(200,{'content-type':'application/rss+xml; charset=utf-8','x-content-type-options':'nosniff'});
        return res.end(digestToRss(digest));
      }
      return send(res,200,digest);
    }
    if (req.method === 'POST' && url.pathname === '/notices') {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 100000) throw new Error('request too large');
      }
      const notice = validate(JSON.parse(raw));
      await store.upsert(notice);
      return send(res,201,notice);
    }
    send(res,404,{error:'not found'});
  } catch (error) { send(res,400,{error:(error as Error).message}); }
});
function send(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(value));
}
server.requestTimeout = 15000;
server.listen(Number(process.env.PORT ?? 8080),'127.0.0.1');
