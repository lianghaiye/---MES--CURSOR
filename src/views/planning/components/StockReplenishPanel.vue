<template>
  <div class="stock-replenish-panel">
    <a-alert
      type="info"
      show-icon
      class="hint"
      message="列出开启库存预警且现存量 ≤ 最低库存的产品/物料。也可手工添加。建议数量 = max(最高−可用, 补货批量)。自制默认生产，外购默认采购，外协默认外协，可改。生产直接生成计划；采购/外协打开与生产计划相同的生成弹窗。仅执行成功后写入补货台账。"
    />
    <div class="toolbar">
      <a-space>
        <a-button size="small" @click="refreshRows">刷新预警</a-button>
        <a-button size="small" type="dashed" @click="pickOpen = true">手工添加物料/产品</a-button>
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
    </div>
    <a-table
      size="small"
      row-key="key"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ y: tableScrollY, x: 1680 }"
      class="replenish-table"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">
          {{ index + 1 }}
        </template>
        <template v-else-if="column.key === 'source'">
          <a-tag v-if="record.manual" color="blue">手工</a-tag>
          <a-tag v-else color="orange">预警</a-tag>
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
            style="width: 100%"
          />
        </template>
        <template v-else-if="column.key === 'action'">
          <a-select
            v-model:value="record.action"
            size="small"
            style="width: 100%"
            :options="actionOpts"
          />
        </template>
        <template v-else-if="column.key === 'bomLabel'">
          {{ record.bomLabel || '-' }}
        </template>
        <template v-else-if="column.key === 'ops'">
          <a-button
            type="link"
            size="small"
            :disabled="!(Number(record.planQty) > 0)"
            @click="handleConfirm([record.key])"
          >
            执行补货
          </a-button>
        </template>
      </template>
    </a-table>

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

    <GenerateOutsourceWorkOrderModal
      v-model:open="outsourceModalOpen"
      column-mode="replenish"
      :order="modalOrder"
      :materials="modalMaterials"
      @save="onOutsourceSaved"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, h } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { useTabs } from '@/composables/useTabs'
import { PLAN_SOURCE } from '@/utils/planSource'
import {
  REPLENISH_ACTION,
  REPLENISH_ACTION_OPTIONS,
  buildManualReplenishRow,
  listStockReplenishSuggestions,
} from '@/utils/stockReplenish'
import { createProductionPlanFromStockReplenish } from '@/store/productionPlanStore'
import { addPurchaseRequisition } from '@/store/purchaseRequisitionStore'
import { addOutsourceWorkOrdersFromPlanRows } from '@/store/workOrderStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import GeneratePurchaseRequisitionModal from './GeneratePurchaseRequisitionModal.vue'
import GenerateOutsourceWorkOrderModal from './GenerateOutsourceWorkOrderModal.vue'
import { applyReplenishExecuteToLedger } from '@/store/replenishLedgerStore'

defineProps({
  tableScrollY: { type: [Number, String], default: 'calc(100vh - 280px)' },
})

const emit = defineEmits(['created'])

const router = useRouter()
const { openTab } = useTabs()

const rows = ref([])
const selectedKeys = ref([])
const pickOpen = ref(false)
const purchaseModalOpen = ref(false)
const outsourceModalOpen = ref(false)
const modalOrder = ref(null)
const modalMaterials = ref([])
/** 打开弹窗时对应的预警行，保存后写台账用 */
const pendingReplenishRows = ref([])

const actionOpts = REPLENISH_ACTION_OPTIONS

const columns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '来源', key: 'source', width: 72, fixed: 'left' },
  { title: '编码', dataIndex: 'productCode', width: 110, fixed: 'left' },
  { title: '名称', dataIndex: 'productName', ellipsis: true, width: 140 },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 72, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 90, ellipsis: true },
  { title: '当前库存', dataIndex: 'availableStock', width: 88, align: 'right' },
  { title: '在途/在制', key: 'inTransit', width: 110, ellipsis: true },
  { title: '最低', dataIndex: 'minStockQty', width: 64, align: 'right' },
  { title: '最高', dataIndex: 'maxStockQty', width: 64, align: 'right' },
  { title: '建议', dataIndex: 'suggestQty', width: 72, align: 'right' },
  { title: '数量', key: 'planQty', width: 100 },
  { title: '动作', key: 'action', width: 96 },
  { title: 'BOM', key: 'bomLabel', width: 140, ellipsis: true },
  { title: '操作', key: 'ops', width: 96, fixed: 'right' },
]

const selectedRows = computed(() =>
  rows.value.filter((r) => selectedKeys.value.includes(r.key) && Number(r.planQty) > 0),
)

const selectedActionKinds = computed(() => {
  const set = new Set(selectedRows.value.map((r) => r.action))
  return [...set]
})

const hasMixedActions = computed(
  () => selectedKeys.value.length > 0 && selectedActionKinds.value.length > 1,
)

const batchExecuteDisabled = computed(() => !selectedKeys.value.length || hasMixedActions.value)

const batchDisabledTip = computed(() => {
  if (!selectedKeys.value.length) return '请先勾选要执行的行'
  if (hasMixedActions.value) return '勾选行包含不同动作，请只勾选同一动作后再批量执行'
  return ''
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedKeys.value,
  onChange: (keys) => {
    selectedKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: !(Number(record.planQty) > 0),
  }),
}))

function refreshRows() {
  const alertRows = listStockReplenishSuggestions()
  const manualKeep = rows.value.filter((r) => r.manual)
  const map = new Map()
  ;[...alertRows, ...manualKeep].forEach((r) => map.set(r.key, r))
  rows.value = [...map.values()]
  selectedKeys.value = selectedKeys.value.filter((key) =>
    rows.value.some((r) => r.key === key && Number(r.planQty) > 0),
  )
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
  const label = action === REPLENISH_ACTION.PURCHASE ? '采购补货' : '外协补货'
  return {
    id: `replenish-${action}-${Date.now()}`,
    orderNo: '',
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
      inTransitQty: Number(r.inTransitQty) || 0,
      inTransitText: r.inTransitText || '—',
      remark: r.manual ? '手工补货' : '库存预警',
    }
  })
}

function openPurchaseModal(list) {
  pendingReplenishRows.value = list.map((r) => ({ ...r }))
  modalOrder.value = buildSyntheticOrder(REPLENISH_ACTION.PURCHASE)
  modalMaterials.value = mapReplenishRowsToPlanMaterials(list, '外购件')
  purchaseModalOpen.value = true
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
      `已跳过无 BOM 的生产行：${skippedNoBom.map((r) => r.productName).join('、')}（可改动作「采购/外协」后重试）`,
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
  emit('created', { plan, purchaseReq: null, outsourceOrders: [] })
  afterExecuteCleanup(producedRows.map((r) => r.key))
}

function executeProduce(selected) {
  const withBom = selected.filter((r) => r.hasBom)
  const skippedNoBom = selected.filter((r) => !r.hasBom)
  if (!withBom.length) {
    message.warning(
      `未生成单据：所选「生产」行均无 BOM（${skippedNoBom.map((r) => r.productName).join('、')}），请改采购/外协或先维护 BOM`,
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
  emit('created', { plan: null, purchaseReq: requisition, outsourceOrders: [] })
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
  emit('created', { plan: null, purchaseReq: null, outsourceOrders: created })
  afterExecuteCleanup(handled.map((r) => r.key))
}

/** @param {string[]=} onlyKeys 指定则只执行这些行；否则执行当前勾选 */
function handleConfirm(onlyKeys) {
  const keySet = Array.isArray(onlyKeys) && onlyKeys.length ? new Set(onlyKeys) : null
  const selected = rows.value.filter((r) => {
    if (!(Number(r.planQty) > 0)) return false
    if (keySet) return keySet.has(r.key)
    return selectedKeys.value.includes(r.key)
  })
  if (!selected.length) {
    message.warning('请先勾选要执行的行，并确认数量大于 0')
    return
  }

  const actions = [...new Set(selected.map((r) => r.action))]
  if (actions.length > 1) {
    message.warning('所选行包含不同动作，请只选择同一动作后再执行')
    return
  }

  const action = actions[0]
  if (action === REPLENISH_ACTION.PRODUCE) {
    executeProduce(selected)
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
.hint {
  margin-bottom: 12px;
}
.toolbar {
  margin-bottom: 8px;
}
.replenish-table {
  margin-top: 4px;
}
.batch-btn-wrap {
  display: inline-block;
}
</style>
