<template>
  <div class="batch-alloc-editor">
    <a-select
      :value="selectedIds"
      mode="multiple"
      allow-clear
      show-search
      option-filter-prop="label"
      placeholder="搜索并多选批次"
      style="width: 100%"
      :options="options"
      :max-tag-count="3"
      @change="onSelectChange"
    />
    <div v-if="tip" class="alloc-tip">{{ tip }}</div>
    <a-table
      v-if="rows.length"
      class="alloc-table"
      size="small"
      bordered
      :pagination="false"
      :columns="columns"
      :data-source="rows"
      row-key="batchId"
      :expandable="expandableConfig"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'available'">
          {{ formatQty(record.available) }}{{ unitLabel }}
          <span v-if="isPieceRow(record)" class="piece-tag">件码</span>
        </template>
        <template v-else-if="column.key === 'qty'">
          <a-input-number
            :value="record.qty"
            :min="0.001"
            :max="qtyMaxFor(record)"
            :precision="4"
            size="small"
            style="width: 100%"
            :disabled="isPieceQtyLocked(record)"
            @update:value="(v) => onQtyChange(record.batchId, v)"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeRow(record.batchId)">移除</a>
        </template>
      </template>
      <template #expandedRowRender="{ record }">
        <div v-if="isPieceRow(record)" class="piece-pick">
          <div class="piece-pick-label">
            {{
              allowPieceSplit
                ? '勾选件码：多件合计须等于出库数量；单件可大于出库数量（确认后核销并生成余料件码）'
                : '勾选出库件码（合计即出库数量）'
            }}
          </div>
          <a-checkbox-group
            :value="record.pieceIds || []"
            class="piece-check-group"
            @change="(ids) => onPieceIdsChange(record.batchId, ids)"
          >
            <div v-for="p in piecesOf(record.batchId)" :key="p.id" class="piece-check-item">
              <a-checkbox :value="p.id">
                {{ p.serialNo }}
                <span class="piece-qty">{{ formatQty(p.pieceQty) }}{{ unitLabel }}</span>
              </a-checkbox>
            </div>
          </a-checkbox-group>
          <div v-if="!(piecesOf(record.batchId) || []).length" class="alloc-tip">无在库件码</div>
        </div>
        <div v-else class="alloc-tip">普通批次，按数量扣减即可</div>
      </template>
    </a-table>
    <div v-if="rows.length" class="alloc-sum">
      合计出库：<strong>{{ formatQty(totalQty) }}</strong> {{ unitLabel }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatNumber } from '@/utils/numberFormat'
import { getBatchById } from '@/store/stockBatchStore'
import { isPieceManagedBatch, listStockPieces } from '@/store/stockPieceStore'
import { buildAllocationsFromBatchIds, sumBatchAllocations } from '@/utils/outboundBatchAllocate'
import { isPartialDualUnitIssue } from '@/store/functionParamStore'

const props = defineProps({
  allocations: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  unitLabel: { type: String, default: '' },
  tip: { type: String, default: '' },
})

const emit = defineEmits(['update:allocations'])

const allowPieceSplit = computed(() => isPartialDualUnitIssue())

function formatQty(val) {
  return formatNumber(val, 4, { empty: '0' })
}

const columns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 130, ellipsis: true },
  { title: '余量', key: 'available', width: 120 },
  { title: '出库数量', key: 'qty', width: 120 },
  { title: '', key: 'actions', width: 56, align: 'center' },
]

const rows = computed(() => props.allocations || [])
const selectedIds = computed(() => rows.value.map((a) => a.batchId))
const totalQty = computed(() => sumBatchAllocations(rows.value))

const expandableConfig = computed(() => ({
  defaultExpandAllRows: rows.value.some((r) => isPieceRow(r)),
  rowExpandable: (record) => isPieceRow(record),
}))

function isPieceRow(record) {
  return isPieceManagedBatch(getBatchById(record.batchId))
}

function hasPieceSelection(record) {
  return Array.isArray(record.pieceIds) && record.pieceIds.length > 0
}

/** 多件勾选时数量锁定为件码合计；单件+部分出时可改出库数量（拆件） */
function isPieceQtyLocked(record) {
  if (!isPieceRow(record) || !hasPieceSelection(record)) return false
  if (allowPieceSplit.value && record.pieceIds.length === 1) return false
  return true
}

function qtyMaxFor(record) {
  if (
    allowPieceSplit.value &&
    isPieceRow(record) &&
    Array.isArray(record.pieceIds) &&
    record.pieceIds.length === 1
  ) {
    const p = listStockPieces({ batchId: record.batchId, inStockOnly: true }).find(
      (x) => x.id === record.pieceIds[0],
    )
    const pq = Number(p?.pieceQty) || 0
    if (pq > 0) return pq
  }
  return record.available > 0 ? record.available : undefined
}

function piecesOf(batchId) {
  return listStockPieces({ batchId, inStockOnly: true })
    .slice()
    .sort((a, b) => {
      const sa = String(a.serialNo || '')
      const sb = String(b.serialNo || '')
      if (sa !== sb) return sa < sb ? -1 : 1
      return (a.index || 0) - (b.index || 0)
    })
}

function onSelectChange(ids) {
  const next = buildAllocationsFromBatchIds({}, ids || [], props.allocations)
  emit('update:allocations', next)
}

function onQtyChange(batchId, value) {
  const next = rows.value.map((a) => {
    if (a.batchId !== batchId) return { ...a }
    let qty = Number(value)
    if (!Number.isFinite(qty) || qty <= 0) qty = null
    const max = qtyMaxFor(a)
    if (max != null && qty != null && qty > max) qty = max
    const keepPieces = allowPieceSplit.value && Array.isArray(a.pieceIds) && a.pieceIds.length === 1
    return {
      ...a,
      qty: qty == null ? a.qty : qty,
      pieceIds: keepPieces ? a.pieceIds : undefined,
      pieceSerialNos: keepPieces ? a.pieceSerialNos : undefined,
      pieceSplit: keepPieces || undefined,
    }
  })
  emit('update:allocations', next)
}

function onPieceIdsChange(batchId, ids) {
  const selected = Array.isArray(ids) ? ids.filter(Boolean) : []
  const pieces = piecesOf(batchId)
  const chosen = pieces.filter((p) => selected.includes(p.id))
  const sumQty =
    Math.round(chosen.reduce((s, p) => s + (Number(p.pieceQty) || 0), 0) * 10000) / 10000
  const next = rows.value.map((a) => {
    if (a.batchId !== batchId) return { ...a }
    // 单件+部分出：默认带出件量，允许再改小作出库数量
    let qty = selected.length ? sumQty : a.qty
    if (
      allowPieceSplit.value &&
      selected.length === 1 &&
      Number(a.qty) > 0 &&
      Number(a.qty) < sumQty
    ) {
      qty = a.qty
    }
    return {
      ...a,
      pieceIds: selected,
      pieceSerialNos: chosen.map((p) => p.serialNo),
      qty,
      pieceSplit: allowPieceSplit.value && selected.length === 1 && Number(qty) < sumQty,
    }
  })
  emit('update:allocations', next)
}

function removeRow(batchId) {
  emit(
    'update:allocations',
    rows.value.filter((a) => a.batchId !== batchId),
  )
}
</script>

<style lang="less" scoped>
.batch-alloc-editor {
  width: 100%;
}

.alloc-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.alloc-table {
  margin-top: 10px;
}

.alloc-sum {
  margin-top: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.danger-link {
  color: #ff4d4f;
}

.piece-tag {
  margin-left: 6px;
  font-size: 11px;
  color: #1677ff;
}

.piece-pick {
  padding: 4px 8px 8px;
}

.piece-pick-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 6px;
}

.piece-check-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.piece-check-item {
  line-height: 1.6;
}

.piece-qty {
  margin-left: 8px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
