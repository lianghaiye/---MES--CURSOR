<template>
  <div class="sales-contract-basic-section">
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
import { CONTRACT_STATUS, CONTRACT_TYPE } from '@/constants/salesContract'

const props = defineProps({
  contract: { type: Object, required: true },
  quota: { type: Object, default: () => ({}) },
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function fieldText(field) {
  if (field.format) return field.format(props.contract)
  return display(props.contract[field.key])
}

const metaItems = computed(() => {
  const c = props.contract
  return [
    { key: 'status', label: '状态', value: display(c.status) },
    { key: 'signStatus', label: '签署', value: display(c.signStatus || '未签署') },
    { key: 'contractType', label: '类型', value: display(c.contractType) },
    { key: 'approvedBy', label: '审核人', value: display(c.approvedBy) },
    { key: 'approvedAt', label: '审核时间', value: display(c.approvedAt) },
    { key: 'createdAt', label: '创建时间', value: display(c.createdAt) },
  ]
})

const fields = computed(() => {
  const c = props.contract
  const q = props.quota || {}
  const isFramework = c.contractType === CONTRACT_TYPE.FRAMEWORK
  const list = [
    { key: 'contractNo', label: '合同编号' },
    { key: 'contractName', label: '合同名称' },
    { key: 'customerName', label: '客户名称' },
    { key: 'salesperson', label: '业务员' },
    { key: 'signer', label: '签署人' },
    {
      key: 'signedAt',
      label: '签署日期',
      format: () => (c.signedAt ? String(c.signedAt).slice(0, 10) : '—'),
    },
    {
      key: 'taxInclusive',
      label: '是否含税',
      format: () => (c.taxInclusive !== false ? '含税' : '不含税'),
    },
    {
      key: 'validRange',
      label: '有效期',
      format: () => `${display(c.validFrom)} ~ ${display(c.validTo)}`,
    },
    { key: 'settlementCycle', label: '结算周期' },
    {
      key: 'paymentTermDays',
      label: '账期天数',
      format: () => (c.paymentTermDays != null ? `${c.paymentTermDays} 天` : '—'),
    },
    {
      key: 'allowExceedQuota',
      label: '超额度',
      format: () =>
        c.allowExceedQuota !== false ? '允许超额度（仅预警）' : '不允许超额度（仅预警）',
    },
    {
      key: 'paymentPlanBase',
      label: '回款计划基数',
      format: () => (c.contractType === '框架合同' ? c.paymentPlanBase || '销售订单金额' : '—'),
    },
    {
      key: 'limitAmount',
      label: '额度金额',
      format: () => (q.limitAmount != null ? String(q.limitAmount) : '—'),
    },
    {
      key: 'executedAmount',
      label: '已执行金额',
      format: () => String(q.executedAmount ?? 0),
    },
    {
      key: 'remainAmount',
      label: '剩余金额',
      format: () => (q.remainAmount != null ? String(q.remainAmount) : '—'),
    },
    {
      key: 'limitQty',
      label: '额度数量',
      format: () => (q.limitQty != null ? String(q.limitQty) : '—'),
    },
    {
      key: 'executedQty',
      label: '已执行数量',
      format: () => String(q.executedQty ?? 0),
    },
    {
      key: 'remainQty',
      label: '剩余数量',
      format: () => (q.remainQty != null ? String(q.remainQty) : '—'),
    },
    { key: 'remark', label: '备注', fullRow: true },
  ]
  if (isFramework) {
    list.splice(11, 0, {
      key: 'defaultDiscountRate',
      label: '默认折扣',
      format: () =>
        c.defaultDiscountRate != null
          ? `${Number((Number(c.defaultDiscountRate) * 100).toFixed(2))}%`
          : '—',
    })
  }
  if (c.status === CONTRACT_STATUS.REJECTED && c.rejectReason) {
    list.push({ key: 'rejectReason', label: '驳回原因', fullRow: true })
  }
  return list
})
</script>

<script>
export default { name: 'SalesContractBasicInfoSection' }
</script>

<style lang="less" scoped>
@label-width: 96px;

.sales-contract-basic-section {
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
