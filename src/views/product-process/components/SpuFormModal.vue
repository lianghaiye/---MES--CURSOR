<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑产品族' : '新建产品族'"
    width="720px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form :label-col="{ span: 6 }" :wrapper-col="{ span: 16 }">
      <a-form-item label="族名称" required>
        <a-input v-model:value="form.name" placeholder="如：叶轮" />
      </a-form-item>
      <a-form-item label="族编码">
        <a-input v-model:value="form.code" placeholder="自动生成" />
      </a-form-item>
      <a-form-item label="分类树">
        <a-radio-group v-model:value="form.categoryTreeMode" size="small">
          <a-radio-button value="material">物料类别</a-radio-button>
          <a-radio-button value="product">产品类别</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="所属分类" required>
        <a-select
          v-model:value="form.categoryKey"
          show-search
          :options="categoryOpts"
          placeholder="请选择分类"
          @change="onCategoryChange"
        />
      </a-form-item>
      <a-form-item label="BOM 策略">
        <a-select v-model:value="form.bomStrategy" :options="bomStrategyOpts" />
        <div class="bom-help">{{ bomStrategyHelp }}</div>
      </a-form-item>
      <a-form-item v-if="form.bomStrategy !== 'independent'" label="族模板 BOM ID">
        <a-input v-model:value="form.baseBomId" placeholder="如 bom-spu-impeller-template" />
      </a-form-item>
      <a-form-item label="变体维度">
        <div v-for="(axis, idx) in form.variantAxes" :key="idx" class="axis-row">
          <a-input v-model:value="axis.label" placeholder="显示名" style="width: 100px" />
          <a-input v-model:value="axis.key" placeholder="字段 key" style="width: 110px" />
          <a-select v-model:value="axis.source" :options="axisSourceOpts" style="width: 120px" />
          <a-checkbox v-model:checked="axis.required">必填</a-checkbox>
          <a-button type="link" danger size="small" @click="removeAxis(idx)">删</a-button>
        </div>
        <a-button type="dashed" size="small" block @click="addAxis">添加变体轴</a-button>
      </a-form-item>
      <a-form-item label="可生产">
        <a-checkbox v-model:checked="form.canProduce">可生产</a-checkbox>
        <a-checkbox v-model:checked="form.canSell">可销售</a-checkbox>
        <a-checkbox v-model:checked="form.canPurchase">可采购</a-checkbox>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { flattenCategoryNodes, materialCategoryTree } from '@/mock/materialCategories'
import { productCategoryTree } from '@/mock/productCategories'
import { addSpu, updateSpu, generateSpuCode } from '@/store/spuStore'
import {
  PRODUCT_SKU_CODE_PATTERN,
  SPU_BOM_STRATEGY,
  SPU_BOM_STRATEGY_HELPS,
  SPU_BOM_STRATEGY_LABELS,
  VARIANT_AXIS_SOURCE,
  ensureLockedVariantAxes,
} from '@/constants/spu'
import { getVariantAxesForCategory } from '@/utils/variantAxisTemplate'

const props = defineProps({
  open: Boolean,
  record: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))

const bomStrategyOpts = Object.entries(SPU_BOM_STRATEGY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const bomStrategyHelp = computed(
  () =>
    SPU_BOM_STRATEGY_HELPS[form.bomStrategy] ||
    '同类变体共用结构 → 建族模板 +「继承」；特殊 SKU 再建独立 BOM。销售投产仅认 SKU 自有生效 BOM。',
)

const axisSourceOpts = [
  { label: '自由输入', value: VARIANT_AXIS_SOURCE.FREE_TEXT },
  { label: '材质牌号', value: VARIANT_AXIS_SOURCE.MATERIAL_GRADE },
  { label: '枚举', value: VARIANT_AXIS_SOURCE.ENUM },
]

const form = reactive({
  id: '',
  code: '',
  name: '',
  categoryKey: undefined,
  categoryName: '',
  parentCategoryKey: '',
  categoryTreeMode: 'material',
  bomStrategy: SPU_BOM_STRATEGY.INDEPENDENT,
  baseBomId: '',
  variantAxes: [],
  canSell: false,
  canProduce: true,
  canPurchase: true,
  canOutsource: false,
  itemKind: 'material',
  sharedFields: {},
})

const categoryOpts = computed(() => {
  const tree = form.categoryTreeMode === 'product' ? productCategoryTree : materialCategoryTree
  return flattenCategoryNodes(tree)
    .filter((c) => !c.children?.length)
    .map((c) => ({ label: c.title, value: c.key }))
})

function resetFromRecord(record) {
  if (!record) {
    Object.assign(form, {
      id: '',
      code: '',
      name: '',
      categoryKey: undefined,
      categoryName: '',
      parentCategoryKey: '',
      categoryTreeMode: 'material',
      bomStrategy: SPU_BOM_STRATEGY.INDEPENDENT,
      baseBomId: '',
      variantAxes: getVariantAxesForCategory(),
      canSell: false,
      canProduce: true,
      canPurchase: true,
      sharedFields: {},
    })
    return
  }
  Object.assign(form, JSON.parse(JSON.stringify(record)))
  form.variantAxes = ensureLockedVariantAxes(form.variantAxes || [])
}

watch(
  () => props.open,
  (val) => {
    if (val) resetFromRecord(props.record)
  },
)

function onCategoryChange(key) {
  const flat = flattenCategoryNodes(
    form.categoryTreeMode === 'product' ? productCategoryTree : materialCategoryTree,
  )
  const node = flat.find((c) => c.key === key)
  form.categoryName = node?.title || ''
  form.parentCategoryKey = node?.parentKey || key
  if (!isEdit.value && !form.variantAxes.length) {
    form.variantAxes = getVariantAxesForCategory(key, form.categoryTreeMode)
  }
}

function addAxis() {
  const index = form.variantAxes.length + 1
  form.variantAxes.push({
    key: `axis${index}`,
    label: `属性${index}`,
    code: `ATTR${index}`,
    required: false,
    locked: false,
    source: VARIANT_AXIS_SOURCE.ENUM,
    enumValues: [],
  })
}

function removeAxis(idx) {
  const axis = form.variantAxes[idx]
  if (axis?.locked || axis?.key === 'specModel' || axis?.key === 'material') return
  form.variantAxes.splice(idx, 1)
  form.variantAxes = ensureLockedVariantAxes(form.variantAxes)
}

function handleCancel() {
  emit('update:open', false)
}

function handleOk() {
  if (!form.name?.trim()) {
    message.warning('请输入族名称')
    return
  }
  if (!form.categoryKey) {
    message.warning('请选择分类')
    return
  }
  const payload = {
    ...form,
    code: form.code || generateSpuCode(),
    skuCodePattern: PRODUCT_SKU_CODE_PATTERN,
    variantAxes: ensureLockedVariantAxes(form.variantAxes),
    itemKind:
      form.canSell && form.canProduce ? 'productMaterial' : form.canSell ? 'product' : 'material',
    sharedFields: {
      categoryKey: form.categoryKey,
      parentCategoryKey: form.parentCategoryKey,
      categoryName: form.categoryName,
    },
  }
  if (isEdit.value) {
    updateSpu(form.id, payload)
    message.success('已保存')
  } else {
    addSpu(payload)
    message.success('已创建')
  }
  emit('saved')
  emit('update:open', false)
}
</script>

<style scoped>
.axis-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.bom-help {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}
</style>
