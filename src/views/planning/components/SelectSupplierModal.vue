<template>
  <a-modal
    :open="open"
    title="选择供应商"
    width="860px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="search-form">
      <a-form-item label="供应商编码">
        <a-input
          v-model:value="search.code"
          allow-clear
          placeholder="请输入"
          @pressEnter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="名称">
        <a-input
          v-model:value="search.name"
          allow-clear
          placeholder="请输入"
          @pressEnter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="类型">
        <a-input
          v-model:value="search.type"
          allow-clear
          placeholder="请输入"
          @pressEnter="handleSearch"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" @click="handleSearch">
          <SearchOutlined />
          搜索
        </a-button>
      </a-form-item>
    </a-form>

    <a-table
      :row-selection="rowSelection"
      :columns="columns"
      :data-source="filteredList"
      row-key="value"
      size="small"
      bordered
      :pagination="{ pageSize: 8, size: 'small', showSizeChanger: false }"
      :custom-row="customRow"
    />

    <a-modal
      v-model:open="addOpen"
      title="添加供应商"
      width="480px"
      destroy-on-close
      @ok="handleAddSupplier"
    >
      <a-form layout="vertical">
        <a-form-item label="供应商名称" required>
          <a-input v-model:value="addForm.name" placeholder="请输入供应商名称" allow-clear />
        </a-form-item>
        <a-form-item label="供应商编码">
          <a-input v-model:value="addForm.code" placeholder="可不填，系统自动生成" allow-clear />
        </a-form-item>
      </a-form>
    </a-modal>

    <template #footer>
      <a-button @click="openAdd">添加供应商</a-button>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRow" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { filterSupplierOptionsByFields, getAllSupplierOptions } from '@/utils/supplierSelect'
import { addSupplier } from '@/store/supplierStore'
import { SUPPLIER_ROLE } from '@/constants/supplierMaster'

const props = defineProps({
  open: { type: Boolean, default: false },
  selected: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'confirm'])

const search = reactive({ code: '', name: '', type: '' })
const appliedSearch = reactive({ code: '', name: '', type: '' })
const selectedRow = ref(null)
const addOpen = ref(false)
const addForm = reactive({ name: '', code: '' })

const columns = [
  { title: '供应商类型', dataIndex: 'type', width: 120, ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 120, ellipsis: true },
  { title: '名称', dataIndex: 'label', ellipsis: true },
]

const allOptions = computed(() => getAllSupplierOptions())

const filteredList = computed(() => filterSupplierOptionsByFields(allOptions.value, appliedSearch))

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRow.value ? [selectedRow.value.value] : [],
  onChange: (_keys, rows) => {
    selectedRow.value = rows[0] || null
  },
}))

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    search.code = ''
    search.name = ''
    search.type = ''
    appliedSearch.code = ''
    appliedSearch.name = ''
    appliedSearch.type = ''
    const hit = allOptions.value.find((opt) => opt.value === props.selected)
    selectedRow.value = hit || null
  },
)

function customRow(record) {
  return {
    onClick: () => {
      selectedRow.value = record
    },
  }
}

function handleSearch() {
  appliedSearch.code = search.code
  appliedSearch.name = search.name
  appliedSearch.type = search.type
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRow.value) return
  emit('confirm', selectedRow.value.value)
  emit('update:open', false)
}

function openAdd() {
  addForm.name = ''
  addForm.code = ''
  addOpen.value = true
}

function handleAddSupplier() {
  const result = addSupplier({
    name: addForm.name,
    code: addForm.code,
    supplierRoles: [SUPPLIER_ROLE.PURCHASE],
  })
  if (!result.ok) {
    message.error(result.message || '添加失败')
    return Promise.reject()
  }
  message.success(`已添加供应商「${result.data.name}」`)
  selectedRow.value = {
    value: result.data.name,
    label: result.data.name,
    code: result.data.code,
    type: (result.data.supplierRoles || []).join('/'),
  }
  addOpen.value = false
  emit('confirm', result.data.name)
  emit('update:open', false)
}
</script>

<script>
export default { name: 'SelectSupplierModal' }
</script>

<style lang="less" scoped>
.search-form {
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
  }
}
</style>
