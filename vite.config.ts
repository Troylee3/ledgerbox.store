import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const reactPath = path.resolve(projectRoot, 'node_modules/react');
const reactDomPath = path.resolve(projectRoot, 'node_modules/react-dom');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // Keep React and React DOM on one instance so hooks use the active renderer.
      dedupe: ['react', 'react-dom'],
      alias: [
        {find: /^react$/, replacement: reactPath},
        {find: /^react\/(.*)$/, replacement: `${reactPath}/$1`},
        {find: /^react-dom$/, replacement: reactDomPath},
        {find: /^react-dom\/(.*)$/, replacement: `${reactDomPath}/$1`},
        {find: '@', replacement: projectRoot},
      ],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      force: true,
    },
    server: {
      // The hosted preview does not reliably proxy Vite's HMR WebSocket.
      // Keep the app stable and avoid noisy "WebSocket closed without opened" errors.
      hmr: false,
      watch: {},
    },
  };
});
