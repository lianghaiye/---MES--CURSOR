<template>
  <div class="license-upload">
    <a-upload
      v-model:file-list="fileList"
      :before-upload="beforeUpload"
      :show-upload-list="false"
      multiple
    >
      <a-button size="small">
        <UploadOutlined />
        上传附件
      </a-button>
    </a-upload>
    <div class="upload-hint">支持图片、PDF 等文件，单个文件不超过 50MB</div>
    <div v-if="files.length" class="file-list">
      <div v-for="(file, idx) in files" :key="`${file.name}-${idx}`" class="file-item">
        <PaperClipOutlined />
        <span class="file-name">{{ file.name }}</span>
        <span v-if="file.size" class="file-size">{{ file.size }}</span>
        <a-button type="text" size="small" class="remove-btn" @click="removeFile(idx)">
          <CloseOutlined />
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const fileList = ref([])

const files = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

watch(
  () => props.modelValue,
  (val) => {
    fileList.value = (val || []).map((item, index) => ({
      uid: `${index}-${item.name}`,
      name: item.name,
      status: 'done',
    }))
  },
  { immediate: true, deep: true },
)

function beforeUpload(file) {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    message.warning('文件大小不能超过 50MB')
    return false
  }
  files.value = [
    ...files.value,
    {
      name: file.name,
      size:
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
          : `${Math.max(1, Math.round(file.size / 1024))}KB`,
    },
  ]
  return false
}

function removeFile(index) {
  const next = [...files.value]
  next.splice(index, 1)
  files.value = next
}
</script>

<style scoped>
.license-upload {
  .upload-hint {
    margin-top: 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }

  .file-list {
    margin-top: 8px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: #fafafa;
    border-radius: 4px;
    margin-bottom: 6px;
  }

  .file-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-size {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  .remove-btn {
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
