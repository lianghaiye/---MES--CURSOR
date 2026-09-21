<template>
  <div class="stocktake-order-basic-section">
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
import { stocktakeSourceLabel } from '@/mock/stocktakeOptions'

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
    { key: 'creator', label: '创建人', value: display(r.creator || r.applicant) },
    { key: 'createdAt', label: '创建时间', value: display(r.createdAt) },
    { key: 'approver', label: '审核人', value: display(r.approver) },
    { key: 'approvedAt', label: '审核时间', value: display(r.approvedAt) },
    { key: 'poster', label: '过账人', value: display(r.poster || r.confirmer) },
    { key: 'postedAt', label: '过账时间', value: display(r.postedAt) },
  ]
})

const fields = computed(() => {
  const r = props.record
  const list = [
    { key: 'docNo', label: '盘点单号' },
    { key: 'warehouse', label: '盘点仓库' },
    { key: 'stocktakeType', label: '盘点类型' },
    { key: 'stocktakeDate', label: '盘点日期' },
    {
      key: 'sourceChannel',
      label: '来源',
      format: () => stocktakeSourceLabel(r.sourceChannel),
    },
  ]
  if (r.refuseReason) {
    list.push({ key: 'refuseReason', label: '拒绝理由', fullRow: true })
  }
  list.push({ key: 'remark', label: '备注', fullRow: true })
  return list
})
</script>

<script>
export default { name: 'StocktakeOrderBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 96px;

.stocktake-order-basic-section {
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
