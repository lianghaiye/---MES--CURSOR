<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="process-labor-config-modal"
    @cancel="handleCancel"
  >
    <div class="modal-head">
      <div class="stats-row">
        <span class="stat configured">已配置 {{ configuredCount }}</span>
        <span class="stat unconfigured">未配置 {{ unconfiguredCount }}</span>
      </div>
      <a-space wrap>
        <a-input
          v-model:value="keyword"
          allow-clear
          size="small"
          placeholder="搜索产品/规格/材质..."
          style="width: 220px"
        />
        <a-button size="small" @click="openAddProduct">
          <PlusOutlined />
          新增产品
        </a-button>
        <a-button
          type="primary"
          size="small"
          :disabled="!selectedRowKeys.length"
          @click="openBatchFill"
        >
          批量填充
        </a-button>
        <a-button size="small" danger :disabled="!selectedRowKeys.length" @click="batchDelete">
          批量删除
        </a-button>
        <a-button size="small" disabled>导出</a-button>
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="pagedRows"
      row-key="rowKey"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1500 }"
      :row-class-name="rowClassName"
      :row-selection="rowSelection"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'reportType'">
          <a-tag v-if="record.reportType" :color="reportTypeTagColor(record.reportType)">
            {{ shortReportTypeLabel(record.reportType) }}
          </a-tag>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'salaryMethod'">
          <a-tag v-if="record.salaryMethod" :color="salaryMethodTagColor(record.salaryMethod)">
            {{ shortSalaryMethodLabel(record.salaryMethod) }}
          </a-tag>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'standardMinutesPerPiece'">
          <span v-if="record.standardMinutesPerPiece > 0">
            {{ record.standardMinutesPerPiece }} 分钟
          </span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'setupMinutesPerBatch'">
          <span v-if="record.setupMinutesPerBatch > 0">
            {{ record.setupMinutesPerBatch }} 分钟
          </span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'standardHourlyRate'">
          <span v-if="record.standardHourlyRate > 0" class="price-text">
            ¥{{ Number(record.standardHourlyRate).toFixed(2) }}
          </span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'pieceRate'">
          <span v-if="record.pieceRate > 0">¥{{ Number(record.pieceRate).toFixed(2) }}</span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'configStatus'">
          <a-tooltip v-if="isProcessLaborConfigured(record)" title="已配置">
            <CheckCircleFilled class="status-ok" />
          </a-tooltip>
          <a-tooltip v-else title="未配置，请补全必填项">
            <WarningFilled class="status-warn" />
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space :size="4">
            <a-button
              v-if="!isProcessLaborConfigured(record)"
              type="link"
              size="small"
              @click="quickFillRow(record)"
            >
              <PlusOutlined />
            </a-button>
            <a-button type="link" size="small" danger @click="deleteRow(record)">删除</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <div class="footer-bar">
      <a-pagination
        v-model:current="pagination.current"
        v-model:page-size="pagination.pageSize"
        :total="filteredRows.length"
        size="small"
        show-size-changer
        :show-total="(t) => `共 ${t} 条`"
      />
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存并返写主数据</a-button>
    </template>

    <ProcessLaborAddProductModal
      v-model:open="addProductOpen"
      :exclude-keys="existingRowKeys"
      @confirm="onProductsAdded"
    />

    <ProcessLaborBatchFillModal
      v-model:open="batchFillOpen"
      :selected-count="batchFillTargetKeys.length"
      :mode="batchFillMode"
      :initial-row="batchFillInitialRow"
      @confirm="onBatchFillConfirm"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { CheckCircleFilled, PlusOutlined, WarningFilled } from '@ant-design/icons-vue'
import ProcessLaborAddProductModal from './ProcessLaborAddProductModal.vue'
import ProcessLaborBatchFillModal from './ProcessLaborBatchFillModal.vue'
import {
  applyBatchFillPatch,
  collectProcessLaborRows,
  createUnconfiguredTableRows,
  isProcessLaborConfigured,
  removeProcessLaborRows,
  reportTypeTagColor,
  salaryMethodTagColor,
  saveProcessLaborRows,
  shortReportTypeLabel,
  shortSalaryMethodLabel,
} from '@/utils/processLaborBatchConfig'

const props = defineProps({
  open: Boolean,
  process: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const keyword = ref('')
const tableRows = ref([])
const removedRows = ref([])
const selectedRowKeys = ref([])
const addProductOpen = ref(false)
const batchFillOpen = ref(false)
const batchFillMode = ref('batch')
const batchFillInitialRow = ref(null)
const batchFillTargetKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })

const modalTitle = computed(() => {
  const p = props.process
  if (!p) return '工序工时配置'
  return `工序工时配置 — ${p.name}（${p.code}）`
})

const columns = [
  { title: '产品编码', dataIndex: 'code', width: 120, ellipsis: true },
  { title: '产品名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '报工类型', key: 'reportType', width: 88 },
  { title: '计薪方式', key: 'salaryMethod', width: 88 },
  { title: '标准工时', key: 'standardMinutesPerPiece', width: 96 },
  { title: '准备工时', key: 'setupMinutesPerBatch', width: 96 },
  { title: '工时单价', key: 'standardHourlyRate', width: 96, align: 'right' },
  { title: '计件单价', key: 'pieceRate', width: 96, align: 'right' },
  { title: '状态', key: 'configStatus', width: 64, align: 'center' },
  { title: '操作', key: 'action', width: 100, align: 'center', fixed: 'right' },
]

const existingRowKeys = computed(() => tableRows.value.map((r) => r.rowKey))

const filteredRows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tableRows.value
  return tableRows.value.filter(
    (r) =>
      r.code?.toLowerCase().includes(kw) ||
      r.name?.toLowerCase().includes(kw) ||
      r.specModel?.toLowerCase().includes(kw) ||
      r.material?.toLowerCase().includes(kw),
  )
})

const pagedRows = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredRows.value.slice(start, start + pagination.pageSize)
})

const configuredCount = computed(
  () => tableRows.value.filter((r) => isProcessLaborConfigured(r)).length,
)
const unconfiguredCount = computed(() => tableRows.value.length - configuredCount.value)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
  onSelectAll: (selected) => {
    if (selected) {
      selectedRowKeys.value = filteredRows.value.map((r) => r.rowKey)
    } else {
      selectedRowKeys.value = []
    }
  },
}))

function loadRows() {
  if (!props.process?.name) {
    tableRows.value = []
    return
  }
  tableRows.value = collectProcessLaborRows(props.process.name)
  removedRows.value = []
  selectedRowKeys.value = []
  pagination.current = 1
}

watch(
  () => [props.open, props.process?.id],
  () => {
    if (props.open) loadRows()
  },
  { immediate: true },
)

watch(keyword, () => {
  pagination.current = 1
})

function rowClassName(record) {
  return isProcessLaborConfigured(record) ? '' : 'row-unconfigured'
}

function openAddProduct() {
  addProductOpen.value = true
}

function onProductsAdded(items) {
  if (!props.process?.name) return
  const newRows = createUnconfiguredTableRows(items, props.process.name)
  const exist = new Set(tableRows.value.map((r) => r.rowKey))
  newRows.forEach((row) => {
    if (!exist.has(row.rowKey)) {
      tableRows.value.push(row)
      exist.add(row.rowKey)
    }
  })
}

function openBatchFill() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选目标产品')
    return
  }
  batchFillMode.value = 'batch'
  batchFillInitialRow.value = null
  batchFillTargetKeys.value = [...selectedRowKeys.value]
  batchFillOpen.value = true
}

function quickFillRow(record) {
  batchFillMode.value = 'fill'
  batchFillInitialRow.value = { ...record }
  batchFillTargetKeys.value = [record.rowKey]
  batchFillOpen.value = true
}

function onBatchFillConfirm(patch) {
  const targets = tableRows.value.filter((r) => batchFillTargetKeys.value.includes(r.rowKey))
  applyBatchFillPatch(targets, patch)
  message.success(
    batchFillMode.value === 'fill' ? '已更新工时参数' : `已批量更新 ${targets.length} 条记录`,
  )
}

function batchDelete() {
  if (!selectedRowKeys.value.length || !props.process?.name) return
  Modal.confirm({
    title: '批量删除',
    content: `确定移除选中的 ${selectedRowKeys.value.length} 条工时配置吗？保存后将同步更新产品/物料主数据。`,
    okType: 'danger',
    onOk: () => {
      removeRowsByKeys(selectedRowKeys.value)
    },
  })
}

function deleteRow(record) {
  Modal.confirm({
    title: '删除',
    content: `确定移除「${record.name || record.code}」的工时配置吗？保存后将同步更新产品/物料主数据。`,
    okType: 'danger',
    onOk: () => {
      removeRowsByKeys([record.rowKey])
    },
  })
}

function removeRowsByKeys(keys) {
  const targets = tableRows.value.filter((r) => keys.includes(r.rowKey))
  removedRows.value.push(...targets)
  tableRows.value = tableRows.value.filter((r) => !keys.includes(r.rowKey))
  selectedRowKeys.value = selectedRowKeys.value.filter((k) => !keys.includes(k))
  message.success('已从列表移除，保存后同步更新主数据')
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!props.process?.name) return
  const res = saveProcessLaborRows(props.process.name, tableRows.value)
  if (removedRows.value.length) {
    removeProcessLaborRows(props.process.name, removedRows.value)
  }
  if (!res.ok) {
    message.warning('保存失败')
    return
  }
  message.success(`已保存 ${res.saved} 条工时配置至产品/物料主数据`)
  removedRows.value = []
  emit('saved')
  emit('update:open', false)
}
</script>

<style scoped>
.process-labor-config-modal :deep(.ant-modal-body) {
  max-height: calc(100vh - 180px);
  overflow-y: auto;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.stats-row {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.stat.configured {
  color: #1677ff;
  font-weight: 600;
}

.stat.unconfigured {
  color: #fa8c16;
  font-weight: 600;
}

.footer-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 12px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.price-text {
  color: #1677ff;
}

.status-ok {
  color: #52c41a;
  font-size: 16px;
}

.status-warn {
  color: #faad14;
  font-size: 16px;
}

:deep(.row-unconfigured) > td {
  background: #fffbe6 !important;
}

:deep(.row-unconfigured:hover) > td {
  background: #fff7cc !important;
}
</style>
