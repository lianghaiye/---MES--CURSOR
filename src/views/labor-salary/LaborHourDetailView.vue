<template>
  <div class="labor-hour-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">【{{ record.workOrderName }}】</span>
            <a-tag :color="statusColor(record.taskStatus)">{{ record.taskStatus }}</a-tag>
          </div>
          <a-space>
            <a-button size="small" @click="reload">刷新</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工单编号">{{ record.workOrderCode }}</a-descriptions-item>
            <a-descriptions-item label="物品编码">{{
              record.materialCode || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="物品名称">{{
              record.materialName || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{
              record.specModel || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="销售单号">{{
              record.salesOrderNo || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="排产数量">{{ record.scheduleQty }}</a-descriptions-item>
            <a-descriptions-item label="工作中心">{{ record.workCenter }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ record.owner }}</a-descriptions-item>
            <a-descriptions-item label="工艺路线">{{
              record.processRouteName || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="detail-toolbar">
            <a-radio-group v-model:value="activeTab" button-style="solid" size="small">
              <a-radio-button value="account">核算详情</a-radio-button>
              <a-radio-button value="log">操作日志</a-radio-button>
            </a-radio-group>
            <a-space v-if="activeTab === 'account'">
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
                @click="handleBatchAudit"
              >
                批量审核
              </a-button>
            </a-space>
          </div>

          <template v-if="activeTab === 'account'">
            <a-table
              :columns="lineColumns"
              :data-source="record.lines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: 2200 }"
              :row-selection="rowSelection"
            >
              <template #bodyCell="{ column, record: line, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'taskStatus'">
                  <a-badge :status="taskStatusBadge(line.taskStatus)" :text="line.taskStatus" />
                </template>
                <template v-else-if="column.key === 'pushStatus'">
                  <a-tag :color="pushStatusColor(line.pushStatus)">{{ line.pushStatus }}</a-tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-space v-if="line.taskStatus !== TASK_STATUS.AUDITED" :size="0">
                    <a-button type="link" size="small" @click="openAdjust(line)">调整</a-button>
                    <a-button type="link" size="small" @click="openSubsidy(line)">补贴</a-button>
                    <a-button
                      v-if="manualPushMode && canPush(line)"
                      type="link"
                      size="small"
                      @click="handlePushOne(line)"
                      >推送</a-button
                    >
                    <a-button
                      v-if="canAudit(line)"
                      type="link"
                      size="small"
                      @click="handleAuditOne(line)"
                      >审核</a-button
                    >
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
                    <a-table-summary-cell :index="0" :col-span="9">工时总计</a-table-summary-cell>
                    <a-table-summary-cell :index="9" align="right">{{
                      summary.reportQty
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="10" align="right">{{
                      summary.reportDuration
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="11" align="right">{{
                      summary.adjustedReportQty
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="12" align="right">{{
                      summary.adjustedDuration
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="13" align="right">{{
                      summary.subsidyReportQty
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="14" align="right">{{
                      summary.subsidyHours
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="15" align="right">{{
                      summary.finalPieceQty
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="16" align="right">{{
                      summary.accountHours
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="17" align="right">{{
                      summary.salaryAmount
                    }}</a-table-summary-cell>
                    <a-table-summary-cell :index="18" :col-span="8" />
                  </a-table-summary-row>
                </a-table-summary>
              </template>
            </a-table>
          </template>

          <a-table
            v-else
            :columns="logColumns"
            :data-source="record.logs || []"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
          />
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到工时记录" />
    </a-spin>

    <LaborHourAdjustModal
      v-model:open="adjustOpen"
      :line="activeLine"
      :config="activeConfig"
      @confirm="onAdjustConfirm"
    />
    <LaborHourSubsidyModal
      v-model:open="subsidyOpen"
      :line="activeLine"
      :config="activeConfig"
      @confirm="onSubsidyConfirm"
    />
  </div>
</template>

<script>
export default { name: 'LaborHourDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  adjustLaborLine,
  auditLaborLines,
  getLaborHourById,
  pushLaborLines,
  subsidyLaborLine,
} from '@/store/laborHourStore'
import { isManualSalaryPush } from '@/store/functionParamStore'
import { PUSH_STATUS, TASK_STATUS } from '@/utils/mobileLaborWagePush'
import { summarizeLaborLines } from '@/utils/laborHourCalc'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { tabStore, useTabs } from '@/composables/useTabs'
import LaborHourAdjustModal from './components/LaborHourAdjustModal.vue'
import LaborHourSubsidyModal from './components/LaborHourSubsidyModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('account')
const selectedLineIds = ref([])
const adjustOpen = ref(false)
const subsidyOpen = ref(false)
const activeLine = ref(null)
const activeConfig = ref(null)

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '任务状态', key: 'taskStatus', width: 90, fixed: 'left' },
  { title: '推送状态', key: 'pushStatus', width: 100, fixed: 'left' },
  { title: '执行人', dataIndex: 'executor', width: 90 },
  { title: '操作人', dataIndex: 'operator', width: 90 },
  { title: '班组', dataIndex: 'team', width: 80 },
  { title: '工序名称', dataIndex: 'processName', width: 130 },
  { title: '任务编号', dataIndex: 'taskNo', width: 130 },
  { title: '报工数', dataIndex: 'reportQty', width: 88, align: 'right' },
  { title: '报工时长', dataIndex: 'reportDuration', width: 90, align: 'right' },
  { title: '调整报工数', dataIndex: 'adjustedReportQty', width: 96, align: 'right' },
  { title: '调整时长', dataIndex: 'adjustedDuration', width: 90, align: 'right' },
  { title: '补贴报工数', dataIndex: 'subsidyReportQty', width: 96, align: 'right' },
  { title: '补贴工时', dataIndex: 'subsidyHours', width: 90, align: 'right' },
  { title: '最终计件数', dataIndex: 'finalPieceQty', width: 96, align: 'right' },
  { title: '核算工时', dataIndex: 'accountHours', width: 90, align: 'right' },
  { title: '计薪(元)', dataIndex: 'salaryAmount', width: 100, align: 'right' },
  { title: '报工类型', dataIndex: 'reportType', width: 90 },
  { title: '计薪方式', dataIndex: 'salaryMethod', width: 90 },
  { title: '调整原因', dataIndex: 'adjustReason', width: 120, ellipsis: true },
  { title: '补贴原因', dataIndex: 'subsidyReason', width: 120, ellipsis: true },
  { title: '报工备注', dataIndex: 'remark', width: 120, ellipsis: true },
  { title: '任务开工时间', dataIndex: 'taskStartTime', width: 140 },
  { title: '任务完工时间', dataIndex: 'taskEndTime', width: 140 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const logColumns = [
  { title: '时间', dataIndex: 'time', width: 160 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '动作', dataIndex: 'action', width: 80 },
  { title: '对象', dataIndex: 'target', width: 180, ellipsis: true },
  { title: '备注', dataIndex: 'remark', ellipsis: true },
]

const summary = computed(() => summarizeLaborLines(record.value?.lines || []))

const manualPushMode = computed(() => isManualSalaryPush())

const selectedPushableIds = computed(() =>
  selectedLineIds.value.filter((id) => {
    const line = record.value?.lines?.find((l) => l.id === id)
    return line && canPush(line)
  }),
)

const selectedAuditableIds = computed(() =>
  selectedLineIds.value.filter((id) => {
    const line = record.value?.lines?.find((l) => l.id === id)
    return line && canAudit(line)
  }),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedLineIds.value,
  onChange: (keys) => {
    selectedLineIds.value = keys
  },
  getCheckboxProps: (line) => ({
    disabled: line.taskStatus === TASK_STATUS.AUDITED,
  }),
}))

function statusColor(status) {
  if (status === TASK_STATUS.AUDITED) return 'success'
  if (status === '部分审核') return 'warning'
  return 'default'
}

function taskStatusBadge(status) {
  if (status === TASK_STATUS.AUDITED) return 'success'
  return 'processing'
}

function pushStatusColor(status) {
  if (status === PUSH_STATUS.AUTO_PUSHED) return 'green'
  if (status === PUSH_STATUS.PUSHED) return 'blue'
  return 'default'
}

function canPush(line) {
  return line.pushStatus === PUSH_STATUS.NOT_PUSHED
}

function canAudit(line) {
  return line.taskStatus === TASK_STATUS.REPORTED
}

function formatLineCell(line, column) {
  const key = column.dataIndex
  const val = line[key]
  if (val === 0) return '0'
  if (key === 'reportDuration' || key === 'adjustedDuration' || key === 'subsidyHours') {
    return val != null && val !== '' ? `${val}` : '—'
  }
  return val ?? '—'
}

function reload() {
  loading.value = true
  const row = getLaborHourById(route.params.id)
  record.value = row
  if (row) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = row.workOrderCode || '工时详情'
  }
  selectedLineIds.value = []
  loading.value = false
}

watch(() => route.params.id, reload, { immediate: true })

function handleBack() {
  closeTab(route.path)
  router.push('/labor-salary/labor-hour')
}

function openAdjust(line) {
  activeLine.value = line
  activeConfig.value = resolveLaborConfig(record.value.materialCode, line.processName)
  adjustOpen.value = true
}

function openSubsidy(line) {
  activeLine.value = line
  activeConfig.value = resolveLaborConfig(record.value.materialCode, line.processName)
  subsidyOpen.value = true
}

function onAdjustConfirm(payload) {
  const res = adjustLaborLine(record.value.id, activeLine.value.id, payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  record.value = res.order
  message.success('调整已保存')
}

function onSubsidyConfirm(payload) {
  const res = subsidyLaborLine(record.value.id, activeLine.value.id, payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  record.value = res.order
  message.success('补贴已保存')
}

function handleAuditOne(line) {
  Modal.confirm({
    title: '提示',
    content: '审核通过后，报工数据将锁定，无法再进行调整或补贴，是否确认审核？',
    onOk: () => {
      const res = auditLaborLines(record.value.id, [line.id])
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      record.value = res.order
      message.success('审核成功')
    },
  })
}

function handlePushOne(line) {
  Modal.confirm({
    title: '推送确认',
    content: `确认将任务 ${line.taskNo} 推送至小程序「工时工资」列表，供工人确认？`,
    onOk: () => {
      const res = pushLaborLines(record.value.id, [line.id])
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      record.value = res.order
      message.success('推送成功')
    },
  })
}

function handleBatchPush() {
  Modal.confirm({
    title: '批量推送',
    content: `确认将选中的 ${selectedPushableIds.value.length} 条任务推送至小程序「工时工资」列表？`,
    onOk: () => {
      const res = pushLaborLines(record.value.id, selectedPushableIds.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      record.value = res.order
      selectedLineIds.value = []
      message.success(`已推送 ${res.count} 条任务`)
    },
  })
}

function handleBatchAudit() {
  Modal.confirm({
    title: '提示',
    content: '审核通过后，报工数据将锁定，无法再进行调整或补贴，是否确认审核？',
    onOk: () => {
      const res = auditLaborLines(record.value.id, selectedAuditableIds.value)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      record.value = res.order
      selectedLineIds.value = []
      message.success('批量审核成功')
    },
  })
}
</script>

<style lang="less" scoped>
.labor-hour-detail-page {
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
