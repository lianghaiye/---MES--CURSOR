<template>
  <div v-if="detail" class="work-order-detail-tab">
    <a-steps :current="timelineCurrent" class="wo-timeline" size="small">
      <a-step v-for="step in detail.timeline" :key="step.key" :status="step.status">
        <template #title>{{ step.title }}</template>
        <template #description>
          <div v-if="step.description" class="step-desc">{{ step.description }}</div>
          <div v-if="step.sub" class="step-sub">{{ step.sub }}</div>
        </template>
      </a-step>
    </a-steps>

    <div class="action-bar">
      <a-button class="btn-outline" @click="onAction('schedule-qty')">修改排产数量</a-button>
      <a-button type="primary" @click="onAction('urgency')">调整紧急度</a-button>
      <a-button class="btn-warn" @click="onAction('pause')">暂停</a-button>
      <a-button class="btn-danger" @click="onAction('terminate')">终止</a-button>
      <a-button class="btn-success" @click="onAction('complete')">完成</a-button>
    </div>

    <a-collapse v-model:activeKey="collapseKeys" :bordered="false" class="detail-sections">
      <a-collapse-panel key="basic" header="工单基本信息">
        <WorkOrderProductionSections :work-order="workOrder" show-meta-bar />
      </a-collapse-panel>

      <a-collapse-panel key="process-config" header="工序配置">
        <a-table
          size="small"
          :columns="processConfigCols"
          :data-source="processConfigList"
          row-key="id"
          :pagination="false"
          :scroll="{ x: 700 }"
          bordered
        >
          <template #bodyCell="{ column, record, text }">
            <template v-if="column.key === 'feeding'">
              {{ formatProcessFeedingSummary(record) }}
            </template>
            <template v-else-if="column.key === 'executors'">
              {{ formatProcessExecutors(record) }}
            </template>
            <template v-else-if="column.dataIndex">
              {{ displayProcessCell(text) }}
            </template>
          </template>
        </a-table>
      </a-collapse-panel>

      <a-collapse-panel key="process-exec" header="工序执行详情">
        <a-table
          size="small"
          :columns="execCols"
          :data-source="detail.processExecutions"
          row-key="id"
          :pagination="false"
          :scroll="{ x: 900 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <a-space :size="8">
                <a class="action-link" @click="onAction('gen-task', record)">
                  <CheckOutlined /> 生成任务
                </a>
                <a class="action-link" @click="onAction('edit-executor', record)">
                  <EditOutlined /> 修改执行者
                </a>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-collapse-panel>

      <a-collapse-panel key="task-exec" header="工序下任务执行详情">
        <div class="panel-toolbar">
          <a-button type="primary" size="small" @click="onAction('batch-edit')">
            <EditOutlined /> 批量修改
          </a-button>
        </div>
        <a-table
          size="small"
          :columns="taskCols"
          :data-source="detail.processTasks"
          row-key="id"
          :pagination="false"
          :scroll="{ x: 1100 }"
        />
      </a-collapse-panel>

      <a-collapse-panel key="qc" header="质检详情">
        <a-table
          size="small"
          :columns="qcCols"
          :data-source="detail.qcDetails"
          row-key="id"
          :pagination="false"
        />
      </a-collapse-panel>

      <a-collapse-panel key="feeding" header="投料详情">
        <a-table
          size="small"
          :columns="feedingCols"
          :data-source="detail.feedingDetails"
          row-key="id"
          :pagination="false"
          :scroll="{ x: 900 }"
        />
      </a-collapse-panel>

      <a-collapse-panel key="inbound" header="入库详情">
        <a-table
          size="small"
          :columns="inboundCols"
          :data-source="detail.inboundDetails"
          row-key="id"
          :pagination="false"
        />
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { CheckOutlined, EditOutlined } from '@ant-design/icons-vue'
import { buildWorkOrderDetail } from '@/mock/workOrderDetail'
import {
  formatProcessExecutors,
  formatProcessFeedingSummary,
} from '@/utils/workOrderProcessDisplay'
import WorkOrderProductionSections from './WorkOrderProductionSections.vue'

const props = defineProps({
  workOrder: { type: Object, required: true },
})

const emit = defineEmits(['action'])

const collapseKeys = ref([
  'basic',
  'process-config',
  'process-exec',
  'task-exec',
  'qc',
  'feeding',
  'inbound',
])

const detail = computed(() => buildWorkOrderDetail(props.workOrder))

const processConfigList = computed(() => props.workOrder?.processes || [])

const processConfigCols = [
  { title: '序号', dataIndex: 'index', width: 56, align: 'center' },
  { title: '工序名称', dataIndex: 'name', width: 100 },
  { title: '工序内容', dataIndex: 'processContent', width: 140, ellipsis: true },
  { title: '投料', key: 'feeding', width: 160, ellipsis: true },
  { title: '执行者', key: 'executors', width: 100 },
]

function displayProcessCell(value) {
  const text = String(value ?? '').trim()
  return text || '—'
}

const timelineCurrent = computed(() => {
  const steps = detail.value?.timeline || []
  const idx = steps.findIndex((s) => s.status === 'process')
  if (idx >= 0) return idx
  const lastFinish = [...steps].reverse().findIndex((s) => s.status === 'finish')
  if (lastFinish >= 0) return steps.length - 1 - lastFinish
  return 0
})

const execCols = [
  { title: '顺序', dataIndex: 'seq', width: 72 },
  { title: '工序名', dataIndex: 'processName', width: 100 },
  { title: '执行者', dataIndex: 'executor', width: 88 },
  { title: '计划产量', dataIndex: 'planQty', width: 88 },
  { title: '完成产量', dataIndex: 'doneQty', width: 88 },
  { title: '报废数', dataIndex: 'scrapQty', width: 72 },
  { title: '计划完成日期', dataIndex: 'planFinishDate', width: 120 },
  { title: '进度', dataIndex: 'progress', width: 80 },
  { title: '操作', key: 'actions', width: 200, fixed: 'right' },
]

const taskCols = [
  { title: '顺序', dataIndex: 'seq', width: 72 },
  { title: '工序名', dataIndex: 'processName', width: 88 },
  { title: '任务编号', dataIndex: 'taskNo', width: 140, ellipsis: true },
  { title: '执行者', dataIndex: 'executor', width: 80 },
  { title: '预计产量', dataIndex: 'planQty', width: 88 },
  { title: '正常产量', dataIndex: 'normalQty', width: 88 },
  { title: '报废数', dataIndex: 'scrapQty', width: 72 },
  { title: '进度状态', dataIndex: 'progressStatus', width: 88 },
  { title: '任务状态', dataIndex: 'taskStatus', width: 80 },
  { title: '开始日期', dataIndex: 'startDate', width: 150, ellipsis: true },
  { title: '完成日期', dataIndex: 'finishDate', width: 150 },
  { title: '操作', key: 'actions', width: 80 },
]

const qcCols = [
  { title: '顺序', dataIndex: 'seq', width: 72 },
  { title: '规格属性', dataIndex: 'specAttr', width: 100 },
  { title: '工序名', dataIndex: 'processName', width: 88 },
  { title: '质检数', dataIndex: 'inspectQty', width: 80 },
  { title: '报废', dataIndex: 'scrapQty', width: 72 },
  { title: '合格', dataIndex: 'qualified', width: 64 },
  { title: '合格数', dataIndex: 'qualifiedQty', width: 80 },
  { title: '合格率', dataIndex: 'qualifiedRate', width: 88 },
  { title: '执行人', dataIndex: 'executor', width: 80 },
]

const feedingCols = [
  { title: '顺序', dataIndex: 'seq', width: 72 },
  { title: '工序名', dataIndex: 'processName', width: 88 },
  { title: '物料编码', dataIndex: 'materialCode', width: 110 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '投料数量', dataIndex: 'feedQty', width: 100 },
  { title: '批次号', dataIndex: 'batchNo', width: 130 },
  { title: '执行人', dataIndex: 'executor', width: 80 },
]

const inboundCols = [
  { title: '顺序', dataIndex: 'seq', width: 72 },
  { title: '规格属性', dataIndex: 'specAttr', width: 100 },
  { title: '入库仓库', dataIndex: 'warehouse', width: 120 },
  { title: '入库数量', dataIndex: 'inboundQty', width: 100 },
]

const detailActionKeys = ['urgency', 'pause', 'terminate', 'complete']

function onAction(key) {
  if (detailActionKeys.includes(key)) {
    emit('action', { key, workOrder: props.workOrder })
    return
  }
  const labels = {
    'schedule-qty': '修改排产数量',
    'sales-order': '查看销售订单',
    'gen-task': '生成任务',
    'edit-executor': '修改执行者',
    'batch-edit': '批量修改',
  }
  message.info(`${labels[key] || key}（演示）`)
}
</script>

<style lang="less" scoped>
.work-order-detail-tab {
  .wo-timeline {
    margin-bottom: 16px;
    padding: 12px 8px;
    background: #fafafa;
    border-radius: 8px;

    :deep(.ant-steps-item-description) {
      max-width: 200px;
    }

    .step-desc,
    .step-sub {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      line-height: 1.4;
    }
  }

  .action-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;

    .btn-outline {
      color: #1677ff;
      border-color: #91caff;
      background: #e6f4ff;
    }

    .btn-warn {
      color: #fff;
      background: #fa8c16;
      border-color: #fa8c16;
    }

    .btn-danger {
      color: #fff;
      background: #ff4d4f;
      border-color: #ff4d4f;
    }

    .btn-success {
      color: #fff;
      background: #52c41a;
      border-color: #52c41a;
    }
  }

  .detail-sections {
    :deep(.ant-collapse-item) {
      margin-bottom: 8px;
      background: #fff;
      border: 1px solid #f0f0f0 !important;
      border-radius: 8px;
      overflow: hidden;
    }

    :deep(.ant-collapse-header) {
      font-weight: 600;
      padding: 10px 16px !important;
    }

    :deep(.ant-collapse-content-box) {
      padding: 12px 16px 16px !important;
    }
  }

  .panel-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
  }

  .action-link {
    font-size: 12px;
    white-space: nowrap;
  }
}
</style>
