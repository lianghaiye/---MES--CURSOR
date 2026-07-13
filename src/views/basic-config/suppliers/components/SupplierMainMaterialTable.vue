<template>
  <div class="supplier-main-material-table">
    <div class="table-toolbar">
      <a-button type="dashed" size="small" @click="addRow">
        <PlusOutlined />
        添加物料
      </a-button>
    </div>
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>
        <template v-else-if="column.key === 'materialCode'">
          <a-input
            v-model:value="record.materialCode"
            size="small"
            placeholder="物料编码"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'materialName'">
          <a-input
            v-model:value="record.materialName"
            size="small"
            placeholder="物料名称"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'specModel'">
          <a-input
            v-model:value="record.specModel"
            size="small"
            placeholder="规格型号"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'remark'">
          <a-input
            v-model:value="record.remark"
            size="small"
            placeholder="备注"
            @change="emitChange"
          />
        </template>
        <template v-else-if="column.key === 'actions'">
          <a class="danger-link" @click="removeRow(index)">删除</a>
        </template>
      </template>
      <template #emptyText>
        <a-empty :image="false" description="暂无主要供应物料" />
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { createEmptyMainMaterial } from '@/utils/supplierMaster'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const rows = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val),
})

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物料编码', key: 'materialCode', width: 140 },
  { title: '物料名称', key: 'materialName', width: 180 },
  { title: '规格型号', key: 'specModel', width: 160 },
  { title: '备注', key: 'remark', width: 160 },
  { title: '操作', key: 'actions', width: 72 },
]

function emitChange() {
  emit('update:modelValue', [...rows.value])
}

function addRow() {
  rows.value = [...rows.value, createEmptyMainMaterial()]
}

function removeRow(index) {
  const next = [...rows.value]
  next.splice(index, 1)
  rows.value = next
}
</script>

<style scoped>
.table-toolbar {
  margin-bottom: 8px;
}

.danger-link {
  color: #ff4d4f;
}
</style>
