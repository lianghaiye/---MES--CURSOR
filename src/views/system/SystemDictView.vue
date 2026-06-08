<template>
  <div class="system-dict-page">
    <a-tabs v-model:activeKey="activeType" size="small" type="card">
      <a-tab-pane v-for="t in DICT_TYPES" :key="t.key" :tab="t.label" />
    </a-tabs>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreate">
          <PlusOutlined />
          新增
        </a-button>
        <a-button size="small" @click="handleDelete">
          <DeleteOutlined />
          删除
        </a-button>
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="tableData"
        row-key="value"
        size="small"
        bordered
        :pagination="{ pageSize: 10, size: 'small' }"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'value'">
            <a class="link-code" @click="openEdit(record)">{{ record.value }}</a>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editing ? '编辑字典项' : '新增字典项'"
      width="420px"
      @ok="handleSave"
    >
      <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
        <a-form-item label="字典类型">
          <a-input :value="activeLabel" disabled />
        </a-form-item>
        <a-form-item label="字典值" required>
          <a-input v-model:value="formValue" placeholder="请输入字典值" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script>
export default { name: 'SystemDictView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  DICT_TYPES,
  systemDictState,
  addDictItem,
  updateDictItem,
  deleteDictItem,
} from '@/store/systemDictStore'

const activeType = ref(DICT_TYPES[0].key)
const selectedRowKeys = ref([])
const modalOpen = ref(false)
const editing = ref(null)
const formValue = ref('')

const activeLabel = computed(() => DICT_TYPES.find((t) => t.key === activeType.value)?.label || '')

const tableData = computed(() =>
  (systemDictState.dicts[activeType.value] || []).map((value) => ({ value })),
)

const columns = [
  { title: '序号', key: 'index', width: 70, align: 'center' },
  { title: '字典值', key: 'value', dataIndex: 'value' },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function openCreate() {
  editing.value = null
  formValue.value = ''
  modalOpen.value = true
}

function openEdit(record) {
  editing.value = record.value
  formValue.value = record.value
  modalOpen.value = true
}

function handleSave() {
  const type = activeType.value
  if (editing.value) {
    const res = updateDictItem(type, editing.value, formValue.value)
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('已更新')
  } else {
    const res = addDictItem(type, formValue.value)
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('已新增')
  }
  modalOpen.value = false
}

function handleDelete() {
  if (!selectedRowKeys.value.length) {
    message.warning('请选择要删除的字典项')
    return
  }
  Modal.confirm({
    title: '确认删除所选字典项？',
    onOk: () => {
      selectedRowKeys.value.forEach((v) => deleteDictItem(activeType.value, v))
      selectedRowKeys.value = []
      message.success('已删除')
    },
  })
}
</script>

<style scoped>
.system-dict-page {
  padding: 0;
}
.toolbar-row {
  display: flex;
  justify-content: space-between;
  margin: 12px 0;
}
.table-card {
  background: #fff;
  border-radius: 4px;
}
.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
