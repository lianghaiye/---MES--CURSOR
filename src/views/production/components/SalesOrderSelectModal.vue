<template>
  <a-modal
    :open="open"
    title="选择销售订单"
    width="1080px"
    :mask-closable="false"
    destroy-on-close
    class="sales-order-select-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form">
      <a-form-item label="销售订单号">
        <a-input
          v-model:value="filters.orderNo"
          allow-clear
          size="small"
          placeholder="请输入销售订单号"
          style="width: 160px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="客户名称">
        <a-input
          v-model:value="filters.customerName"
          allow-clear
          size="small"
          placeholder="请输入客户名称"
          style="width: 140px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="业务员">
        <a-input
          v-model:value="filters.salesperson"
          allow-clear
          size="small"
          placeholder="请输入业务员"
          style="width: 120px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item>
        <a-space :size="8">
          <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
          <a-button size="small" @click="handleReset">重置</a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <div class="picker-body">
      <div class="table-panel">
        <a-table
          :columns="columns"
          :data-source="filteredList"
          row-key="id"
          size="small"
          bordered
          :pagination="{ pageSize: 8, size: 'small', showTotal: (t) => `共 ${t} 条` }"
          :row-selection="rowSelection"
          :scroll="{ x: 720, y: 360 }"
          :custom-row="customRow"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'productNames'">
              <span class="product-names-cell">{{ formatSalesOrderProductNames(record) }}</span>
            </template>
            <template v-else-if="column.key === 'createdAt'">
              {{ resolveSalesOrderCreatedAt(record) }}
            </template>
          </template>
        </a-table>
      </div>

      <div class="selected-panel">
        <div class="selected-head">
          <span class="selected-title">已选 {{ selectedRow ? 1 : 0 }} 项</span>
          <a-button
            v-if="selectedRow"
            type="link"
            size="small"
            class="clear-btn"
            @click="clearSelection"
          >
            清空
          </a-button>
        </div>
        <div v-if="selectedRow" class="selected-list">
          <div class="selected-item">
            <div class="selected-item-main">
              <span class="selected-code">{{ selectedRow.orderNo }}</span>
              <span class="selected-name" :title="selectedRow.customerName">
                {{ selectedRow.customerName || '—' }}
              </span>
              <span class="selected-meta">{{ formatSalesOrderProductNames(selectedRow) }}</span>
            </div>
            <a-button type="text" size="small" class="remove-btn" @click="clearSelection">
              <CloseOutlined />
            </a-button>
          </div>
        </div>
        <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRow" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { salesOrderState } from '@/store/salesOrderStore'
import {
  filterSalesOrdersForPicker,
  formatSalesOrderProductNames,
  resolveSalesOrderCreatedAt,
} from '@/utils/salesOrderPicker'

const props = defineProps({
  open: { type: Boolean, default: false },
  excludeStatuses: { type: Array, default: undefined },
})

const emit = defineEmits(['update:open', 'confirm'])

const filters = reactive({
  orderNo: '',
  customerName: '',
  salesperson: '',
})
const applied = reactive({
  orderNo: '',
  customerName: '',
  salesperson: '',
})
const selectedRowKeys = ref([])
const selectedRow = ref(null)

const columns = [
  { title: '销售订单号', dataIndex: 'orderNo', width: 140, ellipsis: true },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '产品名称', key: 'productNames', width: 200, ellipsis: true },
  { title: '业务员', dataIndex: 'salesperson', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const filteredList = computed(() =>
  filterSalesOrdersForPicker(salesOrderState.orders, {
    ...applied,
    excludeStatuses: props.excludeStatuses,
  })
    .slice()
    .sort((a, b) => {
      const ta = resolveSalesOrderCreatedAt(a)
      const tb = resolveSalesOrderCreatedAt(b)
      return tb.localeCompare(ta)
    }),
)

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedRow.value = rows[0] || null
  },
}))

function customRow(record) {
  return {
    onClick: () => {
      selectedRowKeys.value = [record.id]
      selectedRow.value = record
    },
  }
}

function clearSelection() {
  selectedRowKeys.value = []
  selectedRow.value = null
}

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    filters.orderNo = ''
    filters.customerName = ''
    filters.salesperson = ''
    applied.orderNo = ''
    applied.customerName = ''
    applied.salesperson = ''
    selectedRowKeys.value = []
    selectedRow.value = null
  },
)

function handleSearch() {
  applied.orderNo = filters.orderNo
  applied.customerName = filters.customerName
  applied.salesperson = filters.salesperson
}

function handleReset() {
  filters.orderNo = ''
  filters.customerName = ''
  filters.salesperson = ''
  applied.orderNo = ''
  applied.customerName = ''
  applied.salesperson = ''
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRow.value) {
    message.warning('请选择销售订单')
    return
  }
  emit('confirm', selectedRow.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'SalesOrderSelectModal' }
</script>

<style lang="less" scoped>
.filter-form {
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
  }
}

.picker-body {
  display: flex;
  gap: 12px;
  min-height: 420px;
}

.table-panel {
  flex: 1;
  min-width: 0;
}

.selected-panel {
  width: 240px;
  flex-shrink: 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  flex-shrink: 0;
}

.selected-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.clear-btn {
  padding: 0;
  height: auto;
}

.selected-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.selected-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.selected-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-code {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.selected-name,
.selected-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);

  &:hover {
    color: #ff4d4f;
  }
}

.selected-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.product-names-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
</style>
