<template>
  <a-modal
    :open="open"
    title="选择外协订单"
    width="1080px"
    :mask-closable="false"
    destroy-on-close
    class="outsourcing-order-select-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form">
      <a-form-item label="外协单号">
        <a-input
          v-model:value="filters.orderNo"
          allow-clear
          size="small"
          placeholder="请输入外协单号"
          style="width: 140px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="供应商">
        <a-input
          v-model:value="filters.supplier"
          allow-clear
          size="small"
          placeholder="请输入供应商"
          style="width: 130px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="销售单号">
        <a-input
          v-model:value="filters.salesOrderNo"
          allow-clear
          size="small"
          placeholder="请输入销售单号"
          style="width: 140px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="创建人">
        <a-input
          v-model:value="filters.creator"
          allow-clear
          size="small"
          placeholder="请输入创建人"
          style="width: 110px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="创建时间">
        <a-range-picker v-model:value="filters.createdAtRange" size="small" style="width: 220px" />
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
      :scroll="{ x: 1000, y: 360 }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'productInfo'">
          {{ formatOutsourcingOrderProductInfo(record) }}
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ formatDateTimeMinute(record.createdAt) }}
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
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
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import {
  filterOutsourcingOrdersForPicker,
  formatOutsourcingOrderProductInfo,
} from '@/utils/outsourcingOrderPicker'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'confirm'])

const emptyFilters = () => ({
  orderNo: '',
  supplier: '',
  salesOrderNo: '',
  creator: '',
  createdAtRange: undefined,
})

const filters = reactive(emptyFilters())
const applied = reactive(emptyFilters())
const selectedRowKeys = ref([])
const selectedRow = ref(null)

const columns = [
  { title: '外协单号', dataIndex: 'orderNo', width: 140, ellipsis: true },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140, ellipsis: true },
  { title: '产品信息', key: 'productInfo', width: 160, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
]

const filteredList = computed(() =>
  filterOutsourcingOrdersForPicker(outsourcingOrderState.orders, applied)
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
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

function syncAppliedFromFilters() {
  applied.orderNo = filters.orderNo
  applied.supplier = filters.supplier
  applied.salesOrderNo = filters.salesOrderNo
  applied.creator = filters.creator
  applied.createdAtRange = filters.createdAtRange
}

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    Object.assign(filters, emptyFilters())
    Object.assign(applied, emptyFilters())
    selectedRowKeys.value = []
    selectedRow.value = null
  },
)

function handleSearch() {
  syncAppliedFromFilters()
}

function handleReset() {
  Object.assign(filters, emptyFilters())
  Object.assign(applied, emptyFilters())
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRow.value) {
    message.warning('请选择外协订单')
    return
  }
  emit('confirm', selectedRow.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'OutsourcingOrderSelectModal' }
</script>

<style lang="less" scoped>
.filter-form {
  margin-bottom: 12px;
}
</style>
