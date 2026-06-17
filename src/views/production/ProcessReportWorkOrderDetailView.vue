<template>
  <div class="process-report-wo-detail-page">
    <a-spin :spinning="loading">
      <template v-if="bundle">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">【{{ bundle.workOrderName }}】</span>
            <a-tag :color="statusColor(bundle.auditStatus)">{{ bundle.auditStatus }}</a-tag>
          </div>
          <a-space>
            <a-button size="small" @click="reload">刷新</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
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
              :scroll="{ x: 1900 }"
              :row-selection="rowSelection"
              :custom-row="customRow"
              :row-class-name="rowClassName"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'status'">
                  <a-badge :status="lineStatusBadge(line.status)" :text="line.status" />
                </template>
                <template v-else-if="column.key === 'salaryAmount'">
                  {{ formatMoney(line.salaryAmount) }}
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space v-if="line.status !== '已审核'" :size="0">
                    <a-button type="link" size="small" @click.stop="openAdjust(line)">调整</a-button>
                    <a-button type="link" size="small" @click.stop="openAudit(line)">审核</a-button>
                  </a-space>
                  <span v-else class="locked-text">已锁定</span>
                </template>
                <template v-else>
                  {{ formatLineCell(line, column) }}
                </template>
              </template>
              <template #summary>
                <a-table-summary>
                  <a-table-summary-row>
                    <a-table-summary-cell
                      v-for="cell in summaryCells"
                      :key="cell.index"
                      :index="cell.index"
                      :align="cell.align"
                      :class="{ 'summary-label-cell': cell.index === 1 }"
                    >
                      {{ cell.content }}
                    </a-table-summary-cell>
                  </a-table-summary-row>
                </a-table-summary>
              </template>
            </a-table>

            <div v-if="summaryLine" class="wage-summary-wrap">
              <ProcessReportWageSummary
                :line="summaryLine"
                :editable="summaryLine?.status !== '已审核'"
                @updated="reload"
              />
            </div>
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

    <ProcessReportAdjustModal
      v-model:open="adjustOpen"
      :line="modalLine"
      :config="modalConfig"
      @confirm="onAdjustConfirm"
    />
    <ProcessReportAuditModal
      v-model:open="auditOpen"
      :line="modalLine"
      @confirm="onAuditConfirm"
    />
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
  adjustProcessReportLine,
  auditProcessReportLine,
  batchApproveProcessReports,
  getProcessReportWorkOrderBundle,
} from '@/store/processReportStore'
import { summarizeProcessReportLines } from '@/utils/processReportWorkOrder'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { useTabs } from '@/composables/useTabs'
import ProcessReportAdjustModal from './components/ProcessReportAdjustModal.vue'
import ProcessReportAuditModal from './components/ProcessReportAuditModal.vue'
import ProcessReportWageSummary from './components/ProcessReportWageSummary.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const bundle = ref(null)
const activeTab = ref('report')
const selectedLineIds = ref([])
const highlightedLineId = ref('')
const adjustOpen = ref(false)
const auditOpen = ref(false)
const modalLine = ref(null)
const modalConfig = ref(null)

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
  { title: '计薪方式', dataIndex: 'salaryMethod', width: 100 },
  { title: '计薪(元)', key: 'salaryAmount', width: 100, align: 'right' },
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

const summary = computed(() => {
  if (!bundle.value?.lines?.length) {
    return { goodQty: 0, defectQty: 0, workHours: 0, salaryAmount: 0 }
  }
  const base = summarizeProcessReportLines(bundle.value.lines)
  const salaryAmount = bundle.value.lines.reduce(
    (s, l) => s + (Number(l.salaryAmount) || 0),
    0,
  )
  return { ...base, salaryAmount: Math.round(salaryAmount * 100) / 100 }
})

/** 合计行：逐列渲染，避免 col-span 与固定列/滚动条列错位 */
const summaryCells = computed(() => {
  const totalCols = 1 + lineColumns.length + 1
  const cells = Array.from({ length: totalCols }, (_, index) => ({
    index,
    content: '',
    align: undefined,
  }))
  cells[1].content = '合计'
  cells[8].content = String(summary.value.goodQty)
  cells[8].align = 'right'
  cells[9].content = String(summary.value.defectQty)
  cells[9].align = 'right'
  cells[10].content = String(summary.value.workHours)
  cells[10].align = 'right'
  cells[13].content = formatMoney(summary.value.salaryAmount)
  cells[13].align = 'right'
  return cells
})

const summaryLine = computed(() => {
  if (!highlightedLineId.value || !bundle.value?.lines) return null
  return bundle.value.lines.find((l) => l.id === highlightedLineId.value) || null
})

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

function formatMoney(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  return `¥${num.toFixed(2)}`
}

function formatLineCell(line, column) {
  const val = line[column.dataIndex]
  if (val === 0) return '0'
  return val ?? '—'
}

function customRow(record) {
  return {
    onClick: () => {
      highlightedLineId.value = record.id
    },
  }
}

function rowClassName(record) {
  return record.id === highlightedLineId.value ? 'row-active' : ''
}

function reload() {
  loading.value = true
  bundle.value = getProcessReportWorkOrderBundle(route.params.workOrderId)
  const lines = bundle.value?.lines || []
  if (!lines.some((l) => l.id === highlightedLineId.value)) {
    highlightedLineId.value = lines[0]?.id || ''
  }
  selectedLineIds.value = []
  loading.value = false
}

watch(() => route.params.workOrderId, reload, { immediate: true })

function handleBack() {
  closeTab(route.path)
  router.push('/report-management/process-report')
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

function resolveConfig(line) {
  return resolveLaborConfig(bundle.value?.materialCode || line.productCode, line.processName)
}

function openAdjust(line) {
  modalLine.value = line
  modalConfig.value = resolveConfig(line)
  adjustOpen.value = true
}

function openAudit(line) {
  modalLine.value = line
  auditOpen.value = true
}

function onAdjustConfirm(payload) {
  const res = adjustProcessReportLine(modalLine.value.id, payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('调整已保存')
  reload()
}

function onAuditConfirm({ result, rejectReason }) {
  const res = auditProcessReportLine(
    modalLine.value.id,
    result,
    result === 'reject' ? rejectReason : '',
  )
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(result === 'approve' ? '审核通过' : '已拒绝')
  reload()
}

function handleBatchApprove() {
  Modal.confirm({
    title: '批量审核',
    content: '审核通过后，报工数据将锁定，无法再进行调整，是否确认审核？',
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

  :deep(.summary-label-cell) {
    font-weight: 600;
  }

  :deep(.row-active) {
    td {
      background: #e6f4ff !important;
    }
  }
}
</style>

<style lang="less">
.wage-formula-popover-content {
  max-width: 520px;
}

.wage-formula-item + .wage-formula-item {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #f0f0f0;
}

.wage-formula-item-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  margin-bottom: 6px;
}

.wage-formula-item-body {
  font-size: 13px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.65);
}

.wage-formula-item-note {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.45);
}
</style>
