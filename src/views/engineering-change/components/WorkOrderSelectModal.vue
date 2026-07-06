<template>
  <a-modal
    :open="open"
    title="选择工单"
    width="1080px"
    :mask-closable="false"
    destroy-on-close
    class="work-order-select-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form">
      <a-form-item label="工单类型">
        <a-select
          v-model:value="filters.orderCategory"
          allow-clear
          size="small"
          placeholder="请选择"
          style="width: 120px"
          :options="categoryOpts"
        />
      </a-form-item>
      <a-form-item label="工单编号">
        <a-input
          v-model:value="filters.code"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 140px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="产品名称">
        <a-input
          v-model:value="filters.productName"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 120px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="销售单号">
        <a-input
          v-model:value="filters.salesOrderNo"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 130px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="图号">
        <a-input
          v-model:value="filters.drawingNo"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 110px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="规格型号">
        <a-input
          v-model:value="filters.specModel"
          allow-clear
          size="small"
          placeholder="请输入"
          style="width: 110px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="工作中心">
        <a-select
          v-model:value="filters.workCenter"
          allow-clear
          size="small"
          placeholder="请选择"
          style="width: 120px"
          :options="workCenterOpts"
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
      :scroll="{ x: 1100, y: 360 }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'sourceOrderNo'">
          {{ record.sourceOrderNo || '—' }}
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
import { workOrderState } from '@/store/workOrderStore'
import { workCenterOptions } from '@/mock/workOrderOptions'
import { filterWorkOrdersForPicker, workOrderCategoryOptions } from '@/utils/workOrderPicker'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'confirm'])

const filters = reactive({
  orderCategory: undefined,
  code: '',
  productName: '',
  salesOrderNo: '',
  drawingNo: '',
  specModel: '',
  workCenter: undefined,
})
const applied = reactive({ ...filters })
const selectedRowKeys = ref([])
const selectedRow = ref(null)

const categoryOpts = workOrderCategoryOptions.map((v) => ({ label: v, value: v }))
const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '工单编号', dataIndex: 'code', width: 150, ellipsis: true },
  { title: '工单名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '产品名称', dataIndex: 'productName', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '工作中心', dataIndex: 'workCenter', width: 100, ellipsis: true },
  { title: '销售单号', key: 'sourceOrderNo', width: 130, ellipsis: true },
]

const filteredList = computed(() => filterWorkOrdersForPicker(workOrderState.orders, applied))

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
    Object.assign(filters, {
      orderCategory: undefined,
      code: '',
      productName: '',
      salesOrderNo: '',
      drawingNo: '',
      specModel: '',
      workCenter: undefined,
    })
    Object.assign(applied, filters)
    selectedRowKeys.value = []
    selectedRow.value = null
  },
)

function handleSearch() {
  Object.assign(applied, filters)
}

function handleReset() {
  Object.assign(filters, {
    orderCategory: undefined,
    code: '',
    productName: '',
    salesOrderNo: '',
    drawingNo: '',
    specModel: '',
    workCenter: undefined,
  })
  Object.assign(applied, filters)
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRow.value) {
    message.warning('请选择工单')
    return
  }
  emit('confirm', selectedRow.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'WorkOrderSelectModal' }
</script>

<style lang="less" scoped>
.filter-form {
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
  }
}

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
</style>
