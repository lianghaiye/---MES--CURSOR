<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    v-bind="drawerBind"
    destroy-on-close
    class="qc-template-preview-drawer"
    @close="handleClose"
  >
    <template v-if="record">
      <a-tabs v-model:activeKey="activeTab" size="small" class="preview-tabs">
        <a-tab-pane key="detail" tab="详情">
          <div class="section-title">基本信息</div>
          <div class="drawer-basic-card">
            <a-row :gutter="[24, 8]" class="drawer-basic-info">
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
              <a-col :span="12">
                <span class="info-label">字段数量：</span>
                <span class="info-value">{{ fieldList.length }}</span>
              </a-col>
              <a-col :span="24">
                <span class="info-label">整单合格规则：</span>
                <span class="info-value">{{ sheetPassRuleLabel(record.sheetPassRule) }}</span>
              </a-col>
            </a-row>
          </div>

          <div class="section-title">模板字段</div>
          <a-table
            v-if="fieldList.length"
            :columns="fieldColumns"
            :data-source="fieldList"
            row-key="code"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ y: 420 }"
          >
            <template #bodyCell="{ column, record: row, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'type'">
                {{ fieldTypeLabel(row.type) }}
              </template>
              <template v-else-if="column.key === 'required'">
                {{ row.required ? '是' : '否' }}
              </template>
              <template v-else-if="column.key === 'standard'">
                {{ buildStandardText(row) || '—' }}
              </template>
              <template v-else-if="column.key === 'keyForSheetPass'">
                {{ row.keyForSheetPass ? '是' : '—' }}
              </template>
              <template v-else-if="column.key === 'options'">
                {{ formatOptions(row) }}
              </template>
              <template v-else>
                {{ row[column.dataIndex] || '—' }}
              </template>
            </template>
          </a-table>
          <a-empty v-else description="暂无字段" />
        </a-tab-pane>

        <a-tab-pane key="fill" tab="填写预览">
          <QcTemplateFillPreview :fields="fieldList" :sheet-pass-rule="record.sheetPassRule" />
        </a-tab-pane>
      </a-tabs>
    </template>

    <template #footer>
      <a-space>
        <a-button @click="handleClose">关闭</a-button>
        <a-button v-if="record?.isSystem" type="primary" @click="emitCopy">复制</a-button>
      </a-space>
    </template>
  </a-drawer>
</template>

<script>
export default { name: 'QcTemplatePreviewDrawer' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { qcTemplateScopeTypeLabel } from '@/mock/qcTemplates'
import { useDrawerWidth } from '@/composables/useDrawerWidth'
import { buildStandardText } from '@/utils/qcFieldStandard'
import { isQcConclusionField, normalizeConclusionOptionItems } from '@/utils/qcConclusionField'
import { sheetPassRuleLabel, normalizeSheetPassRule } from '@/utils/qcTemplateSheetPass'
import QcTemplateFillPreview from './QcTemplateFillPreview.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
  /** detail | fill */
  initialTab: { type: String, default: 'detail' },
})

const emit = defineEmits(['update:open', 'copy'])

const { drawerBind } = useDrawerWidth('l')
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
    { title: '字段编码', dataIndex: 'code', width: 110, ellipsis: true },
    { title: '字段名称', dataIndex: 'name', width: 110, ellipsis: true },
    { title: '字段类型', key: 'type', width: 80 },
    { title: '必填', key: 'required', width: 56, align: 'center' },
    { title: '单位', dataIndex: 'unit', width: 56 },
    { title: '合格标准', key: 'standard', width: 140, ellipsis: true },
  ]
  if (normalizeSheetPassRule(props.record?.sheetPassRule) === 'keyFields') {
    cols.push({ title: '关键项', key: 'keyForSheetPass', width: 72, align: 'center' })
  }
  cols.push({ title: '选项', key: 'options', ellipsis: true })
  return cols
})

const drawerTitle = computed(() => {
  if (!props.record) return '模板详情'
  const code = props.record.code ? ` ${props.record.code}` : ''
  return props.record.isSystem ? `系统模板详情${code}` : `模板详情${code}`
})

const fieldList = computed(() => {
  const list = props.record?.fields || []
  return [...list]
    .map((f, idx) => ({ ...f, _idx: idx }))
    .sort((a, b) => {
      const sa = a.sortOrder
      const sb = b.sortOrder
      if (sa != null && sb != null && sa !== sb) return sa - sb
      if (sa != null && sb == null) return -1
      if (sa == null && sb != null) return 1
      return a._idx - b._idx
    })
})

watch(
  () => [props.open, props.initialTab],
  ([open, tab]) => {
    if (open) activeTab.value = tab === 'fill' ? 'fill' : 'detail'
  },
)

function fieldTypeLabel(type) {
  return fieldTypeMap[type] || type || '—'
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

function handleClose() {
  emit('update:open', false)
}

function emitCopy() {
  emit('copy', props.record)
}
</script>

<style lang="less" scoped>
.qc-template-preview-drawer {
  :deep(.ant-drawer-body) {
    padding-top: 8px;
  }
}

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
}

.drawer-basic-card {
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
}

.drawer-basic-info {
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
</style>
