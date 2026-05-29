<template>
  <div class="work-order-page">
    <!-- 筛选区 -->
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="工单编号">
              <a-input v-model:value="filters.code" allow-clear placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="工单名称">
              <a-input v-model:value="filters.name" allow-clear placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="销售订单号">
              <a-input v-model:value="filters.salesOrderNo" allow-clear placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="全部"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="工单类别">
              <a-select
                v-model:value="filters.orderCategory"
                allow-clear
                placeholder="全部"
                :options="categoryOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="工作中心">
              <a-select
                v-model:value="filters.workCenter"
                allow-clear
                placeholder="全部"
                :options="workCenterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" @click="handleSearch">
                  <SearchOutlined />
                  查询
                </a-button>
                <a-button @click="handleReset">
                  <ReloadOutlined />
                  重置
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar-row">
      <a-space>
        <a-button type="primary" @click="createModalOpen = true">
          <PlusOutlined />
          新增工单
        </a-button>
        <a-dropdown>
          <a-button>
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
        <a-button class="batch-dispatch-btn" @click="handleBatchDispatch">批量下发</a-button>
      </a-space>
    </div>

    <!-- 主从布局 -->
    <div class="master-detail">
      <!-- 左侧工单列表 -->
      <div class="list-card">
        <div class="list-title">工单列表</div>
        <div class="list-body">
          <div
            v-for="wo in pagedOrders"
            :key="wo.id"
            class="order-card"
            :class="{ active: selectedId === wo.id }"
            @click="selectOrder(wo.id)"
          >
            <div class="card-head">
              <a-tag :color="statusColor(wo.status)" class="status-tag">{{ wo.status }}</a-tag>
              <a-dropdown :trigger="['click']">
                <a-button type="text" size="small" class="more-btn" @click.stop>
                  <EllipsisOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => onCardAction(key, wo)">
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
            <div class="card-meta">排产数量：{{ wo.scheduleQty }}</div>
            <div class="card-tags">
              <a-tag :color="urgencyTagColor(wo.urgency)" class="urgency-tag">
                {{ urgencyLabel(wo.urgency) }}
              </a-tag>
            </div>
            <a-checkbox
              class="card-checkbox"
              :checked="selectedIds.includes(wo.id)"
              @click.stop
              @change="(e) => toggleSelect(wo.id, e.target.checked)"
            />
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
          <a-button type="link" class="collapse-btn" @click="detailCollapsed = !detailCollapsed">
            {{ detailCollapsed ? '展开详情' : '收起详情' }}
            <UpOutlined v-if="!detailCollapsed" />
            <DownOutlined v-else />
          </a-button>
        </div>

        <a-form v-show="!detailCollapsed" layout="inline" class="basic-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="产品名称">
                <a-input :value="selectedOrder.productName" disabled />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="工作中心">
                <a-select
                  v-model:value="selectedOrder.workCenter"
                  :options="workCenterOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="BOM">
                <a-select
                  v-model:value="selectedOrder.bom"
                  show-search
                  :options="bomOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="预入仓库">
                <a-select
                  v-model:value="selectedOrder.warehouse"
                  :options="warehouseOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="紧急度">
                <a-select
                  v-model:value="selectedOrder.urgency"
                  :options="urgencyOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item label="计划日期">
                <a-range-picker v-model:value="planDateValue" @change="onPlanDateChange" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="selectedOrder.remark"
                  :rows="2"
                  placeholder="请输入备注"
                  @blur="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>

        <a-tabs v-model:activeKey="detailTab" class="detail-tabs">
          <a-tab-pane v-if="showDispatchTab" key="dispatch" tab="工单下发" />
          <a-tab-pane key="detail" tab="工单详情" />
          <a-tab-pane key="ebom" tab="EBOM" />
          <a-tab-pane key="current-bom" tab="当前BOM" />
          <a-tab-pane key="tasks" tab="任务列表" />
        </a-tabs>

        <WorkOrderDispatchTab
          v-if="detailTab === 'dispatch' && showDispatchTab"
          :work-order="selectedOrder"
          @dispatch="handleDispatch(false)"
          @dispatch-and-start="handleDispatch(true)"
          @cancel="handleDispatchCancel"
        />
        <a-empty
          v-else-if="detailTab !== 'dispatch'"
          description="该 Tab 为占位，后续扩展"
          class="tab-empty"
        />
      </div>

      <div v-else class="detail-card detail-empty">
        <a-empty description="请选择左侧工单" />
      </div>
    </div>

    <CreateWorkOrderModal v-model:open="createModalOpen" @created="onWorkOrderCreated" />

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
import { message } from 'ant-design-vue'
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
const urgencyModalOpen = ref(false)
const urgencyDraft = ref('普通')
const urgencyTargetId = ref(null)

const pagination = reactive({ current: 1, pageSize: 8 })

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
  const targets = workOrderState.orders.filter(
    (o) => selectedIds.value.includes(o.id) && o.status === '待下发',
  )
  if (!targets.length) {
    message.warning('请勾选状态为「待下发」的工单')
    return
  }
  for (const wo of targets) {
    if (!validateProcesses(wo.processes)) return
    updateWorkOrder(wo.id, { status: '已下发' })
  }
  message.success(`已批量下发 ${targets.length} 条工单`)
  selectedIds.value = []
}

function onBatchMenu({ key }) {
  if (key === 'import') message.info('批量导入功能开发中')
  else message.info('批量导出功能开发中')
}

function onCardAction(key, wo) {
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
  min-height: calc(100vh - 120px);
}

.filter-card,
.list-card,
.detail-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.filter-card {
  padding: 16px 20px 12px;
  margin-bottom: 12px;
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
      height: 32px;
      line-height: 32px;
      white-space: nowrap;

      &::after {
        margin-inline: 4px 8px;
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

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 82px;
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

.toolbar-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;

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

.master-detail {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-height: 560px;
}

.list-card {
  width: 26%;
  min-width: 260px;
  max-width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 280px);

  .list-title {
    padding: 14px 16px 10px;
    font-weight: 600;
    font-size: 15px;
    border-bottom: 1px solid #f0f0f0;
  }

  .list-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
  }

  .list-pagination {
    padding: 10px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
  }
}

.order-card {
  position: relative;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  background: #fff;
  transition: all 0.2s;
  border-left: 3px solid transparent;

  &:hover {
    border-color: #d6e4ff;
    box-shadow: 0 2px 8px rgba(22, 119, 255, 0.08);
  }

  &.active {
    border-color: #91caff;
    border-left-color: #1677ff;
    background: #f0f7ff;
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .status-tag {
      margin: 0;
    }

    .more-btn {
      padding: 0 4px;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .card-code {
    font-weight: 600;
    font-size: 14px;
    color: rgba(0, 0, 0, 0.88);
    margin-bottom: 4px;
  }

  .card-name {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    margin-bottom: 6px;
    line-height: 1.4;
  }

  .card-meta {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 20px;
  }

  .card-tags {
    margin-top: 8px;

    .urgency-tag {
      margin: 0;
      font-size: 12px;
    }
  }

  .card-checkbox {
    position: absolute;
    left: 8px;
    bottom: 8px;
    opacity: 0.6;
  }
}

.detail-card {
  flex: 1;
  min-width: 0;
  padding: 16px 20px 20px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;

    .detail-title {
      .code {
        font-size: 16px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.88);
        margin-right: 12px;
      }

      .name {
        font-size: 14px;
        color: rgba(0, 0, 0, 0.65);
      }
    }

    .collapse-btn {
      padding-right: 0;
      color: rgba(0, 0, 0, 0.45);
    }
  }

  .basic-form {
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  .detail-tabs {
    :deep(.ant-tabs-nav) {
      margin-bottom: 16px;
    }
  }

  .tab-empty {
    margin: 48px 0;
  }
}

.detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

@media (max-width: 992px) {
  .master-detail {
    flex-direction: column;
  }

  .list-card {
    width: 100%;
    max-width: none;
    max-height: 280px;
  }
}
</style>
