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
    // 泵小智本地代理（agent-proxy），PAT 不进前端
    proxy: {
      '/agent-api': {
        target: 'http://127.0.0.1:3100',
        changeOrigin: true,
        pathRewrite: { '^/agent-api': '' },
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
