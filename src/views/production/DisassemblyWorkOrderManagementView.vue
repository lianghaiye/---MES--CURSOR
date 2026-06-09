<template>
  <div class="work-order-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[8, 6]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="单据编号">
              <a-input
                v-model:value="filters.code"
                allow-clear
                placeholder="请输入编号"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="工单状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="物品名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="紧急度">
              <a-select v-model:value="filters.urgency" size="small" :options="urgencyFilterOpts" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="4">
            <a-form-item label="工作中心">
              <a-select
                v-model:value="filters.workCenter"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="workCenterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :xl="6">
            <a-form-item label="工单日期">
              <a-range-picker
                v-model:value="filters.documentDateRange"
                size="small"
                style="width: 100%"
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
                <a-button type="primary" size="small" @click="openCreate">
                  <PlusOutlined />
                  新增
                </a-button>
                <a-button class="batch-dispatch-btn" size="small" @click="handleBatchDispatch">
                  批量下发
                </a-button>
              </a-space>
            </div>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="layoutMode === 'split'" class="master-detail">
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
                <a-tag :color="statusColor(wo.status)" class="status-tag">{{ wo.status }}</a-tag>
                <a-dropdown :trigger="['click']">
                  <a-button type="text" size="small" class="more-btn" @click.stop>
                    <EllipsisOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu @click="({ key }) => onCardAction(key, wo)">
                      <a-menu-item key="view">查看详情</a-menu-item>
                      <a-menu-item v-if="canEditDisassemblyOrder(wo)" key="edit">编辑</a-menu-item>
                      <a-menu-item v-if="canDeleteDisassemblyOrder(wo)" key="delete" danger>
                        删除
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
              <div class="card-code">{{ wo.code }}</div>
              <div class="card-name">{{ wo.name }}</div>
              <div class="card-meta">
                <span>报废单 {{ wo.relatedScrapNo || '-' }}</span>
                <span class="meta-divider">·</span>
                <span>数量 {{ wo.disassemblyQty ?? 1 }}</span>
              </div>
              <div class="card-tags">
                <a-tag :color="urgencyTagColor(wo.urgency)" class="urgency-tag">
                  {{ urgencyLabel(wo.urgency) }}
                </a-tag>
              </div>
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

      <div v-if="selectedOrder" class="detail-card">
        <DisassemblyWorkOrderDetailPanel
          :work-order-id="selectedOrder.id"
          v-model:detail-tab="detailTab"
          v-model:detail-collapsed="detailCollapsed"
          :show-dispatch-tab="showDispatchTab"
          :plan-date-value="planDateValue"
          :work-center-opts="workCenterOpts"
          :warehouse-opts="warehouseOpts"
          :urgency-opts="urgencyOpts"
          :bom-opts="bomOpts"
          :person-opts="personOpts"
          @save-basic="saveBasicInfo"
          @plan-date-change="onPlanDateChange"
          @save-dispatch="handleSaveDispatch"
          @dispatch-and-start="handleDispatchAndStart"
          @cancel-dispatch="handleDispatchCancel"
          @detail-action="onDetailAction"
        />
      </div>
      <div v-else class="detail-card detail-empty">
        <a-empty description="请选择左侧工单" />
      </div>
    </div>

    <template v-else>
      <DisassemblyWorkOrderTableLayout
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
        width="1200"
        destroy-on-close
        class="work-order-detail-drawer"
      >
        <DisassemblyWorkOrderDetailPanel
          v-if="selectedOrder"
          :work-order-id="selectedOrder.id"
          v-model:detail-tab="detailTab"
          v-model:detail-collapsed="detailCollapsed"
          :show-dispatch-tab="showDispatchTab"
          :plan-date-value="planDateValue"
          :work-center-opts="workCenterOpts"
          :warehouse-opts="warehouseOpts"
          :urgency-opts="urgencyOpts"
          :bom-opts="bomOpts"
          :person-opts="personOpts"
          @save-basic="saveBasicInfo"
          @plan-date-change="onPlanDateChange"
          @save-dispatch="handleSaveDispatch"
          @dispatch-and-start="handleDispatchAndStart"
          @cancel-dispatch="handleDispatchCancel"
          @detail-action="onDetailAction"
        />
      </a-drawer>
    </template>

    <CreateDisassemblyWorkOrderModal
      v-model:open="formOpen"
      :edit-record="editingRecord"
      @saved="onSaved"
    />
  </div>
</template>

<script>
export default { name: 'DisassemblyWorkOrderManagementView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  EllipsisOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons-vue'
import { workCenterOptions, urgencyOptions, personInChargeOptions } from '@/mock/workOrderOptions'
import {
  disassemblyWorkOrderState,
  updateDisassemblyWorkOrder,
  deleteDisassemblyWorkOrder,
} from '@/store/disassemblyWorkOrderStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  DISASSEMBLY_STATUS_OPTIONS,
  filterDisassemblyWorkOrders,
  statusColor,
  urgencyTagColor,
  urgencyLabel,
  canShowDisassemblyDispatchTab,
  canEditDisassemblyOrder,
  canDeleteDisassemblyOrder,
} from '@/utils/disassemblyWorkOrder'
import { saveDispatchDraft, dispatchAndStartWorkOrder } from '@/utils/workOrderDispatchHelpers'
import { useTabs } from '@/composables/useTabs'
import CreateDisassemblyWorkOrderModal from './components/CreateDisassemblyWorkOrderModal.vue'
import DisassemblyWorkOrderDetailPanel from './components/DisassemblyWorkOrderDetailPanel.vue'
import DisassemblyWorkOrderTableLayout from './components/DisassemblyWorkOrderTableLayout.vue'

const LAYOUT_STORAGE_KEY = 'i_doms_dwo_layout'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  code: '',
  status: undefined,
  itemName: '',
  urgency: '全部',
  workCenter: undefined,
  documentDateRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedId = ref(disassemblyWorkOrderState.orders[0]?.id || null)
const selectedIds = ref([])
const detailTab = ref('dispatch')
const detailCollapsed = ref(false)
const formOpen = ref(false)
const editingRecord = ref(null)
const layoutMode = ref(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'split')
const detailDrawerOpen = ref(false)
const pagination = reactive({ current: 1, pageSize: 12 })

const statusOpts = DISASSEMBLY_STATUS_OPTIONS.map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})
const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const urgencyFilterOpts = [
  { label: '全部', value: '全部' },
  ...urgencyOptions.map((v) => ({ label: v, value: v })),
]
const personOpts = personInChargeOptions.map((v) => ({ label: v, value: v }))
const bomOpts = computed(() => {
  const wo = selectedOrder.value
  if (!wo?.bom) return []
  return [{ label: wo.bom, value: wo.bom }]
})

const filteredOrders = computed(() => {
  const range = appliedFilters.value.documentDateRange
  const dateRange =
    range?.length === 2 ? [range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')] : null
  return filterDisassemblyWorkOrders(disassemblyWorkOrderState.orders, {
    ...appliedFilters.value,
    documentDateRange: dateRange,
  })
})

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

const selectedOrder = computed(() =>
  disassemblyWorkOrderState.orders.find((o) => o.id === selectedId.value),
)

const showDispatchTab = computed(() =>
  selectedOrder.value ? canShowDisassemblyDispatchTab(selectedOrder.value.status) : false,
)

const planDateValue = computed({
  get() {
    const wo = selectedOrder.value
    if (!wo?.planStartDate || !wo?.planEndDate) return null
    return [dayjs(wo.planStartDate), dayjs(wo.planEndDate)]
  },
  set() {},
})

watch(selectedOrder, (wo) => {
  if (!wo) return
  if (!canShowDisassemblyDispatchTab(wo.status) && detailTab.value === 'dispatch') {
    detailTab.value = 'detail'
  } else if (canShowDisassemblyDispatchTab(wo.status)) {
    detailTab.value = 'dispatch'
  }
})

watch(filteredOrders, (list) => {
  if (!list.find((o) => o.id === selectedId.value)) {
    selectedId.value = list[0]?.id || null
  }
})

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
  if (key === 'view') {
    goDetailPage(wo)
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

function openCreate() {
  editingRecord.value = null
  formOpen.value = true
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.code = ''
  filters.status = undefined
  filters.itemName = ''
  filters.urgency = '全部'
  filters.workCenter = undefined
  filters.documentDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function onSaved() {
  const latest = disassemblyWorkOrderState.orders[0]
  if (latest) {
    selectedId.value = latest.id
    detailTab.value = 'dispatch'
  }
  handleSearch()
}

function saveBasicInfo() {
  if (!selectedOrder.value) return
  updateDisassemblyWorkOrder(selectedOrder.value.id, { ...selectedOrder.value })
}

function onPlanDateChange(dates) {
  if (!selectedOrder.value) return
  if (dates?.length === 2) {
    selectedOrder.value.planStartDate = dates[0].format('YYYY-MM-DD')
    selectedOrder.value.planEndDate = dates[1].format('YYYY-MM-DD')
  } else {
    selectedOrder.value.planStartDate = ''
    selectedOrder.value.planEndDate = ''
  }
  saveBasicInfo()
}

function validateProcesses(processes) {
  const missing = processes.filter((p) => !p.executors?.length)
  if (missing.length) {
    message.error(`请为工序「${missing.map((p) => p.name).join('、')}」选择执行人`)
    return false
  }
  return true
}

function handleSaveDispatch() {
  saveDispatchDraft(updateDisassemblyWorkOrder, selectedOrder.value)
}

function handleDispatchAndStart() {
  const ok = dispatchAndStartWorkOrder({
    workOrder: selectedOrder.value,
    orderCategory: '拆解工单',
    updateFn: updateDisassemblyWorkOrder,
  })
  if (ok) detailTab.value = 'detail'
}

function handleDispatchCancel() {
  message.info('已取消本次编辑')
}

function handleBatchDispatch() {
  if (!selectedIds.value.length) {
    message.warning('请勾选要下发并开始的工单')
    return
  }
  const targets = disassemblyWorkOrderState.orders.filter(
    (o) => selectedIds.value.includes(o.id) && o.status === '待下发',
  )
  if (!targets.length) {
    message.warning('所选工单中没有状态为「待下发」的可下发项')
    return
  }
  let count = 0
  for (const wo of targets) {
    if (!validateProcesses(wo.processes)) return
    if (
      dispatchAndStartWorkOrder({
        workOrder: wo,
        orderCategory: '拆解工单',
        updateFn: updateDisassemblyWorkOrder,
      })
    ) {
      count += 1
    }
  }
  if (count) message.success(`已批量下发并开始 ${count} 条工单`)
  selectedIds.value = []
}

function goDetailPage(wo) {
  const path = `/production/disassembly-work-orders/${wo.id}`
  openTab(path, wo.name || '拆解工单详情')
  router.push(path)
}

function onCardAction(key, wo) {
  if (key === 'view') {
    goDetailPage(wo)
    return
  }
  if (key === 'edit') {
    editingRecord.value = wo
    formOpen.value = true
    return
  }
  if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除工单「${wo.code}」吗？此操作不可恢复。`,
      okType: 'danger',
      onOk: () => {
        deleteDisassemblyWorkOrder(wo.id)
        selectedIds.value = selectedIds.value.filter((id) => id !== wo.id)
        if (selectedId.value === wo.id) {
          selectedId.value = disassemblyWorkOrderState.orders[0]?.id || null
        }
        message.success('工单已删除')
      },
    })
  }
}

function onDetailAction({ key, workOrder: wo }) {
  if (!wo) return
  if (key === 'schedule-qty') {
    message.info('修改拆解数量功能开发中')
    return
  }
  if (key === 'urgency') {
    message.info('请通过工单下发页调整紧急度')
  }
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
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;

    .status-tag {
      margin: 0;
      line-height: 18px;
      font-size: 12px;
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
    line-height: 1.4;

    .meta-divider {
      margin: 0 4px;
    }
  }

  .card-tags {
    margin-top: 4px;

    .urgency-tag {
      margin: 0;
      font-size: 11px;
      line-height: 18px;
      padding-inline: 6px;
    }
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
