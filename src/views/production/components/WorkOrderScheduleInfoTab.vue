<template>
  <div class="wo-info-tab">
    <div class="tab-title">排产信息</div>
    <a-table
      size="small"
      bordered
      row-key="id"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 1400 }"
      :locale="{ emptyText: '暂无排产批次，请在「工单下发」中排产并下发' }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="scheduleTaskStatusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space :size="8">
            <a class="action-link" @click="onGenTask(record)">生成任务</a>
            <a class="action-link" @click="openEditExecutor(record)">修改执行人</a>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="executorModalOpen"
      title="修改执行人"
      ok-text="确定"
      cancel-text="取消"
      destroy-on-close
      @ok="saveExecutor"
    >
      <div v-if="editingRow" class="executor-edit">
        <div class="executor-meta">{{ editingRow.processName }} · {{ editingRow.taskNo }}</div>
        <ExecutorTagPicker
          :executors="editingExecutors"
          :resource-type="editingResourceType"
          @update:executors="(v) => (editingExecutors = v)"
        />
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import ExecutorTagPicker from './ExecutorTagPicker.vue'
import {
  buildWorkOrderScheduleInfoRows,
  scheduleTaskStatusColor,
} from '@/utils/workOrderRelatedInfo'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['action'])

const rows = computed(() => buildWorkOrderScheduleInfoRows(props.workOrder))
const executorModalOpen = ref(false)
const editingRow = ref(null)
const editingExecutors = ref([])
const editingResourceType = ref('工人')

const columns = [
  { title: '顺序', dataIndex: 'seq', width: 64, fixed: 'left' },
  { title: '工序名', dataIndex: 'processName', width: 100, fixed: 'left' },
  { title: '状态', key: 'status', width: 90 },
  { title: '任务编号', dataIndex: 'taskNo', width: 180, ellipsis: true },
  { title: '执行者', dataIndex: 'executor', width: 90 },
  { title: '排产数量', dataIndex: 'scheduleQty', width: 88, align: 'right' },
  { title: '报工数量', dataIndex: 'reportQty', width: 88, align: 'right' },
  { title: '良品数', dataIndex: 'goodQty', width: 80, align: 'right' },
  { title: '不良品数', dataIndex: 'badQty', width: 88, align: 'right' },
  { title: '报工时长', dataIndex: 'reportDuration', width: 90 },
  { title: '下发时间', dataIndex: 'dispatchedAt', width: 140 },
  { title: '报工时间', dataIndex: 'reportedAt', width: 140 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

function onGenTask(record) {
  emit('action', { key: 'gen-task', workOrder: props.workOrder, record })
  message.success(`已为任务 ${record.taskNo} 生成小程序任务（演示）`)
}

function openEditExecutor(record) {
  editingRow.value = record
  editingExecutors.value = record.executor && record.executor !== '—' ? [record.executor] : []
  const batch = (props.workOrder.scheduleBatches || []).find((b) => b.id === record.batchId)
  const assignment = (batch?.processAssignments || []).find(
    (a) => a.processName === record.processName,
  )
  editingResourceType.value = assignment?.resourceType || '工人'
  if (assignment?.executors?.length) {
    editingExecutors.value = [...assignment.executors]
  }
  executorModalOpen.value = true
}

function saveExecutor() {
  const record = editingRow.value
  if (!record) {
    executorModalOpen.value = false
    return
  }
  if (!editingExecutors.value.length) {
    message.warning('请至少选择一名执行人')
    return Promise.reject()
  }
  const batch = (props.workOrder.scheduleBatches || []).find((b) => b.id === record.batchId)
  if (!batch) {
    message.error('排产批次不存在')
    return Promise.reject()
  }
  const assignment = (batch.processAssignments || []).find(
    (a) => a.processName === record.processName,
  )
  if (assignment) {
    assignment.executors = [...editingExecutors.value]
  }
  emit('action', {
    key: 'edit-executor',
    workOrder: props.workOrder,
    record: { ...record, executors: [...editingExecutors.value] },
  })
  message.success('执行人已更新')
  executorModalOpen.value = false
}
</script>

<style lang="less" scoped>
.wo-info-tab {
  .tab-title {
    font-weight: 600;
    margin-bottom: 10px;
  }
  .action-link {
    font-size: 12px;
  }
  .executor-edit {
    .executor-meta {
      margin-bottom: 12px;
      color: rgba(0, 0, 0, 0.65);
      font-size: 13px;
    }
  }
}
</style>
