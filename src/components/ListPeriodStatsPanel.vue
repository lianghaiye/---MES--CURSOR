<template>
  <div class="list-period-stats-panel" :class="{ 'is-collapsed': collapsed }">
    <div class="stats-header">
      <div class="stats-header-left">
        <span class="stats-title">{{ title }}</span>
        <span v-if="tip" class="stats-tip">{{ tip }}</span>
        <a-select
          v-if="showPeriod"
          v-model:value="period"
          size="small"
          class="period-select"
          :options="resolvedPeriodOpts"
        />
      </div>
      <a-button type="link" size="small" class="collapse-btn" @click="collapsed = !collapsed">
        {{ collapsed ? '展开' : '收起' }}
        <UpOutlined v-if="!collapsed" />
        <DownOutlined v-else />
      </a-button>
    </div>

    <div v-show="!collapsed" class="stats-body">
      <a-row :gutter="12">
        <a-col v-for="card in cards" :key="card.key" :xs="24" :sm="12" :lg="colSpan">
          <div class="stat-card">
            <div class="stat-body">
              <div class="stat-card-title">{{ card.title }}</div>
              <div class="stat-value">
                {{ card.value }}<span v-if="card.unit" class="stat-unit">{{ card.unit }}</span>
              </div>
              <div
                v-if="card.compareText != null || card.delta != null"
                class="stat-compare"
                :class="card.compareClass || compareClass(card.delta)"
              >
                <span>{{
                  card.compareText || `较上周期 ${formatDelta(card.delta, card.deltaSuffix)}`
                }}</span>
                <span
                  v-if="card.delta != null && Number(card.delta) !== 0 && !card.hideArrow"
                  class="arrow"
                >
                  {{ Number(card.delta) > 0 ? '↑' : '↓' }}
                </span>
              </div>
            </div>
            <div
              v-if="card.iconClass !== false"
              class="stat-icon"
              :class="card.iconClass || 'icon-shop'"
            />
          </div>
        </a-col>
      </a-row>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { STAT_PERIOD_OPTIONS } from '@/utils/deliveryStats'

const props = defineProps({
  title: { type: String, default: '统计概览' },
  /** 标题右侧提示文案（无外框） */
  tip: { type: String, default: '' },
  period: { type: String, default: '本周' },
  cards: { type: Array, default: () => [] },
  /** 是否显示周期切换 */
  showPeriod: { type: Boolean, default: true },
  /** 自定义周期选项；默认本周/本月/本季/本年 */
  periodOptions: { type: Array, default: null },
  /** 收起状态本地存储 key，传入则记住展开状态 */
  storageKey: { type: String, default: '' },
})

const emit = defineEmits(['update:period'])

const period = computed({
  get: () => props.period,
  set: (v) => emit('update:period', v),
})

const resolvedPeriodOpts = computed(() => {
  if (Array.isArray(props.periodOptions) && props.periodOptions.length) {
    return props.periodOptions.map((opt) =>
      typeof opt === 'string' ? { label: opt, value: opt } : opt,
    )
  }
  return STAT_PERIOD_OPTIONS.map((v) => ({ label: v, value: v }))
})

function loadCollapsed() {
  if (!props.storageKey) return false
  try {
    return localStorage.getItem(props.storageKey) === '1'
  } catch {
    return false
  }
}

const collapsed = ref(loadCollapsed())

watch(collapsed, (v) => {
  if (!props.storageKey) return
  try {
    localStorage.setItem(props.storageKey, v ? '1' : '0')
  } catch {
    /* ignore */
  }
})

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
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 8px;
  border: 1px solid #e5e6eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  &.is-collapsed {
    padding-bottom: 12px;
  }
}

.stats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}

.stats-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
  white-space: nowrap;
}

.stats-tip {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.period-select {
  width: 100px;
}

.collapse-btn {
  padding-inline: 4px;
  height: 24px;
  color: rgba(0, 0, 0, 0.55);

  :deep(.anticon) {
    margin-left: 4px;
    font-size: 10px;
  }
}

.stats-body {
  margin-top: 10px;
}

.stat-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  border: 1px solid #e8eef8;
  border-radius: 8px;
  padding: 14px 12px;
  margin-bottom: 8px;
  min-height: 108px;
  /* 默认浅蓝渐变；按右侧图标色系换肤 */
  background: linear-gradient(145deg, #e6f4ff 0%, #f0f7ff 45%, #ffffff 100%);
  box-shadow: 0 1px 2px rgba(22, 119, 255, 0.06);

  &:has(.icon-shop),
  &:has(.icon-blue) {
    background: linear-gradient(145deg, #e6f4ff 0%, #f0f7ff 45%, #ffffff 100%);
    border-color: #91caff;
  }

  &:has(.icon-screen),
  &:has(.icon-purple) {
    background: linear-gradient(145deg, #f9f0ff 0%, #f5e8ff 45%, #ffffff 100%);
    border-color: #d3adf7;
  }

  &:has(.icon-warn) {
    background: linear-gradient(145deg, #fff7e6 0%, #fff1e0 45%, #ffffff 100%);
    border-color: #ffd591;
  }
}

.stat-card-title {
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

.stat-unit {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
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
