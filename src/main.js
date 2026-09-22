import '@/utils/storageBootstrap'
import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import { isQuotaExceededError } from '@/utils/safeStorage'
import App from './App.vue'
import router from './router'
import 'ant-design-vue/dist/reset.css'
import './styles/global.less'
import '@/store/productInfoStore'
import '@/store/materialInfoStore'
import '@/store/stockBatchStore'
import { bootstrapSpuSkuData } from '@/utils/spuBootstrap'
import { initUiAppearance } from '@/store/uiAppearanceStore'
import { startPurchaseSettleRuleScheduler } from '@/utils/purchaseSettleRuleScheduler'

bootstrapSpuSkuData()
initUiAppearance()
startPurchaseSettleRuleScheduler()

const RESIZE_OBSERVER_ERR = /ResizeObserver loop/

function isResizeObserverNoise(message) {
  return RESIZE_OBSERVER_ERR.test(message || '')
}

function isIgnorableRuntimeError(err) {
  if (isQuotaExceededError(err)) return true
  const msg = err?.message || String(err || '')
  return isResizeObserverNoise(msg)
}

// 开发环境：屏蔽无害 ResizeObserver / 配额告警打断操作
window.addEventListener(
  'error',
  (event) => {
    if (
      isIgnorableRuntimeError({
        message: event.message,
        name: event.error?.name,
        code: event.error?.code,
      })
    ) {
      event.stopImmediatePropagation()
      event.preventDefault()
    }
  },
  true,
)

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  if (
    isIgnorableRuntimeError(reason) ||
    isResizeObserverNoise(reason?.message || String(reason || ''))
  ) {
    event.preventDefault()
  }
})

const app = createApp(App)

app.config.errorHandler = (err) => {
  if (isIgnorableRuntimeError(err)) return
  console.error(err)
}

app.use(router)
app.use(Antd)
app.mount('#app')
