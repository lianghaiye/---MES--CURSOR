<template>
  <div class="sales-order-basic-section">
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
    { key: 'progressStatus', label: '订单状态', value: display(o.progressStatus) },
    { key: 'deliveryStatus', label: '发货状态', value: display(o.deliveryStatus) },
    { key: 'creator', label: '创建人', value: display(o.creator) },
    { key: 'createdAt', label: '创建时间', value: display(o.createdAt) },
    { key: 'approver', label: '审批人', value: display(o.approver) },
    { key: 'approvedAt', label: '审批时间', value: display(o.approvedAt) },
  ]
})

const fields = computed(() => {
  const o = props.order
  return [
    { key: 'orderNo', label: '销售单号' },
    { key: 'urgency', label: '紧急度' },
    { key: 'contractType', label: '合同类型' },
    { key: 'contractNo', label: '合同编号' },
    { key: 'settlementCurrency', label: '结算币种' },
    { key: 'orderType', label: '订单类型' },
    { key: 'customerName', label: '客户名称' },
    { key: 'contactPerson', label: '联系人' },
    { key: 'contactPhone', label: '联系人电话' },
    { key: 'deliveryAddress', label: '交货地址' },
    { key: 'deliveryMethod', label: '送货方式' },
    {
      key: 'orderAmount',
      label: '订单金额',
      format: () => `￥${Number(o.orderAmount ?? o.amountInTax ?? 0).toFixed(2)}`,
    },
    { key: 'techSpecCode', label: '技术规范编码' },
    { key: 'reminderDate', label: '提醒日期' },
    { key: 'salesperson', label: '业务员' },
    { key: 'settlementType', label: '结算类型' },
    { key: 'paymentRatio', label: '付款比例' },
    {
      key: 'downPaymentAmount',
      label: '首付/定金金额',
      format: () =>
        o.downPaymentAmount != null && o.downPaymentAmount !== ''
          ? `￥${Number(o.downPaymentAmount).toFixed(2)}`
          : '—',
    },
    { key: 'remark', label: '备注', fullRow: true },
  ]
})
</script>

<script>
export default { name: 'SalesOrderBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 96px;

.sales-order-basic-section {
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
