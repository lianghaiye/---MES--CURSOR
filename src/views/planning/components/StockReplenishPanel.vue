<template>
  <div class="stock-replenish-panel">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="来源">
              <a-select
                v-model:value="filters.alertSource"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="sourceFilterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="类型">
              <a-select
                v-model:value="filters.alertKind"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="alertKindFilterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.productName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="编码">
              <a-input
                v-model:value="filters.productCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="applyFilters">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="resetFilters">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button size="small" @click="refreshRows">
          <ReloadOutlined />
          刷新预警
        </a-button>
        <a-tooltip :title="batchDisabledTip">
          <span class="batch-btn-wrap">
            <a-button
              type="primary"
              size="small"
              :disabled="batchExecuteDisabled"
              @click="handleConfirm()"
            >
              批量执行（{{ selectedKeys.length }}）
            </a-button>
          </span>
        </a-tooltip>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        size="small"
        row-key="key"
        bordered
        :columns="displayColumns"
        :data-source="pagedRows"
        :pagination="false"
        :row-selection="rowSelection"
        :scroll="{ y: tableScrollY, x: tableScrollX }"
        class="replenish-table"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'alertKind'">
            <a-tag v-if="resolveRowAlertKind(record) === STOCK_ALERT_KIND.ABOVE_MAX" color="red">
              超高
            </a-tag>
            <a-tag v-else color="gold">超低</a-tag>
          </template>
          <template v-else-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'source'">
            <a-tag
              v-if="record.alertSource === 'production-plan' || record.fromProductionPlan"
              color="purple"
            >
              生产计划
            </a-tag>
            <a-tag v-else color="cyan">预警</a-tag>
          </template>
          <template v-else-if="column.key === 'planNos'">
            <template v-if="(record.planNos || []).length">
              <a
                v-for="(no, idx) in record.planNos"
                :key="`${record.key}-${no}`"
                class="plan-link"
                @click.prevent="goProductionPlan(record, no)"
              >
                {{ no }}<template v-if="idx < record.planNos.length - 1">、</template>
              </a>
            </template>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'inTransit'">
            <a-tooltip v-if="record.inTransitTip" :title="record.inTransitTip">
              <span>{{ record.inTransitText || '—' }}</span>
            </a-tooltip>
            <span v-else>{{ record.inTransitText || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'planQty'">
            <a-input-number
              v-model:value="record.planQty"
              size="small"
              :min="0"
              :precision="2"
              :disabled="!canExecuteReplenish(record)"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'actionSelect'">
            <a-select
              v-model:value="record.action"
              size="small"
              style="width: 100%"
              :options="actionOpts"
              :disabled="!canExecuteReplenish(record)"
            />
          </template>
          <template v-else-if="column.key === 'bomLabel'">
            {{ record.bomLabel || '-' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-tooltip :title="replenishDisabledTip(record)">
              <span class="action-btn-wrap">
                <a-button
                  type="link"
                  size="small"
                  :disabled="!canExecuteReplenish(record)"
                  @click="handleConfirm([record.key])"
                >
                  执行补货
                </a-button>
              </span>
            </a-tooltip>
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredRows.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <GeneratePurchaseRequisitionModal
      v-model:open="purchaseModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @saved="(req) => onPurchaseSaved(req, afterExecuteCleanup)"
    />

    <GenerateWorkOrderModal
      v-model:open="workOrderModalOpen"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="(saved) => onWorkOrderSaved(saved, afterExecuteCleanup)"
    />

    <GenerateOutsourceWorkOrderModal
      v-model:open="outsourceModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="(saved) => onOutsourceSaved(saved, afterExecuteCleanup)"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
      title="列显隐"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { useReplenishExecute } from '@/composables/useReplenishExecute'
import {
  REPLENISH_ACTION_OPTIONS,
  STOCK_ALERT_KIND,
  STOCK_ALERT_KIND_OPTIONS,
  STOCK_ALERT_SOURCE,
  STOCK_ALERT_SOURCE_OPTIONS,
  listStockReplenishSuggestions,
  resolveRowAlertKind,
} from '@/utils/stockReplenish'
import GeneratePurchaseRequisitionModal from './GeneratePurchaseRequisitionModal.vue'
import GenerateWorkOrderModal from './GenerateWorkOrderModal.vue'
import GenerateOutsourceWorkOrderModal from './GenerateOutsourceWorkOrderModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

defineProps({
  tableScrollY: { type: [Number, String], default: 'calc(100vh - 300px)' },
})

const emit = defineEmits(['created'])

const router = useRouter()
const { openTab } = useTabs()

const rows = ref([])
const selectedKeys = ref([])

const {
  purchaseModalOpen,
  workOrderModalOpen,
  outsourceModalOpen,
  modalOrder,
  modalMaterials,
  dispatchExecute,
  onPurchaseSaved,
  onWorkOrderSaved,
  onOutsourceSaved,
} = useReplenishExecute({
  remarkTag: '库存预警',
  successStayLabel: '留在库存预警',
  onExecuted: (payload) => emit('created', payload),
})

const filters = reactive({
  alertSource: undefined,
  alertKind: undefined,
  productName: '',
  productCode: '',
  specModel: '',
})
const appliedFilters = reactive({ ...filters })
const pagination = reactive({
  current: 1,
  pageSize: 10,
})

const actionOpts = REPLENISH_ACTION_OPTIONS
const sourceFilterOpts = STOCK_ALERT_SOURCE_OPTIONS
const alertKindFilterOpts = STOCK_ALERT_KIND_OPTIONS

const baseColumns = [
  { title: '预警类型', key: 'alertKind', width: 88, fixed: 'left' },
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '来源', key: 'source', width: 88, fixed: 'left' },
  { title: '计划单号', key: 'planNos', width: 160, ellipsis: true, fixed: 'left' },
  { title: '编码', key: 'productCode', dataIndex: 'productCode', width: 110 },
  { title: '名称', key: 'productName', dataIndex: 'productName', ellipsis: true, width: 140 },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 72, ellipsis: true },
  {
    title: '变体属性',
    key: 'variantSummary',
    dataIndex: 'variantSummary',
    width: 120,
    ellipsis: true,
  },
  { title: '图号', key: 'drawingNo', dataIndex: 'drawingNo', width: 90, ellipsis: true },
  {
    title: '当前库存',
    key: 'availableStock',
    dataIndex: 'availableStock',
    width: 88,
    align: 'right',
  },
  { title: '在途/在制', key: 'inTransit', width: 110, ellipsis: true },
  { title: '最低', key: 'minStockQty', dataIndex: 'minStockQty', width: 64, align: 'right' },
  { title: '最高', key: 'maxStockQty', dataIndex: 'maxStockQty', width: 64, align: 'right' },
  { title: '建议', key: 'suggestQty', dataIndex: 'suggestQty', width: 72, align: 'right' },
  { title: '数量', key: 'planQty', width: 100 },
  { title: '动作', key: 'actionSelect', width: 110 },
  { title: 'BOM', key: 'bomLabel', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 96, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('planning-stock-replenish-v2', baseColumns)

function resolveRowSource(row) {
  if (row.alertSource === STOCK_ALERT_SOURCE.PRODUCTION_PLAN || row.fromProductionPlan) {
    return STOCK_ALERT_SOURCE.PRODUCTION_PLAN
  }
  return STOCK_ALERT_SOURCE.ALERT
}

function isAboveMaxAlert(row) {
  return resolveRowAlertKind(row) === STOCK_ALERT_KIND.ABOVE_MAX
}

function canExecuteReplenish(row) {
  if (!row || isAboveMaxAlert(row)) return false
  return Number(row.planQty) > 0
}

function replenishDisabledTip(row) {
  if (isAboveMaxAlert(row)) return '库存高于最高水位，仅预警不可执行补货'
  if (!(Number(row?.planQty) > 0)) return '请先填写大于 0 的补货数量'
  return ''
}

const filteredRows = computed(() => {
  const name = String(appliedFilters.productName || '')
    .trim()
    .toLowerCase()
  const code = String(appliedFilters.productCode || '')
    .trim()
    .toLowerCase()
  const spec = String(appliedFilters.specModel || '')
    .trim()
    .toLowerCase()
  const source = appliedFilters.alertSource
  const alertKind = appliedFilters.alertKind
  return rows.value.filter((r) => {
    if (source && resolveRowSource(r) !== source) return false
    if (alertKind && resolveRowAlertKind(r) !== alertKind) return false
    if (
      name &&
      !String(r.productName || '')
        .toLowerCase()
        .includes(name)
    )
      return false
    if (
      code &&
      !String(r.productCode || '')
        .toLowerCase()
        .includes(code)
    )
      return false
    if (
      spec &&
      !String(r.specModel || '')
        .toLowerCase()
        .includes(spec)
    )
      return false
    return true
  })
})

const pagedRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

const selectedRows = computed(() =>
  rows.value.filter((r) => selectedKeys.value.includes(r.key) && canExecuteReplenish(r)),
)

const selectedActionKinds = computed(() => {
  const set = new Set(selectedRows.value.map((r) => r.action))
  return [...set]
})

const hasMixedActions = computed(
  () => selectedKeys.value.length > 0 && selectedActionKinds.value.length > 1,
)

const batchExecuteDisabled = computed(() => !selectedRows.value.length || hasMixedActions.value)

const batchDisabledTip = computed(() => {
  if (!selectedKeys.value.length) return '请先勾选要执行的行'
  if (!selectedRows.value.length) return '勾选行均为超高水位预警，不可执行补货'
  if (hasMixedActions.value) return '勾选行包含不同动作，请只勾选同一动作后再批量执行'
  return ''
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: !canExecuteReplenish(record),
  }),
}))

function applyFilters() {
  Object.assign(appliedFilters, { ...filters })
  pagination.current = 1
}

function resetFilters() {
  filters.alertSource = undefined
  filters.alertKind = undefined
  filters.productName = ''
  filters.productCode = ''
  filters.specModel = ''
  Object.assign(appliedFilters, { ...filters })
  pagination.current = 1
}

function refreshRows() {
  rows.value = listStockReplenishSuggestions()
  selectedKeys.value = selectedKeys.value.filter((key) =>
    rows.value.some((r) => r.key === key && canExecuteReplenish(r)),
  )
}

function goProductionPlan(_record, planNo) {
  const path = '/planning/production-plan'
  openTab(path, '生产计划')
  router.push({
    path,
    query: planNo ? { orderNo: planNo } : undefined,
  })
}

onMounted(() => {
  refreshRows()
})

function afterExecuteCleanup(keysToClear) {
  if (keysToClear?.length) {
    const clearSet = new Set(keysToClear)
    selectedKeys.value = selectedKeys.value.filter((k) => !clearSet.has(k))
  } else {
    selectedKeys.value = []
  }
  refreshRows()
}

/** @param {string[]=} onlyKeys 指定则只执行这些行；否则执行当前勾选 */
function handleConfirm(onlyKeys) {
  const keySet = Array.isArray(onlyKeys) && onlyKeys.length ? new Set(onlyKeys) : null
  const selected = rows.value.filter((r) => {
    if (!canExecuteReplenish(r)) return false
    if (keySet) return keySet.has(r.key)
    return selectedKeys.value.includes(r.key)
  })
  if (!selected.length) {
    const blocked = rows.value.some((r) => {
      if (!keySet && !selectedKeys.value.includes(r.key)) return false
      if (keySet && !keySet.has(r.key)) return false
      return isAboveMaxAlert(r)
    })
    message.warning(
      blocked ? '库存高于最高水位，仅预警不可执行补货' : '请先勾选要执行的行，并确认数量大于 0',
    )
    return
  }
  dispatchExecute(selected, afterExecuteCleanup)
}

defineExpose({ refreshRows })
</script>

<style lang="less" scoped>
.stock-replenish-panel {
  padding: 0;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 12px 16px;
  margin-bottom: 8px;
}

.toolbar-row {
  margin-bottom: 8px;
}

.table-card {
  padding: 12px;
  border: 1px solid #e5e6eb;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }
}

.filter-actions-item {
  :deep(.ant-form-item-control) {
    display: flex;
    justify-content: flex-end;
  }
}

.batch-btn-wrap,
.action-btn-wrap {
  display: inline-block;
}

.plan-link {
  color: #1677ff;
  cursor: pointer;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 4px 4px;
}
</style>
