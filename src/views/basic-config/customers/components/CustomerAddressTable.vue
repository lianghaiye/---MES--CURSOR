<template>
  <div class="address-table">
    <div class="toolbar">
      <a-button type="dashed" size="small" @click="addRow">+ 添加地址</a-button>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1200 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'addressType'">
          <a-select
            v-model:value="record.addressType"
            size="small"
            :options="addressTypeOptions"
            style="width: 100%"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'region'">
          <a-input
            v-model:value="record.province"
            size="small"
            placeholder="省"
            style="width: 30%; margin-right: 4px"
            @change="emitChange"
          />
          <a-input
            v-model:value="record.city"
            size="small"
            placeholder="市"
            style="width: 30%; margin-right: 4px"
            @change="emitChange"
          />
          <a-input
            v-model:value="record.district"
            size="small"
            placeholder="区"
            style="width: 30%"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'detailAddress'">
          <a-input v-model:value="record.detailAddress" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'zipCode'">
          <a-input v-model:value="record.zipCode" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'isDefault'">
          <a-switch v-model:checked="record.isDefault" size="small" @change="onDefaultChange(index)" />
        </template>
        <template v-else-if="column.key === 'consignee'">
          <a-input v-model:value="record.consignee" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'consigneePhone'">
          <a-input v-model:value="record.consigneePhone" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeRow(index)">删除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂无地址，点击上方添加" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { addressTypeOptions } from '@/constants/customerMaster'
import { createEmptyAddress } from '@/utils/customerMaster'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const rows = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const columns = [
  { title: '地址类型', key: 'addressType', width: 120 },
  { title: '省/市/区', key: 'region', width: 220 },
  { title: '详细地址', key: 'detailAddress', width: 200 },
  { title: '邮编', key: 'zipCode', width: 90 },
  { title: '默认', key: 'isDefault', width: 70, align: 'center' },
  { title: '收货人', key: 'consignee', width: 100 },
  { title: '电话', key: 'consigneePhone', width: 120 },
  { title: '操作', key: 'actions', width: 70 },
]

function emitChange() {
  emit('update:modelValue', [...rows.value])
}

function addRow() {
  rows.value = [...rows.value, createEmptyAddress()]
}

function removeRow(index) {
  const next = [...rows.value]
  next.splice(index, 1)
  rows.value = next
}

function onDefaultChange(index) {
  const next = rows.value.map((row, i) => ({
    ...row,
    isDefault: i === index ? row.isDefault : false,
  }))
  rows.value = next
}
</script>

<style scoped>
.toolbar {
  margin-bottom: 8px;
}
.danger-link {
  color: #ff4d4f;
}
</style>
