<template>
  <div class="party-legal-section">
    <div class="info-grid">
      <div
        v-for="field in fields"
        :key="field.key"
        class="info-item"
        :class="{ 'info-item-full': field.fullRow }"
      >
        <span class="field-label">{{ field.label }}</span>
        <span class="field-value" :title="field.value">{{ field.value }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  contract: { type: Object, required: true },
})

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

const fields = computed(() => {
  const party = props.contract?.partyLegal || {}
  return [
    { key: 'legalRepresentative', label: '法定代表人', value: display(party.legalRepresentative) },
    {
      key: 'unifiedSocialCreditCode',
      label: '统一社会信用代码',
      value: display(party.unifiedSocialCreditCode),
    },
    { key: 'openingBank', label: '开户银行', value: display(party.openingBank) },
    { key: 'bankAccount', label: '银行账号', value: display(party.bankAccount) },
    { key: 'invoiceName', label: '开票名称', value: display(party.invoiceName) },
    { key: 'invoiceTaxNo', label: '纳税人识别号', value: display(party.invoiceTaxNo) },
    { key: 'address', label: '地址', value: display(party.address), fullRow: true },
  ]
})
</script>

<script>
export default { name: 'SalesContractPartyLegalSection' }
</script>

<style lang="less" scoped>
@label-width: 120px;

.party-legal-section {
  padding: 4px 0;
}

.info-grid {
  display: flex;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: flex-start;
  width: 25%;
  min-width: 220px;
  padding: 6px 10px;
  box-sizing: border-box;

  &.info-item-full {
    width: 100%;
  }
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
  word-break: break-all;
}
</style>
