<template>
  <a-modal
    :open="open"
    title="请选择员工组别"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="search-form">
      <a-form-item label="名称">
        <a-input v-model:value="search.name" allow-clear placeholder="请输入 名称" />
      </a-form-item>
      <a-form-item label="工作中心">
        <a-select
          v-model:value="search.workCenter"
          allow-clear
          placeholder="请选择"
          style="width: 140px"
          :options="workCenterOpts"
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
import { getEnabledEmployeeGroups, workCenterOptions } from '@/store/employeeGroupStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  selected: { type: Array, default: () => [] },
  multiple: { type: Boolean, default: true },
})

const emit = defineEmits(['update:open', 'confirm'])

const search = reactive({ name: '', workCenter: undefined })
const appliedSearch = reactive({ name: '', workCenter: undefined })
const selectedRowKeys = ref([])
const selectedRows = ref([])

const workCenterOpts = workCenterOptions.map((v) => ({ label: v, value: v }))

const columns = [
  { title: '编码', dataIndex: 'code', width: 140 },
  { title: '名称', dataIndex: 'name', width: 120 },
  { title: '工作中心', dataIndex: 'workCenter', width: 100 },
  { title: '组长', dataIndex: 'leaderName', width: 100 },
]

const filteredList = computed(() =>
  getEnabledEmployeeGroups().filter((g) => {
    if (appliedSearch.name && !g.name.includes(appliedSearch.name)) return false
    if (appliedSearch.workCenter && g.workCenter !== appliedSearch.workCenter) return false
    return true
  }),
)

const rowSelection = computed(() => ({
  type: props.multiple ? 'checkbox' : 'radio',
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
      const rows = getEnabledEmployeeGroups().filter((g) => names.includes(g.name))
      selectedRowKeys.value = rows.map((r) => r.id)
      selectedRows.value = rows
      search.name = ''
      search.workCenter = undefined
      appliedSearch.name = ''
      appliedSearch.workCenter = undefined
    }
  },
)

function handleSearch() {
  appliedSearch.name = search.name
  appliedSearch.workCenter = search.workCenter
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
