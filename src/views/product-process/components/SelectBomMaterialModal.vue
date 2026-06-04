<template>
  <a-modal
    :open="open"
    title="添加子项"
    width="780px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <div class="picker-hint">数据来源：物料信息（不含仅存在于产品信息中的成品）</div>
    <a-input
      v-model:value="keyword"
      allow-clear
      placeholder="搜索物料编码 / 名称 / 规格型号"
      style="margin-bottom: 12px"
    >
      <template #prefix>
        <SearchOutlined />
      </template>
    </a-input>
    <a-table
      :columns="columns"
      :data-source="pagedRows"
      row-key="id"
      size="small"
      bordered
      :loading="loading"
      :pagination="pagination"
      :scroll="{ y: 360 }"
      @change="onTableChange"
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
import { computed, ref, watch } from 'vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { filterBomPickableMaterials } from '@/utils/bomMaterialPicker'

defineProps({
  open: Boolean,
})
const emit = defineEmits(['update:open', 'selected'])

const keyword = ref('')
const loading = ref(false)
const page = ref(1)
const pageSize = ref(8)

const columns = [
  { title: '物料编码', dataIndex: 'code', width: 120 },
  { title: '名称', dataIndex: 'name', width: 180, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110 },
  { title: '物料类型', dataIndex: 'materialType', width: 88 },
  { title: '供应型态', dataIndex: 'supplyForm', width: 88 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const filteredMaterials = computed(() => filterBomPickableMaterials(null, keyword.value))

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredMaterials.value.length,
  showSizeChanger: true,
  pageSizeOptions: ['8', '15', '30', '50'],
  showTotal: (total) => `共 ${total} 条（物料信息）`,
  size: 'small',
}))

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredMaterials.value.slice(start, start + pageSize.value)
})

watch(keyword, () => {
  page.value = 1
})

watch(
  () => keyword.value,
  () => {
    loading.value = true
    requestAnimationFrame(() => {
      loading.value = false
    })
  },
)

function onTableChange(pag) {
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function pick(record) {
  emit('selected', {
    id: record.id,
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
  keyword.value = ''
  page.value = 1
  emit('update:open', false)
}
</script>

<style scoped>
.picker-hint {
  margin-bottom: 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
