<template>
  <div class="material-req-page">
    <div class="filter-card">
      <a-form layout="inline" class="filter-form" :model="filters">
        <a-form-item label="申请单号">
          <a-input
            v-model:value="filters.reqNo"
            allow-clear
            placeholder="搜索申请单号"
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="申请状态">
          <a-select
            v-model:value="filters.auditStatus"
            allow-clear
            placeholder="全部"
            :options="auditStatusOptions"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="领料方式">
          <a-select
            v-model:value="filters.mode"
            allow-clear
            placeholder="全部"
            :options="modeOptions"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="出库状态">
          <a-select
            v-model:value="filters.outboundStatus"
            allow-clear
            placeholder="全部"
            :options="statusOptions"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="工单号">
          <a-input
            v-model:value="filters.workOrderNo"
            allow-clear
            placeholder="关联工单"
            style="width: 160px"
          />
        </a-form-item>
        <a-form-item label="申请人">
          <a-input
            v-model:value="filters.applicant"
            allow-clear
            placeholder="申请人"
            style="width: 120px"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">搜索</a-button>
            <a-button @click="handleReset">清空</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-card">
      <div class="table-toolbar">
        <a-space>
          <a-button type="primary" @click="goCreate">申请领料</a-button>
          <a-button @click="handleRefresh">刷新</a-button>
          <a-button @click="openExportModal">导出</a-button>
        </a-space>
      </div>

      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="middle"
        :pagination="false"
        :scroll="{ x: 1200 }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'auditStatus'">
            <a-tag :color="auditColor(record.auditStatus)">{{ record.auditStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'outboundStatus'">
            <a-badge :status="statusBadge(record.outboundStatus)" :text="record.outboundStatus" />
          </template>
          <template v-else-if="column.key === 'reqNo'">
            <a @click="goDetail(record)">{{ record.reqNo }}</a>
          </template>
          <template v-else-if="column.key === 'mode'">
            <a-tag :color="modeColor(record.mode)">{{ record.modeLabel }}</a-tag>
          </template>
          <template v-else-if="column.key === 'workOrder'">
            <span :title="relatedWorkOrderText(record)">{{
              truncate(relatedWorkOrderText(record), 28)
            }}</span>
          </template>
          <template v-else-if="column.key === 'product'">
            <span :title="relatedProductText(record)">{{
              truncate(relatedProductText(record), 24)
            }}</span>
          </template>
          <template v-else-if="column.key === 'outboundDocNo'">
            <a v-if="record.outboundDocNo" @click="goOutbound(record)">
              {{ record.outboundDocNo }}
            </a>
            <span v-else class="muted">—</span>
          </template>
          <template v-else-if="column.key === 'qty'">
            {{ record.lineCount || 0 }} 行 / {{ record.totalQty || 0 }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="4">
              <a-button type="link" size="small" @click="goDetail(record)">详情</a-button>
              <template v-if="record.auditStatus === MATERIAL_REQ_AUDIT.PENDING">
                <a-button type="link" size="small" @click="onApprove(record)">通过</a-button>
                <a-button type="link" size="small" danger @click="onReject(record)">驳回</a-button>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>

      <div class="table-footer">
        <span class="page-summary">
          共 {{ filteredList.length }} 条
          <template v-if="selectedRowKeys.length">（已选 {{ selectedRowKeys.length }}）</template>
        </span>
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50']"
        />
      </div>
    </div>

    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="exportRowCount"
      :selected-count="selectedExportRowCount"
      @export="doExport"
    />
  </div>
</template>

<script>
export default { name: 'MaterialRequisitionManagementView' }
</script>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  listMobileMaterialReqs,
  refreshMobileMaterialReqs,
  relatedWorkOrderText,
  relatedProductText,
  approveMaterialRequisition,
  rejectMaterialRequisition,
  MATERIAL_REQ_MODES,
  MATERIAL_REQ_AUDIT,
  MATERIAL_REQ_AUDIT_OPTIONS,
  isMaterialOutboundSkipApproval,
} from '@/store/mobileMaterialReqStore'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useListExport } from '@/composables/useListExport'
import {
  flattenMaterialRequisitionRows,
  materialRequisitionExportFields,
} from '@/utils/exportFields/materialRequisitionExport'

const router = useRouter()

const filters = reactive({
  reqNo: '',
  mode: undefined,
  auditStatus: undefined,
  outboundStatus: undefined,
  workOrderNo: '',
  applicant: '',
})

const applied = reactive({ ...filters })

const pagination = reactive({
  current: 1,
  pageSize: 10,
})

const selectedRowKeys = ref([])

const modeOptions = [
  { label: '批量领料', value: MATERIAL_REQ_MODES.BATCH },
  { label: '工单领料', value: MATERIAL_REQ_MODES.WORK_ORDER },
  { label: '快速领料', value: MATERIAL_REQ_MODES.QUICK },
]

const auditStatusOptions = MATERIAL_REQ_AUDIT_OPTIONS

const statusOptions = computed(() => {
  const base = [
    { label: '待出库', value: '待出库' },
    { label: '已出库', value: '已出库' },
    { label: '已拒绝', value: '已拒绝' },
  ]
  if (!isMaterialOutboundSkipApproval()) {
    base.unshift({ label: '待处理', value: '待处理' })
  }
  return base
})

const columns = [
  { title: '申请状态', key: 'auditStatus', width: 110, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', width: 150, fixed: 'left' },
  { title: '领料方式', key: 'mode', width: 110 },
  { title: '关联工单', key: 'workOrder', width: 180, ellipsis: true },
  { title: '产品/摘要', key: 'product', width: 160, ellipsis: true },
  { title: '领用车间', dataIndex: 'workshop', key: 'workshop', width: 110 },
  { title: '出库单号', key: 'outboundDocNo', width: 150 },
  { title: '出库状态', key: 'outboundStatus', width: 110 },
  { title: '申请人', dataIndex: 'applicant', key: 'applicant', width: 90 },
  { title: '申请时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '数量', key: 'qty', width: 110 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' },
]

const allList = computed(() => listMobileMaterialReqs())

const filteredList = computed(() => {
  const reqNo = applied.reqNo.trim().toLowerCase()
  const wo = applied.workOrderNo.trim().toLowerCase()
  const applicant = applied.applicant.trim().toLowerCase()
  return allList.value.filter((r) => {
    if (
      reqNo &&
      !String(r.reqNo || '')
        .toLowerCase()
        .includes(reqNo)
    )
      return false
    if (applied.mode && r.mode !== applied.mode) return false
    if (applied.auditStatus && r.auditStatus !== applied.auditStatus) return false
    if (applied.outboundStatus && r.outboundStatus !== applied.outboundStatus) return false
    if (
      applicant &&
      !String(r.applicant || '')
        .toLowerCase()
        .includes(applicant)
    )
      return false
    if (wo) {
      const text = `${relatedWorkOrderText(r)} ${r.workOrderCode || ''} ${(r.workOrders || [])
        .map((w) => w.code)
        .join(' ')}`.toLowerCase()
      if (!text.includes(wo)) return false
    }
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const exportFlatRows = computed(() =>
  flattenMaterialRequisitionRows(filteredList.value, {
    relatedWorkOrderText,
    relatedProductText,
  }),
)
const selectedExportFlatRows = computed(() =>
  flattenMaterialRequisitionRows(
    allList.value.filter((r) => selectedRowKeys.value.includes(r.id)),
    { relatedWorkOrderText, relatedProductText },
  ),
)
const exportRowCount = computed(() => exportFlatRows.value.length)
const selectedExportRowCount = computed(() => selectedExportFlatRows.value.length)

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'production-material-requisition-list-v2',
  fieldDefinitions: materialRequisitionExportFields,
  getFilteredRows: () => exportFlatRows.value,
  getSelectedRows: () => selectedExportFlatRows.value,
  fileNamePrefix: '领料申请明细',
  sheetName: '领料物料明细',
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

watch(
  () => [
    applied.reqNo,
    applied.mode,
    applied.auditStatus,
    applied.outboundStatus,
    applied.workOrderNo,
    applied.applicant,
  ],
  () => {
    pagination.current = 1
    selectedRowKeys.value = []
  },
)

onMounted(() => {
  refreshMobileMaterialReqs()
})

function handleSearch() {
  Object.assign(applied, { ...filters })
}

function handleReset() {
  filters.reqNo = ''
  filters.mode = undefined
  filters.auditStatus = undefined
  filters.outboundStatus = undefined
  filters.workOrderNo = ''
  filters.applicant = ''
  Object.assign(applied, { ...filters })
}

function handleRefresh() {
  refreshMobileMaterialReqs()
  message.success('已刷新')
}

function goCreate() {
  router.push('/production/material-requisition/create')
}

function goDetail(record) {
  router.push(`/production/material-requisition/${record.id}`)
}

function goOutbound(record) {
  if (!record.outboundId) {
    message.info('暂无关联出库单')
    return
  }
  router.push(`/inventory/outbound/${record.outboundId}`)
}

function onApprove(record) {
  Modal.confirm({
    title: '审核通过',
    content: `确认通过申请单 ${record.reqNo}？通过后将生成领料出库单。`,
    onOk() {
      const res = approveMaterialRequisition(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(`已通过，出库单 ${res.record.outboundDocNo || ''}`)
    },
  })
}

function onReject(record) {
  Modal.confirm({
    title: '审核驳回',
    content: `确认驳回申请单 ${record.reqNo}？`,
    okType: 'danger',
    onOk() {
      const res = rejectMaterialRequisition(record.id, '')
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已驳回')
    },
  })
}

function modeColor(mode) {
  if (mode === MATERIAL_REQ_MODES.QUICK) return 'purple'
  if (mode === MATERIAL_REQ_MODES.BATCH) return 'blue'
  return 'cyan'
}

function auditColor(status) {
  if (status === MATERIAL_REQ_AUDIT.APPROVED) return 'success'
  if (status === MATERIAL_REQ_AUDIT.REJECTED) return 'error'
  return 'warning'
}

function statusBadge(status) {
  const map = {
    待处理: 'warning',
    待出库: 'processing',
    已出库: 'success',
    已拒绝: 'error',
    拒绝领料: 'error',
  }
  return map[status] || 'default'
}

function truncate(text, max) {
  const s = String(text || '')
  if (s.length <= max) return s
  return `${s.slice(0, max)}…`
}
</script>

<style lang="less" scoped>
.material-req-page {
  padding: 0;
}

.filter-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 4px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 16px;
  border: 1px solid #f0f0f0;
}

.table-toolbar {
  margin-bottom: 12px;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 12px;
}

.page-summary {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
