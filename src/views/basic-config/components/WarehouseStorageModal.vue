<template>
  <a-modal
    :open="open"
    :title="`存放管理 - ${warehouse?.name || ''}`"
    width="960px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="toolbar">
      <a-button type="primary" size="small" @click="pickerOpen = true">
        <PlusOutlined />
        添加物品
      </a-button>
      <span class="hint">同一物品不可存放于多个仓库，保存时将校验冲突</span>
    </div>

    <a-form :model="filters" class="search-form horizontal-form">
      <a-row :gutter="[8, 0]" align="middle" class="search-row">
        <a-col flex="160px">
          <a-form-item label="类型">
            <a-select
              v-model:value="filters.itemType"
              allow-clear
              size="small"
              placeholder="请选择"
              :options="typeOpts"
            />
          </a-form-item>
        </a-col>
        <a-col flex="200px">
          <a-form-item label="物品名称">
            <a-input v-model:value="filters.name" allow-clear size="small" placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col flex="200px">
          <a-form-item label="物品编码">
            <a-input v-model:value="filters.code" allow-clear size="small" placeholder="请输入" />
          </a-form-item>
        </a-col>
        <a-col flex="none">
          <a-form-item class="search-actions-item">
            <a-space :size="8">
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

    <a-table
      :columns="columns"
      :data-source="pagedList"
      row-key="rowKey"
      size="small"
      bordered
      :scroll="{ x: 900, y: 360 }"
      :pagination="pagination"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">
          {{ (page - 1) * pageSize + index + 1 }}
        </template>
        <template v-else-if="column.key === 'itemType'">
          <a-tag :color="record.itemType === '产品' ? 'blue' : 'green'">{{
            record.itemType
          }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeItem(record)">移除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty
          :image="false"
          :description="items.length ? '无匹配物品' : '暂未配置存放物品，点击「添加物品」'"
        />
      </template>
    </a-table>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </template>

    <SelectWarehouseItemModal
      v-model:open="pickerOpen"
      :selected-items="items"
      @confirm="onItemsPicked"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons-vue'
import SelectWarehouseItemModal from './SelectWarehouseItemModal.vue'
import { updateWarehouseStoredItems } from '@/store/warehouseStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  warehouse: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const items = ref([])
const pickerOpen = ref(false)
const saving = ref(false)
const page = ref(1)
const pageSize = ref(10)

const filters = reactive({ itemType: undefined, name: '', code: '' })
const applied = reactive({ itemType: undefined, name: '', code: '' })

const typeOpts = [
  { label: '产品', value: '产品' },
  { label: '物料', value: '物料' },
]

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '类型', key: 'itemType', width: 72 },
  { title: '物品编码', dataIndex: 'code', width: 120 },
  { title: '物品名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '类别', dataIndex: 'categoryName', width: 90 },
  { title: '库存单位', dataIndex: 'inventoryUnit', width: 80 },
  { title: '操作', key: 'actions', width: 72, fixed: 'right' },
]

const filteredList = computed(() =>
  items.value.filter((it) => {
    if (applied.itemType && it.itemType !== applied.itemType) return false
    if (applied.name && !it.name?.includes(applied.name)) return false
    if (applied.code && !it.code?.includes(applied.code)) return false
    return true
  }),
)

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredList.value.length,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50'],
  showTotal: (t) => `共 ${t} 条`,
  size: 'small',
}))

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

watch(
  () => props.open,
  (v) => {
    if (!v) return
    const list = props.warehouse?.storedItems || []
    items.value = list.map((it) => ({
      ...it,
      rowKey: `${it.itemType}-${it.itemId}`,
    }))
    filters.itemType = undefined
    filters.name = ''
    filters.code = ''
    applied.itemType = undefined
    applied.name = ''
    applied.code = ''
    page.value = 1
    pageSize.value = 10
  },
)

function handleSearch() {
  applied.itemType = filters.itemType
  applied.name = filters.name.trim()
  applied.code = filters.code.trim()
  page.value = 1
}

function handleReset() {
  filters.itemType = undefined
  filters.name = ''
  filters.code = ''
  handleSearch()
}

function onTableChange(pag) {
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function onItemsPicked(picked) {
  const map = new Map(items.value.map((it) => [it.rowKey, it]))
  picked.forEach((it) => {
    const rowKey = `${it.itemType}-${it.itemId}`
    map.set(rowKey, { ...it, rowKey })
  })
  items.value = [...map.values()]
}

function removeItem(record) {
  items.value = items.value.filter((it) => it.rowKey !== record.rowKey)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!props.warehouse?.id) return
  saving.value = true
  const payload = items.value.map((it) => {
    const copy = { ...it }
    delete copy.rowKey
    return copy
  })
  const res = updateWarehouseStoredItems(props.warehouse.id, payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('存放物品已保存')
  emit('saved', res.warehouse)
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.hint {
  font-size: 12px;
  color: #8c8c8c;
}

.search-form {
  margin-bottom: 12px;
}

.search-row {
  flex-wrap: nowrap;
}

.search-actions-item {
  :deep(.ant-form-item-control-input-content) {
    white-space: nowrap;
  }
}

.danger-link {
  color: #ff4d4f;
}
</style>
