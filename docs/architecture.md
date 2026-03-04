# Munajjam Desktop Architecture

## Runtime boundary

- `src/`: Electron main process, preload bridge, IPC registration, SQLite access, Python orchestration, and custom protocol handlers.
- `ui/`: Next.js renderer bundled as a static export for production and served by Next in development.
- `src/ipc-types.ts`: single source of truth for the preload bridge contract consumed by the renderer.

## Data flow

1. The Electron main process creates the application window and registers IPC + protocol handlers.
2. `src/preload.ts` exposes the typed `window.munajjam` bridge.
3. Renderer adapter modules under `ui/lib/` call the bridge and normalize data for React state.
4. UI state is coordinated in the workspace provider/reducer layer and rendered by the QA components.

## Persistence

- SQLite data, generated peaks, exports, and job output live under the Electron user data directory.
- `ui/out` is a generated renderer bundle, not source.
- `ui/public` should contain only static assets required by the renderer itself.
