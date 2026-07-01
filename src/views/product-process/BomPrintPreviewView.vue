<template>
  <div class="bom-print-preview-page" :class="pageClass">
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
          <a-button v-if="isProductionPlanPrint" @click="printColumnDrawerOpen = true">
            <SettingOutlined />
            设置打印项
          </a-button>
          <a-button @click="handleClose">关闭</a-button>
        </a-space>
      </div>

      <div class="preview-canvas">
        <article ref="sheetRef" class="preview-sheet">
          <header class="sheet-header">
            <h1 class="sheet-title">{{ payload.rootItemName }}</h1>
            <div class="sheet-subtitle">BOM清单</div>
          </header>

          <section class="sheet-meta">
            <div class="meta-item">
              <span class="meta-label">BOM编码</span>
              <span class="meta-value">{{ displayInfo.bomNo }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">规格型号</span>
              <span class="meta-value">{{ displayInfo.specModel }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">BOM版本号</span>
              <span class="meta-value">{{ displayInfo.version }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">材质</span>
              <span class="meta-value">{{ displayInfo.material }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">图号</span>
              <span class="meta-value">{{ displayInfo.drawingNo }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">数量</span>
              <span class="meta-value">{{ formatPrintQty(payload.quantity) }}</span>
            </div>
            <div class="meta-item meta-item-wide">
              <span class="meta-label">技术参数</span>
              <span class="meta-value">{{ displayInfo.techParams }}</span>
            </div>
            <div class="meta-item meta-item-wide">
              <span class="meta-label">配置要求</span>
              <span class="meta-value">{{ displayInfo.matchingRequirements }}</span>
            </div>
          </section>

          <section class="sheet-section">
            <div class="section-title">组件</div>
            <div class="table-wrap">
              <table class="sheet-table" :class="tableDensityClass">
                <colgroup>
                  <col v-for="col in payload.columns" :key="col.key" :class="`col-${col.key}`" />
                </colgroup>
                <thead>
                  <tr>
                    <th v-for="col in payload.columns" :key="col.key">
                      {{ col.title }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in payload.rows" :key="row.key">
                    <td
                      v-for="col in payload.columns"
                      :key="col.key"
                      :class="{
                        'cell-index': col.key === 'index',
                        'cell-name': col.key === 'itemName',
                        'align-right': col.align === 'right',
                      }"
                    >
                      <span
                        v-if="col.key === 'itemName'"
                        class="name-text"
                        :style="{ paddingLeft: `${row.depth * 12}px` }"
                      >
                        {{ row.itemName ?? '—' }}
                      </span>
                      <span v-else-if="col.key === 'unitQty'">{{
                        formatPrintQty(row.unitQty)
                      }}</span>
                      <span v-else-if="col.key === 'stockQty' || col.key === 'demandQty'">{{
                        formatPrintQty(row[col.key])
                      }}</span>
                      <span v-else class="cell-text">{{ row[col.dataIndex] ?? '—' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <footer class="sheet-footer">
            <span>打印时间：{{ printedAtText }}</span>
          </footer>
        </article>
      </div>
    </template>

    <TableColumnSettingDrawer
      v-if="isProductionPlanPrint"
      v-model:open="printColumnDrawerOpen"
      v-model:settings="printColumnSettings"
      :default-settings="printDefaultColumnSettings"
      title="设置打印项"
      hint="调整打印清单中显示的字段；隐藏列不会出现在预览与打印输出中。"
      :show-frozen="false"
      @update:settings="applyPrintColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'BomPrintPreviewView' }
</script>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { PrinterOutlined, SettingOutlined } from '@ant-design/icons-vue'
import {
  buildBomPrintPayload,
  formatPrintQty,
  loadBomPrintPayload,
  updateBomPrintPayload,
} from '@/utils/bomPrintPreview'
import { printElement } from '@/utils/browserPrint'
import {
  PRODUCTION_PLAN_PRINT_COLUMN_STORAGE_KEY,
  productionPlanPrintColumnSettings,
} from '@/mock/productionPlanPrintColumns'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'

const COLUMN_STORAGE_PREFIX = 'i_doms_table_col_'

const route = useRoute()
const payload = ref(null)
const sheetRef = ref(null)
const printColumnDrawerOpen = ref(false)
const printColumnSettings = ref([])

const isProductionPlanPrint = computed(
  () => payload.value?.printConfig?.scene === 'production-plan',
)

const printDefaultColumnSettings = computed(() =>
  JSON.parse(JSON.stringify(productionPlanPrintColumnSettings)),
)

const pageClass = computed(() => {
  if (!payload.value) return ''
  return [
    `paper-${payload.value.paper || 'A4'}`,
    `orient-${payload.value.orientation || 'portrait'}`,
  ]
})

const tableDensityClass = computed(() => {
  const count = payload.value?.columns?.length || 0
  if (count >= 12) return 'density-compact'
  if (count >= 9) return 'density-normal'
  return 'density-comfortable'
})

const displayInfo = computed(() => ({
  bomNo: payload.value?.overviewInfo?.bomNo || '—',
  specModel: payload.value?.overviewInfo?.specModel || '—',
  version: payload.value?.overviewInfo?.version || '—',
  material: payload.value?.overviewInfo?.material || '—',
  drawingNo: payload.value?.overviewInfo?.drawingNo || '—',
  techParams: payload.value?.overviewInfo?.techParams || '—',
  matchingRequirements: payload.value?.overviewInfo?.matchingRequirements || '—',
}))

const printedAtText = computed(() => {
  const raw = payload.value?.printedAt
  if (!raw) return '—'
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-CN', { hour12: false })
})

onMounted(() => {
  payload.value = loadBomPrintPayload(route.query.key)
  initPrintColumnSettings()
  if (route.query.autoPrint === '1') {
    window.setTimeout(() => handlePrint(), 300)
  }
})

function initPrintColumnSettings() {
  if (!isProductionPlanPrint.value) return
  const cfg = payload.value?.printConfig
  printColumnSettings.value = cfg?.columnSettings?.length
    ? JSON.parse(JSON.stringify(cfg.columnSettings))
    : JSON.parse(JSON.stringify(printDefaultColumnSettings.value))
}

function applyPrintColumnSettings(settings) {
  const cfg = payload.value?.printConfig
  if (!cfg) return
  const nextSettings = JSON.parse(JSON.stringify(settings))
  printColumnSettings.value = nextSettings
  localStorage.setItem(
    COLUMN_STORAGE_PREFIX + PRODUCTION_PLAN_PRINT_COLUMN_STORAGE_KEY,
    JSON.stringify(nextSettings),
  )
  const nextPayload = buildBomPrintPayload({
    flatNodes: cfg.flatNodes,
    lineItems: cfg.lineItems,
    rootItemName: cfg.rootItemName,
    overviewInfo: cfg.overviewInfo,
    quantity: cfg.quantity,
    columnSettings: nextSettings,
    baseColumns: cfg.baseColumns,
    paper: cfg.paper,
    orientation: cfg.orientation,
    materialQtyByCode: cfg.materialQtyByCode,
    printScene: cfg.scene,
  })
  payload.value = nextPayload
  updateBomPrintPayload(route.query.key, nextPayload)
}

function handlePrint() {
  if (!sheetRef.value) return
  printElement(sheetRef.value, {
    title: payload.value?.rootItemName || 'BOM清单',
    paper: payload.value?.paper,
    orientation: payload.value?.orientation,
  })
}

function handleClose() {
  window.close()
}
</script>

<style lang="less">
html,
body,
#app {
  min-height: 100%;
  margin: 0;
}
</style>

<style lang="less" scoped>
.bom-print-preview-page {
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
  justify-content: center;
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
}

.meta-item-wide {
  grid-column: span 3;
  border-right: none;
}

.meta-label {
  flex: 0 0 76px;
  padding: 6px 8px;
  background: #fafafa;
  color: rgba(0, 0, 0, 0.65);
  border-right: 1px solid #d9d9d9;
  font-size: 11px;
}

.meta-value {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  font-size: 11px;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}

.section-title {
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
}

.table-wrap {
  width: 100%;
  overflow: hidden;
}

.sheet-table {
  width: 100%;
  max-width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 10px;
  line-height: 1.45;

  th,
  td {
    border: 1px solid #d9d9d9;
    padding: 4px 5px;
    vertical-align: top;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  th {
    background: #fafafa;
    font-weight: 600;
    text-align: left;
    font-size: 10px;
  }

  .col-index {
    width: 8%;
  }

  .col-itemName {
    width: 18%;
  }

  .col-supplyUnit {
    width: 14%;
  }

  .cell-index {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .cell-text,
  .name-text {
    display: block;
    word-break: break-word;
    overflow-wrap: anywhere;
    white-space: normal;
  }

  .align-right {
    text-align: right;
  }

  &.density-normal {
    font-size: 9px;

    th {
      font-size: 9px;
    }
  }

  &.density-compact {
    font-size: 8px;

    th,
    td {
      padding: 3px 4px;
    }

    th {
      font-size: 8px;
    }
  }
}

.sheet-footer {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #d9d9d9;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
}

@media print {
  .no-print {
    display: none !important;
  }

  .bom-print-preview-page {
    background: #fff;
  }

  .preview-canvas {
    padding: 0;
    overflow: visible;
  }

  .preview-sheet {
    box-shadow: none;
    margin: 0 auto;
  }

  @page {
    size: auto;
    margin: 10mm;
  }
}
</style>
