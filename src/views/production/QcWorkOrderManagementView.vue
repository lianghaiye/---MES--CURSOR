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

    <!-- 主从布局 / 列表布局 -->
    <div v-if="layoutMode === 'split'" class="master-detail">
      <!-- 左侧工单列表 -->
      <div class="list-card">
        <div class="list-title-row">
          <a-checkbox
            :checked="allPageSelected"
            :indeterminate="pageIndeterminate"
            @change="onToggleSelectAllPage"
          />
          <span class="list-title">工单列表</span>
          <span v-if="selectedIds.length" class="selected-count"
            >已选 {{ selectedIds.length }}</span
          >
          <a-tooltip title="切换为列表视图">
            <a-button type="text" size="small" class="layout-toggle-btn" @click="toggleLayout">
              <TableOutlined />
            </a-button>
          </a-tooltip>
        </div>
        <div class="list-body">
          <div
            v-for="wo in pagedOrders"
            :key="wo.id"
            class="order-card"
            :class="{ active: selectedId === wo.id, checked: selectedIds.includes(wo.id) }"
            @click="selectOrder(wo.id)"
          >
            <a-checkbox
              class="card-checkbox"
              :checked="selectedIds.includes(wo.id)"
              @click.stop
              @change="(e) => toggleSelect(wo.id, e.target.checked)"
            />
            <div class="card-content">
              <div class="card-head">
                <a-space :size="4" wrap class="card-tags-row">
                  <a-tag :color="statusColor(wo.status)" class="status-tag">{{ wo.status }}</a-tag>
                  <a-tag :color="execStatusColor(wo.execStatus)" class="status-tag">
                    {{ wo.execStatus }}
                  </a-tag>
                  <a-tag :color="urgencyTagColor(wo.urgency)" class="urgency-tag">
                    {{ urgencyLabel(wo.urgency) }}
                  </a-tag>
                </a-space>
                <a-dropdown :trigger="['click']">
                  <a-button type="text" size="small" class="more-btn" @click.stop>
                    <EllipsisOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="({ key }) => onCardAction(key, wo)">
                      <a-menu-item key="edit">编辑</a-menu-item>
                      <a-menu-item key="delete" danger>删除</a-menu-item>
                      <a-menu-item key="clone">克隆</a-menu-item>
                      <a-menu-divider />
                      <a-menu-item key="urgency">调整紧急度</a-menu-item>
                      <a-menu-item key="pause">暂停</a-menu-item>
                      <a-menu-item key="terminate">终止</a-menu-item>
                      <a-menu-item key="complete">完成</a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
              <div class="card-code">{{ wo.code }}</div>
              <div class="card-name">{{ wo.name }}</div>
              <div class="card-meta">销售订单号：{{ wo.sourceOrderNo || '-' }}</div>
              <div class="card-meta">计划数量：{{ wo.planQty }}</div>
            </div>
          </div>
        </div>
        <div class="list-pagination">
          <a-pagination
            v-model:current="pagination.current"
            :total="filteredOrders.length"
            :page-size="pagination.pageSize"
            size="small"
            simple
          />
        </div>
      </div>

      <!-- 右侧详情 -->
      <div v-if="selectedOrder" class="detail-card">
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
        />
      </div>

      <div v-else class="detail-card detail-empty">
        <a-empty description="请选择左侧工单" />
      </div>
    </div>

    <template v-else>
      <WorkOrderTableLayout
        :data-source="pagedOrders"
        :total="filteredOrders.length"
        :pagination="pagination"
        :selected-ids="selectedIds"
        :active-id="selectedId"
        @refresh="handleSearch"
        @toggle-layout="toggleLayout"
        @select="onTableRowSelect"
        @action="handleTableAction"
        @update:pagination="onTablePaginationUpdate"
        @update:selected-ids="onSelectedIdsUpdate"
      />

      <a-drawer
        v-model:open="detailDrawerOpen"
        :title="selectedOrder ? `${selectedOrder.code} · ${selectedOrder.name}` : '工单详情'"
        width="960"
        destroy-on-close
        class="work-order-detail-drawer"
      >
        <WorkOrderDetailPanel
          v-if="selectedOrder"
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
        />
      </a-drawer>
    </template>

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
import {
  DownOutlined,
  EllipsisOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons-vue'
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

const LAYOUT_STORAGE_KEY = 'i_doms_qc_wo_layout'

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
const layoutMode = ref(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'split')
const detailDrawerOpen = ref(false)

const pagination = reactive({ current: 1, pageSize: 12 })

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

const pageIds = computed(() => pagedOrders.value.map((o) => o.id))

const allPageSelected = computed(
  () => pageIds.value.length > 0 && pageIds.value.every((id) => selectedIds.value.includes(id)),
)

const pageIndeterminate = computed(() => {
  const selectedOnPage = pageIds.value.filter((id) => selectedIds.value.includes(id)).length
  return selectedOnPage > 0 && selectedOnPage < pageIds.value.length
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

function statusColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'blue',
    完成: 'success',
    暂停: 'default',
    终止: 'error',
  }
  return map[status] || 'default'
}

function execStatusColor(execStatus) {
  const map = {
    未开始: 'default',
    执行中: 'processing',
    已完成: 'success',
    暂停: 'warning',
  }
  return map[execStatus] || 'default'
}

function urgencyTagColor(urgency) {
  if (urgency === '紧急' || urgency === '加急') return 'error'
  return 'default'
}

function urgencyLabel(urgency) {
  if (urgency === '紧急' || urgency === '加急') return '紧急'
  return '不紧急'
}

function selectOrder(id) {
  selectedId.value = id
}

function toggleLayout() {
  layoutMode.value = layoutMode.value === 'split' ? 'table' : 'split'
  localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode.value)
  if (layoutMode.value === 'split') {
    detailDrawerOpen.value = false
  } else {
    pagination.current = 1
    if (pagination.pageSize > 20) pagination.pageSize = 10
  }
}

function onTableRowSelect(id) {
  selectedId.value = id
  detailDrawerOpen.value = true
}

function handleTableAction(key, wo) {
  if (key === 'dispatch') {
    selectedId.value = wo.id
    detailTab.value = 'dispatch'
    detailDrawerOpen.value = true
    return
  }
  onCardAction(key, wo)
}

function onTablePaginationUpdate(next) {
  pagination.current = next.current
  pagination.pageSize = next.pageSize
}

function onSelectedIdsUpdate(ids) {
  selectedIds.value = ids
}

function toggleSelect(id, checked) {
  if (checked) {
    if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
  } else {
    selectedIds.value = selectedIds.value.filter((v) => v !== id)
  }
}

function onToggleSelectAllPage(e) {
  const checked = e.target.checked
  if (checked) {
    pageIds.value.forEach((id) => {
      if (!selectedIds.value.includes(id)) selectedIds.value.push(id)
    })
  } else {
    selectedIds.value = selectedIds.value.filter((id) => !pageIds.value.includes(id))
  }
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

function onCardAction(key, wo) {
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
</script>

<style lang="less" scoped>
.work-order-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.list-card,
.detail-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

.master-detail {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  min-height: 520px;
}

.list-card {
  width: 22%;
  min-width: 220px;
  max-width: 268px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 220px);

  .list-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px 6px;
    border-bottom: 1px solid #f0f0f0;

    .list-title {
      font-weight: 600;
      font-size: 14px;
      flex: 1;
    }

    .selected-count {
      font-size: 12px;
      color: #1677ff;
    }

    .layout-toggle-btn {
      margin-left: auto;
      color: rgba(0, 0, 0, 0.45);
      flex-shrink: 0;

      &:hover {
        color: #1677ff;
      }
    }
  }

  .list-body {
    flex: 1;
    overflow-y: auto;
    padding: 6px;
  }

  .list-pagination {
    padding: 6px 8px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
  }
}

.order-card {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 6px 8px 6px 6px;
  margin-bottom: 6px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
  border-left: 2px solid transparent;

  &:hover {
    border-color: #d6e4ff;
    box-shadow: 0 1px 4px rgba(22, 119, 255, 0.08);
  }

  &.active {
    border-color: #91caff;
    border-left-color: #1677ff;
    background: #f0f7ff;
  }

  &.checked {
    background: #fafcff;
  }

  .card-checkbox {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .card-content {
    flex: 1;
    min-width: 0;
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 6px;
    gap: 4px;

    .card-tags-row {
      flex: 1;
      min-width: 0;
    }

    .status-tag,
    .urgency-tag {
      margin: 0;
      line-height: 18px;
      font-size: 11px;
      padding-inline: 6px;
    }

    .more-btn {
      padding: 0 2px;
      height: 22px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .card-code {
    font-weight: 600;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.88);
    margin-bottom: 2px;
    line-height: 1.3;
  }

  .card-name {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    margin-bottom: 4px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-meta {
    font-size: 11px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.5;
  }
}

.detail-card {
  flex: 1;
  min-width: 0;
  padding: 8px 12px 10px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

:deep(.work-order-detail-drawer) {
  .ant-drawer-body {
    padding: 12px 16px 16px;
  }
}

@media (max-width: 992px) {
  .master-detail {
    flex-direction: column;
  }

  .list-card {
    width: 100%;
    max-width: none;
    max-height: 240px;
  }

  .filter-footer {
    flex-direction: column;
    align-items: stretch;

    > .ant-space {
      justify-content: flex-start;
    }
  }
}
</style>
