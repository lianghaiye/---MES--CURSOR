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
          <template v-else-if="column.key === 'options'">
            {{ formatOptions(row.options) }}
          </template>
          <template v-else>
            {{ row[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
      <a-empty v-if="!fieldList.length" description="暂无字段" />
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
import { computed } from 'vue'
import { qcTemplateScopeTypeLabel } from '@/mock/qcTemplates'
import { useDrawerWidth } from '@/composables/useDrawerWidth'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'copy'])

const { drawerBind } = useDrawerWidth('l')

const fieldTypeMap = {
  text: '文本框',
  textarea: '文本域',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  radio: '单选',
  checkbox: '多选',
}

const fieldColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '字段编码', dataIndex: 'code', width: 110, ellipsis: true },
  { title: '字段名称', dataIndex: 'name', width: 110, ellipsis: true },
  { title: '字段类型', key: 'type', width: 80 },
  { title: '分类', dataIndex: 'category', width: 80, ellipsis: true },
  { title: '必填', key: 'required', width: 56, align: 'center' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '选项', key: 'options', ellipsis: true },
]

const drawerTitle = computed(() => {
  if (!props.record) return '模板预览'
  return props.record.isSystem ? '系统模板预览' : '模板预览'
})

const fieldList = computed(() => {
  const list = props.record?.fields || []
  // 保持模板字段数组顺序（结论字段已固定末位）；有 sortOrder 时按序号稳定排序
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

function fieldTypeLabel(type) {
  return fieldTypeMap[type] || type || '—'
}

function formatOptions(options) {
  if (!Array.isArray(options) || !options.length) return '—'
  return options.join('、')
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
    padding-top: 12px;
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
