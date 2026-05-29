<template>
  <div class="work-order-page">
    <a-form :model="filters" class="filter-form" layout="inline">
      <a-row :gutter="[12, 12]" style="width: 100%">
        <a-col :xs="24" :sm="12" :md="5" :lg="4">
          <a-form-item label="工单编码">
            <a-input v-model:value="filters.code" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="5" :lg="4">
          <a-form-item label="工单名称">
            <a-input v-model:value="filters.name" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="4" :lg="3">
          <a-form-item label="状态">
            <a-select
              v-model:value="filters.status"
              allow-clear
              placeholder="全部"
              style="width: 100%"
            >
              <a-select-option v-for="s in statusOptions" :key="s" :value="s">{{
                s
              }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="6">
          <a-form-item label="创建日期">
            <a-range-picker v-model:value="filters.dateRange" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6" :lg="7">
          <a-form-item>
            <a-space wrap>
              <a-button type="primary" @click="handleSearch">查询</a-button>
              <a-button @click="handleReset">重置</a-button>
              <a-button type="primary" @click="createModalOpen = true">新增工单</a-button>
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
              <a-button type="primary" ghost @click="handleBatchDispatch">批量下发</a-button>
            </a-space>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="master-detail">
      <div class="order-list-panel">
        <div
          v-for="wo in pagedOrders"
          :key="wo.id"
          class="order-card"
          :class="{ active: selectedId === wo.id }"
          @click="selectOrder(wo.id)"
        >
          <div class="card-head">
            <a-checkbox
              :checked="selectedIds.includes(wo.id)"
              @click.stop
              @change="(e) => toggleSelect(wo.id, e.target.checked)"
            />
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
          <div class="card-row"><span class="label">工单编码</span>{{ wo.code }}</div>
          <div class="card-row"><span class="label">工单名称</span>{{ wo.name }}</div>
          <div class="card-row"><span class="label">排产数量</span>{{ wo.scheduleQty }}</div>
        </div>
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredOrders.length"
          size="small"
          show-size-changer
          class="list-pagination"
        />
      </div>

      <div v-if="selectedOrder" class="detail-panel">
        <a-form layout="vertical" class="basic-form">
          <a-row :gutter="16">
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
              <a-form-item label="产品名称">
                <a-input :value="selectedOrder.productName" disabled />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
              <a-form-item label="工作中心">
                <a-select
                  v-model:value="selectedOrder.workCenter"
                  :options="workCenterOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
              <a-form-item label="BOM">
                <a-select
                  v-model:value="selectedOrder.bom"
                  show-search
                  :options="bomOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
              <a-form-item label="预入仓库">
                <a-select
                  v-model:value="selectedOrder.warehouse"
                  :options="warehouseOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
              <a-form-item label="紧急度">
                <a-select
                  v-model:value="selectedOrder.urgency"
                  :options="urgencyOpts"
                  @change="saveBasicInfo"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8" :lg="6">
              <a-form-item label="计划日期">
                <a-range-picker
                  v-model:value="planDateValue"
                  style="width: 100%"
                  @change="onPlanDateChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注">
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

        <a-tabs v-model:activeKey="detailTab">
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
        />
        <a-empty v-else-if="detailTab !== 'dispatch'" description="该 Tab 为占位，后续扩展" />
      </div>
      <a-empty v-else class="detail-empty" description="请选择左侧工单" />
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
import { DownOutlined, EllipsisOutlined } from '@ant-design/icons-vue'
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

const filters = reactive({
  code: '',
  name: '',
  status: undefined,
  dateRange: null,
})
const appliedFilters = ref({ ...filters, dateRange: null })
const selectedId = ref(workOrderState.orders[0]?.id || null)
const selectedIds = ref([])
const detailTab = ref('dispatch')
const createModalOpen = ref(false)
const urgencyModalOpen = ref(false)
const urgencyDraft = ref('普通')
const urgencyTargetId = ref(null)

const pagination = reactive({ current: 1, pageSize: 8 })

const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = warehouseOptions.map((v) => ({ label: v, value: v }))
const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))
const bomOpts = bomOptions.map((v) => ({ label: v, value: v }))

const filteredOrders = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.dateRange?.length === 2) {
    f.dateRange = [f.dateRange[0].format('YYYY-MM-DD'), f.dateRange[1].format('YYYY-MM-DD')]
  }
  return filterWorkOrders(workOrderState.orders, f)
})

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
  filters.status = undefined
  filters.dateRange = null
  appliedFilters.value = { ...filters, dateRange: null }
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
  .filter-form {
    margin-bottom: 12px;
    padding-bottom: 4px;
    border-bottom: 1px solid #f0f0f0;
  }
}

.master-detail {
  display: flex;
  gap: 12px;
  min-height: 520px;
}

.order-list-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: calc(100vh - 220px);
  overflow-y: auto;
}

.order-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s;

  &:hover,
  &.active {
    border-color: #1677ff;
    background: #e6f4ff;
  }

  .card-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;

    .status-tag {
      flex: 1;
      margin: 0;
    }

    .more-btn {
      padding: 0 4px;
    }
  }

  .card-row {
    font-size: 12px;
    line-height: 22px;

    .label {
      color: rgba(0, 0, 0, 0.45);
      margin-right: 6px;
    }
  }
}

.list-pagination {
  margin-top: auto;
  text-align: center;
}

.detail-panel {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.basic-form {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 992px) {
  .master-detail {
    flex-direction: column;
  }

  .order-list-panel {
    width: 100%;
    max-height: 240px;
  }
}
</style>
