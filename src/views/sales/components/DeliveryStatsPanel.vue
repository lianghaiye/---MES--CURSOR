<template>
  <div class="delivery-stats-panel">
    <div class="stats-toolbar">
      <a-select v-model:value="period" size="small" style="width: 100px" :options="periodOpts" />
    </div>
    <a-row :gutter="12">
      <a-col v-for="card in cards" :key="card.key" :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-body">
            <div class="stat-title">{{ card.title }}</div>
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-compare" :class="compareClass(card.delta)">
              <span>较上周期 {{ formatDelta(card.delta, card.deltaSuffix) }}</span>
              <span v-if="card.delta !== 0" class="arrow">{{ card.delta > 0 ? '↑' : '↓' }}</span>
            </div>
          </div>
          <div class="stat-icon" :class="card.iconClass" />
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { calcDeliveryDashboardStats, STAT_PERIOD_OPTIONS } from '@/utils/deliveryStats'

const period = ref('本周')
const periodOpts = STAT_PERIOD_OPTIONS.map((v) => ({ label: v, value: v }))

const stats = computed(() => calcDeliveryDashboardStats(period.value))

const cards = computed(() => {
  const s = stats.value
  const c = s.compare
  return [
    {
      key: 'salesQty',
      title: '销售产品总量',
      value: String(s.salesProductQty),
      delta: c.salesProductQty,
      iconClass: 'icon-shop',
    },
    {
      key: 'ship',
      title: '发货量/待发货量',
      value: `${s.shippedQty}/${s.pendingShipQty}`,
      delta: c.shippedQty,
      deltaSuffix: ` / ${formatDeltaPlain(c.pendingShipQty)}`,
      iconClass: 'icon-screen',
    },
    {
      key: 'salesAmt',
      title: '销售金额总计',
      value: `¥${s.salesAmountExTax.toFixed(2)}`,
      delta: c.salesAmountExTax,
      iconClass: 'icon-shop',
    },
    {
      key: 'delAmt',
      title: '发货金额总计',
      value: `¥${s.deliveryAmountExTax.toFixed(2)}`,
      delta: c.deliveryAmountExTax,
      iconClass: 'icon-screen',
    },
  ]
})

function formatDeltaPlain(n) {
  const v = Number(n) || 0
  return v > 0 ? `+${v}` : String(v)
}

function formatDelta(n, suffix = '') {
  const v = Number(n) || 0
  const base = v > 0 ? `+${v.toFixed(2).replace(/\.?0+$/, '')}` : v.toFixed(2).replace(/\.?0+$/, '')
  return `${base}${suffix || ''}`
}

function compareClass(delta) {
  if (delta === 0) return 'neutral'
  return delta < 0 ? 'down' : 'up'
}
</script>

<script>
export default { name: 'DeliveryStatsPanel' }
</script>

<style lang="less" scoped>
.delivery-stats-panel {
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
  align-self: center;
  border-radius: 12px;
  opacity: 0.85;
  &.icon-shop {
    background: linear-gradient(145deg, #91caff 0%, #1677ff 55%, #69b1ff 100%);
    box-shadow: 0 6px 16px rgba(22, 119, 255, 0.25);
  }
  &.icon-screen {
    background: linear-gradient(145deg, #b37feb 0%, #722ed1 50%, #9254de 100%);
    box-shadow: 0 6px 16px rgba(114, 46, 209, 0.2);
  }
}
</style>
