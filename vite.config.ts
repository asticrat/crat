import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    nodePolyfills({
      include: ['buffer', 'stream', 'util', 'events', 'crypto', 'vm'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  worker: {
    format: 'es',
    plugins: () => [
      wasm(),
      topLevelAwait(),
      nodePolyfills({
        include: ['buffer', 'stream', 'util', 'events', 'crypto', 'vm'],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        }
      })
    ]
  }
})
