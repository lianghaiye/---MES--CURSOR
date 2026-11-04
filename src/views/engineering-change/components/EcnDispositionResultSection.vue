<template>
  <div class="disposition-result">
    <div v-if="showTitle" class="section-title">
      处置操作与执行结果
      <span v-if="snapshot?.at" class="at">{{ snapshot.at }}</span>
    </div>
    <div v-else-if="snapshot?.at" class="at-only">执行时间：{{ snapshot.at }}</div>
    <p v-if="snapshot?.wholePlanMode" class="mode-tip">本次为整单换 BOM</p>
    <a-table
      :columns="columns"
      :data-source="lines"
      :pagination="false"
      row-key="key"
      size="small"
      bordered
      :scroll="{ x: 1100 }"
      :locale="{ emptyText: '暂无处置记录' }"
    >
      <template #bodyCell="{ column, record: row, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'changeType'">
          <a-tag :color="ecnChangeItemTypeColor(row.changeType)">{{ row.changeType }}</a-tag>
          <a-tag v-if="row.modifyKindLabel" color="cyan" class="sub-tag">
            {{ row.modifyKindLabel }}
          </a-tag>
          <a-tag v-if="row.subtreeTag === '父件'" color="purple" class="sub-tag">父件</a-tag>
          <a-tag v-else-if="row.subtreeTag === '下级'" color="geekblue" class="sub-tag">子件</a-tag>
        </template>
        <template v-else-if="column.key === 'beforeText' || column.key === 'afterText'">
          <pre class="cell-pre">{{ row[column.key] || '—' }}</pre>
        </template>
        <template v-else-if="column.key === 'choice'">
          <div class="choice-block">
            <div>
              <span class="choice-label">旧料：</span>
              {{ row.oldActionLabel || '—' }}
            </div>
            <div>
              <span class="choice-label">新料：</span>
              {{ row.newActionLabel || '—' }}
              <span v-if="row.supplyForm && row.newAction === 'schedule'" class="supply">
                （{{ row.supplyForm }}）
              </span>
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'result'">
          <div v-if="row.resultItems?.length" class="result-list">
            <div v-for="(it, i) in row.resultItems" :key="i" class="result-item">
              <a-tag color="blue">{{ it.action }}</a-tag>
              <span class="result-detail">{{ it.detail }}</span>
            </div>
          </div>
          <span v-else class="muted">无单据变动</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script>
export default { name: 'EcnDispositionResultSection' }
</script>

<script setup>
import { computed } from 'vue'
import { ecnChangeItemTypeColor } from '@/constants/ecn'

const props = defineProps({
  snapshot: { type: Object, default: null },
  showTitle: { type: Boolean, default: true },
})

const lines = computed(() => props.snapshot?.lines || [])

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '变更', key: 'changeType', width: 120 },
  { title: '变更前', key: 'beforeText', width: 200 },
  { title: '变更后', key: 'afterText', width: 200 },
  { title: '当时选择的处置', key: 'choice', width: 220 },
  { title: '执行结果', key: 'result', width: 280 },
]
</script>

<style lang="less" scoped>
.section-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.at {
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.at-only {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.mode-tip {
  margin: 0 0 8px;
  font-size: 12px;
  color: #531dab;
}

.sub-tag {
  margin-left: 4px;
}

.cell-pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.45;
}

.choice-block {
  font-size: 12px;
  line-height: 1.55;
}

.choice-label {
  color: rgba(0, 0, 0, 0.45);
}

.supply {
  color: rgba(0, 0, 0, 0.45);
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.result-detail {
  font-size: 12px;
  font-weight: 500;
  color: #1677ff;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
