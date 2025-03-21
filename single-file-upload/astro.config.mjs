import { defineConfig } from 'astro/config';
import node from '@astrojs/node'

// https://astro.build/config
export default defineConfig({
   // SSR type configuration
   output: 'server',
   adapter: node({
     mode: 'standalone'
   }),
   server: { port: 3000, host: true /* ホスティング時必須 */ },
});
