<template>
  <div v-if="list.length" class="scene-images-cell">
    <a-image-preview-group>
      <div v-for="(url, idx) in list" :key="`${url}-${idx}`" class="scene-image-item">
        <a-image :src="url" :width="36" :height="36" class="scene-thumb" />
        <a-button
          type="link"
          size="small"
          class="scene-download"
          @click.stop="downloadOne(url, idx)"
        >
          下载
        </a-button>
      </div>
    </a-image-preview-group>
  </div>
  <span v-else class="scene-empty">—</span>
</template>

<script setup>
import { computed } from 'vue'
import { message } from 'ant-design-vue'

const props = defineProps({
  images: { type: Array, default: () => [] },
  filePrefix: { type: String, default: '现场图片' },
})

const list = computed(() =>
  (props.images || []).filter((url) => typeof url === 'string' && url.trim()),
)

async function downloadOne(url, index) {
  const fileName = `${props.filePrefix}-${index + 1}.jpg`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('fetch failed')
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = fileName
    link.click()
    URL.revokeObjectURL(objectUrl)
  } catch {
    const link = document.createElement('a')
    link.href = url
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    link.download = fileName
    link.click()
    message.info('已在新窗口打开图片，可右键保存')
  }
}
</script>

<style lang="less" scoped>
.scene-images-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  align-items: center;
}

.scene-image-item {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.scene-thumb {
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;

  :deep(.ant-image-img) {
    object-fit: cover;
  }
}

.scene-download {
  padding: 0;
  height: 20px;
  font-size: 12px;
  line-height: 20px;
}

.scene-empty {
  color: rgba(0, 0, 0, 0.25);
}
</style>
