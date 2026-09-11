<template>
  <div class="scope-apply-fields">
    <div class="form-row form-row-last">
      <label class="form-label required">适用范围</label>
      <a-radio-group
        :value="scopeType"
        class="scope-radio"
        :disabled="readonly"
        @update:value="onScopeTypeChange"
      >
        <a-radio v-for="opt in scopeTypeOpts" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </a-radio>
      </a-radio-group>
    </div>

    <div v-if="scopeType === SCOPE.CATEGORY" class="form-row form-row-last">
      <label class="form-label required">适用对象</label>
      <a-tree-select
        :value="categoryObjectKeys"
        tree-checkable
        allow-clear
        show-search
        tree-node-filter-prop="title"
        placeholder="请选择产品类别 / 物料类别"
        style="flex: 1; min-width: 0"
        :disabled="readonly"
        :tree-data="categoryTreeData"
        :show-checked-strategy="SHOW_CHILD"
        :max-tag-count="4"
        @update:value="categoryObjectKeys = $event"
      />
    </div>

    <div v-else-if="scopeType === SCOPE.SINGLE" class="form-row form-row-last objects-item-row">
      <label class="form-label required">适用对象</label>
      <div class="item-objects-wrap">
        <a-select
          :value="itemObjectCodes"
          mode="multiple"
          show-search
          allow-clear
          placeholder="输入编码/名称搜索"
          style="flex: 1; min-width: 0"
          :disabled="readonly"
          :filter-option="false"
          :options="itemSearchOptions"
          @search="onItemSearch"
          @update:value="itemObjectCodes = $event"
        />
        <a-button v-if="!readonly" type="link" @click="itemPickerOpen = true">查看更多</a-button>
      </div>
    </div>

    <SelectBomMaterialModal
      v-if="!readonly"
      v-model:open="itemPickerOpen"
      title="选择产品"
      :multiple="true"
      hide-add-material
      :include-spu-templates="true"
      :spu-can-sell-only="false"
      :initial-selected-ids="itemPickerInitialIds"
      @selected="onItemsPicked"
    />
  </div>
</template>

<script>
export default { name: 'ScopeApplyFields' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { TreeSelect } from 'ant-design-vue'
import { QC_TEMPLATE_SCOPE_TYPE, qcTemplateScopeTypeOptions } from '@/mock/qcTemplates'
import { productCategoryState } from '@/store/productCategoryStore'
import { materialCategoryState } from '@/store/materialCategoryStore'
import { buildBomSubItemPickerRows, filterBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const SHOW_CHILD = TreeSelect.SHOW_CHILD
const SCOPE = QC_TEMPLATE_SCOPE_TYPE

const props = defineProps({
  scopeType: { type: String, default: QC_TEMPLATE_SCOPE_TYPE.GLOBAL },
  objects: { type: Array, default: () => [] },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['update:scopeType', 'update:objects'])

const scopeTypeOpts = qcTemplateScopeTypeOptions
const itemPickerOpen = ref(false)
const itemSearchKeyword = ref('')

function mapCategoryTree(nodes, type) {
  return (nodes || []).map((n) => ({
    title: n.title,
    value: `${type}:${n.key}`,
    key: `${type}:${n.key}`,
    code: n.code,
    rawKey: n.key,
    objectType: type,
    children: n.children?.length ? mapCategoryTree(n.children, type) : undefined,
  }))
}

const categoryTreeData = computed(() => [
  {
    title: '产品类别',
    value: '__group_product__',
    key: '__group_product__',
    selectable: false,
    disableCheckbox: true,
    children: mapCategoryTree(productCategoryState.tree, 'productCategory'),
  },
  {
    title: '物料类别',
    value: '__group_material__',
    key: '__group_material__',
    selectable: false,
    disableCheckbox: true,
    children: mapCategoryTree(materialCategoryState.tree, 'materialCategory'),
  },
])

function setObjects(list) {
  emit('update:objects', list)
}

function onScopeTypeChange(val) {
  emit('update:scopeType', val)
  if (val === SCOPE.GLOBAL) setObjects([])
}

const categoryObjectKeys = computed({
  get() {
    return (props.objects || [])
      .filter((o) => o.type === 'productCategory' || o.type === 'materialCategory')
      .map((o) => `${o.type}:${o.value}`)
  },
  set(keys) {
    const list = Array.isArray(keys) ? keys : []
    const flat = []
    const walk = (nodes) => {
      nodes.forEach((n) => {
        if (n.objectType && n.rawKey) flat.push(n)
        if (n.children) walk(n.children)
      })
    }
    walk(categoryTreeData.value)
    setObjects(
      list
        .map((k) => flat.find((n) => n.value === k))
        .filter(Boolean)
        .map((n) => ({
          type: n.objectType,
          value: n.rawKey,
          code: n.code || '',
          label: n.title,
        })),
    )
  },
})

const allItemRows = computed(() =>
  buildBomSubItemPickerRows({
    skipSubItemCount: true,
    includeSpuTemplates: true,
    spuCanSellOnly: false,
  }),
)

const itemObjectCodes = computed({
  get() {
    return (props.objects || []).filter((o) => o.type === 'item').map((o) => o.value)
  },
  set(codes) {
    const selected = Array.isArray(codes) ? codes : []
    const prevMap = new Map(
      (props.objects || []).filter((o) => o.type === 'item').map((o) => [o.value, o]),
    )
    setObjects(
      selected.map((code) => {
        if (prevMap.has(code)) return prevMap.get(code)
        const row = allItemRows.value.find((r) => r.code === code)
        return {
          type: 'item',
          value: code,
          label: row?.name || code,
          specModel: row?.specModel || '',
          itemId: row?.id || '',
          categoryKey: row?.categoryKey || '',
          categoryName: row?.categoryName || '',
        }
      }),
    )
  },
})

const itemSearchOptions = computed(() => {
  const kw = itemSearchKeyword.value.trim()
  const filtered = filterBomSubItemPickerRows(allItemRows.value, kw)
  const sliced = kw ? filtered.slice(0, 50) : filtered.slice(0, 8)
  const options = sliced.map((row) => ({
    label: `[${row.code}] ${row.name}`,
    value: row.code,
  }))
  ;(props.objects || [])
    .filter((o) => o.type === 'item')
    .forEach((o) => {
      if (!options.some((opt) => opt.value === o.value)) {
        options.unshift({
          label: o.specModel ? `[${o.value}] ${o.label} ${o.specModel}` : `[${o.value}] ${o.label}`,
          value: o.value,
        })
      }
    })
  return options
})

const itemPickerInitialIds = computed(() =>
  (props.objects || []).filter((o) => o.type === 'item' && o.itemId).map((o) => String(o.itemId)),
)

function onItemSearch(kw) {
  itemSearchKeyword.value = kw || ''
}

function onItemsPicked(payload) {
  const rows = Array.isArray(payload) ? payload : []
  const map = new Map(
    (props.objects || []).filter((o) => o.type === 'item').map((o) => [o.value, o]),
  )
  rows.forEach((row) => {
    const code = row.code || row.materialCode || ''
    if (!code) return
    map.set(code, {
      type: 'item',
      value: code,
      label: row.name || row.itemName || code,
      specModel: row.specModel || '',
      itemId: row.id || '',
      categoryKey: row.categoryKey || '',
      categoryName: row.categoryName || '',
    })
  })
  setObjects([...map.values()])
}
</script>

<style lang="less" scoped>
.form-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.form-row-last {
  margin-bottom: 0;
}

.form-label {
  flex: 0 0 88px;
  width: 88px;
  padding-top: 5px;
  text-align: right;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  padding-right: 8px;
}

.form-label.required::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4px;
}

.form-row > .scope-radio {
  flex: 1;
  min-width: 0;
}

.scope-radio {
  padding-top: 5px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 4px;
}

.item-objects-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.objects-item-row {
  align-items: center;
}
</style>
