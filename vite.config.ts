import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project repo from /<repo>/, so the built asset paths
// need that prefix. Dev keeps '/' so localhost URLs stay short.
const REPO = '/b1-exam-simulator/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPO : '/',
  plugins: [react()],
  server: { port: 5180 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
