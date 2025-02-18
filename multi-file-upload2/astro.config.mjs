import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// https://astro.build/config
//export default defineConfig({});
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  // 以下でビルドエラー解消する
  // vite: {
  //   ssr: {
  //     noExternal: ['path-to-regexp'],
  //   },
  // },
});