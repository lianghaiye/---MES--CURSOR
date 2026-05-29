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

    <!-- 主从布局 -->
    <div class="master-detail">
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
              <div class="card-meta">
                <span>订单 {{ wo.sourceOrderNo || '-' }}</span>
                <span class="meta-divider">·</span>
                <span>数量 {{ wo.scheduleQty }}</span>
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
        <div class="detail-header">
          <div class="detail-title">
            <span class="code">{{ selectedOrder.code }}</span>
            <span class="name">{{ selectedOrder.name }}</span>
          </div>
          <a-button
            v-if="detailTab === 'dispatch' && showDispatchTab"
            type="link"
            class="collapse-btn"
            @click="detailCollapsed = !detailCollapsed"
          >
            {{ detailCollapsed ? '展开详情' : '收起详情' }}
            <UpOutlined v-if="!detailCollapsed" />
            <DownOutlined v-else />
          </a-button>
        </div>

        <a-tabs v-model:activeKey="detailTab" class="detail-tabs">
          <a-tab-pane v-if="showDispatchTab" key="dispatch" tab="工单下发">
            <a-form
              v-show="!detailCollapsed"
              layout="inline"
              class="basic-form horizontal-form dispatch-basic-form"
            >
              <a-row :gutter="[8, 6]" style="width: 100%">
                <a-col :xs="24" :sm="12" :md="6">
                  <a-form-item label="产品名称">
                    <a-input :value="selectedOrder.productName" disabled size="small" />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :md="6">
                  <a-form-item label="工作中心">
                    <a-select
                      v-model:value="selectedOrder.workCenter"
                      size="small"
                      :options="workCenterOpts"
                      @change="saveBasicInfo"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :md="6">
                  <a-form-item label="BOM">
                    <a-select
                      v-model:value="selectedOrder.bom"
                      show-search
                      size="small"
                      :options="bomOpts"
                      @change="saveBasicInfo"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :md="6">
                  <a-form-item label="预入仓库">
                    <a-select
                      v-model:value="selectedOrder.warehouse"
                      size="small"
                      :options="warehouseOpts"
                      @change="saveBasicInfo"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :md="6">
                  <a-form-item label="紧急度">
                    <a-select
                      v-model:value="selectedOrder.urgency"
                      size="small"
                      :options="urgencyOpts"
                      @change="saveBasicInfo"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="12" :md="10">
                  <a-form-item label="计划日期">
                    <a-range-picker
                      v-model:value="planDateValue"
                      size="small"
                      @change="onPlanDateChange"
                    />
                  </a-form-item>
                </a-col>
                <a-col :xs="24" :sm="24" :md="8">
                  <a-form-item label="备注" class="remark-item">
                    <a-input
                      v-model:value="selectedOrder.remark"
                      size="small"
                      placeholder="请输入备注"
                      @blur="saveBasicInfo"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </a-form>

            <WorkOrderDispatchTab
              :work-order="selectedOrder"
              @dispatch="handleDispatch(false)"
              @dispatch-and-start="handleDispatch(true)"
              @cancel="handleDispatchCancel"
            />
          </a-tab-pane>
          <a-tab-pane key="detail" tab="工单详情">
            <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
          </a-tab-pane>
          <a-tab-pane key="ebom" tab="EBOM">
            <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
          </a-tab-pane>
          <a-tab-pane key="current-bom" tab="当前BOM">
            <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
          </a-tab-pane>
          <a-tab-pane key="tasks" tab="任务列表">
            <a-empty description="该 Tab 为占位，后续扩展" class="tab-empty" />
          </a-tab-pane>
        </a-tabs>
      </div>

      <div v-else class="detail-card detail-empty">
        <a-empty description="请选择左侧工单" />
      </div>
    </div>

    <CreateWorkOrderModal
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
export default { name: 'WorkOrderManagementView' }
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
  UpOutlined,
} from '@ant-design/icons-vue'
import {
  workOrderState,
  filterWorkOrders,
  updateWorkOrder,
  addWorkOrder,
  deleteWorkOrder,
  cloneWorkOrder,
  canShowDispatchTab,
} from '@/store/workOrderStore'
import { workCenterOptions, warehouseOptions, urgencyOptions } from '@/mock/workOrderOptions'
import { bomOptions } from '@/mock/workOrderMaster'
import CreateWorkOrderModal from './components/CreateWorkOrderModal.vue'
import WorkOrderDispatchTab from './components/WorkOrderDispatchTab.vue'

const statusOptions = ['待下发', '已下发', '执行中', '完成', '暂停', '终止']
const categoryOptions = ['生产工单', '返修工单', '试制工单']

const filters = reactive({
  code: '',
  name: '',
  salesOrderNo: '',
  status: undefined,
  orderCategory: undefined,
  workCenter: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedId = ref(workOrderState.orders[0]?.id || null)
const selectedIds = ref([])
const detailTab = ref('dispatch')
const detailCollapsed = ref(false)
const createModalOpen = ref(false)
const editRecord = ref(null)
const urgencyModalOpen = ref(false)
const urgencyDraft = ref('普通')
const urgencyTargetId = ref(null)

const pagination = reactive({ current: 1, pageSize: 12 })

const statusOpts = statusOptions.map((v) => ({ label: v, value: v }))
const categoryOpts = categoryOptions.map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = warehouseOptions.map((v) => ({ label: v, value: v }))
const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const bomOpts = bomOptions.map((v) => ({ label: v, value: v }))

const filteredOrders = computed(() => filterWorkOrders(workOrderState.orders, appliedFilters.value))

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

const selectedOrder = computed(() => workOrderState.orders.find((o) => o.id === selectedId.value))

const showDispatchTab = computed(() =>
  selectedOrder.value ? canShowDispatchTab(selectedOrder.value.status) : false,
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
  if (!canShowDispatchTab(wo.status) && detailTab.value === 'dispatch') {
    detailTab.value = 'detail'
  } else if (canShowDispatchTab(wo.status)) {
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
  filters.orderCategory = undefined
  filters.workCenter = undefined
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function saveBasicInfo() {
  if (!selectedOrder.value) return
  updateWorkOrder(selectedOrder.value.id, { ...selectedOrder.value })
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
  addWorkOrder(wo)
  selectedId.value = wo.id
  detailTab.value = 'dispatch'
}

function onWorkOrderUpdated({ id, patch }) {
  updateWorkOrder(id, patch)
  const wo = workOrderState.orders.find((o) => o.id === id)
  if (selectedId.value === id && wo) {
    if (!canShowDispatchTab(wo.status) && detailTab.value === 'dispatch') {
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
  updateWorkOrder(wo.id, {
    processes: wo.processes,
    status: startAfter ? '执行中' : '已下发',
  })
  message.success(startAfter ? '工单已下发并开始执行' : '工单已下发')
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
  const targets = workOrderState.orders.filter(
    (o) => selectedIds.value.includes(o.id) && o.status === '待下发',
  )
  if (!targets.length) {
    message.warning('所选工单中没有状态为「待下发」的可下发项')
    return
  }
  for (const wo of targets) {
    if (!validateProcesses(wo.processes)) return
    updateWorkOrder(wo.id, { status: '已下发' })
  }
  message.success(`已批量下发 ${targets.length} 条工单`)
  selectedIds.value = []
}

function handleBatchExport() {
  if (!selectedIds.value.length) {
    message.warning('请勾选要导出的工单')
    return
  }
  const data = workOrderState.orders.filter((o) => selectedIds.value.includes(o.id))
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `work-orders-${dayjs().format('YYYYMMDD-HHmmss')}.json`
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
        deleteWorkOrder(wo.id)
        selectedIds.value = selectedIds.value.filter((id) => id !== wo.id)
        if (selectedId.value === wo.id) {
          selectedId.value = workOrderState.orders[0]?.id || null
        }
        message.success('工单已删除')
      },
    })
    return
  }
  if (key === 'clone') {
    const cloned = cloneWorkOrder(wo.id)
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
    updateWorkOrder(wo.id, { status: map[key] })
    message.success(`工单已${map[key]}`)
  }
}

function confirmUrgency() {
  if (urgencyTargetId.value) {
    updateWorkOrder(urgencyTargetId.value, { urgency: urgencyDraft.value })
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

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;

    .detail-title {
      min-width: 0;

      .code {
        font-size: 14px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
        margin-right: 8px;
      }

      .name {
        font-size: 13px;
        color: rgba(0, 0, 0, 0.65);
      }
    }

    .collapse-btn {
      flex-shrink: 0;
      padding-right: 0;
      font-size: 12px;
      height: auto;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .detail-tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 8px;

      &::before {
        border-bottom-color: #f0f0f0;
      }
    }

    :deep(.ant-tabs-tab) {
      padding: 6px 0;
      font-size: 13px;
    }

    :deep(.ant-tabs-tab + .ant-tabs-tab) {
      margin-left: 20px;
    }
  }

  .dispatch-basic-form {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .basic-form {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .tab-empty {
    margin: 24px 0;
  }
}

.detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
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
