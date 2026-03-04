# Source Inventory

| Area | Classification | Notes |
| --- | --- | --- |
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `.eslintrc.cjs` | runtime-critical | Root build, test, and Electron tooling. |
| `src/` | runtime-critical | Main process, preload bridge, IPC, database, jobs, protocol handling. |
| `assets/` | runtime-critical | Electron application icons. |
| `ui/package.json`, `ui/tsconfig.json`, `ui/next.config.js`, `ui/vitest.config.ts` | runtime-critical | Renderer build and quality gates. |
| `ui/app/` | runtime-critical | Next.js route/layout entrypoints for the desktop renderer. |
| `ui/components/` | runtime-critical | Renderer UI and interaction logic. |
| `ui/lib/` | runtime-critical | Renderer adapters, contexts, domain helpers, and bridge wrappers. |
| `ui/types/` | runtime-critical | Shared renderer type declarations around the preload bridge. |
| `ui/messages/` | runtime-critical | Localized renderer strings. |
| `ui/test/` | test-only | Intentional test fixtures. |
| `dist/`, `.next/`, `ui/.next/`, `ui/out/`, `ui/.vercel/`, `coverage/`, `ui/coverage/`, `ui/public/peaks/` | generated | Safe to delete and regenerate. |
| `ui/.cursor/`, `ui/.claude/`, `.DS_Store`, `*.tsbuildinfo` | editor-local | Machine-local/editor-local artifacts. |
| Legacy `ui/supabase/` paths | dead | Removed migration leftovers from the fork; they were not used by runtime or tests. |
| `ui/public/067.mp3`, `ui/public/067.wav`, `ui/public/test-037.mp3`, `ui/public/timestamps.json`, `ui/public/recitation_links.json` | dead | Demo/sample assets not referenced by runtime or tests. |
