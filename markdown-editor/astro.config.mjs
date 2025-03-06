import node from '@astrojs/node'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'

// https://astro.build/config
export default defineConfig({
  // SSR type configuration
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: { port: 3000, host: true /* ホスティング時必須 */ },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()]
  }
})
