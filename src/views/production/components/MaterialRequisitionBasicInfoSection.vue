<template>
  <div class="detail-basic-info-section">
    <div class="meta-bar">
      <div v-for="item in metaItems" :key="item.key" class="meta-item">
        <span class="field-label">{{ item.label }}</span>
        <span class="field-value" :title="item.value">{{ item.value }}</span>
      </div>
    </div>

    <div class="info-grid">
      <div
        v-for="field in fields"
        :key="field.key"
        class="info-item"
        :class="{ 'info-item-full': field.fullRow }"
      >
        <span class="field-label">{{ field.label }}</span>
        <span class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  MATERIAL_REQ_AUDIT,
  relatedProductText,
  relatedWorkOrderText,
} from '@/store/mobileMaterialReqStore'

const props = defineProps({
  record: { type: Object, required: true },
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function fieldText(field) {
  if (field.format) return field.format(props.record)
  return display(props.record[field.key])
}

const metaItems = computed(() => {
  const r = props.record
  return [
    { key: 'auditStatus', label: '申请状态', value: display(r.auditStatus) },
    { key: 'outboundStatus', label: '出库状态', value: display(r.outboundStatus) },
    { key: 'applicant', label: '申请人', value: display(r.applicant) },
    { key: 'createdAt', label: '申请时间', value: display(r.createdAt) },
  ]
})

const fields = computed(() => {
  const r = props.record
  return [
    { key: 'reqNo', label: '申请单号' },
    { key: 'modeLabel', label: '领料方式' },
    {
      key: 'workOrder',
      label: '关联工单',
      format: () => relatedWorkOrderText(r) || '—',
    },
    {
      key: 'product',
      label: '产品/摘要',
      format: () => relatedProductText(r) || '—',
    },
    {
      key: 'salesOrderNo',
      label: '销售订单',
      format: () => (r.salesOrderNo && r.salesOrderNo !== 'MULTI' ? display(r.salesOrderNo) : '—'),
    },
    { key: 'workshop', label: '领用车间' },
    { key: 'receiveWarehouse', label: '领入仓库' },
    {
      key: 'qtySummary',
      label: '合计数量',
      format: () => `${r.lineCount || 0} 行 / ${r.totalQty || 0}`,
    },
    ...(r.auditStatus === MATERIAL_REQ_AUDIT.REJECTED && r.rejectReason
      ? [{ key: 'rejectReason', label: '驳回原因', fullRow: true }]
      : []),
    ...(r.outboundRefuseReason
      ? [{ key: 'outboundRefuseReason', label: '拒绝出库原因', fullRow: true }]
      : []),
    { key: 'remark', label: '备注', fullRow: true },
  ]
})
</script>

<script>
export default { name: 'MaterialRequisitionBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 96px;

.detail-basic-info-section {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.field-label {
  flex: 0 0 @label-width;
  width: @label-width;
  padding-right: 8px;
  text-align: right;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.info-item-full {
  grid-column: 1 / -1;

  .field-value {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
