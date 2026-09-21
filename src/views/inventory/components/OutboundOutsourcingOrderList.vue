<template>
  <div v-if="list.length" class="outbound-wx-list">
    <div v-if="!hideTitle" class="section-title">外协订单清单 ({{ list.length }})</div>
    <a-table
      :columns="columns"
      :data-source="list"
      :row-key="(r) => r.id || r.orderNo"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'orderNo'">
          <a
            v-if="row.orderNo && resolveOutsourcingId(row)"
            class="link-code"
            @click.prevent="goOutsourcingOrder(row)"
          >
            {{ row.orderNo }}
          </a>
          <span v-else>{{ row.orderNo || '—' }}</span>
        </template>
        <template v-else-if="column.key === 'productCode'">{{ row.productCode || '—' }}</template>
        <template v-else-if="column.key === 'specModel'">{{ row.specModel || '—' }}</template>
        <template v-else-if="column.key === 'material'">{{ row.material || '—' }}</template>
        <template v-else-if="column.key === 'drawingNo'">{{ row.drawingNo || '—' }}</template>
        <template v-else-if="column.key === 'bom'">{{ row.bom || '—' }}</template>
        <template v-else-if="column.key === 'planQty'">{{ row.planQty ?? '—' }}</template>
      </template>
    </a-table>
  </div>
</template>

<script>
export default { name: 'OutboundOutsourcingOrderList' }
</script>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import {
  OUTBOUND_OUTSOURCING_ORDER_COLUMNS,
  enrichOutboundOutsourcingOrderRow,
  findLinkedOutsourcingOrder,
} from '@/utils/outboundOutsourcingOrders'

const props = defineProps({
  outsourcingOrders: {
    type: Array,
    default: () => [],
  },
  hideTitle: { type: Boolean, default: false },
})

const router = useRouter()
const { openTab } = useTabs()

const columns = OUTBOUND_OUTSOURCING_ORDER_COLUMNS

const list = computed(() => (props.outsourcingOrders || []).map(enrichOutboundOutsourcingOrderRow))

function resolveOutsourcingId(row) {
  if (row?.outsourcingOrderId) return row.outsourcingOrderId
  return findLinkedOutsourcingOrder(row)?.id || ''
}

function goOutsourcingOrder(row) {
  const id = resolveOutsourcingId(row)
  if (!id) {
    message.info(`未找到外协订单 ${row.orderNo || ''}`)
    return
  }
  const path = `/procurement/outsourcing-orders/${id}`
  openTab(path, `外协订单 ${row.orderNo || ''}`.trim())
  router.push({ name: 'procurement-outsourcing-orders-detail', params: { id } })
}
</script>

<style lang="less" scoped>
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
