<template>
  <div class="wo-info-tab">
    <div class="tab-title">返工信息</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 1280 }"
      :locale="{ emptyText: '暂无关联返工单' }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'reworkNo'">
          <a @click="openRework(record)">{{ record.reworkNo }}</a>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="reworkOrderStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'scheduleBatch'">
          {{ formatScheduleBatchLabel(record) }}
        </template>
        <template v-else-if="column.key === 'processes'">
          {{ (record.processes || []).map((p) => p.processName).join('、') || '—' }}
        </template>
        <template v-else-if="column.key === 'pending'">
          {{ totalPending(record) }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] ?? '—' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { listReworkOrdersByWorkOrder, reworkOrderState } from '@/store/reworkOrderStore'
import { reworkOrderStatusColor, formatScheduleBatchLabel } from '@/constants/reworkOrder'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const router = useRouter()
const { openTab } = useTabs()

const rows = computed(() => {
  void reworkOrderState.orders
  return listReworkOrdersByWorkOrder(props.workOrder)
})

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '返工单号', key: 'reworkNo', width: 140 },
  { title: '状态', key: 'status', width: 90 },
  { title: '来源', dataIndex: 'source', width: 100 },
  { title: '排产批次', key: 'scheduleBatch', width: 100 },
  { title: '加工中心', dataIndex: 'workCenter', width: 110, ellipsis: true },
  { title: '返工数量', dataIndex: 'qty', width: 90, align: 'right' },
  { title: '待重做', key: 'pending', width: 80, align: 'right' },
  { title: '重做工序', key: 'processes', width: 160, ellipsis: true },
  { title: '原因', dataIndex: 'reason', width: 140, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
]

function totalPending(record) {
  return (record.processes || []).reduce((s, p) => s + (Number(p.pendingQty) || 0), 0)
}

function openRework(record) {
  if (!record?.id) return
  const path = `/production/rework-orders/${record.id}`
  openTab(path, `返工单 ${record.reworkNo}`)
  router.push({ name: 'production-rework-orders-detail', params: { id: record.id } })
}
</script>

<style lang="less" scoped>
.wo-info-tab {
  .tab-title {
    font-weight: 600;
    margin-bottom: 10px;
  }
}
</style>
