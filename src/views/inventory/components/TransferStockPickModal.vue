<template>
  <a-modal
    :open="open"
    title="选择调出仓库存"
    width="1280px"
    :mask-closable="false"
    destroy-on-close
    class="transfer-stock-pick-modal"
    @cancel="handleCancel"
  >
    <div class="filter-card">
      <a-form :model="search" layout="inline" class="filter-form horizontal-form">
        <ListFilterBar
          :field-count="6"
          search-text="搜索"
          reset-text="清空"
          @search="handleSearch"
          @reset="handleReset"
        >
          <a-form-item label="产品编码">
            <a-input
              v-model:value="search.itemCode"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="产品名称">
            <a-input
              v-model:value="search.itemName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="search.specModel"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="材质">
            <a-input
              v-model:value="search.material"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="图号">
            <a-input
              v-model:value="search.drawingNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="货位号">
            <a-input
              v-model:value="search.locationNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
    </div>

    <a-tabs v-model:activeKey="ownershipTab" size="small" class="ownership-tabs">
      <a-tab-pane key="all" tab="全部" />
      <a-tab-pane key="free" tab="自由备货" />
      <a-tab-pane key="dedicated" tab="按单在库" />
    </a-tabs>

    <div class="picker-body">
      <div class="table-panel">
        <a-table
          :columns="columns"
          :data-source="pagedRows"
          row-key="rowKey"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: tableScrollX, y: tableScrollY }"
          :row-selection="rowSelection"
          :custom-row="customRow"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ (page - 1) * pageSize + index + 1 }}
            </template>
            <template v-else-if="column.key === 'ownership'">
              <a-tag :color="record.dedicated ? 'orange' : 'blue'">
                {{ record.dedicated ? '按单' : '自由' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'qtyText'">
              {{ record.qtyText }}
            </template>
            <template v-else-if="column.key === 'salesOrderNo'">
              {{ record.dedicated ? record.salesOrderNo || '—' : '—' }}
            </template>
            <template v-else>
              {{ displayCell(record[column.dataIndex]) }}
            </template>
          </template>
        </a-table>
        <div class="table-pagination">
          <a-pagination
            v-model:current="page"
            v-model:page-size="pageSize"
            :total="filteredRows.length"
            size="small"
            show-size-changer
            :page-size-options="['10', '20', '50']"
            :show-total="(t) => `共 ${t} 条`"
          />
        </div>
      </div>

      <div class="selected-panel">
        <div class="selected-head">
          <span class="selected-title">已选 {{ selectedRows.length }} 项</span>
          <a-button
            v-if="selectedRows.length"
            type="link"
            size="small"
            class="clear-btn"
            @click="clearSelection"
          >
            清空
          </a-button>
        </div>
        <div v-if="selectedRows.length" class="selected-list">
          <div v-for="item in selectedRows" :key="item.rowKey" class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ item.itemCode }}</span>
              <span class="selected-name" :title="item.itemName">{{ item.itemName }}</span>
              <span class="selected-meta">
                {{ item.dedicated ? `按单 ${item.salesOrderNo || '—'}` : '自由备货' }}
                · {{ item.qtyText }}
              </span>
            </div>
            <a-button
              type="text"
              size="small"
              class="remove-btn"
              @click="removeSelected(item.rowKey)"
            >
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRows.length" @click="handleConfirm">
        添加 ({{ selectedRows.length }})
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
import { stockState } from '@/store/stockStore'
import { listBatches, listFreeBatches, sumFreeQty } from '@/store/stockBatchStore'
import { getTransferSoftLockedQty, transferSoftLockState } from '@/store/transferSoftLockStore'
import { findMasterItemByCode } from '@/utils/stockAlertDisplay'
import { getWarehouseStockQty } from '@/utils/inboundLineHelpers'
import { lineVariantSummary } from '@/utils/spuLineResolve'

const props = defineProps({
  open: { type: Boolean, default: false },
  warehouse: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

/** 默认自由备货 */
const ownershipTab = ref('free')
const search = reactive(emptySearch())
const applied = reactive(emptySearch())
const selectedRowKeys = ref([])
const selectedRows = ref([])
const page = ref(1)
const pageSize = ref(10)

function emptySearch() {
  return {
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
    drawingNo: '',
    locationNo: '',
  }
}

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '归属', key: 'ownership', width: 72, align: 'center' },
  { title: '产品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '产品编码', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '库存数量', key: 'qtyText', width: 110, align: 'right' },
  { title: '销售单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 130 },
]

const tableScrollX = computed(() => columns.reduce((s, c) => s + (c.width || 90), 0))
const tableScrollY = 360

function isDedicatedBatch(b) {
  return Boolean(b?.salesOrderId || b?.salesOrderNo)
}

function resolveItemMeta(itemCode, batch) {
  const hit = findMasterItemByCode(itemCode)
  const master = hit?.item || {}
  const attrs = batch?.attrs || {}
  const specModel = attrs.specModel || attrs.spec || master.specModel || master.spec || ''
  const material = attrs.material || master.material || ''
  const drawingNo = attrs.drawingNo || master.drawingNo || ''
  const locationNo =
    batch?.locationNo || attrs.locationNo || master.locationNo || master.defaultLocationNo || ''
  const variantSummary =
    attrs.variantSummary ||
    lineVariantSummary({
      spuId: master.spuId || batch?.spuId,
      variantValues: master.variantValues || attrs.variantValues || batch?.variantValues || {},
    }) ||
    master.variantSummary ||
    ''
  return {
    itemName: batch?.itemName || master.name || itemCode,
    unit: batch?.unit || master.inventoryUnit || master.stockUnit || '件',
    specModel,
    material,
    drawingNo,
    locationNo,
    variantSummary,
    itemType: hit?.kind === 'product' ? '产品' : master.itemType || '物料',
  }
}

function formatQtyText(qty, unit) {
  const n = Number(qty)
  const q = Number.isFinite(n) ? n : 0
  const u = String(unit || '').trim()
  return u ? `${q} ${u}` : String(q)
}

function buildFreeRows(wh) {
  const codes = new Set()
  listFreeBatches({ warehouse: wh }).forEach((b) => {
    if (!isDedicatedBatch(b)) codes.add(b.itemCode)
  })
  ;(stockState.records || []).forEach((r) => {
    if (r.warehouse === wh && r.itemCode) codes.add(r.itemCode)
  })
  const rows = []
  codes.forEach((code) => {
    const free = sumFreeQty({ warehouse: wh, itemCode: code })
    const whQty = getWarehouseStockQty(wh, code)
    const locked = getTransferSoftLockedQty({ warehouse: wh, itemCode: code })
    const base = free > 0 ? free : whQty
    const qty = Math.max(0, base - locked)
    if (!(qty > 0)) return
    const sample = listFreeBatches({ warehouse: wh, itemCode: code }).find(
      (b) => !isDedicatedBatch(b),
    )
    const meta = resolveItemMeta(code, sample)
    rows.push({
      rowKey: `f-${code}`,
      itemCode: code,
      itemName: meta.itemName,
      qty,
      unit: meta.unit,
      qtyText: formatQtyText(qty, meta.unit),
      batchId: '',
      batchNo: '',
      salesOrderId: '',
      salesOrderNo: '',
      salesLineId: '',
      dedicated: false,
      specModel: meta.specModel,
      material: meta.material,
      drawingNo: meta.drawingNo,
      locationNo: meta.locationNo,
      variantSummary: meta.variantSummary,
      itemType: meta.itemType,
    })
  })
  return rows
}

function buildDedicatedRows(wh) {
  return listBatches({ warehouse: wh, inStockOnly: true })
    .filter((b) => isDedicatedBatch(b))
    .map((b) => {
      const raw = Number(b.currentLength) || 0
      const locked = getTransferSoftLockedQty({
        warehouse: wh,
        itemCode: b.itemCode,
        batchId: b.id,
      })
      const qty = Math.max(0, raw - locked)
      if (!(qty > 0)) return null
      const meta = resolveItemMeta(b.itemCode, b)
      return {
        rowKey: `b-${b.id}`,
        itemCode: b.itemCode,
        itemName: meta.itemName,
        qty,
        unit: meta.unit,
        qtyText: formatQtyText(qty, meta.unit),
        batchId: b.id,
        batchNo: b.batchNo || '',
        salesOrderId: b.salesOrderId || '',
        salesOrderNo: b.salesOrderNo || '',
        salesLineId: b.salesLineId || '',
        dedicated: true,
        specModel: meta.specModel,
        material: meta.material,
        drawingNo: meta.drawingNo,
        locationNo: meta.locationNo,
        variantSummary: meta.variantSummary,
        itemType: meta.itemType,
      }
    })
    .filter(Boolean)
}

const allRows = computed(() => {
  const wh = String(props.warehouse || '').trim()
  if (!wh) return []
  void stockState.records
  void transferSoftLockState.locks
  const tab = ownershipTab.value
  if (tab === 'free') return buildFreeRows(wh)
  if (tab === 'dedicated') return buildDedicatedRows(wh)
  return [...buildFreeRows(wh), ...buildDedicatedRows(wh)]
})

function includesKw(hay, needle) {
  if (!needle) return true
  return String(hay || '')
    .toLowerCase()
    .includes(needle)
}

const filteredRows = computed(() => {
  const f = applied
  const codeKw = String(f.itemCode || '')
    .trim()
    .toLowerCase()
  const nameKw = String(f.itemName || '')
    .trim()
    .toLowerCase()
  const specKw = String(f.specModel || '')
    .trim()
    .toLowerCase()
  const matKw = String(f.material || '')
    .trim()
    .toLowerCase()
  const drawKw = String(f.drawingNo || '')
    .trim()
    .toLowerCase()
  const locKw = String(f.locationNo || '')
    .trim()
    .toLowerCase()
  return allRows.value.filter((r) => {
    if (!includesKw(r.itemCode, codeKw)) return false
    if (!includesKw(r.itemName, nameKw)) return false
    if (!includesKw(r.specModel, specKw)) return false
    if (!includesKw(r.material, matKw)) return false
    if (!includesKw(r.drawingNo, drawKw)) return false
    if (!includesKw(r.locationNo, locKw)) return false
    return true
  })
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    const map = new Map(selectedRows.value.map((r) => [r.rowKey, r]))
    filteredRows.value.forEach((r) => {
      if (keys.includes(r.rowKey)) map.set(r.rowKey, r)
    })
    selectedRowKeys.value = keys
    selectedRows.value = keys.map((k) => map.get(k)).filter(Boolean)
  },
}))

function customRow(record) {
  return {
    onClick: () => {
      const key = record.rowKey
      const set = new Set(selectedRowKeys.value)
      if (set.has(key)) {
        set.delete(key)
        selectedRows.value = selectedRows.value.filter((r) => r.rowKey !== key)
      } else {
        set.add(key)
        if (!selectedRows.value.some((r) => r.rowKey === key)) {
          selectedRows.value = [...selectedRows.value, record]
        }
      }
      selectedRowKeys.value = [...set]
    },
  }
}

function displayCell(val) {
  const t = String(val ?? '').trim()
  return t || '—'
}

function handleSearch() {
  Object.assign(applied, { ...search })
  page.value = 1
}

function handleReset() {
  Object.assign(search, emptySearch())
  Object.assign(applied, emptySearch())
  page.value = 1
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRows.value = []
}

function removeSelected(rowKey) {
  selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== rowKey)
  selectedRows.value = selectedRows.value.filter((r) => r.rowKey !== rowKey)
}

function resetState() {
  ownershipTab.value = 'free'
  Object.assign(search, emptySearch())
  Object.assign(applied, emptySearch())
  clearSelection()
  page.value = 1
  pageSize.value = 10
}

watch(
  () => props.open,
  (open) => {
    if (open) resetState()
  },
)

watch(ownershipTab, () => {
  page.value = 1
})

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRows.value.length) {
    message.warning('请至少选择一项')
    return
  }
  emit(
    'confirm',
    selectedRows.value.map((r) => ({ ...r })),
  )
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.ownership-tabs {
  margin-bottom: 8px;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}

.picker-body {
  display: flex;
  gap: 12px;
  height: 480px;
  max-height: calc(86vh - 260px);
  min-height: 420px;
}

.table-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.table-pagination {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.selected-panel {
  width: 260px;
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  flex-shrink: 0;
}

.selected-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.clear-btn {
  padding: 0;
  height: auto;
}

.selected-list {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 8px;
}

.selected-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  margin-bottom: 6px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.selected-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-code {
  font-size: 12px;
  color: #1677ff;
  font-weight: 500;
}

.selected-name {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selected-meta {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}

.remove-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);

  &:hover {
    color: #ff4d4f;
  }
}

.selected-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}
</style>
