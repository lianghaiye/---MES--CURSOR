<template>
  <div v-if="rows.length || complexBlocks.length" class="qc-field-values-readonly">
    <div v-if="metricRows.length" class="section-block">
      <div class="section-head">检验项目</div>
      <div class="field-card-grid">
        <div
          v-for="row in metricRows"
          :key="row.code"
          class="field-card"
          :class="{
            'is-pass': row.judge === 'pass',
            'is-fail': row.judge === 'fail',
            'is-full': row.fullRow,
          }"
        >
          <div class="field-card-head">
            <span class="field-card-title">{{ row.name }}</span>
            <a-tag v-if="row.judge === 'pass'" color="success" class="judge-tag">达标</a-tag>
            <a-tag v-else-if="row.judge === 'fail'" color="error" class="judge-tag">未达标</a-tag>
          </div>
          <div class="field-card-value" :class="{ 'is-empty': row.isEmpty }">
            {{ row.displayValue }}
          </div>
          <div v-if="row.standard" class="field-card-standard">标准：{{ row.standard }}</div>
        </div>
      </div>
    </div>

    <div v-for="block in complexBlocks" :key="block.code" class="section-block complex-block">
      <div class="section-head">
        <span class="section-head-title">{{ block.name }}</span>
        <a-tag v-if="block.type === 'composite'" color="processing">复合</a-tag>
        <a-tag v-else color="orange">多点</a-tag>
        <a-tag v-if="block.judge === 'pass'" color="success">合格</a-tag>
        <a-tag v-else-if="block.judge === 'fail'" color="error">不合格</a-tag>
      </div>

      <a-table
        v-if="block.type === 'composite' && block.tableRows.length"
        class="complex-table"
        :columns="compositeCols"
        :data-source="block.tableRows"
        :pagination="false"
        size="small"
        bordered
        row-key="code"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'judge'">
            <a-tag v-if="record.judge === 'pass'" color="success">合格</a-tag>
            <a-tag v-else-if="record.judge === 'fail'" color="error">不合格</a-tag>
            <span v-else class="muted">—</span>
          </template>
          <template v-else>{{ record[column.dataIndex] || '—' }}</template>
        </template>
      </a-table>

      <a-table
        v-else-if="block.type === 'matrix' && block.matrixData.length"
        class="complex-table"
        :columns="block.matrixCols"
        :data-source="block.matrixData"
        :pagination="false"
        size="small"
        bordered
        row-key="_key"
      />
      <div v-else class="muted">暂无子项数据</div>
    </div>

    <div v-if="remarkRows.length" class="section-block remark-block">
      <div class="section-head">检验备注</div>
      <div
        v-for="row in remarkRows"
        :key="row.code"
        class="remark-body"
        :class="{ 'is-empty': row.isEmpty }"
      >
        {{ row.displayValue }}
      </div>
    </div>
  </div>
  <div v-else class="empty-wrap">{{ emptyText }}</div>
</template>

<script>
export default { name: 'QcLineFieldValuesReadonly' }
</script>

<script setup>
import { computed } from 'vue'
import { isQcConclusionField, isQcInspectRemarkField } from '@/utils/qcConclusionField'
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
  { title: '子项', dataIndex: 'name', width: 160 },
  { title: '判定标准', dataIndex: 'standard', width: 160 },
  { title: '实测值', dataIndex: 'displayValue', width: 140 },
  { title: '判定', key: 'judge', width: 88, align: 'center' },
]

const simpleAndComplex = computed(() => buildDisplay(props.line, props.task, props.includeSystem))
const rows = computed(() => simpleAndComplex.value.rows)
const complexBlocks = computed(() => simpleAndComplex.value.complexBlocks)

const metricRows = computed(() => rows.value.filter((r) => !r.isRemark))
const remarkRows = computed(() => rows.value.filter((r) => r.isRemark))

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

function isEmptyDisplay(val) {
  const s = String(val ?? '').trim()
  return !s || s === '—' || s === '-'
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

    const displayValue = formatFieldValueWithUnit(field, raw)
    const isRemark = isQcInspectRemarkField(field) || field.type === 'textarea'
    rows.push({
      code: field.code,
      name: field.name || field.code,
      fullRow: isRemark || field.type === 'textarea',
      isRemark,
      displayValue: isEmptyDisplay(displayValue) ? '—' : displayValue,
      isEmpty: isEmptyDisplay(displayValue),
      standard: buildStandardText(field),
      judge: evaluateFieldAgainstStandard(field, raw),
    })
  })

  return { rows, complexBlocks }
}
</script>

<style lang="less" scoped>
.qc-field-values-readonly {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-block {
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.section-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 22px;
  color: #1f2329;
}

.section-head-title {
  margin-right: 2px;
}

.field-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

@media (max-width: 1280px) {
  .field-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .field-card-grid {
    grid-template-columns: 1fr;
  }
}

.field-card {
  min-width: 0;
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.field-card.is-full {
  grid-column: 1 / -1;
}

.field-card.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.field-card.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.field-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.field-card-title {
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 22px;
  color: #1f2329;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-card-value {
  font-size: 14px;
  line-height: 22px;
  color: #1f2329;
  word-break: break-word;
}

.field-card-value.is-empty,
.remark-body.is-empty {
  color: rgba(0, 0, 0, 0.25);
}

.field-card-standard {
  margin-top: 4px;
  font-size: 12px;
  line-height: 18px;
  color: #86909c;
}

.complex-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
  }
}

.remark-body {
  font-size: 13px;
  line-height: 22px;
  color: #1f2329;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-wrap {
  padding: 8px 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
}

.judge-tag {
  margin: 0;
  flex-shrink: 0;
}
</style>
