<template>
  <div v-if="record" class="qc-template-detail-panel">
    <a-tabs v-model:activeKey="activeTab" size="small" class="preview-tabs">
      <a-tab-pane key="detail" tab="详情">
        <div class="section-title">基本信息</div>
        <div class="basic-card">
          <a-row :gutter="[24, 8]" class="basic-info">
            <a-col :span="12">
              <span class="info-label">模板编号：</span>
              <span class="info-value">{{ record.code || '—' }}</span>
            </a-col>
            <a-col :span="12">
              <span class="info-label">模板名称：</span>
              <span class="info-value">{{ record.name || '—' }}</span>
            </a-col>
            <a-col :span="12">
              <span class="info-label">类型：</span>
              <span class="info-value">
                <a-tag :color="record.isSystem ? 'blue' : 'processing'">
                  {{ record.type || '—' }}
                </a-tag>
              </span>
            </a-col>
            <a-col v-if="!record.isSystem" :span="12">
              <span class="info-label">状态：</span>
              <span class="info-value">
                <a-tag :color="record.status === '启用' ? 'success' : 'default'">
                  {{ record.status || '—' }}
                </a-tag>
              </span>
            </a-col>
            <a-col :span="12">
              <span class="info-label">业务类型：</span>
              <span class="info-value">{{ record.bizScope || '—' }}</span>
            </a-col>
            <a-col :span="12">
              <span class="info-label">适用范围：</span>
              <span class="info-value">{{ qcTemplateScopeTypeLabel(record.scopeType) }}</span>
            </a-col>
            <a-col v-if="scopeObjectsText" :span="24">
              <span class="info-label">适用对象：</span>
              <span class="info-value" :title="scopeObjectsText">{{ scopeObjectsText }}</span>
            </a-col>
            <a-col :span="12">
              <span class="info-label">指标数量：</span>
              <span class="info-value">{{ fieldList.length }}</span>
            </a-col>
            <a-col :span="24">
              <span class="info-label">整单合格规则：</span>
              <span class="info-value">{{ sheetPassRuleLabel(record.sheetPassRule) }}</span>
            </a-col>
            <a-col v-if="sheetConclusionSummary" :span="24">
              <span class="info-label">结论选项：</span>
              <span class="info-value" :title="sheetConclusionSummary">{{
                sheetConclusionSummary
              }}</span>
            </a-col>
          </a-row>
        </div>

        <div class="section-title">
          模板指标
          <span class="section-hint">仅复合指标可展开查看子项</span>
        </div>
        <a-table
          v-if="fieldList.length"
          class="field-table"
          :columns="fieldColumns"
          :data-source="fieldList"
          row-key="code"
          size="small"
          bordered
          :pagination="false"
          children-column-name="__noTreeChildren__"
          :expandable="fieldExpandable"
          :scroll="{ x: fieldTableScrollX, y: tableScrollY }"
        >
          <template #expandIcon="{ expanded, onExpand, record: row }">
            <button
              v-if="isCompositeRow(row)"
              type="button"
              class="ant-table-row-expand-icon"
              :class="
                expanded
                  ? 'ant-table-row-expand-icon-expanded'
                  : 'ant-table-row-expand-icon-collapsed'
              "
              :aria-label="expanded ? '收起子项' : '展开子项'"
              @click.stop="(e) => onExpand(row, e)"
            />
            <span v-else class="expand-icon-placeholder" aria-hidden="true" />
          </template>
          <template #bodyCell="{ column, record: row, index }">
            <template v-if="column.key === 'index'">{{ index + 1 }}</template>
            <template v-else-if="column.key === 'code'">
              <span :title="row.code">{{ row.code || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'name'">
              <span :title="row.name">{{ row.name || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'type'">
              <template v-if="row.type === 'composite'">
                复合项（{{ (row.childFields || []).length }} 子项）
              </template>
              <template v-else>{{ fieldTypeLabel(row.type) }}</template>
            </template>
            <template v-else-if="column.key === 'required'">
              {{ row.required ? '是' : '否' }}
            </template>
            <template v-else-if="column.key === 'unit'">
              {{ displayUnit(row) }}
            </template>
            <template v-else-if="column.key === 'standard'">
              <span :title="standardCell(row)">{{ standardCell(row) }}</span>
            </template>
            <template v-else-if="column.key === 'keyForSheetPass'">
              {{ row.keyForSheetPass ? '是' : '—' }}
            </template>
            <template v-else-if="column.key === 'options'">
              <span :title="formatOptions(row)">{{ formatOptions(row) }}</span>
            </template>
            <template v-else>
              {{ row[column.dataIndex] || '—' }}
            </template>
          </template>

          <template #expandedRowRender="{ record: row }">
            <div v-if="isCompositeRow(row)" class="child-expand-wrap">
              <div class="child-expand-title">子项明细</div>
              <a-table
                :columns="childColumns"
                :data-source="row.childFields || []"
                row-key="code"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: child, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'type'">
                    {{ fieldTypeLabel(child.type) }}
                  </template>
                  <template v-else-if="column.key === 'required'">
                    {{ child.required === false ? '否' : '是' }}
                  </template>
                  <template v-else-if="column.key === 'unit'">
                    {{ displayUnit(child) }}
                  </template>
                  <template v-else-if="column.key === 'standard'">
                    {{ buildStandardText(child) || '—' }}
                  </template>
                  <template v-else>
                    {{ child[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>
        </a-table>
        <a-empty v-else description="暂无指标" />
      </a-tab-pane>

      <a-tab-pane key="fill" tab="填写预览">
        <QcTemplateFillPreview
          :fields="fieldsForFill"
          :template-name="record.name"
          :template-code="record.code"
          :sheet-pass-rule="record.sheetPassRule"
          :sheet-conclusion-option-items="record.sheetConclusionOptionItems"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script>
export default { name: 'QcTemplateDetailPanel' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { QC_TEMPLATE_SCOPE_TYPE, qcTemplateScopeTypeLabel } from '@/mock/qcTemplates'
import { buildStandardText } from '@/utils/qcFieldStandard'
import {
  isQcConclusionField,
  normalizeConclusionOptionItems,
  upsertSheetConclusionField,
} from '@/utils/qcConclusionField'
import { sheetPassRuleLabel, normalizeSheetPassRule } from '@/utils/qcTemplateSheetPass'
import QcTemplateFillPreview from './QcTemplateFillPreview.vue'

const props = defineProps({
  record: { type: Object, default: null },
  /** detail | fill */
  initialTab: { type: String, default: 'detail' },
  /** 表格纵向滚动高度，页面详情可更大 */
  tableScrollY: { type: [Number, String], default: 460 },
})

const activeTab = ref('detail')

const fieldTypeMap = {
  text: '文本框',
  textarea: '文本域',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  radio: '单选',
  checkbox: '多选',
  composite: '复合项',
  matrix: '多点网格',
}

const fieldColumns = computed(() => {
  const cols = [
    { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
    { title: '字段编码', key: 'code', dataIndex: 'code', width: 150, ellipsis: true },
    { title: '字段名称', key: 'name', dataIndex: 'name', width: 130, ellipsis: true },
    { title: '字段类型', key: 'type', width: 130 },
    { title: '必填', key: 'required', width: 56, align: 'center' },
    { title: '单位', key: 'unit', width: 72 },
    { title: '合格标准', key: 'standard', width: 160, ellipsis: true },
  ]
  if (normalizeSheetPassRule(props.record?.sheetPassRule) === 'keyFields') {
    cols.push({ title: '关键项', key: 'keyForSheetPass', width: 72, align: 'center' })
  }
  cols.push({ title: '选项', key: 'options', width: 160, ellipsis: true })
  return cols
})

const childColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '编码', dataIndex: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 120, ellipsis: true },
  { title: '类型', key: 'type', width: 90 },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '单位', key: 'unit', width: 72 },
  { title: '合格标准', key: 'standard', ellipsis: true },
]

const fieldTableScrollX = computed(() =>
  fieldColumns.value.reduce((sum, col) => sum + (Number(col.width) || 120), 0),
)

function isCompositeRow(row) {
  return row?.type === 'composite' && Array.isArray(row.childFields) && row.childFields.length > 0
}

const fieldExpandable = computed(() => ({
  rowExpandable: (row) => isCompositeRow(row),
}))

const scopeObjectsText = computed(() => {
  const record = props.record
  if (!record) return ''
  const scopeType = record.scopeType
  const objects = Array.isArray(record.objects) ? record.objects : []
  if (!objects.length) return ''

  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.CATEGORY) {
    return objects
      .map((o) => String(o.label || o.value || o.code || '').trim())
      .filter(Boolean)
      .join('、')
  }

  if (scopeType === QC_TEMPLATE_SCOPE_TYPE.SINGLE) {
    return objects
      .map((o) => {
        const name = String(o.label || o.name || '').trim()
        const code = String(o.code || o.value || '').trim()
        if (name && code && name !== code) return `${name}/${code}`
        return name || code
      })
      .filter(Boolean)
      .join('、')
  }

  return ''
})

/** 人工判定时展示模板级结论选项摘要 */
const sheetConclusionSummary = computed(() => {
  const record = props.record
  if (!record) return ''
  if (normalizeSheetPassRule(record.sheetPassRule) !== 'manual') return ''
  const items = normalizeConclusionOptionItems({
    optionItems: record.sheetConclusionOptionItems,
  })
  if (!items.length) return ''
  return items
    .map((o) => {
      const def = o.isDefault ? '（默认）' : ''
      return `${o.value}→${o.result}${def}`
    })
    .join('、')
})

const fieldList = computed(() => {
  const list = (props.record?.fields || []).filter((f) => !isQcConclusionField(f))
  return [...list]
    .map((f, idx) => {
      const { children, ...rest } = f || {}
      return {
        ...rest,
        childFields: Array.isArray(children) ? children : undefined,
        _idx: idx,
      }
    })
    .sort((a, b) => {
      const sa = a.sortOrder
      const sb = b.sortOrder
      if (sa != null && sb != null && sa !== sb) return sa - sb
      if (sa != null && sb == null) return -1
      if (sa == null && sb != null) return 1
      return a._idx - b._idx
    })
})

const fieldsForFill = computed(() => {
  const list = (props.record?.fields || []).map((f) => ({
    ...f,
    options: f.options ? [...f.options] : [],
    optionItems: f.optionItems ? f.optionItems.map((o) => ({ ...o })) : undefined,
    children: Array.isArray(f.children) ? f.children.map((c) => ({ ...c })) : f.children,
  }))
  return upsertSheetConclusionField(list, props.record?.sheetConclusionOptionItems)
})

watch(
  () => [props.record?.id, props.initialTab],
  ([, tab]) => {
    activeTab.value = tab === 'fill' ? 'fill' : 'detail'
  },
  { immediate: true },
)

function fieldTypeLabel(type) {
  return fieldTypeMap[type] || type || '—'
}

function displayUnit(row) {
  if (!row?.withUnit && !row?.unit) return '—'
  const unit = String(row.unit || '').trim()
  if (!unit) return '—'
  return row.unitPosition === 'prefix' ? `${unit}（前）` : unit
}

function standardCell(row) {
  if (row?.type === 'composite') {
    const n = (row.childFields || []).length
    return n ? `含子项分别判定（${n}）` : '含子项分别判定'
  }
  return buildStandardText(row) || '—'
}

function formatOptions(row) {
  if (isQcConclusionField(row)) {
    const items = normalizeConclusionOptionItems(row)
    if (!items.length) return '—'
    return items.map((o) => `${o.value}→${o.result}`).join('、')
  }
  const options = row.options
  if (!Array.isArray(options) || !options.length) return '—'
  return options
    .map((v) => (typeof v === 'string' ? v : v.label || v.value))
    .filter(Boolean)
    .join('、')
}
</script>

<style lang="less" scoped>
.preview-tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 12px;
  }
}

.section-title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1f2329;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.section-hint {
  font-size: 12px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.basic-card {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.basic-info {
  .info-label {
    color: #4e5969;
    font-size: 14px;
    line-height: 22px;
    white-space: nowrap;
  }

  .info-value {
    color: #1f2329;
    font-size: 14px;
    line-height: 22px;
    word-break: break-all;
  }
}

.field-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    white-space: nowrap;
  }

  :deep(.ant-table-tbody > tr > td) {
    vertical-align: middle;
  }

  :deep(.ant-table-expanded-row > td) {
    background: #fafafa;
  }

  .expand-icon-placeholder {
    display: inline-block;
    width: 17px;
    height: 17px;
    visibility: hidden;
  }
}

.child-expand-wrap {
  padding: 4px 8px 8px 24px;
}

.child-expand-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}
</style>
