<template>
  <div class="work-order-page">
    <!-- 筛选区 -->
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <ListFilterBar :field-count="10" @search="handleSearch" @reset="handleReset">
          <a-form-item label="工单编号">
            <a-input v-model:value="filters.code" allow-clear placeholder="请输入" size="small" />
          </a-form-item>
          <a-form-item label="工单名称">
            <a-input v-model:value="filters.name" allow-clear placeholder="请输入" size="small" />
          </a-form-item>
          <a-form-item label="销售订单号">
            <a-input
              v-model:value="filters.salesOrderNo"
              allow-clear
              placeholder="请输入"
              size="small"
            />
          </a-form-item>
          <a-form-item label="产品名称">
            <a-input
              v-model:value="filters.productName"
              allow-clear
              placeholder="请输入"
              size="small"
            />
          </a-form-item>
          <a-form-item label="编号">
            <a-input
              v-model:value="filters.materialCode"
              allow-clear
              placeholder="请输入"
              size="small"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="filters.specModel"
              allow-clear
              placeholder="请输入"
              size="small"
            />
          </a-form-item>
          <a-form-item label="图号">
            <a-input
              v-model:value="filters.drawingNo"
              allow-clear
              placeholder="请输入"
              size="small"
            />
          </a-form-item>
          <a-form-item label="状态">
            <a-select
              v-model:value="filters.status"
              allow-clear
              placeholder="全部"
              size="small"
              :options="statusOpts"
            />
          </a-form-item>
          <a-form-item label="工单类别">
            <a-select
              v-model:value="filters.orderCategory"
              allow-clear
              placeholder="全部"
              size="small"
              :options="categoryOpts"
            />
          </a-form-item>
          <a-form-item label="工作中心">
            <a-select
              v-model:value="filters.workCenter"
              allow-clear
              placeholder="全部"
              size="small"
              :options="workCenterOpts"
            />
          </a-form-item>
          <template v-if="layoutMode === 'split'" #toolbar>
            <a-button type="primary" size="small" @click="openCreate">
              <PlusOutlined />
              新增总装工单
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
          </template>
        </ListFilterBar>
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
          <div class="list-title-actions">
            <a-tooltip title="刷新">
              <a-button type="text" size="small" class="layout-toggle-btn" @click="handleSearch">
                <ReloadOutlined />
              </a-button>
            </a-tooltip>
            <a-tooltip title="切换为列表视图">
              <a-button type="text" size="small" class="layout-toggle-btn" @click="toggleLayout">
                <TableOutlined />
              </a-button>
            </a-tooltip>
          </div>
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
                <a-tag v-if="isScheduleIncomplete(wo)" color="processing" class="status-tag">
                  未排完
                </a-tag>
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
                      <a-menu-item
                        v-if="['待下发', '已下发', '执行中'].includes(wo.status)"
                        key="pause"
                      >
                        暂停
                      </a-menu-item>
                      <a-menu-item v-if="wo.status === '暂停'" key="resume">恢复</a-menu-item>
                      <a-menu-item
                        v-if="['待下发', '已下发', '执行中', '暂停'].includes(wo.status)"
                        key="terminate"
                        danger
                      >
                        终止
                      </a-menu-item>
                      <a-menu-item
                        v-if="canConvertWorkOrderToPurchaseOrOutsource(wo)"
                        key="to-purchase"
                      >
                        转采购
                      </a-menu-item>
                      <a-menu-item
                        v-if="canConvertWorkOrderToPurchaseOrOutsource(wo)"
                        key="to-outsource"
                      >
                        转外协
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </div>
              <div class="card-code">{{ wo.code }}</div>
              <div class="card-name">{{ wo.name }}</div>
              <div class="card-meta">
                <span>订单 {{ wo.sourceOrderNo || '-' }}</span>
                <span class="meta-divider">·</span>
                <span>数量 {{ formatScheduleProgress(wo) }}</span>
                <template v-if="isScheduleIncomplete(wo)">
                  <span class="meta-divider">·</span>
                  <span>未排完</span>
                </template>
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

      <!-- 右侧详情 -->
      <div v-if="selectedOrder" class="detail-card">
        <WorkOrderDetailPanel
          variant="assembly"
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
      <WorkOrderTableLayout
        :data-source="pagedOrders"
        :total="filteredOrders.length"
        :pagination="pagination"
        :selected-ids="selectedIds"
        :active-id="selectedId"
        column-settings-key="assembly-work-order-list-v3"
        @refresh="handleSearch"
        @toggle-layout="toggleLayout"
        @select="onTableRowSelect"
        @action="handleTableAction"
        @update:pagination="onTablePaginationUpdate"
        @update:selected-ids="onSelectedIdsUpdate"
      >
        <template #toolbar>
          <a-button type="primary" size="small" @click="openCreate">
            <PlusOutlined />
            新增总装工单
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
        </template>
      </WorkOrderTableLayout>

      <a-drawer
        v-model:open="detailDrawerOpen"
        :title="selectedOrder ? `${selectedOrder.code} · ${selectedOrder.name}` : '工单详情'"
        width="1200"
        destroy-on-close
        class="work-order-detail-drawer"
      >
        <WorkOrderDetailPanel
          v-if="selectedOrder"
          variant="assembly"
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
          @save-dispatch="handleSaveDispatch"
          @dispatch-and-start="handleDispatchAndStart"
          @cancel-dispatch="handleDispatchCancel"
          @detail-action="onDetailAction"
        />
      </a-drawer>
    </template>

    <CreateAssemblyWorkOrderModal
      v-model:open="createModalOpen"
      :edit-record="editRecord"
      @created="onWorkOrderCreated"
      @updated="onWorkOrderUpdated"
    />

    <WorkOrderConvertModals ref="convertModalsRef" />

    <EditScheduleQtyModal
      v-model:open="editScheduleQtyModalOpen"
      :work-order="editScheduleQtyTarget"
      @submit="onEditScheduleQtySubmit"
    />
    <CreateScheduleBatchModal
      v-model:open="scheduleBatchModalOpen"
      :work-order="scheduleBatchTarget"
      @submit="onScheduleBatchSubmit"
    />

    <a-modal v-model:open="urgencyModalOpen" title="调整紧急度" width="400px" @ok="confirmUrgency">
      <a-select v-model:value="urgencyDraft" style="width: 100%" :options="urgencyOpts" />
    </a-modal>

    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="filteredOrders.length"
      :selected-count="selectedIds.length"
      @export="doExport"
    />
  </div>
</template>

<script>
export default { name: 'AssemblyWorkOrderManagementView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  DownOutlined,
  EllipsisOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons-vue'
import {
  assemblyWorkOrderState,
  filterAssemblyWorkOrders,
  updateAssemblyWorkOrder,
  addAssemblyWorkOrder,
  deleteAssemblyWorkOrder,
  cloneAssemblyWorkOrder,
  canShowAssemblyDispatchTab,
  shouldShowWorkOrderDispatchTab,
  addAssemblyScheduleBatch,
  dispatchAssemblyScheduleBatch,
  removeAssemblyScheduleBatch,
  setActiveAssemblyScheduleBatch,
} from '@/store/assemblyWorkOrderStore'
import {
  saveDispatchDraft,
  dispatchAndStartWorkOrder,
  canEditWorkOrder,
} from '@/utils/workOrderDispatchHelpers'
import { formatScheduleProgress, isScheduleIncomplete } from '@/utils/workOrderScheduleBatch'
import { tipMessageIfScheduleOverSales } from '@/utils/scheduleOverSalesTip'
import {
  WORK_ORDER_STATUSES,
  workOrderStatusColor,
  buildPauseWorkOrderResult,
  buildResumeWorkOrderResult,
  buildTerminateWorkOrderResult,
  buildEditScheduleQtyResult,
} from '@/utils/workOrderStatus'
import { canConvertWorkOrderToPurchaseOrOutsource } from '@/utils/workOrderConvert'
import { sortWorkOrdersForList } from '@/utils/workOrderListSort'
import { workCenterOptions, urgencyOptions } from '@/mock/workOrderOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { bomOptions } from '@/mock/workOrderMaster'
import CreateAssemblyWorkOrderModal from './components/CreateAssemblyWorkOrderModal.vue'
import CreateScheduleBatchModal from './components/CreateScheduleBatchModal.vue'
import EditScheduleQtyModal from './components/EditScheduleQtyModal.vue'
import WorkOrderConvertModals from './components/WorkOrderConvertModals.vue'
import WorkOrderDetailPanel from './components/WorkOrderDetailPanel.vue'
import WorkOrderTableLayout from './components/WorkOrderTableLayout.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import ListFilterBar from '@/components/ListFilterBar.vue'
import { useTabs } from '@/composables/useTabs'
import { useListExport } from '@/composables/useListExport'
import { workOrderExportFields } from '@/utils/exportFields/workOrderExport'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'

const router = useRouter()
const route = useRoute()
const { openTab } = useTabs()

const LAYOUT_STORAGE_KEY = 'i_doms_assembly_wo_layout'

const statusOptions = [...WORK_ORDER_STATUSES]
const categoryOptions = ['总装工单']

const filters = reactive({
  code: '',
  name: '',
  salesOrderNo: '',
  productName: '',
  materialCode: '',
  specModel: '',
  drawingNo: '',
  status: undefined,
  orderCategory: undefined,
  workCenter: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedId = ref(assemblyWorkOrderState.orders[0]?.id || null)
const selectedIds = ref([])
const detailTab = ref('dispatch')
const detailCollapsed = ref(false)
const createModalOpen = ref(false)
const editRecord = ref(null)
const convertModalsRef = ref(null)
const urgencyModalOpen = ref(false)
const scheduleBatchModalOpen = ref(false)
const scheduleBatchTarget = ref(null)
const editScheduleQtyModalOpen = ref(false)
const editScheduleQtyTarget = ref(null)
const urgencyDraft = ref('普通')
const urgencyTargetId = ref(null)
const layoutMode = ref(localStorage.getItem(LAYOUT_STORAGE_KEY) || 'split')
const detailDrawerOpen = ref(false)

const pagination = reactive({ current: 1, pageSize: 12 })

const statusOpts = statusOptions.map((v) => ({ label: v, value: v }))
const categoryOpts = categoryOptions.map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})
const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const bomOpts = bomOptions.map((v) => ({ label: v, value: v }))

const filteredOrders = computed(() =>
  sortWorkOrdersForList(
    filterAssemblyWorkOrders(assemblyWorkOrderState.orders, appliedFilters.value),
  ),
)

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'assembly-work-order-list',
  fieldDefinitions: workOrderExportFields,
  getFilteredRows: () => filteredOrders.value,
  getSelectedRows: () =>
    assemblyWorkOrderState.orders.filter((o) => selectedIds.value.includes(o.id)),
  fileNamePrefix: '总装工单',
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
  assemblyWorkOrderState.orders.find((o) => o.id === selectedId.value),
)

const showDispatchTab = computed(() =>
  selectedOrder.value ? shouldShowWorkOrderDispatchTab(selectedOrder.value) : false,
)

const planDateValue = computed({
  get() {
    const range = selectedOrder.value?.planDateRange
    if (!range?.length) return null
    return [dayjs(range[0]), dayjs(range[1])]
  },
  set() {},
})

watch(
  selectedOrder,
  (wo) => {
    if (!wo) return
    if (!shouldShowWorkOrderDispatchTab(wo) && detailTab.value === 'dispatch') {
      detailTab.value = 'detail'
    } else if (shouldShowWorkOrderDispatchTab(wo) && canShowAssemblyDispatchTab(wo.status)) {
      detailTab.value = 'dispatch'
    }
  },
  { immediate: true },
)

watch(filteredOrders, (list) => {
  if (!list.find((o) => o.id === selectedId.value)) {
    selectedId.value = list[0]?.id || null
  }
})

function applyCodeFromRouteQuery() {
  const code = route.query.code
  if (!code) return
  const codeStr = String(code)
  const wo = assemblyWorkOrderState.orders.find((o) => o.code === codeStr)
  if (!wo) return
  filters.code = codeStr
  appliedFilters.value = { ...filters }
  selectedId.value = wo.id
  pagination.current = 1
  if (layoutMode.value === 'table') {
    detailDrawerOpen.value = true
  } else {
    detailCollapsed.value = false
  }
}

watch(
  () => route.query.code,
  () => applyCodeFromRouteQuery(),
  { immediate: true },
)

function statusColor(status) {
  return workOrderStatusColor(status)
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

function openCreate() {
  const page = findCreatePageByListPath('/production/assembly-work-orders')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEditModal(wo) {
  if (!canEditWorkOrder(wo)) {
    message.warning('执行中的工单不可编辑')
    return
  }
  editRecord.value = wo
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
  filters.productName = ''
  filters.materialCode = ''
  filters.specModel = ''
  filters.drawingNo = ''
  filters.status = undefined
  filters.orderCategory = undefined
  filters.workCenter = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function saveBasicInfo() {
  if (!selectedOrder.value) return
  updateAssemblyWorkOrder(selectedOrder.value.id, { ...selectedOrder.value })
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
  addAssemblyWorkOrder(wo)
  selectedId.value = wo.id
  detailTab.value = 'dispatch'
}

function onWorkOrderUpdated({ id, patch }) {
  updateAssemblyWorkOrder(id, patch)
  const wo = assemblyWorkOrderState.orders.find((o) => o.id === id)
  if (selectedId.value === id && wo) {
    if (!shouldShowWorkOrderDispatchTab(wo) && detailTab.value === 'dispatch') {
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

function handleSaveDispatch() {
  saveDispatchDraft(updateAssemblyWorkOrder, selectedOrder.value)
}

function handleDispatchAndStart() {
  const wo = selectedOrder.value
  if (!wo) return
  const batchQty = Math.max(0, Number(wo.dispatchBatchQty ?? wo.scheduleQty) || 0)
  if (batchQty <= 0) {
    message.warning('请填写排产数量')
    return
  }
  const ok = dispatchAndStartWorkOrder({
    workOrder: wo,
    orderCategory: '总装工单',
    updateFn: updateAssemblyWorkOrder,
  })
  if (!ok) return
  const batchResult = addAssemblyScheduleBatch(wo.id, {
    qty: batchQty,
    processAssignments: (wo.processes || []).map((p) => ({
      processId: p.id,
      processName: p.name,
      processCode: p.processCode,
      resourceType: p.resourceType || '工人',
      executors: [...(p.executors || [])],
    })),
    dispatchNow: true,
  })
  if (!batchResult.ok) {
    message.error(batchResult.message || '记录排产批次失败')
    return
  }
  const overTip = tipMessageIfScheduleOverSales(wo, batchQty)
  if (overTip) message.info(overTip)
  const plan = Number(wo.planQty) || 0
  const scheduled = Number(wo.scheduleQty) || 0
  wo.dispatchBatchQty = Math.max(0, plan - scheduled)
  detailTab.value = shouldShowWorkOrderDispatchTab(wo) ? 'dispatch' : 'schedule'
}

function handleDispatchCancel() {
  message.info('已取消本次编辑')
}

function handleBatchDispatch() {
  if (!selectedIds.value.length) {
    message.warning('请勾选要下发并开始的工单')
    return
  }
  const targets = assemblyWorkOrderState.orders.filter(
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
        orderCategory: '总装工单',
        updateFn: updateAssemblyWorkOrder,
      })
    ) {
      count += 1
    }
  }
  if (count) message.success(`已批量下发并开始 ${count} 条工单`)
  selectedIds.value = []
}

function onBatchMenu({ key }) {
  if (key === 'import') message.info('批量导入功能开发中')
  else if (key === 'export') openExportModal()
}

function onCardAction(key, wo) {
  if (key === 'edit') {
    openEditModal(wo)
    return
  }
  if (key === 'delete') {
    if (!canEditWorkOrder(wo)) {
      message.warning('执行中的工单不可删除')
      return
    }
    Modal.confirm({
      title: '确认删除',
      content: `确定删除工单「${wo.code}」吗？此操作不可恢复。`,
      okType: 'danger',
      onOk: () => {
        deleteAssemblyWorkOrder(wo.id)
        selectedIds.value = selectedIds.value.filter((id) => id !== wo.id)
        if (selectedId.value === wo.id) {
          selectedId.value = assemblyWorkOrderState.orders[0]?.id || null
        }
        message.success('工单已删除')
      },
    })
    return
  }
  if (key === 'clone') {
    const cloned = cloneAssemblyWorkOrder(wo.id)
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
  if (key === 'to-purchase') {
    convertModalsRef.value?.openPurchase(wo)
    return
  }
  if (key === 'to-outsource') {
    convertModalsRef.value?.openOutsource(wo)
    return
  }
  const map = { pause: '暂停', terminate: '终止', complete: '已完成' }
  if (key === 'resume') {
    const result = buildResumeWorkOrderResult(wo)
    if (!result.ok) {
      message.warning(result.message || '无法恢复')
      return
    }
    const row = updateAssemblyWorkOrder(wo.id, result.patch)
    if (!row) {
      message.error('恢复失败：找不到工单')
      return
    }
    message.success(`工单已恢复为「${row.status}」`)
    return
  }
  if (key === 'pause') {
    const result = buildPauseWorkOrderResult(wo)
    if (result.needConfirm) {
      Modal.confirm({
        title: '确认暂停',
        content: result.message,
        okText: result.confirmOkText || '确认暂停',
        cancelText: '取消',
        onOk: () => {
          const confirmed = buildPauseWorkOrderResult(wo, { confirmed: true })
          if (!confirmed.ok) {
            message.error(confirmed.message || '暂停失败')
            return Promise.reject()
          }
          const row = updateAssemblyWorkOrder(wo.id, confirmed.patch)
          if (!row) {
            message.error('暂停失败：找不到工单')
            return Promise.reject()
          }
          message.success(`工单状态已变为「${row.status}」`)
        },
      })
      return
    }
    if (!result.ok) {
      message.warning(result.message || '无法暂停')
      return
    }
    {
      const row = updateAssemblyWorkOrder(wo.id, result.patch)
      if (!row) {
        message.error('暂停失败：找不到工单')
        return
      }
      message.success(`工单状态已变为「${row.status}」`)
    }
    return
  }
  if (key === 'terminate') {
    const result = buildTerminateWorkOrderResult(wo)
    if (result.needChoose) {
      Modal.confirm({
        title: '确认终止',
        width: 480,
        content: `${result.message}
处理建议：
· 仍终止：报工数量重置为 0，小程序任务不再显示
· 不处理：承认报工数量，不影响工时工资结算；未完成任务隐藏`,
        okText: '仍终止（重置报工）',
        cancelText: '不处理（保留报工）',
        okType: 'danger',
        onOk: () => {
          const done = buildTerminateWorkOrderResult(wo, { mode: 'reset', confirmed: true })
          if (!done.ok) {
            message.error(done.message || '终止失败')
            return Promise.reject()
          }
          const row = updateAssemblyWorkOrder(wo.id, done.patch)
          if (!row) {
            message.error('终止失败：找不到工单')
            return Promise.reject()
          }
          message.success(`工单状态已变为「${row.status}」（报工已重置）`)
        },
        onCancel: (e) => {
          if (e && e.triggerCancel) return
          const done = buildTerminateWorkOrderResult(wo, { mode: 'keep', confirmed: true })
          if (!done.ok) {
            message.error(done.message || '终止失败')
            return
          }
          const row = updateAssemblyWorkOrder(wo.id, done.patch)
          if (!row) {
            message.error('终止失败：找不到工单')
            return
          }
          message.success(`工单状态已变为「${row.status}」（保留报工）`)
        },
      })
      return
    }
    if (result.needConfirm) {
      Modal.confirm({
        title: '确认终止',
        content: `确定终止工单「${wo.code}」吗？终止后不可恢复生产。`,
        okType: 'danger',
        okText: '确认终止',
        cancelText: '取消',
        onOk: () => {
          const done = buildTerminateWorkOrderResult(wo, { mode: 'reset', confirmed: true })
          if (!done.ok) {
            message.error(done.message || '终止失败')
            return Promise.reject()
          }
          const row = updateAssemblyWorkOrder(wo.id, done.patch)
          if (!row) {
            message.error('终止失败：找不到工单')
            return Promise.reject()
          }
          message.success(`工单状态已变为「${row.status}」`)
        },
      })
      return
    }
    if (!result.ok) {
      message.warning(result.message || '无法终止')
    }
    return
  }
  if (map[key]) {
    if (key === 'complete') {
      Modal.confirm({
        title: '确认完成',
        content: `确定将工单「${wo.code}」标记为已完成？`,
        onOk: () => {
          updateAssemblyWorkOrder(wo.id, { status: '已完成' })
          message.success('工单已完成')
        },
      })
      return
    }
    updateAssemblyWorkOrder(wo.id, { status: map[key] })
    message.success(`工单已${map[key]}`)
  }
}

function confirmUrgency() {
  if (urgencyTargetId.value) {
    updateAssemblyWorkOrder(urgencyTargetId.value, { urgency: urgencyDraft.value })
    message.success('紧急度已调整')
  }
  urgencyModalOpen.value = false
}

function onDetailAction({ key, workOrder: wo, record, patch }) {
  if (!wo) return
  if (key === 'schedule-qty') {
    const gate = buildEditScheduleQtyResult(wo, Math.max(1, Number(wo.scheduleQty) || 1))
    if (gate.blocked) {
      Modal.warning({
        title: '无法修改排产数量',
        content: gate.message,
      })
      return
    }
    editScheduleQtyTarget.value = wo
    editScheduleQtyModalOpen.value = true
    return
  }
  if (key === 'gen-task' || key === 'edit-executor' || key === 'reset-status') {
    updateAssemblyWorkOrder(wo.id, { ...wo, ...(patch || {}) })
    return
  }
  if (key === 'select-batch' && record?.id) {
    setActiveAssemblyScheduleBatch(wo.id, record.id)
    return
  }
  if (key === 'dispatch-batch' && record?.id) {
    const result = dispatchAssemblyScheduleBatch(wo.id, record.id)
    if (!result.ok) {
      message.error(result.message || '下发失败')
      return
    }
    message.success(`批次 #${result.batch.batchNo} 已下发并开始`)
    return
  }
  if (key === 'remove-batch' && record?.id) {
    Modal.confirm({
      title: '删除排产批次',
      content: `确定删除批次 #${record.batchNo}？删除后剩余可排将释放。`,
      okType: 'danger',
      onOk: () => {
        const result = removeAssemblyScheduleBatch(wo.id, record.id)
        if (!result.ok) {
          message.error(result.message || '删除失败')
          return
        }
        message.success('已删除排产批次')
      },
    })
    return
  }
  if (
    ['urgency', 'pause', 'terminate', 'complete', 'resume', 'to-purchase', 'to-outsource'].includes(
      key,
    )
  ) {
    onCardAction(key, wo)
  }
}

function onEditScheduleQtySubmit({ qty, batchId }) {
  const wo = editScheduleQtyTarget.value
  if (!wo) return
  const preview = buildEditScheduleQtyResult(wo, qty, { batchId })
  if (preview.blocked) {
    editScheduleQtyModalOpen.value = false
    Modal.warning({
      title: '无法修改排产数量',
      content: preview.message,
    })
    return
  }
  if (!preview.needConfirm && !preview.ok) {
    message.warning(preview.message || '无法修改排产数量')
    return
  }
  Modal.confirm({
    title: '确认修改排产数量',
    content: preview.message,
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      const confirmed = buildEditScheduleQtyResult(wo, qty, {
        confirmed: true,
        batchId: preview.batchId || batchId,
      })
      if (!confirmed.ok) {
        message.error(confirmed.message || '修改失败')
        return Promise.reject()
      }
      const row = updateAssemblyWorkOrder(wo.id, confirmed.patch)
      if (!row) {
        message.error('修改失败：找不到工单')
        return Promise.reject()
      }
      editScheduleQtyModalOpen.value = false
      message.success(
        confirmed.syncedTaskCount
          ? `排产数量已改为 ${confirmed.qty}，已同步 ${confirmed.syncedTaskCount} 条小程序任务目标数`
          : `排产数量已改为 ${confirmed.qty}`,
      )
    },
  })
}

function onScheduleBatchSubmit(payload) {
  const wo = scheduleBatchTarget.value
  if (!wo) return
  const result = addAssemblyScheduleBatch(wo.id, payload)
  if (!result.ok) {
    message.error(result.message || '创建批次失败')
    return
  }
  scheduleBatchModalOpen.value = false
  message.success(
    payload.dispatchNow
      ? `已创建并下发批次 #${result.batch.batchNo}（数量 ${result.batch.qty}）`
      : `已保存批次 #${result.batch.batchNo}（数量 ${result.batch.qty}），可稍后下发`,
  )
  detailTab.value = 'schedule'
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
}

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

    .list-title-actions {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      gap: 0;
    }

    .layout-toggle-btn {
      color: rgba(0, 0, 0, 0.45);

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
