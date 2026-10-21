<template>
  <a-modal
    :open="open"
    title="选择工单"
    width="1180px"
    :mask-closable="false"
    destroy-on-close
    class="work-order-select-modal"
    @cancel="handleCancel"
  >
    <div class="filter-card">
      <a-form layout="inline" class="filter-form horizontal-form" @submit.prevent="handleSearch">
        <ListFilterBar
          :field-count="7"
          search-text="搜索"
          reset-text="重置"
          @search="handleSearch"
          @reset="handleReset"
        >
          <a-form-item label="工单类型">
            <a-select
              v-model:value="filters.orderCategory"
              allow-clear
              size="small"
              placeholder="请选择"
              :options="categoryOpts"
            />
          </a-form-item>
          <a-form-item label="工单编号">
            <a-input
              v-model:value="filters.code"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="产品名称">
            <a-input
              v-model:value="filters.productName"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="销售单号">
            <a-input
              v-model:value="filters.salesOrderNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="图号">
            <a-input
              v-model:value="filters.drawingNo"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="规格型号">
            <a-input
              v-model:value="filters.specModel"
              allow-clear
              size="small"
              placeholder="请输入"
              @press-enter="handleSearch"
            />
          </a-form-item>
          <a-form-item label="工作中心">
            <a-select
              v-model:value="filters.workCenter"
              allow-clear
              size="small"
              placeholder="请选择"
              :options="workCenterOpts"
            />
          </a-form-item>
        </ListFilterBar>
      </a-form>
    </div>

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
          :scroll="{ x: 980, y: 360 }"
          :custom-row="customRow"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'sourceOrderNo'">
              {{ record.sourceOrderNo || '—' }}
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
              <span class="selected-code">{{ selectedRow.code }}</span>
              <span class="selected-name" :title="selectedRow.productName">
                {{ selectedRow.productName || selectedRow.name || '—' }}
              </span>
              <span class="selected-meta">
                {{ selectedRow.orderCategory || '—' }}
                <template v-if="selectedRow.specModel"> · {{ selectedRow.specModel }}</template>
              </span>
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
import { workOrderState } from '@/store/workOrderStore'
import { workCenterOptions } from '@/mock/workOrderOptions'
import { filterWorkOrdersForPicker, workOrderCategoryOptions } from '@/utils/workOrderPicker'
import ListFilterBar from '@/components/ListFilterBar.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 自定义工单池；不传则用生产工单 */
  orders: { type: Array, default: null },
  /** 工单类型筛选项；不传用默认全集 */
  categoryOptions: { type: Array, default: null },
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

const orderPool = computed(() =>
  Array.isArray(props.orders) ? props.orders : workOrderState.orders,
)
const categoryOpts = computed(() => {
  const list =
    Array.isArray(props.categoryOptions) && props.categoryOptions.length
      ? props.categoryOptions
      : workOrderCategoryOptions
  return list.map((v) => ({ label: v, value: v }))
})
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

const filteredList = computed(() => filterWorkOrdersForPicker(orderPool.value, applied))

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
.filter-card {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

  :deep(.ant-input),
  :deep(.ant-select),
  :deep(.ant-input-affix-wrapper) {
    width: 100%;
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

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
</style>
