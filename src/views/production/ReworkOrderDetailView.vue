<template>
  <div class="rework-detail-page">
    <template v-if="!record">
      <div class="detail-sticky-bar">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">返工单详情</span>
          </div>
          <a-space :size="8">
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>
      </div>
      <div class="tab-body">
        <a-empty description="返工单不存在或已删除" />
      </div>
    </template>

    <template v-else>
      <div class="detail-sticky-bar">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ record.reworkNo }}</span>
            <a-tag :color="reworkOrderStatusColor(record.status)">{{ record.status }}</a-tag>
            <span class="sub">{{ record.source }}</span>
          </div>
          <a-space :size="8">
            <a-button v-if="isOpen" size="small" danger @click="onClose">关闭返工单</a-button>
            <a-button size="small" @click="goBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="overview" tab="概览" />
            <a-tab-pane key="tasks" :tab="`返工任务 (${taskRows.length})`" />
          </a-tabs>
        </div>
      </div>

      <div class="tab-body">
        <template v-if="activeTab === 'overview'">
          <DetailSectionCard title="基本信息">
            <DetailInfoGrid :meta-items="metaItems" :fields="basicFields" flush />
          </DetailSectionCard>

          <DetailSectionCard title="重做工序">
            <a-table
              :columns="processCols"
              :data-source="record.processes || []"
              row-key="processName"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record: line }">
                <template v-if="column.key === 'originalExecutors'">
                  {{ (line.originalExecutors || []).join('、') || '—' }}
                </template>
                <template v-else-if="column.dataIndex">
                  {{ line[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </template>

        <template v-else-if="activeTab === 'tasks'">
          <DetailSectionCard :title="`返工任务（${taskRows.length}）`">
            <a-table
              :columns="taskCols"
              :data-source="taskRows"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无返工任务（创建返工单后自动生成）' }"
            >
              <template #headerCell="{ column }">
                <template v-if="column.key === 'reportedAt'">
                  <span class="col-title-with-tip">
                    报工时间
                    <a-tooltip title="工人提交该返工任务报工的时间；尚未报工时显示 —">
                      <QuestionCircleOutlined class="col-tip-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template v-else>{{ column.title }}</template>
              </template>
              <template #bodyCell="{ column, record: task }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="scheduleTaskStatusColor(task.displayStatus)">{{
                    task.displayStatus
                  }}</a-tag>
                </template>
                <template v-else-if="column.key === 'progress'">
                  {{ Number(task.goodQty || task.doneQty) || 0 }} /
                  {{ Number(task.targetQty ?? task.scheduleQty ?? task.qty) || 0 }}
                </template>
                <template v-else-if="column.key === 'reportedAt'">
                  {{ task.reportedAt || lastReportedAt(task.processName) }}
                </template>
                <template v-else>
                  {{ task[column.dataIndex] ?? '—' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'ReworkOrderDetailView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import DetailInfoGrid from '@/views/product-process/components/DetailInfoGrid.vue'
import { getReworkOrderById, closeReworkOrder, reworkOrderState } from '@/store/reworkOrderStore'
import {
  reworkOrderStatusColor,
  isReworkOrderOpen,
  resolveReworkTaskStatus,
} from '@/constants/reworkOrder'
import { scheduleTaskStatusColor } from '@/utils/workOrderRelatedInfo'
import { listProcessReportsByReworkOrderId, processReportState } from '@/store/processReportStore'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()
const activeTab = ref('overview')

const record = computed(() => {
  void reworkOrderState.orders
  return getReworkOrderById(route.params.id)
})

const isOpen = computed(() => isReworkOrderOpen(record.value?.status))

const taskRows = computed(() => {
  void processReportState.records
  const order = record.value
  if (!order?.id) return []
  const closed = !isReworkOrderOpen(order.status)
  const reports = listProcessReportsByReworkOrderId(order.id)
  if (reports.length) {
    return reports.map((row) => ({
      ...row,
      displayStatus: resolveReworkTaskStatus(row, { orderClosed: closed }),
      reworkAssignee: row.reworkAssignee || row.reporter || '',
    }))
  }
  return (order.processes || []).map((line, index) => ({
    id: `${order.id}-${line.processName || index}`,
    processName: line.processName,
    reworkAssignee: line.reworkAssignee,
    qty: line.qty,
    doneQty: line.doneQty,
    pendingQty: line.pendingQty,
    goodQty: line.doneQty,
    targetQty: line.qty,
    displayStatus: resolveReworkTaskStatus(
      {
        status:
          closed && !(Number(line.doneQty) > 0)
            ? '已取消'
            : Number(line.doneQty) > 0
              ? '已报工'
              : '待报工',
        goodQty: line.doneQty,
        qty: line.qty,
      },
      { orderClosed: closed },
    ),
  }))
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

const metaItems = computed(() => {
  const r = record.value
  if (!r) return []
  return [
    { key: 'status', label: '状态', value: display(r.status) },
    { key: 'source', label: '来源', value: display(r.source) },
    { key: 'creator', label: '创建人', value: display(r.creator) },
    { key: 'createdAt', label: '创建时间', value: display(r.createdAt) },
    { key: 'completedAt', label: '完成时间', value: display(r.completedAt) },
  ]
})

const basicFields = computed(() => {
  const r = record.value
  if (!r) return []
  return [
    { key: 'reworkNo', label: '返工单号', value: display(r.reworkNo) },
    { key: 'workOrderNo', label: '工单号', value: display(r.workOrderNo) },
    { key: 'workOrderCategory', label: '工单类型', value: display(r.workOrderCategory) },
    { key: 'workCenter', label: '加工中心', value: display(r.workCenter) },
    { key: 'productName', label: '产品名称', value: display(r.productName) },
    { key: 'productCode', label: '产品编号', value: display(r.productCode) },
    { key: 'specModel', label: '规格型号', value: display(r.specModel) },
    { key: 'material', label: '材质', value: display(r.material) },
    { key: 'drawingNo', label: '图号', value: display(r.drawingNo) },
    { key: 'processRouteName', label: '工艺路线', value: display(r.processRouteName) },
    { key: 'qty', label: '返工数量', value: display(r.qty) },
    {
      key: 'scheduleQty',
      label: '排产数量',
      value: display(r.scheduleQty || r.planQty),
    },
    { key: 'qcTaskNo', label: '质检单', value: display(r.qcTaskNo) },
    { key: 'reason', label: '返工原因', value: display(r.reason), fullRow: true },
    { key: 'remark', label: '备注', value: display(r.remark), fullRow: true },
  ]
})

const processCols = [
  { title: '工序', dataIndex: 'processName', width: 120 },
  { title: '原执行人', key: 'originalExecutors', width: 140, ellipsis: true },
  { title: '返工人', dataIndex: 'reworkAssignee', width: 100 },
  { title: '应重做', dataIndex: 'qty', width: 80, align: 'right' },
  { title: '已重做', dataIndex: 'doneQty', width: 80, align: 'right' },
  { title: '待重做', dataIndex: 'pendingQty', width: 80, align: 'right' },
]

const taskCols = [
  { title: '任务号', dataIndex: 'taskNo', width: 140 },
  { title: '状态', key: 'status', width: 90 },
  { title: '工序', dataIndex: 'processName', width: 120 },
  { title: '执行人', dataIndex: 'reworkAssignee', width: 100 },
  { title: '完成进度', key: 'progress', width: 110, align: 'right' },
  { title: '报工时间', key: 'reportedAt', width: 170 },
]

function lastReportedAt(processName) {
  const logs = record.value?.reportLogs || []
  const hit = logs.find((log) => log.processName === processName && Number(log.goodQty) > 0)
  return hit?.reportedAt || '—'
}

function onClose() {
  Modal.confirm({
    title: '关闭返工单',
    content: '关闭后将取消尚未报工的返工任务，工单若无其他未完成返工单将恢复原状态。确定关闭？',
    onOk: () => {
      const res = closeReworkOrder(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}

function goBack() {
  const path = route.path
  closeTab(path)
  router.push({ name: 'production-rework-orders' })
}
</script>

<style lang="less" scoped>
.rework-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
  cursor: help;
}
</style>
