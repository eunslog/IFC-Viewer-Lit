/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import Icons from 'unplugin-icons/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Components from 'unplugin-vue-components/vite';
import svgr from 'vite-plugin-svgr';


export default defineConfig({
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  // add
  plugins: [
    svgr(),
    Components({
      resolvers: [IconsResolver()],
    }),
    Icons({
      autoInstall: true, 
    }),
  ],
});
