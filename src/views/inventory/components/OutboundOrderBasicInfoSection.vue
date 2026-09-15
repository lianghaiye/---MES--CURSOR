<template>
  <div class="outbound-order-basic-section">
    <div class="meta-bar">
      <div v-for="item in metaItems" :key="item.key" class="meta-item">
        <span class="field-label">{{ item.label }}：</span>
        <span class="field-value" :title="item.value">{{ item.value }}</span>
      </div>
    </div>

    <div class="info-grid">
      <div
        v-for="field in visibleFields"
        :key="field.key"
        class="info-item"
        :class="{ 'info-item-full': field.fullRow }"
      >
        <span class="field-label">{{ field.label }}：</span>
        <span v-if="field.slot === 'sourceOrderNo'" class="field-value">
          <slot name="sourceOrderNo" />
        </span>
        <span v-else-if="field.slot === 'salesOrderNo'" class="field-value">
          <slot name="salesOrderNo" />
        </span>
        <span v-else-if="field.slot === 'factoryQc'" class="field-value">
          <slot name="factoryQc" />
        </span>
        <span v-else class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { outboundSourceLabel } from '@/mock/outboundOptions'

const props = defineProps({
  record: { type: Object, required: true },
  isMaterialReqOutbound: { type: Boolean, default: false },
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
    { key: 'status', label: '状态', value: display(r.status) },
    { key: 'creator', label: '创建人', value: display(r.creator) },
    { key: 'createdAt', label: '创建时间', value: display(r.createdAt) },
    { key: 'auditor', label: '操作人', value: display(r.auditor) },
    { key: 'auditDate', label: '操作时间', value: display(r.auditDate) },
    { key: 'completedAt', label: '完成日期', value: display(r.completedAt) },
  ]
})

const fields = computed(() => {
  const r = props.record
  const list = [
    { key: 'docNo', label: '出库单号' },
    { key: 'outboundType', label: '出库类型' },
    {
      key: 'sourceChannel',
      label: '来源',
      format: (row) => outboundSourceLabel(row.sourceChannel),
    },
    { key: 'warehouse', label: '出库仓库' },
    { key: 'requisitionDept', label: '申请部门' },
    { key: 'outboundTime', label: '出库时间' },
    { key: 'sourceOrderNo', label: '源单编号', slot: 'sourceOrderNo' },
    { key: 'salesOrderNo', label: '销售单号', slot: 'salesOrderNo' },
    {
      key: 'factoryQc',
      label: '出厂质检',
      slot: 'factoryQc',
      hideWhenMaterialReq: true,
    },
    { key: 'remark', label: '备注', fullRow: true },
  ]
  if (r.status === '已拒绝' || r.refuseReason) {
    list.splice(list.length - 1, 0, {
      key: 'refuseReason',
      label: '拒绝理由',
      fullRow: true,
      format: (row) => display(row.refuseReason),
    })
  }
  return list
})

const visibleFields = computed(() =>
  fields.value.filter((f) => !(f.hideWhenMaterialReq && props.isMaterialReqOutbound)),
)
</script>

<script>
export default { name: 'OutboundOrderBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 108px;

.outbound-order-basic-section {
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
