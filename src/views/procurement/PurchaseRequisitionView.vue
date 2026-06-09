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
            <a-form-item label="操作人">
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
        <a-button type="primary" size="small" @click="openCreateModal">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleInvalidate">
          <StopOutlined />
          作废
        </a-button>
        <a-button size="small" @click="handleBatchDelete">
          <DeleteOutlined />
          删除
        </a-button>
        <a-button size="small" @click="openGenerateModal()">
          <CheckCircleOutlined />
          批量生成采购单
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
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.reqNo }}</a>
          </template>
          <template v-else-if="column.key === 'plannedQty'">
            {{ formatQty(record.plannedQty) }}
          </template>
          <template v-else-if="column.key === 'amountWan'">
            {{ formatQty(record.amountWan) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="canGeneratePO(record)" :size="0">
              <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record)"
                >删除</a-button
              >
              <a-button type="link" size="small" @click="openGenerateModal(record)">
                <CheckCircleOutlined />
                生成采购单
              </a-button>
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

    <CreatePurchaseRequisitionModal
      v-model:open="createModalOpen"
      :edit-record="editRecord"
      @saved="onSaved"
    />

    <GeneratePurchaseOrderModal
      v-model:open="generateModalOpen"
      :requisitions="generateTargets"
      @generated="onGenerated"
    />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'PurchaseRequisitionView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  StopOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons-vue'
import { filterPurchaseRequisitions } from '@/mock/purchaseRequisitions'
import {
  purchaseRequisitionState,
  addPurchaseRequisition,
  updatePurchaseRequisition,
  deletePurchaseRequisition,
  invalidatePurchaseRequisition,
  getRequisitionsByIds,
  canGeneratePO,
} from '@/store/purchaseRequisitionStore'
import {
  urgencyOptions,
  docStatusOptions,
  overdueStatusOptions,
  operatorOptions,
} from '@/mock/purchaseRequisitionOptions'
import CreatePurchaseRequisitionModal from './components/CreatePurchaseRequisitionModal.vue'
import GeneratePurchaseOrderModal from './components/GeneratePurchaseOrderModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const router = useRouter()

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
const createModalOpen = ref(false)
const generateModalOpen = ref(false)
const editRecord = ref(null)
const generateTargets = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const docStatusOpts = docStatusOptions.map((v) => ({ label: v, value: v }))
const overdueOpts = overdueStatusOptions.map((v) => ({ label: v, value: v }))
const operatorOpts = operatorOptions.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '单据状态', key: 'docStatus', width: 90, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', dataIndex: 'reqNo', width: 160, fixed: 'left' },
  { title: '逾期状态', key: 'overdueStatus', width: 90 },
  { title: '紧急度', dataIndex: 'urgency', width: 80 },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '采购单号', dataIndex: 'purchaseOrderNo', width: 140, ellipsis: true },
  { title: '计划数量', key: 'plannedQty', width: 100, align: 'right' },
  { title: '万元', key: 'amountWan', width: 90, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '预计到货日期', dataIndex: 'estimatedArrivalDate', width: 120 },
  { title: '来源', dataIndex: 'source', width: 90 },
  { title: '更新时间', dataIndex: 'updatedAt', width: 140 },
  { title: '操作人', dataIndex: 'operator', width: 90 },
  { title: '创建时间', dataIndex: 'createdAt', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '操作', key: 'action', width: 200, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-req-list', baseColumns)

const filteredList = computed(() => {
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
  return filterPurchaseRequisitions(purchaseRequisitionState.requisitions, f)
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
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function formatQty(val) {
  return Number(val || 0).toFixed(4)
}

function docStatusColor(status) {
  const map = {
    待处理: 'processing',
    处理中: 'warning',
    处理完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function openDetail(record) {
  const { href } = router.resolve({
    name: 'procurement-purchase-req-detail',
    params: { id: record.id },
  })
  window.open(href, '_blank')
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

function openCreateModal() {
  editRecord.value = null
  createModalOpen.value = true
}

function openEditModal(record) {
  if (!canGeneratePO(record)) {
    message.warning('处理完成的申请单不可编辑')
    return
  }
  editRecord.value = record
  createModalOpen.value = true
}

function openGenerateModal(record) {
  const ids = record ? [record.id] : selectedRowKeys.value
  if (!ids.length) {
    message.warning('请至少选择一条采购申请')
    return
  }
  const targets = getRequisitionsByIds(ids).filter(canGeneratePO)
  if (!targets.length) {
    message.warning('所选申请单均已处理完成或已作废，无法生成采购单')
    return
  }
  if (targets.length < ids.length) {
    message.info(`已过滤 ${ids.length - targets.length} 条不可生成的申请单`)
  }
  generateTargets.value = targets
  generateModalOpen.value = true
}

function onSaved({ isEdit, id, data }) {
  if (isEdit) {
    updatePurchaseRequisition(id, data)
  } else {
    addPurchaseRequisition({ ...data, id: `pr-${Date.now()}` })
  }
}

function onGenerated() {
  selectedRowKeys.value = []
}

function confirmDelete(record) {
  if (!canGeneratePO(record)) {
    message.warning('处理完成的申请单不可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除采购申请「${record.reqNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      deletePurchaseRequisition(record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的申请单')
    return
  }
  const targets = getRequisitionsByIds(selectedRowKeys.value).filter(canGeneratePO)
  if (!targets.length) {
    message.warning('所选申请单均不可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除选中的 ${targets.length} 条采购申请吗？`,
    okType: 'danger',
    onOk: () => {
      targets.forEach((r) => deletePurchaseRequisition(r.id))
      selectedRowKeys.value = []
      message.success('已删除')
    },
  })
}

function handleInvalidate() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要作废的申请单')
    return
  }
  const targets = getRequisitionsByIds(selectedRowKeys.value).filter(canGeneratePO)
  if (!targets.length) {
    message.warning('所选申请单均不可作废')
    return
  }
  targets.forEach((r) => invalidatePurchaseRequisition(r.id))
  message.success(`已作废 ${targets.length} 条申请单`)
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
