<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑工艺路线' : '新增工艺路线'"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    wrap-class-name="process-route-editor-modal"
    :body-style="{ padding: '0' }"
    @cancel="handleCancel"
  >
    <ProcessRouteGridEditor
      v-model:grid="form.grid"
      v-model:selected-step="selectedStep"
      v-model:selected-row="selectedRow"
    >
      <template #basic>
        <div class="section-title">基本信息</div>
        <a-form
          :model="form"
          layout="horizontal"
          class="route-basic-form horizontal-form"
          :label-col="{ style: { width: '110px' } }"
          :wrapper-col="{ style: { flex: 1 } }"
        >
          <a-row :gutter="[16, 0]" style="width: 100%">
            <a-col :span="24">
              <a-form-item label="工艺路线名称" required>
                <a-input v-model:value="form.name" size="small" placeholder="请输入 工艺路线名称" />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item label="工艺应用范围" required>
                <a-radio-group v-model:value="form.applyScope" size="small" @change="onScopeChange">
                  <a-radio value="全部产品">全部产品</a-radio>
                  <a-radio value="单个物品">单个物品</a-radio>
                  <a-radio value="物品类别">物品类别</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col v-if="form.applyScope === '单个物品'" :span="24">
              <a-form-item label="物品" required>
                <a-input-group compact style="width: 100%">
                  <a-input
                    :value="form.itemName ? `${form.itemName}` : ''"
                    readonly
                    size="small"
                    placeholder="请选择 物品"
                    style="width: calc(100% - 72px)"
                  />
                  <a-button size="small" @click="itemPickerOpen = true">选择</a-button>
                </a-input-group>
              </a-form-item>
            </a-col>
            <template v-if="form.applyScope === '物品类别'">
              <a-col :span="24">
                <a-form-item label="类别类型" required>
                  <a-radio-group
                    v-model:value="form.categoryType"
                    size="small"
                    @change="onCategoryTypeChange"
                  >
                    <a-radio value="产品">产品类别</a-radio>
                    <a-radio value="物料">物料类别</a-radio>
                  </a-radio-group>
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="物品类别" required>
                  <a-tree-select
                    v-model:value="form.categoryKey"
                    :tree-data="categoryTree"
                    placeholder="请选择 物品类别"
                    tree-default-expand-all
                    allow-clear
                    size="small"
                    style="width: 100%"
                    @change="onCategoryChange"
                  />
                </a-form-item>
              </a-col>
            </template>
            <a-col :span="24">
              <a-form-item label="备注">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  size="small"
                  placeholder="请输入 备注"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </template>
    </ProcessRouteGridEditor>

    <SelectProductMaterialModal
      v-model:open="itemPickerOpen"
      :item-type="form.itemType"
      :selected-id="form.itemId"
      @confirm="onItemSelected"
    />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { createEmptyGrid } from '@/utils/processRouteGrid'
import { addProcessRoute, updateProcessRoute } from '@/store/processRouteStore'
import { productCategoryTree } from '@/mock/productCategories'
import { materialCategoryTree } from '@/mock/materialCategories'
import ProcessRouteGridEditor from './ProcessRouteGridEditor.vue'
import SelectProductMaterialModal from './SelectProductMaterialModal.vue'

const props = defineProps({
  open: Boolean,
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const itemPickerOpen = ref(false)
const selectedStep = ref(-1)
const selectedRow = ref(-1)

const form = reactive({
  name: '',
  applyScope: '全部产品',
  itemType: '产品',
  itemId: '',
  itemName: '',
  itemCode: '',
  categoryType: '产品',
  categoryKey: undefined,
  categoryName: '',
  productDisplay: '',
  remark: '',
  grid: createEmptyGrid(9, 2),
})

const categoryTree = computed(() => {
  const tree = form.categoryType === '物料' ? materialCategoryTree : productCategoryTree
  const mapNode = (n) => ({
    title: n.title,
    value: n.key,
    key: n.key,
    children: n.children?.map(mapNode),
  })
  return tree.map(mapNode)
})

function resetForm() {
  const r = props.editRecord
  if (r) {
    Object.assign(form, {
      name: r.name,
      applyScope: r.applyScope || '全部产品',
      itemType: r.itemType || '产品',
      itemId: r.itemId || '',
      itemName: r.itemName || '',
      itemCode: r.itemCode || '',
      categoryType: r.categoryType || '产品',
      categoryKey: r.categoryKey || undefined,
      categoryName: r.categoryName || '',
      productDisplay: r.productDisplay || '',
      remark: r.remark || '',
      grid: JSON.parse(JSON.stringify(r.grid || createEmptyGrid(9, 2))),
    })
  } else {
    Object.assign(form, {
      name: '',
      applyScope: '单个物品',
      itemType: '产品',
      itemId: '',
      itemName: '',
      itemCode: '',
      categoryType: '产品',
      categoryKey: undefined,
      categoryName: '',
      productDisplay: '',
      remark: '',
      grid: createEmptyGrid(9, 2),
    })
  }
  selectedStep.value = -1
  selectedRow.value = -1
}

function onScopeChange() {
  form.itemId = ''
  form.itemName = ''
  form.itemCode = ''
  form.categoryKey = undefined
  form.categoryName = ''
}

function onCategoryTypeChange() {
  form.categoryKey = undefined
  form.categoryName = ''
}

function onCategoryChange(key) {
  const findTitle = (nodes) => {
    for (const n of nodes) {
      if (n.key === key) return n.title
      if (n.children) {
        const t = findTitle(n.children)
        if (t) return t
      }
    }
    return ''
  }
  const tree = form.categoryType === '物料' ? materialCategoryTree : productCategoryTree
  form.categoryName = findTitle(tree)
  form.productDisplay = form.categoryName
}

function onItemSelected(row) {
  form.itemType = row.itemType
  form.itemId = row.id
  form.itemName = row.name
  form.itemCode = row.code
  form.productDisplay = row.name
  form.categoryKey = row.categoryKey
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  const payload = {
    ...form,
    productDisplay: form.productDisplay || form.itemName || form.categoryName,
  }
  const res = isEdit.value
    ? updateProcessRoute(props.editRecord.id, payload)
    : addProcessRoute(payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('保存成功')
  emit('saved', res.route)
  emit('update:open', false)
}

watch(
  () => props.open,
  (v) => {
    if (v) resetForm()
  },
)
</script>

<style scoped>
.section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #1677ff;
}

.route-basic-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.route-basic-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
}

.route-basic-form
  :deep(
    .ant-form-item-label
      > label.ant-form-item-required:not(.ant-form-item-required-mark-hidden)::before
  ) {
  margin-inline-end: 4px;
}
</style>

<style>
.process-route-editor-modal .ant-modal-content {
  overflow: hidden;
}

.process-route-editor-modal .ant-modal-body {
  max-height: calc(100vh - 160px);
  overflow: auto;
}
</style>
