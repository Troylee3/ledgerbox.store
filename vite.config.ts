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
        {find: /^react-dom$/, replacement: reactDomPath},
        {find: '@', replacement: projectRoot},
      ],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      force: true,
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
