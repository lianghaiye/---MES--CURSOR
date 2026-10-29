<template>
  <div
    class="purchase-order-print-preview-page purchase-settle-print-preview-page"
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
            <div class="sheet-doc-no">单号：{{ sheet.orderNo }}</div>
          </header>

          <section class="sheet-section">
            <div class="section-title">基本信息</div>
            <div class="sheet-meta">
              <div
                v-for="field in sheet.basicFields"
                :key="`${index}-basic-${field.label}`"
                class="meta-item"
                :class="{ 'meta-item-wide': field.wide }"
              >
                <span class="meta-label">{{ formatMetaLabel(field.label) }}</span>
                <span class="meta-value">{{ field.value || '—' }}</span>
              </div>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">开票信息</div>
            <div class="sheet-meta">
              <div
                v-for="field in sheet.invoiceFields || []"
                :key="`${index}-inv-${field.label}`"
                class="meta-item"
                :class="{ 'meta-item-wide': field.wide }"
              >
                <span class="meta-label">{{ formatMetaLabel(field.label) }}</span>
                <span class="meta-value">{{ field.value || '—' }}</span>
              </div>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">付款信息</div>
            <div class="sheet-meta">
              <div
                v-for="field in sheet.paymentFields || []"
                :key="`${index}-pay-${field.label}`"
                class="meta-item"
                :class="{ 'meta-item-wide': field.wide }"
              >
                <span class="meta-label">{{ formatMetaLabel(field.label) }}</span>
                <span class="meta-value">{{ field.value || '—' }}</span>
              </div>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">资金概览</div>
            <div class="fund-overview-formula">
              <div class="fund-metric">
                <div class="fund-metric__label">期末余额（元）</div>
                <div class="fund-metric__value is-end">
                  {{ sheet.fundOverview?.endingBalance || '—' }}
                </div>
              </div>
              <div class="fund-op">=</div>
              <div class="fund-metric">
                <div class="fund-metric__label">期初余额（元）</div>
                <div class="fund-metric__value">
                  {{ sheet.fundOverview?.openingBalance || '—' }}
                </div>
              </div>
              <div class="fund-op">+</div>
              <div class="fund-metric">
                <div class="fund-metric__label">本期应付（元）</div>
                <div class="fund-metric__value">
                  {{ sheet.fundOverview?.periodPayable || '—' }}
                </div>
              </div>
              <div class="fund-op">−</div>
              <div class="fund-metric">
                <div class="fund-metric__label">本期实付（元）</div>
                <div class="fund-metric__value">
                  {{ sheet.fundOverview?.periodPaid || '—' }}
                </div>
              </div>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">结算明细</div>
            <div v-if="sheet.lineItems?.length" class="table-wrap">
              <table class="sheet-table bom-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>采购单号</th>
                    <th>编码</th>
                    <th>品名</th>
                    <th>规格型号</th>
                    <th>材质</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>金额</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sheet.lineItems" :key="`${index}-line-${row.seq}`">
                    <td class="cell-index">{{ row.seq }}</td>
                    <td>{{ row.purchaseOrderNo }}</td>
                    <td>{{ row.itemCode }}</td>
                    <td>{{ row.itemName }}</td>
                    <td>{{ row.specModel }}</td>
                    <td>{{ row.material }}</td>
                    <td class="cell-num">{{ row.qtyText }}</td>
                    <td class="cell-num">{{ row.unitPrice }}</td>
                    <td class="cell-num">{{ row.amount }}</td>
                    <td>{{ row.remark }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="bom-empty">暂无结算明细</div>
            <div v-if="sheet.summary" class="print-summary">
              <span>明细行数：{{ sheet.summary.lineCount || '—' }}</span>
              <span>账面金额：{{ sheet.summary.bookAmount || '—' }}</span>
              <span>确认金额：{{ sheet.summary.confirmedAmount || '—' }}</span>
            </div>
          </section>

          <footer class="sheet-footer">
            <span>打印时间：{{ printedAtText }}</span>
            <span class="footer-sign">制单人：__________</span>
            <span class="footer-sign">确认人：__________</span>
          </footer>
        </article>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'PurchaseSettlePrintPreviewView' }
</script>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { loadPurchaseSettlePrintPayload } from '@/utils/purchaseSettlePrintPreview'
import { printElement } from '@/utils/browserPrint'

const route = useRoute()
const printAreaRef = ref(null)

const payload = computed(() => loadPurchaseSettlePrintPayload(route.query.key))

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

/** 兼容旧预览缓存里的「对账联系人 / 供应商联系人」 */
function formatMetaLabel(label) {
  if (label === '对账联系人' || label === '供应商联系人') return '联系人'
  return label || ''
}

function handlePrint() {
  if (!printAreaRef.value) return
  printElement(printAreaRef.value, {
    title: printSheets.value[0]?.orderNo || '采购对账单',
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
.purchase-settle-print-preview-page {
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
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid #f0f0f0;
  backdrop-filter: blur(6px);
}

.preview-canvas {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 20px 16px;
}
</style>

<style>
.purchase-order-print-preview-page .fund-overview-formula,
.purchase-order-print-iframe-body .fund-overview-formula {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 14px 16px;
  border: 1px solid #eceff3;
  border-radius: 8px;
  background: #fff;
}

.purchase-order-print-preview-page .fund-metric,
.purchase-order-print-iframe-body .fund-metric {
  min-width: 96px;
}

.purchase-order-print-preview-page .fund-metric__label,
.purchase-order-print-iframe-body .fund-metric__label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 4px;
}

.purchase-order-print-preview-page .fund-metric__value,
.purchase-order-print-iframe-body .fund-metric__value {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #d48806;
  line-height: 1.2;
}

.purchase-order-print-preview-page .fund-metric__value.is-end,
.purchase-order-print-iframe-body .fund-metric__value.is-end {
  color: #cf1322;
}

.purchase-order-print-preview-page .fund-op,
.purchase-order-print-iframe-body .fund-op {
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.25);
  padding-top: 14px;
}
</style>
