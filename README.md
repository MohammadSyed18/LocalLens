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
