<template>
  <div class="list-period-stats-panel">
    <div class="stats-toolbar">
      <a-select v-model:value="period" size="small" style="width: 100px" :options="periodOpts" />
    </div>
    <a-row :gutter="12">
      <a-col v-for="card in cards" :key="card.key" :xs="24" :sm="12" :lg="colSpan">
        <div class="stat-card">
          <div class="stat-body">
            <div class="stat-title">{{ card.title }}</div>
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-compare" :class="compareClass(card.delta)">
              <span>较上周期 {{ formatDelta(card.delta, card.deltaSuffix) }}</span>
              <span v-if="Number(card.delta) !== 0" class="arrow">{{
                Number(card.delta) > 0 ? '↑' : '↓'
              }}</span>
            </div>
          </div>
          <div class="stat-icon" :class="card.iconClass || 'icon-shop'" />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { STAT_PERIOD_OPTIONS } from '@/utils/deliveryStats'

const props = defineProps({
  period: { type: String, default: '本周' },
  cards: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:period'])

const period = computed({
  get: () => props.period,
  set: (v) => emit('update:period', v),
})

const periodOpts = STAT_PERIOD_OPTIONS.map((v) => ({ label: v, value: v }))

const colSpan = computed(() => {
  const n = props.cards?.length || 4
  if (n <= 3) return 8
  if (n >= 5) return 4
  return 6
})

function formatDelta(n, suffix = '') {
  const v = Number(n) || 0
  const abs = Math.abs(v)
  const text =
    abs >= 100 || Number.isInteger(abs)
      ? String(v > 0 ? `+${v}` : v)
      : (v > 0 ? '+' : '') + v.toFixed(2).replace(/\.?0+$/, '')
  return `${text}${suffix || ''}`
}

function compareClass(delta) {
  const v = Number(delta) || 0
  if (v === 0) return 'neutral'
  return v < 0 ? 'down' : 'up'
}
</script>

<script>
export default { name: 'ListPeriodStatsPanel' }
</script>

<style lang="less" scoped>
.list-period-stats-panel {
  background: #fff;
  border-radius: 6px;
  padding: 12px 12px 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stats-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
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
  font-size: 26px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.2;
  word-break: break-all;
}

.stat-compare {
  margin-top: 10px;
  font-size: 12px;
  &.down {
    color: #52c41a;
  }
  &.up {
    color: #ff4d4f;
  }
  &.neutral {
    color: rgba(0, 0, 0, 0.45);
  }
  .arrow {
    margin-left: 4px;
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  flex: 0 0 56px;
  align-self: center;
  border-radius: 12px;
  opacity: 0.85;
  margin-left: 8px;
  &.icon-shop {
    background: linear-gradient(145deg, #91caff 0%, #1677ff 55%, #69b1ff 100%);
    box-shadow: 0 6px 16px rgba(22, 119, 255, 0.25);
  }
  &.icon-screen {
    background: linear-gradient(145deg, #b37feb 0%, #722ed1 50%, #9254de 100%);
    box-shadow: 0 6px 16px rgba(114, 46, 209, 0.2);
  }
  &.icon-warn {
    background: linear-gradient(145deg, #ffc069 0%, #fa8c16 55%, #ffc53d 100%);
    box-shadow: 0 6px 16px rgba(250, 140, 22, 0.22);
  }
}
</style>
