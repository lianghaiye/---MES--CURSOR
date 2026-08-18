<template>
  <div class="delivery-order-basic-section">
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
        <template v-if="field.key === 'sourceOrderNo'">
          <a
            v-if="order.salesOrderId"
            class="field-value field-link"
            :title="display(order.sourceOrderNo)"
            @click="emit('go-sales')"
          >
            {{ display(order.sourceOrderNo) }}
          </a>
          <span v-else class="field-value" :title="display(order.sourceOrderNo)">
            {{ display(order.sourceOrderNo) }}
          </span>
        </template>
        <span v-else class="field-value" :title="fieldText(field)">{{ fieldText(field) }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'DeliveryOrderBasicInfoSection' }
</script>

<script setup>
import { computed } from 'vue'
import { formatOutboundQtyInt, formatShipWeight, formatAmountExTax } from '@/utils/deliveryOrder'

const props = defineProps({
  order: { type: Object, required: true },
})

const emit = defineEmits(['go-sales'])

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
    { key: 'deliveryStatus', label: '发货状态', value: display(o.deliveryStatus) },
    { key: 'customerName', label: '客户', value: display(o.customerName) },
    { key: 'salesperson', label: '业务员', value: display(o.salesperson) },
    { key: 'createdAt', label: '创建时间', value: display(o.createdAt) },
  ]
})

const fields = computed(() => {
  const o = props.order
  return [
    { key: 'deliveryCode', label: '发货单号' },
    { key: 'sourceOrderNo', label: '源单号' },
    { key: 'documentDate', label: '单据日期' },
    {
      key: 'applyShipQty',
      label: '申请发货数量',
      format: () => formatOutboundQtyInt(o.applyShipQty),
    },
    {
      key: 'actualOutboundQty',
      label: '实际出库数量',
      format: () => formatOutboundQtyInt(o.actualOutboundQty),
    },
    {
      key: 'shipWeight',
      label: '发货重量',
      format: () => formatShipWeight(o.shipWeight),
    },
    {
      key: 'totalAmountExTax',
      label: '发货总金额（不含税）',
      format: () => `￥${formatAmountExTax(o.totalAmountExTax)}`,
    },
    { key: 'shipmentMethod', label: '交货方式' },
    { key: 'logisticsNo', label: '物流单号' },
    { key: 'outboundWarehouse', label: '出库仓库' },
    { key: 'contactPerson', label: '客户联系人' },
    { key: 'contactPhone', label: '联系方式' },
    { key: 'deliveryAddress', label: '交货地址' },
    { key: 'driverName', label: '司机姓名' },
    { key: 'driverPhone', label: '司机联系方式' },
    { key: 'plateNo', label: '车牌号' },
    { key: 'remark', label: '备注', fullRow: true },
  ]
})
</script>

<style lang="less" scoped>
@label-width: 128px;

.delivery-order-basic-section {
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

.field-link {
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

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
