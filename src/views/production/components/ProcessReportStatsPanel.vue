<template>
  <ListPeriodStatsPanel
    :cards="cards"
    :show-period="false"
    storage-key="i_doms_process_report_stats_collapsed"
  />
</template>

<script setup>
import { computed } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({ todayQty: 0, todayAdjustedQty: 0, todayTaskCount: 0, monthQty: 0 }),
  },
})

function formatTodayQtyValue(stats = {}) {
  const original = stats.todayQty ?? 0
  const adjusted = stats.todayAdjustedQty ?? original
  return `${original}/${adjusted}（调整后）`
}

const cards = computed(() => [
  {
    key: 'todayQty',
    title: '今日报工数量（件）',
    value: formatTodayQtyValue(props.stats),
    iconClass: 'icon-blue',
  },
  {
    key: 'todayTaskCount',
    title: '今日报工任务数',
    value: String(props.stats.todayTaskCount ?? 0),
    iconClass: 'icon-purple',
  },
  {
    key: 'monthQty',
    title: '本月累计报工（件）',
    value: String(props.stats.monthQty ?? 0),
    iconClass: 'icon-blue',
  },
])
</script>

<script>
export default { name: 'ProcessReportStatsPanel' }
</script>
