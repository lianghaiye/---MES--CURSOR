<template>
  <div class="stock-replenish-panel">
    <div class="filter-card">
      <div class="filter-row">
        <a-form layout="inline" class="filter-form" :model="filters">
          <a-form-item label="来源">
            <a-select
              v-model:value="filters.alertSource"
              allow-clear
              placeholder="全部"
              :options="sourceFilterOpts"
              style="width: 120px"
            />
          </a-form-item>
          <a-form-item label="类型">
            <a-select
              v-model:value="filters.alertKind"
              allow-clear
              placeholder="全部"
              :options="alertKindFilterOpts"
              style="width: 120px"
            />
          </a-form-item>
          <a-form-item label="产品名称">
            <a-input
              v-model:value="filters.productName"
              allow-clear
              placeholder="搜索名称"
              style="width: 140px"
            />
          </a-form-item>
          <a-form-item label="编码">
            <a-input
              v-model:value="filters.productCode"
              allow-clear
              placeholder="搜索编码"
              style="width: 140px"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="filters.specModel"
              allow-clear
              placeholder="搜索规格"
              style="width: 140px"
            />
          </a-form-item>
        </a-form>
        <a-space class="filter-actions" :size="8">
          <a-button type="primary" @click="applyFilters">搜索</a-button>
          <a-button @click="resetFilters">清空</a-button>
        </a-space>
      </div>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button @click="refreshRows">刷新预警</a-button>
          <a-button type="dashed" @click="pickOpen = true">手工添加物料/产品</a-button>
          <a-tooltip :title="batchDisabledTip">
            <span class="batch-btn-wrap">
              <a-button type="primary" :disabled="batchExecuteDisabled" @click="handleConfirm()">
                批量执行（{{ selectedKeys.length }}）
              </a-button>
            </span>
          </a-tooltip>
        </a-space>
        <a-space :size="4" class="toolbar-icons">
          <TableColumnSettingButton @click="columnDrawerOpen = true" />
        </a-space>
      </div>
      <a-table
        size="middle"
        row-key="key"
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
            <a-tag v-if="record.manual || record.alertSource === 'manual'" color="geekblue">
              手工
            </a-tag>
            <a-tag
              v-else-if="record.alertSource === 'production-plan' || record.fromProductionPlan"
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

    <SelectBomMaterialModal
      v-model:open="pickOpen"
      title="添加补货物料/产品"
      @selected="onPickItems"
    />

    <GeneratePurchaseRequisitionModal
      v-model:open="purchaseModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @saved="onPurchaseSaved"
    />

    <GenerateWorkOrderModal
      v-model:open="workOrderModalOpen"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="onWorkOrderSaved"
    />

    <GenerateOutsourceWorkOrderModal
      v-model:open="outsourceModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="onOutsourceSaved"
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
import { computed, onMounted, reactive, ref, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useTabs } from '@/composables/useTabs'
import { PLAN_SOURCE } from '@/utils/planSource'
import {
  REPLENISH_ACTION,
  REPLENISH_ACTION_OPTIONS,
  STOCK_ALERT_KIND,
  STOCK_ALERT_KIND_OPTIONS,
  STOCK_ALERT_SOURCE,
  STOCK_ALERT_SOURCE_OPTIONS,
  buildManualReplenishRow,
  listStockReplenishSuggestions,
  resolveRowAlertKind,
} from '@/utils/stockReplenish'
import { createProductionPlanFromStockReplenish } from '@/store/productionPlanStore'
import { addPurchaseRequisition } from '@/store/purchaseRequisitionStore'
import {
  addOutsourceWorkOrdersFromPlanRows,
  addWorkOrdersFromPlanRows,
} from '@/store/workOrderStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import GeneratePurchaseRequisitionModal from './GeneratePurchaseRequisitionModal.vue'
import GenerateWorkOrderModal from './GenerateWorkOrderModal.vue'
import GenerateOutsourceWorkOrderModal from './GenerateOutsourceWorkOrderModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { applyReplenishExecuteToLedger } from '@/store/replenishLedgerStore'

defineProps({
  tableScrollY: { type: [Number, String], default: 'calc(100vh - 300px)' },
})

const emit = defineEmits(['created'])

const router = useRouter()
const { openTab } = useTabs()

const rows = ref([])
const selectedKeys = ref([])
const pickOpen = ref(false)
const purchaseModalOpen = ref(false)
const workOrderModalOpen = ref(false)
const outsourceModalOpen = ref(false)
const modalOrder = ref(null)
const modalMaterials = ref([])
/** 打开弹窗时对应的预警行，保存后写台账用 */
const pendingReplenishRows = ref([])

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
  if (row.manual || row.alertSource === STOCK_ALERT_SOURCE.MANUAL) {
    return STOCK_ALERT_SOURCE.MANUAL
  }
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
  const alertRows = listStockReplenishSuggestions()
  const manualKeep = rows.value.filter((r) => r.manual)
  const map = new Map()
  ;[...alertRows, ...manualKeep].forEach((r) => map.set(r.key, r))
  // 生产计划来源优先，手工靠后
  rows.value = [...map.values()].sort((a, b) => {
    const rank = (row) => {
      if (row.manual) return 2
      if (resolveRowSource(row) === STOCK_ALERT_SOURCE.PRODUCTION_PLAN) return 0
      return 1
    }
    const d = rank(a) - rank(b)
    if (d !== 0) return d
    return String(a.productCode || '').localeCompare(String(b.productCode || ''))
  })
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

function onPickItems(picked) {
  const list = Array.isArray(picked) ? picked : picked ? [picked] : []
  list.forEach((item) => {
    const code = item.code || item.materialCode || item.productCode
    const product = productInfoState.products.find((p) => p.code === code || p.id === item.id)
    const material = materialInfoState.materials.find((m) => m.code === code || m.id === item.id)
    const master = product || material || item
    const kind = product ? 'product' : 'material'
    const row = buildManualReplenishRow(master, kind)
    if (!row) return
    const idx = rows.value.findIndex((r) => r.key === row.key)
    if (idx >= 0) rows.value[idx] = { ...rows.value[idx], ...row, manual: true }
    else rows.value.push(row)
    if (!selectedKeys.value.includes(row.key)) selectedKeys.value.push(row.key)
  })
  pickOpen.value = false
}

function buildSyntheticOrder(action) {
  const labelMap = {
    [REPLENISH_ACTION.PURCHASE]: '采购补货',
    [REPLENISH_ACTION.OUTSOURCE]: '外协补货',
    [REPLENISH_ACTION.WORK_ORDER]: '生产补货',
    [REPLENISH_ACTION.PRODUCE]: '生产计划补货',
  }
  const label = labelMap[action] || '库存补货'
  return {
    id: `replenish-${action}-${Date.now()}`,
    orderNo: `BH${dayjs().format('YYYYMMDDHHmmss')}`,
    urgency: '普通',
    remark: `库存预警${label}`,
    productQty: 1,
    planSource: PLAN_SOURCE.STOCK_REPLENISH,
    planAssemblyDate: dayjs().add(14, 'day').format('YYYY-MM-DD'),
    workItems: [],
  }
}

function mapReplenishRowsToPlanMaterials(list, supplyType) {
  return list.map((r) => {
    const qty = Number(r.planQty) || 0
    return {
      id: r.key,
      name: r.productName,
      code: r.productCode,
      spec: r.specModel || '',
      material: r.material || '',
      drawingNo: r.drawingNo || '',
      specAttr: r.variantSummary === '—' ? '' : r.variantSummary || '',
      type: r.itemKind === 'material' ? '零部件' : '成品',
      supplyType,
      unit: r.unit || '件',
      demandQty: qty,
      gapQty: qty,
      planQty: qty,
      availableStock: Number(r.availableStock) || 0,
      stockQty: Number(r.availableStock) || 0,
      maxStockQty: Number(r.maxStockQty) || 0,
      minStockQty: Number(r.minStockQty) || 0,
      suggestQty: Number(r.suggestQty) || 0,
      warehouse: r.defaultWarehouse || '',
      workCenter: r.defaultWorkCenter || '',
      inTransitQty: Number(r.inTransitQty) || 0,
      inTransitText: r.inTransitText || '—',
      isTopLevel: true,
      bom: r.bomLabel && r.bomLabel !== '-' ? r.bomLabel : r.productName,
      bomId: r.bomId || '',
      bomName: r.bomName || '',
      bomVersion: r.bomVersion || '',
      productId: r.productId || '',
      remark: r.manual
        ? '手工补货'
        : r.fromProductionPlan || r.alertSource === 'production-plan'
          ? '生产计划关联预警'
          : '库存预警',
    }
  })
}

function openPurchaseModal(list) {
  pendingReplenishRows.value = list.map((r) => ({ ...r }))
  modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.PURCHASE)
  modalMaterials.value = mapReplenishRowsToPlanMaterials(list, '外购件')
  purchaseModalOpen.value = true
}

function openWorkOrderModal(list) {
  const withBom = list.filter((r) => r.hasBom)
  const skippedNoBom = list.filter((r) => !r.hasBom)
  if (!withBom.length) {
    message.warning(
      `未打开弹窗：所选「生产」行均无 BOM（${skippedNoBom.map((r) => r.productName).join('、')}），请改采购/外协/生产计划或先维护 BOM`,
    )
    return
  }
  if (skippedNoBom.length) {
    message.info(`已跳过无 BOM 的行：${skippedNoBom.map((r) => r.productName).join('、')}`)
  }
  pendingReplenishRows.value = withBom.map((r) => ({ ...r }))
  modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.WORK_ORDER)
  modalMaterials.value = mapReplenishRowsToPlanMaterials(withBom, '自制件')
  workOrderModalOpen.value = true
}

function openOutsourceModal(list) {
  pendingReplenishRows.value = list.map((r) => ({ ...r }))
  modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.OUTSOURCE)
  modalMaterials.value = mapReplenishRowsToPlanMaterials(list, '外协件')
  outsourceModalOpen.value = true
}

function afterExecuteCleanup(keysToClear) {
  if (keysToClear?.length) {
    const clearSet = new Set(keysToClear)
    selectedKeys.value = selectedKeys.value.filter((k) => !clearSet.has(k))
  } else {
    selectedKeys.value = []
  }
  pendingReplenishRows.value = []
  refreshRows()
}

function showProduceSuccess(plan, producedRows, skippedNoBom) {
  const lines = [
    `生产计划 ${plan.orderNo}（来源：库存补货，${plan.workItems?.length || 0} 项）`,
    '已写入补货台账，可在「计划排产 → 补货台账」查看',
  ]
  if (skippedNoBom.length) {
    lines.push(
      `已跳过无 BOM 的生产计划行：${skippedNoBom.map((r) => r.productName).join('、')}（可改动作「采购/外协/生产」后重试）`,
    )
  }
  const footer = [
    h(
      'a',
      {
        style: { marginRight: '16px' },
        onClick: (e) => {
          e.preventDefault()
          openTab('/planning/production-plan', '生产计划')
          router.push('/planning/production-plan')
          Modal.destroyAll()
        },
      },
      '查看生产计划',
    ),
    h(
      'a',
      {
        onClick: (e) => {
          e.preventDefault()
          openTab('/planning/replenish-ledger', '补货台账')
          router.push('/planning/replenish-ledger')
          Modal.destroyAll()
        },
      },
      '查看补货台账',
    ),
  ]
  Modal.success({
    title: '补货执行完成',
    content: h('div', [
      h(
        'ul',
        { style: { paddingLeft: '18px', margin: '8px 0' } },
        lines.map((t) => h('li', { style: { marginBottom: '4px' } }, t)),
      ),
      h('div', { style: { marginTop: '12px' } }, footer),
    ]),
    okText: '留在库存预警',
  })
  emit('created', { plan, purchaseReq: null, outsourceOrders: [], workOrders: [] })
  afterExecuteCleanup(producedRows.map((r) => r.key))
}

function executeProducePlan(selected) {
  const withBom = selected.filter((r) => r.hasBom)
  const skippedNoBom = selected.filter((r) => !r.hasBom)
  if (!withBom.length) {
    message.warning(
      `未生成单据：所选「生产计划」行均无 BOM（${skippedNoBom.map((r) => r.productName).join('、')}），请改采购/外协/生产或先维护 BOM`,
    )
    return
  }
  const plan = createProductionPlanFromStockReplenish(withBom)
  applyReplenishExecuteToLedger(
    withBom.map((r) => ({ ...r, action: REPLENISH_ACTION.PRODUCE })),
    { plan },
  )
  showProduceSuccess(plan, withBom, skippedNoBom)
}

function onPurchaseSaved(requisition) {
  if (!requisition) return
  requisition.source = '库存补货'
  if (!requisition.remark) requisition.remark = '库存预警补货请购'
  addPurchaseRequisition(requisition)
  const handled = pendingReplenishRows.value.map((r) => ({
    ...r,
    action: REPLENISH_ACTION.PURCHASE,
  }))
  applyReplenishExecuteToLedger(handled, { purchaseReq: requisition })
  message.success(
    `已写入补货台账：采购申请 ${requisition.reqNo}（${requisition.lineItems?.length || 0} 项）`,
  )
  emit('created', { plan: null, purchaseReq: requisition, outsourceOrders: [], workOrders: [] })
  afterExecuteCleanup(handled.map((r) => r.key))
}

function onWorkOrderSaved(savedRows) {
  const order = modalOrder.value || buildSyntheticOrder(REPLENISH_ACTION.WORK_ORDER)
  const created = addWorkOrdersFromPlanRows(savedRows, order)
  const byCode = new Map((savedRows || []).map((r) => [r.code, r]))
  const handled = pendingReplenishRows.value
    .filter((r) => byCode.has(r.productCode))
    .map((r) => {
      const saved = byCode.get(r.productCode)
      return {
        ...r,
        action: REPLENISH_ACTION.WORK_ORDER,
        planQty: Number(saved?.planQty) || Number(r.planQty) || 0,
      }
    })
  applyReplenishExecuteToLedger(handled, { workOrders: created })
  message.success(
    `已写入补货台账：加工工单 ${created.map((o) => o.code).join('、') || '—'}（共 ${created.length} 张）`,
  )
  emit('created', { plan: null, purchaseReq: null, outsourceOrders: [], workOrders: created })
  afterExecuteCleanup(handled.map((r) => r.key))
}

function onOutsourceSaved(savedRows) {
  const order = modalOrder.value || buildSyntheticOrder(REPLENISH_ACTION.OUTSOURCE)
  const created = addOutsourceWorkOrdersFromPlanRows(savedRows, order)
  const byCode = new Map((savedRows || []).map((r) => [r.code, r]))
  const handled = pendingReplenishRows.value
    .filter((r) => byCode.has(r.productCode))
    .map((r) => {
      const saved = byCode.get(r.productCode)
      return {
        ...r,
        action: REPLENISH_ACTION.OUTSOURCE,
        planQty: Number(saved?.planQty) || Number(r.planQty) || 0,
      }
    })
  applyReplenishExecuteToLedger(handled, { outsourceOrders: created })
  message.success(
    `已写入补货台账：外协工单 ${created.map((o) => o.code).join('、') || '—'}（共 ${created.length} 张）`,
  )
  emit('created', { plan: null, purchaseReq: null, outsourceOrders: created, workOrders: [] })
  afterExecuteCleanup(handled.map((r) => r.key))
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

  const actions = [...new Set(selected.map((r) => r.action))]
  if (actions.length > 1) {
    message.warning('所选行包含不同动作，请只选择同一动作后再执行')
    return
  }

  const action = actions[0]
  if (action === REPLENISH_ACTION.WORK_ORDER) {
    openWorkOrderModal(selected)
    return
  }
  if (action === REPLENISH_ACTION.PRODUCE) {
    executeProducePlan(selected)
    return
  }
  if (action === REPLENISH_ACTION.PURCHASE) {
    openPurchaseModal(selected)
    return
  }
  if (action === REPLENISH_ACTION.OUTSOURCE) {
    openOutsourceModal(selected)
    return
  }
  message.warning('未知补货动作')
}

defineExpose({ refreshRows })
</script>

<style lang="less" scoped>
.stock-replenish-panel {
  padding: 0;
}

.filter-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.filter-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
}

.filter-form {
  flex: 1;
  min-width: 0;
  margin-bottom: 0 !important;

  :deep(.ant-form-item) {
    margin-bottom: 0 !important;
    margin-right: 16px;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 32px;
    line-height: 32px;
  }
}

.filter-actions {
  flex-shrink: 0;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 16px;
  border: 1px solid #f0f0f0;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.toolbar-icons {
  flex-shrink: 0;
}

.batch-btn-wrap {
  display: inline-block;
}

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
  margin-top: 12px;
}
</style>
