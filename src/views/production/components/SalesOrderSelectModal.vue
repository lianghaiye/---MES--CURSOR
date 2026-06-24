<template>
  <a-modal
    :open="open"
    title="选择销售订单"
    width="920px"
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

    <a-table
      :columns="columns"
      :data-source="filteredList"
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 8, size: 'small', showTotal: (t) => `共 ${t} 条` }"
      :row-selection="rowSelection"
      :scroll="{ x: 860, y: 360 }"
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

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRow" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { salesOrderState } from '@/store/salesOrderStore'
import {
  filterSalesOrdersForPicker,
  formatSalesOrderProductNames,
  resolveSalesOrderCreatedAt,
} from '@/utils/salesOrderPicker'

const props = defineProps({
  open: { type: Boolean, default: false },
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
  { title: '产品名称', key: 'productNames', width: 220, ellipsis: true },
  { title: '业务员', dataIndex: 'salesperson', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const filteredList = computed(() =>
  filterSalesOrdersForPicker(salesOrderState.orders, applied)
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
