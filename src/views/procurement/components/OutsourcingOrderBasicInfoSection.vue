<template>
  <div class="outsourcing-order-basic-section">
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
        <span v-if="field.slot === 'salesOrderNo'" class="field-value">
          <slot name="salesOrderNo" />
        </span>
        <span v-else class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeMinute, resolveApprovalTime } from '@/utils/dateTimeDisplay'
import { normalizeProcurementDocSource } from '@/constants/procurementDocSource'

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
    { key: 'creator', label: '创建人', value: display(o.creator) },
    { key: 'createdAt', label: '创建时间', value: formatDateTimeMinute(o.createdAt) },
    { key: 'approverName', label: '审核人', value: display(o.approverName) },
    { key: 'approvedAt', label: '审批时间', value: resolveApprovalTime(o) },
  ]
})

const fields = computed(() => [
  { key: 'orderNo', label: '外协单号' },
  { key: 'workOrderName', label: '工单名称' },
  { key: 'salesOrderNo', label: '销售单号', slot: 'salesOrderNo' },
  {
    key: 'source',
    label: '来源',
    format: (o) => normalizeProcurementDocSource(o.source),
  },
  {
    key: 'sourceOrderNo',
    label: '来源单号',
    format: (o) => display(o.sourceOrderNo || o.sourceWorkOrderNo),
  },
  { key: 'supplier', label: '供应商' },
  {
    key: 'planDate',
    label: '计划日期',
    format: (o) => {
      const start = String(o.planStartDate || '').trim()
      const end = String(o.planEndDate || o.planDate || '').trim()
      if (start && end) return start === end ? start : `${start} ~ ${end}`
      return end || start || '—'
    },
  },
  { key: 'contactPerson', label: '联系人' },
  { key: 'contactPhone', label: '联系电话' },
  {
    key: 'leadTimeDays',
    label: '供货期/天',
    format: (o) => (o.leadTimeDays != null && o.leadTimeDays !== '' ? String(o.leadTimeDays) : '—'),
  },
  { key: 'settlementType', label: '结算类型' },
  { key: 'settlementCycle', label: '结算周期' },
  { key: 'settlementMethod', label: '结算方式' },
  { key: 'shipWarehouse', label: '预入仓库' },
  { key: 'updater', label: '更新人' },
  {
    key: 'updatedAt',
    label: '更新时间',
    format: (o) => formatDateTimeMinute(o.updatedAt),
  },
  { key: 'remark', label: '备注', fullRow: true },
])
</script>

<script>
export default { name: 'OutsourcingOrderBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 108px;

.outsourcing-order-basic-section {
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
