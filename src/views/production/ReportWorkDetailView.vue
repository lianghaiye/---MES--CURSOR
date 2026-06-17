<template>
  <div class="report-work-detail-page">
    <a-spin :spinning="loading">
      <template v-if="bundle">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">【{{ bundle.materialName }}】</span>
            <a-tag>{{ bundle.registerMode }}</a-tag>
            <a-tag :color="record?.confirmStatus === '已确认' ? 'success' : 'warning'">
              {{ record?.confirmStatus }}
            </a-tag>
          </div>
          <a-space>
            <template v-if="record?.confirmStatus === '待确认'">
              <a-button size="small" @click="openEdit">编辑</a-button>
              <a-button size="small" danger @click="handleDelete">删除</a-button>
              <a-button type="primary" size="small" @click="handleConfirm">确认</a-button>
            </template>
            <a-button size="small" @click="reload">刷新</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item v-if="bundle.isWorkOrderRegistration" label="工单编号">
              <a-space :size="6">
                <span>{{ bundle.workOrderCode }}</span>
                <a-button type="link" size="small" @click="copyWorkOrderCode">复制</a-button>
              </a-space>
            </a-descriptions-item>
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
            :scroll="{ x: 1700 }"
            :custom-row="customRow"
            :row-class-name="rowClassName"
          >
            <template #bodyCell="{ column, record: line, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'salaryAmount'">
                {{ formatMoney(line.salaryAmount) }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button type="link" size="small" @click.stop="openSubsidy(line)">补贴</a-button>
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
                    :class="{ 'summary-label-cell': cell.index === 0 }"
                  >
                    {{ cell.content }}
                  </a-table-summary-cell>
                </a-table-summary-row>
              </a-table-summary>
            </template>
          </a-table>

          <div v-if="summaryLine" class="wage-summary-wrap">
            <ProcessReportWageSummary :line="summaryLine" />
          </div>
        </div>
      </template>

      <template v-else-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="page-title">{{ record.workOrderNo }}</span>
            <a-tag :color="record.confirmStatus === '已确认' ? 'success' : 'warning'">
              {{ record.confirmStatus }}
            </a-tag>
            <a-tag>{{ record.registerMode }}</a-tag>
          </div>
          <a-space>
            <template v-if="record.confirmStatus === '待确认'">
              <a-button size="small" @click="openEdit">编辑</a-button>
              <a-button size="small" danger @click="handleDelete">删除</a-button>
              <a-button type="primary" size="small" @click="handleConfirm">确认</a-button>
            </template>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div v-if="isWorkOrderRegistration" class="section-card">
          <div class="section-title">工单信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item label="工单编号">{{ record.workOrderNo }}</a-descriptions-item>
            <a-descriptions-item label="产品">{{ record.productName }}</a-descriptions-item>
            <a-descriptions-item label="登记类型">{{
              record.registrationType
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">基础信息</div>
          <a-descriptions bordered size="small" :column="3">
            <a-descriptions-item v-if="!isWorkOrderRegistration" label="产品名称">
              {{ record.productName }}
            </a-descriptions-item>
            <a-descriptions-item label="产品编码">{{
              record.productCode || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="登记类型">{{
              record.registrationType
            }}</a-descriptions-item>
            <a-descriptions-item label="登记方式">{{ record.registerMode }}</a-descriptions-item>
            <a-descriptions-item label="状态">{{ record.confirmStatus }}</a-descriptions-item>
            <a-descriptions-item label="登记人">{{ record.reporter || '—' }}</a-descriptions-item>
            <a-descriptions-item label="登记日期">{{
              record.registeredDate || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="登记时间">{{
              record.createdAt || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div class="section-card">
          <div class="section-title">报工信息</div>
          <a-alert
            type="warning"
            show-icon
            message="整体登记不支持工时工资的核算"
            class="overall-alert"
          />
          <a-descriptions bordered size="small" :column="3" class="info-desc">
            <a-descriptions-item label="生产日期">
              {{ record.productionDate || record.reportDate || '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="良品数">
              {{ record.goodQty ?? record.finishedQty }} 件
            </a-descriptions-item>
            <a-descriptions-item label="不良品数"
              >{{ record.defectQty || 0 }} 件</a-descriptions-item
            >
            <a-descriptions-item label="合计完工">{{ record.finishedQty }} 件</a-descriptions-item>
            <a-descriptions-item label="操作人员" :span="3">
              {{ record.operators?.length ? record.operators.join('、') : '—' }}
            </a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              record.remark || '—'
            }}</a-descriptions-item>
          </a-descriptions>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该登记记录" />
    </a-spin>

    <LaborHourSubsidyModal
      v-model:open="subsidyOpen"
      :line="modalLine"
      :config="modalConfig"
      @confirm="onSubsidyConfirm"
    />

    <ReportWorkFormModal
      v-model:open="formOpen"
      :mode="formMode"
      :edit-id="editId"
      @saved="onFormSaved"
    />
  </div>
</template>

<script>
export default { name: 'ReportWorkDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  getQuickReportById,
  getReportWorkPerProcessBundle,
  subsidyQuickReportProcess,
  confirmQuickReport,
  deleteQuickReport,
} from '@/store/quickReportStore'
import { summarizeProcessReportLines } from '@/utils/processReportWorkOrder'
import { resolveLaborConfig } from '@/utils/laborConfigResolver'
import { tabStore, useTabs } from '@/composables/useTabs'
import ProcessReportWageSummary from './components/ProcessReportWageSummary.vue'
import LaborHourSubsidyModal from '@/views/labor-salary/components/LaborHourSubsidyModal.vue'
import ReportWorkFormModal from './components/ReportWorkFormModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const bundle = ref(null)
const highlightedLineId = ref('')
const subsidyOpen = ref(false)
const modalLine = ref(null)
const modalConfig = ref(null)
const formOpen = ref(false)
const formMode = ref('quick')
const editId = ref('')

const isWorkOrderRegistration = computed(() => record.value?.registrationType === '工单登记')

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
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
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
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

const summaryCells = computed(() => {
  const cells = Array.from({ length: lineColumns.length }, (_, index) => ({
    index,
    content: '',
    align: undefined,
  }))
  cells[0].content = '合计'
  cells[5].content = String(summary.value.goodQty)
  cells[5].align = 'right'
  cells[6].content = String(summary.value.defectQty)
  cells[6].align = 'right'
  cells[7].content = String(summary.value.workHours)
  cells[7].align = 'right'
  cells[10].content = formatMoney(summary.value.salaryAmount)
  cells[10].align = 'right'
  return cells
})

const summaryLine = computed(() => {
  if (!highlightedLineId.value || !bundle.value?.lines) return null
  return bundle.value.lines.find((l) => l.id === highlightedLineId.value) || null
})

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

function customRow(line) {
  return {
    onClick: () => {
      highlightedLineId.value = line.id
    },
  }
}

function rowClassName(line) {
  return line.id === highlightedLineId.value ? 'row-active' : ''
}

function reload() {
  loading.value = true
  const row = getQuickReportById(route.params.id)
  record.value = row
  if (row?.perProcessRegister !== false) {
    bundle.value = getReportWorkPerProcessBundle(route.params.id)
    const lines = bundle.value?.lines || []
    if (!lines.some((l) => l.id === highlightedLineId.value)) {
      highlightedLineId.value = lines[0]?.id || ''
    }
  } else {
    bundle.value = null
  }
  if (row) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) {
      tab.title =
        row.perProcessRegister !== false ? row.productName || '登记详情' : row.workOrderNo || '登记详情'
    }
  }
  loading.value = false
}

watch(() => route.params.id, reload, { immediate: true })

function handleBack() {
  const detailPath = route.path
  const listPath = '/report-management/report-work'
  const closingActive = tabStore.activePath === detailPath
  closeTab(detailPath)
  router.push(closingActive ? tabStore.activePath || listPath : listPath)
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

function openSubsidy(line) {
  modalLine.value = line
  modalConfig.value = resolveConfig(line)
  subsidyOpen.value = true
}

function onSubsidyConfirm(payload) {
  const res = subsidyQuickReportProcess(bundle.value.reportId, modalLine.value.id, payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('补贴已保存')
  reload()
}

function openEdit() {
  if (!record.value || record.value.confirmStatus === '已确认') return
  editId.value = record.value.id
  formMode.value = record.value.registrationType === '工单登记' ? 'workorder' : 'quick'
  formOpen.value = true
}

function handleConfirm() {
  if (!record.value) return
  const res = confirmQuickReport(record.value.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(res.message)
  reload()
}

function handleDelete() {
  if (!record.value) return
  Modal.confirm({
    title: '确认删除该登记记录？',
    okType: 'danger',
    onOk: () => {
      const res = deleteQuickReport(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(res.message)
      handleBack()
    },
  })
}

function onFormSaved() {
  formOpen.value = false
  editId.value = ''
  reload()
}
</script>

<style lang="less" scoped>
.report-work-detail-page {
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
    flex-wrap: wrap;
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

  .overall-alert {
    margin-bottom: 12px;
  }

  .wage-summary-wrap {
    margin-top: 12px;
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
