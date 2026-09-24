<template>
  <div class="rich-editor" :class="{ disabled }">
    <Toolbar
      v-if="editorRef"
      class="rich-toolbar"
      :editor="editorRef"
      :default-config="toolbarConfig"
      :mode="mode"
    />
    <Editor
      class="rich-body"
      :style="{ height }"
      :default-config="editorConfig"
      :mode="mode"
      :model-value="modelValue"
      @update:model-value="onChange"
      @on-created="onCreated"
    />
  </div>
</template>

<script setup>
import { onBeforeUnmount, shallowRef } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

const props = defineProps({
  modelValue: { type: String, default: '' },
  height: { type: String, default: '280px' },
  placeholder: { type: String, default: '请输入正文…' },
  disabled: { type: Boolean, default: false },
  mode: { type: String, default: 'default' },
})

const emit = defineEmits(['update:modelValue'])

const editorRef = shallowRef(null)

const toolbarConfig = {
  excludeKeys: ['uploadImage', 'uploadVideo', 'insertVideo', 'fullScreen', 'group-video'],
}

const editorConfig = {
  placeholder: props.placeholder,
}

function onCreated(editor) {
  editorRef.value = editor
}

function onChange(html) {
  emit('update:modelValue', html)
}

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
  editorRef.value = null
})
</script>

<script>
export default { name: 'WorkbenchRichTextEditor' }
</script>

<style lang="less" scoped>
.rich-editor {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  &.disabled {
    opacity: 0.65;
    pointer-events: none;
  }
}

.rich-toolbar {
  border-bottom: 1px solid #f0f0f0;
}

.rich-body {
  overflow-y: hidden;

  :deep(.w-e-text-container) {
    background: #fff;
  }
}
</style>
