<template>
  <div v-if="hasContent" class="qc-field-values-readonly">
    <div class="line-sheet-section">
      <div class="line-sheet-title">检验项目</div>
      <div v-if="inspectItems.length" class="inspect-fields-grid">
        <template v-for="item in inspectItems" :key="item.code">
          <!-- 复合 / 多点：对齐录入页 QcInspectComplexField -->
          <div v-if="item.kind === 'complex'" class="complex-inspect-block">
            <div class="complex-head">
              <div class="complex-title">
                {{ item.name }}
                <a-tag v-if="item.keyForSheetPass" color="warning">关键项</a-tag>
                <a-tag v-if="item.complexType === 'composite'" color="processing">复合</a-tag>
                <a-tag v-else color="orange">多点</a-tag>
                <a-tag v-if="item.judge === 'pass'" color="success">合格</a-tag>
                <a-tag v-else-if="item.judge === 'fail'" color="error">不合格</a-tag>
                <span v-else class="judge-placeholder">待判定</span>
              </div>
            </div>

            <div class="complex-body">
              <div
                v-if="item.complexType === 'composite' && item.children.length"
                class="sub-field-list"
              >
                <div
                  v-for="child in item.children"
                  :key="child.code"
                  class="sub-field-row"
                  :class="{
                    'is-pass': child.judge === 'pass',
                    'is-fail': child.judge === 'fail',
                  }"
                >
                  <div class="sub-field-head">
                    <div class="sub-field-name">{{ child.name }}</div>
                    <a-tag v-if="child.judge === 'pass'" color="success">合格</a-tag>
                    <a-tag v-else-if="child.judge === 'fail'" color="error">不合格</a-tag>
                    <span v-else class="judge-placeholder">待判定</span>
                  </div>
                  <div class="sub-field-standard">
                    <template v-if="child.standard">合格标准：{{ child.standard }}</template>
                    <template v-else>合格标准：未设置（仅记录实测值）</template>
                  </div>
                  <div class="field-value-wrap" :class="{ 'is-empty': child.isEmpty }">
                    {{ child.displayValue }}
                  </div>
                </div>
              </div>

              <a-table
                v-else-if="item.complexType === 'matrix' && item.matrixData.length"
                class="complex-table"
                :columns="item.matrixCols"
                :data-source="item.matrixData"
                :pagination="false"
                size="middle"
                bordered
                row-key="_key"
              />
              <div v-else class="muted">暂无子项数据</div>
            </div>
          </div>

          <!-- 普通项：对齐录入页 inspect-field-card -->
          <div
            v-else
            class="inspect-field-card"
            :class="{
              'is-pass': item.judge === 'pass',
              'is-fail': item.judge === 'fail',
              'is-full': item.fullRow,
            }"
          >
            <div class="inspect-field-head">
              <div class="inspect-field-title">
                {{ item.name }}
                <a-tag v-if="item.keyForSheetPass" color="warning" class="key-item-tag"
                  >关键项</a-tag
                >
              </div>
              <a-tag v-if="item.judge === 'pass'" color="success" class="judge-tag">合格</a-tag>
              <a-tag v-else-if="item.judge === 'fail'" color="error" class="judge-tag"
                >不合格</a-tag
              >
              <span v-else class="judge-placeholder">待判定</span>
            </div>
            <div class="inspect-field-standard">
              <template v-if="item.standard">合格标准：{{ item.standard }}</template>
              <template v-else>合格标准：未设置（仅记录实测值）</template>
            </div>
            <div class="field-value-wrap" :class="{ 'is-empty': item.isEmpty }">
              {{ item.displayValue }}
            </div>
          </div>
        </template>
      </div>
      <div v-else class="muted">该模板未配置检验项目</div>
    </div>

    <div v-if="remarkItems.length" class="line-sheet-section">
      <div class="line-sheet-title">检验备注</div>
      <div
        v-for="row in remarkItems"
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

const displayBundle = computed(() => buildDisplay(props.line, props.task, props.includeSystem))
const inspectItems = computed(() => displayBundle.value.inspectItems)
const remarkItems = computed(() => displayBundle.value.remarkItems)
const hasContent = computed(() => inspectItems.value.length > 0 || remarkItems.value.length > 0)

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
  if (!line) return { inspectItems: [], remarkItems: [] }
  const fields = resolveFields(line, task).filter((f) =>
    includeSystem ? Boolean(f?.code) : isExtraField(f),
  )
  const valueMap = buildValueMap(line)
  const inspectItems = []
  const remarkItems = []

  fields.forEach((field) => {
    const raw = valueMap[field.code]
    if (isComplexField(field)) {
      const value = normalizeComplexValue(field, raw)
      const item = {
        kind: 'complex',
        code: field.code,
        name: field.name || field.code,
        keyForSheetPass: Boolean(field.keyForSheetPass),
        complexType: isCompositeField(field)
          ? 'composite'
          : isMatrixField(field)
            ? 'matrix'
            : field.type,
        judge: evaluateComplexOrSimpleField(field, value),
        children: [],
        matrixData: [],
        matrixCols: [],
      }
      if (isCompositeField(field)) {
        item.children = (field.children || []).map((child) => {
          const v = value.children?.[child.code]
          const displayValue = formatFieldValueWithUnit(child, v)
          return {
            code: child.code,
            name: child.name,
            standard: buildStandardText(child),
            displayValue: isEmptyDisplay(displayValue) ? '—' : displayValue,
            isEmpty: isEmptyDisplay(displayValue),
            judge: evaluateFieldAgainstStandard(child, v),
          }
        })
      } else if (isMatrixField(field)) {
        item.matrixCols = [
          { title: '#', dataIndex: '_label', width: 64 },
          ...(field.matrixColumns || []).map((c) => ({
            title: c.unit ? `${c.name} (${c.unit})` : c.name,
            dataIndex: c.code,
          })),
        ]
        item.matrixData = (value.rows || []).map((r) => {
          const row = { ...r }
          ;(field.matrixColumns || []).forEach((c) => {
            if (row[c.code] === undefined || row[c.code] === null || row[c.code] === '') {
              row[c.code] = '—'
            }
          })
          return row
        })
      }
      inspectItems.push(item)
      return
    }

    const displayValue = formatFieldValueWithUnit(field, raw)
    const isRemark = isQcInspectRemarkField(field) || field.type === 'textarea'
    const row = {
      kind: 'simple',
      code: field.code,
      name: field.name || field.code,
      keyForSheetPass: Boolean(field.keyForSheetPass),
      fullRow: isRemark || field.type === 'textarea',
      displayValue: isEmptyDisplay(displayValue) ? '—' : displayValue,
      isEmpty: isEmptyDisplay(displayValue),
      standard: buildStandardText(field),
      judge: evaluateFieldAgainstStandard(field, raw),
    }
    if (isRemark) remarkItems.push(row)
    else inspectItems.push(row)
  })

  return { inspectItems, remarkItems }
}
</script>

<style lang="less" scoped>
.qc-field-values-readonly {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.line-sheet-section {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }
}

.line-sheet-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 22px;
  color: #1f2329;
}

.inspect-fields-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 1280px) {
  .inspect-fields-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .inspect-fields-grid {
    grid-template-columns: 1fr;
  }
}

.inspect-field-card {
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  min-width: 0;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.inspect-field-card.is-full {
  grid-column: 1 / -1;
}

.inspect-field-card.is-pass {
  border-color: #b7eb8f;
  background: #f6ffed;
}

.inspect-field-card.is-fail {
  border-color: #ffa39e;
  background: #fff2f0;
}

.inspect-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.inspect-field-title {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  line-height: 22px;
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.key-item-tag {
  margin: 0;
  font-weight: 500;
}

.inspect-field-standard {
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
}

.field-value-wrap {
  font-size: 14px;
  line-height: 22px;
  color: #1f2329;
  word-break: break-word;
  min-height: 22px;
}

.field-value-wrap.is-empty,
.remark-body.is-empty {
  color: rgba(0, 0, 0, 0.25);
}

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
  min-width: 0;
  transition:
    border-color 0.2s,
    background 0.2s;
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
  padding: 8px 12px;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.empty-wrap {
  padding: 8px 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}

.muted {
  color: rgba(0, 0, 0, 0.25);
  font-size: 13px;
}

.judge-tag {
  margin: 0;
  flex-shrink: 0;
}

.judge-placeholder {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.25);
}
</style>
