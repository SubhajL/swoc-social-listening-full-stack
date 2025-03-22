/** @type {import('vite').UserConfig} */
const config = {
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': require('path').resolve(__dirname, './src')
    }
  },
  css: {}
};

module.exports = config; 