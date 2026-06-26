<template>
  <div class="work-order-print-preview-page" :class="pageClass">
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

      <div class="preview-canvas">
        <article
          v-for="(sheet, index) in printSheets"
          :key="index"
          class="preview-sheet"
          :class="{ 'sheet-page-break': index > 0 }"
        >
          <header class="sheet-header">
            <h1 class="sheet-title">{{ sheet.productName }}</h1>
            <div class="sheet-subtitle">{{ sheet.orderCategory }}</div>
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

          <section v-if="sheet.processes.length" class="sheet-section">
            <div class="section-title">工序配置</div>
            <div class="table-wrap">
              <table class="sheet-table process-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>工序名称</th>
                    <th class="col-process-content">工序内容</th>
                    <th class="col-feeding">投料</th>
                    <th>执行者</th>
                    <th>完工日期</th>
                    <th>检验</th>
                    <th>备注</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sheet.processes" :key="`${index}-${row.seq}`">
                    <td class="cell-index">{{ row.seq }}</td>
                    <td>{{ row.name }}</td>
                    <td class="col-process-content">{{ row.processContent }}</td>
                    <td class="col-feeding">{{ row.feeding }}</td>
                    <td>{{ row.executors }}</td>
                    <td>{{ row.finishDate }}</td>
                    <td>{{ row.inspection }}</td>
                    <td>{{ row.remark }}</td>
                  </tr>
                </tbody>
              </table>
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
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { loadWorkOrderPrintPayload } from '@/utils/workOrderPrintPreview'

const route = useRoute()

const payload = computed(() => loadWorkOrderPrintPayload(route.query.key))

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
  window.print()
}

function handleClose() {
  window.close()
}

onMounted(() => {
  if (route.query.autoPrint === '1' && payload.value) {
    window.setTimeout(() => window.print(), 300)
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

<style lang="less" scoped>
.work-order-print-preview-page {
  min-height: 100vh;
  background: #ececec;
}

.empty-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.preview-canvas {
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  overflow-x: auto;
}

.preview-sheet {
  box-sizing: border-box;
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 18mm 14mm 16mm;
  color: #262626;
}

.sheet-page-break {
  margin-top: 8px;
}

.paper-A4.orient-portrait .preview-sheet {
  width: 210mm;
}

.paper-A4.orient-landscape .preview-sheet {
  width: 297mm;
}

.paper-A3.orient-portrait .preview-sheet {
  width: 297mm;
}

.paper-A3.orient-landscape .preview-sheet {
  width: 420mm;
}

.sheet-header {
  text-align: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 2px solid #262626;
}

.sheet-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
}

.sheet-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.sheet-status-row {
  margin-top: 8px;
}

.status-badge {
  display: inline-block;
  padding: 2px 10px;
  border: 1px solid #1677ff;
  border-radius: 4px;
  color: #1677ff;
  font-size: 12px;
}

.sheet-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-bottom: 14px;
  border: 1px solid #d9d9d9;
}

.meta-item {
  display: flex;
  min-height: 32px;
  border-right: 1px solid #d9d9d9;
  border-bottom: 1px solid #d9d9d9;

  &:nth-child(3n) {
    border-right: none;
  }

  &.meta-item-wide {
    grid-column: 1 / -1;
    border-right: none;
  }
}

.meta-label {
  flex: 0 0 88px;
  padding: 6px 8px;
  background: #fafafa;
  border-right: 1px solid #d9d9d9;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

.meta-value {
  flex: 1;
  padding: 6px 8px;
  font-size: 12px;
  word-break: break-word;
}

.sheet-section {
  margin-bottom: 14px;
}

.section-title {
  margin-bottom: 8px;
  padding-left: 8px;
  border-left: 3px solid #262626;
  font-size: 14px;
  font-weight: 600;
}

.table-wrap {
  overflow-x: auto;
}

.sheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;

  th,
  td {
    border: 1px solid #d9d9d9;
    padding: 5px 6px;
    text-align: left;
    word-break: break-word;
  }

  th {
    background: #fafafa;
    font-weight: 600;
  }

  .cell-index {
    width: 40px;
    text-align: center;
  }

  .cell-name {
    min-width: 100px;
  }

  .align-right {
    text-align: right;
  }
}

.process-table {
  table-layout: fixed;
  width: 100%;

  th:first-child,
  td:first-child {
    width: 48px;
    text-align: center;
  }

  .col-process-content {
    width: 22%;
    min-width: 120px;
  }

  .col-feeding {
    width: 26%;
    min-width: 140px;
  }
}

.sheet-footer {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-top: 18px;
  padding-top: 10px;
  border-top: 1px dashed #d9d9d9;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);

  .footer-sign {
    white-space: nowrap;
  }
}

@media print {
  .no-print {
    display: none !important;
  }

  .work-order-print-preview-page {
    background: #fff;
  }

  .preview-canvas {
    padding: 0;
  }

  .preview-sheet {
    box-shadow: none;
    width: 100% !important;
    padding: 10mm 8mm;
  }

  .sheet-page-break {
    page-break-before: always;
    margin-top: 0;
  }
}
</style>
