# Munajjam UI (Desktop Renderer)

Next.js renderer used by the desktop Electron shell.

## Commands

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm run test
npm run clean:generated
```

## Notes

- Keep renderer state strictly type-safe (`typecheck` and `lint` are release gates).
- `out`, `.next`, `.vercel`, and generated `public/peaks` assets are build artifacts and should not be treated as source.
- This package is a desktop renderer only. Cloudflare/Pages deployment scripts and hosted-site metadata are intentionally out of scope.
