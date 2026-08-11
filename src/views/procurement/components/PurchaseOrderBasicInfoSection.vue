<template>
  <div class="purchase-order-basic-section">
    <div class="meta-bar">
      <div v-for="item in metaItems" :key="item.key" class="meta-item">
        <span class="field-label">{{ item.label }}：</span>
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
        <span class="field-label">{{ field.label }}：</span>
        <span v-if="field.slot === 'reqNo'" class="field-value">
          <slot name="reqNo" />
        </span>
        <span v-else-if="field.slot === 'salesOrderNo'" class="field-value">
          <slot name="salesOrderNo" />
        </span>
        <span v-else-if="field.slot === 'workOrderNo'" class="field-value">
          <slot name="workOrderNo" />
        </span>
        <span v-else class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeMinute, resolveApprovalTime } from '@/utils/dateTimeDisplay'

const props = defineProps({
  order: { type: Object, required: true },
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function fieldText(field) {
  if (field.format) return field.format(props.order)
  return display(props.order[field.key])
}

const metaItems = computed(() => {
  const o = props.order
  return [
    { key: 'approverName', label: '审批人', value: display(o.approverName) },
    { key: 'approvedAt', label: '审批时间', value: resolveApprovalTime(o) },
    { key: 'creator', label: '创建人', value: display(o.creator) },
    { key: 'createdAt', label: '创建时间', value: formatDateTimeMinute(o.createdAt) },
    { key: 'updater', label: '更新人', value: display(o.updater) },
    { key: 'updatedAt', label: '更新时间', value: formatDateTimeMinute(o.updatedAt) },
  ]
})

const fields = computed(() => [
  { key: 'orderNo', label: '采购单号' },
  { key: 'supplier', label: '供应商' },
  { key: 'reqNo', label: '采购申请单号', slot: 'reqNo' },
  { key: 'salesOrderNo', label: '销售单号', slot: 'salesOrderNo' },
  { key: 'workOrderNo', label: '生产工单号', slot: 'workOrderNo' },
  { key: 'contractNo', label: '合同编号' },
  { key: 'orderSource', label: '订单来源' },
  { key: 'applyType', label: '采购类型' },
  { key: 'settlementType', label: '结算类型' },
  { key: 'settlementCycle', label: '结算周期' },
  { key: 'settlementMethod', label: '结算方式' },
  { key: 'deliveryMethod', label: '交货方式' },
  {
    key: 'leadTimeDays',
    label: '供货期/天',
    format: (o) => (o.leadTimeDays != null && o.leadTimeDays !== '' ? String(o.leadTimeDays) : '—'),
  },
  { key: 'deliveryDate', label: '交货日期' },
  { key: 'receivingWarehouse', label: '收货仓库' },
  { key: 'shippingAddress', label: '交货地址' },
  { key: 'contactPerson', label: '联系人' },
  { key: 'contactPhone', label: '联系方式' },
  { key: 'purchaser', label: '采购员' },
  { key: 'documentDate', label: '创建日期' },
  { key: 'remark', label: '备注', fullRow: true },
])
</script>

<script>
export default { name: 'PurchaseOrderBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 108px;

.purchase-order-basic-section {
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
