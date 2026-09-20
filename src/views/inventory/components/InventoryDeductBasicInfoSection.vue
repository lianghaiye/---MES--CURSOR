<template>
  <div class="inventory-deduct-basic-section">
    <div class="meta-bar">
      <div v-for="item in metaItems" :key="item.key" class="meta-item">
        <span class="field-label">{{ item.label }}</span>
        <span class="field-value" :title="item.value">
          <span v-if="item.key === 'status'" class="status-tag" :class="statusClass">{{
            item.value
          }}</span>
          <template v-else>{{ item.value }}</template>
        </span>
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
        <span class="field-value" :title="field.value">
          <a
            v-if="field.key === 'docNo' && field.linkable"
            class="doc-link"
            @click.prevent="emit('open-doc')"
          >
            {{ field.value }}
          </a>
          <template v-else>{{ field.value }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { resolveInventoryDeductDocNo } from '@/mock/materialRequisitionRecords'

const props = defineProps({
  record: { type: Object, required: true },
  statusClass: { type: String, default: '' },
})

const emit = defineEmits(['open-doc'])

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

const metaItems = computed(() => {
  const r = props.record
  return [
    { key: 'status', label: '扣减状态', value: display(r.status) },
    { key: 'deductTime', label: '扣减时间', value: display(r.deductTime) },
    {
      key: 'materialRows',
      label: '物料行数',
      value: `${r.materialDone ?? 0}/${r.materialTotal ?? 0}`,
    },
  ]
})

const fields = computed(() => {
  const r = props.record
  const docNo = resolveInventoryDeductDocNo(r)
  const list = [
    {
      key: 'docNo',
      label: '工单/领料单号',
      value: display(docNo),
      linkable: Boolean(docNo),
    },
    { key: 'deductNo', label: '扣减单号', value: display(r.deductNo) },
    { key: 'productName', label: '产品名称', value: display(r.productName) },
    { key: 'productSpec', label: '规格型号', value: display(r.productSpec) },
    { key: 'material', label: '材质', value: display(r.material) },
    { key: 'drawingNo', label: '图号', value: display(r.drawingNo) },
    { key: 'reportQty', label: '报工数量', value: display(r.reportQty) },
    {
      key: 'warehouse',
      label: '仓库',
      value:
        r.warehouseName || r.warehouseCode
          ? `${r.warehouseName || '—'} (${r.warehouseCode || '—'})`
          : '—',
    },
  ]
  if (r.voidReason) {
    list.push({ key: 'voidReason', label: '作废说明', value: display(r.voidReason), fullRow: true })
  }
  if (r.revokeReason) {
    list.push({
      key: 'revokeReason',
      label: '撤销原因',
      value: display(r.revokeReason),
      fullRow: true,
    })
  }
  if (r.revokeRemark) {
    list.push({
      key: 'revokeRemark',
      label: '撤销说明',
      value: display(r.revokeRemark),
      fullRow: true,
    })
  }
  return list
})
</script>

<script>
export default { name: 'InventoryDeductBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 108px;

.inventory-deduct-basic-section {
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

.doc-link {
  color: #1677ff;
  cursor: pointer;
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

.status-tag {
  display: inline-block;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 20px;
  border: 1px solid transparent;

  &.is-success {
    color: #fff;
    background: #52c41a;
  }
  &.is-failed {
    color: #fff;
    background: #ff4d4f;
  }
  &.is-partial {
    color: #fff;
    background: #fa8c16;
  }
  &.is-voided {
    color: #fff;
    background: #8c8c8c;
  }
  &.is-pending {
    color: #d46b08;
    background: #fff7e6;
    border-color: #ffd591;
  }
  &.is-skipped {
    color: rgba(0, 0, 0, 0.65);
    background: #f5f5f5;
    border-color: #d9d9d9;
  }
}

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
