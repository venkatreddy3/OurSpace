import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Standalone dev server for the login page (main app stays on 5173).
// Packages are resolved from the parent folder's node_modules until this gets its own install.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, host: true },
});
