<template>
  <div class="contact-table">
    <div class="toolbar">
      <a-button type="dashed" size="small" @click="addRow">+ 添加联系人</a-button>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'name'">
          <a-input v-model:value="record.name" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'title'">
          <a-input v-model:value="record.title" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'phone'">
          <a-input v-model:value="record.phone" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'mobile'">
          <a-input v-model:value="record.mobile" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'email'">
          <a-input v-model:value="record.email" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'fax'">
          <a-input v-model:value="record.fax" size="small" @change="emitChange" />
        </template>
        <template v-else-if="column.key === 'isDefault'">
          <a-switch
            v-model:checked="record.isDefault"
            size="small"
            @change="onDefaultChange(index)"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeRow(index)">删除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂无联系人，点击上方添加" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { createEmptyContact } from '@/utils/customerMaster'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const rows = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const columns = [
  { title: '联系人', key: 'name', width: 110 },
  { title: '联系人职务', key: 'title', width: 110 },
  { title: '联系电话', key: 'phone', width: 130 },
  { title: '手机', key: 'mobile', width: 130 },
  { title: '邮箱', key: 'email', width: 160 },
  { title: '传真', key: 'fax', width: 130 },
  { title: '默认', key: 'isDefault', width: 70, align: 'center' },
  { title: '操作', key: 'actions', width: 70 },
]

function emitChange() {
  emit('update:modelValue', [...rows.value])
}

function addRow() {
  rows.value = [...rows.value, createEmptyContact()]
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
