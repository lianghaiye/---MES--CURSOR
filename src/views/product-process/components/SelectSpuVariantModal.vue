<template>
  <a-modal
    :open="open"
    :title="title"
    width="1100px"
    :mask-closable="false"
    destroy-on-close
    class="select-spu-variant-modal"
    @cancel="handleCancel"
  >
    <a-steps :current="step" size="small" style="margin-bottom: 16px">
      <a-step title="选择产品族" />
      <a-step title="选择规格与材质" />
    </a-steps>

    <template v-if="step === 0">
      <div class="step-layout">
        <div class="category-side">
          <a-radio-group v-model:value="categoryTreeMode" size="small" button-style="solid">
            <a-radio-button value="material">物料</a-radio-button>
            <a-radio-button value="product">产品</a-radio-button>
          </a-radio-group>
          <a-input
            v-model:value="categoryKeyword"
            allow-clear
            size="small"
            placeholder="搜索类别"
            style="margin: 8px 0"
          />
          <a-tree
            v-if="displayTree.length"
            :tree-data="displayTree"
            :selected-keys="selectedCategoryKeys"
            block-node
            @select="onSelectCategory"
          />
        </div>
        <div class="spu-side">
          <a-input-search
            v-model:value="spuKeyword"
            placeholder="搜索族名称"
            size="small"
            style="margin-bottom: 8px"
            @search="reloadSpus"
          />
          <a-table
            :columns="spuColumns"
            :data-source="spuRows"
            :pagination="{ pageSize: 8 }"
            row-key="id"
            size="small"
            :custom-row="spuCustomRow"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'variantAxes'">
                {{ (record.variantAxes || []).map((a) => a.label).join(' + ') || '单 SKU' }}
              </template>
              <template v-else-if="column.key === 'skuCount'">
                {{ skuCount(record.id) }}
              </template>
            </template>
          </a-table>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="selectedSpu" class="variant-step">
        <a-descriptions bordered size="small" :column="2" style="margin-bottom: 12px">
          <a-descriptions-item label="产品族">{{ selectedSpu.name }}</a-descriptions-item>
          <a-descriptions-item label="分类">{{ selectedSpu.categoryName }}</a-descriptions-item>
        </a-descriptions>

        <template v-if="!selectedSpu.variantAxes?.length">
          <a-alert type="info" message="该族无变体维度，将直接选择默认 SKU" />
          <a-table
            :columns="skuColumns"
            :data-source="skuRows"
            row-key="id"
            size="small"
            :pagination="false"
            :row-selection="singleSkuSelection"
          />
        </template>

        <template v-else>
          <a-form layout="inline" class="variant-form">
            <a-form-item
              v-for="axis in selectedSpu.variantAxes"
              :key="axis.key"
              :label="axis.label"
              :required="axis.required"
            >
              <a-select
                v-model:value="variantDraft[axis.key]"
                allow-clear
                show-search
                style="width: 160px"
                :options="axisSelectOptions(axis)"
                :placeholder="`请选择${axis.label}`"
              />
            </a-form-item>
            <a-form-item>
              <a-button size="small" @click="filterSkus">筛选</a-button>
            </a-form-item>
          </a-form>

          <a-table
            :columns="skuColumns"
            :data-source="filteredSkuRows"
            row-key="id"
            size="small"
            :pagination="false"
            :row-selection="singleSkuSelection"
          />
        </template>

        <div class="fallback-link">
          <a-button type="link" size="small" @click="openFlatPicker">按编码/名称直搜 SKU</a-button>
        </div>
      </div>
    </template>

    <template #footer>
      <a-button v-if="step === 1" @click="step = 0">上一步</a-button>
      <a-button @click="handleCancel">取消</a-button>
      <a-button v-if="step === 1" type="primary" :disabled="!pickedSku" @click="handleConfirm">
        确定
      </a-button>
    </template>

    <SelectBomMaterialModal
      v-model:open="flatPickerOpen"
      title="直搜 SKU"
      :picker-default-item-type="pickerDefaultItemType"
      :multiple="false"
      @selected="onFlatSelected"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { materialCategoryTree, filterCategoryTree } from '@/mock/materialCategories'
import { productCategoryTree } from '@/mock/productCategories'
import { listSpus, spuState } from '@/store/spuStore'
import { listSkusForSpu, skuToPickerPayload } from '@/utils/spuSkuSave'
import { normalizeVariantValues } from '@/utils/spuVariant'
import { listAxisOptions } from '@/utils/spuLineResolve'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import SelectBomMaterialModal from './SelectBomMaterialModal.vue'

const props = defineProps({
  open: Boolean,
  title: { type: String, default: '选择产品/物料' },
  pickerDefaultItemType: { type: String, default: '产品' },
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'selected', 'confirm'])

const step = ref(0)
const categoryTreeMode = ref('material')
const categoryKeyword = ref('')
const selectedCategoryKeys = ref([])
const spuKeyword = ref('')
const selectedSpu = ref(null)
const variantDraft = reactive({})
const pickedSku = ref(null)
const pickedSkuKeys = ref([])
const flatPickerOpen = ref(false)
const listVersion = ref(0)

const spuColumns = [
  { title: '族名称', dataIndex: 'name', key: 'name' },
  { title: '分类', dataIndex: 'categoryName', key: 'categoryName', width: 90 },
  { title: '变体维度', key: 'variantAxes', width: 140 },
  { title: 'SKU数', key: 'skuCount', width: 72 },
]

const skuColumns = [
  { title: '编码', dataIndex: 'code', key: 'code', width: 110 },
  { title: '名称', dataIndex: 'name', key: 'name', width: 160 },
  { title: '规格', dataIndex: 'specModel', key: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90 },
]

function axisSelectOptions(axis) {
  if (!selectedSpu.value?.id || !axis?.key) return []
  return listAxisOptions(selectedSpu.value.id, axis.key)
}

const displayTree = computed(() => {
  const tree = categoryTreeMode.value === 'product' ? productCategoryTree : materialCategoryTree
  return filterCategoryTree(tree, categoryKeyword.value)
})

const spuRows = computed(() => {
  void listVersion.value
  void spuState.spus
  return listSpus({
    keyword: spuKeyword.value,
    categoryKey: selectedCategoryKeys.value[0],
  })
})

const skuRows = computed(() => {
  if (!selectedSpu.value?.id) return []
  return listSkusForSpu(selectedSpu.value.id)
})

const filteredSkuRows = computed(() => {
  const draft = normalizeVariantValues(variantDraft)
  if (!Object.keys(draft).length) return skuRows.value
  return skuRows.value.filter((sku) => {
    const vv = sku.variantValues || {}
    return Object.keys(draft).every((k) => !draft[k] || String(vv[k]) === String(draft[k]))
  })
})

const singleSkuSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: pickedSkuKeys.value,
  onChange: (keys, rows) => {
    pickedSkuKeys.value = keys
    pickedSku.value = rows[0] || null
  },
}))

function skuCount(spuId) {
  void productInfoState.products
  void materialInfoState.materials
  return listSkusForSpu(spuId).length
}

function spuCustomRow(record) {
  return {
    onClick: () => selectSpu(record),
    style: { cursor: 'pointer' },
  }
}

function selectSpu(record) {
  selectedSpu.value = record
  Object.keys(variantDraft).forEach((k) => delete variantDraft[k])
  ;(record.variantAxes || []).forEach((axis) => {
    variantDraft[axis.key] = ''
  })
  pickedSku.value = null
  pickedSkuKeys.value = []
  if (!record.variantAxes?.length && skuRows.value.length === 1) {
    pickedSku.value = skuRows.value[0]
    pickedSkuKeys.value = [skuRows.value[0].id]
  }
  step.value = 1
}

function onSelectCategory(keys) {
  selectedCategoryKeys.value = keys
  reloadSpus()
}

function reloadSpus() {
  listVersion.value += 1
}

function filterSkus() {
  if (filteredSkuRows.value.length === 1) {
    pickedSku.value = filteredSkuRows.value[0]
    pickedSkuKeys.value = [filteredSkuRows.value[0].id]
  }
}

function resetState() {
  step.value = 0
  selectedSpu.value = null
  pickedSku.value = null
  pickedSkuKeys.value = []
  spuKeyword.value = ''
  selectedCategoryKeys.value = []
}

watch(
  () => props.open,
  (val) => {
    if (val) resetState()
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!pickedSku.value) {
    message.warning('请选择 SKU')
    return
  }
  const itemType =
    pickedSku.value.canSell && !pickedSku.value.canProduce
      ? '产品'
      : pickedSku.value.canSell
        ? '产品'
        : '物料'
  const payload = skuToPickerPayload(pickedSku.value, itemType)
  if (props.multiple) {
    emit('selected', [payload])
  } else {
    emit('confirm', payload)
    emit('selected', [payload])
  }
  emit('update:open', false)
}

function openFlatPicker() {
  flatPickerOpen.value = true
}

function onFlatSelected(rows) {
  if (!rows?.length) return
  if (props.multiple) {
    emit('selected', rows)
  } else {
    emit('confirm', rows[0])
    emit('selected', rows)
  }
  emit('update:open', false)
}
</script>

<style scoped lang="less">
.step-layout {
  display: flex;
  gap: 12px;
  min-height: 360px;
}
.category-side {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
  padding-right: 8px;
}
.spu-side {
  flex: 1;
  min-width: 0;
}
.variant-form {
  margin-bottom: 12px;
}
.fallback-link {
  margin-top: 8px;
}
</style>
