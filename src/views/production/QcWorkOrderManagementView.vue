<template>
  <div class="work-order-page">
    <!-- 筛选区 -->
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[8, 6]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="工单编号">
              <a-input v-model:value="filters.code" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="工单名称">
              <a-input v-model:value="filters.name" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="销售订单号">
              <a-input
                v-model:value="filters.salesOrderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="全部"
                size="small"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="执行状态">
              <a-select
                v-model:value="filters.execStatus"
                allow-clear
                placeholder="全部"
                size="small"
                :options="execStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="工单类别">
              <a-select
                v-model:value="filters.orderCategory"
                allow-clear
                placeholder="全部"
                size="small"
                :options="categoryOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="工作中心">
              <a-select
                v-model:value="filters.workCenter"
                allow-clear
                placeholder="全部"
                size="small"
                :options="workCenterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <div class="filter-footer">
              <a-space :size="8">
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  查询
                </a-button>
                <a-button size="small" @click="handleReset">
                  <ReloadOutlined />
                  重置
                </a-button>
              </a-space>
              <a-space :size="8">
                <a-button type="primary" size="small" @click="openCreateModal">
                  <PlusOutlined />
                  新增工单
                </a-button>
                <a-dropdown>
                  <a-button size="small">
                    批量操作
                    <DownOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="onBatchMenu">
                      <a-menu-item key="import">批量导入</a-menu-item>
                      <a-menu-item key="export">批量导出</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
                <a-button class="batch-dispatch-btn" size="small" @click="handleBatchDispatch">
                  批量下发
                </a-button>
              </a-space>
            </div>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <!-- 列表 + 全宽详情 -->
    <div class="work-order-main">
      <WorkOrderTableLayout
        :data-source="pagedOrders"
        :total="filteredOrders.length"
        :pagination="pagination"
        :selected-ids="selectedIds"
        :active-id="selectedId"
        @refresh="handleSearch"
        @select="onTableRowSelect"
        @action="handleTableAction"
        @update:pagination="onTablePaginationUpdate"
        @update:selected-ids="onSelectedIdsUpdate"
      />

      <div v-if="selectedOrder" class="detail-card detail-card-below">
        <WorkOrderDetailPanel
          variant="qc"
          :work-order-id="selectedOrder.id"
          v-model:detail-tab="detailTab"
          v-model:detail-collapsed="detailCollapsed"
          :show-dispatch-tab="showDispatchTab"
          :plan-date-value="planDateValue"
          :work-center-opts="workCenterOpts"
          :warehouse-opts="warehouseOpts"
          :urgency-opts="urgencyOpts"
          :bom-opts="bomOpts"
          @save-basic="saveBasicInfo"
          @plan-date-change="onPlanDateChange"
          @dispatch="handleDispatch"
          @cancel-dispatch="handleDispatchCancel"
          @detail-action="onDetailAction"
        />
      </div>

      <div v-else class="detail-card detail-card-below detail-empty">
        <a-empty description="请点击上方列表中的工单查看详情" />
      </div>
    </div>

    <CreateQcWorkOrderModal
      v-model:open="createModalOpen"
      :edit-record="editRecord"
      @created="onWorkOrderCreated"
      @updated="onWorkOrderUpdated"
    />

    <a-modal v-model:open="urgencyModalOpen" title="调整紧急度" width="400px" @ok="confirmUrgency">
      <a-select v-model:value="urgencyDraft" style="width: 100%" :options="urgencyOpts" />
    </a-modal>
  </div>
</template>

<script>
export default { name: 'QcWorkOrderManagementView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { DownOutlined, PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import {
  qcWorkOrderState,
  filterQcWorkOrders,
  updateQcWorkOrder,
  addQcWorkOrder,
  deleteQcWorkOrder,
  cloneQcWorkOrder,
  canShowQcDispatchTab,
} from '@/store/qcWorkOrderStore'
import { workCenterOptions, warehouseOptions, urgencyOptions } from '@/mock/workOrderOptions'
import { bomOptions } from '@/mock/workOrderMaster'
import CreateQcWorkOrderModal from './components/CreateQcWorkOrderModal.vue'
import WorkOrderDetailPanel from './components/WorkOrderDetailPanel.vue'
import WorkOrderTableLayout from './components/WorkOrderTableLayout.vue'

const statusOptions = ['待下发', '已下发', '执行中', '完成', '暂停', '终止']
const execStatusOptions = ['未开始', '执行中', '已完成', '暂停']
const categoryOptions = ['质检工单']

const filters = reactive({
  code: '',
  name: '',
  salesOrderNo: '',
  status: undefined,
  execStatus: undefined,
  orderCategory: undefined,
  workCenter: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedId = ref(qcWorkOrderState.orders[0]?.id || null)
const selectedIds = ref([])
const detailTab = ref('dispatch')
const detailCollapsed = ref(false)
const createModalOpen = ref(false)
const editRecord = ref(null)
const urgencyModalOpen = ref(false)
const urgencyDraft = ref('普通')
const urgencyTargetId = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const statusOpts = statusOptions.map((v) => ({ label: v, value: v }))
const execStatusOpts = execStatusOptions.map((v) => ({ label: v, value: v }))
const categoryOpts = categoryOptions.map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = warehouseOptions.map((v) => ({ label: v, value: v }))
const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const bomOpts = bomOptions.map((v) => ({ label: v, value: v }))

const filteredOrders = computed(() => filterQcWorkOrders(qcWorkOrderState.orders, appliedFilters.value))

const pagedOrders = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})

const selectedOrder = computed(() => qcWorkOrderState.orders.find((o) => o.id === selectedId.value))

const showDispatchTab = computed(() =>
  selectedOrder.value ? canShowQcDispatchTab(selectedOrder.value.status) : false,
)

const planDateValue = computed({
  get() {
    const range = selectedOrder.value?.planDateRange
    if (!range?.length) return null
    return [dayjs(range[0]), dayjs(range[1])]
  },
  set() {},
})

watch(selectedOrder, (wo) => {
  if (!wo) return
  if (!canShowQcDispatchTab(wo.status) && detailTab.value === 'dispatch') {
    detailTab.value = 'detail'
  } else if (canShowQcDispatchTab(wo.status)) {
    detailTab.value = 'dispatch'
  }
})

watch(filteredOrders, (list) => {
  if (!list.find((o) => o.id === selectedId.value)) {
    selectedId.value = list[0]?.id || null
  }
})

function onTableRowSelect(id) {
  selectedId.value = id
}

function handleTableAction(key, wo) {
  if (key === 'dispatch') {
    selectedId.value = wo.id
    detailTab.value = 'dispatch'
    return
  }
  onOrderAction(key, wo)
}

function onTablePaginationUpdate(next) {
  pagination.current = next.current
  pagination.pageSize = next.pageSize
}

function onSelectedIdsUpdate(ids) {
  selectedIds.value = ids
}

function openCreateModal() {
  editRecord.value = null
  createModalOpen.value = true
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.code = ''
  filters.name = ''
  filters.salesOrderNo = ''
  filters.status = undefined
  filters.execStatus = undefined
  filters.orderCategory = undefined
  filters.workCenter = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function saveBasicInfo() {
  if (!selectedOrder.value) return
  updateQcWorkOrder(selectedOrder.value.id, { ...selectedOrder.value })
}

function onPlanDateChange(dates) {
  if (!selectedOrder.value) return
  if (dates?.length === 2) {
    selectedOrder.value.planDateRange = [
      dates[0].format('YYYY-MM-DD'),
      dates[1].format('YYYY-MM-DD'),
    ]
  } else {
    selectedOrder.value.planDateRange = []
  }
  saveBasicInfo()
}

function onWorkOrderCreated(wo) {
  addQcWorkOrder(wo)
  selectedId.value = wo.id
  detailTab.value = 'dispatch'
}

function onWorkOrderUpdated({ id, patch }) {
  updateQcWorkOrder(id, patch)
  const wo = qcWorkOrderState.orders.find((o) => o.id === id)
  if (selectedId.value === id && wo) {
    if (!canShowQcDispatchTab(wo.status) && detailTab.value === 'dispatch') {
      detailTab.value = 'detail'
    }
  }
}

function validateProcesses(processes) {
  const missing = processes.filter((p) => !p.executors?.length)
  if (missing.length) {
    message.error(`请为工序「${missing.map((p) => p.name).join('、')}」选择执行人`)
    return false
  }
  return true
}

function handleDispatch(startAfter) {
  const wo = selectedOrder.value
  if (!wo || !validateProcesses(wo.processes)) return
  updateQcWorkOrder(wo.id, {
    processes: wo.processes,
    status: startAfter ? '执行中' : '已下发',
    execStatus: startAfter ? '执行中' : wo.execStatus,
  })
  message.success(startAfter ? '质检工单已下发并开始执行' : '质检工单已下发')
  if (!startAfter) detailTab.value = 'detail'
}

function handleDispatchCancel() {
  message.info('已取消本次编辑')
}

function handleBatchDispatch() {
  if (!selectedIds.value.length) {
    message.warning('请勾选要下发的工单')
    return
  }
  const targets = qcWorkOrderState.orders.filter(
    (o) => selectedIds.value.includes(o.id) && o.status === '待下发',
  )
  if (!targets.length) {
    message.warning('所选工单中没有状态为「待下发」的可下发项')
    return
  }
  for (const wo of targets) {
    if (!validateProcesses(wo.processes)) return
    updateQcWorkOrder(wo.id, { status: '已下发' })
  }
  message.success(`已批量下发 ${targets.length} 条工单`)
  selectedIds.value = []
}

function handleBatchExport() {
  if (!selectedIds.value.length) {
    message.warning('请勾选要导出的工单')
    return
  }
  const data = qcWorkOrderState.orders.filter((o) => selectedIds.value.includes(o.id))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `qc-work-orders-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  link.click()
  URL.revokeObjectURL(url)
  message.success(`已导出 ${data.length} 条工单`)
}

function onBatchMenu({ key }) {
  if (key === 'import') message.info('批量导入功能开发中')
  else if (key === 'export') handleBatchExport()
}

function onOrderAction(key, wo) {
  if (key === 'edit') {
    editRecord.value = wo
    createModalOpen.value = true
    return
  }
  if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除工单「${wo.code}」吗？此操作不可恢复。`,
      okType: 'danger',
      onOk: () => {
        deleteQcWorkOrder(wo.id)
        selectedIds.value = selectedIds.value.filter((id) => id !== wo.id)
        if (selectedId.value === wo.id) {
          selectedId.value = qcWorkOrderState.orders[0]?.id || null
        }
        message.success('工单已删除')
      },
    })
    return
  }
  if (key === 'clone') {
    const cloned = cloneQcWorkOrder(wo.id)
    if (cloned) {
      selectedId.value = cloned.id
      detailTab.value = 'dispatch'
      message.success('工单已克隆')
    }
    return
  }
  if (key === 'urgency') {
    urgencyTargetId.value = wo.id
    urgencyDraft.value = wo.urgency
    urgencyModalOpen.value = true
    return
  }
  const map = { pause: '暂停', terminate: '终止', complete: '完成' }
  if (map[key]) {
    const patch = { status: map[key] }
    if (key === 'pause') patch.execStatus = '暂停'
    if (key === 'complete') patch.execStatus = '已完成'
    updateQcWorkOrder(wo.id, patch)
    message.success(`质检工单已${map[key]}`)
  }
}

function confirmUrgency() {
  if (urgencyTargetId.value) {
    updateQcWorkOrder(urgencyTargetId.value, { urgency: urgencyDraft.value })
    message.success('紧急度已调整')
  }
  urgencyModalOpen.value = false
}

function onDetailAction({ key, workOrder: wo }) {
  if (!wo) return
  if (key === 'schedule-qty') {
    message.info('修改排产数量功能开发中')
    return
  }
  onOrderAction(key, wo)
}
</script>

<style lang="less" scoped>
.work-order-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.detail-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.work-order-main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-card {
  padding: 8px 12px 6px;
  margin-bottom: 8px;
}

.filter-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 2px;

  .batch-dispatch-btn {
    color: #d48806;
    border-color: #ffd591;
    background: #fff7e6;

    &:hover {
      color: #fa8c16;
      border-color: #ffc069;
      background: #fff1d6;
    }
  }
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-inline-end: 0;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;

      &::after {
        margin-inline: 2px 6px;
      }
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.ant-form-item-control-input),
  :deep(.ant-form-item-control-input-content) {
    width: 100%;
  }

  :deep(.ant-input),
  :deep(.ant-select),
  :deep(.ant-picker),
  :deep(.ant-input-affix-wrapper) {
    width: 100%;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
    }

    :deep(.ant-form-item-control) {
      flex: 1;
    }
  }
}

.filter-form {
  :deep(.ant-form-item-label > label) {
    color: rgba(0, 0, 0, 0.65);
  }
}

.detail-card-below {
  padding: 8px 12px 10px;
}

.detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

@media (max-width: 992px) {
  .filter-footer {
    flex-direction: column;
    align-items: stretch;

    > .ant-space {
      justify-content: flex-start;
    }
  }
}
</style>
