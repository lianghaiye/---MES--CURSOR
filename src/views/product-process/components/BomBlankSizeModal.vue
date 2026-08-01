<template>
  <a-modal
    :open="open"
    :title="modalTitle"
    :width="640"
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
      <div class="mode-switch-label">下料方式</div>
      <a-radio-group
        v-model:value="selectedMode"
        option-type="button"
        button-style="solid"
        size="small"
        :options="BLANK_SIZE_MODE_OPTIONS"
      />
      <div class="mode-switch-hint">{{ modeHint }}</div>
    </div>

    <a-form layout="vertical" class="blank-size-form">
      <div class="field-group-label">{{ plateMode ? '主尺寸（必填）' : '主尺寸' }}</div>
      <a-row :gutter="[12, 8]">
        <a-col v-for="field in primaryFields" :key="field.key" :span="8">
          <a-form-item :required="field.required">
            <template #label>
              {{ field.label }}
              <span v-if="field.required" class="req-mark">*</span>
            </template>
            <a-input-group compact class="blank-size-input-group">
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
                :value="draft.units?.[field.key] || 'mm'"
                :options="BLANK_SIZE_UNIT_OPTIONS"
                class="blank-size-unit"
                @change="(unit) => onUnitChange(field.key, unit)"
              />
            </a-input-group>
          </a-form-item>
        </a-col>
      </a-row>

      <div v-if="extraFields.length" class="field-group-label">
        {{ plateMode ? '辅尺寸（选填，不参与面积）' : '其它尺寸（选填）' }}
      </div>
      <a-row v-if="extraFields.length" :gutter="[12, 8]">
        <a-col v-for="field in extraFields" :key="field.key" :span="8">
          <a-form-item :label="field.label">
            <a-input-group compact class="blank-size-input-group">
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
                :value="draft.units?.[field.key] || 'mm'"
                :options="BLANK_SIZE_UNIT_OPTIONS"
                class="blank-size-unit"
                @change="(unit) => onUnitChange(field.key, unit)"
              />
            </a-input-group>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
    <div class="preview">
      <div>
        下料尺寸预览：
        <strong>{{ previewText || '（未填写）' }}</strong>
      </div>
      <div v-if="plateMode" class="preview-area">
        单件需求面积：
        <strong>{{ areaPreviewText }}</strong>
      </div>
      <div v-else-if="lengthMode && lengthMetersPreview != null" class="preview-area">
        单件需求长度：
        <strong>{{ lengthMetersPreview }} 米</strong>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  BLANK_SIZE_UNIT_OPTIONS,
  BLANK_SIZE_MODE,
  BLANK_SIZE_MODE_OPTIONS,
  PLATE_BLANK_SIZE_PRIMARY_FIELDS,
  PLATE_BLANK_SIZE_EXTRA_FIELDS,
  LENGTH_BLANK_SIZE_PRIMARY_FIELDS,
  LENGTH_BLANK_SIZE_EXTRA_FIELDS,
  BLANK_SIZE_FIELDS,
  emptyBlankSize,
  normalizeBlankSize,
  formatBlankSizeText,
  convertBlankSizeValue,
  calcBlankAreaSquareMeters,
  resolveBlankSizeMode,
  toMillimeters,
} from '@/utils/bomBlankSize'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { materialInfoState } from '@/store/materialInfoStore'
import { inferUomRelation } from '@/utils/variableLengthMaterial'

const props = defineProps({
  open: Boolean,
  /** 当前编辑行 */
  line: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = reactive(emptyBlankSize())
const selectedMode = ref(BLANK_SIZE_MODE.GENERIC)

function getModalContainer() {
  return typeof document !== 'undefined' ? document.body : false
}

function closeModal() {
  emit('update:open', false)
}

function onOpenUpdate(visible) {
  emit('update:open', Boolean(visible))
}

function resetDraftFromLine() {
  const next = normalizeBlankSize(props.line?.blankSize)
  draft.length = next.length
  draft.width = next.width
  draft.height = next.height
  draft.thickness = next.thickness
  draft.innerDiameter = next.innerDiameter
  draft.outerDiameter = next.outerDiameter
  if (!draft.units || typeof draft.units !== 'object') {
    draft.units = emptyBlankSize().units
  }
  Object.assign(draft.units, next.units)
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
const lengthMode = computed(() => selectedMode.value === BLANK_SIZE_MODE.LENGTH)

const modalTitle = computed(() => {
  if (plateMode.value) return '下料尺寸（板材）'
  if (lengthMode.value) return '下料尺寸（型材）'
  return '下料尺寸'
})

const modeHint = computed(() => {
  if (plateMode.value) return '按长×宽换算单件面积（㎡），用于板材领料需求'
  if (lengthMode.value) return '按长度换算单件需求（米），用于管材/型材领料需求'
  return '仅记录尺寸文案，不强制按长或面积换算需求'
})

const primaryFields = computed(() => {
  if (plateMode.value) return PLATE_BLANK_SIZE_PRIMARY_FIELDS
  if (lengthMode.value) return LENGTH_BLANK_SIZE_PRIMARY_FIELDS
  return BLANK_SIZE_FIELDS
})

const extraFields = computed(() => {
  if (plateMode.value) return PLATE_BLANK_SIZE_EXTRA_FIELDS
  if (lengthMode.value) return LENGTH_BLANK_SIZE_EXTRA_FIELDS
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

const lengthMetersPreview = computed(() => {
  if (!lengthMode.value || draft.length == null) return null
  const mm = toMillimeters(draft.length, draft.units?.length)
  if (mm == null) return null
  return formatNumber(mm / 1000, 4, { empty: '' })
})

watch(
  () => [props.open, props.line?.id],
  ([visible]) => {
    if (!visible) return
    resetDraftFromLine()
    selectedMode.value = resolveBlankSizeMode(resolveModeSource())
  },
)

function onUnitChange(fieldKey, nextUnit) {
  if (!draft.units || typeof draft.units !== 'object') {
    draft.units = emptyBlankSize().units
  }
  const prevUnit = draft.units[fieldKey]
  if (prevUnit === nextUnit) return
  if (draft[fieldKey] != null && draft[fieldKey] !== '') {
    draft[fieldKey] = convertBlankSizeValue(draft[fieldKey], prevUnit, nextUnit)
  }
  draft.units[fieldKey] = nextUnit
}

function handleOk() {
  if (plateMode.value) {
    if (!(Number(draft.length) > 0) || !(Number(draft.width) > 0)) {
      message.warning('板材请填写下料「长」和「宽」')
      return
    }
  } else if (lengthMode.value) {
    if (!(Number(draft.length) > 0)) {
      message.warning('请填写下料「长」')
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
.blank-size-input-group {
  display: flex;
  width: 100%;
}
.blank-size-input {
  flex: 1;
  min-width: 0;
}
.blank-size-input-group :deep(.blank-size-input) {
  width: calc(100% - 72px);
}
.blank-size-unit {
  width: 72px;
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
</style>
