# LocalLens

A TypeScript community-information service that validates simulated public notices, preserves source attribution, extracts actions and deadlines, removes exact normalized duplicates, and builds interest-filtered briefings with screen-reader-friendly text.

Run `npm install`, `npm test`, and `npm run build`; start with `npm start`. Post the single-notice fixture with `curl -X POST localhost:8080/notices -H 'Content-Type: application/json' --data @data/notice.sample.json`. Storage uses atomic JSON replacement and quarantines corrupt files. The included feed is synthetic. Duplicate detection is deliberately conservative and there is no live municipal connector.
