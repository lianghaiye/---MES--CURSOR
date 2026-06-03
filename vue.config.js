const { defineConfig } = require('@vue/cli-service')

const isProd = process.env.NODE_ENV === 'production'
const publicPath = isProd ? '/---MES--CURSOR/' : '/'

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath,
  devServer: {
    port: 8080,
    open: true,
    client: {
      overlay: {
        errors: true,
        warnings: false,
        runtimeErrors: (error) => !/ResizeObserver loop/.test(error?.message || ''),
      },
    },
  },
  css: {
    loaderOptions: {
      less: {
        lessOptions: {
          javascriptEnabled: true,
        },
      },
    },
  },
})
