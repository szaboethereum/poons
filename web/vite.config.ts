import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The art engine lives in ../art (shared with the contracts/indexer), so allow Vite to serve the parent dir.
const root = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, fs: { allow: [root] } },
});
