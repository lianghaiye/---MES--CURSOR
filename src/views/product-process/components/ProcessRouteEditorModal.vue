<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    class="process-route-editor-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="route-editor-page">
      <div class="form-section-box modal-basic-card">
        <div class="section-label">基本信息</div>
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
              <a-form-item label="适用范围" required>
                <a-radio-group v-model:value="form.applyScope" size="small" @change="onScopeChange">
                  <a-radio value="全部产品">全局</a-radio>
                  <a-radio value="单个物品">单产品</a-radio>
                  <a-radio value="物品类别">产品类别</a-radio>
                </a-radio-group>
              </a-form-item>
            </a-col>
            <a-col v-if="form.applyScope === '单个物品'" :span="24">
              <a-form-item label="适用对象" required>
                <div class="scope-target-row">
                  <a-select
                    :value="form.itemId || undefined"
                    show-search
                    allow-clear
                    size="small"
                    placeholder="输入编码/名称搜索"
                    :options="productOpts"
                    :filter-option="filterProductOption"
                    style="flex: 1"
                    @change="onProductSelect"
                  />
                  <a class="link-more" @click.prevent="itemPickerOpen = true">查看更多</a>
                </div>
              </a-form-item>
            </a-col>
            <template v-if="form.applyScope === '物品类别'">
              <a-col :span="24">
                <a-form-item label="适用对象" required>
                  <div class="scope-target-row">
                    <a-tree-select
                      v-model:value="form.categoryKey"
                      :tree-data="categoryTree"
                      placeholder="输入编码/名称搜索"
                      tree-default-expand-all
                      show-search
                      allow-clear
                      tree-node-filter-prop="title"
                      size="small"
                      style="flex: 1"
                      @change="onCategoryChange"
                    />
                    <a class="link-more muted">查看更多</a>
                  </div>
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
      </div>

      <ProcessRouteGridEditor
        v-model:grid="form.grid"
        v-model:selected-step="selectedStep"
        v-model:selected-row="selectedRow"
      />
    </div>

    <SelectProductMaterialModal
      v-if="isActive"
      v-model:open="itemPickerOpen"
      :item-type="form.itemType"
      :selected-id="form.itemId"
      @confirm="onItemSelected"
    />

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { createEmptyGrid } from '@/utils/processRouteGrid'
import { addProcessRoute, updateProcessRoute } from '@/store/processRouteStore'
import { productCategoryState } from '@/store/productCategoryStore'
import { materialCategoryState } from '@/store/materialCategoryStore'
import { productInfoState } from '@/store/productInfoStore'
import ProcessRouteGridEditor from './ProcessRouteGridEditor.vue'
import SelectProductMaterialModal from './SelectProductMaterialModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/product-process/routing',
  getTitle: () => (isEdit.value ? '编辑工艺路线' : '新增工艺路线'),
})
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

const productOpts = computed(() =>
  (productInfoState.products || []).map((p) => ({
    label: `${p.code || ''} ${p.name || ''}`.trim(),
    value: p.id,
    code: p.code,
    name: p.name,
  })),
)

const categoryTree = computed(() => {
  const tree = form.categoryType === '物料' ? materialCategoryState.tree : productCategoryState.tree
  return tree || []
})

function filterProductOption(input, option) {
  const kw = String(input || '')
    .trim()
    .toLowerCase()
  if (!kw) return true
  const label = String(option?.label || '').toLowerCase()
  const code = String(option?.code || '').toLowerCase()
  const name = String(option?.name || '').toLowerCase()
  return label.includes(kw) || code.includes(kw) || name.includes(kw)
}

function onProductSelect(id) {
  if (!id) {
    form.itemId = ''
    form.itemName = ''
    form.itemCode = ''
    form.productDisplay = ''
    return
  }
  const row = (productInfoState.products || []).find((p) => p.id === id)
  if (!row) return
  form.itemType = '产品'
  form.itemId = row.id
  form.itemName = row.name || ''
  form.itemCode = row.code || ''
  form.productDisplay = row.name || ''
}

function resetForm() {
  const r = props.editRecord
  if (r) {
    Object.assign(form, {
      name: r.name || '',
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
      grid: r.grid?.length ? r.grid : createEmptyGrid(9, 2),
    })
  } else {
    Object.assign(form, {
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
  form.productDisplay = ''
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
  const tree = form.categoryType === '物料' ? materialCategoryState.tree : productCategoryState.tree
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
  closeAfterSave()
}

watch(
  () => [isActive.value, props.editRecord?.id],
  ([visible]) => {
    if (visible) resetForm()
  },
  { immediate: true },
)
</script>

<style scoped>
.route-editor-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-section-box {
  width: 100%;
  margin-bottom: 0;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.section-label {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.route-basic-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

.route-basic-form :deep(.ant-form-item-label > label) {
  font-size: 13px;
}

.scope-target-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.link-more {
  color: #1677ff;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}

.link-more.muted {
  color: rgba(0, 0, 0, 0.25);
  cursor: default;
  pointer-events: none;
}
</style>

<style>
.process-route-editor-modal .ant-modal-content {
  overflow: hidden;
}

.process-route-editor-modal .ant-modal-body {
  max-height: calc(100vh - 160px);
  overflow: auto;
  padding: 0;
}
</style>
