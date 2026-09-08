<template>
  <div class="complex-inspect-block">
    <div class="complex-head">
      <div class="complex-title">
        <span v-if="field.required !== false" class="req">*</span>
        {{ field.name }}
        <a-tag v-if="isCompositeField(field)" color="processing">复合</a-tag>
        <a-tag v-else color="orange">多点</a-tag>
        <a-tag v-if="parentJudge === 'pass'" color="success">合格</a-tag>
        <a-tag v-else-if="parentJudge === 'fail'" color="error">不合格</a-tag>
      </div>
      <a-button type="link" size="small" @click="expanded = !expanded">
        {{ expanded ? '收起' : expandLabel }}
      </a-button>
    </div>

    <div v-if="expanded" class="complex-body">
      <template v-if="isCompositeField(field)">
        <div class="sub-field-list">
          <div
            v-for="record in compositeRows"
            :key="record.code"
            class="sub-field-row"
            :class="{
              'is-pass': record.judge === 'pass',
              'is-fail': record.judge === 'fail',
            }"
          >
            <div class="sub-field-main">
              <div class="sub-field-head">
                <div class="sub-field-name">
                  <span v-if="record.child.required !== false" class="req">*</span>
                  {{ record.name }}
                </div>
                <a-tag v-if="record.judge === 'pass'" color="success">合格</a-tag>
                <a-tag v-else-if="record.judge === 'fail'" color="error">不合格</a-tag>
                <span v-else class="judge-placeholder">待判定</span>
              </div>
              <div class="sub-field-standard">
                {{ buildStandardText(record.child) || '未设置合格标准（仅记录）' }}
              </div>
              <div class="field-input-wrap">
                <span
                  v-if="record.unit && record.child.unitPosition === 'prefix'"
                  class="unit-affix"
                  >{{ record.unit }}</span
                >
                <a-input-number
                  v-if="record.child.type === 'number'"
                  :value="childMeasured(record)"
                  size="middle"
                  style="flex: 1; min-width: 0"
                  :placeholder="`请输入${record.name}`"
                  @update:value="(v) => onChildMeasured(record.code, record.child, v)"
                />
                <a-select
                  v-else-if="record.child.type === 'radio'"
                  :value="childMeasured(record)"
                  size="middle"
                  allow-clear
                  style="flex: 1; min-width: 0"
                  :placeholder="`请选择${record.name}`"
                  :options="radioOpts(record.child)"
                  @update:value="(v) => onChildMeasured(record.code, record.child, v)"
                />
                <a-select
                  v-else-if="record.child.type === 'checkbox'"
                  :value="asArray(childMeasured(record))"
                  mode="multiple"
                  size="middle"
                  allow-clear
                  style="flex: 1; min-width: 0"
                  :placeholder="`请选择${record.name}`"
                  :options="radioOpts(record.child)"
                  @update:value="(v) => onChildMeasured(record.code, record.child, v)"
                />
                <a-input
                  v-else-if="record.child.type === 'date' || record.child.type === 'datetime'"
                  :value="childMeasured(record)"
                  size="middle"
                  style="flex: 1; min-width: 0"
                  :placeholder="
                    record.child.type === 'datetime' ? 'yyyy-MM-dd HH:mm:ss' : 'yyyy-MM-dd'
                  "
                  @update:value="(v) => onChildMeasured(record.code, record.child, v)"
                />
                <a-textarea
                  v-else-if="record.child.type === 'textarea'"
                  :value="childMeasured(record)"
                  :rows="2"
                  allow-clear
                  style="flex: 1; min-width: 0"
                  :placeholder="`请输入${record.name}`"
                  @update:value="(v) => onChildMeasured(record.code, record.child, v)"
                />
                <a-input
                  v-else
                  :value="childMeasured(record)"
                  size="middle"
                  allow-clear
                  style="flex: 1; min-width: 0"
                  :placeholder="`请输入${record.name}`"
                  @update:value="(v) => onChildMeasured(record.code, record.child, v)"
                />
                <span
                  v-if="record.unit && record.child.unitPosition !== 'prefix'"
                  class="unit-affix"
                  >{{ record.unit }}</span
                >
              </div>
              <div v-if="isManualJudgeField(record.child)" class="manual-judgment-row">
                <span class="manual-label"><span class="req">*</span>本项结论</span>
                <a-select
                  :value="childJudgment(record) || undefined"
                  size="middle"
                  allow-clear
                  placeholder="请选择本项结论"
                  :options="listManualJudgmentSelectOptions(record.child)"
                  style="flex: 1; min-width: 0"
                  @update:value="(v) => onChildJudgment(record.code, record.child, v)"
                />
              </div>
            </div>
          </div>
        </div>
        <div v-if="parentJudge === 'pass'" class="group-tip ok">
          整组判定：合格 — 可自动判定的子项均达标
        </div>
        <div v-else-if="parentJudge === 'fail'" class="group-tip fail">
          整组判定：不合格 — 存在未达标子项
        </div>
      </template>

      <template v-else-if="isMatrixField(field)">
        <a-table
          :columns="matrixColumns"
          :data-source="matrixRows"
          :pagination="false"
          size="middle"
          bordered
          row-key="_key"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              <span v-if="record._isRated" class="rated">▲ {{ record._label }}</span>
              <span v-else>{{ record._label }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag v-if="record._isRated" color="processing">关键点</a-tag>
              <a-tag v-else-if="rowFilled(record)" color="success">OK</a-tag>
              <span v-else class="muted">—</span>
            </template>
            <template v-else-if="column.dataIndex">
              <a-input-number
                v-if="colMeta(column.dataIndex)?.valueType !== 'text'"
                :value="record[column.dataIndex]"
                size="middle"
                style="width: 100%"
                @update:value="(v) => onMatrixCell(index, column.dataIndex, v)"
              />
              <a-input
                v-else
                :value="record[column.dataIndex]"
                size="middle"
                style="width: 100%"
                @update:value="(v) => onMatrixCell(index, column.dataIndex, v)"
              />
            </template>
          </template>
        </a-table>
        <a-button
          v-if="field.matrixAllowAddRow !== false"
          type="link"
          size="small"
          style="margin-top: 4px"
          @click="addMatrixRow"
        >
          + 添加测点
        </a-button>
      </template>
    </div>
  </div>
</template>

<script>
export default { name: 'QcInspectComplexField' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import {
  buildStandardText,
  evaluateFieldAgainstStandard,
  isManualJudgeField,
  listManualJudgmentSelectOptions,
  parseManualFieldValue,
  wrapManualFieldValue,
} from '@/utils/qcFieldStandard'
import {
  evaluateComplexOrSimpleField,
  isCompositeField,
  isMatrixField,
  normalizeComplexValue,
} from '@/utils/qcComplexField'

const props = defineProps({
  field: { type: Object, required: true },
  modelValue: { type: [Object, Array, String, Number], default: undefined },
  defaultExpanded: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'change'])

const expanded = ref(props.defaultExpanded)

const localValue = computed(() => normalizeComplexValue(props.field, props.modelValue))

const parentJudge = computed(() => evaluateComplexOrSimpleField(props.field, localValue.value))

const expandLabel = computed(() => {
  if (isCompositeField(props.field)) {
    const n = (props.field.children || []).length
    return `展开 ${n} 个子项`
  }
  return '展开多点测点'
})

const compositeRows = computed(() => {
  const childrenMap = localValue.value?.children || {}
  return (props.field.children || []).map((child) => {
    const value = childrenMap[child.code]
    return {
      code: child.code,
      name: child.name,
      unit: child.unit || '',
      child,
      value,
      judge: evaluateFieldAgainstStandard(child, value),
    }
  })
})

function childMeasured(record) {
  if (isManualJudgeField(record.child)) {
    return parseManualFieldValue(record.value).measured
  }
  return record.value
}

function childJudgment(record) {
  return parseManualFieldValue(record.value).judgment
}

function onChildMeasured(code, child, v) {
  const next = normalizeComplexValue(props.field, localValue.value)
  if (isManualJudgeField(child)) {
    const prev = parseManualFieldValue(next.children?.[code])
    next.children = { ...next.children, [code]: wrapManualFieldValue(v, prev.judgment) }
  } else {
    next.children = { ...next.children, [code]: v }
  }
  commit(next)
}

function onChildJudgment(code, child, v) {
  const next = normalizeComplexValue(props.field, localValue.value)
  const prev = parseManualFieldValue(next.children?.[code])
  next.children = { ...next.children, [code]: wrapManualFieldValue(prev.measured, v) }
  commit(next)
}

const matrixColMap = computed(() => {
  const map = {}
  ;(props.field.matrixColumns || []).forEach((c) => {
    if (c.code) map[c.code] = c
  })
  return map
})

const matrixColumns = computed(() => {
  const cols = [
    { title: '#', key: 'index', width: 72 },
    ...(props.field.matrixColumns || []).map((c) => ({
      title: c.unit ? `${c.name} (${c.unit})` : c.name,
      dataIndex: c.code,
      key: c.code,
      width: 120,
    })),
    { title: '状态', key: 'status', width: 90 },
  ]
  return cols
})

const matrixRows = computed(() => localValue.value?.rows || [])

watch(
  () => props.modelValue,
  (val) => {
    if (val == null) {
      emit('update:modelValue', normalizeComplexValue(props.field, null))
    }
  },
  { immediate: true },
)

function radioOpts(child) {
  return (child.options || []).map((v) => ({ label: String(v), value: String(v) }))
}

function asArray(val) {
  if (Array.isArray(val)) return val
  if (val === undefined || val === null || val === '') return []
  return [val]
}

function colMeta(code) {
  return matrixColMap.value[code]
}

function commit(next) {
  emit('update:modelValue', next)
  emit('change', next)
}

function onMatrixCell(rowIndex, colCode, v) {
  const next = normalizeComplexValue(props.field, localValue.value)
  const rows = next.rows.map((r, i) => (i === rowIndex ? { ...r, [colCode]: v } : { ...r }))
  commit({ ...next, rows })
}

function rowFilled(row) {
  return (props.field.matrixColumns || []).every((c) => {
    const v = row[c.code]
    return v !== undefined && v !== null && String(v).trim() !== ''
  })
}

function addMatrixRow() {
  const next = normalizeComplexValue(props.field, localValue.value)
  const n = next.rows.length + 1
  const row = { _key: `r${Date.now()}`, _label: String(n), _isRated: false }
  ;(props.field.matrixColumns || []).forEach((c) => {
    row[c.code] = undefined
  })
  commit({ ...next, rows: [...next.rows, row] })
}
</script>

<style lang="less" scoped>
.complex-inspect-block {
  grid-column: 1 / -1;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.complex-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.complex-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.req {
  color: #ff4d4f;
}

.complex-body {
  margin-top: 12px;
}

.sub-field-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 1280px) {
  .sub-field-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .sub-field-list {
    grid-template-columns: 1fr;
  }
}

.sub-field-row {
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background 0.2s;
  min-width: 0;
}

.sub-field-row.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.sub-field-row.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.sub-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.sub-field-name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
}

.sub-field-standard {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.judge-placeholder {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.25);
}

.field-input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
}

.manual-judgment-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.manual-label {
  flex-shrink: 0;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.unit-affix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
  white-space: nowrap;
  min-width: 28px;
}

.group-tip {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.4;
}

.group-tip.ok {
  color: #389e0d;
  background: #f6ffed;
}

.group-tip.fail {
  color: #cf1322;
  background: #fff2f0;
}

.rated {
  color: #1677ff;
  font-weight: 600;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
