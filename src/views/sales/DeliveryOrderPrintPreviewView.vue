<template>
  <div
    class="purchase-order-print-preview-page delivery-order-print-preview-page"
    :class="pageClass"
  >
    <div v-if="!payload" class="empty-wrap">
      <a-empty description="预览数据不存在或已过期，请返回重新打开预览" />
    </div>
    <template v-else>
      <div class="preview-toolbar no-print">
        <a-space>
          <a-button type="primary" @click="handlePrint">
            <PrinterOutlined />
            打印
          </a-button>
          <a-button @click="handleClose">关闭</a-button>
        </a-space>
      </div>

      <div ref="printAreaRef" class="preview-canvas">
        <article
          v-for="(sheet, index) in printSheets"
          :key="index"
          class="preview-sheet"
          :class="{ 'sheet-page-break': index > 0 }"
        >
          <header class="sheet-header">
            <h1 class="sheet-title">{{ sheet.title }}</h1>
            <div class="sheet-doc-no">单号：{{ sheet.deliveryCode || sheet.orderNo }}</div>
          </header>

          <section class="sheet-meta">
            <div
              v-for="field in sheet.basicFields"
              :key="`${index}-${field.label}`"
              class="meta-item"
              :class="{ 'meta-item-wide': field.wide }"
            >
              <span class="meta-label">{{ field.label }}</span>
              <span class="meta-value">{{ field.value }}</span>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">发货明细</div>
            <div v-if="sheet.lineItems?.length" class="table-wrap">
              <table class="sheet-table bom-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>产品名称</th>
                    <th>产品编码</th>
                    <th>本次发货</th>
                    <th>单价（不含税）</th>
                    <th>金额（不含税）</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sheet.lineItems" :key="`${index}-line-${row.seq}`">
                    <td class="cell-index">{{ row.seq }}</td>
                    <td>{{ row.productName }}</td>
                    <td>{{ row.productCode }}</td>
                    <td class="cell-num">{{ row.shipQty }}</td>
                    <td class="cell-num">{{ row.unitPriceExTax }}</td>
                    <td class="cell-num">{{ row.amountExTax }}</td>
                    <td>{{ row.remark }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="bom-empty">暂无发货明细</div>
            <div v-if="sheet.summary" class="print-summary">
              <span>明细行数：{{ sheet.summary.lineCount || '—' }}</span>
              <span>发货数量合计：{{ sheet.summary.totalQty || '—' }}</span>
              <span>不含税合计：{{ sheet.summary.amountExTax || '—' }}</span>
            </div>
          </section>

          <footer class="sheet-footer">
            <span>打印时间：{{ printedAtText }}</span>
            <span class="footer-sign">制单人：__________</span>
            <span class="footer-sign">审核人：__________</span>
          </footer>
        </article>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { loadDeliveryOrderPrintPayload } from '@/utils/deliveryOrderPrintPreview'
import { printElement } from '@/utils/browserPrint'

const route = useRoute()
const printAreaRef = ref(null)

const payload = computed(() => loadDeliveryOrderPrintPayload(route.query.key))

const printSheets = computed(() => {
  if (!payload.value) return []
  if (payload.value.sheets?.length) return payload.value.sheets
  return [payload.value]
})

const pageClass = computed(() => {
  const paper = payload.value?.paper || 'A4'
  const orientation = payload.value?.orientation || 'portrait'
  return [`paper-${paper}`, `orient-${orientation}`]
})

const printedAtText = computed(() => {
  const raw = payload.value?.printedAt
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString('zh-CN', { hour12: false })
})

function handlePrint() {
  if (!printAreaRef.value) return
  printElement(printAreaRef.value, {
    title: printSheets.value[0]?.deliveryCode || '发货单',
    paper: payload.value?.paper,
    orientation: payload.value?.orientation,
    bodyClass: 'purchase-order-print-iframe-body',
  })
}

function handleClose() {
  window.close()
}

onMounted(() => {
  if (route.query.autoPrint === '1' && payload.value) {
    window.setTimeout(() => handlePrint(), 300)
  }
})
</script>

<style>
html,
body,
#app {
  min-height: 100%;
  margin: 0;
}
</style>

<style src="@/styles/purchase-order-print-sheet.css"></style>

<style scoped>
.delivery-order-print-preview-page {
  min-height: 100vh;
  background: #e8e8e8;
  padding-bottom: 24px;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #f0f0f0;
}

.preview-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
}

.sheet-doc-no {
  margin-top: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.print-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

@media print {
  .no-print {
    display: none !important;
  }

  .delivery-order-print-preview-page {
    background: #fff;
    padding: 0;
  }
}
</style>
