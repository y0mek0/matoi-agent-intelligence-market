# Operations

## Watcher

`scripts/watch-system.mjs` hashes important project files and reruns the quality chain when they change.

Quality chain:

```bash
npm run lint
npm run test
npm run build
```

`npm run monitor` runs continuously. `npm run monitor:once` runs one pass.

## Secret hygiene

- `.env.local` is gitignored.
- `recovery/` is gitignored.
- Browser API returns boolean readiness only.
- Logs must not print API keys, private keys, entity secrets or bot tokens.
