<template>
  <div class="purchase-req-basic-section">
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
        <span class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

const props = defineProps({
  record: { type: Object, required: true },
  activeDraft: { type: Object, default: null },
  draftSourceReqNos: { type: String, default: '' },
  defaultWarehouse: { type: String, default: '—' },
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
    { key: 'creator', label: '创建人', value: display(r.creator) },
    { key: 'createdAt', label: '创建时间', value: formatDateTimeMinute(r.createdAt) },
    { key: 'updater', label: '更新人', value: display(r.updater || r.operator) },
    { key: 'updatedAt', label: '更新时间', value: formatDateTimeMinute(r.updatedAt) },
  ]
})

const fields = computed(() => {
  const r = props.record
  const list = [{ key: 'reqNo', label: '申请单号' }]
  if (props.activeDraft) {
    list.push(
      {
        key: 'draftOrderNo',
        label: '关联生成草稿',
        format: () => display(props.activeDraft?.orderNo),
      },
      {
        key: 'draftSourceReqNos',
        label: '草稿来源申请',
        format: () => display(props.draftSourceReqNos || r.reqNo),
        fullRow: true,
      },
    )
  }
  list.push(
    { key: 'urgency', label: '紧急度' },
    { key: 'orderDate', label: '订单日期' },
    { key: 'estimatedArrivalDate', label: '期望到货日期' },
    { key: 'deliveryDate', label: '交货日期' },
    {
      key: 'receivingWarehouse',
      label: '收货仓库',
      format: () => display(r.receivingWarehouse || props.defaultWarehouse),
    },
    { key: 'salesperson', label: '采购员' },
    { key: 'source', label: '来源' },
    { key: 'salesOrderNo', label: '销售单号' },
    { key: 'remark', label: '备注', fullRow: true },
  )
  return list
})
</script>

<script>
export default { name: 'PurchaseRequisitionBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 108px;

.purchase-req-basic-section {
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
