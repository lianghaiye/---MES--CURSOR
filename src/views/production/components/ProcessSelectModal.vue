<template>
  <a-modal
    :open="open"
    title="选择工序"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    class="process-select-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form">
      <a-form-item label="工序名称">
        <a-input
          v-model:value="filters.name"
          allow-clear
          size="small"
          placeholder="名称或编码"
          style="width: 160px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="工序分类">
        <a-select
          v-model:value="filters.category"
          allow-clear
          size="small"
          placeholder="全部分类"
          :options="categoryOptions"
          style="width: 140px"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
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
      :scroll="{ y: 360 }"
    />

    <template #footer>
      <span class="selected-hint">已选 {{ selectedRowKeys.length }} 项</span>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRowKeys.length" @click="handleConfirm">
        确定添加
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  filterProcessConfig,
  getActiveProcessCategories,
  processConfigState,
} from '@/store/processConfigStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 已在报工单中的工序配置 id */
  excludeProcessIds: { type: Array, default: () => [] },
  /** 已在报工单中的工序名称（工艺路线工序无 processConfigId 时按名称去重） */
  excludeNames: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const filters = reactive({ name: '', category: undefined })
const applied = reactive({ name: '', category: undefined })
const selectedRowKeys = ref([])
const selectedRows = ref([])

const columns = [
  { title: '工序编码', dataIndex: 'code', width: 130 },
  { title: '工序名称', dataIndex: 'name', width: 140 },
  { title: '工序分类', dataIndex: 'category', width: 100 },
  { title: '资源类型', dataIndex: 'resourceType', width: 100 },
]

const categoryOptions = computed(() =>
  getActiveProcessCategories().map((c) => ({ label: c, value: c })),
)

const filteredList = computed(() => {
  const list = filterProcessConfig(processConfigState.processes, {
    ...applied,
    status: '使用中',
  })
  const idSet = new Set(props.excludeProcessIds)
  const nameSet = new Set(props.excludeNames)
  return list.filter((p) => !idSet.has(p.id) && !nameSet.has(p.name))
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys, rows) => {
    selectedRowKeys.value = keys
    selectedRows.value = rows
  },
}))

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    filters.name = ''
    filters.category = undefined
    applied.name = ''
    applied.category = undefined
    selectedRowKeys.value = []
    selectedRows.value = []
  },
)

function handleSearch() {
  applied.name = filters.name?.trim() || ''
  applied.category = filters.category || undefined
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRows.value.length) {
    message.warning('请至少选择一道工序')
    return
  }
  emit('confirm', [...selectedRows.value])
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.process-select-modal {
  .filter-form {
    margin-bottom: 12px;
  }

  .selected-hint {
    float: left;
    line-height: 32px;
    color: #8c8c8c;
    font-size: 13px;
  }
}
</style>
