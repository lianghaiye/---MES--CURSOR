<template>
  <div class="production-plan">
    <a-form :model="filters" class="filter-form" layout="inline">
      <a-row :gutter="[12, 12]" style="width: 100%">
        <a-col :xs="24" :sm="12" :md="6" :lg="5">
          <a-form-item label="订单编号">
            <a-input v-model:value="filters.orderNo" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6" :lg="5">
          <a-form-item label="客户名称">
            <a-input v-model:value="filters.customerName" allow-clear placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6" :lg="4">
          <a-form-item label="紧急度">
            <a-select
              v-model:value="filters.urgency"
              allow-clear
              placeholder="全部"
              style="width: 100%"
            >
              <a-select-option value="紧急">紧急</a-select-option>
              <a-select-option value="加急">加急</a-select-option>
              <a-select-option value="普通">普通</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6" :lg="4">
          <a-form-item label="订单状态">
            <a-select
              v-model:value="filters.orderStatus"
              allow-clear
              placeholder="全部"
              style="width: 100%"
            >
              <a-select-option value="部分下达">部分下达</a-select-option>
              <a-select-option value="待下达">待下达</a-select-option>
              <a-select-option value="执行中">执行中</a-select-option>
              <a-select-option value="已完成">已完成</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="6" :lg="6">
          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearch">查询</a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="8">
          <a-form-item label="订单日期">
            <a-range-picker v-model:value="filters.orderDateRange" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :xs="24" :sm="12" :md="8" :lg="8">
          <a-form-item label="交付日期">
            <a-range-picker v-model:value="filters.deliveryDateRange" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="master-detail">
      <div class="order-list-panel">
        <div
          v-for="order in pagedOrders"
          :key="order.id"
          class="order-card"
          :class="{ active: selectedId === order.id }"
          @click="selectOrder(order.id)"
        >
          <div class="card-tags">
            <a-tag v-for="tag in order.tags" :key="tag" :color="tagColor(tag)">{{ tag }}</a-tag>
          </div>
          <div class="card-row"><span class="label">订单编号</span>{{ order.orderNo }}</div>
          <div class="card-row"><span class="label">客户名称</span>{{ order.customerName }}</div>
          <div class="card-row"><span class="label">产品数量</span>{{ order.productQty }}</div>
          <div class="card-row"><span class="label">业务员</span>{{ order.salesperson }}</div>
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

      <div v-if="selectedOrder" class="detail-panel" :class="{ 'is-fullscreen': detailFullscreen }">
        <template v-if="!detailFullscreen">
          <div class="detail-header">
            <div>
              <h3>{{ selectedOrder.orderNo }} · {{ selectedOrder.customerName }}</h3>
              <a-space>
                <a-tag color="blue">距离交付还剩 {{ selectedOrder.daysToDelivery }} 天</a-tag>
                <a-tag v-for="tag in selectedOrder.tags" :key="tag" :color="tagColor(tag)">
                  {{ tag }}
                </a-tag>
              </a-space>
            </div>
            <a-space :size="0" class="detail-header-actions">
              <a-button type="link" @click="detailCollapsed = !detailCollapsed">
                {{ detailCollapsed ? '展开详情' : '收起详情' }}
              </a-button>
              <a-button type="link" @click="toggleDetailFullscreen">全屏</a-button>
            </a-space>
          </div>

          <a-descriptions
            v-show="!detailCollapsed"
            :column="4"
            size="small"
            bordered
            class="info-grid"
          >
            <a-descriptions-item label="所属区域">{{ selectedOrder.region }}</a-descriptions-item>
            <a-descriptions-item label="结算类型">{{
              selectedOrder.settlementType
            }}</a-descriptions-item>
            <a-descriptions-item label="送货方式">{{
              selectedOrder.deliveryMethod
            }}</a-descriptions-item>
            <a-descriptions-item label="业务员">{{
              selectedOrder.salesperson
            }}</a-descriptions-item>
            <a-descriptions-item label="订单日期">{{
              selectedOrder.orderDate
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="3">{{
              selectedOrder.remark || '-'
            }}</a-descriptions-item>
          </a-descriptions>
        </template>

        <div v-else class="fullscreen-toolbar">
          <a-button type="link" @click="toggleDetailFullscreen">退出全屏</a-button>
        </div>

        <a-tabs v-model:activeKey="detailTab">
          <a-tab-pane key="work" tab="工作项" />
          <a-tab-pane key="stats" tab="合并统计" />
          <a-tab-pane key="orders" tab="所有工单" />
          <a-tab-pane key="log" tab="操作日志" />
        </a-tabs>

        <template v-if="detailTab === 'work'">
          <a-table
            :columns="workColumns"
            :data-source="selectedOrder.workItems"
            :pagination="false"
            row-key="id"
            size="small"
            bordered
            :scroll="{ x: workTableScrollX }"
            :row-class-name="workItemRowClassName"
            :custom-row="workItemCustomRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="record.status === '进行中' ? 'processing' : 'default'">
                  {{ record.status }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'deliveryMode'">
                <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
                  {{ record.deliveryMode || '整机' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'stockQty'">
                <a-input-number
                  v-model:value="record.stockQty"
                  size="small"
                  :min="0"
                  :precision="3"
                  style="width: 100%"
                  @change="onWorkItemStockChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'planQty'">
                <a-input-number
                  v-model:value="record.planQty"
                  size="small"
                  :min="0"
                  :precision="3"
                  style="width: 100%"
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <a-space @click.stop>
                  <a-button type="link" size="small" @click="toggleWorkItemExpand(record)">
                    {{ expandedWorkItemId === record.id ? '收起' : '展开' }}
                  </a-button>
                  <a-button type="link" size="small" danger>终止</a-button>
                </a-space>
              </template>
              <template
                v-else-if="
                  column.key === 'specModel' ||
                  column.key === 'techParams' ||
                  column.key === 'packagingForm'
                "
              >
                <span class="ellipsis-cell">{{ record[column.dataIndex] || '—' }}</span>
              </template>
            </template>
          </a-table>

          <div class="action-row">
            <a-space wrap>
              <span>计划总装日期</span>
              <a-date-picker
                :value="planAssemblyDateValue"
                size="small"
                allow-clear
                @change="onPlanAssemblyDateChange"
              />
              <span>计划完成日期</span>
              <a-date-picker
                :value="planCompleteDateValue"
                size="small"
                allow-clear
                @change="onPlanCompleteDateChange"
              />
              <span>调整紧急度</span>
              <a-select style="width: 100px" placeholder="选择" />
              <a-button type="primary" @click="generatePurchaseReq">生成采购申请</a-button>
              <a-button type="primary" @click="openWorkOrderModal">生成加工工单</a-button>
              <a-button type="primary">生成外协工单</a-button>
            </a-space>
          </div>

          <div v-if="activeWorkItem && materialTree.length" class="ebom-panel-title">
            物料树 · {{ activeWorkItem.productName }}
            <span class="ebom-sub">{{ activeWorkItem.productCode }}</span>
          </div>
          <a-empty
            v-if="!materialTree.length"
            description="请点击产品明细行查看 EBOM 物料树"
            class="ebom-empty"
          />
          <template v-else>
            <div class="table-mini-toolbar">
              <a-space :size="4" class="toolbar-icons">
                <TableColumnSettingButton @click="materialColumnDrawerOpen = true" />
              </a-space>
            </div>
            <a-table
              :columns="materialDisplayColumns"
              :data-source="materialTree"
              :pagination="false"
              row-key="id"
              size="small"
              bordered
              :scroll="{ x: materialTableScrollX }"
              :default-expand-all-rows="true"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="materialStatusColor(record.status)">{{ record.status }}</a-tag>
                </template>
                <template v-else-if="column.key === 'joinPlan'">
                  <a-tag :color="record.joinPlan === '是' ? 'success' : 'default'">
                    {{ record.joinPlan }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'supplyType'">
                  <a-tag :color="record.supplyType === '自制件' ? 'blue' : 'default'">
                    {{ record.supplyType }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </template>
        </template>
        <a-empty v-else description="该 Tab 为占位，后续扩展" style="margin: 48px 0" />
      </div>
      <a-empty v-else class="detail-empty" description="请选择左侧订单" />
    </div>

    <GenerateWorkOrderModal
      v-model:open="workOrderModalOpen"
      :order="selectedOrder"
      :materials="selfMadeMaterials"
      @save="handleWorkOrderSave"
    />

    <TableColumnSettingDrawer
      v-model:open="materialColumnDrawerOpen"
      v-model:settings="materialColumnSettings"
      :default-settings="materialDefaultColumnSettings"
    />
  </div>
</template>

<script>
export default {
  name: 'ProductionPlanView',
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { productionPlanState, filterProductionPlans } from '@/store/productionPlanStore'
import GenerateWorkOrderModal from './components/GenerateWorkOrderModal.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { addWorkOrdersFromPlanRows } from '@/store/workOrderStore'
import {
  getSelfMadeMaterials,
  getPurchasedMaterials,
  updateMaterialInOrder,
  patchMaterialFromWorkOrderRow,
  calcDemandQty,
  calcGapQty,
} from '@/utils/material'
import { calcDefaultPlanQty } from '@/utils/productionPlanWorkItem'
import {
  addPurchaseRequisition,
  buildRequisitionFromMaterials,
} from '@/store/purchaseRequisitionStore'

const filters = reactive({
  orderNo: '',
  customerName: '',
  urgency: undefined,
  orderStatus: undefined,
  orderDateRange: null,
  deliveryDateRange: null,
})

const appliedFilters = ref({ ...filters })
const selectedId = ref(productionPlanState.plans[0]?.id || null)
const expandedWorkItemId = ref(null)
const detailCollapsed = ref(false)
const detailFullscreen = ref(false)
const detailTab = ref('work')
const workOrderModalOpen = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 5,
})

const workColumns = [
  { title: '状态', key: 'status', dataIndex: 'status', width: 80, fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '交付方式', key: 'deliveryMode', dataIndex: 'deliveryMode', width: 88 },
  { title: '订单数量', dataIndex: 'orderQty', width: 88, align: 'right' },
  { title: '库存数量', key: 'stockQty', width: 100, align: 'right' },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
  { title: '已发货数量', dataIndex: 'shippedQty', width: 96, align: 'right' },
  { title: '交付日期', dataIndex: 'deliveryDate', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '技术参数', key: 'techParams', dataIndex: 'techParams', width: 100, ellipsis: true },
  {
    title: '包装方式',
    key: 'packagingForm',
    dataIndex: 'packagingForm',
    width: 88,
    ellipsis: true,
  },
  { title: '操作', key: 'action', width: 110, fixed: 'right' },
]

const workTableScrollX = computed(() =>
  workColumns.reduce((sum, col) => sum + (col.width || 80), 0),
)

const materialBaseColumns = [
  { title: '状态', key: 'status', dataIndex: 'status', width: 90, fixed: 'left' },
  { title: '物料名称', dataIndex: 'name', width: 140, ellipsis: true, fixed: 'left' },
  { title: '物料编码', dataIndex: 'code', width: 120 },
  { title: '规格型号', dataIndex: 'spec', width: 120 },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '物料类型', dataIndex: 'type', width: 90 },
  { title: '单位用量', dataIndex: 'unitUsage', width: 90 },
  { title: '计量单位', dataIndex: 'unit', width: 90 },
  { title: '供应型态', key: 'supplyType', dataIndex: 'supplyType', width: 100 },
  { title: '库存数量', dataIndex: 'stockQty', width: 90 },
  { title: '可用库存', dataIndex: 'availableStock', width: 90 },
  { title: '在途库存', dataIndex: 'inTransitQty', width: 90 },
  { title: '需求数', dataIndex: 'demandQty', width: 80 },
  { title: '缺口数', dataIndex: 'gapQty', width: 80 },
  { title: '计划数', dataIndex: 'planQty', width: 80 },
  { title: '参与计划', key: 'joinPlan', dataIndex: 'joinPlan', width: 90 },
  { title: '供方单位', dataIndex: 'supplier', width: 100, ellipsis: true },
  { title: '工艺路线', dataIndex: 'processRoute', width: 110, ellipsis: true },
  { title: '工艺文件', dataIndex: 'processFile', width: 100, ellipsis: true },
  { title: '标准生产周期', dataIndex: 'standardCycle', width: 110 },
  { title: '最晚处理时间', dataIndex: 'latestProcessTime', width: 120 },
  { title: '补充说明', dataIndex: 'remark', width: 120, ellipsis: true },
]

const {
  columnSettings: materialColumnSettings,
  columnDrawerOpen: materialColumnDrawerOpen,
  displayColumns: materialDisplayColumns,
  tableScrollX: materialTableScrollX,
  defaultColumnSettings: materialDefaultColumnSettings,
} = useTableColumnSettings('production-plan-material-tree', materialBaseColumns, {
  minScrollX: 3200,
})

const filteredOrders = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.orderDateRange?.length === 2) {
    f.orderDateRange = [
      f.orderDateRange[0].format('YYYY-MM-DD'),
      f.orderDateRange[1].format('YYYY-MM-DD'),
    ]
  }
  if (f.deliveryDateRange?.length === 2) {
    f.deliveryDateRange = [
      f.deliveryDateRange[0].format('YYYY-MM-DD'),
      f.deliveryDateRange[1].format('YYYY-MM-DD'),
    ]
  }
  return filterProductionPlans(productionPlanState.plans, f)
})

const pagedOrders = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})

const selectedOrder = computed(() => filteredOrders.value.find((o) => o.id === selectedId.value))

const activeWorkItem = computed(() => {
  const order = selectedOrder.value
  if (!order?.workItems?.length || !expandedWorkItemId.value) return null
  return order.workItems.find((w) => w.id === expandedWorkItemId.value) || null
})

const materialTree = computed(() => activeWorkItem.value?.materials || [])

const selfMadeMaterials = computed(() =>
  selectedOrder.value ? getSelfMadeMaterials(selectedOrder.value) : [],
)

const purchasedMaterials = computed(() =>
  selectedOrder.value ? getPurchasedMaterials(selectedOrder.value) : [],
)

const planAssemblyDateValue = computed(() => {
  const order = selectedOrder.value
  if (!order) return null
  const date = order.planAssemblyDate || order.workItems?.[0]?.deliveryDate || order.deliveryDate
  return date ? dayjs(date) : null
})

const planCompleteDateValue = computed(() => {
  const order = selectedOrder.value
  if (!order) return null
  const date = order.planCompleteDate || order.deliveryDate
  return date ? dayjs(date) : null
})

function onPlanAssemblyDateChange(date) {
  if (!selectedOrder.value) return
  selectedOrder.value.planAssemblyDate = date ? date.format('YYYY-MM-DD') : ''
}

function onPlanCompleteDateChange(date) {
  if (!selectedOrder.value) return
  selectedOrder.value.planCompleteDate = date ? date.format('YYYY-MM-DD') : ''
}

function refreshWorkItemMaterials(wi, order) {
  const baseQty = wi.orderQty ?? wi.salesQty ?? order?.productQty ?? 0
  const walk = (nodes) => {
    nodes?.forEach((m) => {
      m.demandQty = calcDemandQty(m.unitUsage, baseQty)
      m.gapQty = calcGapQty(m.demandQty, m.availableStock)
      if (m.planQty == null) m.planQty = m.gapQty
      if (m.children?.length) walk(m.children)
    })
  }
  walk(wi.materials)
}

function selectWorkItem(record) {
  const order = selectedOrder.value
  if (!order || !record) return
  expandedWorkItemId.value = record.id
  order.workItems?.forEach((w) => {
    w.expanded = w.id === record.id
  })
  refreshWorkItemMaterials(record, order)
}

function collapseWorkItem() {
  expandedWorkItemId.value = null
  selectedOrder.value?.workItems?.forEach((w) => {
    w.expanded = false
  })
}

function workItemRowClassName(record) {
  return expandedWorkItemId.value === record.id ? 'work-item-row-active' : 'work-item-row'
}

function workItemCustomRow(record) {
  return {
    onClick: () => selectWorkItem(record),
  }
}

function onWorkItemStockChange(record) {
  record.planQty = calcDefaultPlanQty(record.orderQty, record.stockQty)
  const order = selectedOrder.value
  if (order && expandedWorkItemId.value === record.id) {
    refreshWorkItemMaterials(record, order)
  }
}

watch(selectedOrder, (order) => {
  if (!order) {
    expandedWorkItemId.value = null
    return
  }
  const items = order.workItems || []
  if (!items.length) {
    expandedWorkItemId.value = null
    return
  }
  const current = items.find((w) => w.id === expandedWorkItemId.value)
  if (!current) {
    const preferred = items.find((w) => w.expanded) || items[0]
    if (preferred) selectWorkItem(preferred)
    return
  }
  selectWorkItem(current)
})

function toggleWorkItemExpand(record) {
  if (expandedWorkItemId.value === record.id) {
    collapseWorkItem()
    return
  }
  selectWorkItem(record)
}

watch(filteredOrders, (list) => {
  if (!list.find((o) => o.id === selectedId.value)) {
    selectedId.value = list[0]?.id || null
  }
})

function materialStatusColor(status) {
  const map = {
    待下达: 'warning',
    不转产: 'default',
    进行中: 'processing',
    已完成: 'success',
  }
  return map[status] || 'default'
}

function openWorkOrderModal() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  if (!selfMadeMaterials.value.length) {
    message.info('当前订单没有供应型态为「自制件」的物料')
  }
  workOrderModalOpen.value = true
}

function generatePurchaseReq() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  const materials = purchasedMaterials.value
  if (!materials.length) {
    message.info('当前订单没有需要采购的外购件（缺口为 0）')
    return
  }
  const requisition = buildRequisitionFromMaterials(materials, selectedOrder.value)
  addPurchaseRequisition(requisition)
  message.success(`已生成采购申请 ${requisition.reqNo}，共 ${materials.length} 条物料`)
}

function handleWorkOrderSave(savedRows) {
  const order = productionPlanState.plans.find((o) => o.id === selectedId.value)
  if (!order) return
  savedRows.forEach((row) => {
    updateMaterialInOrder(order, row.materialId, patchMaterialFromWorkOrderRow(row))
  })
  const created = addWorkOrdersFromPlanRows(savedRows, order)
  if (created.length) {
    message.success(`已同步 ${created.length} 条工单至生产工单`)
  }
}

function tagColor(tag) {
  if (tag.includes('逾期')) return 'error'
  if (tag.includes('完成')) return 'success'
  if (tag.includes('部分') || tag.includes('生产')) return 'warning'
  return 'default'
}

function selectOrder(id) {
  selectedId.value = id
  expandedWorkItemId.value = null
}

function toggleDetailFullscreen() {
  detailFullscreen.value = !detailFullscreen.value
}

function onFullscreenKeydown(event) {
  if (event.key === 'Escape' && detailFullscreen.value) {
    detailFullscreen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onFullscreenKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onFullscreenKeydown)
})

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.orderNo = ''
  filters.customerName = ''
  filters.urgency = undefined
  filters.orderStatus = undefined
  filters.orderDateRange = null
  filters.deliveryDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}
</script>

<style lang="less" scoped>
.table-mini-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.production-plan {
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
  transition: all 0.2s;
  background: #fafafa;

  &:hover,
  &.active {
    border-color: #1677ff;
    background: #e6f4ff;
  }

  .card-tags {
    margin-bottom: 8px;
  }

  .card-row {
    font-size: 12px;
    line-height: 22px;
    color: rgba(0, 0, 0, 0.85);

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

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #fff;
    padding: 16px 20px 20px;
    overflow: auto;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.detail-header-actions {
  flex-shrink: 0;
}

.fullscreen-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }
}

.info-grid {
  margin-bottom: 12px;
}

.action-row {
  margin: 12px 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ebom-panel-title {
  margin: 12px 0 8px;
  font-weight: 600;
  font-size: 13px;

  .ebom-sub {
    margin-left: 8px;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.45);
  }
}

.ebom-empty {
  margin: 16px 0 8px;
}

:deep(.work-item-row) {
  cursor: pointer;
}

:deep(.work-item-row-active) {
  cursor: pointer;
  background: #e6f4ff !important;

  > td {
    background: #e6f4ff !important;
  }
}

.ellipsis-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 992px) {
  .master-detail {
    flex-direction: column;
  }

  .order-list-panel {
    width: 100%;
    max-height: 240px;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .order-card {
    width: calc(50% - 4px);
  }
}
</style>
