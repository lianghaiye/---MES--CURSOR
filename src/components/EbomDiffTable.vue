<template>
  <div class="ebom-diff-table-wrap">
    <div v-if="showSummary" class="diff-summary">
      <a-tag v-if="diff.summary.added" color="success">新增 {{ diff.summary.added }}</a-tag>
      <a-tag v-if="diff.summary.modified" color="warning">修改 {{ diff.summary.modified }}</a-tag>
      <a-tag v-if="diff.summary.replaced" color="purple">替换 {{ diff.summary.replaced }}</a-tag>
      <a-tag v-if="diff.summary.removed" color="error">删除 {{ diff.summary.removed }}</a-tag>
      <span v-if="!diff.summary.total" class="no-diff">物料结构无变化</span>
    </div>

    <a-table
      v-if="diff.rows.length"
      :columns="columns"
      :data-source="diff.rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: tableScrollX }"
      class="diff-table"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'changeType'">
          <a-tag :color="changeTypeColor(row.changeType)">{{ row.changeType }}</a-tag>
        </template>
        <template v-else-if="column.key === 'name'">
          <span class="name-cell" :style="{ paddingLeft: `${row.depth * 14}px` }">
            {{ row.name || '—' }}
          </span>
        </template>
        <template v-else-if="column.key === 'detail'">
          <template v-if="row.changeType === EBOM_DIFF_CHANGE_TYPE.MODIFY">
            <div v-for="field in row.fieldChanges" :key="field.key" class="field-change-row">
              <span class="field-label">{{ field.label }}</span>
              <span class="field-before">{{ field.before }}</span>
              <span class="field-arrow">→</span>
              <span class="field-after">{{ field.after }}</span>
            </div>
          </template>
          <template v-else-if="row.changeType === EBOM_DIFF_CHANGE_TYPE.ADD">
            <div class="snapshot-brief">
              <span>单位用量 {{ cellValue(row.after, 'unitUsage') }}</span>
              <span>需求数量 {{ cellValue(row.after, 'demandQty') }}</span>
              <span>供应形态 {{ cellValue(row.after, 'supplyType') }}</span>
            </div>
          </template>
          <template v-else-if="row.changeType === EBOM_DIFF_CHANGE_TYPE.REPLACE">
            <div class="replace-detail">
              <div class="replace-line">
                <span class="field-label">原物料</span>
                <span>{{ row.before?.code || '—' }} · {{ row.before?.name || '—' }}</span>
              </div>
              <div class="replace-line">
                <span class="field-label">新物料</span>
                <span>{{ row.after?.code || '—' }} · {{ row.after?.name || '—' }}</span>
              </div>
            </div>
          </template>
          <template v-else-if="row.changeType === EBOM_DIFF_CHANGE_TYPE.REMOVE">
            <div class="snapshot-brief">
              <span>单位用量 {{ cellValue(row.before, 'unitUsage') }}</span>
              <span>需求数量 {{ cellValue(row.before, 'demandQty') }}</span>
              <span>供应形态 {{ cellValue(row.before, 'supplyType') }}</span>
            </div>
          </template>
        </template>
        <template v-else>
          {{ row[column.dataIndex] ?? '—' }}
        </template>
      </template>
    </a-table>
    <a-empty v-else description="两个版本物料结构一致" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EBOM_DIFF_CHANGE_TYPE, ebomDiffChangeTypeColor } from '@/utils/ebomSnapshotDiff'

defineProps({
  diff: { type: Object, required: true },
  showSummary: { type: Boolean, default: true },
})

const columns = [
  { key: 'changeType', title: '变更', dataIndex: 'changeType', width: 72, fixed: 'left' },
  { key: 'code', title: '物料编码', dataIndex: 'code', width: 120, ellipsis: true, fixed: 'left' },
  { key: 'name', title: '物料名称', dataIndex: 'name', width: 160, ellipsis: true },
  { key: 'detail', title: '变更明细', width: 420 },
]

const tableScrollX = computed(() => columns.reduce((sum, col) => sum + (col.width || 100), 0))

function changeTypeColor(type) {
  return ebomDiffChangeTypeColor(type)
}

function cellValue(snapshot, key) {
  if (!snapshot) return '—'
  const value = snapshot[key]
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}
</script>

<script>
export default { name: 'EbomDiffTable' }
</script>

<style lang="less" scoped>
.diff-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.no-diff {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.diff-table {
  :deep(.ant-table-cell) {
    vertical-align: top;
  }
}

.name-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-change-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;

  & + & {
    margin-top: 2px;
  }
}

.field-label {
  flex: 0 0 72px;
  color: rgba(0, 0, 0, 0.45);
}

.field-before {
  color: rgba(0, 0, 0, 0.65);
}

.field-arrow {
  color: rgba(0, 0, 0, 0.25);
}

.field-after {
  color: #262626;
  font-weight: 500;
}

.snapshot-brief {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

.replace-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.replace-line {
  display: flex;
  gap: 8px;
}
</style>
