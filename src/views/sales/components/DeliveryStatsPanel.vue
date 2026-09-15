<template>
  <ListPeriodStatsPanel
    v-model:period="period"
    :cards="cards"
    storage-key="i_doms_delivery_stats_collapsed"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import { calcDeliveryDashboardStats } from '@/utils/deliveryStats'

const period = ref('本周')

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
</script>

<script>
export default { name: 'DeliveryStatsPanel' }
</script>
