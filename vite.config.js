import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "https://lcssanches.github.io/point-cloud-viewer/",
  plugins: [react()],
})
