<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    :width="720"
    :z-index="1100"
    :mask-closable="false"
    destroy-on-close
    ok-text="确认"
    cancel-text="取消"
    :get-container="getModalContainer"
    @ok="handleOk"
    @cancel="closeModal"
    @update:open="onOpenUpdate"
  >
    <div v-if="targetLabel" class="target-tip">
      当前行：<strong>{{ targetLabel }}</strong>
    </div>

    <div class="mode-switch">
      <div class="mode-switch-label">{{ isOrderPurpose ? '订货方式' : '下料方式' }}</div>
      <a-radio-group
        v-model:value="selectedUiTab"
        option-type="button"
        button-style="solid"
        size="small"
        :options="uiTabOpts"
        @change="onUiTabChange"
      />
      <div v-if="!weightTabActive" class="mode-switch-hint">{{ modeHint }}</div>
      <div v-else class="mode-switch-hint">尺寸与其它页签共用；选好型材与密度后自动估算重量</div>
    </div>

    <div v-show="!weightTabActive">
      <a-form layout="vertical" class="blank-size-form">
        <div class="field-group-label">{{ plateMode ? '主尺寸（必填）' : '主尺寸' }}</div>
        <a-row :gutter="[12, 8]">
          <a-col v-for="field in primaryFields" :key="field.key" :span="8">
            <a-form-item :required="field.required">
              <template #label>
                {{ field.label }}
                <span v-if="field.required" class="req-mark">*</span>
              </template>
              <div class="blank-size-field">
                <a-input-number
                  v-model:value="draft[field.key]"
                  :min="0"
                  :precision="4"
                  :formatter="inputNumberFormatter"
                  :parser="inputNumberParser"
                  class="blank-size-input"
                  :placeholder="field.required ? '必填' : '选填'"
                />
                <a-select
                  :value="getUnit(field.key)"
                  :options="BLANK_SIZE_UNIT_OPTIONS"
                  class="blank-size-unit"
                  :dropdown-style="{ zIndex: 1200 }"
                  :get-popup-container="getSelectPopupContainer"
                  @update:value="(unit) => onUnitChange(field.key, unit)"
                />
              </div>
            </a-form-item>
          </a-col>
        </a-row>

        <div v-if="extraFields.length" class="field-group-label">
          {{ plateMode ? '辅尺寸（选填，不参与面积）' : '其它尺寸（选填）' }}
        </div>
        <a-row v-if="extraFields.length" :gutter="[12, 8]">
          <a-col v-for="field in extraFields" :key="field.key" :span="8">
            <a-form-item :label="field.label">
              <div class="blank-size-field">
                <a-input-number
                  v-model:value="draft[field.key]"
                  :min="0"
                  :precision="4"
                  :formatter="inputNumberFormatter"
                  :parser="inputNumberParser"
                  class="blank-size-input"
                  placeholder="选填"
                />
                <a-select
                  :value="getUnit(field.key)"
                  :options="BLANK_SIZE_UNIT_OPTIONS"
                  class="blank-size-unit"
                  :dropdown-style="{ zIndex: 1200 }"
                  :get-popup-container="getSelectPopupContainer"
                  @update:value="(unit) => onUnitChange(field.key, unit)"
                />
              </div>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
      <div class="preview">
        <div>
          {{ isOrderPurpose ? '订货尺寸' : '下料尺寸' }}预览：
          <strong>{{ previewText || '（未填写）' }}</strong>
        </div>
        <div v-if="plateMode && !isOrderPurpose" class="preview-area">
          单件需求面积：
          <strong>{{ areaPreviewText }}</strong>
        </div>
      </div>
    </div>

    <BomWeightCalcPanel
      v-show="weightTabActive"
      class="weight-tab-panel"
      :blank-size="draft"
      @suggest-mode="onWeightSuggestMode"
      @update-field="onWeightUpdateField"
      @update-unit="onWeightUpdateUnit"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BLANK_SIZE_UNIT_OPTIONS,
  BLANK_SIZE_MODE,
  getBlankSizeModeOptions,
  resolveBlankSizeModeForEditor,
  PLATE_BLANK_SIZE_PRIMARY_FIELDS,
  PLATE_BLANK_SIZE_EXTRA_FIELDS,
  BLANK_SIZE_FIELDS,
  DEFAULT_BLANK_SIZE_UNIT,
  emptyBlankSize,
  normalizeBlankSize,
  formatBlankSizeText,
  convertBlankSizeValue,
  calcBlankAreaSquareMeters,
} from '@/utils/bomBlankSize'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { materialInfoState } from '@/store/materialInfoStore'
import { inferUomRelation } from '@/utils/variableLengthMaterial'
import { isPlateAreaMeasureEnabled, isBomWeightCalcEnabled } from '@/store/functionParamStore'
import BomWeightCalcPanel from '@/views/product-process/components/BomWeightCalcPanel.vue'

/** 弹窗顶栏页签：尺寸模式 + 可选重量计算（非落库 blankSizeMode） */
const UI_TAB_WEIGHT = 'weight'

const props = defineProps({
  open: Boolean,
  /** 当前编辑行 */
  line: { type: Object, default: null },
  /** blank=下料尺寸（默认）；order=订货尺寸 */
  purpose: { type: String, default: 'blank' },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = reactive(emptyBlankSize())
/** 落库下料方式：仅通用 / 板材 */
const selectedMode = ref(BLANK_SIZE_MODE.GENERIC)
/** 顶栏当前页签：通用 / 板材 / 重量计算 */
const selectedUiTab = ref(BLANK_SIZE_MODE.GENERIC)

const isOrderPurpose = computed(() => props.purpose === 'order')
const weightCalcEnabled = computed(() => isBomWeightCalcEnabled())

const uiTabOpts = computed(() => {
  const opts = [{ label: '通用', value: BLANK_SIZE_MODE.GENERIC }]
  if (weightCalcEnabled.value) {
    opts.push({ label: '重量计算', value: UI_TAB_WEIGHT })
  }
  if (isPlateAreaMeasureEnabled()) {
    opts.push({ label: '面积计算', value: BLANK_SIZE_MODE.PLATE })
  }
  return opts
})

const weightTabActive = computed(() => selectedUiTab.value === UI_TAB_WEIGHT)

function getModalContainer() {
  return typeof document !== 'undefined' ? document.body : false
}

function getSelectPopupContainer() {
  return typeof document !== 'undefined' ? document.body : false
}

function closeModal() {
  emit('update:open', false)
}

function onOpenUpdate(visible) {
  emit('update:open', Boolean(visible))
}

function ensureUnits() {
  if (!draft.units || typeof draft.units !== 'object') {
    draft.units = emptyBlankSize().units
  }
}

function getUnit(fieldKey) {
  ensureUnits()
  return draft.units[fieldKey] || DEFAULT_BLANK_SIZE_UNIT
}

function resetDraftFromLine() {
  const next = normalizeBlankSize(props.line?.blankSize)
  draft.length = next.length
  draft.width = next.width
  draft.height = next.height
  draft.thickness = next.thickness
  draft.innerDiameter = next.innerDiameter
  draft.outerDiameter = next.outerDiameter
  draft.units = { ...next.units }
}

function resolveModeSource() {
  const line = props.line || {}
  const code = line.materialCode
  const mat = code ? materialInfoState.materials.find((m) => m.code === code) || null : null
  const isVL = Boolean(line.isVariableLength || mat?.isVariableLength)
  const stockUnit = line.unit || mat?.stockUnit || mat?.inventoryUnit || (isVL ? '米' : '件')
  const uomRelation =
    line.uomRelation || mat?.uomRelation || (isVL ? inferUomRelation(stockUnit, '') : '')
  return {
    ...line,
    isVariableLength: isVL,
    unit: stockUnit,
    stockUnit,
    inventoryUnit: stockUnit,
    uomRelation,
    blankSizeMode: line.blankSizeMode,
  }
}

const plateMode = computed(() => selectedMode.value === BLANK_SIZE_MODE.PLATE)

const modalTitle = computed(() => {
  const kind = isOrderPurpose.value ? '订货尺寸' : '下料尺寸'
  if (weightTabActive.value) return `${kind} · 重量计算`
  if (plateMode.value) return `${kind}（面积计算）`
  return kind
})

const modeHint = computed(() => {
  if (isOrderPurpose.value) {
    if (plateMode.value) return '按板材长×宽记录向供应商订货的尺寸'
    return '仅记录订货尺寸文案，可与生产下料尺寸不同'
  }
  if (plateMode.value) return '按长×宽换算单件面积（㎡），用于板材领料需求'
  return '仅记录尺寸文案，不强制按长或面积换算需求'
})

const primaryFields = computed(() => {
  if (plateMode.value) return PLATE_BLANK_SIZE_PRIMARY_FIELDS
  return BLANK_SIZE_FIELDS
})

const extraFields = computed(() => {
  if (plateMode.value) return PLATE_BLANK_SIZE_EXTRA_FIELDS
  return []
})

const targetLabel = computed(() => {
  if (!props.line) return ''
  const code = props.line.materialCode || ''
  const name = props.line.itemName || ''
  return `${code} ${name}`.trim() || '未命名物料行'
})

const previewText = computed(() => formatBlankSizeText(draft))

const areaPreview = computed(() => {
  if (!plateMode.value) return null
  return calcBlankAreaSquareMeters(draft)
})

const areaPreviewText = computed(() => {
  const a = areaPreview.value
  if (a == null || !(a > 0)) return '（请填写长、宽）'
  return `${formatNumber(a, 4, { empty: '' })} ㎡`
})

function syncModeFromUiTab(tab) {
  if (tab === BLANK_SIZE_MODE.PLATE || tab === BLANK_SIZE_MODE.GENERIC) {
    selectedMode.value = tab
  }
}

function onUiTabChange(e) {
  const tab = e?.target?.value ?? selectedUiTab.value
  syncModeFromUiTab(tab)
}

watch(
  () => [props.open, props.line?.id],
  ([visible]) => {
    if (!visible) return
    resetDraftFromLine()
    const mode = resolveBlankSizeModeForEditor(resolveModeSource(), {
      enablePlateArea: isPlateAreaMeasureEnabled(),
    })
    selectedMode.value = mode
    selectedUiTab.value = mode
  },
)

watch(weightCalcEnabled, (enabled) => {
  if (!enabled && selectedUiTab.value === UI_TAB_WEIGHT) {
    selectedUiTab.value = selectedMode.value
  }
})

function onUnitChange(fieldKey, nextUnit) {
  ensureUnits()
  const prevUnit = draft.units[fieldKey] || DEFAULT_BLANK_SIZE_UNIT
  if (prevUnit === nextUnit) return
  if (draft[fieldKey] != null && draft[fieldKey] !== '') {
    draft[fieldKey] = convertBlankSizeValue(draft[fieldKey], prevUnit, nextUnit)
  }
  draft.units[fieldKey] = nextUnit
}

function onWeightUpdateField({ key, value }) {
  draft[key] = value
}

function onWeightUpdateUnit({ key, unit, value }) {
  ensureUnits()
  if (value !== undefined) draft[key] = value
  draft.units[key] = unit
}

function onWeightSuggestMode(mode) {
  const sizeOpts = getBlankSizeModeOptions({ enablePlateArea: isPlateAreaMeasureEnabled() })
  if (mode && sizeOpts.some((o) => o.value === mode)) {
    selectedMode.value = mode
  }
}

function handleOk() {
  const sizeLabel = isOrderPurpose.value ? '订货' : '下料'
  if (plateMode.value) {
    if (!(Number(draft.length) > 0) || !(Number(draft.width) > 0)) {
      message.warning(`板材请填写${sizeLabel}「长」和「宽」`)
      if (weightTabActive.value) selectedUiTab.value = BLANK_SIZE_MODE.PLATE
      return
    }
  }
  const normalized = normalizeBlankSize(draft)
  emit('confirm', { blankSize: normalized, mode: selectedMode.value })
  closeModal()
}
</script>

<style scoped>
.target-tip {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
.mode-switch {
  margin-bottom: 16px;
}
.mode-switch-label {
  margin-bottom: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
.mode-switch-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.field-group-label {
  margin: 4px 0 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.req-mark {
  color: #ff4d4f;
  margin-left: 2px;
}
.blank-size-form :deep(.ant-form-item) {
  margin-bottom: 8px;
}
.blank-size-field {
  display: flex;
  width: 100%;
  align-items: stretch;
  gap: 0;
}
.blank-size-input {
  flex: 1 1 auto;
  min-width: 0;
  width: auto !important;
}
.blank-size-field :deep(.ant-input-number) {
  flex: 1 1 auto;
  min-width: 0;
  width: auto !important;
}
.blank-size-unit {
  flex: 0 0 78px;
  width: 78px !important;
  position: relative;
  z-index: 2;
}
.blank-size-unit :deep(.ant-select-selector) {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  cursor: pointer;
}
.blank-size-field :deep(.ant-input-number .ant-input-number-input) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
.blank-size-field :deep(.ant-input-number) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
.preview {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
.preview-area {
  margin-top: 4px;
}
.preview-area strong {
  color: #d46b08;
}
.weight-tab-panel {
  margin-top: 0;
}
</style>
