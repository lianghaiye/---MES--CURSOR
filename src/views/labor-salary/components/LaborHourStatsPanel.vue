<template>
  <ListPeriodStatsPanel
    v-model:period="periodProxy"
    :cards="cards"
    :period-options="periodOpts"
    storage-key="i_doms_labor_hour_stats_collapsed"
  />
</template>

<script setup>
import { computed } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import { periodOptions } from '@/mock/laborHourManagement'

const props = defineProps({
  period: { type: String, default: 'week' },
  stats: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:period'])

const periodOpts = periodOptions

const periodProxy = computed({
  get: () => props.period,
  set: (v) => emit('update:period', v),
})

const cards = computed(() => {
  const s = props.stats
  const c = s.compare || {}
  return [
    {
      key: 'totalHours',
      title: '总工时',
      value: s.totalHours ?? 0,
      unit: '小时',
      delta: c.totalHours,
      iconClass: 'icon-shop',
    },
    {
      key: 'batchPieceHours',
      title: '批量计件总时长',
      value: s.batchPieceHours ?? 0,
      unit: '小时',
      delta: c.batchPieceHours,
      iconClass: 'icon-screen',
    },
    {
      key: 'durationHours',
      title: '时长报工总时长',
      value: s.durationHours ?? 0,
      unit: '小时',
      delta: c.durationHours,
      iconClass: 'icon-shop',
    },
    {
      key: 'reportTotal',
      title: '报工总数',
      value: s.reportTotal ?? 0,
      unit: '件',
      delta: c.reportTotal,
      iconClass: 'icon-screen',
    },
    {
      key: 'participantCount',
      title: '参与任务人数',
      value: s.participantCount ?? 0,
      delta: c.participantCount,
      iconClass: 'icon-warn',
    },
  ]
})
</script>

<script>
export default { name: 'LaborHourStatsPanel' }
</script>
