<template>
  <div class="sales-order-page">
    <!-- 筛选区 -->
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售单号">
              <a-input v-model:value="filters.orderNo" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="合同编号">
              <a-input v-model:value="filters.contractNo" allow-clear placeholder="请输入" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户名称">
              <a-select
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="customerOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="订单来源">
              <a-select
                v-model:value="filters.orderSource"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="orderSourceOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="业务员">
              <a-select
                v-model:value="filters.salesperson"
                allow-clear
                placeholder="请选择"
                size="small"
                show-search
                :options="salespersonOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="发货状态">
              <a-select
                v-model:value="filters.deliveryStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="deliveryStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item label="单据日期">
              <a-range-picker v-model:value="filters.documentDateRange" size="small" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="10">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">
                  清空
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreateModal">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleApprove">
          <CheckOutlined />
          审核
        </a-button>
        <a-button size="small" @click="stubAction('完成')">
          <CheckCircleOutlined />
          完成
        </a-button>
        <a-button size="small" @click="stubAction('删除')">
          <DeleteOutlined />
          删除
        </a-button>
        <a-button size="small" @click="openDeliveryModal">
          <FileTextOutlined />
          申请发货
        </a-button>
        <a-button size="small" @click="stubAction('打印')">
          <PrinterOutlined />
          打印
        </a-button>
        <a-dropdown>
          <a-button size="small">
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onBatchMenuClick">
              <a-menu-item key="批量导出">批量导出</a-menu-item>
              <a-menu-item key="批量审核">批量审核</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-button size="small" @click="stubAction('终止')">
          <CloseCircleOutlined />
          终止
        </a-button>
        <a-button size="small" @click="stubAction('需求计算')">需求计算</a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="列设置">
          <a-button type="text" size="small" @click="stubAction('列设置')">
            <SettingOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <!-- 汇总条 -->
    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredOrders.length }} 条数据，总计销售数量：{{ summary.totalQty }}，总计销售金额含税：￥{{
            summary.amountInTax.toFixed(2)
          }}元，不含税：￥{{ summary.amountExTax.toFixed(2) }}元。
        </span>
      </template>
    </a-alert>

    <!-- 表格 -->
    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedOrders"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 2200 }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'orderNo'">
            <a class="link-code">{{ record.orderNo }}</a>
          </template>
          <template v-else-if="column.key === 'progressStatus'">
            <a-tag :color="progressColor(record.progressStatus)">{{ record.progressStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'urgency'">
            {{ record.urgency }}
          </template>
          <template v-else-if="column.key === 'inventoryStatus'">
            <a-tag :color="record.inventoryStatus === '缺货' ? 'error' : 'success'">
              {{ record.inventoryStatus }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="canEditSalesOrder(record)" :size="0">
              <a-button type="link" size="small" @click="openEditModal(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record)">删除</a-button>
            </a-space>
            <span v-else class="action-disabled">-</span>
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredOrders.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <CreateSalesOrderModal
      v-model:open="createModalOpen"
      :edit-record="editRecord"
      @saved="onOrderSaved"
    />

    <ApplyDeliveryModal
      v-model:open="deliveryModalOpen"
      :sales-order="deliveryOrder"
      @confirmed="onDeliveryConfirmed"
    />
  </div>
</template>

<script>
export default { name: 'SalesOrderView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  SettingOutlined,
  DownOutlined,
  CheckOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PrinterOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons-vue'
import { filterSalesOrders } from '@/mock/salesOrders'
import {
  salesOrderState,
  addSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  recalcOrderAmounts,
  approveSalesOrder,
  canEditSalesOrder,
} from '@/store/salesOrderStore'
import {
  customerOptions,
  orderSourceOptions,
  deliveryStatusOptions,
  salespersonOptions,
} from '@/mock/salesOrderOptions'
import CreateSalesOrderModal from './components/CreateSalesOrderModal.vue'
import ApplyDeliveryModal from './components/ApplyDeliveryModal.vue'

const filters = reactive({
  orderNo: '',
  contractNo: '',
  customerName: undefined,
  orderSource: undefined,
  salesperson: undefined,
  deliveryStatus: undefined,
  documentDateRange: null,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const createModalOpen = ref(false)
const deliveryModalOpen = ref(false)
const editRecord = ref(null)
const deliveryOrder = ref(null)
const pagination = reactive({ current: 1, pageSize: 10 })

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const orderSourceOpts = orderSourceOptions.map((v) => ({ label: v, value: v }))
const deliveryStatusOpts = deliveryStatusOptions.map((v) => ({ label: v, value: v }))
const salespersonOpts = salespersonOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '销售单号', key: 'orderNo', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '合同编号', dataIndex: 'contractNo', width: 130, ellipsis: true },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '订单来源', dataIndex: 'orderSource', width: 100 },
  { title: '所属区域', dataIndex: 'region', width: 90 },
  { title: '业务员', dataIndex: 'salesperson', width: 90 },
  { title: '发货状态', dataIndex: 'deliveryStatus', width: 90 },
  { title: '进度状态', key: 'progressStatus', dataIndex: 'progressStatus', width: 90 },
  { title: '业务类型', dataIndex: 'businessType', width: 90 },
  { title: '采购申请单号', dataIndex: 'purchaseRequisitionNo', width: 160, ellipsis: true },
  { title: '销售渠道', dataIndex: 'salesChannel', width: 90 },
  { title: '状态', dataIndex: 'status', width: 70 },
  { title: '单据日期', dataIndex: 'documentDate', width: 110 },
  { title: '提醒日期', dataIndex: 'reminderDate', width: 110 },
  { title: '紧急度', key: 'urgency', dataIndex: 'urgency', width: 80 },
  { title: '备注', dataIndex: 'remark', width: 100, ellipsis: true },
  { title: '库存状态', key: 'inventoryStatus', dataIndex: 'inventoryStatus', width: 90 },
  { title: '总发数', dataIndex: 'totalIssuedQty', width: 80, align: 'right' },
  { title: '结算类型', dataIndex: 'settlementType', width: 90 },
  { title: '付款比例', dataIndex: 'paymentRatio', width: 90 },
  { title: '首付/定金金额', dataIndex: 'downPaymentAmount', width: 120, align: 'right' },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

const filteredOrders = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.documentDateRange?.length === 2) {
    f.documentDateRange = [
      f.documentDateRange[0].format('YYYY-MM-DD'),
      f.documentDateRange[1].format('YYYY-MM-DD'),
    ]
  } else {
    f.documentDateRange = null
  }
  return filterSalesOrders(salesOrderState.orders, f)
})

const pagedOrders = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})

const summary = computed(() => {
  const list = filteredOrders.value
  return {
    totalQty: list.reduce((s, o) => s + (Number(o.totalQty) || 0), 0),
    amountInTax: list.reduce((s, o) => s + (Number(o.amountInTax) || 0), 0),
    amountExTax: list.reduce((s, o) => s + (Number(o.amountExTax) || 0), 0),
  }
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function progressColor(status) {
  const map = { 已审: 'processing', 未审: 'default', 已完成: 'success', 已终止: 'error' }
  return map[status] || 'default'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.orderNo = ''
  filters.contractNo = ''
  filters.customerName = undefined
  filters.orderSource = undefined
  filters.salesperson = undefined
  filters.deliveryStatus = undefined
  filters.documentDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function onBatchMenuClick({ key }) {
  if (key === '批量审核') {
    handleApprove()
    return
  }
  stubAction(key)
}

function handleApprove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要审核的销售订单')
    return
  }

  const targets = salesOrderState.orders.filter((o) => selectedRowKeys.value.includes(o.id))
  const pending = targets.filter((o) => o.progressStatus === '未审')
  if (!pending.length) {
    message.warning('所选订单均已审核')
    return
  }

  const count = pending.length
  Modal.confirm({
    title: count > 1 ? `已选择 ${count} 条订单` : undefined,
    content: '审核通过？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      const results = pending.map((o) => approveSalesOrder(o.id))
      const succeeded = results.filter((r) => r.ok)
      const failed = results.filter((r) => !r.ok)
      const withPr = succeeded.filter((r) => r.purchaseReqNo)
      const withPlan = succeeded.filter((r) => r.planOrderNo)

      if (withPr.length === 1) {
        message.success(withPr[0].message)
      } else if (withPlan.length === 1) {
        message.success(withPlan[0].message)
      } else if (withPr.length > 1) {
        message.success(
          `已审核 ${succeeded.length} 条，其中 ${withPr.length} 条外购销售已自动生成采购申请`,
        )
      } else if (withPlan.length > 1) {
        message.success(
          `已审核 ${succeeded.length} 条，其中 ${withPlan.length} 条自产销售已自动生成生产计划`,
        )
      } else if (succeeded.length === 1) {
        message.success(succeeded[0].message)
      } else if (succeeded.length > 1) {
        message.success(`已成功审核 ${succeeded.length} 条销售订单，进度状态已变更为已审`)
      }

      failed.forEach((r) => message.warning(r.message))
      selectedRowKeys.value = []
    },
  })
}

function openCreateModal() {
  editRecord.value = null
  createModalOpen.value = true
}

function openEditModal(record) {
  if (!canEditSalesOrder(record)) {
    message.warning('已审核的销售订单不可编辑')
    return
  }
  editRecord.value = record
  createModalOpen.value = true
}

function openDeliveryModal() {
  if (selectedRowKeys.value.length !== 1) {
    message.warning('请勾选一条销售订单后再申请发货')
    return
  }
  deliveryOrder.value = salesOrderState.orders.find((o) => o.id === selectedRowKeys.value[0])
  if (!deliveryOrder.value) {
    message.warning('未找到所选订单')
    return
  }
  deliveryModalOpen.value = true
}

function onOrderSaved({ isEdit, id, data }) {
  if (isEdit) {
    const existing = salesOrderState.orders.find((o) => o.id === id)
    if (!canEditSalesOrder(existing)) {
      message.warning('已审核的销售订单不可编辑')
      return
    }
    updateSalesOrder(id, data)
  } else {
    addSalesOrder({ ...data, id: `so-${Date.now()}` })
    recalcOrderAmounts(salesOrderState.orders[0])
  }
}

function onDeliveryConfirmed() {
  message.success('发货申请已记录')
}

function confirmDelete(record) {
  if (!canEditSalesOrder(record)) {
    message.warning('已审核的销售订单不可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除销售订单「${record.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteSalesOrder(record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.sales-order-page {
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

  .toolbar-icons {
    color: rgba(0, 0, 0, 0.45);
  }
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
}

.action-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
