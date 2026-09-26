import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // scratchblocks/locales/all.js imports JSON without import attributes,
    // which Node rejects — let Vite transform the package instead.
    server: { deps: { inline: ['scratchblocks'] } },
  },
})
