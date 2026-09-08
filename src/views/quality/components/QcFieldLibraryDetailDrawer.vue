<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    v-bind="drawerBindWide"
    destroy-on-close
    class="qc-field-library-detail-drawer"
    @close="handleClose"
  >
    <template v-if="record">
      <!-- 1. 基本信息 -->
      <div class="section-title">基本信息</div>
      <div class="drawer-section-card">
        <a-row :gutter="[24, 10]" class="drawer-info">
          <a-col :span="12">
            <span class="info-label">状态：</span>
            <span class="info-value">
              <a-tag :color="record.status === '启用' ? 'success' : 'default'">
                {{ record.status || '—' }}
              </a-tag>
              <a-tag v-if="record.isSystem" color="blue">系统</a-tag>
            </span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">编码：</span>
            <span class="info-value">{{ record.code || '—' }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">指标类型：</span>
            <span class="info-value">{{ indicatorKindLabel }}</span>
          </a-col>
        </a-row>
      </div>

      <!-- 2. 指标信息 -->
      <div class="section-title">指标信息</div>
      <div class="drawer-section-card">
        <a-row :gutter="[24, 10]" class="drawer-info">
          <a-col :span="12">
            <span class="info-label">指标名称：</span>
            <span class="info-value">{{ record.name || '—' }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">字段类型：</span>
            <span class="info-value">{{ qcFieldTypeLabel(record.type) }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">是否必填：</span>
            <span class="info-value">{{ record.required ? '是' : '否' }}</span>
          </a-col>
          <a-col :span="12">
            <span class="info-label">单位：</span>
            <span class="info-value">{{ displayUnit(record) }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">输入提示：</span>
            <span class="info-value">{{ record.placeholder || '—' }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">字段描述：</span>
            <span class="info-value">{{ record.description || '—' }}</span>
          </a-col>
        </a-row>

        <template v-if="showOptionTable">
          <div class="sub-block-title">待选项</div>
          <a-table
            :columns="optionColumns"
            :data-source="optionRows"
            row-key="key"
            size="small"
            bordered
            :pagination="false"
          >
            <template #bodyCell="{ column, record: row }">
              <template v-if="column.key === 'isDefault'">
                {{ row.isDefault ? '是' : '—' }}
              </template>
              <template v-else>
                {{ row[column.dataIndex] ?? row[column.key] ?? '—' }}
              </template>
            </template>
          </a-table>
        </template>

        <template v-if="isComposite">
          <div class="sub-block-title">子项（{{ childRows.length }}）</div>
          <a-table
            v-if="childRows.length"
            :columns="childColumns"
            :data-source="childRows"
            row-key="code"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ y: 280 }"
          >
            <template #bodyCell="{ column, record: row, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'type'">
                {{ qcFieldTypeLabel(row.type) }}
              </template>
              <template v-else-if="column.key === 'required'">
                {{ row.required === false ? '否' : '是' }}
              </template>
              <template v-else-if="column.key === 'unit'">
                {{ displayUnit(row) }}
              </template>
              <template v-else-if="column.key === 'standard'">
                {{ buildStandardText(row) || '—' }}
              </template>
              <template v-else>
                {{ row[column.dataIndex] || '—' }}
              </template>
            </template>
          </a-table>
          <a-empty v-else description="暂无子项" />
        </template>
      </div>

      <!-- 3. 合格标准 -->
      <div class="section-title">合格标准</div>
      <div class="drawer-section-card">
        <a-row :gutter="[24, 10]" class="drawer-info">
          <a-col :span="24">
            <span class="info-label">判定方式：</span>
            <span class="info-value">{{ judgeRuleLabel }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">判定关联：</span>
            <span class="info-value">{{ judgeRelatedText }}</span>
          </a-col>
          <a-col :span="24">
            <span class="info-label">标准说明：</span>
            <span class="info-value">{{ standardDescText }}</span>
          </a-col>
        </a-row>

        <template v-if="showManualOptionTable">
          <div class="sub-block-title">结论选项（含结果映射）</div>
          <a-table
            :columns="manualOptionColumns"
            :data-source="manualOptionRows"
            row-key="key"
            size="small"
            bordered
            :pagination="false"
          />
        </template>
      </div>
    </template>
  </a-drawer>
</template>

<script>
export default { name: 'QcFieldLibraryDetailDrawer' }
</script>

<script setup>
import { computed } from 'vue'
import { useDrawerWidth } from '@/composables/useDrawerWidth'
import { qcFieldTypeLabel } from '@/mock/qcFieldLibrary'
import {
  QC_FIELD_JUDGE_RULE,
  QC_FIELD_JUDGE_RULE_OPTIONS,
  buildStandardText,
  normalizeJudgeRule,
  normalizeManualOptionItems,
} from '@/utils/qcFieldStandard'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const { drawerBind, isNarrowViewport } = useDrawerWidth('l')
const drawerBindWide = computed(() => ({
  ...drawerBind.value,
  width: isNarrowViewport.value ? '100%' : 800,
}))

const drawerTitle = computed(() => {
  const code = props.record?.code || ''
  const name = props.record?.name || ''
  if (code || name) return `检验项详情 ${code || name}`.trim()
  return '检验项详情'
})

const isComposite = computed(() => props.record?.type === 'composite')

const indicatorKindLabel = computed(() => (isComposite.value ? '复合' : '基础'))

const showOptionTable = computed(() => {
  const t = props.record?.type
  return (t === 'radio' || t === 'checkbox') && optionRows.value.length > 0
})

const optionColumns = [
  { title: '序号', dataIndex: 'index', key: 'index', width: 64, align: 'center' },
  { title: '选项值', dataIndex: 'value', key: 'value' },
  { title: '默认', key: 'isDefault', width: 80, align: 'center' },
]

const optionRows = computed(() => {
  const record = props.record || {}
  const def = String(record.defaultValue ?? '').trim()
  const fromRows = Array.isArray(record.optionRows) ? record.optionRows : null
  if (fromRows?.length) {
    return fromRows
      .map((o, i) => {
        const value = String(o?.value ?? o?.label ?? '').trim()
        if (!value) return null
        return {
          key: `opt-${i}`,
          index: i + 1,
          value,
          isDefault: Boolean(o?.isDefault) || (def && value === def),
        }
      })
      .filter(Boolean)
  }
  const opts = Array.isArray(record.options) ? record.options : []
  return opts
    .map((o, i) => {
      const value =
        typeof o === 'string' ? String(o).trim() : String(o?.value ?? o?.label ?? '').trim()
      if (!value) return null
      return {
        key: `opt-${i}`,
        index: i + 1,
        value,
        isDefault: Boolean(o?.isDefault) || (def && value === def),
      }
    })
    .filter(Boolean)
})

const childRows = computed(() => {
  const list = props.record?.children
  return Array.isArray(list) ? list : []
})

const childColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '编码', dataIndex: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 120, ellipsis: true },
  { title: '类型', key: 'type', width: 90 },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '单位', key: 'unit', width: 80 },
  { title: '合格标准', key: 'standard', ellipsis: true },
]

const judgeRule = computed(() => normalizeJudgeRule(props.record?.judgeRule, props.record?.type))

const judgeRuleLabel = computed(() => {
  if (isComposite.value) return '含子项分别判定'
  const hit = QC_FIELD_JUDGE_RULE_OPTIONS.find((o) => o.value === judgeRule.value)
  return hit?.label || '—'
})

const judgeRelatedText = computed(() => {
  const field = props.record || {}
  if (isComposite.value) {
    const n = childRows.value.length
    return n ? `子项 ${n} 个，各自配置判定` : '暂无子项'
  }
  const rule = judgeRule.value
  if (rule === QC_FIELD_JUDGE_RULE.NONE) return '—'
  if (rule === QC_FIELD_JUDGE_RULE.RANGE) {
    const min = field.standardMin
    const max = field.standardMax
    const parts = []
    if (min !== '' && min != null) parts.push(`下限 ${min}`)
    if (max !== '' && max != null) parts.push(`上限 ${max}`)
    return parts.length ? parts.join('；') : '—'
  }
  if (rule === QC_FIELD_JUDGE_RULE.OPTION_PASS) {
    const opts = Array.isArray(field.passOptions) ? field.passOptions.filter(Boolean) : []
    return opts.length ? `合格选项：${opts.join('、')}` : '—'
  }
  if (rule === QC_FIELD_JUDGE_RULE.EQUALS) {
    const v = field.standardValue
    return v != null && String(v).trim() !== '' ? `标准值：${v}` : '—'
  }
  if (rule === QC_FIELD_JUDGE_RULE.MANUAL) {
    const items = normalizeManualOptionItems(field)
    if (!items.length) return '—'
    return items.map((o) => `${o.value}→${o.result}`).join('；')
  }
  return '—'
})

const standardDescText = computed(() => {
  const field = props.record || {}
  const custom = String(field.standardText || '').trim()
  if (custom) return custom
  if (isComposite.value) return '含子项分别判定'
  return buildStandardText(field) || '—'
})

const showManualOptionTable = computed(
  () => !isComposite.value && judgeRule.value === QC_FIELD_JUDGE_RULE.MANUAL,
)

const manualOptionColumns = [
  { title: '序号', dataIndex: 'index', width: 64, align: 'center' },
  { title: '选项文案', dataIndex: 'value' },
  { title: '映射结果', dataIndex: 'result', width: 120 },
  { title: '默认', dataIndex: 'isDefaultText', width: 72, align: 'center' },
]

const manualOptionRows = computed(() =>
  normalizeManualOptionItems(props.record || {}).map((o, i) => ({
    key: `manual-${i}`,
    index: i + 1,
    value: o.value || '—',
    result: o.result || '—',
    isDefaultText: o.isDefault ? '是' : '—',
  })),
)

function displayUnit(record) {
  if (!record?.withUnit && !record?.unit) return '—'
  const unit = String(record.unit || '').trim()
  if (!unit) return '—'
  return record.unitPosition === 'prefix' ? `${unit}（前）` : `${unit}（后）`
}

function handleClose() {
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.drawer-section-card {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.drawer-info {
  .info-label {
    color: rgba(0, 0, 0, 0.45);
  }
  .info-value {
    color: rgba(0, 0, 0, 0.88);
    word-break: break-all;
  }
}

.sub-block-title {
  margin: 14px 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
}
</style>
