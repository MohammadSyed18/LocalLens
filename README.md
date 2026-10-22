# LocalLens

A TypeScript prototype for turning public notices into a short, personalized briefing.

It checks incoming notices, keeps their sources, extracts actions and deadlines, and filters duplicates. Preferences affect the order of the briefing. The HTML output escapes notice text and includes accessibility support.

```sh
npm install
npm test
npm run build
npm start
```

Try the sample notice:

```sh
curl -X POST localhost:8080/notices \
  -H 'Content-Type: application/json' \
  --data @data/notice.sample.json
```

Storage is JSON with atomic replacement and corrupt-file quarantine. There are bounded backoff/retry helpers too.

The sample feed is synthetic. Duplicate matching is conservative, and this isn't connected to a live municipal feed.
