<template>
  <div class="weight-calc-panel">
    <div class="weight-calc-head">
      <span class="weight-calc-title">重量计算</span>
      <span class="weight-calc-sub">尺寸与其它页签共用，改一处即可</span>
    </div>

    <a-form layout="vertical" class="weight-calc-form" size="small">
      <a-row :gutter="[12, 4]">
        <a-col :span="12">
          <a-form-item label="型材类型">
            <a-select
              v-model:value="profile"
              :options="profileSelectOpts"
              :dropdown-style="{ zIndex: 1200 }"
              :get-popup-container="getPopupContainer"
              @change="onProfileChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="材料密度">
            <div class="density-row">
              <a-select
                v-model:value="densityPreset"
                :options="densitySelectOpts"
                class="density-preset"
                :dropdown-style="{ zIndex: 1200 }"
                :get-popup-container="getPopupContainer"
                @change="onDensityPresetChange"
              />
              <a-input-number
                v-model:value="density"
                :min="0.01"
                :max="30"
                :precision="3"
                :disabled="densityPreset !== 'custom'"
                class="density-input"
                addon-after="g/cm³"
                @change="onDensityManualChange"
              />
            </div>
          </a-form-item>
        </a-col>
      </a-row>

      <div class="profile-hint">{{ currentProfile.hint }}</div>

      <a-row :gutter="[12, 4]">
        <a-col v-for="field in currentProfile.fields" :key="field.key" :span="8">
          <a-form-item>
            <template #label>
              {{ field.label }}
              <span v-if="field.required" class="req-mark">*</span>
            </template>
            <div class="blank-size-field">
              <a-input-number
                :value="blankSize[field.key]"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                class="blank-size-input"
                :placeholder="field.required ? '必填' : '选填'"
                @update:value="(v) => onValueChange(field.key, v)"
              />
              <a-select
                :value="getUnit(field.key)"
                :options="BLANK_SIZE_UNIT_OPTIONS"
                class="blank-size-unit"
                :dropdown-style="{ zIndex: 1200 }"
                :get-popup-container="getPopupContainer"
                @update:value="(u) => onUnitChange(field.key, u)"
              />
            </div>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="件数">
            <a-input-number v-model:value="qty" :min="1" :precision="0" style="width: 100%" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="weight-result">
      <template v-if="result.ok">
        <span
          >单件约
          <strong>{{ formatNumber(result.pieceWeightKg, 4, { empty: '' }) }}</strong> kg</span
        >
        <span v-if="qty > 1" class="weight-total">
          · 合计 <strong>{{ formatNumber(result.weightKg, 4, { empty: '' }) }}</strong> kg
        </span>
      </template>
      <span v-else class="weight-hint">{{ result.message || '填写尺寸后自动计算重量' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  BLANK_SIZE_UNIT_OPTIONS,
  DEFAULT_BLANK_SIZE_UNIT,
  convertBlankSizeValue,
  emptyBlankSize,
} from '@/utils/bomBlankSize'
import {
  METAL_PROFILE,
  METAL_PROFILE_OPTIONS,
  METAL_DENSITY_PRESETS,
  calcMetalWeight,
  getMetalProfile,
  suggestedBlankModeForProfile,
} from '@/utils/metalWeightCalc'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'

const props = defineProps({
  /** 与通用/面积计算共用的下料尺寸 draft */
  blankSize: { type: Object, required: true },
})

const emit = defineEmits(['suggest-mode', 'update-field', 'update-unit'])

const profile = ref(METAL_PROFILE.PLATE)
const densityPreset = ref('carbon')
const density = ref(7.85)
const qty = ref(1)

const profileSelectOpts = METAL_PROFILE_OPTIONS.map((p) => ({
  label: p.label,
  value: p.value,
}))

const densitySelectOpts = METAL_DENSITY_PRESETS.map((p) => ({
  label: p.label,
  value: p.key,
}))

const currentProfile = computed(() => getMetalProfile(profile.value))

const result = computed(() => {
  const bs = props.blankSize || emptyBlankSize()
  const values = {}
  const units = {}
  for (const f of currentProfile.value.fields) {
    values[f.key] = bs[f.key]
    units[f.key] = bs.units?.[f.key] || DEFAULT_BLANK_SIZE_UNIT
  }
  return calcMetalWeight({
    profile: profile.value,
    density: density.value,
    qty: qty.value,
    values,
    units,
  })
})

function getPopupContainer() {
  return typeof document !== 'undefined' ? document.body : false
}

function getUnit(fieldKey) {
  return props.blankSize?.units?.[fieldKey] || DEFAULT_BLANK_SIZE_UNIT
}

function onValueChange(fieldKey, value) {
  emit('update-field', { key: fieldKey, value })
}

function onUnitChange(fieldKey, nextUnit) {
  const prevUnit = getUnit(fieldKey)
  if (prevUnit === nextUnit) return
  let nextValue = props.blankSize?.[fieldKey]
  if (nextValue != null && nextValue !== '') {
    nextValue = convertBlankSizeValue(nextValue, prevUnit, nextUnit)
  }
  emit('update-unit', { key: fieldKey, unit: nextUnit, value: nextValue })
}

function onProfileChange() {
  emit('suggest-mode', suggestedBlankModeForProfile(profile.value))
}

function onDensityPresetChange(preset) {
  const hit = METAL_DENSITY_PRESETS.find((p) => p.key === preset)
  if (hit?.density != null) density.value = hit.density
}

function onDensityManualChange() {
  densityPreset.value = 'custom'
}
</script>

<style scoped>
.weight-calc-panel {
  margin-top: 0;
  padding: 12px;
  background: #f7f9fc;
  border: 1px solid #e8eef5;
  border-radius: 6px;
}
.weight-calc-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.weight-calc-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}
.weight-calc-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.weight-calc-form :deep(.ant-form-item) {
  margin-bottom: 6px;
}
.density-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.density-preset {
  flex: 1 1 140px;
  min-width: 0;
}
.density-input {
  flex: 0 0 140px;
  width: 140px !important;
}
.profile-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.req-mark {
  color: #ff4d4f;
  margin-left: 2px;
}
.blank-size-field {
  display: flex;
  width: 100%;
  align-items: stretch;
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
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
.blank-size-unit {
  flex: 0 0 72px;
  width: 72px !important;
}
.blank-size-unit :deep(.ant-select-selector) {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
}
.weight-result {
  margin-top: 4px;
  padding: 8px 10px;
  background: #fff;
  border-radius: 4px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}
.weight-result strong {
  color: #d46b08;
}
.weight-total {
  margin-left: 4px;
}
.weight-hint {
  color: rgba(0, 0, 0, 0.45);
}
</style>
