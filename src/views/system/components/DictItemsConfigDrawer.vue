<template>
  <a-drawer :open="open" :title="title" width="720px" destroy-on-close @close="handleClose">
    <div v-if="headerHint" class="drawer-hint">{{ headerHint }}</div>

    <div class="toolbar-row">
      <a-space>
        <a-button type="primary" size="small" :disabled="readonly" @click="addRow">
          <PlusOutlined />
          新增字典项
        </a-button>
        <slot name="toolbar-extra" />
      </a-space>
    </div>

    <a-table
      :columns="columns"
      :data-source="draftItems"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'label'">
          <a-input
            v-model:value="record.label"
            size="small"
            :disabled="readonly"
            placeholder="显示名称"
            @change="onLabelChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'value'">
          <a-input
            v-model:value="record.value"
            size="small"
            :disabled="readonly"
            placeholder="存储值"
          />
        </template>
        <template v-else-if="column.key === 'status'">
          <a-select
            v-model:value="record.status"
            size="small"
            style="width: 100%"
            :disabled="readonly"
            :options="statusOpts"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space :size="4">
            <a :class="{ disabled: readonly || index === 0 }" @click="moveUp(index)">上移</a>
            <a
              :class="{ disabled: readonly || index >= draftItems.length - 1 }"
              @click="moveDown(index)"
              >下移</a
            >
            <a
              class="danger-link"
              :class="{ disabled: readonly || isPresetLocked(record) }"
              :title="isPresetLocked(record) ? '系统字典预置项不可删除' : ''"
              @click="removeRow(index)"
              >删除</a
            >
          </a-space>
        </template>
      </template>
    </a-table>

    <template #footer>
      <a-space>
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" :disabled="readonly" :loading="saving" @click="handleSave"
          >保存</a-button
        >
      </a-space>
    </template>
  </a-drawer>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { createDictItem, DICT_STATUS } from '@/store/systemDictStore'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '字典配置' },
  headerHint: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  readonly: Boolean,
  /** 为 true 时，系统预置项（preset）不可删除 */
  protectPresetItems: { type: Boolean, default: false },
  /** 用于补齐历史数据：与系统字典值匹配的项视为预置 */
  systemPresetValues: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'save'])

const draftItems = ref([])
const saving = ref(false)

const statusOpts = [
  { label: DICT_STATUS.ENABLED, value: DICT_STATUS.ENABLED },
  { label: DICT_STATUS.DISABLED, value: DICT_STATUS.DISABLED },
]

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '显示名称', key: 'label', width: 160 },
  { title: '字典值', key: 'value', width: 160 },
  { title: '状态', key: 'status', width: 100 },
  { title: '操作', key: 'actions', width: 150 },
]

function isPresetLocked(record) {
  return props.protectPresetItems && Boolean(record?.preset)
}

watch(
  () => [props.open, props.items, props.systemPresetValues],
  ([visible]) => {
    if (!visible) return
    const presetValues = new Set(
      (props.systemPresetValues || []).map((v) => String(v || '').trim()).filter(Boolean),
    )
    draftItems.value = (props.items || []).map((it, idx) => {
      const preset =
        it.preset != null
          ? Boolean(it.preset)
          : props.protectPresetItems && presetValues.has(String(it.value || '').trim())
      return createDictItem({
        ...it,
        sort: typeof it.sort === 'number' ? it.sort : idx,
        preset,
      })
    })
  },
  { immediate: true, deep: true },
)

function onLabelChange(record) {
  if (!record.value) record.value = record.label
}

function addRow() {
  draftItems.value.push(
    createDictItem({
      label: '',
      value: '',
      sort: draftItems.value.length,
      status: DICT_STATUS.ENABLED,
      preset: false,
    }),
  )
}

function removeRow(index) {
  if (props.readonly) return
  const row = draftItems.value[index]
  if (isPresetLocked(row)) {
    message.warning('系统字典预置项不可删除')
    return
  }
  draftItems.value.splice(index, 1)
}

function moveUp(index) {
  if (props.readonly || index <= 0) return
  const list = draftItems.value
  ;[list[index - 1], list[index]] = [list[index], list[index - 1]]
}

function moveDown(index) {
  if (props.readonly || index >= draftItems.value.length - 1) return
  const list = draftItems.value
  ;[list[index], list[index + 1]] = [list[index + 1], list[index]]
}

function handleClose() {
  emit('update:open', false)
}

function handleSave() {
  const normalized = draftItems.value.map((it, idx) =>
    createDictItem({
      ...it,
      label: String(it.label || '').trim(),
      value: String(it.value || it.label || '').trim(),
      sort: idx,
      preset: Boolean(it.preset),
    }),
  )
  if (normalized.some((it) => !it.label || !it.value)) {
    message.warning('请填写完整的显示名称与字典值')
    return
  }
  const values = normalized.map((it) => it.value)
  if (new Set(values).size !== values.length) {
    message.warning('字典值不能重复')
    return
  }
  saving.value = true
  try {
    emit('save', normalized)
    emit('update:open', false)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.drawer-hint {
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.toolbar-row {
  margin-bottom: 12px;
}
.danger-link {
  color: #ff4d4f;
}
.disabled {
  color: rgba(0, 0, 0, 0.25);
  pointer-events: none;
  cursor: not-allowed;
}
</style>
