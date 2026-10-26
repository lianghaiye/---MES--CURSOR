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
      <a-row
        :gutter="dense ? 8 : 12"
        class="stats-row"
        :class="{ 'is-one-row': oneRow, 'is-dense': dense }"
      >
        <a-col
          v-for="card in cards"
          :key="card.key"
          :xs="oneRow ? undefined : 24"
          :sm="oneRow ? undefined : 12"
          :lg="oneRow ? undefined : colSpan"
          :class="{ 'one-row-col': oneRow }"
          :style="oneRowColStyle"
        >
          <div class="stat-card" :class="[dense ? 'is-dense' : '', card.iconClass || 'icon-blue']">
            <div class="stat-body">
              <div class="stat-card-title">{{ card.title }}</div>
              <div class="stat-value">
                {{ card.value }}<span v-if="card.unit" class="stat-unit">{{ card.unit }}</span>
              </div>
              <div
                v-if="!dense && (card.compareText != null || card.delta != null)"
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
              v-if="card.iconClass !== false && !dense"
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
  /** 紧凑卡片（更小字号/高度，隐藏副文案与图标） */
  dense: { type: Boolean, default: false },
  /** 大屏强制一行等分展示 */
  oneRow: { type: Boolean, default: false },
})

const emit = defineEmits(['update:period'])

const oneRowColStyle = computed(() => {
  if (!props.oneRow) return undefined
  const n = Math.max(1, props.cards?.length || 1)
  return { flex: `1 1 calc(${100 / n}% - 8px)`, maxWidth: `calc(${100 / n}% - 0px)`, minWidth: 0 }
})

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

.stats-row {
  :deep(.ant-col) {
    display: flex;
  }

  &.is-one-row {
    display: flex;
    flex-wrap: nowrap;
    margin-left: -4px !important;
    margin-right: -4px !important;

    :deep(.ant-col),
    .one-row-col {
      display: flex;
      padding-left: 4px !important;
      padding-right: 4px !important;
    }

    @media (max-width: 992px) {
      flex-wrap: wrap;

      .one-row-col {
        flex: 1 1 calc(33.33% - 8px) !important;
        max-width: calc(33.33% - 0px) !important;
        margin-bottom: 8px;
      }
    }

    @media (max-width: 576px) {
      .one-row-col {
        flex: 1 1 calc(50% - 8px) !important;
        max-width: calc(50% - 0px) !important;
      }
    }
  }
}

.stat-card {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  width: 100%;
  border: 1px solid #e8eef8;
  border-radius: 8px;
  padding: 14px 12px;
  margin-bottom: 8px;
  min-height: 112px;
  height: 112px;
  box-sizing: border-box;
  overflow: hidden;
  /* 默认浅蓝渐变；按右侧图标色系换肤 */
  background: linear-gradient(145deg, #e6f4ff 0%, #f0f7ff 45%, #ffffff 100%);
  box-shadow: 0 1px 2px rgba(22, 119, 255, 0.06);

  &.is-dense {
    padding: 8px 10px;
    min-height: 64px;
    height: 64px;
    margin-bottom: 0;
    border-radius: 6px;

    .stat-card-title {
      margin-bottom: 4px;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .stat-value {
      font-size: 16px;
      line-height: 1.2;
      -webkit-line-clamp: 1;
    }
  }

  &:has(.icon-shop),
  &:has(.icon-blue),
  &.icon-shop,
  &.icon-blue {
    background: linear-gradient(145deg, #e6f4ff 0%, #f0f7ff 45%, #ffffff 100%);
    border-color: #91caff;
  }

  &:has(.icon-screen),
  &:has(.icon-purple),
  &.icon-screen,
  &.icon-purple {
    background: linear-gradient(145deg, #f9f0ff 0%, #f5e8ff 45%, #ffffff 100%);
    border-color: #d3adf7;
  }

  &:has(.icon-warn),
  &:has(.icon-orange),
  &.icon-warn,
  &.icon-orange {
    background: linear-gradient(145deg, #fff7e6 0%, #fff1e0 45%, #ffffff 100%);
    border-color: #ffd591;
  }

  &:has(.icon-green),
  &.icon-green {
    background: linear-gradient(145deg, #f6ffed 0%, #edf9e6 45%, #ffffff 100%);
    border-color: #b7eb8f;
  }

  &:has(.icon-cyan),
  &.icon-cyan {
    background: linear-gradient(145deg, #e6fffb 0%, #e0f9f6 45%, #ffffff 100%);
    border-color: #87e8de;
  }

  &:has(.icon-red),
  &.icon-red {
    background: linear-gradient(145deg, #fff1f0 0%, #ffe8e6 45%, #ffffff 100%);
    border-color: #ffa39e;
  }
}

.stat-card-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 1.25;
  word-break: break-all;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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
  &.icon-orange {
    background: linear-gradient(145deg, #ffc069 0%, #fa8c16 55%, #ffc53d 100%);
    box-shadow: 0 6px 16px rgba(250, 140, 22, 0.22);
  }
  &.icon-green {
    background: linear-gradient(145deg, #95de64 0%, #52c41a 55%, #73d13d 100%);
    box-shadow: 0 6px 16px rgba(82, 196, 26, 0.22);
  }
  &.icon-cyan {
    background: linear-gradient(145deg, #5cdbd3 0%, #13c2c2 55%, #36cfc9 100%);
    box-shadow: 0 6px 16px rgba(19, 194, 194, 0.22);
  }
  &.icon-red {
    background: linear-gradient(145deg, #ff9c9c 0%, #f5222d 55%, #ff7875 100%);
    box-shadow: 0 6px 16px rgba(245, 34, 45, 0.22);
  }
}
</style>
