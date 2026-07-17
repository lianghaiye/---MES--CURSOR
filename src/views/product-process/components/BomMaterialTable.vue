<template>
  <div class="bom-material-table">
    <div class="table-toolbar">
      <a-space :size="8" wrap class="toolbar-left">
        <span class="toolbar-title">物料清单</span>
        <template v-if="!readonly && hasSelection">
          <a-button size="small" @click="openBatchEdit">修改</a-button>
          <a-button size="small" danger @click="handleBatchDelete">删除</a-button>
        </template>
        <template v-else-if="!readonly">
          <a-button size="small" @click="emit('add-by-bom')">按BOM添加</a-button>
          <a-button type="primary" size="small" @click="emit('add-sub-item')">
            <PlusOutlined />
            添加子项
          </a-button>
        </template>
      </a-space>
      <a-space v-if="!readonly" :size="4">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="emit('refresh')">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="列显隐">
          <a-button type="text" size="small" @click="emit('open-column-setting')">
            <SettingOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <div v-if="showSummaryBar" class="list-summary-bar">
      <span class="summary-item"
        >合计 <strong>{{ summaryTotals.count }}</strong> 项</span
      >
      <span class="summary-sep">·</span>
      <span class="summary-item"
        >单位用量合计 <strong>{{ formatQty(summaryTotals.unitQtySum) }}</strong></span
      >
      <span class="summary-sep">·</span>
      <span class="summary-item"
        >BOM成本 <strong>{{ formatPrice(summaryTotals.unitPriceSum) }}</strong></span
      >
    </div>

    <div ref="tableListPanelRef" class="table-list-panel">
      <div ref="tableScrollWrapRef" class="table-scroll-wrap">
        <a-table
          :columns="tableColumns"
          :data-source="lines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="tableScroll"
          :custom-row="customRow"
        >
          <template #headerCell="{ column }">
            <template v-if="column.key === 'index' && !readonly">
              <div
                class="header-index-cell"
                @mouseenter="headerIndexHover = true"
                @mouseleave="headerIndexHover = false"
              >
                <span v-show="!shouldShowHeaderCheckbox" class="index-num">#</span>
                <a-checkbox
                  v-show="shouldShowHeaderCheckbox"
                  :checked="allSelected"
                  :indeterminate="indeterminate"
                  @change="toggleSelectAll"
                  @click.stop
                />
              </div>
            </template>
          </template>
          <template #emptyText>
            <div class="add-detail-empty">
              <a-empty v-if="emptyVariant === 'no-children'" description="暂无子项" />
              <a-button
                v-if="!readonly && emptyVariant !== 'no-children'"
                type="link"
                size="small"
                @click="emit('add-detail-line')"
              >
                添加明细行
              </a-button>
            </div>
          </template>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'drag'">
              <a-tooltip title="拖动">
                <span
                  class="drag-handle"
                  draggable="true"
                  @dragstart="onDragStart(index, $event)"
                  @dragend="onDragEnd"
                >
                  <HolderOutlined />
                </span>
              </a-tooltip>
            </template>
            <template v-else-if="column.key === 'index'">
              <span v-if="readonly">{{ index + 1 }}</span>
              <div
                v-else
                class="row-index-cell"
                @mouseenter="hoverRowId = record.id"
                @mouseleave="hoverRowId = ''"
              >
                <span v-show="!shouldShowRowCheckbox(record)" class="index-num">{{
                  index + 1
                }}</span>
                <a-checkbox
                  v-show="shouldShowRowCheckbox(record)"
                  :checked="selectedRowKeys.includes(record.id)"
                  @change="(e) => toggleRowSelect(record.id, e.target.checked)"
                  @click.stop
                />
              </div>
            </template>
            <template v-else-if="readonly">
              <template v-if="column.key === 'unitQty'">{{ formatQty(record.unitQty) }}</template>
              <template v-else-if="column.key === 'unitPrice'">{{
                formatPrice(record.unitPrice)
              }}</template>
              <template v-else-if="column.key === 'itemName'">
                {{ formatCell(record.itemName) }}
              </template>
              <template v-else-if="column.key === 'variantAttr'">
                {{ lineVariantDisplay(record) || '—' }}
              </template>
              <template v-else-if="column.key === 'childBom'">
                {{ formatChildBom(record) }}
              </template>
              <template v-else-if="column.key === 'substitutePart'">
                {{ formatSubstitute(record) }}
              </template>
              <template v-else>{{ formatCell(record[column.dataIndex]) }}</template>
            </template>
            <template v-else-if="column.key === 'itemName'">
              <template v-if="isSpuLine(record)">
                <span>{{ record.itemName || '—' }}</span>
              </template>
              <BomSubItemMaterialSelect
                v-else
                :value="record.materialCode"
                :fallback-name="record.itemName"
                @select="(material) => emit('material-change', { lineId: record.id, material })"
              />
            </template>
            <template v-else-if="column.key === 'specModel'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="emit('configure-variant', record)"
              >
                {{ record.specModel || '点击配置' }}
              </a>
              <span v-else>{{ formatCell(record.specModel) }}</span>
            </template>
            <template v-else-if="column.key === 'material'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="emit('configure-variant', record)"
              >
                {{ record.material || '点击配置' }}
              </a>
              <span v-else>{{ formatCell(record.material) }}</span>
            </template>
            <template v-else-if="column.key === 'variantAttr'">
              <a
                v-if="isSpuLine(record)"
                class="variant-field-link"
                @click.prevent="emit('configure-variant', record)"
              >
                {{ lineVariantDisplay(record) || '—' }}
              </a>
              <span v-else>{{ lineVariantDisplay(record) || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'unitQty'">
              <a-input-number
                v-model:value="record.unitQty"
                size="small"
                :min="0"
                :precision="2"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'unit'">
              <a-select
                v-model:value="record.unit"
                size="small"
                style="width: 100%"
                :options="unitOpts"
              />
            </template>
            <template v-else-if="column.key === 'processDocName'">
              <a-select
                v-model:value="record.processDocName"
                allow-clear
                size="small"
                placeholder="请选择"
                style="width: 100%"
                :options="processDocOpts"
              />
            </template>
            <template v-else-if="column.key === 'processRoute'">
              <a-select
                v-model:value="record.processRoute"
                allow-clear
                size="small"
                placeholder="请选择"
                style="width: 100%"
                :options="processRouteOpts"
              />
            </template>
            <template v-else-if="column.key === 'lossRate'">
              <a-input-number
                v-model:value="record.lossRate"
                size="small"
                :min="0"
                :max="100"
                placeholder="请输入"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'unitPrice'">
              <a-input-number
                v-model:value="record.unitPrice"
                size="small"
                :min="0"
                :precision="4"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'effectiveStart'">
              <a-date-picker
                v-model:value="record._effectiveStart"
                size="small"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                @change="(v) => (record.effectiveStart = v || '')"
              />
            </template>
            <template v-else-if="column.key === 'effectiveEnd'">
              <a-date-picker
                v-model:value="record._effectiveEnd"
                size="small"
                style="width: 100%"
                value-format="YYYY-MM-DD"
                @change="(v) => (record.effectiveEnd = v || '')"
              />
            </template>
            <template v-else-if="column.key === 'remark'">
              <a-input v-model:value="record.remark" size="small" placeholder="请输入备注" />
            </template>
            <template v-else-if="column.key === 'substitutePart'">
              <BomSubItemMaterialSelect
                :value="record.substituteCode"
                :fallback-name="record.substituteName"
                placeholder="请选择替代件（选填）"
                @select="(material) => onSubstituteSelect(record, material)"
                @clear="onSubstituteClear(record)"
              />
            </template>
            <template v-else-if="column.key === 'childBom'">
              <span class="child-bom-text" :title="formatChildBom(record)">
                {{ formatChildBom(record) }}
              </span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="emit('delete-line', record.id)">
                <DeleteOutlined />
                删除
              </a-button>
            </template>
            <template v-else>
              {{ formatCell(record[column.dataIndex]) }}
            </template>
          </template>
        </a-table>
      </div>

      <div v-if="!readonly" class="table-list-footer">
        <a-button type="link" size="small" class="add-detail-link" @click="emit('add-detail-line')">
          添加明细行
        </a-button>
      </div>
    </div>

    <BomMaterialBatchEditModal
      v-model:open="batchEditOpen"
      :count="selectedRowKeys.length"
      @confirm="handleBatchEditConfirm"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  ReloadOutlined,
  SettingOutlined,
  DeleteOutlined,
  PlusOutlined,
  HolderOutlined,
} from '@ant-design/icons-vue'
import {
  unitOptions,
  processDocOptions,
  processRouteOptions,
  formatChildBomLabel,
  formatSubstitutePartLabel,
} from '@/mock/bomMaterialColumns'
import BomMaterialBatchEditModal from './BomMaterialBatchEditModal.vue'
import BomSubItemMaterialSelect from './BomSubItemMaterialSelect.vue'
import { isSpuLine, lineVariantSummary } from '@/utils/spuLineResolve'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  columnSettings: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
  emptyVariant: { type: String, default: 'default' },
})

function formatCell(val) {
  if (val == null || val === '') return '—'
  return val
}

function lineVariantDisplay(record) {
  return lineVariantSummary(record) || record.variantSummary || ''
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(2)
}

function formatPrice(val) {
  if (val == null || val === '') return '—'
  return Number(val).toFixed(4)
}

function formatChildBom(record) {
  const text = formatChildBomLabel(record)
  return text || '—'
}

function formatSubstitute(record) {
  const text = formatSubstitutePartLabel(record)
  return text || '—'
}

function onSubstituteSelect(record, material) {
  if (!material) return
  record.substituteCode = material.code || ''
  record.substituteName = material.name || ''
}

function onSubstituteClear(record) {
  record.substituteCode = ''
  record.substituteName = ''
}

const emit = defineEmits([
  'refresh',
  'open-column-setting',
  'delete-line',
  'material-change',
  'configure-variant',
  'add-sub-item',
  'add-by-bom',
  'add-detail-line',
  'reorder-lines',
  'delete-lines',
])

const unitOpts = unitOptions.map((v) => ({ label: v, value: v }))
const processDocOpts = processDocOptions
const processRouteOpts = processRouteOptions

const widthMap = {
  materialCode: 120,
  itemName: 200,
  specModel: 120,
  categoryName: 90,
  materialType: 90,
  supplyForm: 90,
  material: 90,
  variantAttr: 140,
  drawingNo: 100,
  unitQty: 100,
  unit: 72,
  childBom: 160,
  processDocName: 120,
  lossRate: 120,
  processRoute: 120,
  unitPrice: 100,
  effectiveStart: 130,
  effectiveEnd: 130,
  remark: 120,
  substitutePart: 180,
}

const tableColumns = computed(() => {
  const sorted = [...props.columnSettings]
    .filter((c) => !c.hidden)
    .sort((a, b) => a.order - b.order)

  const cols = [
    ...(props.readonly
      ? []
      : [{ title: '拖动', key: 'drag', width: 52, align: 'center', fixed: 'left' }]),
    { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
    ...sorted.map((c) => ({
      title: c.title,
      key: c.key,
      dataIndex: c.key,
      width: widthMap[c.key] || 100,
      fixed: c.frozen ? 'left' : undefined,
      ellipsis: [
        'itemName',
        'remark',
        'material',
        'variantAttr',
        'childBom',
        'drawingNo',
        'substitutePart',
      ].includes(c.key),
    })),
    ...(props.readonly ? [] : [{ title: '操作', key: 'action', width: 80, fixed: 'right' }]),
  ]
  return cols
})

const scrollX = computed(() => {
  const sum = tableColumns.value.reduce((s, c) => s + (c.width || 100), 0)
  return Math.max(sum, 1400)
})

const summaryTotals = computed(() => {
  const count = props.lines.length
  const unitQtySum = props.lines.reduce((s, line) => s + (Number(line.unitQty) || 0), 0)
  const unitPriceSum = props.lines.reduce((s, line) => s + (Number(line.unitPrice) || 0), 0)
  return { count, unitQtySum, unitPriceSum }
})

const showSummaryBar = computed(() => (props.readonly ? props.lines.length > 0 : true))

const tableListPanelRef = ref(null)
const tableScrollWrapRef = ref(null)
const tableBodyHeight = ref(280)
let tableResizeObserver = null

const TABLE_HEADER_HEIGHT = 39

function updateTableBodyHeight() {
  const wrap = tableScrollWrapRef.value
  if (!wrap) return
  tableBodyHeight.value = Math.max(120, wrap.clientHeight - TABLE_HEADER_HEIGHT)
}

onMounted(() => {
  nextTick(() => {
    updateTableBodyHeight()
    const observeTarget = tableListPanelRef.value || tableScrollWrapRef.value
    if (observeTarget && typeof ResizeObserver !== 'undefined') {
      tableResizeObserver = new ResizeObserver(() => updateTableBodyHeight())
      tableResizeObserver.observe(observeTarget)
    }
  })
})

onUnmounted(() => {
  tableResizeObserver?.disconnect()
  tableResizeObserver = null
})

const tableScroll = computed(() => ({
  x: scrollX.value,
  y: tableBodyHeight.value,
}))

watch(
  () => [props.lines.length, props.readonly],
  () => {
    nextTick(() => updateTableBodyHeight())
  },
)

const dragFromIndex = ref(-1)
const hoverRowId = ref('')
const headerIndexHover = ref(false)
const selectedRowKeys = ref([])
const batchEditOpen = ref(false)

const hasSelection = computed(() => selectedRowKeys.value.length > 0)

const allLineIds = computed(() => props.lines.map((l) => l.id))

const allSelected = computed(
  () =>
    allLineIds.value.length > 0 &&
    allLineIds.value.every((id) => selectedRowKeys.value.includes(id)),
)

const indeterminate = computed(() => selectedRowKeys.value.length > 0 && !allSelected.value)

const shouldShowHeaderCheckbox = computed(() => headerIndexHover.value || hasSelection.value)

watch(
  () => props.lines.map((l) => l.id).join(','),
  () => {
    const ids = new Set(props.lines.map((l) => l.id))
    selectedRowKeys.value = selectedRowKeys.value.filter((id) => ids.has(id))
  },
)

function shouldShowRowCheckbox(record) {
  return hasSelection.value || hoverRowId.value === record.id || headerIndexHover.value
}

function toggleSelectAll(e) {
  if (e.target.checked) {
    selectedRowKeys.value = [...allLineIds.value]
  } else {
    selectedRowKeys.value = []
  }
}

function toggleRowSelect(id, checked) {
  if (checked) {
    if (!selectedRowKeys.value.includes(id)) {
      selectedRowKeys.value = [...selectedRowKeys.value, id]
    }
  } else {
    selectedRowKeys.value = selectedRowKeys.value.filter((key) => key !== id)
  }
}

function openBatchEdit() {
  if (selectedRowKeys.value.length > 200) {
    message.warning('每次最多修改 200 条数据')
    return
  }
  batchEditOpen.value = true
}

function handleBatchDelete() {
  if (!selectedRowKeys.value.length) return
  Modal.confirm({
    title: '确认删除',
    content: `确定删除选中的 ${selectedRowKeys.value.length} 条明细吗？`,
    okType: 'danger',
    onOk: () => {
      emit('delete-lines', [...selectedRowKeys.value])
      selectedRowKeys.value = []
    },
  })
}

function handleBatchEditConfirm({ field, value }) {
  const ids = new Set(selectedRowKeys.value)
  props.lines.forEach((line) => {
    if (!ids.has(line.id)) return
    if (field === 'unitQty') line.unitQty = value
    if (field === 'remark') line.remark = value
  })
  message.success(`已批量修改 ${ids.size} 条明细`)
  selectedRowKeys.value = []
}

function clearDragOverClass() {
  document.querySelectorAll('.bom-material-table .drag-over-row').forEach((el) => {
    el.classList.remove('drag-over-row')
  })
}

function onDragStart(index, event) {
  dragFromIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  dragFromIndex.value = -1
  clearDragOverClass()
}

function customRow(_record, index) {
  if (props.readonly) return {}
  return {
    onDragover: (event) => {
      event.preventDefault()
      clearDragOverClass()
      event.currentTarget?.classList.add('drag-over-row')
    },
    onDragleave: (event) => {
      event.currentTarget?.classList.remove('drag-over-row')
    },
    onDrop: (event) => {
      event.preventDefault()
      event.currentTarget?.classList.remove('drag-over-row')
      const from = dragFromIndex.value
      const to = index
      dragFromIndex.value = -1
      if (from >= 0 && to >= 0 && from !== to) {
        emit('reorder-lines', { fromIndex: from, toIndex: to })
      }
    },
  }
}
</script>

<style lang="less" scoped>
.bom-material-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    flex-shrink: 0;
    gap: 8px;

    .toolbar-left {
      flex: 1;
      min-width: 0;
    }

    .toolbar-title {
      font-weight: 600;
      font-size: 14px;
      flex-shrink: 0;
    }
  }

  .list-summary-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    padding: 6px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    line-height: 1.5;
    flex-shrink: 0;

    strong {
      color: rgba(0, 0, 0, 0.88);
      font-weight: 600;
    }

    .summary-sep {
      color: rgba(0, 0, 0, 0.25);
    }
  }

  .add-detail-empty {
    padding: 16px 0;
    text-align: left;

    :deep(.ant-empty) {
      margin-bottom: 4px;
    }
  }

  .child-bom-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(0, 0, 0, 0.65);
  }

  .add-detail-link {
    padding-left: 0;
  }

  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    color: rgba(0, 0, 0, 0.45);
    cursor: grab;

    &:active {
      cursor: grabbing;
    }

    &:hover {
      color: #1677ff;
    }
  }

  .row-index-cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
  }

  .header-index-cell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    min-height: 24px;
    cursor: default;
  }

  .index-num {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    user-select: none;
  }

  :deep(.drag-over-row > td) {
    background: #e6f4ff !important;
  }

  :deep(tr.drag-over-row > td) {
    background: #e6f4ff !important;
  }

  .table-list-panel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
  }

  .table-scroll-wrap {
    flex: 1;
    min-height: 0;
    overflow: hidden;

    :deep(.ant-table-wrapper) {
      height: auto;
    }

    :deep(.ant-table) {
      margin-bottom: 0 !important;
    }

    :deep(.ant-table-container) {
      border-bottom: none !important;
    }
  }

  .table-list-footer {
    flex-shrink: 0;
    padding: 2px 12px;
    min-height: 36px;
    display: flex;
    align-items: center;
    border-top: 1px solid #f0f0f0;
    background: #fafafa;
  }

  .variant-field-link {
    color: #1677ff;
    cursor: pointer;
    word-break: break-word;

    &:hover {
      color: #4096ff;
    }
  }
}
</style>
