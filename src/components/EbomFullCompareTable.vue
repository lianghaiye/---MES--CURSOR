<template>
  <div class="structural-compare">
    <div class="compare-head">
      <div class="head-cell change-col">变更</div>
      <div class="head-cell side-col">{{ leftVersion }}</div>
      <div class="head-cell arrow-col" />
      <div class="head-cell side-col">{{ rightVersion }}</div>
    </div>

    <div v-for="row in rows" :key="row.id" class="compare-row" :class="rowClass(row.changeType)">
      <div class="row-cell change-col">
        <a-tag :color="changeTypeColor(row.changeType)">{{ row.changeType }}</a-tag>
      </div>

      <div class="row-cell side-col old-side">
        <template v-if="row.left">
          <div class="material-block" :style="{ paddingLeft: `${row.depth * 16}px` }">
            <div class="material-head">
              <span class="material-code">{{ row.left.code || '—' }}</span>
              <span v-if="row.changeType === '替换'" class="side-label">原物料</span>
            </div>
            <div class="material-name">{{ row.left.name || '—' }}</div>
            <div class="material-meta">
              <span>用量 {{ formatValue(row.left.unitUsage) }}</span>
              <span>供应 {{ formatValue(row.left.supplyType) }}</span>
              <span v-if="row.left.material">材质 {{ row.left.material }}</span>
            </div>
          </div>
        </template>
        <div v-else class="empty-side">—</div>
      </div>

      <div class="row-cell arrow-col">
        <span v-if="row.changeType === '替换'" class="replace-arrow">⇄</span>
        <span v-else-if="row.changeType === '修改'" class="modify-arrow">→</span>
      </div>

      <div class="row-cell side-col new-side">
        <template v-if="row.right">
          <div class="material-block" :style="{ paddingLeft: `${row.depth * 16}px` }">
            <div class="material-head">
              <span class="material-code">{{ row.right.code || '—' }}</span>
              <span v-if="row.changeType === '替换'" class="side-label new">新物料</span>
            </div>
            <div class="material-name">{{ row.right.name || '—' }}</div>
            <div class="material-meta">
              <span :class="{ highlight: row.changedKeys.has('unitUsage') }">
                用量 {{ formatValue(row.right.unitUsage) }}
              </span>
              <span :class="{ highlight: row.changedKeys.has('supplyType') }">
                供应 {{ formatValue(row.right.supplyType) }}
              </span>
              <span
                v-if="row.right.material"
                :class="{ highlight: row.changedKeys.has('material') }"
              >
                材质 {{ row.right.material }}
              </span>
            </div>
          </div>
        </template>
        <div v-else class="empty-side">—</div>
      </div>
    </div>

    <a-empty v-if="!rows.length" description="两个版本物料结构一致" />
  </div>
</template>

<script setup>
import { ebomDiffChangeTypeColor } from '@/utils/ebomSnapshotDiff'

defineProps({
  rows: { type: Array, default: () => [] },
  leftVersion: { type: String, default: '旧版' },
  rightVersion: { type: String, default: '新版' },
})

function changeTypeColor(type) {
  return ebomDiffChangeTypeColor(type)
}

function rowClass(changeType) {
  if (changeType === '新增') return 'row-added'
  if (changeType === '删除') return 'row-removed'
  if (changeType === '替换') return 'row-replaced'
  if (changeType === '修改') return 'row-modified'
  return ''
}

function formatValue(value) {
  if (value === undefined || value === null || value === '') return '—'
  return String(value)
}
</script>

<script>
export default { name: 'EbomFullCompareTable' }
</script>

<style lang="less" scoped>
.structural-compare {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.compare-head,
.compare-row {
  display: grid;
  grid-template-columns: 72px 1fr 40px 1fr;
  align-items: stretch;
}

.compare-head {
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.compare-row {
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.head-cell,
.row-cell {
  padding: 10px 12px;
  min-width: 0;
}

.change-col {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  border-right: 1px solid #f0f0f0;
}

.arrow-col {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.35);
  font-size: 18px;
  border-right: 1px solid #f0f0f0;
}

.side-col {
  border-right: 1px solid #f0f0f0;

  &:last-child {
    border-right: none;
  }
}

.row-replaced {
  .old-side {
    background: #fff7ff;
  }

  .new-side {
    background: #f9f0ff;
  }

  .replace-arrow {
    color: #722ed1;
    font-weight: 700;
  }
}

.row-added .new-side {
  background: #f6ffed;
}

.row-removed .old-side {
  background: #fff2f0;
}

.row-modified .new-side {
  background: #fffbe6;
}

.material-block {
  min-width: 0;
}

.material-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.material-code {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  word-break: break-all;
}

.side-label {
  flex-shrink: 0;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  border-radius: 2px;
  background: #f5f5f5;
  color: rgba(0, 0, 0, 0.45);

  &.new {
    background: #efdbff;
    color: #531dab;
  }
}

.material-name {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 6px;
  word-break: break-all;
}

.material-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.highlight {
  color: #262626;
  font-weight: 600;
}

.empty-side {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

.modify-arrow {
  font-size: 14px;
}
</style>
