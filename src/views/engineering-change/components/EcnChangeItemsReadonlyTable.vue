<template>
  <div class="ecn-change-items-readonly">
    <div class="diff-legend">
      <span class="legend-item legend-before">变更前</span>
      <span class="legend-arrow">→</span>
      <span class="legend-item legend-after">变更后</span>
      <span class="legend-hint">高亮字段表示本次有变化</span>
    </div>
    <a-table
      :columns="columns"
      :data-source="items"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :locale="{ emptyText: '暂无变更技术内容' }"
      :scroll="{ x: 1700 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>

        <template v-else-if="column.key === 'changeType'">
          <a-tag :color="ecnChangeItemTypeColor(record.changeType)" size="small">
            {{ record.changeType || '—' }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'origMaterialName'">
          <span
            v-if="showOrig(record)"
            :class="cellClass(record, 'origMaterialName')"
            :title="record.origMaterialName"
          >
            {{ record.origMaterialName || '—' }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'origCodeSpec'">
          <span
            v-if="showOrig(record)"
            :class="cellClass(record, 'origCodeSpec')"
            :title="formatOrigDetailRow(record)"
          >
            {{ formatOrigDetailRow(record) }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'origUnitQty'">
          <span v-if="showOrig(record)" :class="cellClass(record, 'origUnitQty')">
            {{ record.origUnitQty ?? '—' }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'origProcessDoc'">
          <span
            v-if="showOrig(record)"
            :class="cellClass(record, 'origProcessDoc')"
            :title="record.origProcessDoc"
          >
            {{ record.origProcessDoc || '—' }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'newMaterialName'">
          <span
            v-if="showNew(record)"
            :class="cellClass(record, 'newMaterialName')"
            :title="record.newMaterialName"
          >
            {{ record.newMaterialName || '—' }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'newMaterialDetail'">
          <span
            v-if="showNew(record)"
            :class="cellClass(record, 'newMaterialDetail')"
            :title="formatNewDetailRow(record)"
          >
            {{ formatNewDetailRow(record) }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'newUnitQty'">
          <span v-if="showNew(record)" :class="cellClass(record, 'newUnitQty')">
            {{ record.newUnitQty ?? '—' }}
          </span>
          <span v-else class="cell-muted">—</span>
        </template>

        <template v-else-if="column.key === 'relatedProcesses'">
          {{ formatProcesses(record.relatedProcesses) }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import {
  ECN_CHANGE_ITEM_ACTION_LABEL,
  ECN_CHANGE_ITEM_TYPE,
  ecnChangeItemTypeColor,
} from '@/constants/ecn'
import {
  formatMaterialDetailLabel,
  isChangeItemNewFieldsActive,
  isChangeItemOrigFieldsActive,
} from '@/utils/ecnProductSource'

defineProps({
  items: { type: Array, default: () => [] },
})

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: ECN_CHANGE_ITEM_ACTION_LABEL, key: 'changeType', width: 88, fixed: 'left' },
  {
    title: '变更前',
    key: 'groupBefore',
    align: 'center',
    customHeaderCell: () => ({ class: 'header-before' }),
    children: [
      {
        title: '物料名称',
        key: 'origMaterialName',
        width: 130,
        ellipsis: true,
        customCell: () => ({ class: 'cell-before' }),
      },
      {
        title: '编码/规格/材质/图号',
        key: 'origCodeSpec',
        width: 190,
        ellipsis: true,
        customCell: () => ({ class: 'cell-before' }),
      },
      {
        title: '单位用量',
        key: 'origUnitQty',
        width: 88,
        align: 'right',
        customCell: () => ({ class: 'cell-before' }),
      },
      {
        title: '关联工艺文件',
        key: 'origProcessDoc',
        width: 120,
        ellipsis: true,
        customCell: () => ({ class: 'cell-before' }),
      },
    ],
  },
  {
    title: '变更后',
    key: 'groupAfter',
    align: 'center',
    customHeaderCell: () => ({ class: 'header-after' }),
    children: [
      {
        title: '物料名称',
        key: 'newMaterialName',
        width: 130,
        ellipsis: true,
        customCell: () => ({ class: 'cell-after' }),
      },
      {
        title: '编码/规格/材质/图号',
        key: 'newMaterialDetail',
        width: 190,
        ellipsis: true,
        customCell: () => ({ class: 'cell-after' }),
      },
      {
        title: '新单位用量',
        key: 'newUnitQty',
        width: 96,
        align: 'right',
        customCell: () => ({ class: 'cell-after' }),
      },
    ],
  },
  { title: '父级物料', key: 'parentMaterial', dataIndex: 'parentPath', width: 150, ellipsis: true },
  { title: '关联工序', key: 'relatedProcesses', width: 120, ellipsis: true },
  { title: '变更说明', key: 'changeNote', dataIndex: 'changeNote', width: 160, ellipsis: true },
]

function showOrig(record) {
  return isChangeItemOrigFieldsActive(record)
}

function showNew(record) {
  return isChangeItemNewFieldsActive(record)
}

function formatOrigDetailRow(record) {
  return formatMaterialDetailLabel(
    record.origMaterialCode,
    record.origSpecModel,
    record.origMaterial,
    record.origDrawingNo,
  )
}

function formatNewDetailRow(record) {
  return formatMaterialDetailLabel(
    record.newMaterialCode,
    record.newSpecModel,
    record.newMaterial,
    record.newDrawingNo,
  )
}

function formatProcesses(processes) {
  if (!processes?.length) return '—'
  return processes.join('、')
}

function isFieldChanged(record, field) {
  if (record.changeType === ECN_CHANGE_ITEM_TYPE.ADD) {
    return ['newMaterialName', 'newMaterialDetail', 'newUnitQty'].includes(field)
  }
  if (record.changeType === ECN_CHANGE_ITEM_TYPE.REMOVE) {
    return ['origMaterialName', 'origCodeSpec', 'origUnitQty', 'origProcessDoc'].includes(field)
  }
  if (field === 'origMaterialName' || field === 'newMaterialName') {
    return record.origMaterialName !== record.newMaterialName
  }
  if (field === 'origCodeSpec' || field === 'newMaterialDetail') {
    return formatOrigDetailRow(record) !== formatNewDetailRow(record)
  }
  if (field === 'origUnitQty' || field === 'newUnitQty') {
    return String(record.origUnitQty ?? '') !== String(record.newUnitQty ?? '')
  }
  if (field === 'origProcessDoc') {
    return Boolean(record.origProcessDoc && record.origProcessDoc !== record.newProcessDoc)
  }
  return false
}

function cellClass(record, field) {
  const side = field.startsWith('orig') || field === 'origCodeSpec' ? 'before' : 'after'
  return {
    'cell-text': true,
    'value-changed': isFieldChanged(record, field),
    [`value-${side}`]: isFieldChanged(record, field),
  }
}
</script>

<script>
export default { name: 'EcnChangeItemsReadonlyTable' }
</script>

<style scoped>
.diff-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
}

.legend-item {
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 500;
}

.legend-before {
  background: #fff1f0;
  color: #cf1322;
  border: 1px solid #ffccc7;
}

.legend-after {
  background: #f6ffed;
  color: #389e0d;
  border: 1px solid #b7eb8f;
}

.legend-arrow {
  color: #8c8c8c;
}

.legend-hint {
  margin-left: 8px;
  color: #8c8c8c;
}

.cell-text {
  font-size: 12px;
  color: #595959;
}

.cell-muted {
  font-size: 12px;
  color: #bfbfbf;
}

.value-changed.value-before {
  color: #cf1322;
  font-weight: 600;
  text-decoration: line-through;
  text-decoration-color: rgba(207, 19, 34, 0.45);
}

.value-changed.value-after {
  color: #389e0d;
  font-weight: 600;
}

.ecn-change-items-readonly :deep(.ant-table-cell) {
  vertical-align: middle;
}

.ecn-change-items-readonly :deep(.header-before) {
  background: #fff1f0 !important;
  color: #cf1322;
  font-weight: 600;
}

.ecn-change-items-readonly :deep(.header-after) {
  background: #f6ffed !important;
  color: #389e0d;
  font-weight: 600;
}

.ecn-change-items-readonly :deep(.cell-before) {
  background: #fffaf9;
}

.ecn-change-items-readonly :deep(.cell-after) {
  background: #fcfff6;
}
</style>
