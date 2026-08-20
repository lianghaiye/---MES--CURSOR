<template>
  <div class="purchase-req-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="filters.reqNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售单号">
              <a-input
                v-model:value="filters.salesOrderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="紧急度">
              <a-select
                v-model:value="filters.urgency"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="urgencyOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="单据状态">
              <a-select
                v-model:value="filters.docStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="docStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="订单日期">
              <a-range-picker
                v-model:value="filters.orderDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="交货日期">
              <a-range-picker
                v-model:value="filters.deliveryDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="逾期状态">
              <a-select
                v-model:value="filters.overdueStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="overdueOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="更新人">
              <a-select
                v-model:value="filters.operator"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="operatorOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleComplete">
          <CheckOutlined />
          完成
        </a-button>
        <a-button size="small" @click="handleInvalidate">
          <StopOutlined />
          作废
        </a-button>
        <a-button size="small" @click="openGenerateModal()">
          <CheckCircleOutlined />
          批量生成采购单
        </a-button>
        <a-button size="small" @click="openPrintModal">
          <PrinterOutlined />
          打印采购申请明细
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredList.length }} 条数据，总计采购数量：{{ summary.plannedQty.toFixed(4) }}。
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'docStatus'">
            <a-tag :color="docStatusColor(record.docStatus)">{{ record.docStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'overdueStatus'">
            <span :class="{ overdue: record.overdueStatus === '已逾期' }">
              {{ record.overdueStatus }}
            </span>
          </template>
          <template v-else-if="column.key === 'reqNo'">
            <template v-if="record.isGeneratePoDraft">
              <span class="draft-req-nos">{{ record.reqNo || '—' }}</span>
            </template>
            <template v-else>
              <a class="link-code" @click.prevent="openDetail(record)">{{ record.reqNo }}</a>
            </template>
          </template>
          <template v-else-if="column.key === 'purchaseOrderNo'">
            <template v-if="record.isGeneratePoDraft || draftOrderNo(record)">
              <span class="draft-po-no">{{
                record.isGeneratePoDraft ? record.purchaseOrderNo : draftOrderNo(record)
              }}</span>
            </template>
            <template v-else>{{ record.purchaseOrderNo || '—' }}</template>
          </template>
          <template v-else-if="column.key === 'plannedQty'">
            {{ formatQty(record.plannedQty) }}
          </template>
          <template v-else-if="column.key === 'amountWan'">
            {{ formatQty(record.amountWan) }}
          </template>
          <template v-else-if="column.key === 'updater'">
            {{ record.updater || record.operator || '—' }}
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDateTimeMinute(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'updatedAt'">
            {{ formatDateTimeMinute(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space
              v-if="record.isGeneratePoDraft || canEditRequisition(record) || canGeneratePO(record)"
              :size="0"
            >
              <template v-if="record.isGeneratePoDraft">
                <a-button type="link" size="small" @click="continuePoDraft(record)">
                  编辑
                </a-button>
                <a-button type="link" size="small" danger @click="handleDeleteDraft(record)">
                  删除
                </a-button>
              </template>
              <template v-else>
                <a-button
                  v-if="canEditRequisition(record)"
                  type="link"
                  size="small"
                  @click="openEdit(record)"
                >
                  编辑
                </a-button>
                <a-button
                  v-if="canGeneratePO(record)"
                  type="link"
                  size="small"
                  @click="openGenerateModal(record)"
                >
                  <CheckCircleOutlined />
                  生成采购单
                </a-button>
              </template>
            </a-space>
            <span v-else class="action-done">-</span>
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <PurchaseRequisitionPrintModal v-model:open="printModalOpen" :requisitions="printTargets" />
  </div>
</template>

<script>
import { formatQty } from '@/utils/numberFormat'
export default { name: 'PurchaseRequisitionView' }
</script>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  PrinterOutlined,
} from '@ant-design/icons-vue'
import { filterPurchaseRequisitions } from '@/mock/purchaseRequisitions'
import {
  purchaseRequisitionState,
  invalidatePurchaseRequisition,
  completePurchaseRequisition,
  canCompletePurchaseRequisition,
  getRequisitionsByIds,
  canGeneratePO,
  isPurchaseRequisitionDraftLocked,
  ensureDemoPurchaseRequisitionCgsq2026060001,
} from '@/store/purchaseRequisitionStore'
import {
  getActiveDraftForRequisition,
  buildGenerateDraftListRows,
  discardGeneratePurchaseOrderDraft,
  reconcilePurchaseRequisitionDraftStatuses,
  purchaseOrderState,
} from '@/store/purchaseOrderStore'
import {
  urgencyOptions,
  docStatusOptions,
  overdueStatusOptions,
  operatorOptions,
} from '@/mock/purchaseRequisitionOptions'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import PurchaseRequisitionPrintModal from './components/PurchaseRequisitionPrintModal.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

const router = useRouter()
const { openTab } = useTabs()

onMounted(() => {
  ensureDemoPurchaseRequisitionCgsq2026060001()
  reconcilePurchaseRequisitionDraftStatuses()
})

const filters = reactive({
  reqNo: '',
  salesOrderNo: '',
  urgency: undefined,
  docStatus: undefined,
  orderDateRange: null,
  deliveryDateRange: null,
  overdueStatus: undefined,
  operator: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const printModalOpen = ref(false)
const printTargets = ref([])

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const docStatusOpts = docStatusOptions.map((v) => ({ label: v, value: v }))
const overdueOpts = overdueStatusOptions.map((v) => ({ label: v, value: v }))
const operatorOpts = operatorOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '单据状态', key: 'docStatus', width: 90, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', dataIndex: 'reqNo', width: 200, fixed: 'left' },
  { title: '逾期状态', key: 'overdueStatus', width: 90 },
  { title: '紧急度', dataIndex: 'urgency', width: 80 },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  {
    title: '采购单号/草稿号',
    key: 'purchaseOrderNo',
    dataIndex: 'purchaseOrderNo',
    width: 160,
    ellipsis: true,
  },
  { title: '计划数量', key: 'plannedQty', width: 100, align: 'right' },
  { title: '万元', key: 'amountWan', width: 90, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '预计到货日期', dataIndex: 'estimatedArrivalDate', width: 120 },
  { title: '业务员', dataIndex: 'salesperson', width: 100 },
  { title: '来源', dataIndex: 'source', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 140 },
  { title: '更新人', key: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 140 },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-req-list-v5', baseColumns)

const filteredList = computed(() => {
  void purchaseOrderState.orders

  const f = { ...appliedFilters.value }
  if (f.orderDateRange?.length === 2) {
    f.orderDateRange = [
      f.orderDateRange[0].format('YYYY-MM-DD'),
      f.orderDateRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.orderDateRange = null
  }
  if (f.deliveryDateRange?.length === 2) {
    f.deliveryDateRange = [
      f.deliveryDateRange[0].format('YYYY-MM-DD'),
      f.deliveryDateRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.deliveryDateRange = null
  }

  const requisitions = filterPurchaseRequisitions(purchaseRequisitionState.requisitions, f)
  const draftRows = buildGenerateDraftListRows().filter((row) => {
    const reqNoQ = String(f.reqNo || '').trim()
    if (reqNoQ) {
      const hitSource = String(row.reqNo || '').includes(reqNoQ)
      const hitDraftNo = String(row.purchaseOrderNo || '').includes(reqNoQ)
      if (!hitSource && !hitDraftNo) return false
    }
    if (f.docStatus && row.docStatus !== f.docStatus) return false
    if (f.salesOrderNo && !String(row.salesOrderNo || '').includes(f.salesOrderNo)) return false
    if (f.operator && row.operator !== f.operator) return false
    return true
  })

  const statusRank = { 草稿: 0, 待处理: 1, 处理中: 2, 处理完成: 3, 已作废: 4 }
  return [...draftRows, ...requisitions].sort((a, b) => {
    const ra = statusRank[a.docStatus] ?? 99
    const rb = statusRank[b.docStatus] ?? 99
    if (ra !== rb) return ra - rb
    const ta = dayjs(a.updatedAt || a.createdAt || a.orderDate).valueOf() || 0
    const tb = dayjs(b.updatedAt || b.createdAt || b.orderDate).valueOf() || 0
    return tb - ta
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const summary = computed(() => ({
  plannedQty: filteredList.value.reduce((s, r) => s + (Number(r.plannedQty) || 0), 0),
}))

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: Boolean(record.isGeneratePoDraft || isPurchaseRequisitionDraftLocked(record)),
  }),
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function docStatusColor(status) {
  const map = {
    草稿: 'purple',
    待处理: 'processing',
    处理中: 'warning',
    处理完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function openDetail(record) {
  if (record?.isGeneratePoDraft) {
    continuePoDraft(record)
    return
  }
  const path = `/procurement/purchase-req/${record.id}`
  openTab(path, `采购申请 ${record.reqNo}`)
  router.push({ name: 'procurement-purchase-req-detail', params: { id: record.id } })
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.reqNo = ''
  filters.salesOrderNo = ''
  filters.urgency = undefined
  filters.docStatus = undefined
  filters.orderDateRange = null
  filters.deliveryDateRange = null
  filters.overdueStatus = undefined
  filters.operator = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function openCreate() {
  const page = findCreatePageByListPath('/procurement/purchase-req')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function draftOrderNo(record) {
  if (record?.isGeneratePoDraft) return record.purchaseOrderNo || ''
  const draft = getActiveDraftForRequisition(record)
  return draft?.orderNo || ''
}

function canEditRequisition(record) {
  return (
    record?.docStatus === '待处理' &&
    !record?.isGeneratePoDraft &&
    !isPurchaseRequisitionDraftLocked(record)
  )
}

function openEdit(record) {
  if (!canEditRequisition(record)) {
    message.warning('仅待处理的申请单可编辑')
    return
  }
  openCreateTab(router, openTab, {
    path: `/procurement/purchase-req/${record.id}/edit`,
    title: `编辑采购申请 ${record.reqNo || ''}`.trim(),
  })
}

function continuePoDraft(record) {
  const draftId = record?.isGeneratePoDraft
    ? record.generateDraftId || record.id
    : getActiveDraftForRequisition(record)?.id
  if (!draftId) {
    message.warning('未找到关联草稿')
    return
  }
  const path = `/procurement/purchase-req/generate-po?draftId=${draftId}`
  openTab(path, '生成采购订单')
  router.push(path)
}

function handleDeleteDraft(record) {
  const draftId = record?.isGeneratePoDraft
    ? record.generateDraftId || record.id
    : getActiveDraftForRequisition(record)?.id
  if (!draftId) {
    message.warning('未找到关联草稿')
    return
  }
  const sourceLabel = record.isGeneratePoDraft
    ? record.reqNo || record.sourceReqNos || '所选来源申请'
    : record.reqNo
  Modal.confirm({
    title: '删除草稿',
    content: `确定删除生成草稿吗？删除后来源申请（${sourceLabel}）可重新编辑、生成采购单、作废或完成。`,
    okText: '删除',
    okType: 'danger',
    onOk: () => {
      discardGeneratePurchaseOrderDraft(draftId)
      message.success('草稿已删除')
    },
  })
}

function openGenerateModal(record) {
  const ids = record
    ? [record.id]
    : selectedRowKeys.value.filter((id) => {
        const row = filteredList.value.find((r) => r.id === id)
        return row && !row.isGeneratePoDraft
      })
  if (!ids.length) {
    message.warning('请至少选择一条采购申请')
    return
  }
  const locked = getRequisitionsByIds(ids).filter(isPurchaseRequisitionDraftLocked)
  if (locked.length) {
    Modal.confirm({
      title: '来源申请已有生成草稿',
      content: `${locked.map((r) => r.reqNo).join('、')} 已关联生成草稿（状态：处理中）。请先编辑或删除对应草稿后再操作。`,
      okText: '打开草稿',
      onOk: () => {
        const draft = getActiveDraftForRequisition(locked[0])
        if (draft)
          continuePoDraft({ isGeneratePoDraft: true, id: draft.id, generateDraftId: draft.id })
      },
    })
    return
  }
  const targets = getRequisitionsByIds(ids).filter(canGeneratePO)
  if (!targets.length) {
    message.warning('所选申请单均已处理完成、已作废或不可生成采购单')
    return
  }
  if (targets.length < ids.length) {
    message.info(`已过滤 ${ids.length - targets.length} 条不可生成的申请单`)
  }

  const path = `/procurement/purchase-req/generate-po?ids=${targets.map((t) => t.id).join(',')}`
  openTab(path, '生成采购订单')
  router.push(path)
}

function handleComplete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要完成的申请单')
    return
  }
  const targets = getRequisitionsByIds(selectedRowKeys.value).filter(canCompletePurchaseRequisition)
  if (!targets.length) {
    message.warning('仅待处理 / 处理中的申请单可完成')
    return
  }
  Modal.confirm({
    title: '确认完成',
    content: `确定将选中的 ${targets.length} 条采购申请标记为处理完成吗？`,
    onOk: () => {
      targets.forEach((r) => completePurchaseRequisition(r.id))
      selectedRowKeys.value = []
      message.success(`已完成 ${targets.length} 条申请单`)
    },
  })
}

function openPrintModal() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要打印的采购申请')
    return
  }
  const targets = getRequisitionsByIds(selectedRowKeys.value).filter((r) => !r.isGeneratePoDraft)
  if (!targets.length) {
    message.warning('未找到可打印的采购申请（草稿行不可打印）')
    return
  }
  printTargets.value = targets
  printModalOpen.value = true
}

function handleInvalidate() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要作废的申请单')
    return
  }
  const targets = getRequisitionsByIds(selectedRowKeys.value).filter(
    (r) => r.docStatus !== '已作废' && r.docStatus !== '处理完成',
  )
  if (!targets.length) {
    message.warning('所选申请单均不可作废')
    return
  }
  Modal.confirm({
    title: '确认作废',
    content: `确定作废选中的 ${targets.length} 条采购申请吗？`,
    onOk: () => {
      targets.forEach((r) => invalidatePurchaseRequisition(r.id))
      selectedRowKeys.value = []
      message.success(`已作废 ${targets.length} 条申请单`)
    },
  })
}
</script>

<style lang="less" scoped>
.purchase-req-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-bar {
  margin-bottom: 8px;
  padding: 6px 12px;

  :deep(.ant-alert-message) {
    font-size: 13px;
  }
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

.muted-dash {
  color: rgba(0, 0, 0, 0.25);
}

.draft-req-nos {
  color: rgba(0, 0, 0, 0.88);
}

.draft-po-no {
  color: #722ed1;
  font-weight: 500;
}

.overdue {
  color: #ff4d4f;
}

.action-done {
  color: rgba(0, 0, 0, 0.25);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
