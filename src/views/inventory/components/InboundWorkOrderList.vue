<template>
  <div v-if="list.length" class="inbound-wo-list">
    <div class="section-title">工单清单 ({{ list.length }})</div>
    <a-table
      :columns="columns"
      :data-source="list"
      :row-key="(r) => r.id || r.code"
      size="small"
      :pagination="false"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record: row }">
        <template v-if="column.key === 'productCode'">{{ row.productCode || '—' }}</template>
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
export default { name: 'InboundWorkOrderList' }
</script>

<script setup>
import { computed } from 'vue'
import { INBOUND_WORK_ORDER_COLUMNS, enrichInboundWorkOrderRow } from '@/utils/inboundWorkOrders'

const props = defineProps({
  workOrders: {
    type: Array,
    default: () => [],
  },
})

const columns = INBOUND_WORK_ORDER_COLUMNS

const list = computed(() => (props.workOrders || []).map(enrichInboundWorkOrderRow))
</script>

<style lang="less" scoped>
.section-title {
  font-weight: 600;
  margin-bottom: 12px;
}
</style>
