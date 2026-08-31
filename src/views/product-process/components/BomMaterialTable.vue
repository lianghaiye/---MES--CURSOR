<template>
  <div class="bom-material-table" :class="{ 'is-readonly': readonly }">
    <div class="table-toolbar">
      <a-space :size="8" wrap class="toolbar-left">
        <span class="toolbar-title">物料清单</span>
        <template v-if="!readonly">
          <a-button size="small" @click="emit('import-template')"> 从模板导入 </a-button>
          <a-button size="small" @click="emit('add-by-bom')">按BOM添加</a-button>
          <a-button type="primary" size="small" @click="emit('add-sub-item')">
            <PlusOutlined />
            添加子项
          </a-button>
          <a-button size="small" html-type="button" @click="openBlankSizeFromToolbar">
            下料
          </a-button>
          <template v-if="hasSelection">
            <a-button size="small" @click="openBatchEdit">修改</a-button>
            <a-button size="small" danger @click="handleBatchDelete">删除</a-button>
          </template>
        </template>
      </a-space>
      <a-space :size="4">
        <a-button v-if="isTreeMode" size="small" @click="toggleExpandAll">
          {{ allTreeExpanded ? '收起' : '展开' }}
        </a-button>
        <template v-if="!readonly">
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
        </template>
      </a-space>
    </div>

    <div class="table-list-panel">
      <div class="table-scroll-wrap">
        <a-table
          :columns="tableColumns"
          :data-source="tableData"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="tableScroll"
          :custom-row="customRow"
          v-model:expanded-row-keys="expandedRowKeys"
          :row-class-name="rowClassName"
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
              <span v-if="readonly || isTreeMode">{{ displayRowIndex(record, index) }}</span>
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
                  @change="(e) => toggleRowSelect(record.id, !!(e?.target?.checked ?? e))"
                  @click.stop
                />
              </div>
            </template>
            <template v-else-if="readonly">
              <template v-if="column.key === 'unitQty'">{{ formatQty(record.unitQty) }}</template>
              <template v-else-if="column.key === 'blankSizeText'">
                <template v-if="record.blankSizeText">
                  {{ record.blankSizeText }}
                  <div v-if="record.blankArea > 0" class="blank-area-hint">
                    ≈ {{ formatQty(record.blankArea) }}㎡/件
                  </div>
                </template>
                <template v-else>—</template>
              </template>
              <template v-else-if="column.key === 'unit'">{{
                formatCell(lineStockUnit(record))
              }}</template>
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
              <a-input
                v-if="isSpuLine(record)"
                v-model:value="record.itemName"
                size="small"
                placeholder="子项名称"
                @update:value="(v) => onItemNameRename(record, v)"
              />
              <BomSubItemMaterialSelect
                v-else
                :value="record.materialCode"
                :fallback-name="record.itemName"
                placeholder="子项名称"
                @select="(material) => emit('material-change', { lineId: record.id, material })"
                @rename="(name) => onItemNameRename(record, name)"
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
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'blankSizeText'">
              <a class="blank-size-link" @click.stop="openBlankSizeForLine(record)">
                <template v-if="record.blankSizeText">
                  {{ record.blankSizeText }}
                  <div v-if="record.blankArea > 0" class="blank-area-hint">
                    ≈ {{ formatQty(record.blankArea) }}㎡/件
                  </div>
                  <div v-else-if="record.blankLength > 0" class="blank-area-hint">
                    ≈ {{ formatQty(record.blankLength) }}米/件
                  </div>
                </template>
                <template v-else>点击填写</template>
              </a>
            </template>
            <template v-else-if="column.key === 'unit'">
              <span class="readonly-stock-unit">{{ lineStockUnit(record) }}</span>
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
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
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
                placeholder="替代件名称（选填）"
                @select="(material) => onSubstituteSelect(record, material)"
                @rename="(name) => onSubstituteRename(record, name)"
                @clear="onSubstituteClear(record)"
              />
            </template>
            <template v-else-if="column.key === 'childBom'">
              <span class="child-bom-text" :title="formatChildBom(record)">
                {{ formatChildBom(record) }}
              </span>
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="action-cell" @click.stop>
                <a-button
                  type="link"
                  size="small"
                  class="action-link"
                  @click="handleAddSubItem(record)"
                >
                  添加子项
                </a-button>
                <a-button
                  type="link"
                  size="small"
                  danger
                  class="action-link"
                  @click="handleDeleteLine(record)"
                >
                  删除
                </a-button>
              </div>
            </template>
            <template v-else>
              {{ formatCell(record[column.dataIndex]) }}
            </template>
          </template>
        </a-table>
      </div>

      <div v-if="!readonly" class="table-list-footer">
        <a-button type="link" size="small" class="add-detail-link" @click="emit('add-detail-line')">
          + 添加明细行
        </a-button>
      </div>
    </div>

    <div v-if="showSummaryBar" class="list-summary-bar">
      <div class="summary-totals-row">
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
      <div class="summary-meta-row">
        <span>BOM版本：{{ summaryMeta.version || '—' }}</span>
        <span class="summary-sep">/</span>
        <span>生效日期：{{ summaryMeta.effectiveAt || '—' }}</span>
        <span class="summary-sep">/</span>
        <span>创建人：{{ summaryMeta.creator || '—' }}</span>
      </div>
    </div>

    <BomMaterialBatchEditModal
      v-model:open="batchEditOpen"
      :count="selectedRowKeys.length"
      @confirm="handleBatchEditConfirm"
    />
    <BomBlankSizeModal
      v-model:open="blankSizeOpen"
      :line="blankSizeTargetLine"
      @confirm="onBlankSizeConfirm"
    />
  </div>
</template>

<script setup>
import {
  formatQty,
  formatNumber as formatPrice,
  inputNumberFormatter,
  inputNumberParser,
} from '@/utils/numberFormat'
import { computed, nextTick, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import {
  ReloadOutlined,
  SettingOutlined,
  PlusOutlined,
  HolderOutlined,
} from '@ant-design/icons-vue'
import {
  processDocOptions,
  processRouteOptions,
  formatChildBomLabel,
  formatSubstitutePartLabel,
} from '@/mock/bomMaterialColumns'
import BomMaterialBatchEditModal from './BomMaterialBatchEditModal.vue'
import BomBlankSizeModal from './BomBlankSizeModal.vue'
import BomSubItemMaterialSelect from './BomSubItemMaterialSelect.vue'
import { isSpuLine, lineVariantSummary } from '@/utils/spuLineResolve'
import { applyBlankSizeToLine } from '@/utils/bomBlankSize'
import { resolveLineStockUnit, inferUomRelation } from '@/utils/variableLengthMaterial'
import { materialInfoState } from '@/store/materialInfoStore'
import { productInfoState } from '@/store/productInfoStore'
import {
  buildBomMaterialTree,
  assignMaterialTreeIndexes,
  assignMaterialTreeStripe,
  collectMaterialTreeRowKeys,
  flattenMaterialTreeLines,
  nodeHasTreeChildren,
} from '@/utils/bomTree'

const props = defineProps({
  lines: { type: Array, default: () => [] },
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  columnSettings: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
  emptyVariant: { type: String, default: 'default' },
  hideSwitchProduct: { type: Boolean, default: false },
  /** 根产品/物料展示名（信息条左侧） */
  rootItemLabel: { type: String, default: '' },
  contextNodeId: { type: String, default: '' },
  /** 合计区第二行：版本 / 生效日期 / 创建人 */
  summaryMeta: {
    type: Object,
    default: () => ({ version: '', effectiveAt: '', creator: '' }),
  },
})

function formatCell(val) {
  if (val == null || val === '') return '—'
  return val
}

function lineVariantDisplay(record) {
  return lineVariantSummary(record) || record.variantSummary || ''
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

function onSubstituteRename(record, name) {
  record.substituteName = name || ''
}

function onSubstituteClear(record) {
  record.substituteCode = ''
  record.substituteName = ''
}

function onItemNameRename(record, name) {
  record.itemName = name ?? ''
  emit('item-name-change', { lineId: record.id, itemName: String(name ?? '').trim() })
}

const emit = defineEmits([
  'refresh',
  'open-column-setting',
  'delete-line',
  'material-change',
  'item-name-change',
  'configure-variant',
  'add-sub-item',
  'add-by-bom',
  'add-detail-line',
  'reorder-lines',
  'delete-lines',
  'select-node',
  'switch-product',
  'import-template',
])

const processDocOpts = processDocOptions
const processRouteOpts = processRouteOptions

const isTreeMode = computed(
  () => props.flatNodes.length > 0 && props.lineItems.length >= 0 && !props.lines.length,
)

const tableData = computed(() => {
  if (!isTreeMode.value) return props.lines
  const tree = buildBomMaterialTree(props.flatNodes, props.lineItems)
  assignMaterialTreeIndexes(tree)
  assignMaterialTreeStripe(tree)
  return tree
})

const flatLines = computed(() =>
  isTreeMode.value ? flattenMaterialTreeLines(tableData.value) : props.lines,
)

const expandedRowKeys = ref([])

const allTreeRowKeys = computed(() => collectMaterialTreeRowKeys(tableData.value))

const allTreeExpanded = computed(
  () =>
    allTreeRowKeys.value.length > 0 &&
    allTreeRowKeys.value.every((key) => expandedRowKeys.value.includes(key)),
)

watch(
  () => [isTreeMode.value, allTreeRowKeys.value.join(',')],
  () => {
    if (!isTreeMode.value) {
      expandedRowKeys.value = []
      return
    }
    expandedRowKeys.value = [...allTreeRowKeys.value]
  },
  { immediate: true },
)

function toggleExpandAll() {
  expandedRowKeys.value = allTreeExpanded.value ? [] : [...allTreeRowKeys.value]
}

function displayRowIndex(record, index) {
  if (isTreeMode.value && record._treeIndex) return record._treeIndex
  return index + 1
}

function rowClassName(record) {
  const classes = []
  if (activeRowId.value === record.id) classes.push('bom-row-active')
  if (isTreeMode.value && props.contextNodeId && record.treeNodeId === props.contextNodeId) {
    classes.push('bom-row-context')
  }
  if (isTreeMode.value && record._stripeAlt) {
    classes.push('bom-row-stripe-alt')
  }
  return classes.join(' ')
}

function resolveContextNodeId(record) {
  if (record?.treeNodeId) return record.treeNodeId
  return record?.parentTreeId || ''
}

function lineHasSubtree(record) {
  if (!record?.treeNodeId) return false
  if (record.children?.length) return true
  return nodeHasTreeChildren(props.flatNodes, record.treeNodeId, props.lineItems)
}

function handleAddSubItem(record) {
  const parentId = resolveContextNodeId(record)
  if (!parentId) {
    message.warning('无法确定父节点')
    return
  }
  emit('add-sub-item', parentId)
}

function handleDeleteLine(record) {
  if (lineHasSubtree(record)) {
    Modal.confirm({
      title: '确认删除',
      content: '删除该节点将同时移除其下级节点与关联物料，是否继续？',
      okType: 'danger',
      onOk: () => emit('delete-line', record.id),
    })
    return
  }
  emit('delete-line', record.id)
}

function lookupLineMaterial(record) {
  if (!record) return null
  const code = record.materialCode
  const id = record.materialId || record.productId
  return (
    (code && materialInfoState.materials.find((m) => m.code === code)) ||
    (id && materialInfoState.materials.find((m) => m.id === id)) ||
    (code && productInfoState.products.find((p) => p.code === code)) ||
    (id && productInfoState.products.find((p) => p.id === id)) ||
    null
  )
}

function lineStockUnit(record) {
  void materialInfoState.materials
  void productInfoState.products
  return resolveLineStockUnit(record, lookupLineMaterial(record))
}

const widthMap = {
  materialCode: 180,
  itemName: 280,
  specModel: 120,
  categoryName: 90,
  materialType: 90,
  supplyForm: 90,
  material: 90,
  variantAttr: 140,
  drawingNo: 100,
  unitQty: 100,
  blankSizeText: 200,
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
    ...(props.readonly || isTreeMode.value
      ? []
      : [{ title: '拖动', key: 'drag', width: 52, align: 'center', fixed: 'left' }]),
    { title: '#', key: 'index', width: 72, align: 'center', fixed: 'left' },
    ...sorted.map((c) => ({
      title: c.title,
      key: c.key,
      dataIndex: c.key,
      width: widthMap[c.key] || 100,
      fixed: c.frozen ? 'left' : undefined,
      ellipsis: [
        'materialCode',
        'itemName',
        'remark',
        'material',
        'variantAttr',
        'childBom',
        'drawingNo',
        'substitutePart',
        'blankSizeText',
      ].includes(c.key),
    })),
    ...(props.readonly ? [] : [{ title: '操作', key: 'action', width: 148, fixed: 'right' }]),
  ]
  return cols
})

const scrollX = computed(() => {
  const sum = tableColumns.value.reduce((s, c) => s + (c.width || 100), 0)
  return Math.max(sum, 1400)
})

const summaryTotals = computed(() => {
  const rows = flatLines.value
  const count = rows.length
  const unitQtySum = rows.reduce((s, line) => s + (Number(line.unitQty) || 0), 0)
  const unitPriceSum = rows.reduce((s, line) => s + (Number(line.unitPrice) || 0), 0)
  return { count, unitQtySum, unitPriceSum }
})

const showSummaryBar = computed(() => (props.readonly ? flatLines.value.length > 0 : true))

const tableScroll = computed(() => ({
  x: scrollX.value,
}))

const dragFromIndex = ref(-1)
const hoverRowId = ref('')
const headerIndexHover = ref(false)
const selectedRowKeys = ref([])
/** 单击选中的当前行（用于下料） */
const activeRowId = ref('')
const batchEditOpen = ref(false)
const blankSizeOpen = ref(false)
const blankSizeTargetLine = ref(null)

function resolveBlankSizeTargetLine() {
  // 优先：恰好勾选一行（工具栏「下料」常见操作）
  if (selectedRowKeys.value.length === 1) {
    const key = selectedRowKeys.value[0]
    const byCheck = props.lines.find((l) => String(l.id) === String(key))
    if (byCheck) return byCheck
  }
  // 其次：单击高亮行
  if (activeRowId.value) {
    const byActive = props.lines.find((l) => String(l.id) === String(activeRowId.value))
    if (byActive) return byActive
  }
  return null
}

function openBlankSizeFromToolbar() {
  if (selectedRowKeys.value.length > 1) {
    message.warning('下料仅支持单行，请只勾选一条物料行，或单击选中一行后再点「下料」')
    return
  }
  const line = resolveBlankSizeTargetLine()
  if (!line) {
    message.warning('请先勾选或单击选中一条物料行')
    return
  }
  openBlankSizeForLine(line)
}

function openBlankSizeForLine(record) {
  if (!record) {
    message.warning('未找到物料行')
    return
  }
  blankSizeTargetLine.value = record
  activeRowId.value = record.id
  // 同步库存单位到行上，便于保存后识别板材/型材（弹窗内部也会再解析一次）
  const mat = lookupLineMaterial(record)
  const unit = lineStockUnit(record)
  if (unit && unit !== '—') record.unit = unit
  if (mat?.isVariableLength) {
    record.isVariableLength = true
    if (!record.uomRelation) {
      record.uomRelation = inferUomRelation(
        mat.stockUnit || mat.inventoryUnit || unit,
        mat.uomRelation,
      )
    }
  }
  nextTick(() => {
    blankSizeOpen.value = true
  })
}

function onBlankSizeConfirm(payload) {
  const line = blankSizeTargetLine.value
  if (!line) return
  const blankSize = payload?.blankSize ?? payload
  const mode = payload?.mode
  const pieceWeightKg = payload?.pieceWeightKg
  applyBlankSizeToLine(line, blankSize, { mode, pieceWeightKg })
  line.unit = lineStockUnit(line)
  if (pieceWeightKg != null && Number(pieceWeightKg) > 0) {
    message.success(
      `下料尺寸已更新，单位用量 ${formatQty(pieceWeightKg)} kg${line.blankSizeText ? `（${line.blankSizeText}）` : ''}`,
    )
  } else if (line.blankArea > 0) {
    message.success(`下料尺寸已更新（单件 ${line.blankArea}㎡）`)
  } else if (line.blankLength > 0) {
    message.success(`下料尺寸已更新（单件 ${line.blankLength} 米）`)
  } else {
    message.success(line.blankSizeText ? '下料尺寸已更新' : '已清空下料尺寸')
  }
}

const hasSelection = computed(() => selectedRowKeys.value.length > 0)

const allLineIds = computed(() => flatLines.value.map((l) => l.id))

const allSelected = computed(
  () =>
    allLineIds.value.length > 0 &&
    allLineIds.value.every((id) => selectedRowKeys.value.includes(id)),
)

const indeterminate = computed(() => selectedRowKeys.value.length > 0 && !allSelected.value)

const shouldShowHeaderCheckbox = computed(() => headerIndexHover.value || hasSelection.value)

watch(
  () => flatLines.value.map((l) => l.id).join(','),
  () => {
    const ids = new Set(flatLines.value.map((l) => l.id))
    selectedRowKeys.value = selectedRowKeys.value.filter((id) => ids.has(id))
    if (activeRowId.value && !ids.has(activeRowId.value)) {
      activeRowId.value = ''
    }
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
    activeRowId.value = id
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
  const hasSubtree = selectedRowKeys.value.some((id) => {
    const line = flatLines.value.find((l) => l.id === id)
    return line && lineHasSubtree(line)
  })
  const content = hasSubtree
    ? `选中有装配件含下级节点，删除将同时移除其下级节点与关联物料。确定删除选中的 ${selectedRowKeys.value.length} 条明细吗？`
    : `确定删除选中的 ${selectedRowKeys.value.length} 条明细吗？`
  Modal.confirm({
    title: '确认删除',
    content,
    okType: 'danger',
    onOk: () => {
      emit('delete-lines', [...selectedRowKeys.value])
      selectedRowKeys.value = []
    },
  })
}

function handleBatchEditConfirm({ field, value }) {
  const ids = new Set(selectedRowKeys.value)
  flatLines.value.forEach((line) => {
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

function customRow(record, index) {
  if (props.readonly) {
    return {
      onClick: () => {
        if (!isTreeMode.value) return
        activeRowId.value = record.id
        emit('select-node', resolveContextNodeId(record))
      },
    }
  }
  return {
    onClick: (event) => {
      const tag = event?.target?.closest?.(
        'input, textarea, button, .ant-select, .ant-picker, .ant-input-number, a, .drag-handle',
      )
      if (tag) return
      activeRowId.value = record.id
      if (isTreeMode.value) emit('select-node', resolveContextNodeId(record))
    },
    onDragover: (event) => {
      if (isTreeMode.value) return
      event.preventDefault()
      clearDragOverClass()
      event.currentTarget?.classList.add('drag-over-row')
    },
    onDragleave: (event) => {
      event.currentTarget?.classList.remove('drag-over-row')
    },
    onDrop: (event) => {
      if (isTreeMode.value) return
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
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    margin-top: 8px;
    padding: 10px 12px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
    line-height: 1.5;
    flex-shrink: 0;

    .summary-totals-row,
    .summary-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 6px;
    }

    .summary-meta-row {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.55);
    }

    strong {
      color: rgba(0, 0, 0, 0.88);
      font-weight: 600;
    }

    .summary-sep {
      color: rgba(0, 0, 0, 0.25);
    }
  }

  .table-list-footer {
    flex-shrink: 0;
    padding: 10px 12px;
    min-height: 44px;
    display: flex;
    align-items: center;
    border-top: 1px solid #f0f0f0;
    background: #fff;
  }

  .add-detail-link {
    padding-left: 0;
    font-size: 13px;
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

  :deep(.ant-table-tbody > tr.bom-row-active > td) {
    background: #e6f4ff !important;
  }

  :deep(.ant-table-tbody > tr.bom-row-context > td:first-child) {
    box-shadow: inset 3px 0 0 #1677ff;
  }

  :deep(.ant-table-tbody > tr.bom-row-stripe-alt > td) {
    background: #fafafa;
  }

  /* 悬浮行：浅橙色（含斑马纹行） */
  :deep(.ant-table-tbody > tr:hover > td),
  :deep(.ant-table-tbody > tr.bom-row-stripe-alt:hover > td) {
    background: #fff7e6 !important;
  }

  :deep(.ant-table-tbody > tr.bom-row-active:hover > td) {
    background: #ffe7ba !important;
  }

  :deep(.ant-table-tbody > tr > td) {
    white-space: nowrap;
  }

  :deep(.ant-table-tbody > tr > td .ant-input),
  :deep(.ant-table-tbody > tr > td .ant-input-number),
  :deep(.ant-table-tbody > tr > td .ant-select) {
    white-space: nowrap;
  }

  &:not(.is-readonly) :deep(.ant-table-tbody > tr > td) {
    cursor: pointer;
  }

  .readonly-stock-unit {
    color: rgba(0, 0, 0, 0.88);
  }

  .table-list-panel {
    display: flex;
    flex-direction: column;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    background: #fff;
  }

  .table-scroll-wrap {
    :deep(.ant-table-wrapper) {
      height: auto;
    }

    :deep(.ant-table) {
      margin-bottom: 0 !important;
    }

    :deep(.ant-table-container) {
      border-bottom: none !important;
    }

    /* 明细随内容增高，由外层 page-content 统一纵向滚动 */
    :deep(.ant-table-body) {
      overflow: visible !important;
      max-height: none !important;
    }
  }

  .variant-field-link {
    color: #1677ff;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 100%;
    vertical-align: bottom;

    &:hover {
      color: #4096ff;
    }
  }

  .blank-size-link {
    color: #1677ff;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 100%;
    vertical-align: bottom;

    &:hover {
      color: #4096ff;
    }
  }

  .blank-area-hint {
    margin-top: 2px;
    font-size: 11px;
    color: #d46b08;
    line-height: 1.2;
  }

  .action-cell {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;
    white-space: nowrap;

    .action-link {
      padding: 0 2px;
      height: 22px;
      line-height: 22px;
      flex-shrink: 0;
    }
  }
}
</style>
