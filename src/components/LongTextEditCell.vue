<template>
  <div class="long-text-edit-cell">
    <span class="preview" :title="displayValue">{{ previewText }}</span>
    <a-button type="link" size="small" class="edit-btn" title="编辑" @click.stop="$emit('edit')">
      <EditOutlined />
    </a-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { EditOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  value: { type: String, default: '' },
  maxPreviewLen: { type: Number, default: 28 },
})

defineEmits(['edit'])

const displayValue = computed(() => String(props.value || '').trim())

const previewText = computed(() => {
  const text = displayValue.value
  if (!text) return '—'
  if (text.length <= props.maxPreviewLen) return text
  return `${text.slice(0, props.maxPreviewLen)}…`
})
</script>

<style scoped>
.long-text-edit-cell {
  display: flex;
  align-items: center;
  gap: 2px;
  width: 100%;
  min-width: 0;

  .preview {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: rgba(0, 0, 0, 0.88);
    font-size: 12px;
    line-height: 22px;
  }

  .edit-btn {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    padding: 0;
    color: rgba(0, 0, 0, 0.45);

    &:hover {
      color: #1677ff;
    }
  }
}
</style>
