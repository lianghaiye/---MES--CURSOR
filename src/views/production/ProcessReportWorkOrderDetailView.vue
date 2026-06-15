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
                    <a-button type="link" size="small" @click.stop="openSubsidy(line)">补贴</a-button>
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

            <div v-if="summaryLine" class="wage-summary-section">
              <div class="wage-summary-head">
                <span class="section-title">工资计算汇总</span>
                <a-popover
                  placement="bottomLeft"
                  trigger="click"
                  overlay-class-name="wage-formula-popover"
                >
                  <template #content>
                    <div class="wage-formula-popover-content">
                      <div
                        v-for="item in activeWageFormulas"
                        :key="item.key"
                        class="wage-formula-item"
                      >
                        <div class="wage-formula-item-title">{{ item.title }}</div>
                        <div class="wage-formula-item-body">{{ item.formula }}</div>
                        <div v-if="item.note" class="wage-formula-item-note">{{ item.note }}</div>
                      </div>
                    </div>
                  </template>
                  <ExclamationCircleOutlined class="formula-help-icon" title="查看计算公式" />
                </a-popover>
              </div>
              <a-descriptions bordered size="small" :column="4" class="wage-desc">
                <a-descriptions-item label="任务编号">{{ summaryLine.taskNo || '—' }}</a-descriptions-item>
                <a-descriptions-item label="报工类型">{{
                  summaryLine.reportType || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="计薪方式">{{
                  summaryLine.salaryMethod || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="计薪(元)">{{
                  formatMoney(summaryLine.salaryAmount)
                }}</a-descriptions-item>
                <a-descriptions-item label="调整良品数">{{
                  formatQty(summaryLine.adjustedGoodQty)
                }}</a-descriptions-item>
                <a-descriptions-item label="调整不良品数">{{
                  formatQty(summaryLine.adjustedDefectQty)
                }}</a-descriptions-item>
                <a-descriptions-item label="调整工时">{{
                  formatHours(summaryLine.adjustedWorkHours)
                }}</a-descriptions-item>
                <a-descriptions-item label="补贴报工数">{{
                  formatQty(summaryLine.subsidyReportQty)
                }}</a-descriptions-item>
                <a-descriptions-item label="补贴工时">{{
                  formatHours(summaryLine.subsidyHours)
                }}</a-descriptions-item>
                <a-descriptions-item label="最终计件数">{{
                  formatQty(summaryLine.finalPieceQty)
                }}</a-descriptions-item>
                <a-descriptions-item label="初步核算工时(时)">{{
                  formatHours(summaryLine.accountHours)
                }}</a-descriptions-item>
                <a-descriptions-item label="不良品折算工资">{{
                  formatMoney(summaryLine.defectConvertedWage)
                }}</a-descriptions-item>
                <a-descriptions-item
                  v-if="summaryLine.qualityDeduction > 0"
                  label="质量扣款"
                >
                  -{{ formatMoney(summaryLine.qualityDeduction) }}
                </a-descriptions-item>
                <a-descriptions-item label="调整原因" :span="2">{{
                  summaryLine.adjustReason || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="补贴原因" :span="2">{{
                  summaryLine.subsidyReason || '—'
                }}</a-descriptions-item>
              </a-descriptions>

              <div
                v-if="summaryLine.defectWageDetails?.length"
                class="defect-wage-details"
              >
                <div class="defect-wage-details-title">不良原因工资折算</div>
                <div
                  v-for="detail in summaryLine.defectWageDetails"
                  :key="detail.id"
                  class="defect-wage-detail-row"
                >
                  <span class="defect-wage-detail-name">{{ detail.name }}</span>
                  <span class="defect-wage-detail-meta">（{{ detail.methodLabel }}）</span>
                  <span v-if="detail.applied && detail.formula !== '—'" class="defect-wage-detail-calc">
                    <template v-if="detail.rowType === 'hourly-deduction'">
                      {{ detail.formula }}=-{{ formatMoney(Math.abs(detail.amount)) }}
                    </template>
                    <template v-else>
                      折算工资：{{ detail.formula }}={{ formatMoney(detail.amount) }}
                    </template>
                  </span>
                  <span v-else class="defect-wage-detail-calc muted">不折算</span>
                </div>
              </div>

              <div class="wage-cards" :style="{ gridTemplateColumns: `repeat(${wageSummaryCards.length}, 1fr)` }">
                <div
                  v-for="card in wageSummaryCards"
                  :key="card.key"
                  class="wage-card"
                  :class="{ 'wage-card-total': card.isTotal }"
                >
                  <div class="wage-card-label">{{ card.label }}</div>
                  <div
                    class="wage-card-value"
                    :class="{ 'wage-card-value-deduction': card.isDeduction && card.rawValue > 0 }"
                  >
                    {{ card.value }}
                  </div>
                  <div v-if="card.formula" class="wage-card-sub">
                    {{ card.formula }}
                  </div>
                </div>
              </div>
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
    <LaborHourSubsidyModal
      v-model:open="subsidyOpen"
      :line="modalLine"
      :config="modalConfig"
      @confirm="onSubsidyConfirm"
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
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import {
  PROCESS_REPORT_WAGE_FORMULAS,
} from '@/constants/processReportWageFormulas'
import {
  adjustProcessReportLine,
  auditProcessReportLine,
  batchApproveProcessReports,
  getProcessReportWorkOrderBundle,
  subsidyProcessReportLine,
} from '@/store/processReportStore'
import { summarizeProcessReportLines } from '@/utils/processReportWorkOrder'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { useTabs } from '@/composables/useTabs'
import ProcessReportAdjustModal from './components/ProcessReportAdjustModal.vue'
import ProcessReportAuditModal from './components/ProcessReportAuditModal.vue'
import LaborHourSubsidyModal from '@/views/labor-salary/components/LaborHourSubsidyModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const bundle = ref(null)
const activeTab = ref('report')
const selectedLineIds = ref([])
const highlightedLineId = ref('')
const adjustOpen = ref(false)
const subsidyOpen = ref(false)
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
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
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

const activeWageFormulas = computed(() => {
  const keys = summaryLine.value?.formulaKeys || []
  if (!keys.length) return PROCESS_REPORT_WAGE_FORMULAS
  return PROCESS_REPORT_WAGE_FORMULAS.filter((item) => keys.includes(item.key))
})

const wageSummaryCards = computed(() => {
  const line = summaryLine.value
  if (!line) return []

  const cards = []

  if (Number(line.prepWage) > 0) {
    cards.push({
      key: 'prep',
      label: '准备工时工资',
      value: formatMoney(line.prepWage),
      formula: line.prepWageFormula
        ? `${line.prepWageFormula}=${formatMoney(line.prepWage)}`
        : '',
    })
  }
  if (Number(line.subsidyWage) > 0) {
    cards.push({
      key: 'subsidy',
      label: '补贴工资',
      value: formatMoney(line.subsidyWage),
    })
  }
  cards.push({
    key: 'good',
    label: '良品工资',
    value: formatMoney(line.goodWage),
    formula: line.goodWageFormula ? `${line.goodWageFormula}=${formatMoney(line.goodWage)}` : '',
  })
  cards.push({
    key: 'defect',
    label: '不良品工资 (折扣后)',
    value: formatMoney(line.defectWage),
  })
  if (Number(line.fixedDefectWage) > 0) {
    cards.push({
      key: 'fixed-defect',
      label: '固定扣款工时折算',
      value: formatMoney(line.fixedDefectWage),
    })
  }
  cards.push({
    key: 'deduction',
    label: '质量扣款',
    value: formatDeduction(line.qualityDeduction),
    rawValue: Number(line.qualityDeduction) || 0,
    isDeduction: true,
  })
  cards.push({
    key: 'total',
    label: '合计工资',
    value: formatMoney(line.salaryAmount),
    isTotal: true,
  })
  return cards
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

function formatDeduction(val) {
  const num = Number(val)
  if (!Number.isFinite(num) || num <= 0) return '¥0.00'
  return `-¥${num.toFixed(2)}`
}

function formatQty(val) {
  if (val === 0) return '0'
  return val ?? '—'
}

function formatHours(val) {
  if (val === 0) return '0'
  if (val == null || val === '' || val === '—') return '—'
  return `${val}`
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

function resolveConfig(line) {
  return resolveLaborConfig(bundle.value?.materialCode || line.productCode, line.processName)
}

function openAdjust(line) {
  modalLine.value = line
  modalConfig.value = resolveConfig(line)
  adjustOpen.value = true
}

function openSubsidy(line) {
  modalLine.value = line
  modalConfig.value = resolveConfig(line)
  subsidyOpen.value = true
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

function onSubsidyConfirm(payload) {
  const res = subsidyProcessReportLine(modalLine.value.id, payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('补贴已保存')
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
    content: '审核通过后，报工数据将锁定，无法再进行调整或补贴，是否确认审核？',
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

  .wage-summary-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }

  .wage-summary-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }

  .formula-help-icon {
    color: #faad14;
    font-size: 16px;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: #d48806;
    }
  }

  .wage-desc {
    margin-bottom: 16px;
  }

  .defect-wage-details {
    margin-bottom: 16px;
    padding: 12px 14px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
  }

  .defect-wage-details-title {
    font-size: 13px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.65);
    margin-bottom: 10px;
  }

  .defect-wage-detail-row {
    font-size: 13px;
    line-height: 1.8;
    color: rgba(0, 0, 0, 0.88);

    & + & {
      margin-top: 4px;
    }
  }

  .defect-wage-detail-name {
    font-weight: 500;
  }

  .defect-wage-detail-meta {
    color: rgba(0, 0, 0, 0.45);
  }

  .defect-wage-detail-calc {
    margin-left: 4px;

    &.muted {
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .wage-cards {
    display: grid;
    gap: 12px;
  }

  .wage-card {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 16px 20px;
    min-height: 88px;
  }

  .wage-card-total {
    background: #fff;
    border: 1px solid #f0f0f0;
  }

  .wage-card-label {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 8px;
  }

  .wage-card-value {
    font-size: 24px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
    line-height: 1.2;
  }

  .wage-card-value-deduction {
    color: #cf1322;
  }

  .wage-card-sub {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .wage-summary-head .section-title {
    margin-bottom: 0;
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
