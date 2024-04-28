const { defineConfig } = require('@vue/cli-service')
require('./php-middleware.js');
const fs = require('fs');
module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost.pem'),
    },
    host: 'localhost',
    port: 8080,
    proxy: {
      '/api': {
        target: 'https://localhost:3001/',
        changeOrigin: true,
        logLevel: 'info',
        withCredentials: true
      }
    }
  }
})
