import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '#app': resolve(__dirname, 'node_modules/nuxt/dist/app'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['app/utils/**/*.ts'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
    },
  },
})
