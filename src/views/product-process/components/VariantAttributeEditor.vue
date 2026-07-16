<template>
  <div class="variant-attribute-editor">
    <div class="section-head">
      <div class="section-head-text">
        <span class="section-title">属性与值域</span>
        <span v-if="!enumOnly" class="section-sub"
          >规格型号、材质为系统预设；材质默认展示牌号库全部项，可删除本产品不适用的材质以减少
          SKU</span
        >
      </div>
      <a-button size="small" type="dashed" :disabled="disabled" @click="addAxis">
        <PlusOutlined />
        添加属性
      </a-button>
    </div>

    <div
      v-for="(axis, axisIndex) in localAxes"
      :key="axis.key || axisIndex"
      class="axis-row"
      :class="{ 'is-locked': isLockedAxis(axis) && !enumOnly }"
    >
      <div class="axis-main">
        <div class="axis-main-fields">
          <a-tag v-if="isLockedAxis(axis) && !enumOnly" color="blue" class="sys-tag">系统</a-tag>
          <a-input
            v-model:value="axis.label"
            size="small"
            class="axis-name"
            placeholder="属性名"
            :disabled="disabled || (isLockedAxis(axis) && !enumOnly)"
            @change="emitAxes"
          />
          <a-input
            v-model:value="axis.code"
            size="small"
            class="axis-code"
            placeholder="编码"
            :disabled="disabled || (isLockedAxis(axis) && !enumOnly)"
            @change="emitAxes"
          />
          <a-select
            v-if="!enumOnly"
            v-model:value="axis.source"
            size="small"
            class="axis-source"
            :options="sourceOpts"
            :disabled="disabled || isLockedAxis(axis)"
            @change="onSourceChange(axis)"
          />
          <a
            v-if="!enumOnly && axis.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE"
            class="grade-link"
            @click.prevent="openMaterialGrades"
          >
            材质管理
          </a>
        </div>
        <a-button
          v-if="!isLockedAxis(axis) || enumOnly"
          type="text"
          danger
          size="small"
          class="axis-remove"
          title="删除属性"
          aria-label="删除属性"
          :disabled="disabled || (!enumOnly && isLockedAxis(axis))"
          @click="removeAxis(axisIndex)"
        >
          <DeleteOutlined />
        </a-button>
      </div>

      <div v-if="axis.source === VARIANT_AXIS_SOURCE.ENUM || enumOnly" class="axis-values">
        <a-tag
          v-for="(val, valIndex) in axis.enumValues"
          :key="`${axis.key}-${valIndex}`"
          closable
          color="green"
          class="enum-tag"
          @close.prevent="removeEnumValue(axis, valIndex)"
        >
          {{ val.name }}
        </a-tag>
        <a-input
          v-if="addingEnumKey === axis.key"
          ref="enumInputRef"
          v-model:value="enumDraft"
          size="small"
          class="enum-input"
          placeholder="回车添加"
          @blur="confirmEnumValue(axis)"
          @pressEnter="confirmEnumValue(axis)"
        />
        <a-button
          v-else
          size="small"
          type="dashed"
          :disabled="disabled"
          @click="startAddEnum(axis)"
        >
          + 值
        </a-button>
      </div>
      <div v-else-if="axis.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE" class="axis-values grade">
        <a-tag
          v-for="(val, valIndex) in axis.enumValues"
          :key="`${axis.key}-mg-${val.materialGradeId || val.code || valIndex}`"
          closable
          color="cyan"
          class="grade-tag"
          :title="gradeTagTitle(val)"
          @close.prevent="removeEnumValue(axis, valIndex)"
        >
          <span class="grade-tag-name">{{ val.name }}</span>
          <span v-if="val.code" class="grade-tag-code">{{ val.code }}</span>
        </a-tag>
        <a-select
          v-if="availableMaterialGradeOpts(axis).length"
          size="small"
          class="grade-select"
          show-search
          allow-clear
          placeholder="补选材质牌号"
          :disabled="disabled"
          :options="availableMaterialGradeOpts(axis)"
          :filter-option="filterGradeOption"
          :value="undefined"
          @select="(id) => addMaterialGradeValue(axis, id)"
        />
        <span v-if="!axis.enumValues?.length" class="enum-hint"
          >已清空本族材质；可从右侧补选或去材质管理维护</span
        >
      </div>
    </div>

    <SkuCodeRulePanel
      v-if="showSkuCodeRule"
      :sku-code-pattern="resolvedPattern"
      :variant-axes="localAxes"
      :spu-code="spuCode"
      :readonly="!enumOnly"
      :disabled="disabled"
      @update:sku-code-pattern="onPatternUpdate"
    />

    <slot name="after-sku" />
  </div>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  DEFAULT_VARIANT_AXES,
  PRODUCT_SKU_CODE_PATTERN,
  VARIANT_AXIS_SOURCE,
  ensureLockedVariantAxes,
} from '@/constants/spu'
import { defaultSkuCodePattern } from '@/utils/variantAxisTemplate'
import { materialGradeToAxisValue, normalizeAxisEnumValues } from '@/utils/spuVariant'
import { materialGradeState, getMaterialGradeById } from '@/store/materialGradeStore'
import { useTabs } from '@/composables/useTabs'
import SkuCodeRulePanel from './SkuCodeRulePanel.vue'

const props = defineProps({
  variantAxes: { type: Array, default: () => [] },
  skuCodePattern: { type: String, default: '' },
  spuCode: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  /** 仅枚举值域（包装管理：不强制规格/材质锁定） */
  enumOnly: { type: Boolean, default: false },
  showSkuCodeRule: { type: Boolean, default: true },
})

const emit = defineEmits(['update:variantAxes', 'update:skuCodePattern'])

const router = useRouter()
const { openTab } = useTabs()

const localAxes = ref([])
const skuCodePatternLocal = ref('')
const addingEnumKey = ref('')
const enumDraft = ref('')
const enumInputRef = ref()
/** 记录用户已显式编辑过材质值域的轴，避免再次被全库默认值覆盖 */
const materialTouchedKeys = ref(new Set())

const sourceOpts = [
  { label: '枚举值域', value: VARIANT_AXIS_SOURCE.ENUM },
  { label: '材质牌号', value: VARIANT_AXIS_SOURCE.MATERIAL_GRADE },
]

const lockedKeys = new Set(DEFAULT_VARIANT_AXES.map((a) => a.key))

const resolvedPattern = computed(() => {
  if (!props.enumOnly) return PRODUCT_SKU_CODE_PATTERN
  return skuCodePatternLocal.value || defaultSkuCodePattern(localAxes.value)
})

function isLockedAxis(axis) {
  return Boolean(axis?.locked) || lockedKeys.has(axis?.key)
}

function allMaterialGradeValues() {
  void materialGradeState.items
  return materialGradeState.items.map((g) => materialGradeToAxisValue(g)).filter((v) => v?.name)
}

function seedMaterialAxisDefaults(axes, { forceEmitKeys = false } = {}) {
  let changed = false
  const next = (axes || []).map((axis) => {
    if (axis.source !== VARIANT_AXIS_SOURCE.MATERIAL_GRADE) return axis
    const touched = materialTouchedKeys.value.has(axis.key)
    if (axis.enumValues?.length || (touched && !forceEmitKeys)) return axis
    changed = true
    return { ...axis, enumValues: allMaterialGradeValues() }
  })
  return { axes: next, changed }
}

watch(
  () => [props.variantAxes, props.skuCodePattern, materialGradeState.items.length],
  () => {
    const mapped = (props.variantAxes || []).map((axis, index) => ({
      ...axis,
      key: axis.key || `axis-${index}`,
      source: props.enumOnly ? VARIANT_AXIS_SOURCE.ENUM : axis.source || VARIANT_AXIS_SOURCE.ENUM,
      enumValues: normalizeAxisEnumValues(axis.enumValues),
    }))
    let axes = props.enumOnly ? mapped : ensureLockedVariantAxes(mapped)
    if (!props.enumOnly) {
      const seeded = seedMaterialAxisDefaults(axes)
      axes = seeded.axes
      localAxes.value = axes
      skuCodePatternLocal.value = PRODUCT_SKU_CODE_PATTERN
      if (seeded.changed) {
        nextTick(() => emitAxes())
      }
    } else {
      localAxes.value = axes
      skuCodePatternLocal.value = props.skuCodePattern || defaultSkuCodePattern(localAxes.value)
    }
    if (!props.enumOnly && props.skuCodePattern !== PRODUCT_SKU_CODE_PATTERN) {
      emit('update:skuCodePattern', PRODUCT_SKU_CODE_PATTERN)
    }
  },
  { immediate: true, deep: true },
)

function emitAxes() {
  const next = JSON.parse(JSON.stringify(localAxes.value)).map((axis) => {
    if (props.enumOnly) return { ...axis, source: VARIANT_AXIS_SOURCE.ENUM, locked: false }
    if (isLockedAxis(axis)) {
      const lockedDef = DEFAULT_VARIANT_AXES.find((d) => d.key === axis.key)
      return {
        ...axis,
        key: lockedDef?.key || axis.key,
        code: lockedDef?.code || axis.code,
        source: lockedDef?.source || axis.source,
        locked: true,
        required: true,
      }
    }
    return { ...axis, locked: false }
  })
  emit('update:variantAxes', props.enumOnly ? next : ensureLockedVariantAxes(next))
  if (!props.enumOnly) {
    emit('update:skuCodePattern', PRODUCT_SKU_CODE_PATTERN)
  } else if (!props.skuCodePattern) {
    skuCodePatternLocal.value = defaultSkuCodePattern(localAxes.value)
    emit('update:skuCodePattern', skuCodePatternLocal.value)
  }
}

function onPatternUpdate(val) {
  if (!props.enumOnly) {
    emit('update:skuCodePattern', PRODUCT_SKU_CODE_PATTERN)
    return
  }
  skuCodePatternLocal.value = val
  emit('update:skuCodePattern', val)
}

function addAxis() {
  const index = localAxes.value.length + 1
  localAxes.value.push({
    key: `axis${index}`,
    label: `属性${index}`,
    code: `ATTR${index}`,
    required: false,
    locked: false,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: [],
  })
  emitAxes()
}

function removeAxis(index) {
  const axis = localAxes.value[index]
  if (!props.enumOnly && isLockedAxis(axis)) return
  localAxes.value.splice(index, 1)
  if (!props.enumOnly) {
    localAxes.value = ensureLockedVariantAxes(localAxes.value)
  }
  emitAxes()
}

function onSourceChange(axis) {
  if (axis.source === VARIANT_AXIS_SOURCE.ENUM && !axis.enumValues?.length) {
    axis.enumValues = []
  }
  if (axis.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE) {
    materialTouchedKeys.value.delete(axis.key)
    if (!axis.enumValues?.length) {
      axis.enumValues = allMaterialGradeValues()
    }
  }
  emitAxes()
}

function startAddEnum(axis) {
  addingEnumKey.value = axis.key
  enumDraft.value = ''
  nextTick(() => enumInputRef.value?.focus?.())
}

function confirmEnumValue(axis) {
  const name = enumDraft.value?.trim()
  if (name) {
    axis.enumValues = [...(axis.enumValues || []), { name, code: name }]
    emitAxes()
  }
  addingEnumKey.value = ''
  enumDraft.value = ''
}

function removeEnumValue(axis, index) {
  if (props.disabled) return
  if (axis.source === VARIANT_AXIS_SOURCE.MATERIAL_GRADE) {
    materialTouchedKeys.value = new Set([...materialTouchedKeys.value, axis.key])
  }
  axis.enumValues.splice(index, 1)
  emitAxes()
}

function availableMaterialGradeOpts(axis) {
  void materialGradeState.items
  const selectedIds = new Set(
    (axis.enumValues || []).map((v) => String(v.materialGradeId || '')).filter(Boolean),
  )
  const selectedNames = new Set((axis.enumValues || []).map((v) => v.name).filter(Boolean))
  return materialGradeState.items
    .filter((g) => !selectedIds.has(String(g.id)) && !selectedNames.has(g.name))
    .map((g) => ({
      label: g.code ? `${g.name}（${g.code}）` : g.name,
      value: g.id,
      searchText: `${g.name} ${g.code || ''} ${g.description || ''}`,
    }))
}

function filterGradeOption(input, option) {
  const text = String(option?.searchText || option?.label || '').toLowerCase()
  return text.includes(String(input || '').toLowerCase())
}

function addMaterialGradeValue(axis, gradeId) {
  if (props.disabled || !gradeId) return
  const grade = getMaterialGradeById(gradeId)
  const value = materialGradeToAxisValue(grade)
  if (!value?.name) return
  const exists = (axis.enumValues || []).some(
    (v) =>
      (v.materialGradeId && String(v.materialGradeId) === String(value.materialGradeId)) ||
      v.name === value.name,
  )
  if (exists) return
  materialTouchedKeys.value = new Set([...materialTouchedKeys.value, axis.key])
  axis.enumValues = [...(axis.enumValues || []), value]
  emitAxes()
}

function gradeTagTitle(val) {
  const parts = [val?.name, val?.code, val?.description].filter(Boolean)
  return parts.join(' · ')
}

function openMaterialGrades() {
  const path = '/basic-config/material-grades'
  openTab(path, '材质管理')
  router.push(path)
}
</script>

<style scoped>
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.section-head-text {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.section-title {
  font-weight: 600;
  font-size: 13px;
}
.section-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.axis-row {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: #fff;
  overflow: visible;
}
.axis-row.is-locked {
  border-color: #d6e4ff;
  background: #f8fbff;
}
.axis-main {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-width: 0;
}
.axis-main-fields {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}
.sys-tag {
  margin: 0;
  flex-shrink: 0;
}
.axis-name {
  width: 100px;
}
.axis-code {
  width: 88px;
}
.axis-source {
  width: 120px;
}
.axis-remove {
  flex: 0 0 auto;
  margin-left: 4px;
  padding: 0 6px;
  min-width: 28px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.axis-values {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
  overflow: visible;
}
.axis-values.grade {
  align-items: center;
}
.enum-tag,
.grade-tag {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  line-height: 22px;
  padding-inline-end: 4px;
}
.grade-tag :deep(.ant-tag-close-icon),
.enum-tag :deep(.ant-tag-close-icon) {
  margin-inline-start: 4px;
  flex-shrink: 0;
}
.grade-tag-name {
  font-weight: 500;
}
.grade-tag-code {
  font-size: 11px;
  opacity: 0.75;
}
.grade-select {
  min-width: 140px;
  width: 168px;
}
.enum-input {
  width: 110px;
}
.enum-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.grade-link {
  color: #1677ff;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
