<template>
  <div class="outbound-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="项目编号">
              <a-input v-model:value="filters.projectNo" allow-clear placeholder="请输入 项目编号" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库单号">
              <a-input v-model:value="filters.docNo" allow-clear placeholder="请输入 出库单号" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库类型">
              <a-select
                v-model:value="filters.outboundType"
                allow-clear
                placeholder="请选择 出库类型"
                size="small"
                :options="outboundTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品类型">
              <a-select
                v-model:value="filters.itemType"
                allow-clear
                placeholder="请选择 物品类型"
                size="small"
                :options="itemTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="出库仓库">
              <a-select
                v-model:value="filters.warehouse"
                allow-clear
                placeholder="请选择 出库仓库"
                size="small"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="经手人">
              <a-select
                v-model:value="filters.handler"
                allow-clear
                show-search
                placeholder="请选择 经手人"
                size="small"
                :options="handlerOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="领用部门">
              <a-select
                v-model:value="filters.requisitionDept"
                allow-clear
                placeholder="请选择 领用部门"
                size="small"
                :options="requisitionDeptOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="源单编号">
              <a-input v-model:value="filters.sourceOrderNo" allow-clear placeholder="请输入 源单编号" size="small" />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择 状态"
                size="small"
                :options="statusOpts"
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
                <a-button size="small" @click="handleReset">
                  <DeleteOutlined />
                  清空
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="stubAction('新增')">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleConfirmOutbound">
          <CheckOutlined />
          确认出库
        </a-button>
        <a-button size="small" @click="stubAction('生成采购单')">
          <CheckOutlined />
          生成采购单
        </a-button>
        <a-button size="small" @click="handleBatchDelete">
          <DeleteOutlined />
          删除
        </a-button>
        <a-button size="small" @click="stubAction('打印')">
          <PrinterOutlined />
          打印
        </a-button>
        <a-dropdown>
          <a-button size="small" @click.prevent>
            批量操作
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="({ key }) => stubAction(`批量操作：${key}`)">
              <a-menu-item key="export">导出</a-menu-item>
              <a-menu-item key="import">导入</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-button size="small" type="primary" ghost @click="handleBatchInitiateQc">
          发起出厂质检
        </a-button>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 2200 }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'docNo'">
            <a class="link-code">{{ record.docNo }}</a>
          </template>
          <template v-else-if="column.key === 'sourceOrderNo'">
            <a v-if="record.sourceOrderNo" class="link-code">{{ record.sourceOrderNo }}</a>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'totalWeight'">
            {{ record.totalWeight != null ? record.totalWeight : '' }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0" wrap>
              <a-button type="link" size="small" @click="stubAction('编辑')">编辑</a-button>
              <a-button type="link" size="small" @click="stubAction('审批')">审批</a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record)">删除</a-button>
              <a-button
                v-if="canInitiateFactoryQc(record)"
                type="link"
                size="small"
                @click="handleInitiateQc(record)"
              >
                {{ initiateQcActionLabel(record) }}
              </a-button>
            </a-space>
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
  </div>
</template>

<script>
export default { name: 'OutboundManagementView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CheckOutlined,
  PrinterOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { filterOutboundOrders } from '@/mock/outboundOrders'
import {
  outboundTypeOptions,
  itemTypeOptions,
  outboundStatusOptions,
  warehouseOptions,
  handlerOptions,
  requisitionDeptOptions,
} from '@/mock/outboundOptions'
import {
  outboundState,
  confirmOutbound,
  deleteOutboundOrder,
  initiateFactoryQcFromOutbound,
  canInitiateFactoryQc,
} from '@/store/outboundStore'
import { getFactoryQcById, qcResultBlocksOutbound } from '@/store/factoryQcStore'

const filters = reactive({
  projectNo: '',
  docNo: '',
  outboundType: undefined,
  itemType: undefined,
  warehouse: undefined,
  handler: undefined,
  requisitionDept: undefined,
  sourceOrderNo: '',
  status: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const outboundTypeOpts = outboundTypeOptions.map((v) => ({ label: v, value: v }))
const itemTypeOpts = itemTypeOptions.map((v) => ({ label: v, value: v }))
const statusOpts = outboundStatusOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = warehouseOptions.map((w) => ({ label: w.label, value: w.value }))
const handlerOpts = handlerOptions.map((v) => ({ label: v, value: v }))
const requisitionDeptOpts = requisitionDeptOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '出库单号', key: 'docNo', dataIndex: 'docNo', width: 150, fixed: 'left' },
  { title: '出库类型', dataIndex: 'outboundType', width: 100 },
  { title: '出库仓库', dataIndex: 'warehouse', width: 90 },
  { title: '经手人', dataIndex: 'handler', width: 80 },
  { title: '领用部门', dataIndex: 'requisitionDept', width: 100, ellipsis: true },
  { title: '源单编号', key: 'sourceOrderNo', width: 140 },
  { title: '出库总重量(kg)', key: 'totalWeight', width: 120, align: 'right' },
  { title: '状态', key: 'status', width: 90 },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
  { title: '完成日期', dataIndex: 'completedAt', width: 110 },
  { title: '审核日期', dataIndex: 'auditDate', width: 110 },
  { title: '仓管员', dataIndex: 'warehouseKeeper', width: 80 },
  { title: '所在车间', dataIndex: 'workshop', width: 100 },
  { title: '备注', dataIndex: 'remark', width: 100, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 80 },
  { title: '操作', key: 'action', width: 260, fixed: 'right' },
]

const filteredList = computed(() =>
  filterOutboundOrders(outboundState.orders, appliedFilters.value),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function statusColor(status) {
  if (status === '已出库') return 'success'
  return 'processing'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, {
    projectNo: '',
    docNo: '',
    outboundType: undefined,
    itemType: undefined,
    warehouse: undefined,
    handler: undefined,
    requisitionDept: undefined,
    sourceOrderNo: '',
    status: undefined,
  })
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function stubAction(name) {
  message.info(`${name}功能开发中`)
}

function initiateQcActionLabel(record) {
  const qc = getFactoryQcById(record?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
}

function handleConfirmOutbound() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择出库单')
    return
  }
  const { count, blocked } = confirmOutbound(selectedRowKeys.value)
  const qcBlocked = blocked.filter((b) => b.qcBlocked)
  if (qcBlocked.length) {
    Modal.warning({
      title: '无法确认出库',
      content: '出厂质检结果不符合出库要求，请重新发起出厂质检',
    })
  }
  const otherBlocked = blocked.filter((b) => !b.qcBlocked)
  if (otherBlocked.length) {
    message.warning(otherBlocked.map((b) => `${b.docNo}: ${b.message}`).slice(0, 3).join('；'))
  }
  if (count > 0) {
    message.success(`已确认出库 ${count} 条`)
    selectedRowKeys.value = []
  } else if (!qcBlocked.length && !otherBlocked.length) {
    message.warning('所选单据均已出库或无效')
  }
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要删除的出库单')
    return
  }
  Modal.confirm({
    title: '确认删除所选出库单？',
    onOk: () => {
      let n = 0
      selectedRowKeys.value.forEach((id) => {
        if (deleteOutboundOrder(id)) n += 1
      })
      message.success(`已删除 ${n} 条`)
      selectedRowKeys.value = []
    },
  })
}

function confirmDelete(record) {
  Modal.confirm({
    title: `确认删除出库单 ${record.docNo}？`,
    onOk: () => {
      if (deleteOutboundOrder(record.id)) {
        message.success('已删除')
        selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      }
    },
  })
}

function handleInitiateQc(record) {
  const result = initiateFactoryQcFromOutbound(record.id)
  if (result.ok) {
    message.success(result.message || '已在出厂质检生成待质检记录')
  } else {
    message.warning(result.message)
  }
}

function handleBatchInitiateQc() {
  const ids = selectedRowKeys.value.length
    ? selectedRowKeys.value
    : []
  if (!ids.length) {
    message.warning('请先勾选要发起出厂质检的销售出库单')
    return
  }
  let ok = 0
  const errors = []
  ids.forEach((id) => {
    const record = outboundState.orders.find((o) => o.id === id)
    if (!canInitiateFactoryQc(record)) {
      errors.push(record?.docNo || id)
      return
    }
    const result = initiateFactoryQcFromOutbound(id)
    if (result.ok) ok += 1
    else errors.push(`${record?.docNo}: ${result.message}`)
  })
  if (ok) message.success(`成功发起 ${ok} 条出厂质检`)
  if (errors.length) message.warning(errors.slice(0, 3).join('；'))
}
</script>

<style lang="less" scoped>
.outbound-page {
  margin: -12px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 6px 6px 0 0;
  padding: 10px 12px 0;
  margin-bottom: 0;
}

.summary-bar {
  margin: 0 0 8px;
  border-radius: 0;
}

.table-card {
  border-radius: 0 0 6px 6px;
  padding-top: 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

:deep(.filter-form .ant-form-item) {
  margin-bottom: 0;
  width: 100%;
}

:deep(.filter-form .ant-form-item-label) {
  min-width: 72px;
}
</style>
