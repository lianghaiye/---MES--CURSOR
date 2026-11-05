<template>
  <div class="return-receipt-section">
    <a-form v-if="editable || hasLogistics" layout="vertical" class="logistics-form" size="small">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="交货方式">
            <a-select
              v-model:value="form.shipmentMethod"
              :disabled="!editable"
              allow-clear
              placeholder="请选择 交货方式"
              :options="shipmentMethodOpts"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="运费">
            <a-input-number
              v-model:value="form.freightAmount"
              :disabled="!editable"
              :min="0"
              :precision="2"
              :controls="false"
              style="width: 100%"
              placeholder="请输入 运费"
              addon-after="元"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="司机姓名">
            <a-input
              v-model:value="form.driverName"
              :disabled="!editable"
              placeholder="请输入 司机姓名"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="司机联系方式">
            <a-input
              v-model:value="form.driverPhone"
              :disabled="!editable"
              placeholder="请输入 司机联系方式"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="车牌号">
            <a-input
              v-model:value="form.plateNo"
              :disabled="!editable"
              placeholder="请输入 车牌号"
            />
          </a-form-item>
        </a-col>
      </a-row>
      <div v-if="editable" class="logistics-actions">
        <a-button type="primary" size="small" :disabled="!logisticsDirty" @click="saveLogistics">
          保存物流信息
        </a-button>
      </div>
    </a-form>

    <a-divider v-if="editable || hasLogistics" class="section-divider" />

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
      支持图片、PDF、Office 文档，单个不超过
      50MB。演示环境仅记录文件名。上传时会同步保存上方物流信息。
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
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined, PaperClipOutlined, UploadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { shipmentMethodOptions } from '@/mock/salesOrderOptions'
import { updateDeliveryOrder, canUploadReturnReceipt } from '@/store/deliveryOrderStore'
import {
  appendDeliveryOperationLog,
  buildLogisticsChangeRemark,
  pickLogisticsFields,
} from '@/utils/deliveryOrderOperationLog'

const props = defineProps({
  order: { type: Object, required: true },
})

const emit = defineEmits(['saved'])

const editable = computed(() => canUploadReturnReceipt(props.order))
const files = computed(() => props.order?.returnReceipts || [])
const shipmentMethodOpts = shipmentMethodOptions.map((v) => ({ label: v, value: v }))

const form = reactive({
  shipmentMethod: undefined,
  freightAmount: null,
  driverName: '',
  driverPhone: '',
  plateNo: '',
})

function syncFormFromOrder() {
  const next = pickLogisticsFields(props.order || {})
  form.shipmentMethod = next.shipmentMethod || undefined
  form.freightAmount = next.freightAmount
  form.driverName = next.driverName
  form.driverPhone = next.driverPhone
  form.plateNo = next.plateNo
}

const hasLogistics = computed(() => {
  const o = props.order || {}
  return Boolean(
    o.shipmentMethod ||
    o.driverName ||
    o.driverPhone ||
    o.plateNo ||
    (o.freightAmount != null && Number(o.freightAmount) !== 0),
  )
})

const logisticsDirty = computed(() => {
  const current = pickLogisticsFields(form)
  const origin = pickLogisticsFields(props.order || {})
  return (
    (current.shipmentMethod || '') !== (origin.shipmentMethod || '') ||
    Number(current.freightAmount || 0) !== Number(origin.freightAmount || 0) ||
    current.driverName !== origin.driverName ||
    current.driverPhone !== origin.driverPhone ||
    current.plateNo !== origin.plateNo
  )
})

watch(
  () => props.order?.id,
  () => syncFormFromOrder(),
  { immediate: true },
)

watch(
  () => [
    props.order?.shipmentMethod,
    props.order?.freightAmount,
    props.order?.driverName,
    props.order?.driverPhone,
    props.order?.plateNo,
  ],
  () => {
    if (!logisticsDirty.value) syncFormFromOrder()
  },
)

function logisticsPatch() {
  const picked = pickLogisticsFields(form)
  return {
    shipmentMethod: picked.shipmentMethod || '',
    freightAmount: Number(picked.freightAmount) || 0,
    driverName: picked.driverName,
    driverPhone: picked.driverPhone,
    plateNo: picked.plateNo,
  }
}

function applyOperationLogs(order, { uploadedFileName, logisticsChangedRemark } = {}) {
  const operator = order.operator || order.creator || 'admin1'
  if (logisticsChangedRemark) {
    appendDeliveryOperationLog(order, {
      action: '修改物流信息',
      operator,
      remark: logisticsChangedRemark,
    })
  }
  if (uploadedFileName) {
    appendDeliveryOperationLog(order, {
      action: '上传回货单',
      operator,
      remark: uploadedFileName,
    })
  }
}

function persist(patch, { uploadedFileName } = {}) {
  const prevLogistics = pickLogisticsFields(props.order || {})
  const nextLogistics = {
    shipmentMethod: patch.shipmentMethod ?? props.order.shipmentMethod,
    freightAmount: patch.freightAmount ?? props.order.freightAmount,
    driverName: patch.driverName ?? props.order.driverName,
    driverPhone: patch.driverPhone ?? props.order.driverPhone,
    plateNo: patch.plateNo ?? props.order.plateNo,
  }
  const logisticsChangedRemark = buildLogisticsChangeRemark(prevLogistics, nextLogistics)

  const res = updateDeliveryOrder(props.order.id, patch)
  if (res?.ok === false) {
    message.warning(res.message || '保存失败')
    return false
  }

  const order = res?.delivery || props.order
  applyOperationLogs(order, { uploadedFileName, logisticsChangedRemark })
  emit('saved', order)
  return true
}

function saveLogistics() {
  if (!editable.value) return
  if (!logisticsDirty.value) {
    message.info('物流信息未变更')
    return
  }
  if (persist(logisticsPatch())) {
    message.success('物流信息已保存')
    syncFormFromOrder()
  }
}

function beforeUpload(file) {
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    message.warning('文件大小不能超过 50MB')
    return false
  }
  const nextFiles = [
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
  ]
  const patch = {
    ...logisticsPatch(),
    returnReceipts: nextFiles,
    deliveryStatus: '已收货',
  }
  if (!props.order.receivedAt) patch.receivedAt = dayjs().format('YYYY-MM-DD HH:mm')

  const ok = persist(patch, { uploadedFileName: file.name })
  if (ok) {
    message.success('已上传回货单，发货单状态已变为已收货')
    syncFormFromOrder()
  }
  return false
}

function removeFile(index) {
  const next = [...files.value]
  next.splice(index, 1)
  const patch = { returnReceipts: next }
  if (next.length === 0 && props.order.deliveryStatus === '已收货') {
    patch.deliveryStatus = '已发货'
    patch.receivedAt = ''
  }
  if (persist(patch)) message.success('已移除')
}

defineExpose({
  saveLogistics,
  get logisticsDirty() {
    return logisticsDirty.value
  },
  logisticsPatch,
  persist,
})
</script>

<style lang="less" scoped>
.return-receipt-section {
  min-height: 48px;
}

.logistics-form {
  :deep(.ant-form-item) {
    margin-bottom: 10px;
  }
}

.logistics-actions {
  margin-top: 2px;
}

.section-divider {
  margin: 8px 0 12px;
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
