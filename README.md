# LocalLens

A TypeScript community-information service that validates simulated public notices, preserves attribution, extracts actions and deadlines, removes duplicates, ranks personalized briefings, renders escaped accessible HTML, and provides bounded exponential retry utilities for failed ingestion.

Run `npm install`, `npm test`, and `npm run build`; start with `npm start`. Post the single-notice fixture with `curl -X POST localhost:8080/notices -H 'Content-Type: application/json' --data @data/notice.sample.json`. Storage uses atomic JSON replacement and quarantines corrupt files. The included feed is synthetic. Duplicate detection is deliberately conservative and there is no live municipal connector.
