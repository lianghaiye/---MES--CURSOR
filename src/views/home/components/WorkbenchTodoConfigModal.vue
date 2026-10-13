<template>
  <a-modal
    :open="open"
    title="配置待办事项"
    ok-text="保存"
    cancel-text="取消"
    width="480px"
    destroy-on-close
    @ok="handleOk"
    @cancel="emit('update:open', false)"
    @update:open="(v) => emit('update:open', v)"
  >
    <div class="hint">勾选要在工作台展示的待办，可用上下箭头调整顺序。至少保留 1 项。</div>
    <ul class="todo-pref-list">
      <li v-for="(row, index) in draftRows" :key="row.key" class="todo-pref-row">
        <a-checkbox v-model:checked="row.visible">{{ row.label }}</a-checkbox>
        <a-space :size="0">
          <a-button type="text" size="small" :disabled="index === 0" @click="move(index, -1)">
            ↑
          </a-button>
          <a-button
            type="text"
            size="small"
            :disabled="index === draftRows.length - 1"
            @click="move(index, 1)"
          >
            ↓
          </a-button>
        </a-space>
      </li>
    </ul>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { WORKBENCH_TODO_ITEMS } from '@/utils/workbenchTodos'
import { listTodoVisibleKeys, saveTodoVisibleKeys } from '@/store/workbenchStore'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'saved'])

const draftRows = ref([])

function buildDraft() {
  const visible = listTodoVisibleKeys()
  const visibleSet = new Set(visible)
  const byKey = new Map(WORKBENCH_TODO_ITEMS.map((item) => [item.key, item]))
  const ordered = []
  visible.forEach((key) => {
    const item = byKey.get(key)
    if (item) ordered.push({ key: item.key, label: item.label, visible: true })
  })
  WORKBENCH_TODO_ITEMS.forEach((item) => {
    if (!visibleSet.has(item.key)) {
      ordered.push({ key: item.key, label: item.label, visible: false })
    }
  })
  draftRows.value = ordered
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) buildDraft()
  },
)

function move(index, delta) {
  const next = index + delta
  if (next < 0 || next >= draftRows.value.length) return
  const list = [...draftRows.value]
  const [row] = list.splice(index, 1)
  list.splice(next, 0, row)
  draftRows.value = list
}

function handleOk() {
  const keys = draftRows.value.filter((r) => r.visible).map((r) => r.key)
  const res = saveTodoVisibleKeys(keys)
  if (!res.ok) {
    message.warning(res.message)
    return Promise.reject()
  }
  message.success(res.message)
  emit('saved')
  emit('update:open', false)
  return Promise.resolve()
}
</script>

<style lang="less" scoped>
.hint {
  margin-bottom: 12px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.todo-pref-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  max-height: 360px;
  overflow: auto;
}

.todo-pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }
}
</style>
