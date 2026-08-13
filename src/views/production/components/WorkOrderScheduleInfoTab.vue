<template>
  <div class="wo-info-tab">
    <div class="tab-head">
      <div class="tab-title">排产信息</div>
      <span v-if="batchGroups.length" class="tab-summary">
        共 {{ batchGroups.length }} 个批次 · {{ totalRowCount }} 条工序任务
      </span>
    </div>

    <a-empty v-if="!batchGroups.length" description="暂无排产批次，请在「工单下发」中排产并下发" />

    <div
      v-for="group in batchGroups"
      :key="group.batchId"
      class="batch-block"
      :class="{ 'is-active': group.batchId === activeBatchId }"
    >
      <div class="batch-header">
        <div class="batch-title">
          <span class="batch-no">批次 #{{ group.batchNo }}</span>
          <a-tag :color="batchStatusColor(group.status)">{{ group.status }}</a-tag>
          <a-tag v-if="group.batchId === activeBatchId" color="blue">当前批次</a-tag>
        </div>
        <div class="batch-meta">
          <span
            >排产数量 <b>{{ group.qty }}</b></span
          >
          <span
            >工序任务 <b>{{ group.processCount }}</b></span
          >
          <span>下发时间 {{ group.dispatchedAt }}</span>
        </div>
      </div>

      <a-table
        size="small"
        bordered
        row-key="id"
        :columns="columns"
        :data-source="group.rows"
        :pagination="false"
        :scroll="{ x: 1320 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="scheduleTaskStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8" wrap>
              <a class="action-link" @click="onGenTask(record)">生成任务</a>
              <a class="action-link" @click="openEditExecutor(record)">修改执行人</a>
              <a class="action-link" @click="onResetStatus(record)">重置状态</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="executorModalOpen"
      title="修改执行人"
      ok-text="确定"
      cancel-text="取消"
      destroy-on-close
      @ok="saveExecutor"
    >
      <div v-if="editingRow" class="executor-edit">
        <div class="executor-meta">
          批次 #{{ editingRow.batchNo }} · {{ editingRow.processName }} · {{ editingRow.taskNo }}
        </div>
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
import { Modal, message } from 'ant-design-vue'
import ExecutorTagPicker from './ExecutorTagPicker.vue'
import {
  buildWorkOrderScheduleInfoBatchGroups,
  scheduleTaskStatusColor,
} from '@/utils/workOrderRelatedInfo'
import { batchStatusColor } from '@/utils/workOrderScheduleBatch'
import { resetWorkOrderScheduleTask } from '@/utils/workOrderStatus'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['action'])

const batchGroups = computed(() => buildWorkOrderScheduleInfoBatchGroups(props.workOrder))
const totalRowCount = computed(() =>
  batchGroups.value.reduce((s, g) => s + (g.rows?.length || 0), 0),
)
const activeBatchId = computed(() => props.workOrder?.activeScheduleBatchId || '')

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
  { title: '报工时间', dataIndex: 'reportedAt', width: 140 },
  { title: '操作', key: 'actions', width: 220, fixed: 'right' },
]

function onGenTask(record) {
  emit('action', { key: 'gen-task', workOrder: props.workOrder, record })
  message.success(`已为任务 ${record.taskNo} 生成小程序任务（演示）`)
}

function onResetStatus(record) {
  Modal.confirm({
    title: '重置状态',
    content: '重置状态会将任务状态重置，报工数量清零，是否确认？',
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      const result = resetWorkOrderScheduleTask(props.workOrder, record)
      if (!result.ok) {
        message.error(result.message || '重置失败')
        return Promise.reject()
      }
      emit('action', {
        key: 'reset-status',
        workOrder: props.workOrder,
        record,
        patch: result.patch,
      })
      message.success(
        result.resetCount
          ? `已重置 ${result.resetCount} 条任务状态并清零报工数量`
          : '已重置任务状态并清零报工数量',
      )
    },
  })
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
  .tab-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 12px;
  }

  .tab-title {
    font-weight: 600;
    font-size: 14px;
  }

  .tab-summary {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .batch-block {
    margin-bottom: 16px;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
    background: #fff;

    &.is-active {
      border-color: #91caff;
      box-shadow: 0 0 0 1px rgba(22, 119, 255, 0.08);
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  .batch-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 16px;
    padding: 10px 12px;
    background: #fafafa;
    border-bottom: 1px solid #f0f0f0;
  }

  .batch-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .batch-no {
    font-weight: 600;
    font-size: 13px;
    color: #1f1f1f;
  }

  .batch-meta {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 12px 16px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);

    b {
      color: rgba(0, 0, 0, 0.85);
      font-weight: 600;
    }
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
