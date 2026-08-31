<template>
  <div class="bom-basic-info-section">
    <div class="info-grid">
      <div v-for="field in fields" :key="field.key" class="info-item">
        <span class="field-label">{{ field.label }}</span>
        <span class="field-value" :title="fieldText(field)">
          <a-tag v-if="field.tag" :color="field.tag">{{ fieldText(field) }}</a-tag>
          <template v-else>{{ fieldText(field) }}</template>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isShipBomType } from '@/mock/bomMaterialColumns'
import { bomStatusColor } from '@/mock/productBomOptions'
import { productInfoState } from '@/store/productInfoStore'

const props = defineProps({
  bom: { type: Object, required: true },
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function formatDate(val) {
  if (!val) return '—'
  return String(val).split(' ')[0]
}

function formatEffectiveRange(bom) {
  const start = formatDate(bom.effectiveAt)
  const end = formatDate(bom.expiredAt)
  if (start === '—' && end === '—') return '—'
  return `${start} ~ ${end}`
}

function applicableProductsLabel(bom) {
  const ids = bom.applicableProductIds || []
  if (!ids.length) return '未指定'
  const products = productInfoState.products || []
  const labels = ids.map((id) => {
    const p = products.find((x) => String(x.id) === String(id))
    return p ? [p.code, p.name].filter(Boolean).join(' ') : String(id)
  })
  return labels.join('、')
}

function fieldText(field) {
  if (field.format) return field.format(props.bom)
  return display(props.bom[field.key])
}

const fields = computed(() => {
  const bom = props.bom
  const isShip = isShipBomType(bom.bomType)
  const list = [
    { key: 'bomNo', label: 'BOM编码' },
    { key: 'bomName', label: 'BOM名称' },
    {
      key: 'bomType',
      label: 'BOM类型',
      format: (row) => (row.bomType === '基础BOM' ? '基准BOM' : row.bomType || '产品BOM'),
    },
    { key: 'version', label: 'BOM版本' },
    {
      key: 'status',
      label: 'BOM状态',
      tag: bomStatusColor(bom.status),
      format: (row) => row.status || '—',
    },
    {
      key: 'effectiveRange',
      label: '生效/失效日期',
      format: formatEffectiveRange,
    },
  ]
  if (isShip) {
    list.push({
      key: 'applicableProducts',
      label: '适用产品',
      format: applicableProductsLabel,
    })
  }
  return list
})
</script>

<script>
export default { name: 'BomBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 96px;

.bom-basic-info-section {
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

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
