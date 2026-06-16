<template>
  <div class="process-report-detail-page">
    <a-spin :spinning="loading">
      <template v-if="bundle">
        <div class="page-header">
          <div class="header-left">
            <a-button size="small" @click="handleBack">返回</a-button>
            <span class="page-title">【{{ bundle.materialName }}】</span>
            <a-tag :color="statusColor(bundle.auditStatus)">{{ bundle.auditStatus }}</a-tag>
          </div>
          <a-button size="small" @click="reload">刷新</a-button>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="物品编码">{{ bundle.materialCode }}</a-descriptions-item>
            <a-descriptions-item label="物品名称">{{ bundle.materialName }}</a-descriptions-item>
            <a-descriptions-item label="规格型号">{{ bundle.specModel }}</a-descriptions-item>
            <a-descriptions-item label="工作中心">{{ bundle.workCenter }}</a-descriptions-item>
            <a-descriptions-item label="负责人">{{ bundle.owner }}</a-descriptions-item>
            <a-descriptions-item label="工艺路线">{{ bundle.processRouteName }}</a-descriptions-item>
            <a-descriptions-item label="EBOM" :span="3">{{ bundle.ebomLabel }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">报工详情</div>
          <a-table
            :columns="lineColumns"
            :data-source="bundle.lines"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1900 }"
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
          </a-table>

          <ProcessReportWageSummary :line="summaryLine" />
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到工序报工记录" />
    </a-spin>

    <ProcessReportAdjustModal
      v-model:open="adjustOpen"
      variant="quick"
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
export default { name: 'ProcessReportDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  adjustProcessReportLine,
  auditProcessReportLine,
  getProcessReportQuickBundle,
  subsidyProcessReportLine,
} from '@/store/processReportStore'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { useTabs } from '@/composables/useTabs'
import ProcessReportAdjustModal from './components/ProcessReportAdjustModal.vue'
import ProcessReportAuditModal from './components/ProcessReportAuditModal.vue'
import ProcessReportWageSummary from './components/ProcessReportWageSummary.vue'
import LaborHourSubsidyModal from '@/views/labor-salary/components/LaborHourSubsidyModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const bundle = ref(null)
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

const summaryLine = computed(() => bundle.value?.lines?.[0] || null)

function statusColor(status) {
  if (status === '已审核') return 'success'
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

function rowClassName() {
  return 'row-active'
}

function reload() {
  loading.value = true
  bundle.value = getProcessReportQuickBundle(route.params.id)
  loading.value = false
}

watch(() => route.params.id, reload, { immediate: true })

function handleBack() {
  closeTab(route.path)
  router.push('/production/process-report')
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
</script>

<style lang="less" scoped>
.process-report-detail-page {
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

  .locked-text {
    color: #8c8c8c;
    font-size: 12px;
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
