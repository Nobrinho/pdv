import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  root: appRoot,
  plugins: [react()],
  base: './', // Importante para o Electron achar os arquivos
  server: {
    port: 5173,
    strictPort: true,
    // Permite servir o código compartilhado (packages/shared) que fica fora
    // da raiz do app durante o `npm run dev`.
    fs: {
      allow: [fileURLToPath(new URL('../..', import.meta.url))],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
