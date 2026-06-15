<template>
  <div class="process-report-wo-detail-page">
    <a-spin :spinning="loading">
      <template v-if="bundle">
        <div class="page-header">
          <div class="header-left">
            <a-button size="small" @click="handleBack">返回</a-button>
            <span class="page-title">【{{ bundle.workOrderName }}】</span>
            <a-tag :color="statusColor(bundle.auditStatus)">{{ bundle.auditStatus }}</a-tag>
          </div>
          <a-button size="small" @click="reload">刷新</a-button>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工单编号">
              <a-space :size="6">
                <span>{{ bundle.workOrderCode }}</span>
                <a-button type="link" size="small" @click="copyWorkOrderCode">复制</a-button>
              </a-space>
            </a-descriptions-item>
            <a-descriptions-item label="物品编码">{{ bundle.materialCode }}</a-descriptions-item>
            <a-descriptions-item label="物品名称">{{ bundle.materialName }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{ bundle.specModel }}</a-descriptions-item>
            <a-descriptions-item label="销售单号">{{ bundle.salesOrderNo }}</a-descriptions-item>
            <a-descriptions-item label="排产数量">{{ bundle.scheduleQty }}</a-descriptions-item>
            <a-descriptions-item label="工作中心">{{ bundle.workCenter }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ bundle.owner }}</a-descriptions-item>
            <a-descriptions-item label="工艺路线">{{
              bundle.processRouteName
            }}</a-descriptions-item>
            <a-descriptions-item label="EBOM" :span="3">{{ bundle.ebomLabel }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="detail-toolbar">
            <a-radio-group v-model:value="activeTab" button-style="solid" size="small">
              <a-radio-button value="report">报工详情</a-radio-button>
              <a-radio-button value="log">操作日志</a-radio-button>
            </a-radio-group>
            <a-button
              v-if="activeTab === 'report'"
              type="primary"
              size="small"
              :disabled="!selectedLineIds.length"
              @click="handleBatchApprove"
            >
              批量审核
            </a-button>
          </div>

          <template v-if="activeTab === 'report'">
            <a-table
              :columns="lineColumns"
              :data-source="bundle.lines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 1800 }"
              :row-selection="rowSelection"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-badge :status="lineStatusBadge(line.status)" :text="line.status" />
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space v-if="line.status === '待审核'" :size="0">
                    <a-button type="link" size="small" @click="handleApproveOne(line)"
                      >通过</a-button
                    >
                    <a-button type="link" size="small" danger @click="openReject(line)"
                      >拒绝</a-button
                    >
                  </a-space>
                  <span v-else class="locked-text">已处理</span>
                </template>
                <template v-else>
                  {{ formatLineCell(line, column) }}
                </template>
              </template>
              <template #summary>
                <a-table-summary>
                  <a-table-summary-row>
                    <a-table-summary-cell :index="0" :col-span="7">合计</a-table-summary-cell>
                    <a-table-summary-cell :index="7" align="right">{{
                      summary.goodQty
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="8" align="right">{{
                      summary.defectQty
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="9" align="right">{{
                      summary.workHours
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="10" :col-span="5" />
                  </a-table-summary-row>
                </a-table-summary>
              </template>
            </a-table>
          </template>

          <a-table
            v-else
            :columns="logColumns"
            :data-source="bundle.logs || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          />
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到工单报工记录" />
    </a-spin>

    <ProcessReportRejectModal v-model:open="rejectOpen" @confirm="handleReject" />
  </div>
</template>

<script>
export default { name: 'ProcessReportWorkOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  approveProcessReport,
  batchApproveProcessReports,
  getProcessReportWorkOrderBundle,
  rejectProcessReport,
} from '@/store/processReportStore'
import { summarizeProcessReportLines } from '@/utils/processReportWorkOrder'
import { useTabs } from '@/composables/useTabs'
import ProcessReportRejectModal from './components/ProcessReportRejectModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const bundle = ref(null)
const activeTab = ref('report')
const selectedLineIds = ref([])
const rejectOpen = ref(false)
const rejectLineId = ref('')

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '任务编号', dataIndex: 'taskNo', width: 130 },
  { title: '工序名称', dataIndex: 'processName', width: 110 },
  { title: '执行人', dataIndex: 'reporter', width: 90 },
  { title: '班组', dataIndex: 'team', width: 100 },
  { title: '报工类型', dataIndex: 'reportType', width: 100 },
  { title: '良品数', dataIndex: 'goodQty', width: 80, align: 'right' },
  { title: '不良品数', dataIndex: 'defectQty', width: 88, align: 'right' },
  { title: '工作时长', dataIndex: 'workHours', width: 90, align: 'right' },
  { title: '不良原因', dataIndex: 'defectReason', width: 120, ellipsis: true },
  { title: '任务开始时间', dataIndex: 'taskStartTime', width: 150 },
  { title: '任务结束时间', dataIndex: 'taskEndTime', width: 150 },
  { title: '备注', dataIndex: 'remark', width: 120, ellipsis: true },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

const logColumns = [
  { title: '时间', dataIndex: 'time', width: 170 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '操作', dataIndex: 'action', width: 90 },
  { title: '对象', dataIndex: 'target', width: 140 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
]

const summary = computed(() =>
  bundle.value
    ? summarizeProcessReportLines(bundle.value.lines)
    : { goodQty: 0, defectQty: 0, workHours: 0 },
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedLineIds.value,
  onChange: (keys) => {
    selectedLineIds.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: record.status !== '待审核',
  }),
}))

function statusColor(status) {
  if (status === '已审核') return 'success'
  if (status === '部分审核') return 'warning'
  if (status === '已拒绝') return 'error'
  return 'default'
}

function lineStatusBadge(status) {
  if (status === '已审核') return 'success'
  if (status === '已拒绝') return 'error'
  return 'processing'
}

function formatLineCell(line, column) {
  const val = line[column.dataIndex]
  if (val === 0) return '0'
  return val ?? '—'
}

function reload() {
  loading.value = true
  bundle.value = getProcessReportWorkOrderBundle(route.params.workOrderId)
  selectedLineIds.value = []
  loading.value = false
}

watch(() => route.params.workOrderId, reload, { immediate: true })

function handleBack() {
  closeTab(route.path)
  router.push('/production/process-report')
}

async function copyWorkOrderCode() {
  if (!bundle.value?.workOrderCode) return
  try {
    await navigator.clipboard.writeText(bundle.value.workOrderCode)
    message.success('工单编号已复制')
  } catch {
    message.error('复制失败')
  }
}

function handleApproveOne(line) {
  Modal.confirm({
    title: '审核通过',
    content: `确认通过任务 ${line.taskNo}？`,
    onOk: () => {
      const res = approveProcessReport(line.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已通过')
      reload()
    },
  })
}

function openReject(line) {
  rejectLineId.value = line.id
  rejectOpen.value = true
}

function handleReject(reason) {
  const res = rejectProcessReport(rejectLineId.value, reason)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已拒绝')
  reload()
}

function handleBatchApprove() {
  Modal.confirm({
    title: '批量审核',
    content: '确认通过所选待审核任务？',
    onOk: () => {
      const res = batchApproveProcessReports(selectedLineIds.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      reload()
    },
  })
}
</script>

<style lang="less" scoped>
.process-report-wo-detail-page {
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-title {
    font-size: 16px;
    font-weight: 600;
  }

  .section-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .section-title {
    font-weight: 600;
    margin-bottom: 10px;
  }

  .detail-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .locked-text {
    color: #8c8c8c;
    font-size: 12px;
  }
}
</style>
