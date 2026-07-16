<template>
  <a-modal
    :open="open"
    :title="title"
    width="800px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
    @ok="handleOk"
  >
    <a-input-search
      v-model:value="keyword"
      placeholder="搜索模板名称/编码"
      size="small"
      style="margin-bottom: 12px"
      @search="reload"
    />
    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      :pagination="{ pageSize: 8 }"
      :row-selection="rowSelection"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'axes'">
          {{ (record.variantAxes || []).map((a) => a.label).join(' + ') || '—' }}
        </template>
      </template>
    </a-table>
    <div v-if="showFlatSkuSearch" style="margin-top: 8px">
      <a-button type="link" size="small" @click="openFlatSkuSearch">按 SKU 编码直搜</a-button>
    </div>
    <SelectBomMaterialModal
      v-if="showFlatSkuSearch"
      v-model:open="flatOpen"
      title="按编码直搜 SKU"
      :multiple="multiple"
      @selected="onFlatSelected"
    />
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { listSpus, spuState } from '@/store/spuStore'
import SelectBomMaterialModal from './SelectBomMaterialModal.vue'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '选择产品模板' },
  multiple: { type: Boolean, default: true },
  canSellOnly: { type: Boolean, default: true },
  /** 是否仅展示配置了变体轴的产品族 */
  requireVariantAxes: { type: Boolean, default: true },
  /** 是否允许「按 SKU 编码直搜」 */
  showFlatSkuSearch: { type: Boolean, default: true },
})

const emit = defineEmits(['update:open', 'selected', 'confirm'])

const keyword = ref('')
const selectedKeys = ref([])
const selectedRows = ref([])
const flatOpen = ref(false)
const listVersion = ref(0)

const columns = [
  { title: '模板编码', dataIndex: 'code', width: 110 },
  { title: '名称', dataIndex: 'name', width: 140 },
  { title: '分类', dataIndex: 'categoryName', width: 100 },
  { title: '变体维度', key: 'axes', width: 140 },
]

const rows = computed(() => {
  void listVersion.value
  void spuState.spus
  let list = listSpus({ keyword: keyword.value })
  if (props.canSellOnly) list = list.filter((s) => s.canSell)
  if (props.requireVariantAxes) {
    list = list.filter((s) => (s.variantAxes || []).length > 0)
  }
  return list
})

const rowSelection = computed(() => ({
  type: props.multiple ? 'checkbox' : 'radio',
  selectedRowKeys: selectedKeys.value,
  onChange: (keys, rows) => {
    selectedKeys.value = keys
    selectedRows.value = rows
  },
}))

watch(
  () => props.open,
  (val) => {
    if (val) {
      keyword.value = ''
      selectedKeys.value = []
      selectedRows.value = []
      reload()
    }
  },
)

function reload() {
  listVersion.value += 1
}

function handleOk() {
  if (!selectedRows.value.length) {
    message.warning('请选择产品模板')
    return
  }
  const payloads = selectedRows.value.map((spu) => ({
    spuId: spu.id,
    spuName: spu.name,
    name: spu.name,
    code: spu.code,
    variantAxes: spu.variantAxes,
    itemType: spu.canSell ? '产品' : '物料',
    isSpuLine: true,
  }))
  if (props.multiple) {
    emit('selected', payloads)
  } else {
    emit('confirm', payloads[0])
    emit('selected', payloads)
  }
  emit('update:open', false)
}

function openFlatSkuSearch() {
  flatOpen.value = true
}

function onFlatSelected(items) {
  emit('selected', items)
  emit('update:open', false)
}
</script>
