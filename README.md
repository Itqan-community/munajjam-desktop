# Munajjam Desktop

Electron desktop app for local Quran alignment workflows.

## Commands

```bash
npm install
npm run dev
npm run check
npm run audit:deadcode
npm run rebuild:native
npm run clean:generated
```

## Quality gates

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run audit:deadcode`
- `npm run check` (runs all of the above)

## Native module rebuild

If the root test suite fails with a `better-sqlite3` Node ABI mismatch after changing Node versions, rebuild the native addon before rerunning tests:

```bash
npm run rebuild:native
```

## Architecture

- Electron main process, IPC, database access, Python process orchestration, and custom protocols live in `src/`.
- The renderer lives in `ui/` and is loaded either from the local Next dev server or from the exported static bundle at `ui/out`.
- Shared runtime boundaries are documented in `docs/architecture.md`.
- A source inventory for cleanup decisions is documented in `docs/source-inventory.md`.

## Generated artifacts

Generated outputs are not source of truth and can be removed safely with:

```bash
npm run clean:generated
npm --prefix ./ui run clean:generated
```

This clears build/output caches such as `dist`, `coverage`, `ui/.next`, `ui/out`, `ui/.vercel`, and generated peaks.
