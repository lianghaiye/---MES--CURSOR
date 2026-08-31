import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import App from './App.vue'
import router from './router'
import 'ant-design-vue/dist/reset.css'
import './styles/global.less'
import '@/store/productInfoStore'
import '@/store/materialInfoStore'
import '@/store/stockBatchStore'
import { bootstrapSpuSkuData } from '@/utils/spuBootstrap'
import { initUiAppearance } from '@/store/uiAppearanceStore'

bootstrapSpuSkuData()
initUiAppearance()

const RESIZE_OBSERVER_ERR = /ResizeObserver loop/

function isResizeObserverNoise(message) {
  return RESIZE_OBSERVER_ERR.test(message || '')
}

// 开发环境：屏蔽 Ant Design 表格/树触发的无害 ResizeObserver 告警
window.addEventListener(
  'error',
  (event) => {
    if (isResizeObserverNoise(event.message)) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  },
  true,
)

window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '')
  if (isResizeObserverNoise(msg)) {
    event.preventDefault()
  }
})

const app = createApp(App)

app.config.errorHandler = (err) => {
  if (isResizeObserverNoise(err?.message || String(err))) return
  console.error(err)
}

app.use(router)
app.use(Antd)
app.mount('#app')
