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
    bodyClass: 'bom-print-iframe-body',
  })
}

function handleClose() {
  // 脚本打开的窗口可 close；同页打开时回退上一页
  if (window.opener && !window.opener.closed) {
    window.close()
    return
  }
  if (window.history.length > 1) {
    window.history.back()
    return
  }
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

<style src="@/styles/bom-print-sheet.css"></style>

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

  @page {
    size: auto;
    margin: 10mm;
  }
}
</style>
