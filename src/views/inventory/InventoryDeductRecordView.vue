<template>
  <div class="inventory-deduct-record-page">
    <div class="stats-row">
      <div v-for="card in statCards" :key="card.key" class="stat-card" :class="card.tone">
        <div class="stat-title">{{ card.title }}</div>
        <div class="stat-value">{{ card.value }}</div>
        <div class="stat-sub">{{ card.sub }}</div>
      </div>
    </div>

    <a-alert
      type="info"
      show-icon
      class="rule-alert"
      message="确认单据后 30 天内可执行撤销操作；超过 30 天后系统将锁定单据，不可再进行操作。"
    />

    <div class="filter-card">
      <a-form layout="inline" class="filter-form" :model="filters">
        <a-form-item label="工单/领料单号">
          <a-input
            v-model:value="filters.workOrderNo"
            allow-clear
            placeholder="搜索工单号或领料单号"
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="扣减状态">
          <a-select
            v-model:value="filters.status"
            :options="statusOptions"
            style="width: 140px"
            placeholder="全部"
          />
        </a-form-item>
        <a-form-item label="仓库">
          <a-select
            v-model:value="filters.warehouse"
            :options="warehouseOptions"
            style="width: 140px"
            placeholder="全部仓库"
          />
        </a-form-item>
        <a-form-item label="日期">
          <a-date-picker
            v-model:value="filters.date"
            allow-clear
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item class="filter-actions">
          <a-space>
            <a-button type="primary" :disabled="!selectedPendingIds.length" @click="onBatchConfirm">
              批量确认
            </a-button>
            <a-button @click="openExportModal">导出</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </div>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="middle"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'workOrderNo'">
            <div class="wo-cell">
              <a class="wo-link" @click.prevent="openDetail(record)">
                {{ resolveDocNo(record) }}
              </a>
              <div class="deduct-no">{{ record.deductNo }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'product'">
            <span>{{ record.productName || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'productSpec'">
            {{ record.productSpec || '—' }}
          </template>
          <template v-else-if="column.key === 'material'">
            {{ record.material || '—' }}
          </template>
          <template v-else-if="column.key === 'drawingNo'">
            {{ record.drawingNo || '—' }}
          </template>
          <template v-else-if="column.key === 'deductTime'">
            {{ record.deductTime || '—' }}
          </template>
          <template v-else-if="column.key === 'warehouse'">
            {{ record.warehouseName }} ({{ record.warehouseCode }})
          </template>
          <template v-else-if="column.key === 'materialRows'">
            {{ record.materialDone }}/{{ record.materialTotal }}
          </template>
          <template v-else-if="column.key === 'status'">
            <span class="status-tag" :class="statusClass(record.status)">{{ record.status }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="8">
              <template v-if="record.status === STATUS.VOIDED">
                <span class="action-disabled">已作废</span>
              </template>
              <template v-else-if="isLocked(record)">
                <span class="action-disabled" title="确认已超过30天，单据已锁定">已锁定</span>
              </template>
              <template v-else-if="record.status === STATUS.PENDING">
                <a @click="openEdit(record)">编辑</a>
                <a @click="onConfirm(record)">确认</a>
                <a class="action-danger" @click="onVoid(record)">作废</a>
              </template>
              <template v-else-if="record.status === STATUS.SUCCESS">
                <a @click="onUndoConfirm(record)">撤销确认</a>
                <a class="action-danger" @click="onVoid(record)">作废</a>
              </template>
              <template v-else>
                <a @click="onUndoConfirm(record)">撤销确认</a>
                <a @click="onRetry(record)">重试</a>
                <a class="action-danger" @click="onVoid(record)">作废</a>
              </template>
            </a-space>
          </template>
        </template>
      </a-table>

      <div class="table-footer">
        <span class="page-summary">
          共 {{ filteredList.length }} 条，第 {{ pageRangeText }} 条
          <template v-if="selectedRowKeys.length">（已选 {{ selectedRowKeys.length }}）</template>
        </span>
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          :show-size-changer="false"
        />
      </div>
    </div>

    <InventoryDeductEditModal v-model:open="editOpen" :record="activeRecord" @saved="onSaved" />
    <ExportExcelModal
      v-model:open="exportModalOpen"
      v-model:settings="exportFieldSettings"
      :default-settings="defaultExportFieldSettings"
      :filtered-count="exportRowCount"
      :selected-count="selectedExportRowCount"
      @export="doExport"
    />
  </div>
</template>

<script>
export default { name: 'InventoryDeductRecordView' }
</script>

<script setup>
import { computed, createVNode, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import {
  MATERIAL_DEDUCT_STATUS,
  MATERIAL_DEDUCT_STATUS_OPTIONS,
  resolveInventoryDeductDocNo,
  isQuickMaterialDeduct,
} from '@/mock/materialRequisitionRecords'
import {
  materialRequisitionState,
  confirmMaterialDeduct,
  batchConfirmMaterialDeduct,
  undoConfirmMaterialDeduct,
  voidMaterialDeduct,
  retryMaterialDeduct,
  isMaterialDeductLocked,
} from '@/store/materialRequisitionStore'
import { useTabs } from '@/composables/useTabs'
import InventoryDeductEditModal from './components/InventoryDeductEditModal.vue'
import ExportExcelModal from '@/components/ExportExcelModal.vue'
import { useListExport } from '@/composables/useListExport'
import {
  flattenInventoryDeductRows,
  inventoryDeductExportFields,
} from '@/utils/exportFields/inventoryDeductExport'

const router = useRouter()
const { openTab } = useTabs()

const STATUS = MATERIAL_DEDUCT_STATUS

const filters = reactive({
  workOrderNo: '',
  status: '',
  warehouse: '',
  date: undefined,
})

const pagination = reactive({
  current: 1,
  pageSize: 8,
})

const editOpen = ref(false)
const activeRecord = ref(null)
const selectedRowKeys = ref([])

const statusOptions = MATERIAL_DEDUCT_STATUS_OPTIONS

const warehouseOptions = computed(() => {
  const map = new Map()
  materialRequisitionState.records.forEach((r) => {
    const key = `${r.warehouseName}|${r.warehouseCode}`
    if (!map.has(key)) {
      map.set(key, {
        label: `${r.warehouseName} (${r.warehouseCode})`,
        value: key,
      })
    }
  })
  return [{ label: '全部仓库', value: '' }, ...map.values()]
})

const stats = computed(() => materialRequisitionState.stats)

const statCards = computed(() => [
  {
    key: 'today',
    title: '今日扣减笔数',
    value: stats.value.todayCount,
    sub: `成功 ${stats.value.todaySuccess} / 失败 ${stats.value.todayFailed}`,
    tone: 'tone-green',
  },
  {
    key: 'pending',
    title: '待确认扣减',
    value: stats.value.pendingAudit,
    sub: '预扣锁定中，确认后转实扣',
    tone: 'tone-orange',
  },
  {
    key: 'fail',
    title: '扣减失败 (库存不足)',
    value: stats.value.failInsufficient,
    sub: '需补料或调整后重试',
    tone: 'tone-red',
  },
  {
    key: 'voided',
    title: '已作废扣减',
    value: stats.value.revokedMonth,
    sub: '本月累计',
    tone: 'tone-gray',
  },
])

const columns = [
  { title: '工单/领料单号', key: 'workOrderNo', width: 180 },
  { title: '产品名称', key: 'product', width: 120, ellipsis: true },
  { title: '规格型号', key: 'productSpec', width: 120, ellipsis: true },
  { title: '材质', key: 'material', width: 100, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 130, ellipsis: true },
  { title: '报工数量', dataIndex: 'reportQty', key: 'reportQty', width: 100, align: 'right' },
  { title: '扣减时间', key: 'deductTime', width: 170 },
  { title: '仓库', key: 'warehouse', width: 160 },
  { title: '物料行数', key: 'materialRows', width: 100, align: 'center' },
  { title: '扣减状态', key: 'status', width: 110 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

function resolveDocNo(record) {
  return resolveInventoryDeductDocNo(record) || '—'
}

function docNoLabel(record) {
  return isQuickMaterialDeduct(record) ? '领料单' : '工单'
}

const filteredList = computed(() => {
  const kw = filters.workOrderNo.trim().toLowerCase()
  return materialRequisitionState.records.filter((r) => {
    const docNo = resolveInventoryDeductDocNo(r)
    if (
      kw &&
      !`${docNo} ${r.workOrderNo || ''} ${r.reqNo || ''} ${r.deductNo}`.toLowerCase().includes(kw)
    )
      return false
    if (filters.status && r.status !== filters.status) return false
    if (filters.warehouse) {
      const key = `${r.warehouseName}|${r.warehouseCode}`
      if (key !== filters.warehouse) return false
    }
    if (filters.date) {
      const day = (r.deductTime || '').slice(0, 10)
      if (day) {
        if (day !== filters.date) return false
      } else {
        const mmdd = filters.date.slice(5).replace('-', '')
        if (!String(docNo || '').includes(mmdd)) return false
      }
    }
    return true
  })
})

watch(
  () => [filters.workOrderNo, filters.status, filters.warehouse, filters.date],
  () => {
    pagination.current = 1
    selectedRowKeys.value = []
  },
)

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const pageRangeText = computed(() => {
  const total = filteredList.value.length
  if (!total) return '0-0'
  const start = (pagination.current - 1) * pagination.pageSize + 1
  const end = Math.min(pagination.current * pagination.pageSize, total)
  return `${start}-${end}`
})

const selectedPendingIds = computed(() =>
  selectedRowKeys.value.filter((id) => {
    const row = materialRequisitionState.records.find((r) => r.id === id)
    return row?.status === STATUS.PENDING
  }),
)

const exportFlatRows = computed(() => flattenInventoryDeductRows(filteredList.value))
const selectedExportFlatRows = computed(() =>
  flattenInventoryDeductRows(
    materialRequisitionState.records.filter((r) => selectedRowKeys.value.includes(r.id)),
  ),
)
const exportRowCount = computed(() => exportFlatRows.value.length)
const selectedExportRowCount = computed(() => selectedExportFlatRows.value.length)

const {
  exportModalOpen,
  openExportModal,
  exportFieldSettings,
  defaultExportFieldSettings,
  doExport,
} = useListExport({
  storageKey: 'inventory-deduct-record-list-v3',
  fieldDefinitions: inventoryDeductExportFields,
  getFilteredRows: () => exportFlatRows.value,
  getSelectedRows: () => selectedExportFlatRows.value,
  fileNamePrefix: '库存扣减明细',
  sheetName: '扣减物料明细',
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (record) => ({
    disabled: record.status !== STATUS.PENDING,
  }),
}))

function statusClass(status) {
  const map = {
    [STATUS.SUCCESS]: 'is-success',
    [STATUS.FAILED]: 'is-failed',
    [STATUS.PARTIAL]: 'is-partial',
    [STATUS.VOIDED]: 'is-voided',
    [STATUS.PENDING]: 'is-pending',
  }
  return map[status] || ''
}

function isLocked(record) {
  return isMaterialDeductLocked(record)
}

function refreshActive() {
  if (!activeRecord.value?.id) return
  activeRecord.value =
    materialRequisitionState.records.find((r) => r.id === activeRecord.value.id) || null
}

function openDetail(record) {
  const path = `/inventory/deduct-records/${record.id}`
  openTab(path, record.deductNo || '扣减记录详情')
  router.push(path)
}

function openEdit(record) {
  activeRecord.value = record
  editOpen.value = true
}

function onConfirm(record) {
  Modal.confirm({
    title: '确认扣减？',
    content: `确认通过${docNoLabel(record)} ${resolveDocNo(record)} 的库存扣减？通过后将按物料执行扣减。`,
    okText: '确认',
    cancelText: '取消',
    onOk() {
      const res = confirmMaterialDeduct(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success(`已确认，状态：${res.record.status}`)
      refreshActive()
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
    },
  })
}

function onBatchConfirm() {
  const ids = selectedPendingIds.value
  if (!ids.length) {
    message.warning('请勾选待确认的记录')
    return
  }
  Modal.confirm({
    title: '批量确认扣减？',
    content: `已选 ${ids.length} 条待确认记录，确认后将按各单物料执行扣减（预扣转实扣）。`,
    okText: '批量确认',
    cancelText: '取消',
    onOk() {
      const res = batchConfirmMaterialDeduct(ids)
      if (!res.okCount) {
        message.warning('没有可确认的记录')
        return
      }
      message.success(
        `已确认 ${res.okCount} 条${res.failCount ? `，失败 ${res.failCount} 条` : ''}`,
      )
      selectedRowKeys.value = []
      refreshActive()
    },
  })
}

function onUndoConfirm(record) {
  Modal.confirm({
    title: '撤销确认？',
    content:
      '撤销确认后，已实扣的库存将退回至扣减仓库，单据恢复为「待确认」，预扣锁定继续保留。是否继续？',
    okText: '撤销确认',
    cancelText: '取消',
    onOk() {
      const res = undoConfirmMaterialDeduct(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已撤销确认，单据已恢复为待确认')
      refreshActive()
    },
  })
}

function onVoid(record) {
  Modal.confirm({
    title: '确认作废？',
    icon: createVNode(ExclamationCircleOutlined, { style: { color: '#ff4d4f' } }),
    content: createVNode('div', { class: 'void-confirm-content' }, [
      createVNode(
        'p',
        { style: { color: '#cf1322', marginBottom: '8px', fontWeight: 600 } },
        '作废后不可恢复',
      ),
      createVNode(
        'p',
        { style: { color: '#cf1322', marginBottom: 0 } },
        `${docNoLabel(record)} ${resolveDocNo(record)} 的扣减单作废后将永久失效：预扣库存解冻退回，且不可再重新发起。如需再次扣减，请联系仓管员另行处理。`,
      ),
    ]),
    okText: '确认作废',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      const res = voidMaterialDeduct(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('单据已作废')
      refreshActive()
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
    },
  })
}

function onRetry(record) {
  const res = retryMaterialDeduct(record.id)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(`已重试，状态：${res.record.status}`)
  refreshActive()
}

function onSaved() {
  refreshActive()
}
</script>

<style lang="less" scoped>
.inventory-deduct-record-page {
  padding: 0;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 18px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border-left-width: 3px;
  border-left-style: solid;

  &.tone-green {
    border-left-color: #52c41a;
    .stat-value {
      color: #389e0d;
    }
  }

  &.tone-orange {
    border-left-color: #fa8c16;
    .stat-value {
      color: #d46b08;
    }
  }

  &.tone-red {
    border-left-color: #ff4d4f;
    .stat-value {
      color: #cf1322;
    }
  }

  &.tone-gray {
    border-left-color: #8c8c8c;
    .stat-value {
      color: #595959;
    }
  }
}

.stat-title {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
  margin-bottom: 6px;
}

.stat-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.rule-alert {
  margin-bottom: 12px;
}

.filter-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 4px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.filter-form {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.filter-actions {
  margin-left: auto;
}

.table-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 16px;
  border: 1px solid #f0f0f0;
}

.wo-cell {
  line-height: 1.35;
}

.wo-link {
  color: #1677ff;
  cursor: pointer;
}

.deduct-no {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-top: 2px;
}

.status-tag {
  display: inline-block;
  padding: 0 8px;
  height: 22px;
  line-height: 20px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid transparent;

  &.is-success {
    color: #fff;
    background: #52c41a;
    border-color: #52c41a;
  }

  &.is-failed {
    color: #fff;
    background: #ff4d4f;
    border-color: #ff4d4f;
  }

  &.is-partial {
    color: #fff;
    background: #fa8c16;
    border-color: #fa8c16;
  }

  &.is-voided {
    color: #fff;
    background: #8c8c8c;
    border-color: #8c8c8c;
  }

  &.is-pending {
    color: #d46b08;
    background: #fff7e6;
    border-color: #ffd591;
  }
}

.action-disabled {
  color: rgba(0, 0, 0, 0.25);
  cursor: default;
}

.action-danger {
  color: #ff4d4f;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 12px;
}

.page-summary {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}

@media (max-width: 1100px) {
  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    margin-left: 0;
  }
}
</style>
