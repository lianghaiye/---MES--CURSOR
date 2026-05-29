<template>
  <a-modal
    :open="open"
    title="请选择人员"
    width="640px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="search-form">
      <a-form-item label="姓名">
        <a-input v-model:value="search.name" allow-clear placeholder="请输入 姓名" />
      </a-form-item>
      <a-form-item label="员工编号">
        <a-input v-model:value="search.employeeNo" allow-clear placeholder="请输入 员工编号" />
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
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 8, size: 'small' }"
    />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { mockEmployees } from '@/mock/workOrderMaster'

const props = defineProps({
  open: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const search = reactive({ name: '', employeeNo: '' })
const appliedSearch = reactive({ name: '', employeeNo: '' })
const selectedRowKeys = ref([])
const selectedRows = ref([])

const columns = [
  { title: '姓名', dataIndex: 'name', width: 160 },
  { title: '员工编号', dataIndex: 'employeeNo', customRender: ({ text }) => text || '-' },
]

const filteredList = computed(() =>
  mockEmployees.filter((emp) => {
    if (appliedSearch.name && !emp.name.includes(appliedSearch.name)) return false
    if (appliedSearch.employeeNo && !emp.employeeNo.includes(appliedSearch.employeeNo)) return false
    return true
  }),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  },
}))

watch(
  () => props.open,
  (val) => {
    if (val) {
      const names = props.selected || []
      const rows = mockEmployees.filter((e) => names.includes(e.name))
      selectedRowKeys.value = rows.map((r) => r.id)
      selectedRows.value = rows
      search.name = ''
      search.employeeNo = ''
      appliedSearch.name = ''
      appliedSearch.employeeNo = ''
    }
  },
)

function handleSearch() {
  appliedSearch.name = search.name
  appliedSearch.employeeNo = search.employeeNo
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  emit(
    'confirm',
    selectedRows.value.map((r) => r.name),
  )
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.search-form {
  margin-bottom: 12px;
}
</style>
