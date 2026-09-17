<template>
  <div class="sn-lookup">
    <header class="sn-lookup__header">
      <h1 class="sn-lookup__title">扫 SN 查单</h1>
    </header>

    <section class="sn-lookup__body">
      <div class="sn-lookup__scan">
        <a-button type="primary" block size="large" :loading="scanning" @click="toggleScan">
          {{ scanning ? '关闭摄像头' : '打开摄像头扫码' }}
        </a-button>
        <div v-if="scanning" class="sn-lookup__video-wrap">
          <video ref="videoRef" class="sn-lookup__video" playsinline muted autoplay />
          <p class="sn-lookup__hint">将条码对准取景框</p>
        </div>
      </div>

      <div class="sn-lookup__manual">
        <a-input
          v-model:value="snInput"
          size="large"
          allow-clear
          placeholder="输入完整工业 SN"
          @pressEnter="handleQuery"
        />
        <a-button
          type="primary"
          size="large"
          block
          class="sn-lookup__query-btn"
          @click="handleQuery"
        >
          查询
        </a-button>
      </div>

      <a-alert
        v-if="errorMessage"
        type="warning"
        show-icon
        :message="errorMessage"
        class="sn-lookup__alert"
      />

      <div v-if="resultCard" class="sn-lookup__card">
        <div class="sn-lookup__card-row">
          <span class="label">销售单号</span>
          <a class="value link" @click.prevent="openSalesOrder">{{ resultCard.orderNo }}</a>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">客户</span>
          <span class="value">{{ resultCard.customerName }}</span>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">产品</span>
          <span class="value">
            {{ resultCard.productName }}
            <template v-if="resultCard.productCode">
              <span class="muted">（{{ resultCard.productCode }}）</span>
            </template>
          </span>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">规格</span>
          <span class="value">{{ resultCard.specModel }}</span>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">行发货状态</span>
          <span class="value">{{ resultCard.lineDeliveryStatus }}</span>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">SN</span>
          <span class="value">{{ resultCard.labelCode }}</span>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">标识状态</span>
          <a-tag :color="resultCard.labelStatus === '有效' ? 'success' : 'default'">
            {{ resultCard.labelStatus }}
          </a-tag>
        </div>
        <div class="sn-lookup__card-row">
          <span class="label">装牌状态</span>
          <a-tag :color="resultCard.mounted ? 'success' : 'orange'">
            {{ resultCard.mountText }}
          </a-tag>
        </div>
        <a-button block class="sn-lookup__reset" @click="resetAll">再扫一单</a-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { salesOrderState } from '@/store/salesOrderStore'
import { resolveSalesLineDeliveryStatus } from '@/utils/salesOrderLineList'
import { lookupSalesBySn, normalizeSnCode } from '@/utils/salesSnLookup'

const route = useRoute()
const router = useRouter()

const snInput = ref('')
const errorMessage = ref('')
const resultCard = ref(null)
const scanning = ref(false)
const videoRef = ref(null)

let mediaStream = null
let detectTimer = null
let barcodeDetector = null

function isEngraved(label) {
  return Boolean(label?.nameplateMountedAt || label?.engraveStatus === '已刻录')
}

function buildResultCard(label, salesLineId) {
  void salesOrderState.orders
  const order =
    (salesOrderState.orders || []).find((o) =>
      (o.lineItems || []).some((l) => l.id === salesLineId),
    ) ||
    (salesOrderState.orders || []).find((o) => o.id === label.salesOrderId) ||
    null
  const line = (order?.lineItems || []).find((l) => l.id === salesLineId) || null
  const mounted = isEngraved(label)
  return {
    orderId: order?.id || label.salesOrderId || '',
    orderNo: order?.orderNo || label.salesOrderNo || '—',
    customerName: order?.customerName || '—',
    productName: line?.productName || label.productName || '—',
    productCode: line?.productCode || label.productCode || '',
    specModel: line?.specModel || line?.variantSummary || '—',
    lineDeliveryStatus: order && line ? resolveSalesLineDeliveryStatus(order, line) : '—',
    labelCode: label.labelCode || '—',
    labelStatus: label.status || '—',
    mounted,
    mountText: mounted ? '已刻录' : label.engraveStatus || '待刻录',
  }
}

function handleQuery() {
  const code = normalizeSnCode(snInput.value)
  snInput.value = code
  errorMessage.value = ''
  resultCard.value = null

  const res = lookupSalesBySn(code, { fuzzy: false })
  if (!res.ok) {
    errorMessage.value = res.message || '未找到匹配 SN'
    return
  }

  const label = res.matchedLabels[0]
  const salesLineId = res.salesLineIds[0]
  if (!label || !salesLineId) {
    errorMessage.value = '未找到匹配 SN'
    return
  }

  resultCard.value = buildResultCard(label, salesLineId)
  stopScan()
}

function openSalesOrder() {
  const id = resultCard.value?.orderId
  if (!id) {
    message.warning('未找到销售订单')
    return
  }
  router.push({ name: 'sales-orders-detail', params: { id } })
}

function resetAll() {
  snInput.value = ''
  errorMessage.value = ''
  resultCard.value = null
  stopScan()
}

function stopDetectLoop() {
  if (detectTimer != null) {
    clearInterval(detectTimer)
    detectTimer = null
  }
}

function stopScan() {
  stopDetectLoop()
  barcodeDetector = null
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop())
    mediaStream = null
  }
  scanning.value = false
}

async function startDetectLoop(video) {
  if (typeof window.BarcodeDetector !== 'function') {
    stopScan()
    message.warning('请改用手输')
    return
  }
  try {
    barcodeDetector = new window.BarcodeDetector({
      formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'codabar'],
    })
  } catch {
    stopScan()
    message.warning('请改用手输')
    return
  }

  stopDetectLoop()
  detectTimer = setInterval(async () => {
    if (!barcodeDetector || !video || video.readyState < 2) return
    try {
      const codes = await barcodeDetector.detect(video)
      const raw = codes?.[0]?.rawValue
      if (!raw) return
      snInput.value = normalizeSnCode(raw)
      handleQuery()
    } catch {
      // 单帧失败忽略，继续轮询
    }
  }, 400)
}

async function toggleScan() {
  if (scanning.value) {
    stopScan()
    return
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    message.warning('请改用手输')
    return
  }

  if (typeof window.BarcodeDetector !== 'function') {
    message.warning('请改用手输')
    return
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    })
    scanning.value = true
    await nextTick()
    const video = videoRef.value
    if (!video) {
      stopScan()
      message.warning('请改用手输')
      return
    }
    video.srcObject = mediaStream
    await video.play().catch(() => {})
    await startDetectLoop(video)
  } catch {
    stopScan()
    message.warning('请改用手输')
  }
}

onMounted(() => {
  const q = normalizeSnCode(route.query.sn)
  if (q) {
    snInput.value = q
    handleQuery()
  }
})

onUnmounted(() => {
  stopScan()
})
</script>

<style scoped>
.sn-lookup {
  min-height: 100vh;
  background: #f5f6f8;
  color: #1f2329;
}

.sn-lookup__header {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}

.sn-lookup__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

.sn-lookup__body {
  padding: 16px;
  max-width: 480px;
  margin: 0 auto;
}

.sn-lookup__scan {
  margin-bottom: 16px;
}

.sn-lookup__video-wrap {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
}

.sn-lookup__video {
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: cover;
}

.sn-lookup__hint {
  margin: 0;
  padding: 8px;
  text-align: center;
  font-size: 12px;
  color: #fff;
  background: rgba(0, 0, 0, 0.65);
}

.sn-lookup__manual {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.sn-lookup__query-btn {
  margin-top: 0;
}

.sn-lookup__alert {
  margin-bottom: 16px;
}

.sn-lookup__card {
  background: #fff;
  border-radius: 10px;
  padding: 14px 16px 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.sn-lookup__card-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.sn-lookup__card-row:last-of-type {
  border-bottom: none;
}

.sn-lookup__card-row .label {
  flex: 0 0 88px;
  color: #8c8c8c;
}

.sn-lookup__card-row .value {
  flex: 1;
  word-break: break-all;
}

.sn-lookup__card-row .link {
  color: #1677ff;
}

.sn-lookup__card-row .muted {
  color: #8c8c8c;
  font-size: 12px;
}

.sn-lookup__reset {
  margin-top: 12px;
}
</style>
