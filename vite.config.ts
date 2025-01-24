
/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';

export default defineConfig({
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  // add
  server: {
    proxy: {
      "/api": {
        target: "http://10.226.110.182:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
