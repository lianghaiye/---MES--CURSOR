<template>
  <div class="demand-calc-page">
    <div class="page-card">
      <div class="page-head">
        <div>
          <div class="page-title">需求计算</div>
          <div class="page-desc">
            可选销售订单后在订单明细中切换产品；未选订单时可直接从产品主数据选择。按 BOM
            对照当前库存计算缺口。
          </div>
        </div>
      </div>

      <a-form layout="inline" class="filter-form horizontal-form" :model="form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="销售订单">
              <a-input
                :value="form.salesOrderNo"
                allow-clear
                size="small"
                placeholder="可选，点击选择"
                readonly
                @click="salesOrderOpen = true"
                @update:value="onSalesOrderInput"
              >
                <template #suffix>
                  <SearchOutlined class="picker-icon" @click.stop="salesOrderOpen = true" />
                </template>
              </a-input>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="产品名称" required>
              <a-select
                v-if="hasSalesOrder"
                v-model:value="form.salesLineId"
                size="small"
                placeholder="请选择销售明细产品"
                :options="salesLineOptions"
                allow-clear
                style="width: 100%"
                @change="onSalesLineChange"
              />
              <ProductMaterialSelect
                v-else
                v-model="form.productName"
                placeholder="请选择产品"
                @select="onProductSelect"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="产品BOM">
              <a-input
                :value="form.bomLabel"
                size="small"
                readonly
                placeholder="选择产品后自动带入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="订单数量" required>
              <a-input-number
                v-model:value="form.orderQty"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                size="small"
                style="width: 100%"
                placeholder="数量"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item label="送货日期">
              <a-date-picker
                v-model:value="form.deliveryDate"
                value-format="YYYY-MM-DD"
                size="small"
                style="width: 100%"
                placeholder="选填"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button
                  type="primary"
                  size="small"
                  :loading="calculating"
                  :disabled="!form.bomId"
                  @click="handleCalculate"
                >
                  计算需求
                </a-button>
                <a-button size="small" @click="handleClear">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="page-card table-card">
      <div class="table-toolbar">
        <div class="table-meta" v-if="resultMeta.calculatedAt">
          <span>产品BOM：{{ resultMeta.bomLabel || '—' }}</span>
          <span>计算数量：{{ formatQty(resultMeta.orderQty) }}</span>
          <span>计算时间：{{ resultMeta.calculatedAt }}</span>
        </div>
        <div v-else class="table-meta muted">计算结果将显示在此</div>
        <a-space :size="8">
          <a-button size="small" :disabled="!resultFlat.length" @click="toggleExpandAll">
            {{ expandAll ? '收起全部' : '展开全部' }}
          </a-button>
          <a-button size="small" :disabled="!resultFlat.length" @click="summaryDrawerOpen = true">
            需求统计
          </a-button>
          <a-button size="small" :disabled="!resultFlat.length" @click="openExportModal">
            导出
          </a-button>
          <TableColumnSettingButton @click="columnDrawerOpen = true" />
        </a-space>
      </div>

      <a-table
        size="small"
        bordered
        row-key="key"
        class="demand-tree-table"
        :columns="displayColumns"
        :data-source="resultTree"
        :pagination="false"
        :scroll="{ x: tableScrollX, y: 'calc(100vh - 360px)' }"
        :expanded-row-keys="expandedKeys"
        :indent-size="18"
        children-column-name="children"
        :row-class-name="rowClassName"
        @expand="onExpand"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <span class="code-cell" :class="{ 'code-cell--child': record.depth > 0 }">
              <span v-if="record.depth > 0" class="tree-branch" aria-hidden="true">└</span>
              <span class="code-text" :title="record.code">{{ record.code || '—' }}</span>
            </span>
          </template>
          <template v-else-if="column.key === 'name'">
            {{ record.name || '—' }}
          </template>
          <template v-else-if="column.key === 'spec'">
            {{ record.spec || '—' }}
          </template>
          <template v-else-if="column.key === 'material'">
            {{ record.material || '—' }}
          </template>
          <template v-else-if="column.key === 'specAttr'">
            {{ record.specAttr || '—' }}
          </template>
          <template v-else-if="column.key === 'drawingNo'">
            {{ record.drawingNo || '—' }}
          </template>
          <template v-else-if="column.key === 'supplyType'">
            {{ record.supplyType || '—' }}
          </template>
          <template v-else-if="column.key === 'demandQty'">
            {{ formatQtyWithUnit(record.demandQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'stockQty'">
            {{ formatQtyWithUnit(record.stockQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'inTransitQty'">
            {{ formatQtyWithUnit(record.inTransitQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'gapQty'">
            <span :class="{ 'gap-warn': Number(record.gapQty) > 0 }">
              {{ formatQtyWithUnit(record.gapQty, record.unit) }}
            </span>
          </template>
          <template v-else-if="column.key === 'conclusion'">
            <a-tag :color="Number(record.gapQty) > 0 ? 'warning' : 'success'">
              {{ record.conclusion }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'supplier'">
            <a-input v-model:value="record.supplier" size="small" allow-clear placeholder="选填" />
          </template>
          <template v-else-if="column.key === 'leadTimeDays'">
            <a-input-number
              v-model:value="record.leadTimeDays"
              size="small"
              :min="0"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'arrivalDate'">
            <a-date-picker
              v-model:value="record.arrivalDate"
              value-format="YYYY-MM-DD"
              size="small"
              style="width: 100%"
            />
          </template>
        </template>
        <template #emptyText>
          <a-empty description="请选择产品并点击「计算需求」" />
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="summaryDrawerOpen"
      title="需求统计"
      placement="right"
      :width="880"
      destroy-on-close
    >
      <div class="summary-drawer-body">
        <div v-for="block in summaryBlocks" :key="block.key" class="summary-block">
          <div class="summary-title">
            {{ block.title }}
            <span class="summary-count">（{{ block.rows.length }}）</span>
          </div>
          <a-table
            size="small"
            bordered
            row-key="key"
            :columns="summaryColumns"
            :data-source="block.rows"
            :pagination="false"
            :scroll="{ x: 760, y: 220 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'demandQty'">
                {{ formatQtyWithUnit(record.demandQty, record.unit) }}
              </template>
              <template v-else-if="column.key === 'name'">
                {{ record.name || '—' }}
              </template>
              <template v-else-if="column.key === 'code'">
                {{ record.code || '—' }}
              </template>
              <template v-else-if="column.key === 'spec'">
                {{ record.spec || '—' }}
              </template>
              <template v-else-if="column.key === 'material'">
                {{ record.material || '—' }}
              </template>
            </template>
            <template #summary>
              <a-table-summary fixed>
                <a-table-summary-row>
                  <a-table-summary-cell :index="0" :col-span="5">
                    <span class="summary-total-label">合计</span>
                    <span class="summary-total-meta">共 {{ block.rows.length }} 项</span>
                  </a-table-summary-cell>
                  <a-table-summary-cell :index="5" align="right">
                    <span class="summary-total-qty">{{
                      formatSummaryDemandTotal(block.rows)
                    }}</span>
                  </a-table-summary-cell>
                </a-table-summary-row>
              </a-table-summary>
            </template>
            <template #emptyText>
              <span class="summary-empty">暂无</span>
            </template>
          </a-table>
        </div>
      </div>
    </a-drawer>

    <SalesOrderSelectModal v-model:open="salesOrderOpen" @confirm="onSalesOrderConfirm" />

    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="resultFlat.length"
      :selected-count="0"
      @export="doExport"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import {
  formatQty,
  formatQtyWithUnit,
  inputNumberFormatter,
  inputNumberParser,
} from '@/utils/numberFormat'
import {
  calculateDemandTree,
  resolveDefaultBomForProduct,
  summarizeDemandGaps,
  collectAllExpandKeys,
  collectExpandKeysToDepth,
} from '@/utils/demandCalculation'
import { formatBomInfoLabel } from '@/utils/itemBomInfo'
import { useListExport } from '@/composables/useListExport'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { demandCalculationExportFields } from '@/utils/exportFields/demandCalculationExport'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import ProductMaterialSelect from './components/ProductMaterialSelect.vue'
import SalesOrderSelectModal from './components/SalesOrderSelectModal.vue'

defineOptions({ name: 'DemandCalculationView' })

const salesOrderOpen = ref(false)
const summaryDrawerOpen = ref(false)
const calculating = ref(false)
const expandAll = ref(true)
const expandedKeys = ref([])
const selectedSalesOrder = ref(null)

const form = reactive({
  salesOrderNo: '',
  salesOrderId: '',
  salesLineId: undefined,
  productId: '',
  productCode: '',
  productName: '',
  bomId: '',
  bomLabel: '',
  orderQty: 1,
  deliveryDate: undefined,
})

const resultTree = ref([])
const resultFlat = ref([])
const resultMeta = reactive({
  bomLabel: '',
  orderQty: null,
  calculatedAt: '',
})

const baseColumns = [
  { title: '序号', dataIndex: 'serialNo', key: 'serialNo', width: 88, fixed: 'left' },
  { title: '物品编码', dataIndex: 'code', key: 'code', width: 160, ellipsis: true, fixed: 'left' },
  { title: '名称', dataIndex: 'name', key: 'name', width: 150, ellipsis: true },
  { title: '规格型号', dataIndex: 'spec', key: 'spec', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'specAttr', key: 'specAttr', width: 120, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '供应型态', dataIndex: 'supplyType', key: 'supplyType', width: 90 },
  { title: '需求数', key: 'demandQty', width: 110, align: 'right' },
  { title: '库存数', key: 'stockQty', width: 110, align: 'right' },
  { title: '在途/在制数', key: 'inTransitQty', width: 120, align: 'right' },
  { title: '缺口数', key: 'gapQty', width: 110, align: 'right' },
  { title: '结论', key: 'conclusion', width: 100 },
  { title: '供应商', key: 'supplier', width: 140 },
  { title: '供应期/天', key: 'leadTimeDays', width: 100 },
  { title: '到货日期', key: 'arrivalDate', width: 140 },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('production-demand-calculation-list', baseColumns, { minScrollX: 1680 })

const hasSalesOrder = computed(() => Boolean(form.salesOrderId || selectedSalesOrder.value))

const salesLineOptions = computed(() => {
  const lines = selectedSalesOrder.value?.lineItems || []
  return lines
    .filter((l) => l.productName || l.productCode)
    .map((l) => ({
      value: l.id,
      label: `${l.productName || l.productCode}${
        l.productCode ? `（${l.productCode}）` : ''
      } · 数量 ${formatQty(l.salesQty ?? l.qty ?? 0)}`,
      line: l,
    }))
})

const gapSummary = computed(() => summarizeDemandGaps(resultFlat.value))

const summaryColumns = [
  { title: '序号', dataIndex: 'serialNo', key: 'serialNo', width: 64 },
  { title: '物品编码', dataIndex: 'code', key: 'code', width: 130, ellipsis: true },
  { title: '物品名称', dataIndex: 'name', key: 'name', width: 150, ellipsis: true },
  { title: '规格型号', dataIndex: 'spec', key: 'spec', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  { title: '需求数', key: 'demandQty', width: 110, align: 'right' },
]

const summaryBlocks = computed(() => [
  { key: 'buy', title: '需要采购', rows: gapSummary.value.采购 },
  { key: 'os', title: '需要外协', rows: gapSummary.value.外协 },
  { key: 'prod', title: '需要生产', rows: gapSummary.value.生产 },
])

/** 按单位分别合计需求数，如「12 件 / 4 套」 */
function formatSummaryDemandTotal(rows = []) {
  if (!rows.length) return '—'
  const byUnit = {}
  rows.forEach((row) => {
    const unit = row.unit || '件'
    byUnit[unit] = (byUnit[unit] || 0) + (Number(row.demandQty) || 0)
  })
  return Object.entries(byUnit)
    .map(([unit, qty]) => formatQtyWithUnit(qty, unit))
    .join(' / ')
}

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'production-demand-calculation-export-v1',
  fieldDefinitions: demandCalculationExportFields,
  getFilteredRows: () => resultFlat.value,
  getSelectedRows: () => [],
  fileNamePrefix: '需求计算',
  sheetName: '需求计算',
})

function rowClassName(record) {
  if (record.isTopLevel || record.depth === 0) return 'demand-row-top'
  if (record.depth === 1) return 'demand-row-l1'
  return 'demand-row-deep'
}

function resetResult() {
  resultTree.value = []
  resultFlat.value = []
  resultMeta.bomLabel = ''
  resultMeta.orderQty = null
  resultMeta.calculatedAt = ''
  expandedKeys.value = []
  expandAll.value = true
}

function clearProductFields() {
  form.salesLineId = undefined
  form.productId = ''
  form.productCode = ''
  form.productName = ''
  form.bomId = ''
  form.bomLabel = ''
  form.orderQty = 1
  form.deliveryDate = undefined
}

function applyBomDefault(productId) {
  const bom = resolveDefaultBomForProduct(productId)
  if (bom) {
    form.bomId = bom.id
    form.bomLabel = formatBomInfoLabel(bom)
  } else {
    form.bomId = ''
    form.bomLabel = ''
  }
  return bom
}

function onProductSelect(item) {
  if (!item) {
    clearProductFields()
    resetResult()
    return
  }
  form.salesLineId = undefined
  form.productId = String(item.itemId || item.id || '')
  form.productCode = item.code || ''
  form.productName = item.name || ''
  const bom = applyBomDefault(form.productId)
  if (!bom) {
    message.warning('该产品当前无自有生效BOM，请维护产品BOM后重试')
  }
  resetResult()
}

function clearSalesOrder() {
  form.salesOrderNo = ''
  form.salesOrderId = ''
  selectedSalesOrder.value = null
  clearProductFields()
  resetResult()
}

function onSalesOrderInput(value) {
  if (!value) clearSalesOrder()
}

function onSalesOrderConfirm(payload) {
  const order = Array.isArray(payload) ? payload[0] : payload
  if (!order) return
  selectedSalesOrder.value = order
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo || ''
  const lines = (order.lineItems || []).filter((l) => l.productName || l.productCode)
  if (!lines.length) {
    clearProductFields()
    message.warning('该销售订单暂无产品明细')
    resetResult()
    return
  }
  form.salesLineId = lines[0].id
  onSalesLineChange(lines[0].id)
}

function onSalesLineChange(lineId) {
  if (!lineId) {
    clearProductFields()
    resetResult()
    return
  }
  const line = (selectedSalesOrder.value?.lineItems || []).find((l) => l.id === lineId)
  if (!line) return
  form.productId = String(line.productId || '')
  form.productCode = line.productCode || ''
  form.productName = line.productName || ''
  form.orderQty = Number(line.salesQty ?? line.qty) || 1
  form.deliveryDate = line.deliveryDate || selectedSalesOrder.value?.deliveryDate || undefined
  if (line.bomId) {
    form.bomId = line.bomId
    form.bomLabel = line.bomName || line.bomVersion || ''
  } else {
    const bom = applyBomDefault(form.productId)
    if (!bom) {
      message.warning('该产品当前无自有生效BOM，请维护产品BOM后重试')
    }
  }
  resetResult()
}

function handleClear() {
  clearSalesOrder()
  message.success('已清空')
}

function applyExpandState(all) {
  if (!resultTree.value.length) {
    expandedKeys.value = []
    expandAll.value = true
    return
  }
  if (all) {
    expandedKeys.value = collectAllExpandKeys(resultTree.value)
    expandAll.value = true
  } else {
    // 保留顶级与一级：仅展开顶级节点，二级及以下收起
    expandedKeys.value = collectExpandKeysToDepth(resultTree.value, 1)
    expandAll.value = false
  }
}

function handleCalculate() {
  if (hasSalesOrder.value && !form.salesLineId) {
    message.warning('请选择销售明细产品')
    return
  }
  if (!form.productName && !form.productId) {
    message.warning('请先选择产品')
    return
  }
  if (!form.bomId) {
    message.warning('该产品当前无自有生效BOM，请维护产品BOM后重试')
    return
  }
  if (!(Number(form.orderQty) > 0)) {
    message.warning('请填写大于 0 的订单数量')
    return
  }
  calculating.value = true
  try {
    const res = calculateDemandTree({
      bomId: form.bomId,
      orderQty: form.orderQty,
      product: {
        id: form.productId,
        productId: form.productId,
        code: form.productCode,
        productCode: form.productCode,
        name: form.productName,
        productName: form.productName,
      },
    })
    if (!res.ok) {
      message.warning(res.message || '计算失败')
      return
    }
    resultTree.value = res.tree
    resultFlat.value = res.flat
    resultMeta.bomLabel = res.bomLabel
    resultMeta.orderQty = res.orderQty
    resultMeta.calculatedAt = res.calculatedAt
    applyExpandState(true)
    message.success(`已计算 ${res.flat.length} 行物料需求`)
  } finally {
    calculating.value = false
  }
}

function onExpand(expanded, record) {
  const key = record.key
  if (expanded) {
    if (!expandedKeys.value.includes(key)) expandedKeys.value = [...expandedKeys.value, key]
  } else {
    expandedKeys.value = expandedKeys.value.filter((k) => k !== key)
  }
  const allKeys = collectAllExpandKeys(resultTree.value)
  expandAll.value = allKeys.length > 0 && allKeys.every((k) => expandedKeys.value.includes(k))
}

function toggleExpandAll() {
  if (!resultTree.value.length) return
  applyExpandState(!expandAll.value)
}
</script>

<style lang="less" scoped>
.demand-calc-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.page-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}

.page-head {
  margin-bottom: 12px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-desc {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.filter-form {
  :deep(.ant-form-item) {
    margin-bottom: 8px;
    width: 100%;
  }
}

.picker-icon {
  color: rgba(0, 0, 0, 0.45);
  cursor: pointer;
}

.table-card {
  padding-bottom: 8px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.table-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);

  &.muted {
    color: rgba(0, 0, 0, 0.35);
  }
}

.gap-warn {
  color: #d48806;
  font-weight: 600;
}

.code-cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.code-cell--child {
  padding-left: 2px;
}

.tree-branch {
  flex-shrink: 0;
  color: #722ed1;
  font-weight: 600;
  line-height: 1;
}

.code-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demand-tree-table {
  :deep(.demand-row-top) > td {
    background: #f9f0ff;
  }

  :deep(.demand-row-l1) > td {
    background: #fcfaff;
  }

  :deep(.demand-row-deep) > td:nth-child(2) {
    box-shadow: inset 2px 0 0 #d3adf7;
  }
}

.summary-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-block {
  padding: 0;
}

.summary-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.summary-count {
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.summary-empty {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.35);
}

.summary-total-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.summary-total-meta {
  margin-left: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.summary-total-qty {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgba(0, 0, 0, 0.88);
}
</style>
