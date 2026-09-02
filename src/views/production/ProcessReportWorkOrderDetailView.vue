<template>
  <div class="process-report-wo-detail-page">
    <a-spin :spinning="loading">
      <template v-if="bundle">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">【{{ bundle.workOrderName }}】</span>
            <a-tag :color="statusColor(bundle.taskStatus)">{{ bundle.taskStatus }}</a-tag>
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
            <a-space v-if="activeTab === 'report'">
              <a-button
                v-if="manualPushMode"
                size="small"
                :disabled="!selectedPushableIds.length"
                @click="handleBatchPush"
              >
                批量推送
              </a-button>
              <a-button
                type="primary"
                size="small"
                :disabled="!selectedAuditableIds.length"
                @click="handleBatchApprove"
              >
                批量审核
              </a-button>
            </a-space>
          </div>

          <template v-if="activeTab === 'report'">
            <a-table
              :columns="lineColumns"
              :data-source="displayLines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 2400 }"
              :row-selection="rowSelection"
              :custom-row="customRow"
              :row-class-name="rowClassName"
              v-model:expandedRowKeys="expandedRowKeys"
              :indent-size="8"
            >
              <template #headerCell="{ column }">
                <ColumnHeaderWithHint
                  v-if="column.key === 'reporter'"
                  :title="column.title"
                  :hint="processReportExecutorHint"
                />
                <ColumnHeaderWithHint
                  v-else-if="column.key === 'operator'"
                  :title="column.title"
                  :hint="processReportOperatorHint"
                />
              </template>
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">
                  <span
                    class="index-cell"
                    :class="{
                      'index-parent': line.isGroup,
                      'index-child': line.isCollabChild,
                    }"
                  >
                    <span v-if="line.isCollabChild" class="index-branch" aria-hidden="true">└</span>
                    {{ resolveRowIndex(line, index) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'taskStatus'">
                  <a-badge :status="taskStatusBadge(line.taskStatus)" :text="line.taskStatus" />
                </template>
                <template v-else-if="column.key === 'pushStatus'">
                  <a-tag :color="pushStatusColor(line.pushStatus)">{{ line.pushStatus }}</a-tag>
                </template>
                <template v-else-if="column.key === 'collab'">
                  <template v-if="line.isGroup">
                    <a-tag
                      class="collab-form-tag"
                      :color="line.outcomeMode === 'shared' ? 'blue' : 'purple'"
                      >{{ line.collabLabel }}</a-tag
                    >
                  </template>
                  <template v-else-if="line.isCollabChild">
                    <a-tag class="collab-slot-tag">{{ line.collabSlotLabel || '成员' }}</a-tag>
                  </template>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'taskNo'">
                  <span :class="{ 'group-task-no': line.isGroup }">{{ line.taskNo || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'reporter'">
                  <span v-if="line.isGroup" class="member-names">{{
                    line.memberNames || '—'
                  }}</span>
                  <span v-else>{{ line.reporter || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'scheduleQty'">
                  <span class="schedule-qty-cell">
                    <a-tooltip v-if="isLineOverSchedule(line)" title="报工数量超过排产数">
                      <ExclamationCircleOutlined class="schedule-qty-warn" />
                    </a-tooltip>
                    <span>{{ formatScheduleQty(line.scheduleQty) }}</span>
                  </span>
                </template>
                <template v-else-if="column.key === 'listAccountHours'">
                  {{ formatAccountHours(line.listAccountHours) }}
                </template>
                <template v-else-if="column.key === 'salaryAmount'">
                  {{ formatMoney(line.salaryAmount) }}
                </template>
                <template v-else-if="column.key === 'sceneImages'">
                  <ProcessReportSceneImages
                    v-if="!line.isGroup"
                    :images="line.images"
                    :file-prefix="`${line.taskNo || '现场图片'}`"
                  />
                  <span v-else class="muted-dash">—</span>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space v-if="line.taskStatus !== TASK_STATUS.AUDITED" :size="0">
                    <a-button type="link" size="small" @click.stop="openAdjust(line)"
                      >调整</a-button
                    >
                    <a-button
                      v-if="manualPushMode && canPush(line)"
                      type="link"
                      size="small"
                      @click.stop="handlePushOne(line)"
                      >推送</a-button
                    >
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
                :editable="summaryLine?.taskStatus !== TASK_STATUS.AUDITED"
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
      :group-member-count="adjustTargetIds.length"
      @confirm="onAdjustConfirm"
    />
    <ProcessReportAuditModal v-model:open="auditOpen" :line="modalLine" @confirm="onAuditConfirm" />
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
  adjustProcessReportLine,
  adjustProcessReportLines,
  auditProcessReportLine,
  batchApproveProcessReports,
  getProcessReportWorkOrderBundle,
  pushProcessReportLines,
} from '@/store/processReportStore'
import { isManualSalaryPush } from '@/store/functionParamStore'
import { PUSH_STATUS, TASK_STATUS } from '@/utils/mobileLaborWagePush'
import { summarizeProcessReportLines } from '@/utils/processReportWorkOrder'
import {
  buildProcessReportCollabTree,
  findLineInProcessReportTree,
  flattenProcessReportTreeLeaves,
  resolveProcessReportActionIds,
} from '@/utils/processReportCollaboration'
import {
  formatScheduleQtyDisplay,
  isLineReportQtyOverSchedule,
} from '@/utils/processReportQuantities'
import {
  buildProcessReportDetailSummaryCells,
  processReportDetailLineColumns,
  processReportExecutorHint,
  processReportOperatorHint,
} from '@/utils/processReportDetailTable'
import ColumnHeaderWithHint from '@/components/ColumnHeaderWithHint.vue'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { useTabs } from '@/composables/useTabs'
import ProcessReportAdjustModal from './components/ProcessReportAdjustModal.vue'
import ProcessReportAuditModal from './components/ProcessReportAuditModal.vue'
import ProcessReportSceneImages from './components/ProcessReportSceneImages.vue'
import ProcessReportWageSummary from './components/ProcessReportWageSummary.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const bundle = ref(null)
const activeTab = ref('report')
const selectedLineIds = ref([])
const highlightedLineId = ref('')
const expandedRowKeys = ref([])
const adjustOpen = ref(false)
const auditOpen = ref(false)
const modalLine = ref(null)
const modalConfig = ref(null)
const adjustTargetIds = ref([])
const auditTargetIds = ref([])

const lineColumns = processReportDetailLineColumns

const displayLines = computed(() => buildProcessReportCollabTree(bundle.value?.lines || []))

const leafLines = computed(() => flattenProcessReportTreeLeaves(displayLines.value))

const logColumns = [
  { title: '时间', dataIndex: 'time', width: 170 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '操作', dataIndex: 'action', width: 90 },
  { title: '对象', dataIndex: 'target', width: 140 },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
]

const summary = computed(() => {
  if (!leafLines.value.length) {
    return { goodQty: 0, defectQty: 0, accountHours: 0, salaryAmount: 0 }
  }
  const base = summarizeProcessReportLines(leafLines.value)
  const salaryAmount = leafLines.value.reduce((s, l) => s + (Number(l.salaryAmount) || 0), 0)
  return { ...base, salaryAmount: Math.round(salaryAmount * 100) / 100 }
})

/** 合计行：逐列渲染，避免 col-span 与固定列/滚动条列错位 */
const summaryCells = computed(() =>
  buildProcessReportDetailSummaryCells(summary.value, formatAccountHours, formatMoney),
)

const manualPushMode = computed(() => isManualSalaryPush())

const selectedPushableIds = computed(() =>
  selectedLineIds.value.filter((id) => {
    const line = leafLines.value.find((l) => l.id === id)
    return line && canPush(line)
  }),
)

const selectedAuditableIds = computed(() =>
  selectedLineIds.value.filter((id) => {
    const line = leafLines.value.find((l) => l.id === id)
    return line && canAudit(line)
  }),
)

const summaryLine = computed(() => {
  if (!highlightedLineId.value) return null
  const hit = findLineInProcessReportTree(displayLines.value, highlightedLineId.value)
  if (!hit) return null
  if (hit.isGroup) return hit.children?.[0] || null
  return hit
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedLineIds.value,
  checkStrictly: false,
  onChange: (keys) => {
    // 主行勾选会带上 children；只保留真实叶子记录
    const leafIdSet = new Set(leafLines.value.map((l) => l.id))
    selectedLineIds.value = keys.filter((k) => leafIdSet.has(k))
  },
  getCheckboxProps: (record) => ({
    disabled: record.isGroup
      ? record.taskStatus === TASK_STATUS.AUDITED
      : record.taskStatus === TASK_STATUS.AUDITED,
  }),
}))

function statusColor(status) {
  if (status === TASK_STATUS.AUDITED) return 'success'
  if (status === '部分审核') return 'warning'
  return 'default'
}

function taskStatusBadge(status) {
  if (status === TASK_STATUS.AUDITED) return 'success'
  if (status === '部分审核' || status === '部分完成') return 'warning'
  return 'processing'
}

function pushStatusColor(status) {
  if (status === PUSH_STATUS.AUTO_PUSHED) return 'green'
  if (status === PUSH_STATUS.PUSHED) return 'blue'
  if (status === '部分推送') return 'orange'
  return 'default'
}

function canPush(line) {
  if (line.isGroup) {
    return (line.children || []).some((c) => c.pushStatus === PUSH_STATUS.NOT_PUSHED)
  }
  return line.pushStatus === PUSH_STATUS.NOT_PUSHED
}

function canAudit(line) {
  if (line.isGroup) {
    return (line.children || []).some((c) => c.taskStatus === TASK_STATUS.REPORTED)
  }
  return line.taskStatus === TASK_STATUS.REPORTED
}

function formatMoney(val) {
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  return `¥${num.toFixed(2)}`
}

function formatAccountHours(val, allowZero = false) {
  if (val == null || val === '') return '—'
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  if (!allowZero && num === 0) return '—'
  return String(num)
}

function formatLineCell(line, column) {
  const val = line[column.dataIndex]
  if (val === 0) return '0'
  return val ?? '—'
}

function formatScheduleQty(val) {
  return formatScheduleQtyDisplay(val ?? bundle.value?.scheduleQty)
}

function isLineOverSchedule(line) {
  if (line.isGroup) return false
  return isLineReportQtyOverSchedule(line, bundle.value?.scheduleQty)
}

function resolveRowIndex(line, index) {
  const tops = displayLines.value
  if (line.isCollabChild) {
    const parent = tops.find((r) => r.id === line.parentGroupId)
    const parentIdx = parent ? tops.findIndex((r) => r.id === parent.id) + 1 : 0
    const childIdx =
      line.collabChildIndex || (parent?.children || []).findIndex((c) => c.id === line.id) + 1
    return parentIdx && childIdx ? `${parentIdx}.${childIdx}` : String(index + 1)
  }
  const topIdx = tops.findIndex((r) => r.id === line.id)
  return topIdx >= 0 ? topIdx + 1 : index + 1
}

function syncExpandedKeys() {
  // 默认折叠协作主行，仅保留用户已展开的 key（过滤掉已不存在的）
  const valid = new Set(displayLines.value.filter((r) => r.isGroup).map((r) => r.id))
  expandedRowKeys.value = expandedRowKeys.value.filter((k) => valid.has(k))
}

function customRow(record) {
  return {
    onClick: () => {
      highlightedLineId.value = record.isGroup ? record.children?.[0]?.id || record.id : record.id
    },
  }
}

function rowClassName(record) {
  const classes = []
  const activeId = highlightedLineId.value
  if (record.id === activeId) classes.push('row-active')
  if (record.isGroup && record.children?.some((c) => c.id === activeId)) classes.push('row-active')
  if (record.isGroup) classes.push('row-collab-parent')
  if (record.isCollabChild) classes.push('row-collab-child')
  return classes.join(' ')
}

function reload() {
  loading.value = true
  bundle.value = getProcessReportWorkOrderBundle(route.params.workOrderId)
  const leaves = flattenProcessReportTreeLeaves(
    buildProcessReportCollabTree(bundle.value?.lines || []),
  )
  if (!leaves.some((l) => l.id === highlightedLineId.value)) {
    highlightedLineId.value = leaves[0]?.id || ''
  }
  selectedLineIds.value = []
  syncExpandedKeys()
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
  adjustTargetIds.value = resolveProcessReportActionIds(line)
  adjustOpen.value = true
}

function openAudit(line) {
  modalLine.value = line
  auditTargetIds.value = resolveProcessReportActionIds(line).filter((id) => {
    const leaf = leafLines.value.find((l) => l.id === id)
    return leaf && canAudit(leaf)
  })
  auditOpen.value = true
}

function onAdjustConfirm(payload) {
  const ids = adjustTargetIds.value.length
    ? adjustTargetIds.value
    : resolveProcessReportActionIds(modalLine.value)
  const res =
    ids.length > 1
      ? adjustProcessReportLines(ids, payload)
      : adjustProcessReportLine(ids[0], payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message || '调整已保存')
  reload()
}

function onAuditConfirm({ result, rejectReason }) {
  const ids = auditTargetIds.value.length
    ? auditTargetIds.value
    : resolveProcessReportActionIds(modalLine.value)
  let okCount = 0
  ids.forEach((id) => {
    const res = auditProcessReportLine(id, result, result === 'reject' ? rejectReason : '')
    if (res.ok) okCount += 1
  })
  if (!okCount) {
    message.warning('审核失败')
    return
  }
  message.success(
    result === 'approve'
      ? ids.length > 1
        ? `已审核通过 ${okCount} 条`
        : '审核通过'
      : ids.length > 1
        ? `已拒绝 ${okCount} 条`
        : '已拒绝',
  )
  reload()
}

function handleBatchApprove() {
  Modal.confirm({
    title: '批量审核',
    content: '审核通过后，报工数据将锁定，无法再进行调整，是否确认审核？',
    onOk: () => {
      const res = batchApproveProcessReports(selectedAuditableIds.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      reload()
    },
  })
}

function handlePushOne(line) {
  const ids = resolveProcessReportActionIds(line).filter((id) => {
    const leaf = leafLines.value.find((l) => l.id === id)
    return leaf && leaf.pushStatus === PUSH_STATUS.NOT_PUSHED
  })
  const label = line.isGroup ? `${line.taskNo}（${ids.length}人）` : line.taskNo
  Modal.confirm({
    title: '推送确认',
    content: `确认将任务 ${label} 推送至小程序「工时工资」列表？`,
    onOk: () => {
      const res = pushProcessReportLines(ids)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message || '已推送')
      reload()
    },
  })
}

function handleBatchPush() {
  Modal.confirm({
    title: '批量推送',
    content: `确认将选中的 ${selectedPushableIds.value.length} 条任务推送至小程序「工时工资」列表？`,
    onOk: () => {
      const res = pushProcessReportLines(selectedPushableIds.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      selectedLineIds.value = []
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

  .schedule-qty-cell {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    width: 100%;
  }

  .schedule-qty-warn {
    color: #fa8c16;
    font-size: 14px;
    flex-shrink: 0;
  }

  .collab-form-tag {
    margin: 0;
    max-width: none;
    white-space: nowrap;
  }

  .collab-slot-tag {
    margin: 0;
    font-size: 12px;
    line-height: 18px;
    color: rgba(0, 0, 0, 0.45);
    background: #fff;
    border-color: #d9d9d9;
  }

  .member-names {
    display: inline-block;
    max-width: 100%;
  }

  .group-task-no {
    font-weight: 600;
  }

  .index-cell {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
  }

  :deep(.ant-table-cell-with-append) {
    white-space: nowrap;
  }

  .index-parent {
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .index-child {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  .index-branch {
    color: #69b1ff;
    font-size: 12px;
    line-height: 1;
    flex-shrink: 0;
  }

  .muted-dash {
    color: rgba(0, 0, 0, 0.25);
  }

  :deep(.row-collab-parent) > td {
    background: #e6f4ff !important;
    font-weight: 500;
  }

  :deep(.row-collab-parent) > td:first-child {
    box-shadow: inset 4px 0 0 #1677ff;
  }

  :deep(.row-collab-child) > td {
    background: #f7f8fa !important;
    color: rgba(0, 0, 0, 0.75);
  }

  :deep(.row-collab-child) > td:first-child {
    box-shadow: inset 4px 0 0 #91caff;
  }

  /* 子行取消树形缩进占位，避免「3.1」被挤出列外 */
  :deep(.ant-table-row-level-1 .ant-table-row-indent) {
    width: 0 !important;
    padding: 0 !important;
  }

  :deep(.ant-table-row-level-1 .ant-table-cell-with-append) {
    padding-left: 8px !important;
  }

  :deep(.ant-table-row-level-1 .ant-table-row-expand-icon) {
    margin-inline-end: 4px !important;
  }

  :deep(.ant-table-row-level-1 .ant-table-row-expand-icon-spaced) {
    margin-inline-end: 4px !important;
  }

  :deep(.row-active) > td {
    background: #bae0ff !important;
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
