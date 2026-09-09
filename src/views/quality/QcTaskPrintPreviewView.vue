<template>
  <div class="purchase-order-print-preview-page qc-task-print-preview-page" :class="pageClass">
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
            <div v-if="sheet.subtitle" class="sheet-subtitle">{{ sheet.subtitle }}</div>
            <div class="sheet-doc-no">单号：{{ sheet.qcNo || sheet.orderNo }}</div>
          </header>

          <section class="sheet-meta">
            <div
              v-for="field in sheet.basicFields"
              :key="`${index}-${field.label}`"
              class="meta-item"
              :class="{ 'meta-item-wide': field.wide }"
            >
              <span class="meta-label">{{ field.label }}</span>
              <span class="meta-value">{{ field.value || '—' }}</span>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">质检明细（按模板）</div>
            <div v-if="sheet.lineBlocks?.length">
              <div
                v-for="block in sheet.lineBlocks"
                :key="`${index}-line-${block.seq}`"
                class="line-block"
              >
                <div class="line-block-head">
                  <span class="line-seq">{{ block.seq }}.</span>
                  <span class="line-product">{{ block.productInfo }}</span>
                </div>
                <div class="line-meta">
                  <span>质检模板：{{ block.templateName || '—' }}</span>
                  <span>质检方式：{{ block.inspectMethod || '—' }}</span>
                  <span
                    >质检数量：{{ block.inspectQty || '—'
                    }}{{ block.unit ? ` ${block.unit}` : '' }}</span
                  >
                  <span>收货数量：{{ block.receiptQty || '—' }}</span>
                  <span>仓库：{{ block.receivingWarehouse || '—' }}</span>
                  <span>质检结果：{{ block.lineQcResult || '—' }}</span>
                  <span>处理方案：{{ block.treatmentPlan || '—' }}</span>
                  <span>合格入库：{{ block.acceptInboundQty || '—' }}</span>
                  <span>退/换货：{{ block.returnExchange || '—' }}</span>
                </div>

                <div v-if="block.inspectRows?.length" class="table-wrap">
                  <table class="sheet-table bom-table inspect-table">
                    <thead>
                      <tr>
                        <th style="width: 28%">检验项</th>
                        <th style="width: 28%">判定标准</th>
                        <th style="width: 28%">实测值</th>
                        <th style="width: 16%">判定</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(row, rIdx) in block.inspectRows"
                        :key="`${index}-${block.seq}-f-${rIdx}`"
                        :class="{ 'is-group': row.isGroup, 'is-child': row.isChild }"
                      >
                        <td>{{ row.name }}</td>
                        <td>{{ row.standard || '—' }}</td>
                        <td>{{ row.measured || '—' }}</td>
                        <td>{{ row.judge || '—' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else class="bom-empty">该行模板暂无检验项</div>
              </div>
            </div>
            <div v-else class="bom-empty">暂无质检明细</div>
            <div v-if="sheet.summary" class="print-summary">
              <span>明细行数：{{ sheet.summary.lineCount || '—' }}</span>
            </div>
          </section>

          <footer class="sheet-footer">
            <span>打印时间：{{ printedAtText }}</span>
            <span class="footer-sign">质检人：__________</span>
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
import { loadQcTaskPrintPayload } from '@/utils/qcTaskPrintPreview'
import { printElement } from '@/utils/browserPrint'

defineOptions({ name: 'QcTaskPrintPreviewView' })

const route = useRoute()
const printAreaRef = ref(null)

const payload = computed(() => loadQcTaskPrintPayload(route.query.key))

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
    title: printSheets.value[0]?.qcNo || '质检单',
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
.qc-task-print-preview-page {
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

.line-block {
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #d9d9d9;
}

.line-block:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.line-block-head {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #262626;
}

.line-seq {
  flex-shrink: 0;
}

.line-product {
  word-break: break-all;
}

.line-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-bottom: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.65);
}

.inspect-table tr.is-group td {
  font-weight: 600;
  background: #fafafa;
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

  .qc-task-print-preview-page {
    background: #fff;
    padding: 0;
  }
}
</style>
