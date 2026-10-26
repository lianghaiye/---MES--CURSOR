<template>
  <div class="rework-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="全部"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="返工单号">
              <a-input
                v-model:value="filters.reworkNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="工单号">
              <a-input
                v-model:value="filters.workOrderNo"
                allow-clear
                size="small"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="加工中心">
              <a-select
                v-model:value="filters.workCenter"
                allow-clear
                size="small"
                placeholder="全部"
                :options="workCenterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="来源">
              <a-select
                v-model:value="filters.source"
                allow-clear
                size="small"
                placeholder="全部"
                :options="sourceOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-button type="primary" size="small" @click="openCreate">新建返工单</a-button>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1850 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'reworkNo'">
            <a @click="openDetail(record)">{{ record.reworkNo }}</a>
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
          <template v-else-if="column.key === 'taskProgress'">
            {{ taskProgressText(record) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a @click="openDetail(record)">详情</a>
              <a v-if="canClose(record)" class="danger-link" @click="onClose(record)">关闭</a>
            </a-space>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          :show-size-changer="false"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ReworkOrderView' }
</script>

<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { Modal, message } from 'ant-design-vue'
import {
  reworkOrderState,
  filterReworkOrders,
  closeReworkOrder,
  REWORK_ORDER_STATUS,
  REWORK_ORDER_SOURCE,
} from '@/store/reworkOrderStore'
import {
  reworkOrderStatusColor,
  isReworkOrderOpen,
  resolveReworkTaskStatus,
  formatScheduleBatchLabel,
} from '@/constants/reworkOrder'
import { workCenterOptions } from '@/mock/workOrderOptions'
import { listProcessReportsByReworkOrderId, processReportState } from '@/store/processReportStore'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  status: undefined,
  reworkNo: '',
  workOrderNo: '',
  workCenter: undefined,
  source: undefined,
})
const applied = reactive({ ...filters })
const pagination = reactive({ current: 1, pageSize: 20 })

const statusOpts = Object.values(REWORK_ORDER_STATUS).map((v) => ({ label: v, value: v }))
const sourceOpts = Object.values(REWORK_ORDER_SOURCE).map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '返工单号', key: 'reworkNo', width: 140 },
  { title: '状态', key: 'status', width: 90 },
  { title: '工单号', dataIndex: 'workOrderNo', width: 140 },
  { title: '排产批次', key: 'scheduleBatch', width: 100 },
  { title: '加工中心', dataIndex: 'workCenter', width: 110, ellipsis: true },
  { title: '产品', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '返工数量', dataIndex: 'qty', width: 90, align: 'right' },
  { title: '待重做', key: 'pending', width: 80, align: 'right' },
  { title: '任务进度', key: 'taskProgress', width: 110 },
  { title: '重做工序', key: 'processes', width: 140, ellipsis: true },
  { title: '原因', dataIndex: 'reason', width: 110, ellipsis: true },
  { title: '来源', dataIndex: 'source', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 160 },
  { title: '操作', key: 'actions', width: 110, fixed: 'right' },
]

const filteredList = computed(() => {
  void reworkOrderState.orders
  return filterReworkOrders(reworkOrderState.orders, applied)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

function totalPending(record) {
  return (record.processes || []).reduce((s, p) => s + (Number(p.pendingQty) || 0), 0)
}

function taskProgressText(record) {
  void processReportState.records
  const closed = !isReworkOrderOpen(record.status)
  const reports = listProcessReportsByReworkOrderId(record.id)
  const tasks = reports.length
    ? reports
    : (record.processes || []).map((line) => ({
        status: Number(line.doneQty) > 0 ? '已报工' : '待报工',
        goodQty: line.doneQty,
        qty: line.qty,
      }))
  const total = tasks.length
  if (!total) return '—'
  const done = tasks.filter(
    (t) => resolveReworkTaskStatus(t, { orderClosed: closed }) === '已报工',
  ).length
  return `${done}/${total} 已报工`
}

function handleSearch() {
  Object.assign(applied, filters)
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.reworkNo = ''
  filters.workOrderNo = ''
  filters.workCenter = undefined
  filters.source = undefined
  handleSearch()
}

function canClose(record) {
  return isReworkOrderOpen(record.status)
}

function openCreate() {
  const page = findCreatePageByListPath('/production/rework-orders')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openDetail(record) {
  const path = `/production/rework-orders/${record.id}`
  openTab(path, `返工单 ${record.reworkNo}`)
  router.push({ name: 'production-rework-orders-detail', params: { id: record.id } })
}

function onClose(record) {
  Modal.confirm({
    title: '关闭返工单',
    content: `确定关闭「${record.reworkNo}」？关闭后将取消尚未报工的返工任务。`,
    onOk: () => {
      const res = closeReworkOrder(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
    },
  })
}
</script>

<style lang="less" scoped>
.rework-page {
  padding: 0;
}
.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
}
.toolbar-row {
  margin-bottom: 8px;
}
.pagination-wrap {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.danger-link {
  color: #ff4d4f;
}
</style>
