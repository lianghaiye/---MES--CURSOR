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

      <div ref="printAreaRef" class="preview-canvas">
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

          <section v-if="sheet.includeBom" class="sheet-section">
            <div class="section-title">BOM 清单</div>
            <div v-if="sheet.bomLines?.length" class="table-wrap">
              <table class="sheet-table bom-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>物料名称</th>
                    <th>编号</th>
                    <th>规格型号</th>
                    <th>材质</th>
                    <th>图号</th>
                    <th>下料尺寸</th>
                    <th>单位用量</th>
                    <th>单位</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in sheet.bomLines" :key="`${index}-bom-${row.seq}`">
                    <td class="cell-index">{{ row.seq }}</td>
                    <td>{{ row.itemName }}</td>
                    <td>{{ row.itemCode }}</td>
                    <td>{{ row.specModel }}</td>
                    <td>{{ row.material }}</td>
                    <td>{{ row.drawingNo }}</td>
                    <td>{{ row.blankSizeText }}</td>
                    <td class="cell-num">{{ row.unitQty }}</td>
                    <td>{{ row.unit }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-else class="bom-empty">暂无 BOM 物料</div>
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
import { loadWorkOrderPrintPayload } from '@/utils/workOrderPrintPreview'
import { printElement } from '@/utils/browserPrint'

const route = useRoute()
const printAreaRef = ref(null)

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
  if (!printAreaRef.value) return
  printElement(printAreaRef.value, {
    title: printSheets.value[0]?.productName || '生产工单',
    paper: payload.value?.paper,
    orientation: payload.value?.orientation,
    bodyClass: 'work-order-print-iframe-body',
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

<style src="@/styles/work-order-print-sheet.css"></style>

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
}
</style>
