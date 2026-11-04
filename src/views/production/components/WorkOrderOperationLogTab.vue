<template>
  <div class="wo-op-log-tab">
    <a-table
      :columns="columns"
      :data-source="logs"
      row-key="id"
      size="small"
      bordered
      :pagination="logs.length > 10 ? { pageSize: 10, size: 'small' } : false"
      :locale="{ emptyText: '暂无操作日志' }"
      :scroll="{ x: 720 }"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ensureWorkOrderOperationLogs } from '@/utils/workOrderOperationLog'

const props = defineProps({
  workOrder: { type: Object, default: null },
})

const columns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 170 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
]

const logs = computed(() => ensureWorkOrderOperationLogs(props.workOrder))
</script>

<style lang="less" scoped>
.wo-op-log-tab {
  padding: 4px 0 12px;
}
</style>
