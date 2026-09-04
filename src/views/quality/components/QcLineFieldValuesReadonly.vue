<template>
  <div v-if="rows.length || complexBlocks.length" class="qc-field-values-readonly">
    <a-row v-if="rows.length" :gutter="[12, 12]">
      <a-col v-for="row in rows" :key="row.code" :span="row.span">
        <div class="fv-label">{{ row.name }}</div>
        <div class="fv-value">{{ row.displayValue }}</div>
        <div v-if="row.standard" class="fv-standard">
          标准：{{ row.standard }}
          <a-tag v-if="row.judge === 'pass'" color="success" class="judge-tag">达标</a-tag>
          <a-tag v-else-if="row.judge === 'fail'" color="error" class="judge-tag">未达标</a-tag>
        </div>
      </a-col>
    </a-row>

    <div v-for="block in complexBlocks" :key="block.code" class="complex-readonly">
      <div class="fv-label">
        {{ block.name }}
        <a-tag v-if="block.type === 'composite'" color="processing">复合</a-tag>
        <a-tag v-else color="orange">多点</a-tag>
        <a-tag v-if="block.judge === 'pass'" color="success">合格</a-tag>
        <a-tag v-else-if="block.judge === 'fail'" color="error">不合格</a-tag>
      </div>
      <div class="fv-value">{{ block.summary }}</div>

      <a-table
        v-if="block.type === 'composite' && block.tableRows.length"
        :columns="compositeCols"
        :data-source="block.tableRows"
        :pagination="false"
        size="small"
        bordered
        row-key="code"
        style="margin-top: 8px"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'judge'">
            <a-tag v-if="record.judge === 'pass'" color="success">合格</a-tag>
            <a-tag v-else-if="record.judge === 'fail'" color="error">不合格</a-tag>
            <span v-else>—</span>
          </template>
          <template v-else>{{ record[column.dataIndex] || '—' }}</template>
        </template>
      </a-table>

      <a-table
        v-else-if="block.type === 'matrix' && block.matrixData.length"
        :columns="block.matrixCols"
        :data-source="block.matrixData"
        :pagination="false"
        size="small"
        bordered
        row-key="_key"
        style="margin-top: 8px"
      />
    </div>
  </div>
  <span v-else class="muted">{{ emptyText }}</span>
</template>

<script>
export default { name: 'QcLineFieldValuesReadonly' }
</script>

<script setup>
import { computed } from 'vue'
import { isQcConclusionField } from '@/utils/qcConclusionField'
import {
  buildStandardText,
  evaluateFieldAgainstStandard,
  formatFieldValueWithUnit,
} from '@/utils/qcFieldStandard'
import {
  evaluateComplexOrSimpleField,
  formatComplexValueSummary,
  isComplexField,
  isCompositeField,
  isMatrixField,
  normalizeComplexValue,
} from '@/utils/qcComplexField'

const props = defineProps({
  line: { type: Object, default: null },
  task: { type: Object, default: null },
  includeSystem: { type: Boolean, default: false },
  emptyText: { type: String, default: '暂无检验项录入' },
})

const compositeCols = [
  { title: '子项', dataIndex: 'name', width: 140 },
  { title: '判定标准', dataIndex: 'standard', width: 120 },
  { title: '实测值', dataIndex: 'displayValue', width: 120 },
  { title: '判定', key: 'judge', width: 80 },
]

const simpleAndComplex = computed(() => buildDisplay(props.line, props.task, props.includeSystem))
const rows = computed(() => simpleAndComplex.value.rows)
const complexBlocks = computed(() => simpleAndComplex.value.complexBlocks)

function resolveFields(line, task) {
  if (Array.isArray(line?.templateFields) && line.templateFields.length) return line.templateFields
  return task?.templateFields || []
}

function buildValueMap(line) {
  const map = {}
  ;(line?.fieldValues || []).forEach((v) => {
    const code = v.fieldCode || v.code
    if (code) map[code] = v.value ?? v.fieldValue
  })
  if (line?.fieldMap && typeof line.fieldMap === 'object') {
    Object.assign(map, line.fieldMap)
  }
  return map
}

function isExtraField(field) {
  if (!field?.code) return false
  if (field.code === 'QC_INSPECT_METHOD' || field.code === 'QC_INSPECT_QTY') return false
  if (isQcConclusionField(field)) return false
  return true
}

function buildDisplay(line, task, includeSystem) {
  if (!line) return { rows: [], complexBlocks: [] }
  const fields = resolveFields(line, task).filter((f) =>
    includeSystem ? Boolean(f?.code) : isExtraField(f),
  )
  const valueMap = buildValueMap(line)
  const rows = []
  const complexBlocks = []

  fields.forEach((field) => {
    const raw = valueMap[field.code]
    if (isComplexField(field)) {
      const value = normalizeComplexValue(field, raw)
      const block = {
        code: field.code,
        name: field.name || field.code,
        type: field.type,
        judge: evaluateComplexOrSimpleField(field, value),
        summary: formatComplexValueSummary(field, value),
        tableRows: [],
        matrixData: [],
        matrixCols: [],
      }
      if (isCompositeField(field)) {
        block.tableRows = (field.children || []).map((child) => {
          const v = value.children?.[child.code]
          return {
            code: child.code,
            name: child.name,
            standard: buildStandardText(child) || '—',
            displayValue: formatFieldValueWithUnit(child, v),
            judge: evaluateFieldAgainstStandard(child, v),
          }
        })
      } else if (isMatrixField(field)) {
        block.matrixCols = [
          { title: '#', dataIndex: '_label', width: 64 },
          ...(field.matrixColumns || []).map((c) => ({
            title: c.unit ? `${c.name} (${c.unit})` : c.name,
            dataIndex: c.code,
          })),
        ]
        block.matrixData = (value.rows || []).map((r) => {
          const row = { ...r }
          ;(field.matrixColumns || []).forEach((c) => {
            if (row[c.code] === undefined || row[c.code] === null || row[c.code] === '') {
              row[c.code] = '—'
            }
          })
          return row
        })
      }
      complexBlocks.push(block)
      return
    }

    rows.push({
      code: field.code,
      name: field.name || field.code,
      span: field.type === 'textarea' ? 24 : 8,
      displayValue: formatFieldValueWithUnit(field, raw),
      standard: buildStandardText(field),
      judge: evaluateFieldAgainstStandard(field, raw),
    })
  })

  return { rows, complexBlocks }
}
</script>

<style lang="less" scoped>
.qc-field-values-readonly {
  padding: 4px 0;
}

.fv-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.fv-value {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  word-break: break-all;
}

.fv-standard {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.complex-readonly {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
}

.judge-tag {
  margin-left: 6px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}
</style>
