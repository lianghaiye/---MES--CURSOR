<template>
  <div class="customer-price-list">
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 720 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'productCode'">
          <a-input
            v-model:value="record.productCode"
            size="small"
            placeholder="产品编码"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'agreementDiscountPercent'">
          <a-input-number
            v-model:value="record.agreementDiscountPercent"
            size="small"
            :min="1"
            :max="100"
            :precision="2"
            style="width: 100%"
            placeholder="如 95"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'agreementUnitPriceExTax'">
          <a-input-number
            v-model:value="record.agreementUnitPriceExTax"
            size="small"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="不含税单价"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeRow(index)">删除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂无协议价，点击下方添加" />
      </template>
    </a-table>
    <a-button type="dashed" block class="add-btn" size="small" @click="addRow">+ 添加协议价</a-button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const rows = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const columns = [
  { title: '产品编码', key: 'productCode', width: 180 },
  { title: '协议折扣(%)', key: 'agreementDiscountPercent', width: 130 },
  { title: '协议单价(不含税)', key: 'agreementUnitPriceExTax', width: 150 },
  { title: '操作', key: 'actions', width: 70 },
]

function emitChange() {
  emit('update:modelValue', [...rows.value])
}

function addRow() {
  rows.value = [
    ...rows.value,
    {
      id: `cpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productCode: '',
      productId: '',
      agreementDiscountPercent: null,
      agreementUnitPriceExTax: null,
    },
  ]
}

function removeRow(index) {
  const next = [...rows.value]
  next.splice(index, 1)
  rows.value = next
}
</script>

<style scoped>
.add-btn {
  margin-top: 8px;
}
.danger-link {
  color: #ff4d4f;
}
</style>
