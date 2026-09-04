<template>
  <a-modal
    :open="open"
    title="从检验项库添加"
    width="880px"
    :mask-closable="false"
    destroy-on-close
    class="qc-field-pick-modal"
    @cancel="handleCancel"
  >
    <a-form layout="inline" class="filter-form horizontal-form" style="margin-bottom: 12px">
      <a-form-item label="关键词">
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          size="small"
          placeholder="编码/名称"
          style="width: 160px"
          @press-enter="handleSearch"
        />
      </a-form-item>
      <a-form-item label="分类">
        <a-select
          v-model:value="filters.category"
          allow-clear
          size="small"
          placeholder="全部"
          style="width: 120px"
          :options="categoryOpts"
        />
      </a-form-item>
      <a-form-item label="类型">
        <a-select
          v-model:value="filters.type"
          allow-clear
          size="small"
          placeholder="全部"
          style="width: 120px"
          :options="typeOpts"
        />
      </a-form-item>
      <a-form-item>
        <a-space>
          <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
          <a-button size="small" @click="handleReset">重置</a-button>
        </a-space>
      </a-form-item>
    </a-form>

    <a-alert type="info" show-icon style="margin-bottom: 8px">
      <template #message>
        仅展示「启用」检验项；模板中已存在的编码将自动跳过。已选 {{ selectedRowKeys.length }} 项。
      </template>
    </a-alert>

    <a-table
      :columns="columns"
      :data-source="pagedList"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ y: 360 }"
      :row-selection="rowSelection"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ rowIndex(index) }}</template>
        <template v-else-if="column.key === 'type'">
          {{ qcFieldTypeLabel(record.type) }}
        </template>
        <template v-else-if="column.key === 'required'">
          {{ record.required ? '是' : '否' }}
        </template>
        <template v-else-if="column.key === 'inTemplate'">
          <a-tag v-if="isInTemplate(record)" color="default">已在模板</a-tag>
          <span v-else class="muted">—</span>
        </template>
        <template v-else>
          {{ record[column.dataIndex] || '—' }}
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
      />
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :disabled="!selectedRowKeys.length" @click="handleConfirm">
        添加所选（{{ selectedRowKeys.length }}）
      </a-button>
    </template>
  </a-modal>
</template>

<script>
export default { name: 'QcFieldLibraryPickModal' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  qcFieldLibraryCategoryOptions,
  qcFieldLibraryTypeOptions,
  qcFieldTypeLabel,
} from '@/mock/qcFieldLibrary'
import { listQcLibraryFields } from '@/store/qcFieldLibraryStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 当前模板已有字段，用于标记/去重提示 */
  existingFields: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'confirm'])

const filters = reactive({
  keyword: '',
  category: undefined,
  type: undefined,
})
const applied = ref({ keyword: '', category: undefined, type: undefined })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const categoryOpts = qcFieldLibraryCategoryOptions.map((v) => ({ label: v, value: v }))
const typeOpts = qcFieldLibraryTypeOptions

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '编码', dataIndex: 'code', width: 130 },
  { title: '名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '分类', dataIndex: 'category', width: 80 },
  { title: '类型', key: 'type', width: 80 },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '状态', key: 'inTemplate', width: 90, align: 'center' },
]

const existingCodeSet = computed(() => {
  const set = new Set()
  ;(props.existingFields || []).forEach((f) => {
    const c = String(f.code || '')
      .trim()
      .toUpperCase()
    if (c) set.add(c)
  })
  return set
})

function isInTemplate(record) {
  return existingCodeSet.value.has(
    String(record.code || '')
      .trim()
      .toUpperCase(),
  )
}

const filteredList = computed(() =>
  listQcLibraryFields({
    status: '启用',
    keyword: applied.value.keyword,
    category: applied.value.category,
    type: applied.value.type,
  }),
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: isInTemplate(record),
  }),
}))

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

watch(
  () => props.open,
  (val) => {
    if (!val) return
    selectedRowKeys.value = []
    handleReset()
  },
)

function handleSearch() {
  applied.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.keyword = ''
  filters.category = undefined
  filters.type = undefined
  handleSearch()
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选检验项')
    return
  }
  emit('confirm', [...selectedRowKeys.value])
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.table-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
