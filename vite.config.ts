import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/mcts-visual/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
