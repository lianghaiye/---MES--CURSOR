<template>
  <div class="product-bom-create-page">
    <div class="page-body">
      <aside class="left-panel">
        <BomTreePanel
          :flat-nodes="flatNodes"
          :selected-node-id="selectedNodeId"
          :template-ref="templateRef"
          @import-template="templateModalOpen = true"
          @add-child="onAddChild"
          @delete-node="onDeleteNode"
          @select-node="selectedNodeId = $event"
        />
      </aside>

      <main class="right-panel">
        <div class="section-card">
          <div class="section-title">{{ isEditMode ? '编辑 BOM' : '新增 BOM' }}</div>
          <a-form
            ref="formRef"
            :model="form"
            :rules="rules"
            layout="horizontal"
            :label-col="{ span: 7 }"
            :wrapper-col="{ span: 16 }"
            class="basic-form horizontal-form"
          >
            <a-row :gutter="[16, 8]">
              <a-col :span="12">
                <a-form-item label="BOM编码" name="bomNo">
                  <a-input-group compact>
                    <a-input
                      v-model:value="form.bomNo"
                      style="width: calc(100% - 88px)"
                      placeholder="保存时自动生成"
                      :disabled="isEditMode"
                    />
                    <a-button v-if="!isEditMode" @click="form.bomNo = generateBomNo()">
                      生成编码
                    </a-button>
                  </a-input-group>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="BOM名称" name="bomName">
                  <a-input v-model:value="form.bomName" placeholder="请输入 BOM 名称" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="BOM类型" name="bomType">
                  <a-select v-model:value="form.bomType" :options="bomTypeOpts" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="物品名称" name="itemId">
                  <a-select
                    v-model:value="form.itemId"
                    show-search
                    placeholder="请选择产品/物料"
                    :filter-option="filterItem"
                    :options="itemOptions"
                    :disabled="isEditMode"
                    @change="onItemChange"
                  />
                </a-form-item>
              </a-col>
              <a-col v-if="isEditMode" :span="12">
                <a-form-item label="BOM版本">
                  <a-input :value="editVersion" disabled />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="规格型号">
                  <a-input v-model:value="form.specModel" disabled placeholder="选择物品后带出" />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="备注" :label-col="{ span: 3 }" :wrapper-col="{ span: 20 }">
                  <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入备注" />
                </a-form-item>
              </a-col>
            </a-row>
          </a-form>
        </div>

        <div class="section-card table-section">
          <BomMaterialTable
            :lines="displayLines"
            :column-settings="columnSettings"
            @refresh="refreshLines"
            @open-column-setting="columnDrawerOpen = true"
            @delete-line="onDeleteLine"
            @change-line="onChangeLine"
          />
        </div>
      </main>
    </div>

    <div class="page-footer">
      <a-space>
        <a-button type="primary" :loading="saving" @click="handleSave">
          <SaveOutlined />
          保存
        </a-button>
        <a-button @click="handleCancel">
          <CloseOutlined />
          取消
        </a-button>
      </a-space>
    </div>

    <ImportBomTemplateModal
      v-model:open="templateModalOpen"
      :has-root="hasRoot"
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      @imported="onTemplateImported"
    />
    <SelectBomMaterialModal v-model:open="materialModalOpen" @selected="onMaterialSelected" />
    <BomColumnSettingDrawer v-model:open="columnDrawerOpen" v-model:settings="columnSettings" />
  </div>
</template>

<script>
export default { name: 'ProductBomCreateView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { SaveOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  addProductBom,
  generateBomNo,
  getProductBomById,
  updateProductBom,
} from '@/store/productBomStore'
import { loadBomDetailStructure } from '@/utils/bomImport'
import { defaultBomColumnSettings, bomTypeOptions } from '@/mock/bomMaterialColumns'
import {
  createRootTreeNode,
  getLinesForTreeNode,
  addChildMaterial,
  deleteTreeNode,
  ROOT_ID,
  isRootNode,
} from '@/utils/bomTree'
import { syncRootNodeFromItem } from '@/utils/bomImport'
import { useTabs } from '@/composables/useTabs'
import BomTreePanel from './components/BomTreePanel.vue'
import BomMaterialTable from './components/BomMaterialTable.vue'
import ImportBomTemplateModal from './components/ImportBomTemplateModal.vue'
import SelectBomMaterialModal from './components/SelectBomMaterialModal.vue'
import BomColumnSettingDrawer from './components/BomColumnSettingDrawer.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const isEditMode = computed(() => route.name === 'product-process-bom-edit')
const editBomId = computed(() => route.params.id)
const pageTabPath = computed(() =>
  isEditMode.value && editBomId.value
    ? `/product-process/bom/${editBomId.value}/edit`
    : '/product-process/bom/new',
)
const editVersion = ref('')

const formRef = ref()
const saving = ref(false)
const flatNodes = ref([])
const lineItems = ref([])
const selectedNodeId = ref(ROOT_ID)
const templateRef = ref(null)
const templateModalOpen = ref(false)
const materialModalOpen = ref(false)
const addChildParentId = ref('')
const columnDrawerOpen = ref(false)
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))

const form = reactive({
  bomNo: generateBomNo(),
  bomName: '',
  bomType: '基础BOM',
  itemId: undefined,
  itemType: 'product',
  itemName: '',
  itemCode: '',
  specModel: '',
  remark: '',
})

const rules = {
  bomName: [{ required: true, message: '请输入 BOM 名称' }],
  bomType: [{ required: true, message: '请选择 BOM 类型' }],
  itemId: [{ required: true, message: '请选择物品' }],
}

const bomTypeOpts = bomTypeOptions.map((v) => ({ label: v, value: v }))

const itemOptions = computed(() => {
  const products = productInfoState.products.slice(0, 200).map((p) => ({
    label: `[产品] ${p.code} ${p.name}`,
    value: `product:${p.id}`,
    itemType: 'product',
    itemId: p.id,
    itemName: p.name,
    itemCode: p.code,
    specModel: p.specModel || '',
  }))
  const materials = materialInfoState.materials.slice(0, 100).map((m) => ({
    label: `[物料] ${m.code} ${m.name}`,
    value: `material:${m.id}`,
    itemType: 'material',
    itemId: m.id,
    itemName: m.name,
    itemCode: m.code,
    specModel: m.specModel || '',
  }))
  return [...products, ...materials]
})

const hasRoot = computed(() => flatNodes.value.some((n) => n.isRoot))

const displayLines = computed(() =>
  getLinesForTreeNode(lineItems.value, selectedNodeId.value, flatNodes.value),
)

function filterItem(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function onItemChange(val) {
  const opt = itemOptions.value.find((o) => o.value === val)
  if (!opt) return
  form.itemType = opt.itemType
  form.itemName = opt.itemName
  form.itemCode = opt.itemCode
  form.specModel = opt.specModel
  if (!form.bomName) form.bomName = `${opt.itemName} BOM`

  const hadRoot = hasRoot.value
  if (hadRoot) {
    flatNodes.value = syncRootNodeFromItem(flatNodes.value, {
      itemCode: opt.itemCode,
      itemName: opt.itemName,
      specModel: opt.specModel,
      bomName: form.bomName,
    })
    lineItems.value = []
    selectedNodeId.value = ROOT_ID
  } else {
    const root = createRootTreeNode({
      itemCode: opt.itemCode,
      itemName: opt.itemName,
      specModel: opt.specModel,
      bomName: form.bomName,
    })
    flatNodes.value = [root]
    lineItems.value = []
    selectedNodeId.value = ROOT_ID
  }
  templateRef.value = null
}

function onAddChild(parentId) {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  addChildParentId.value = parentId || ROOT_ID
  materialModalOpen.value = true
}

function onMaterialSelected(material) {
  const parentId = addChildParentId.value || ROOT_ID
  const result = addChildMaterial(flatNodes.value, lineItems.value, parentId, material)
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  if (result.newNodeId) selectedNodeId.value = parentId
}

function onDeleteNode(nodeId) {
  if (isRootNode(nodeId)) {
    message.warning('根节点不可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: '删除该节点将同时移除其下级节点与关联物料，是否继续？',
    okType: 'danger',
    onOk: () => {
      const result = deleteTreeNode(flatNodes.value, lineItems.value, nodeId)
      flatNodes.value = result.flatNodes
      lineItems.value = result.lineItems
      if (selectedNodeId.value === nodeId) selectedNodeId.value = ROOT_ID
    },
  })
}

function onDeleteLine(lineId) {
  const line = lineItems.value.find((l) => l.id === lineId)
  lineItems.value = lineItems.value.filter((l) => l.id !== lineId)
  if (line?.treeNodeId) {
    const result = deleteTreeNode(flatNodes.value, lineItems.value, line.treeNodeId)
    flatNodes.value = result.flatNodes
    lineItems.value = result.lineItems
  }
}

function onChangeLine(line) {
  addChildParentId.value = line.parentTreeId || ROOT_ID
  materialModalOpen.value = true
  message.info('请选择物料以替换当前行')
}

function onTemplateImported(result) {
  if (result.mode === 'full') {
    Object.assign(form, result.basicInfo)
  }
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  templateRef.value = result.templateRef
  selectedNodeId.value = ROOT_ID
}

function refreshLines() {
  lineItems.value = [...lineItems.value]
}

function loadEditBom(id) {
  const bom = getProductBomById(id)
  if (!bom) {
    message.error('BOM 不存在')
    router.push('/product-process/bom')
    return
  }
  if (bom.status !== '待启用') {
    message.warning('仅待启用状态的 BOM 可编辑')
    router.push('/product-process/bom')
    return
  }

  const { flatNodes: nodes, lineItems: lines } = loadBomDetailStructure(bom)
  flatNodes.value = nodes
  lineItems.value = lines
  selectedNodeId.value = nodes.find((n) => n.isRoot)?.id || ROOT_ID
  templateRef.value = bom.templateRef || null
  columnSettings.value = bom.columnSettings?.length
    ? JSON.parse(JSON.stringify(bom.columnSettings))
    : JSON.parse(JSON.stringify(defaultBomColumnSettings))

  editVersion.value = bom.version || ''
  form.bomNo = bom.bomNo
  form.bomName = bom.bomName
  form.bomType = bom.bomType || '基础BOM'
  form.itemId = `${bom.itemType}:${bom.itemId}`
  form.itemType = bom.itemType
  form.itemName = bom.itemName
  form.itemCode = bom.itemCode
  form.specModel = bom.specModel || ''
  form.remark = bom.remark || ''
}

watch(
  () => [isEditMode.value, editBomId.value],
  ([edit, id]) => {
    if (edit && id) loadEditBom(id)
  },
  { immediate: true },
)

watch(
  () => [route.name, route.query.itemType, route.query.itemId],
  () => {
    if (route.name !== 'product-process-bom-new') return
    const { itemType, itemId } = route.query
    if (!itemType || !itemId) return
    const val = `${itemType}:${itemId}`
    if (form.itemId === val) return
    form.itemId = val
    onItemChange(val)
  },
  { immediate: true },
)

async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!hasRoot.value) {
    message.warning('请选择产品/物料以建立 BOM 根节点')
    return
  }
  if (!lineItems.value.length) {
    message.warning('请至少添加一条物料明细')
    return
  }

  const rawItemId = form.itemId
  const itemId =
    typeof rawItemId === 'string' && rawItemId.includes(':') ? rawItemId.split(':')[1] : rawItemId

  const payload = {
    bomNo: form.bomNo || generateBomNo(),
    bomName: form.bomName,
    bomType: form.bomType,
    itemType: form.itemType,
    itemId,
    itemName: form.itemName,
    itemCode: form.itemCode,
    specModel: form.specModel,
    remark: form.remark,
    treeNodes: flatNodes.value,
    lineItems: lineItems.value,
    templateRef: templateRef.value,
    columnSettings: columnSettings.value,
  }

  saving.value = true
  try {
    if (isEditMode.value) {
      const res = updateProductBom(editBomId.value, payload)
      if (res?.error) {
        message.warning(res.error)
        return
      }
      message.success('BOM 已更新')
    } else {
      addProductBom(payload)
      message.success('BOM 已保存，状态为待启用，可在列表中启用')
    }
    closeTab(pageTabPath.value)
    router.push('/product-process/bom')
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  Modal.confirm({
    title: '确认取消',
    content: '未保存的内容将丢失，是否离开？',
    onOk: () => {
      closeTab(pageTabPath.value)
      router.push('/product-process/bom')
    },
  })
}
</script>

<style lang="less" scoped>
.product-bom-create-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 112px);
  background: #f5f6f8;
}

.page-body {
  flex: 1;
  display: flex;
  gap: 8px;
  padding: 8px;
  min-height: 0;
}

.left-panel {
  flex: 0 0 280px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 10px;
  overflow: hidden;
}

.right-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 12px 16px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 12px;
  }
}

.table-section {
  flex: 1;
  min-height: 320px;
}

.basic-form {
  :deep(.ant-form-item) {
    margin-bottom: 8px;
  }
}

.page-footer {
  flex-shrink: 0;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.04);
}

@media (max-width: 992px) {
  .page-body {
    flex-direction: column;
  }

  .left-panel {
    flex: none;
    width: 100%;
  }
}
</style>
