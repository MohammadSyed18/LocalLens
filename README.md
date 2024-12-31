# locallens

community notices, but condensed into a briefing

TypeScript. checks the notice, keeps the source, pulls out deadlines/actions, filters duplicates. preferences change the order.

escaped HTML + accessibility support.

```sh
npm install
npm test
npm run build
npm start
```

try the sample notice:

```sh
curl -X POST localhost:8080/notices \
  -H 'Content-Type: application/json' \
  --data @data/notice.sample.json
```

storage is JSON with atomic replacement and corrupt-file quarantine. there are bounded backoff/retry helpers too.

the sample feed is synthetic. duplicate matching is conservative, and this isn't connected to a live municipal feed.

## Implementation details

The notice store supports serialized upserts, stale-update rejection, unique temporary files for atomic writes, corruption quarantine, and strict HTTP/HTTPS source validation.

## Personalized digests and RSS

[digest.ts](src/digest.ts) builds interest-filtered digests with strict exclusions, recency weighting, action/deadline extraction, and explanations for ranking. Future notices are excluded. Cursor pagination is tied to notice contents, preferences, page size, and a fixed generation time, so a changed feed cannot silently skip items.

```sh
curl 'http://localhost:8080/digest?include=school&exclude=sport&limit=5'
curl 'http://localhost:8080/feed.xml?include=school'
```

For subsequent pages, pass the returned `generatedAt` as `now` and `nextCursor` as `cursor`, keeping all other filters unchanged. A stale cursor returns an explicit error. RSS output escapes notice text and preserves original source links. The server binds to localhost; this remains a local application rather than a hosted multi-user service.
