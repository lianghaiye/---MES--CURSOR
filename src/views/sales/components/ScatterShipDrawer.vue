<template>
  <a-drawer
    :open="open"
    :title="`选择发运物料 — ${lineLabel}`"
    width="1120"
    class="scatter-ship-drawer"
    :mask-closable="false"
    destroy-on-close
    @close="handleClose"
  >
    <div class="drawer-section">
      <div class="section-title">EBOM 物料</div>
      <a-table
        :columns="materialColumns"
        :data-source="displayRows"
        row-key="materialId"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ y: 420 }"
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
          <template v-else-if="column.key === 'supplyType'">
            {{ record.supplyType || '—' }}
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
      <a-space>
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" @click="handleOk">确定</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons-vue'
import {
  buildShipMaterialRowsFromSnapshot,
  getDescendantPickRows,
  getExpandableMaterialIds,
  getVisibleMaterialPickRows,
  isAssemblySupplyRow,
  mergeMaterialPicksWithSaved,
  refreshMaterialPickSelectability,
  resolveInitialExpandedMaterialIds,
  unselectDescendantPicks,
} from '@/utils/shipEbom'

const props = defineProps({
  open: { type: Boolean, default: false },
  shipment: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'save'])

const allMaterialRows = ref([])
const expandedMaterialIds = ref([])
const localRemark = ref('')

const lineLabel = computed(() => {
  const s = props.shipment
  if (!s) return ''
  return `${s.productName || ''}（${s.productCode || ''}）`
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
  { title: '物料名称', key: 'name', width: 240, ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 108, ellipsis: true },
  { title: '物料类型', key: 'materialType', width: 80 },
  { title: '供应型态', key: 'supplyType', width: 80 },
  { title: '需求', dataIndex: 'demandQty', width: 64, align: 'right' },
  { title: '可用', dataIndex: 'availableStock', width: 64, align: 'right' },
  { title: '缺口', key: 'gapQty', width: 56, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 48 },
  { title: '本次发运', key: 'shipQty', width: 108, align: 'right', fixed: 'right' },
]

function applyExpandAndSelectability() {
  refreshMaterialPickSelectability(allMaterialRows.value, expandedMaterialIds.value)
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.shipment) return
    const snapshot =
      props.shipment.ebomSnapshot ||
      (props.shipment.materials?.length ? { materials: props.shipment.materials } : null)

    const saved = props.shipment.materialPicks || []
    if (snapshot?.materials?.length) {
      const built = buildShipMaterialRowsFromSnapshot(snapshot)
      allMaterialRows.value = saved.length ? mergeMaterialPicksWithSaved(built, saved) : built
    } else {
      allMaterialRows.value = JSON.parse(JSON.stringify(saved))
    }
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
  }
  return true
}

function handleOk() {
  if (!validatePicks()) return
  emit('save', {
    materialPicks: JSON.parse(JSON.stringify(allMaterialRows.value)),
    remark: localRemark.value,
  })
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.scatter-ship-drawer {
  :deep(.ant-drawer-body) {
    padding-bottom: 8px;
  }
}

.drawer-section {
  margin-bottom: 20px;

  :deep(.ant-table-wrapper) {
    overflow-x: visible;
  }

  :deep(.ant-table) {
    min-width: 100%;
  }
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  font-size: 13px;
}

.gap-warn {
  color: #cf1322;
}

.remark-field {
  margin-top: 8px;
}

.tree-toggle-btn {
  padding: 0 4px;
  height: auto;
  font-size: 12px;
}

.select-cell {
  display: flex;
  justify-content: center;
}

.name-cell {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 2px;
}

.assembly-select-all {
  flex-shrink: 0;
  margin-right: 2px;
}

.row-expand-btn {
  width: 20px;
  padding: 0;
  flex-shrink: 0;
}

.expand-placeholder {
  display: inline-block;
  width: 20px;
  flex-shrink: 0;
}

.name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.supply-tag {
  margin-left: 4px;
  flex-shrink: 0;
}

.ship-qty-input {
  width: 100%;
  max-width: 96px;
}
</style>
