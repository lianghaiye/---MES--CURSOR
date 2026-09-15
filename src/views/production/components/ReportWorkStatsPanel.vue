<template>
  <ListPeriodStatsPanel
    :cards="cards"
    :show-period="false"
    storage-key="i_doms_report_work_stats_collapsed"
  />
</template>

<script setup>
import { computed } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'

const props = defineProps({
  stats: {
    type: Object,
    default: () => ({ todayQty: 0, todayCount: 0, monthQty: 0 }),
  },
})

const cards = computed(() => [
  {
    key: 'todayQty',
    title: '今日报工数量（件）',
    value: String(props.stats.todayQty ?? 0),
    iconClass: 'icon-blue',
  },
  {
    key: 'todayCount',
    title: '今日报工工单数',
    value: String(props.stats.todayCount ?? 0),
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
export default { name: 'ReportWorkStatsPanel' }
</script>
