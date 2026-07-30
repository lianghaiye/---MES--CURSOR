<template>
  <a-modal
    :open="open"
    title="下料尺寸"
    :width="640"
    :mask-closable="false"
    destroy-on-close
    ok-text="确认"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <div v-if="targetLabel" class="target-tip">
      当前行：<strong>{{ targetLabel }}</strong>
    </div>
    <a-form layout="vertical" class="blank-size-form">
      <a-row :gutter="[12, 8]">
        <a-col v-for="field in BLANK_SIZE_FIELDS" :key="field.key" :span="8">
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
                :value="draft.units[field.key]"
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
      下料尺寸预览：
      <strong>{{ previewText || '（未填写）' }}</strong>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import {
  BLANK_SIZE_FIELDS,
  BLANK_SIZE_UNIT_OPTIONS,
  emptyBlankSize,
  normalizeBlankSize,
  formatBlankSizeText,
  convertBlankSizeValue,
} from '@/utils/bomBlankSize'
import { inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'

const props = defineProps({
  open: Boolean,
  /** 当前编辑行 */
  line: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirm'])

const draft = reactive(emptyBlankSize())

const targetLabel = computed(() => {
  if (!props.line) return ''
  const code = props.line.materialCode || ''
  const name = props.line.itemName || ''
  return `${code} ${name}`.trim() || '未命名物料行'
})

const previewText = computed(() => formatBlankSizeText(draft))

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    Object.assign(draft, normalizeBlankSize(props.line?.blankSize))
  },
)

function onUnitChange(fieldKey, nextUnit) {
  const prevUnit = draft.units[fieldKey]
  if (prevUnit === nextUnit) return
  if (draft[fieldKey] != null && draft[fieldKey] !== '') {
    draft[fieldKey] = convertBlankSizeValue(draft[fieldKey], prevUnit, nextUnit)
  }
  draft.units[fieldKey] = nextUnit
}

function handleOk() {
  const normalized = normalizeBlankSize(draft)
  emit('confirm', normalized)
  emit('update:open', false)
}
</script>

<style scoped>
.target-tip {
  margin-bottom: 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
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
</style>
