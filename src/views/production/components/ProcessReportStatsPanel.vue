<template>
  <div class="process-report-stats-panel">
    <a-row :gutter="12">
      <a-col v-for="card in cards" :key="card.key" :xs="24" :sm="8">
        <div class="stat-card">
          <div class="stat-body">
            <div class="stat-title">{{ card.title }}</div>
            <div class="stat-value">{{ card.value }}</div>
          </div>
          <div class="stat-icon" :class="card.iconClass" />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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

<style lang="less" scoped>
.process-report-stats-panel {
  background: #fff;
  border-radius: 6px;
  padding: 12px 12px 4px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 14px 12px;
  margin-bottom: 8px;
  min-height: 108px;
  background: linear-gradient(135deg, #fafbff 0%, #fff 60%);
}

.stat-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.3;
  word-break: break-all;
}

.stat-icon {
  width: 56px;
  height: 56px;
  align-self: center;
  border-radius: 12px;
  opacity: 0.85;

  &.icon-blue {
    background: linear-gradient(145deg, #91caff 0%, #1677ff 55%, #69b1ff 100%);
    box-shadow: 0 6px 16px rgba(22, 119, 255, 0.25);
  }

  &.icon-purple {
    background: linear-gradient(145deg, #b37feb 0%, #722ed1 50%, #9254de 100%);
    box-shadow: 0 6px 16px rgba(114, 46, 209, 0.2);
  }
}
</style>
