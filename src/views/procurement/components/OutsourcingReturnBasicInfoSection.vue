<template>
  <div class="outsourcing-return-basic-section">
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
        <span v-if="field.slot === 'outsourcingOrderNo'" class="field-value">
          <slot name="outsourcingOrderNo" />
        </span>
        <span v-else class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'

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
    { key: 'creator', label: '创建人', value: display(r.creator) },
    { key: 'createdAt', label: '创建时间', value: formatDateTimeMinute(r.createdAt) },
    { key: 'updater', label: '更新人', value: display(r.updater) },
    { key: 'updatedAt', label: '更新时间', value: formatDateTimeMinute(r.updatedAt) },
  ]
})

const fields = computed(() => [
  { key: 'returnNo', label: '异常处理单号' },
  { key: 'outsourcingOrderNo', label: '外协单号', slot: 'outsourcingOrderNo' },
  { key: 'supplier', label: '供应商' },
  { key: 'purchaser', label: '联系人' },
  { key: 'remark', label: '备注', fullRow: true },
])
</script>

<script>
export default { name: 'OutsourcingReturnBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 108px;

.outsourcing-return-basic-section {
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
