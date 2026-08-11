<template>
  <a-drawer
    :open="open"
    :title="`选择发运物料 — ${lineLabel}`"
    width="1180"
    class="scatter-ship-drawer"
    :mask-closable="false"
    destroy-on-close
    @close="handleClose"
  >
    <div class="drawer-section">
      <div class="section-title-row">
        <div class="section-title">EBOM 物料</div>
        <div class="ship-sets-field">
          <span class="ship-sets-label">发货套数：</span>
          <a-input-number
            v-model:value="localShipSets"
            size="small"
            :min="0"
            :max="maxShipSets"
            :precision="0"
            style="width: 120px"
            @change="onShipSetsChange"
          />
          <span class="ship-sets-hint"
            >不可大于可发套数 {{ maxShipSets }}（订单 {{ orderQty }}）</span
          >
        </div>
      </div>
      <a-table
        :columns="materialColumns"
        :data-source="displayRows"
        row-key="materialId"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ y: 420, x: 1100 }"
        table-layout="fixed"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'selected'">
            <a-checkbox
              :checked="selectAllChecked"
              :indeterminate="selectAllIndeterminate"
              @change="onSelectAllChange"
            />
          </template>
          <template v-else-if="column.key === 'name'">
            <a-space :size="4">
              <span>物料名称</span>
              <a-button
                v-if="assemblyExpandableIds.length"
                type="link"
                size="small"
                class="tree-toggle-btn"
                @click="toggleExpandAllAssembly"
              >
                {{ assemblyFullyExpanded ? '收起组装' : '展开组装' }}
              </a-button>
            </a-space>
          </template>
          <template v-else-if="column.key === 'shipProgress'">
            <span>
              发货进度
              <a-tooltip title="已确认出库数量 / 已申请数量 / 订单需求数量">
                <QuestionCircleOutlined class="th-tip-icon" />
              </a-tooltip>
            </span>
          </template>
        </template>

        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'selected'">
            <div class="select-cell">
              <a-checkbox
                v-if="record.selectable !== false"
                v-model:checked="record.selected"
                @change="onMaterialSelect(record)"
              />
            </div>
          </template>
          <template v-else-if="column.key === 'name'">
            <span class="name-cell" :style="{ paddingLeft: `${(record.depth || 0) * 16}px` }">
              <a-checkbox
                v-if="showAssemblySelectAll(record)"
                :checked="isAssemblyChildrenAllSelected(record)"
                :indeterminate="isAssemblyChildrenIndeterminate(record)"
                class="assembly-select-all"
                @change="(e) => onAssemblySelectAll(record, e)"
              />
              <a-button
                v-if="record.canExpand"
                type="link"
                size="small"
                class="row-expand-btn"
                @click="toggleRowExpand(record)"
              >
                <CaretDownOutlined v-if="isRowExpanded(record)" />
                <CaretRightOutlined v-else />
              </a-button>
              <span v-else class="expand-placeholder" />
              <span class="name-text" :title="record.name">{{ record.name }}</span>
              <a-tag v-if="record.canExpand" size="small" color="orange" class="supply-tag">
                {{ record.supplyType }} · 可展开
              </a-tag>
            </span>
          </template>
          <template v-else-if="column.key === 'materialType'">
            {{ record.materialType || '—' }}
          </template>
          <template v-else-if="column.key === 'shipProgress'">
            {{
              formatMaterialShipProgress(
                record.shippedQty,
                record.appliedQty,
                record.orderDemandQty ?? record.demandQty,
              )
            }}
          </template>
          <template v-else-if="column.key === 'gapQty'">
            <span :class="{ 'gap-warn': record.gapQty > 0 }">{{ record.gapQty }}</span>
          </template>
          <template v-else-if="column.key === 'shipQty'">
            <a-input-number
              v-model:value="record.shipQty"
              size="small"
              :min="0"
              :precision="3"
              :disabled="!record.selected"
              class="ship-qty-input"
            />
          </template>
        </template>
      </a-table>
      <a-empty v-if="!displayRows.length" description="无 EBOM 物料，请确认订单已审核并生成 EBOM" />
    </div>

    <a-form-item label="发运备注" class="remark-field">
      <a-textarea v-model:value="localRemark" :rows="2" placeholder="选填" />
    </a-form-item>

    <template #footer>
      <div class="drawer-footer-actions">
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" @click="handleOk">确定</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  CaretDownOutlined,
  CaretRightOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue'
import {
  applyScatterShipSets,
  buildShipMaterialRowsFromSnapshot,
  formatMaterialShipProgress,
  getDescendantPickRows,
  getExpandableMaterialIds,
  getVisibleMaterialPickRows,
  isAssemblySupplyRow,
  mergeMaterialPicksWithSaved,
  refreshMaterialPickSelectability,
  resolveInitialExpandedMaterialIds,
  unselectDescendantPicks,
} from '@/utils/shipEbom'
import {
  calcScatterMaterialAppliedQty,
  calcScatterMaterialShippedQty,
} from '@/utils/salesLineShipped'

const props = defineProps({
  open: { type: Boolean, default: false },
  shipment: { type: Object, default: null },
  salesOrder: { type: Object, default: null },
  /** 编辑本单时排除自身，避免可发套数被本单占用 */
  excludeDeliveryId: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'save'])

const allMaterialRows = ref([])
const expandedMaterialIds = ref([])
const localRemark = ref('')
const localShipSets = ref(0)

const lineLabel = computed(() => {
  const s = props.shipment
  if (!s) return ''
  return `${s.productName || ''}（${s.productCode || ''}）`
})

const orderQty = computed(() => Number(props.shipment?.orderQty) || 0)

const maxShipSets = computed(() => {
  if (props.shipment?.maxShipSets != null)
    return Math.max(0, Number(props.shipment.maxShipSets) || 0)
  const applied = Number(props.shipment?.appliedShipQty) || 0
  return Math.max(0, orderQty.value - applied)
})

const expandableIds = computed(() => getExpandableMaterialIds(allMaterialRows.value))

const assemblyExpandableIds = computed(() =>
  expandableIds.value.filter((id) => {
    const row = allMaterialRows.value.find((r) => r.materialId === id)
    return row && isAssemblySupplyRow(row)
  }),
)

const assemblyFullyExpanded = computed(() => {
  const ids = assemblyExpandableIds.value
  if (!ids.length) return false
  return ids.every((id) => expandedMaterialIds.value.includes(id))
})

const displayRows = computed(() => {
  const visible = getVisibleMaterialPickRows(allMaterialRows.value, expandedMaterialIds.value)
  const map = new Map(allMaterialRows.value.map((r) => [r.materialId, r]))
  return visible.map((v) => map.get(v.materialId) || v)
})

const selectableRows = computed(() => displayRows.value.filter((r) => r.selectable !== false))

const selectAllChecked = computed(
  () => selectableRows.value.length > 0 && selectableRows.value.every((r) => r.selected),
)

const selectAllIndeterminate = computed(
  () => selectableRows.value.some((r) => r.selected) && !selectAllChecked.value,
)

const materialColumns = [
  { title: '', key: 'selected', width: 48, align: 'center', fixed: 'left' },
  { title: '物料名称', key: 'name', width: 220, ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 108, ellipsis: true },
  { title: '物料类型', key: 'materialType', width: 80 },
  { title: '发货进度', key: 'shipProgress', width: 130, align: 'right' },
  { title: '需求', dataIndex: 'demandQty', width: 64, align: 'right' },
  { title: '可用', dataIndex: 'availableStock', width: 64, align: 'right' },
  { title: '缺口', key: 'gapQty', width: 56, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 48 },
  { title: '本次发运', key: 'shipQty', width: 108, align: 'right', fixed: 'right' },
]

function applyExpandAndSelectability() {
  refreshMaterialPickSelectability(allMaterialRows.value, expandedMaterialIds.value)
}

function enrichMaterialProgress(rows) {
  const so = props.salesOrder
  const salesLineId = props.shipment?.salesLineId || props.shipment?.id
  const excludeIds = props.excludeDeliveryId ? [props.excludeDeliveryId] : []
  return (rows || []).map((row) => {
    const appliedQty = calcScatterMaterialAppliedQty(so, salesLineId, row.materialId, {
      excludeIds,
    })
    const shippedQty = calcScatterMaterialShippedQty(so, salesLineId, row.materialId, {
      excludeIds,
    })
    return {
      ...row,
      appliedQty,
      shippedQty,
      orderDemandQty:
        row.orderDemandQty != null
          ? Number(row.orderDemandQty)
          : Math.round((Number(row.unitDemandQty) || 0) * Math.max(1, orderQty.value) * 10000) /
            10000,
    }
  })
}

function onShipSetsChange(val) {
  const sets = Math.min(Math.max(0, Number(val) || 0), maxShipSets.value)
  localShipSets.value = sets
  const temp = {
    ...props.shipment,
    materialPicks: allMaterialRows.value,
    shipSets: sets,
    maxShipSets: maxShipSets.value,
    orderQty: orderQty.value,
  }
  applyScatterShipSets(temp, sets)
  allMaterialRows.value = enrichMaterialProgress(temp.materialPicks)
  applyExpandAndSelectability()
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.shipment) return
    const snapshot =
      props.shipment.ebomSnapshot ||
      (props.shipment.materials?.length ? { materials: props.shipment.materials } : null)

    const saved = props.shipment.materialPicks || []
    let built
    if (snapshot?.materials?.length) {
      built = buildShipMaterialRowsFromSnapshot(snapshot).map((row) => {
        const orderDemand = Number(row.demandQty) || 0
        const oq = Math.max(1, orderQty.value)
        const unitDemand = Math.round((orderDemand / oq) * 10000) / 10000
        return {
          ...row,
          unitDemandQty: unitDemand,
          orderDemandQty: orderDemand,
        }
      })
      allMaterialRows.value = saved.length ? mergeMaterialPicksWithSaved(built, saved) : built
    } else {
      allMaterialRows.value = JSON.parse(JSON.stringify(saved))
    }

    const initialSets =
      props.shipment.shipSets != null ? Number(props.shipment.shipSets) : maxShipSets.value
    localShipSets.value = Math.min(Math.max(0, initialSets), maxShipSets.value)
    const temp = {
      ...props.shipment,
      materialPicks: allMaterialRows.value,
      maxShipSets: maxShipSets.value,
      orderQty: orderQty.value,
    }
    applyScatterShipSets(temp, localShipSets.value)
    // 保留已保存的勾选发运量
    if (saved.length) {
      const savedMap = new Map(saved.map((r) => [r.materialId, r]))
      temp.materialPicks.forEach((row) => {
        const prev = savedMap.get(row.materialId)
        if (prev?.selected) {
          row.selected = true
          row.shipQty = Number(prev.shipQty) || row.demandQty
        }
      })
    }
    allMaterialRows.value = enrichMaterialProgress(temp.materialPicks)
    expandedMaterialIds.value = resolveInitialExpandedMaterialIds(allMaterialRows.value, saved)
    localRemark.value = props.shipment.remark || ''
    applyExpandAndSelectability()
  },
)

watch(expandedMaterialIds, applyExpandAndSelectability, { deep: true })

function isRowExpanded(record) {
  return expandedMaterialIds.value.includes(record.materialId)
}

function showAssemblySelectAll(record) {
  return record.canExpand && isAssemblySupplyRow(record)
}

function getAssemblySelectableDescendants(record) {
  if (!isRowExpanded(record)) return []
  return getDescendantPickRows(allMaterialRows.value, record.materialId).filter(
    (r) => r.selectable !== false,
  )
}

function isAssemblyChildrenAllSelected(record) {
  const list = getAssemblySelectableDescendants(record)
  return list.length > 0 && list.every((r) => r.selected)
}

function isAssemblyChildrenIndeterminate(record) {
  const list = getAssemblySelectableDescendants(record)
  if (!list.length) return false
  const n = list.filter((r) => r.selected).length
  return n > 0 && n < list.length
}

function ensureRowExpanded(materialId) {
  if (!expandedMaterialIds.value.includes(materialId)) {
    expandedMaterialIds.value = [...expandedMaterialIds.value, materialId]
  }
}

function toggleRowExpand(record) {
  const id = record.materialId
  const idx = expandedMaterialIds.value.indexOf(id)
  if (idx === -1) {
    expandedMaterialIds.value = [...expandedMaterialIds.value, id]
    if (record.selected) {
      record.selected = false
      record.shipQty = 0
    }
  } else {
    expandedMaterialIds.value = expandedMaterialIds.value.filter((k) => k !== id)
    unselectDescendantPicks(allMaterialRows.value, id)
  }
  applyExpandAndSelectability()
}

function toggleExpandAllAssembly() {
  if (assemblyFullyExpanded.value) {
    const remove = new Set(assemblyExpandableIds.value)
    expandedMaterialIds.value = expandedMaterialIds.value.filter((id) => !remove.has(id))
    assemblyExpandableIds.value.forEach((id) => unselectDescendantPicks(allMaterialRows.value, id))
  } else {
    const merged = new Set([...expandedMaterialIds.value, ...assemblyExpandableIds.value])
    expandedMaterialIds.value = [...merged]
  }
  applyExpandAndSelectability()
}

function onAssemblySelectAll(record, e) {
  const checked = e.target.checked
  ensureRowExpanded(record.materialId)
  applyExpandAndSelectability()

  const parent = allMaterialRows.value.find((r) => r.materialId === record.materialId)
  if (parent) {
    parent.selected = false
    parent.shipQty = 0
  }

  const descendants = getDescendantPickRows(allMaterialRows.value, record.materialId).filter(
    (r) => r.selectable !== false,
  )
  descendants.forEach((row) => {
    row.selected = checked
    row.shipQty = checked ? Math.max(0, Number(row.demandQty) || 1) : 0
  })
}

function onSelectAllChange(e) {
  const checked = e.target.checked
  const ids = new Set(selectableRows.value.map((r) => r.materialId))
  allMaterialRows.value.forEach((row) => {
    if (!ids.has(row.materialId)) return
    row.selected = checked
    if (checked && !Number(row.shipQty)) {
      row.shipQty = Math.max(0, Number(row.demandQty) || 1)
    }
    if (!checked) row.shipQty = 0
  })
}

function onMaterialSelect(record) {
  if (record.selected && record.canExpand) {
    unselectDescendantPicks(allMaterialRows.value, record.materialId)
  }
  if (record.selected && !Number(record.shipQty)) {
    record.shipQty = Math.max(0, Number(record.demandQty) || 1)
  }
  if (!record.selected) record.shipQty = 0
}

function handleClose() {
  emit('update:open', false)
}

function validatePicks() {
  if (localShipSets.value > maxShipSets.value + 1e-9) {
    message.warning(`发货套数不能大于可发套数 ${maxShipSets.value}`)
    return false
  }
  const matOk = allMaterialRows.value.some(
    (r) => r.selectable !== false && r.selected && Number(r.shipQty) > 0,
  )
  if (!matOk) {
    message.warning('请至少勾选一项 EBOM 物料，并填写本次发运数量')
    return false
  }
  for (const r of allMaterialRows.value) {
    if (r.selected && (!Number(r.shipQty) || Number(r.shipQty) <= 0)) {
      message.warning(`物料「${r.name}」已勾选，请填写发运数量`)
      return false
    }
    if (r.selected) {
      const remain = (Number(r.orderDemandQty) || 0) - (Number(r.appliedQty) || 0)
      if (Number(r.shipQty) > remain + 1e-9) {
        message.warning(
          `物料「${r.name}」本次发运不能超过剩余可发 ${remain}（订单需求 ${r.orderDemandQty}，已申请 ${r.appliedQty}）`,
        )
        return false
      }
    }
  }
  return true
}

function handleOk() {
  if (!validatePicks()) return
  emit('save', {
    materialPicks: JSON.parse(JSON.stringify(allMaterialRows.value)),
    remark: localRemark.value,
    shipSets: localShipSets.value,
  })
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.scatter-ship-drawer {
  :deep(.ant-drawer-body) {
    padding-bottom: 8px;
  }

  :deep(.ant-drawer-footer) {
    text-align: right;
  }
}

.drawer-footer-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}

.drawer-section {
  margin-bottom: 20px;

  :deep(.ant-table-wrapper) {
    .ant-table-thead > tr > th {
      background: #fafafa;
    }
  }
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.section-title {
  font-weight: 600;
  font-size: 14px;
}

.ship-sets-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ship-sets-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.ship-sets-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.th-tip-icon {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
}

.select-cell {
  display: flex;
  justify-content: center;
}

.name-cell {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-expand-btn {
  padding: 0 2px;
  min-width: 20px;
}

.expand-placeholder {
  display: inline-block;
  width: 20px;
}

.assembly-select-all {
  margin-right: 2px;
}

.supply-tag {
  margin-left: 4px;
  flex-shrink: 0;
}

.gap-warn {
  color: #cf1322;
  font-weight: 600;
}

.ship-qty-input {
  width: 100%;
}

.remark-field {
  margin-bottom: 0;
}

.tree-toggle-btn {
  padding: 0 4px;
}
</style>
