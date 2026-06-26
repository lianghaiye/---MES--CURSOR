<template>
  <a-modal
    :open="open"
    :title="title"
    width="1120px"
    :mask-closable="false"
    destroy-on-close
    class="select-bom-picker-modal"
    @cancel="emit('update:open', false)"
  >
    <div class="filter-card">
      <a-form
        :model="filters"
        class="filter-form horizontal-form"
        :label-col="{ flex: '72px' }"
        :wrapper-col="{ flex: '1' }"
      >
        <a-row :gutter="[12, 8]">
          <a-col :span="8">
            <a-form-item label="BOM编号">
              <a-input
                v-model:value="filters.bomNo"
                allow-clear
                size="small"
                placeholder="请输入 BOM 编号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="BOM名称">
              <a-input
                v-model:value="filters.bomName"
                allow-clear
                size="small"
                placeholder="请输入 BOM 名称"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.productName"
                allow-clear
                size="small"
                placeholder="请输入产品名称"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="[12, 8]">
          <a-col :span="8">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                size="small"
                placeholder="请输入规格型号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="图号">
              <a-input
                v-model:value="filters.drawingNo"
                allow-clear
                size="small"
                placeholder="请输入图号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label=" " :colon="false" class="filter-actions">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="selectedBom" class="selected-tag">
      <a-tag color="blue" closable @close="selectedRowKeys = []">
        {{ selectedBom.bomNo }}-{{ selectedBom.bomName }}
      </a-tag>
    </div>

    <a-table
      :columns="BOM_PICKER_TABLE_COLUMNS"
      :data-source="pagedList"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ x: 1200, y: 360 }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === '生效' ? 'success' : 'processing'">{{
            record.status
          }}</a-tag>
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
        :page-size-options="['10', '20', '50']"
        :show-total="(t) => `共 ${t} 条`"
        show-quick-jumper
      />
    </div>

    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :disabled="!selectedBom" @click="confirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { productBomState } from '@/store/productBomStore'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  BOM_PICKER_TABLE_COLUMNS,
  createEmptyBomPickerFilters,
  enrichBomPickerRow,
  filterBomPickerRows,
} from '@/utils/bomPickerTable'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '选择BOM' },
  productId: { type: String, default: '' },
  /** (bom) => boolean */
  rowFilter: { type: Function, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const filters = reactive(createEmptyBomPickerFilters())
const appliedFilters = ref(createEmptyBomPickerFilters())
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const sourceList = computed(() => {
  void productInfoState.products
  void materialInfoState.materials
  let rows = productBomState.boms
  if (props.rowFilter) {
    rows = rows.filter((b) => props.rowFilter(b))
  }
  return rows
})

const filteredList = computed(() => {
  const rows = filterBomPickerRows(sourceList.value, appliedFilters.value, {
    productId: props.productId || undefined,
  })
  return rows.map(enrichBomPickerRow)
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const selectedBom = computed(() =>
  filteredList.value.find((b) => b.id === selectedRowKeys.value[0]),
)

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function customRow(record) {
  return {
    onClick: () => {
      selectedRowKeys.value = [record.id]
    },
  }
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  Object.assign(filters, createEmptyBomPickerFilters())
  handleSearch()
}

watch(
  () => props.open,
  (v) => {
    if (!v) return
    selectedRowKeys.value = []
    handleReset()
  },
)

function confirm() {
  if (!selectedBom.value) {
    message.warning('请选择 BOM')
    return
  }
  emit('confirm', selectedBom.value)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'SelectBomPickerModal' }
</script>

<style lang="less" scoped>
.filter-card {
  margin-bottom: 12px;
}

.horizontal-form {
  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.filter-actions) {
    .ant-form-item-label > label {
      visibility: hidden;
    }
  }
}

.selected-tag {
  margin-bottom: 8px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

:deep(.ant-table-tbody > tr) {
  cursor: pointer;
}
</style>
