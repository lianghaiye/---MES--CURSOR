<template>
  <div class="return-receipt-section">
    <a-upload
      v-if="editable"
      :before-upload="beforeUpload"
      :show-upload-list="false"
      multiple
      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
    >
      <a-button size="small">
        <UploadOutlined />
        上传回货单
      </a-button>
    </a-upload>
    <div v-if="editable" class="upload-hint">
      支持图片、PDF、Office 文档，单个不超过 50MB。演示环境仅记录文件名。
    </div>
    <div v-if="files.length" class="file-list">
      <div v-for="(file, idx) in files" :key="file.uid || `${file.name}-${idx}`" class="file-item">
        <PaperClipOutlined />
        <span class="file-name" :title="file.name">{{ file.name }}</span>
        <span v-if="file.size" class="file-meta">{{ file.size }}</span>
        <span v-if="file.uploadedAt" class="file-meta">{{ file.uploadedAt }}</span>
        <a-button
          v-if="editable"
          type="text"
          size="small"
          class="remove-btn"
          @click="removeFile(idx)"
        >
          <CloseOutlined />
        </a-button>
      </div>
    </div>
    <a-empty v-else description="暂无回货单" />
  </div>
</template>

<script>
export default { name: 'DeliveryReturnReceiptSection' }
</script>

<script setup>
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { updateDeliveryOrder, canUploadReturnReceipt } from '@/store/deliveryOrderStore'

const props = defineProps({
  order: { type: Object, required: true },
})

const editable = computed(() => canUploadReturnReceipt(props.order))
const files = computed(() => props.order?.returnReceipts || [])

function persist(next) {
  const patch = { returnReceipts: next }
  if (next.length > 0) {
    patch.deliveryStatus = '已收货'
    if (!props.order.receivedAt) patch.receivedAt = dayjs().format('YYYY-MM-DD HH:mm')
  } else if (props.order.deliveryStatus === '已收货') {
    patch.deliveryStatus = '已发货'
    patch.receivedAt = ''
  }
  const res = updateDeliveryOrder(props.order.id, patch)
  if (res?.ok === false) {
    message.warning(res.message || '保存失败')
    return false
  }
  return true
}

function beforeUpload(file) {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    message.warning('文件大小不能超过 50MB')
    return false
  }
  const ok = persist([
    ...files.value,
    {
      uid: `rr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size:
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)}MB`
          : `${Math.max(1, Math.round(file.size / 1024))}KB`,
      uploadedAt: dayjs().format('YYYY-MM-DD HH:mm'),
    },
  ])
  if (ok) message.success('已上传回货单，发货单状态已变为已收货')
  return false
}

function removeFile(index) {
  const next = [...files.value]
  next.splice(index, 1)
  if (persist(next)) message.success('已移除')
}
</script>

<style lang="less" scoped>
.return-receipt-section {
  min-height: 48px;
}

.upload-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.file-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.file-meta {
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.remove-btn {
  color: rgba(0, 0, 0, 0.45);
}
</style>
