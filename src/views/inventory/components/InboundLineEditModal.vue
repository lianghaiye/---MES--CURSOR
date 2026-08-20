<template>
  <a-modal
    :open="open"
    :title="mode === 'copy' ? '复制入库明细' : '编辑入库明细'"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    class="inventory-line-edit-modal"
    @cancel="handleCancel"
  >
    <a-form v-if="draft" layout="vertical" class="edit-form">
      <a-form-item required>
        <template #label>
          <span class="field-label">
            <FileTextOutlined />
            产品信息
          </span>
        </template>
        <template v-if="lockProduct">
          <a-input :value="lockedProductLabel" disabled placeholder="—" />
        </template>
        <a-select
          v-else
          v-model:value="selectedItemKey"
          show-search
          placeholder="请选择产品/物料"
          :filter-option="filterItemOption"
          :options="itemSelectOpts"
          @change="onItemChange"
        />
        <div v-if="preview" class="item-preview">
          <div class="preview-main">
            <div class="preview-row">
              <span class="preview-label">产品编号</span>
              <span>{{ preview.itemCode || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">产品名称</span>
              <span>{{ preview.itemName || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">产品规格</span>
              <span>{{ preview.specModel || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">库存数量</span>
              <span>{{ formatQty(preview.stockQty) }} {{ preview.unit || '件' }}</span>
            </div>
          </div>
          <div class="preview-stock-box">
            <div class="stock-value">{{ formatQty(preview.warehouseStockQty) }}</div>
            <div class="stock-label">当前仓库数量({{ preview.unit || '件' }})</div>
          </div>
        </div>
      </a-form-item>

      <a-form-item required>
        <template #label>
          <span class="field-label">
            <HomeOutlined />
            入库仓库
          </span>
        </template>
        <a-select
          v-model:value="draft.warehouse"
          allow-clear
          placeholder="请选择仓库"
          :options="warehouseOpts"
          @change="refreshPreviewStock"
        />
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <HomeOutlined />
            货位号
          </span>
        </template>
        <a-input v-model:value="draft.locationNo" allow-clear placeholder="请输入货位号" />
      </a-form-item>

      <template v-if="isVariableLengthLine">
        <a-form-item required>
          <template #label>
            <span class="field-label">
              <UnorderedListOutlined />
              到货件数（{{ purchaseUnitLabel }}）
            </span>
          </template>
          <a-input-number
            v-model:value="draft.purchaseQty"
            :min="1"
            :precision="0"
            :placeholder="`按${purchaseUnitLabel}计`"
            style="width: 100%"
            @change="onPurchaseQtyChange"
          />
        </a-form-item>

        <a-form-item required>
          <template #label>
            <span class="field-label">
              <UnorderedListOutlined />
              库存数量怎么填
            </span>
          </template>
          <a-radio-group
            v-model:value="draft.inboundEntryMode"
            :options="entryModeOpts"
            @change="onEntryModeChange"
          />
          <div class="vl-tip">
            采购单位（{{ purchaseUnitLabel }}）与库存单位（{{
              stockUnitLabel
            }}）不同：先填到货件数，再填库存数量。
            <template v-if="showAreaShortcut">
              库存单位为面积时，可用「长 × 宽」换算，也可直接填合计{{ stockUnitLabel }}。
            </template>
            <template v-if="isPieceManagedBarcode">
              一物一码须按件填写，不支持「直接填合计」。
            </template>
          </div>
        </a-form-item>

        <a-form-item v-if="showAreaShortcut && (isUniformMode || isPieceMode)" label="尺寸单位">
          <a-radio-group
            v-model:value="draft.dimUnit"
            :options="plateDimUnitOpts"
            option-type="button"
            size="small"
          />
        </a-form-item>

        <template v-if="isUniformMode && showAreaShortcut">
          <a-row :gutter="12">
            <a-col :span="8">
              <a-form-item required>
                <template #label>
                  <span class="field-label">长（{{ draft.dimUnit || 'mm' }}）</span>
                </template>
                <a-input-number
                  v-model:value="draft.uniformLength"
                  :min="0.001"
                  :precision="4"
                  :formatter="inputNumberFormatter"
                  :parser="inputNumberParser"
                  placeholder="长"
                  style="width: 100%"
                  @change="syncUniformAreaFromDims"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item required>
                <template #label>
                  <span class="field-label">宽（{{ draft.dimUnit || 'mm' }}）</span>
                </template>
                <a-input-number
                  v-model:value="draft.uniformWidth"
                  :min="0.001"
                  :precision="4"
                  :formatter="inputNumberFormatter"
                  :parser="inputNumberParser"
                  placeholder="宽"
                  style="width: 100%"
                  @change="syncUniformAreaFromDims"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item required>
                <template #label>
                  <span class="field-label">单件面积（{{ stockUnitLabel }}）</span>
                </template>
                <a-input-number
                  v-model:value="draft.uniformValue"
                  :min="0.001"
                  :precision="4"
                  :formatter="inputNumberFormatter"
                  :parser="inputNumberParser"
                  placeholder="自动计算，可改"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </template>

        <a-form-item v-else-if="isUniformMode" required>
          <template #label>
            <span class="field-label">
              <UnorderedListOutlined />
              单件数量（{{ stockUnitLabel }}）
            </span>
          </template>
          <a-input-number
            v-model:value="draft.uniformValue"
            :min="0.001"
            :precision="4"
            :formatter="inputNumberFormatter"
            :parser="inputNumberParser"
            placeholder="每件相同数量"
            style="width: 100%"
          />
        </a-form-item>

        <a-form-item v-else-if="isTotalMode" required>
          <template #label>
            <span class="field-label">
              <UnorderedListOutlined />
              {{ showAreaShortcut ? '合计面积' : '合计数量' }}（{{ stockUnitLabel }}）
            </span>
          </template>
          <a-input-number
            v-model:value="draft.totalValue"
            :min="0.001"
            :precision="4"
            :formatter="inputNumberFormatter"
            :parser="inputNumberParser"
            placeholder="本次入库合计"
            style="width: 100%"
          />
        </a-form-item>

        <div v-else-if="isPieceMode && showAreaShortcut" class="piece-list">
          <div class="piece-list-head">
            <span>逐张尺寸（单位：{{ draft.dimUnit || 'mm' }} → {{ stockUnitLabel }}）</span>
            <span class="piece-progress">
              已填 {{ pieceDimFilledCount }}/{{ pieceExpectedCount }}
            </span>
          </div>
          <div v-if="!pieceExpectedCount" class="vl-tip">
            请先填写到货件数（{{ purchaseUnitLabel }}）
          </div>
          <template v-else>
            <div class="piece-quick-fill">
              <a-input-number
                v-model:value="pieceQuickLength"
                :min="0.001"
                :precision="4"
                placeholder="快捷长"
                style="width: 110px"
              />
              <a-input-number
                v-model:value="pieceQuickWidth"
                :min="0.001"
                :precision="4"
                placeholder="快捷宽"
                style="width: 110px"
              />
              <a-button size="small" @click="fillEmptyPieceDims">填充未填项</a-button>
              <a-button size="small" @click="fillAllPieceDims">全部覆盖</a-button>
            </div>
            <div class="piece-dim-grid">
              <div v-for="idx in piecePageIndexes" :key="idx" class="piece-dim-row">
                <span class="piece-idx">{{ idx + 1 }}</span>
                <a-input-number
                  v-model:value="pieceDimDraftList[idx].length"
                  :min="0.001"
                  :precision="4"
                  size="small"
                  placeholder="长"
                  style="width: 100px"
                />
                <span class="dim-x">×</span>
                <a-input-number
                  v-model:value="pieceDimDraftList[idx].width"
                  :min="0.001"
                  :precision="4"
                  size="small"
                  placeholder="宽"
                  style="width: 100px"
                />
                <span class="dim-area">
                  = {{ formatQty(pieceDimArea(idx)) }} {{ stockUnitLabel }}
                </span>
              </div>
            </div>
            <div v-if="piecePageCount > 1" class="piece-pagination">
              <a-pagination
                v-model:current="piecePage"
                size="small"
                :total="pieceExpectedCount"
                :page-size="PIECE_PAGE_SIZE"
                :show-size-changer="false"
                show-less-items
              />
            </div>
          </template>
        </div>

        <div v-else-if="isPieceMode" class="piece-list">
          <div class="piece-list-head">
            <span>逐件数量（单位：{{ stockUnitLabel }}）</span>
            <span class="piece-progress">
              已填 {{ pieceFilledCount }}/{{ pieceExpectedCount }}
            </span>
          </div>

          <div v-if="!pieceExpectedCount" class="vl-tip">
            请先填写到货件数（{{ purchaseUnitLabel }}）
          </div>

          <template v-else>
            <a-radio-group
              v-model:value="pieceEditMode"
              size="small"
              option-type="button"
              class="piece-edit-mode"
              @change="onPieceEditModeChange"
            >
              <a-radio-button value="paste">批量粘贴</a-radio-button>
              <a-radio-button value="grid">逐条编辑</a-radio-button>
            </a-radio-group>

            <div v-if="pieceEditMode === 'paste'" class="piece-paste">
              <a-textarea
                v-model:value="piecePasteText"
                :rows="8"
                :placeholder="`从 Excel 复制后粘贴，每行一个数值，或用逗号/空格分隔。\n共需 ${pieceExpectedCount} 个（单位：${stockUnitLabel}）`"
              />
              <div class="piece-paste-bar">
                <a-button type="primary" size="small" @click="applyPiecePaste">
                  应用粘贴内容
                </a-button>
                <span class="vl-tip">当前识别 {{ pasteParsedCount }} 个数值</span>
              </div>
            </div>

            <div v-else class="piece-grid-panel">
              <div class="piece-quick-fill">
                <a-input-number
                  v-model:value="pieceQuickFill"
                  :min="0.001"
                  :precision="4"
                  :formatter="inputNumberFormatter"
                  :parser="inputNumberParser"
                  placeholder="快捷填充值"
                  style="width: 140px"
                />
                <a-button size="small" @click="fillEmptyPieces">填充未填项</a-button>
                <a-button size="small" @click="fillAllPieces">全部覆盖</a-button>
              </div>
              <div class="piece-grid">
                <div v-for="idx in piecePageIndexes" :key="idx" class="piece-cell">
                  <span class="piece-idx">{{ idx + 1 }}</span>
                  <a-input-number
                    v-model:value="pieceDraftList[idx]"
                    :min="0.001"
                    :precision="4"
                    :formatter="inputNumberFormatter"
                    :parser="inputNumberParser"
                    size="small"
                    style="flex: 1"
                    placeholder="数量"
                  />
                </div>
              </div>
              <div v-if="piecePageCount > 1" class="piece-pagination">
                <a-pagination
                  v-model:current="piecePage"
                  size="small"
                  :total="pieceExpectedCount"
                  :page-size="PIECE_PAGE_SIZE"
                  :show-size-changer="false"
                  show-less-items
                />
              </div>
            </div>
          </template>
        </div>

        <div class="vl-tip preview-sum">
          入库合计预览：<strong>{{ formatQty(stockQtyPreview) }}</strong> {{ stockUnitLabel }}
        </div>
      </template>

      <a-form-item v-else required>
        <template #label>
          <span class="field-label">
            <UnorderedListOutlined />
            库存数量（{{ stockUnitLabel }}）
          </span>
        </template>
        <a-input-number
          v-model:value="draft.qty"
          :min="0"
          :precision="4"
          :formatter="inputNumberFormatter"
          :parser="inputNumberParser"
          placeholder="请输入"
          style="width: 100%"
          @change="onQtyChange"
        />
      </a-form-item>

      <a-form-item v-if="hasSettleUnitLine" required>
        <template #label>
          <span class="field-label">
            <UnorderedListOutlined />
            结算数量（{{ draft.settleUnit || 'kg' }}）
          </span>
        </template>
        <a-input-number
          v-model:value="draft.settleQty"
          :min="0"
          :precision="4"
          :formatter="inputNumberFormatter"
          :parser="inputNumberParser"
          placeholder="与供应商计价用"
          style="width: 100%"
          @change="onSettleQtyChange"
        />
        <div class="vl-tip">
          结算单位（{{ draft.settleUnit || 'kg' }}）与库存单位（{{
            stockUnitLabel
          }}）不同：请再填结算数量，用于与供应商算钱。
        </div>
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <DollarOutlined />
            单价{{ hasSettleUnitLine ? `（元/${draft.settleUnit || 'kg'}）` : '' }}
          </span>
        </template>
        <a-input-number
          v-model:value="draft.unitPrice"
          :min="0"
          :precision="2"
          placeholder="请输入"
          style="width: 100%"
          @change="onUnitPriceChange"
        />
      </a-form-item>

      <a-form-item>
        <template #label>
          <span class="field-label">
            <AccountBookOutlined />
            总价
          </span>
        </template>
        <a-input-number :value="draft.totalPrice" :precision="2" disabled style="width: 100%" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  AccountBookOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { buildWarehousePickableItems } from '@/utils/warehouseItemPicker'
import { enrichInboundLine, syncInboundLineTotalFromUnit } from '@/utils/inboundLineHelpers'
import { hasSettleUnit } from '@/utils/settleUnit'
import { isPlateAreaMeasureEnabled } from '@/store/functionParamStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  DEFAULT_PLATE_DIM_UNIT,
  DUAL_UNIT_MEASURE_MODE,
  INBOUND_ENTRY_MODE,
  PLATE_DIM_UNIT_OPTIONS,
  calcAreaSquareMeters,
  coerceInboundEntryMode,
  defaultInboundEntryMode,
  expandDualUnitInboundPieces,
  getInboundEntryModeOptions,
  isAreaStockUnit,
  isOneItemOneCodeBarcode,
  roundQty,
  sumPieceValues,
} from '@/utils/variableLengthMaterial'

function formatQty(val) {
  return formatNumber(val, 4, { empty: '0' })
}

const props = defineProps({
  open: Boolean,
  line: { type: Object, default: null },
  mode: { type: String, default: 'edit' },
  lockProduct: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = ref(null)
const selectedItemKey = ref(undefined)
const preview = ref(null)
const pieceDraftList = ref([])
const pieceDimDraftList = ref([])
/** 逐件录入：paste | grid */
const pieceEditMode = ref('paste')
const piecePasteText = ref('')
const pieceQuickFill = ref(null)
const pieceQuickLength = ref(null)
const pieceQuickWidth = ref(null)
const piecePage = ref(1)

const PIECE_PASTE_THRESHOLD = 12
const PIECE_PAGE_SIZE = 24
const plateDimUnitOpts = PLATE_DIM_UNIT_OPTIONS

const pieceExpectedCount = computed(() => Number(draft.value?.purchaseQty) || 0)

const pieceFilledCount = computed(
  () => pieceDraftList.value.filter((v) => Number.isFinite(Number(v)) && Number(v) > 0).length,
)

const pieceDimFilledCount = computed(
  () => pieceDimDraftList.value.filter((d) => Number(d?.length) > 0 && Number(d?.width) > 0).length,
)

const pasteParsedCount = computed(() => parsePiecePasteText(piecePasteText.value).length)

const piecePageCount = computed(() =>
  Math.max(1, Math.ceil(pieceExpectedCount.value / PIECE_PAGE_SIZE)),
)

const piecePageIndexes = computed(() => {
  const n = pieceExpectedCount.value
  const start = (piecePage.value - 1) * PIECE_PAGE_SIZE
  const end = Math.min(start + PIECE_PAGE_SIZE, n)
  const indexes = []
  for (let i = start; i < end; i += 1) indexes.push(i)
  return indexes
})

function parsePiecePasteText(text) {
  return String(text || '')
    .split(/[\s,;，；\t\n\r]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
}

function preferredPieceEditMode(count) {
  return count >= PIECE_PASTE_THRESHOLD ? 'paste' : 'grid'
}

function syncPasteTextFromList() {
  piecePasteText.value = pieceDraftList.value
    .map((v) => {
      if (v == null || v === '') return ''
      const n = Number(v)
      return Number.isFinite(n) && n > 0 ? String(n) : ''
    })
    .join('\n')
}

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const pickableItems = computed(() => buildWarehousePickableItems())

const itemSelectOpts = computed(() =>
  pickableItems.value.map((it) => ({
    label: `${it.code} - ${it.name}`,
    value: it.rowKey,
    searchText: `${it.code} ${it.name} ${it.specModel || ''}`,
  })),
)

const lockedProductLabel = computed(() => {
  const line = draft.value
  if (!line) return ''
  if (line.itemCode && line.itemName) return `[${line.itemCode}] ${line.itemName}`
  return line.itemName || line.itemCode || ''
})

const resolvedMaterial = computed(() => {
  const code = draft.value?.itemCode
  if (!code) return null
  return materialInfoState.materials.find((m) => m.code === code) || null
})

const isVariableLengthLine = computed(() => {
  const line = draft.value
  if (!line) return false
  if (line.isVariableLength) return true
  return Boolean(resolvedMaterial.value?.isVariableLength)
})

const hasSettleUnitLine = computed(() => hasSettleUnit(draft.value || {}))

const stockUnitLabel = computed(() => {
  const mat = resolvedMaterial.value
  return mat?.stockUnit || mat?.inventoryUnit || draft.value?.unit || '米'
})

const purchaseUnitLabel = computed(() => {
  const mat = resolvedMaterial.value
  return mat?.purchaseUnit || draft.value?.purchaseUnit || '件'
})

const barcodeTypeLabel = computed(() => {
  const mat = resolvedMaterial.value
  return mat?.barcodeType || draft.value?.barcodeType || '一批一码'
})

const isPieceManagedBarcode = computed(() => isOneItemOneCodeBarcode(barcodeTypeLabel.value))

const enablePlateAreaMeasure = computed(() => isPlateAreaMeasureEnabled())

/** 仅库存为面积单位且开启「按面积计量」时，提供长×宽快捷；不再展示计量形态三选一 */
const showAreaShortcut = computed(
  () =>
    isVariableLengthLine.value &&
    enablePlateAreaMeasure.value &&
    isAreaStockUnit(stockUnitLabel.value),
)

const entryModeOpts = computed(() =>
  getInboundEntryModeOptions(barcodeTypeLabel.value, { areaBased: showAreaShortcut.value }),
)

/** 后台静默写入计量形态，界面不再让用户选 */
function autoInboundMeasureMode(stockUnit, isVL) {
  if (!isVL) return undefined
  if (isPlateAreaMeasureEnabled() && isAreaStockUnit(stockUnit)) {
    return DUAL_UNIT_MEASURE_MODE.PLATE
  }
  return DUAL_UNIT_MEASURE_MODE.LENGTH
}

const currentMode = computed(() =>
  coerceInboundEntryMode(
    draft.value?.inboundEntryMode || defaultInboundEntryMode(barcodeTypeLabel.value),
    barcodeTypeLabel.value,
  ),
)

const isUniformMode = computed(() => currentMode.value === INBOUND_ENTRY_MODE.UNIFORM)
const isPieceMode = computed(() => currentMode.value === INBOUND_ENTRY_MODE.PIECE)
const isTotalMode = computed(() => currentMode.value === INBOUND_ENTRY_MODE.TOTAL)

const stockQtyPreview = computed(() => {
  const line = draft.value
  if (!line || !isVariableLengthLine.value) return 0
  const mode = currentMode.value
  if (mode === INBOUND_ENTRY_MODE.UNIFORM) {
    let per = Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight) || 0
    if (!(per > 0) && showAreaShortcut.value) {
      per = calcAreaSquareMeters(line.uniformLength, line.uniformWidth, line.dimUnit) || 0
    }
    return roundQty((Number(line.purchaseQty) || 0) * per)
  }
  if (mode === INBOUND_ENTRY_MODE.TOTAL) {
    return roundQty(Number(line.totalValue ?? line.totalWeight ?? line.qty) || 0)
  }
  if (mode === INBOUND_ENTRY_MODE.PIECE) {
    if (showAreaShortcut.value) {
      return sumPieceValues(
        pieceDimDraftList.value.map((d) => calcAreaSquareMeters(d?.length, d?.width, line.dimUnit)),
      )
    }
    return sumPieceValues(pieceDraftList.value)
  }
  return 0
})

function pieceDimArea(idx) {
  const d = pieceDimDraftList.value[idx]
  return calcAreaSquareMeters(d?.length, d?.width, draft.value?.dimUnit) || 0
}

function syncUniformAreaFromDims() {
  const line = draft.value
  if (!line) return
  const area = calcAreaSquareMeters(line.uniformLength, line.uniformWidth, line.dimUnit)
  if (area != null && area > 0) line.uniformValue = area
}

function resolveLegacyUniformValue(line) {
  const v = Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight)
  return Number.isFinite(v) && v > 0 ? v : null
}

function resolveLegacyTotalValue(line) {
  const v = Number(line.totalValue ?? line.totalWeight ?? line.qty)
  return Number.isFinite(v) && v > 0 ? v : null
}

function resolveLegacyPieceValues(line) {
  if (Array.isArray(line.pieceValues) && line.pieceValues.length) return [...line.pieceValues]
  if (Array.isArray(line.pieceLengths) && line.pieceLengths.length) return [...line.pieceLengths]
  if (Array.isArray(line.pieceWeights) && line.pieceWeights.length) return [...line.pieceWeights]
  return []
}

watch(
  () => props.open,
  (visible) => {
    if (!visible || !props.line) {
      draft.value = null
      preview.value = null
      selectedItemKey.value = undefined
      pieceDraftList.value = []
      pieceDimDraftList.value = []
      piecePasteText.value = ''
      pieceQuickFill.value = null
      pieceQuickLength.value = null
      pieceQuickWidth.value = null
      piecePage.value = 1
      return
    }
    const next = enrichInboundLine({ ...props.line })
    const mat = materialInfoState.materials.find((m) => m.code === next.itemCode)
    const isVL = Boolean(next.isVariableLength || mat?.isVariableLength)
    const stockUnit = mat?.stockUnit || mat?.inventoryUnit || next.unit || '米'
    if (isVL) {
      next.isVariableLength = true
      next.unit = stockUnit
      next.stockUnit = stockUnit
      next.purchaseUnit = mat?.purchaseUnit || next.purchaseUnit || '件'
      next.barcodeType = mat?.barcodeType || next.barcodeType || '一批一码'
      next.uomRelation = mat?.uomRelation || next.uomRelation
      next.inboundMeasureMode = autoInboundMeasureMode(stockUnit, true)
      next.inboundEntryMode = coerceInboundEntryMode(
        next.inboundEntryMode || defaultInboundEntryMode(next.barcodeType),
        next.barcodeType,
      )
      next.purchaseQty = next.purchaseQty || 1
      next.dimUnit = next.dimUnit || DEFAULT_PLATE_DIM_UNIT
      next.uniformValue = resolveLegacyUniformValue(next)
      next.uniformLength = next.uniformLength ?? next.uniformDimLength ?? null
      next.uniformWidth = next.uniformWidth ?? next.uniformDimWidth ?? null
      next.totalValue = resolveLegacyTotalValue(next)
      next.pieceValues = resolveLegacyPieceValues(next)
      next.pieceDims = Array.isArray(next.pieceDims) ? [...next.pieceDims] : []
    }
    draft.value = reactive(next)
    syncSelectedItemKey()
    ensureMeasureModeOnDraft()
    syncPieceDraftFromLine()
    refreshPreviewStock()
  },
)

function filterItemOption(input, option) {
  const text = (option?.searchText ?? option?.label ?? '').toLowerCase()
  return text.includes(String(input || '').toLowerCase())
}

function syncSelectedItemKey() {
  if (!draft.value?.itemCode) {
    selectedItemKey.value = undefined
    return
  }
  const hit = pickableItems.value.find(
    (it) =>
      it.code === draft.value.itemCode &&
      (draft.value.itemId ? it.itemId === draft.value.itemId : true),
  )
  selectedItemKey.value = hit?.rowKey
}

function syncPieceDraftFromLine() {
  const line = draft.value
  if (!line) {
    pieceDraftList.value = []
    pieceDimDraftList.value = []
    piecePasteText.value = ''
    piecePage.value = 1
    return
  }
  const mode = coerceInboundEntryMode(
    line.inboundEntryMode || defaultInboundEntryMode(line.barcodeType),
    line.barcodeType,
  )
  const n = Number(line.purchaseQty) || 0
  const areaBased = showAreaShortcut.value
  if (mode === INBOUND_ENTRY_MODE.PIECE) {
    if (areaBased) {
      const src = Array.isArray(line.pieceDims) ? line.pieceDims : []
      pieceDimDraftList.value = Array.from({ length: n }, (_, i) => ({
        length: src[i]?.length ?? null,
        width: src[i]?.width ?? null,
      }))
      pieceDraftList.value = []
      piecePasteText.value = ''
    } else {
      const src = resolveLegacyPieceValues(line)
      pieceDraftList.value = Array.from({ length: n }, (_, i) =>
        src[i] != null ? Number(src[i]) : null,
      )
      pieceDimDraftList.value = []
      pieceEditMode.value = preferredPieceEditMode(n)
      syncPasteTextFromList()
    }
    piecePage.value = 1
  } else {
    pieceDraftList.value = []
    pieceDimDraftList.value = []
    piecePasteText.value = ''
    piecePage.value = 1
  }
}

function onPurchaseQtyChange() {
  syncPieceDraftFromLine()
}

function onEntryModeChange() {
  syncPieceDraftFromLine()
}

function ensureMeasureModeOnDraft() {
  const line = draft.value
  if (!line || !isVariableLengthLine.value) return
  line.inboundMeasureMode = autoInboundMeasureMode(stockUnitLabel.value, true)
  if (showAreaShortcut.value && !line.dimUnit) {
    line.dimUnit = DEFAULT_PLATE_DIM_UNIT
  }
}

function onPieceEditModeChange() {
  if (pieceEditMode.value === 'paste') {
    syncPasteTextFromList()
  }
}

function applyPiecePaste() {
  const n = pieceExpectedCount.value
  if (!(n > 0)) {
    message.warning(`请先填写到货件数（${purchaseUnitLabel.value}）`)
    return
  }
  const parsed = parsePiecePasteText(piecePasteText.value)
  if (!parsed.length) {
    message.warning('未识别到有效数值，请检查粘贴内容')
    return
  }
  if (parsed.length < n) {
    message.warning(`共需 ${n} 个数值，当前仅识别到 ${parsed.length} 个`)
    return
  }
  if (parsed.length > n) {
    message.info(`识别到 ${parsed.length} 个，已取前 ${n} 个`)
  }
  pieceDraftList.value = parsed.slice(0, n)
  syncPasteTextFromList()
  message.success(`已应用 ${n} 条逐件数量`)
}

function fillEmptyPieces() {
  const val = Number(pieceQuickFill.value)
  if (!(val > 0)) {
    message.warning('请先输入快捷填充值')
    return
  }
  pieceDraftList.value = pieceDraftList.value.map((v) =>
    Number.isFinite(Number(v)) && Number(v) > 0 ? v : val,
  )
}

function fillAllPieces() {
  const val = Number(pieceQuickFill.value)
  if (!(val > 0)) {
    message.warning('请先输入快捷填充值')
    return
  }
  const n = pieceExpectedCount.value
  pieceDraftList.value = Array.from({ length: n }, () => val)
}

function fillEmptyPieceDims() {
  const length = Number(pieceQuickLength.value)
  const width = Number(pieceQuickWidth.value)
  if (!(length > 0) || !(width > 0)) {
    message.warning('请先输入快捷长、宽')
    return
  }
  pieceDimDraftList.value = pieceDimDraftList.value.map((d) =>
    Number(d?.length) > 0 && Number(d?.width) > 0 ? d : { length, width },
  )
}

function fillAllPieceDims() {
  const length = Number(pieceQuickLength.value)
  const width = Number(pieceQuickWidth.value)
  if (!(length > 0) || !(width > 0)) {
    message.warning('请先输入快捷长、宽')
    return
  }
  const n = pieceExpectedCount.value
  pieceDimDraftList.value = Array.from({ length: n }, () => ({ length, width }))
}

function refreshPreviewStock() {
  if (!draft.value) return
  Object.assign(draft.value, enrichInboundLine(draft.value))
  preview.value = {
    itemCode: draft.value.itemCode,
    itemName: draft.value.itemName,
    specModel: draft.value.specModel,
    unit: draft.value.unit || '件',
    stockQty: draft.value.stockQty,
    warehouseStockQty: draft.value.warehouseStockQty,
  }
}

function onItemChange(rowKey) {
  const item = pickableItems.value.find((it) => it.rowKey === rowKey)
  if (!item || !draft.value) return
  const mat = materialInfoState.materials.find((m) => m.code === item.code)
  const isVL = Boolean(mat?.isVariableLength || item.isVariableLength)
  const stockUnit = isVL ? mat?.stockUnit || mat?.inventoryUnit || '米' : item.inventoryUnit || '件'
  const barcodeType = isVL ? mat?.barcodeType || '一批一码' : undefined
  const uomRelation = isVL ? mat?.uomRelation : undefined
  Object.assign(draft.value, {
    itemId: item.itemId,
    itemCode: item.code,
    itemName: item.name,
    itemType: item.itemType,
    specAttr: item.productAttribute || item.materialType || '',
    specModel: item.specModel || '',
    material: item.material || '',
    drawingNo: item.drawingNo || '',
    unit: stockUnit,
    stockUnit: isVL ? stockUnit : undefined,
    unitPrice: item.unitPrice ?? draft.value.unitPrice,
    isVariableLength: isVL,
    purchaseUnit: isVL ? mat?.purchaseUnit || '件' : undefined,
    barcodeType,
    inboundEntryMode: isVL ? defaultInboundEntryMode(barcodeType) : undefined,
    inboundMeasureMode: isVL ? autoInboundMeasureMode(stockUnit, true) : undefined,
    purchaseQty: isVL ? draft.value.purchaseQty || 1 : undefined,
    uniformValue: isVL ? null : undefined,
    uniformLength: isVL ? null : undefined,
    uniformWidth: isVL ? null : undefined,
    dimUnit: isVL ? DEFAULT_PLATE_DIM_UNIT : undefined,
    uomRelation,
    totalValue: isVL ? null : undefined,
    pieceValues: isVL ? [] : undefined,
    pieceDims: isVL ? [] : undefined,
  })
  syncInboundLineTotalFromUnit(draft.value)
  syncPieceDraftFromLine()
  refreshPreviewStock()
}

function onQtyChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
}

function onUnitPriceChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
}

function onSettleQtyChange() {
  if (!draft.value) return
  syncInboundLineTotalFromUnit(draft.value)
}

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!draft.value) return
  if (!draft.value.itemCode) {
    message.warning('请选择产品信息')
    return
  }
  if (!draft.value.warehouse) {
    message.warning('请选择入库仓库')
    return
  }
  if (hasSettleUnit(draft.value) && !(Number(draft.value.settleQty) > 0)) {
    message.warning(`请填写结算数量（${draft.value.settleUnit || 'kg'}）`)
    return
  }
  if (isVariableLengthLine.value) {
    const mat = resolvedMaterial.value
    const stockUnit = mat?.stockUnit || mat?.inventoryUnit || draft.value.unit || '米'
    draft.value.isVariableLength = true
    draft.value.unit = stockUnit
    draft.value.purchaseUnit = mat?.purchaseUnit || draft.value.purchaseUnit || '件'
    draft.value.barcodeType = mat?.barcodeType || draft.value.barcodeType || '一批一码'
    draft.value.inboundEntryMode = coerceInboundEntryMode(
      draft.value.inboundEntryMode || defaultInboundEntryMode(draft.value.barcodeType),
      draft.value.barcodeType,
    )
    draft.value.uomRelation = mat?.uomRelation || draft.value.uomRelation
    draft.value.stockUnit = stockUnit
    draft.value.inboundMeasureMode = autoInboundMeasureMode(stockUnit, true)
    draft.value.dimUnit = draft.value.dimUnit || DEFAULT_PLATE_DIM_UNIT

    if (showAreaShortcut.value && draft.value.inboundEntryMode === INBOUND_ENTRY_MODE.UNIFORM) {
      syncUniformAreaFromDims()
    }

    if (draft.value.inboundEntryMode === INBOUND_ENTRY_MODE.PIECE) {
      if (showAreaShortcut.value) {
        draft.value.pieceDims = pieceDimDraftList.value.map((d) => ({
          length: Number(d?.length) || null,
          width: Number(d?.width) || null,
          unit: draft.value.dimUnit,
        }))
        draft.value.pieceValues = draft.value.pieceDims.map((d) =>
          calcAreaSquareMeters(d.length, d.width, d.unit),
        )
      } else {
        if (pieceEditMode.value === 'paste') {
          const parsed = parsePiecePasteText(piecePasteText.value)
          const n = Number(draft.value.purchaseQty) || 0
          if (parsed.length !== n) {
            message.warning(
              `逐件数量须为 ${n} 条，当前粘贴识别到 ${parsed.length} 个，请先点击「应用粘贴内容」或改用逐条编辑`,
            )
            return
          }
          pieceDraftList.value = parsed
        }
        draft.value.pieceValues = pieceDraftList.value.map((v) => Number(v))
        draft.value.pieceDims = undefined
      }
    }

    const expanded = expandDualUnitInboundPieces(draft.value, stockUnit)
    if (!expanded.ok) {
      message.warning(expanded.message)
      return
    }
    draft.value.inboundEntryMode = expanded.mode
    draft.value.pieceValues = expanded.pieceValues
    draft.value.pieceLengths = expanded.pieceValues
    draft.value.pieceWeights = undefined
    draft.value.qty = expanded.qty
    draft.value.stockQty = expanded.qty
    if (draft.value.inboundEntryMode === INBOUND_ENTRY_MODE.TOTAL) {
      draft.value.totalValue = expanded.qty
    }
    if (draft.value.inboundEntryMode === INBOUND_ENTRY_MODE.UNIFORM && showAreaShortcut.value) {
      draft.value.uniformValue = expanded.pieceValues[0]
    }
  } else if (draft.value.qty == null || Number(draft.value.qty) <= 0) {
    message.warning('请输入库存数量')
    return
  }
  syncInboundLineTotalFromUnit(draft.value)
  emit('confirm', enrichInboundLine({ ...draft.value }))
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
@import './inventoryLineEditModal.less';

.vl-tip {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.preview-sum {
  margin: 4px 0 12px;
}

.piece-list {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
}

.piece-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.piece-progress {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.piece-edit-mode {
  margin-bottom: 10px;
}

.piece-paste-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.piece-quick-fill {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.piece-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px 10px;
  max-height: 280px;
  overflow: auto;
  padding-right: 4px;
}

.piece-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.piece-idx {
  width: 22px;
  flex-shrink: 0;
  font-size: 12px;
  text-align: right;
  color: rgba(0, 0, 0, 0.45);
}

.piece-dim-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow: auto;
  padding-right: 4px;
}

.piece-dim-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dim-x {
  color: rgba(0, 0, 0, 0.45);
}

.dim-area {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.piece-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
