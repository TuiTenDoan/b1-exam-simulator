import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Where the built site will be served from. GitHub Pages puts a project repo
// under /<repo>/, so its asset paths need that prefix; Netlify and most other
// hosts serve from the domain root. Netlify sets NETLIFY=true during its own
// builds, and BASE_PATH is the manual override for anywhere else.
const GITHUB_PAGES = '/b1-exam-simulator/'
const base = process.env.BASE_PATH ?? (process.env.NETLIFY ? '/' : GITHUB_PAGES)

export default defineConfig(({ command }) => ({
  // Dev keeps '/' so localhost URLs stay short.
  base: command === 'build' ? base : '/',
  plugins: [react()],
  server: { port: 5180 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
