<template>
  <div class="wo-info-tab">
    <div class="tab-title">质检信息</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 1200 }"
      :locale="{ emptyText: '暂无质检信息' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="qcInfoStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'result'">
          <a-tag
            v-if="record.result && record.result !== '—'"
            :color="qcInfoResultColor(record.result)"
          >
            {{ record.result }}
          </a-tag>
          <span v-else>—</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  buildWorkOrderQcInfoRows,
  qcInfoResultColor,
  qcInfoStatusColor,
} from '@/utils/workOrderRelatedInfo'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const rows = computed(() => buildWorkOrderQcInfoRows(props.workOrder))

const columns = [
  { title: '序号', dataIndex: 'index', width: 64 },
  { title: '状态', key: 'status', width: 90 },
  { title: '质检结果', key: 'result', width: 100 },
  { title: '质检单号', dataIndex: 'qcNo', width: 140 },
  { title: '质检方式', dataIndex: 'qcMode', width: 90 },
  { title: '工序', dataIndex: 'processName', width: 100 },
  { title: '任务编号', dataIndex: 'taskNo', width: 180, ellipsis: true },
  { title: '任务执行人', dataIndex: 'taskExecutor', width: 100 },
  { title: '质检时间', dataIndex: 'qcAt', width: 140 },
  { title: '质检人', dataIndex: 'qcBy', width: 90 },
]
</script>

<style lang="less" scoped>
.wo-info-tab {
  .tab-title {
    font-weight: 600;
    margin-bottom: 10px;
  }
}
</style>
