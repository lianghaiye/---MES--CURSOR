<template>
  <div
    class="purchase-order-print-preview-page outsourcing-order-print-preview-page"
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

          <!-- 派单工 -->
          <section v-if="isDispatchSheet(sheet)" class="sheet-section">
            <div class="section-title">外协加工明细</div>
            <div v-if="sheet.lineItems?.length" class="table-wrap">
              <table class="sheet-table bom-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>产品名称</th>
                    <th>编号</th>
                    <th>规格型号</th>
                    <th>材质</th>
                    <th>图号</th>
                    <th>计划数量</th>
                    <th>单位</th>
                    <th>计费方式</th>
                    <th>加工单价(含税)</th>
                    <th>加工总价(含税)</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sheet.lineItems" :key="`${index}-d-${row.seq}`">
                    <td class="cell-index">{{ row.seq }}</td>
                    <td>{{ row.productName }}</td>
                    <td>{{ row.productCode }}</td>
                    <td>{{ row.specModel }}</td>
                    <td>{{ row.material }}</td>
                    <td>{{ row.drawingNo }}</td>
                    <td class="cell-num">{{ row.planQty }}</td>
                    <td>{{ row.unit }}</td>
                    <td>{{ row.billingMethod }}</td>
                    <td class="cell-num">{{ row.unitPriceInTax }}</td>
                    <td class="cell-num">{{ row.totalPriceInTax }}</td>
                    <td>{{ row.remark }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="bom-empty">暂无加工明细</div>
            <div v-if="sheet.summary" class="print-summary">
              <span>明细行数：{{ sheet.summary.lineCount || '—' }}</span>
              <span>计划数量合计：{{ sheet.summary.totalQty || '—' }}</span>
              <span>加工总价(含税)：{{ sheet.summary.amountInTax || '—' }}</span>
              <span>加工总价(不含税)：{{ sheet.summary.amountExTax || '—' }}</span>
            </div>
          </section>

          <!-- 发料出库单 -->
          <section v-else class="sheet-section">
            <div class="section-title">发料明细</div>
            <div v-if="sheet.lineItems?.length" class="table-wrap">
              <table class="sheet-table bom-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>物料名称</th>
                    <th>编号</th>
                    <th>规格型号</th>
                    <th>材质</th>
                    <th>图号</th>
                    <th>计划数量</th>
                    <th>发料数量</th>
                    <th>单位</th>
                    <th>出货仓库</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sheet.lineItems" :key="`${index}-i-${row.seq}`">
                    <td class="cell-index">{{ row.seq }}</td>
                    <td>{{ row.productName }}</td>
                    <td>{{ row.productCode }}</td>
                    <td>{{ row.specModel }}</td>
                    <td>{{ row.material }}</td>
                    <td>{{ row.drawingNo }}</td>
                    <td class="cell-num">{{ row.planQty }}</td>
                    <td class="cell-num">{{ row.issueQty }}</td>
                    <td>{{ row.unit }}</td>
                    <td>{{ row.shipWarehouse }}</td>
                    <td>{{ row.remark }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="bom-empty">暂无发料明细</div>
            <div v-if="sheet.summary" class="print-summary">
              <span>明细行数：{{ sheet.summary.lineCount || '—' }}</span>
              <span>计划数量合计：{{ sheet.summary.totalQty || '—' }}</span>
            </div>
          </section>

          <footer class="sheet-footer">
            <span>打印时间：{{ printedAtText }}</span>
            <template v-if="isDispatchSheet(sheet)">
              <span class="footer-sign">制单人：__________</span>
              <span class="footer-sign">审核人：__________</span>
              <span class="footer-sign">供应商签收：__________</span>
            </template>
            <template v-else>
              <span class="footer-sign">仓管：__________</span>
              <span class="footer-sign">发料人：__________</span>
              <span class="footer-sign">领料人：__________</span>
            </template>
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
import {
  OUTSOURCING_PRINT_TEMPLATE,
  loadOutsourcingPrintPayload,
} from '@/utils/outsourcingOrderPrintPreview'
import { printElement } from '@/utils/browserPrint'

const route = useRoute()
const printAreaRef = ref(null)

const payload = computed(() => loadOutsourcingPrintPayload(route.query.key))

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

function isDispatchSheet(sheet) {
  return (
    (sheet?.templateType || payload.value?.templateType) === OUTSOURCING_PRINT_TEMPLATE.DISPATCH
  )
}

function handlePrint() {
  if (!printAreaRef.value) return
  printElement(printAreaRef.value, {
    title: printSheets.value[0]?.orderNo || '外协订单打印',
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
.outsourcing-order-print-preview-page {
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

  .outsourcing-order-print-preview-page {
    background: #fff;
    padding: 0;
  }
}
</style>
