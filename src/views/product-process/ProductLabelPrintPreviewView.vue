<template>
  <div class="product-label-print-page">
    <div class="toolbar no-print">
      <a-space>
        <a-button type="primary" @click="handlePrint">
          <PrinterOutlined />
          打印
        </a-button>
        <a-button @click="goBack">关闭</a-button>
      </a-space>
      <span class="toolbar-hint">共 {{ labels.length }} 张标签 · 二维码=产品编码</span>
    </div>

    <div v-if="!labels.length" class="empty no-print">
      <a-empty description="无打印数据，请从产品信息重新选择后打印" />
    </div>

    <div v-else class="label-sheet">
      <div v-for="(label, idx) in labels" :key="`${label.code}-${idx}`" class="label-card">
        <div class="label-qr">
          <img v-if="qrMap[label.code]" :src="qrMap[label.code]" alt="QR" />
        </div>
        <div class="label-meta">
          <div class="label-code">{{ label.code }}</div>
          <div class="label-name" :title="label.name">{{ label.name || '—' }}</div>
          <div v-if="label.specModel" class="label-sub">规格 {{ label.specModel }}</div>
          <div v-if="label.material" class="label-sub">材质 {{ label.material }}</div>
          <div v-if="label.inventoryUnit" class="label-sub">单位 {{ label.inventoryUnit }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { PrinterOutlined } from '@ant-design/icons-vue'
import QRCode from 'qrcode'
import { loadProductLabelPrintPayload } from '@/utils/productLabelPrintPreview'
import { useTabs } from '@/composables/useTabs'

defineOptions({ name: 'ProductLabelPrintPreviewView' })

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const payload = ref(null)
const qrMap = reactive({})

const labels = computed(() => {
  const items = payload.value?.items || []
  const copies = Math.min(99, Math.max(1, Number(payload.value?.copies) || 1))
  const out = []
  items.forEach((item) => {
    for (let i = 0; i < copies; i += 1) out.push(item)
  })
  return out
})

async function ensureQr(code) {
  if (!code || qrMap[code]) return
  try {
    qrMap[code] = await QRCode.toDataURL(code, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
    })
  } catch (err) {
    console.error('[product-label] qr failed', code, err)
  }
}

onMounted(async () => {
  const token = String(route.query.token || '')
  payload.value = loadProductLabelPrintPayload(token)
  if (!payload.value?.items?.length) {
    message.warning('打印数据已失效，请重新选择产品后打印')
    return
  }
  const codes = [...new Set(payload.value.items.map((i) => i.code).filter(Boolean))]
  await Promise.all(codes.map((c) => ensureQr(c)))
})

function handlePrint() {
  window.print()
}

function goBack() {
  closeTab(route.fullPath || route.path)
  router.push('/product-process/products')
}
</script>

<style lang="less" scoped>
.product-label-print-page {
  min-height: 100%;
  padding: 12px 16px 24px;
  background: #f5f6f8;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.toolbar-hint {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.empty {
  padding: 48px 0;
  background: #fff;
  border-radius: 8px;
}

.label-sheet {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.label-card {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  page-break-inside: avoid;
}

.label-qr {
  flex-shrink: 0;
  width: 96px;
  height: 96px;

  img {
    width: 100%;
    height: 100%;
    display: block;
  }
}

.label-meta {
  min-width: 0;
  flex: 1;
}

.label-code {
  font-size: 14px;
  font-weight: 700;
  color: #000;
  word-break: break-all;
}

.label-name {
  margin-top: 4px;
  font-size: 13px;
  color: #262626;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.label-sub {
  margin-top: 2px;
  font-size: 12px;
  color: #595959;
}

@media print {
  .product-label-print-page {
    padding: 0;
    background: #fff;
  }

  .no-print {
    display: none !important;
  }

  .label-sheet {
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .label-card {
    border: 1px solid #000;
    border-radius: 0;
  }
}
</style>
