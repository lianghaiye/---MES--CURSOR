<template>
  <a-modal
    :open="open"
    title="添加子项"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <a-input
      v-model:value="keyword"
      allow-clear
      placeholder="搜索物料编码/名称"
      style="margin-bottom: 12px"
    >
      <template #prefix>
        <SearchOutlined />
      </template>
    </a-input>
    <a-table
      :columns="columns"
      :data-source="filteredMaterials"
      row-key="id"
      size="small"
      bordered
      :pagination="{ pageSize: 8, size: 'small' }"
      :scroll="{ y: 320 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-button type="link" size="small" @click="pick(record)">选择</a-button>
        </template>
      </template>
    </a-table>
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { materialInfoState } from '@/store/materialInfoStore'

defineProps({
  open: Boolean,
})
const emit = defineEmits(['update:open', 'selected'])

const keyword = ref('')

const columns = [
  { title: '物料编码', dataIndex: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '物料类型', dataIndex: 'materialType', width: 90 },
  { title: '操作', key: 'action', width: 72 },
]

const filteredMaterials = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return materialInfoState.materials
    .filter((m) => {
      if (!kw) return true
      return m.code.toLowerCase().includes(kw) || m.name.toLowerCase().includes(kw)
    })
    .slice(0, 200)
})

function pick(record) {
  emit('selected', {
    code: record.code,
    name: record.name,
    specModel: record.specModel,
    categoryName: record.categoryName,
    materialType: record.materialType,
    supplyForm: record.supplyForm,
    material: record.material,
    inventoryUnit: record.inventoryUnit,
    unitPrice: record.unitPrice,
  })
  emit('update:open', false)
}
</script>
