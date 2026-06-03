<template>
  <a-modal
    :open="open"
    title="请选择BOM模板"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    class="bom-template-modal"
    @cancel="emit('update:open', false)"
  >
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-form-item label="BOM编号">
          <a-input
            v-model:value="filters.bomNo"
            allow-clear
            size="small"
            placeholder="请输入 BOM 编号"
          />
        </a-form-item>
        <a-form-item label="BOM名称">
          <a-input
            v-model:value="filters.bomName"
            allow-clear
            size="small"
            placeholder="请输入 BOM 名称"
          />
        </a-form-item>
        <a-form-item label="物品名称">
          <a-select
            v-model:value="filters.itemId"
            allow-clear
            show-search
            size="small"
            placeholder="请选择 物品"
            style="width: 200px"
            :filter-option="filterItem"
            :options="itemFilterOptions"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" size="small" @click="handleSearch">
              <SearchOutlined />
              搜索
            </a-button>
            <a-button size="small" @click="handleReset">清空</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div v-if="selectedBom" class="selected-tag">
      <a-tag color="blue" closable @close="selectedRowKeys = []">
        {{ selectedBom.bomNo }}-{{ selectedBom.bomName }}
      </a-tag>
    </div>

    <a-table
      :columns="columns"
      :data-source="pagedList"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :row-selection="rowSelection"
      :scroll="{ y: 360 }"
      :custom-row="customRow"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag color="processing">{{ record.status }}</a-tag>
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
import { applyBomTemplateImport } from '@/utils/bomImport'

const props = defineProps({
  open: Boolean,
  hasRoot: Boolean,
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:open', 'imported'])

const filters = reactive({
  bomNo: '',
  bomName: '',
  itemId: undefined,
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const columns = [
  { title: 'BOM状态', key: 'status', width: 88 },
  { title: 'BOM编号', dataIndex: 'bomNo', width: 130, ellipsis: true },
  { title: 'BOM名称', dataIndex: 'bomName', width: 160, ellipsis: true },
  { title: '物品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'version', width: 96 },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '失效日期', dataIndex: 'expiredAt', width: 150 },
]

const activeBomList = computed(() =>
  productBomState.boms.filter((b) => b.status === '使用中'),
)

const itemFilterOptions = computed(() => {
  const products = productInfoState.products.slice(0, 150).map((p) => ({
    label: p.name,
    value: p.id,
  }))
  const materials = materialInfoState.materials.slice(0, 80).map((m) => ({
    label: m.name,
    value: m.id,
  }))
  return [...products, ...materials]
})

const filteredList = computed(() => {
  const f = appliedFilters.value
  return activeBomList.value.filter((b) => {
    if (f.bomNo && !b.bomNo?.includes(f.bomNo)) return false
    if (f.bomName && !b.bomName?.includes(f.bomName)) return false
    if (f.itemId && b.itemId !== f.itemId) return false
    return true
  })
})

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const selectedBom = computed(() =>
  activeBomList.value.find((b) => b.id === selectedRowKeys.value[0]),
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

function filterItem(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.bomNo = ''
  filters.bomName = ''
  filters.itemId = undefined
  handleSearch()
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      selectedRowKeys.value = []
      handleReset()
    }
  },
)

function confirm() {
  if (!selectedBom.value) {
    message.warning('请选择一条 BOM 模板')
    return
  }

  const result = applyBomTemplateImport(
    selectedBom.value,
    props.hasRoot,
    props.flatNodes,
  )
  if (!result) {
    message.error('无法加载该 BOM 结构')
    return
  }

  emit('imported', result)
  emit('update:open', false)
  message.success(
    result.mode === 'full'
      ? '已带入完整 BOM（含物品与下级物料）'
      : '已带入所选 BOM 的下级物料（保留当前根节点）',
  )
}
</script>

<style lang="less" scoped>
.filter-card {
  margin-bottom: 12px;
}

.horizontal-form {
  :deep(.ant-form-item) {
    margin-bottom: 8px;
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
