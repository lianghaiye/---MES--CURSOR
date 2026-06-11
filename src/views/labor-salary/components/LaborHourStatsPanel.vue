<template>
  <div class="stats-panel">
    <div class="stats-toolbar">
      <span class="stats-label">统计周期</span>
      <a-select
        :value="period"
        size="small"
        style="width: 100px"
        :options="periodOpts"
        @change="(v) => emit('update:period', v)"
      />
    </div>
    <a-row :gutter="12">
      <a-col v-for="card in cards" :key="card.key" :xs="24" :sm="12" :md="8" :xl="4">
        <div class="stat-card">
          <div class="stat-title">{{ card.title }}</div>
          <div class="stat-value">
            {{ card.value }}<span class="stat-unit">{{ card.unit }}</span>
          </div>
          <div class="stat-compare">较上周期 {{ formatCompare(card.compare) }}</div>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { periodOptions } from '@/mock/laborHourManagement'

const props = defineProps({
  period: { type: String, default: 'week' },
  stats: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:period'])

const periodOpts = periodOptions

const cards = computed(() => {
  const s = props.stats
  const c = s.compare || {}
  return [
    { key: 'totalHours', title: '总工时', value: s.totalHours ?? 0, unit: '小时', compare: c.totalHours },
    {
      key: 'batchPieceHours',
      title: '批量计件总时长',
      value: s.batchPieceHours ?? 0,
      unit: '小时',
      compare: c.batchPieceHours,
    },
    {
      key: 'durationHours',
      title: '时长报工总时长',
      value: s.durationHours ?? 0,
      unit: '小时',
      compare: c.durationHours,
    },
    {
      key: 'reportTotal',
      title: '报工总数',
      value: s.reportTotal ?? 0,
      unit: '件',
      compare: c.reportTotal,
    },
    {
      key: 'participantCount',
      title: '参与任务人数',
      value: s.participantCount ?? 0,
      unit: '',
      compare: c.participantCount,
    },
  ]
})

function formatCompare(val) {
  const num = Number(val) || 0
  return num > 0 ? `+${num}` : String(num)
}
</script>

<style lang="less" scoped>
.stats-panel {
  margin-bottom: 12px;
}

.stats-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.stats-label {
  font-size: 13px;
  color: #595959;
}

.stat-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 12px;
}

.stat-title {
  font-size: 13px;
  color: #8c8c8c;
}

.stat-value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 600;
  color: #262626;
}

.stat-unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 400;
  color: #8c8c8c;
}

.stat-compare {
  margin-top: 4px;
  font-size: 12px;
  color: #8c8c8c;
}
</style>
