<template>
  <div class="product-bom-create-page">
    <div class="page-body">
      <aside
        v-show="!leftSidebarCollapsed"
        class="left-panel"
        :style="{ width: `${leftPanelWidth}px` }"
      >
        <BomTreePanel
          :flat-nodes="flatNodes"
          :line-items="lineItems"
          :selected-node-id="selectedNodeId"
          :template-ref="templateRef"
          :root-meta="rootMeta"
          @import-template="templateModalOpen = true"
          @add-child="onAddChild"
          @delete-node="onDeleteNode"
          @select-node="selectedNodeId = $event"
          @switch-product="openSwitchProduct"
        />
      </aside>
      <div v-if="leftSidebarCollapsed" class="sidebar-expand-trigger">
        <a-button type="text" size="small" @click="leftSidebarCollapsed = false">
          <MenuUnfoldOutlined />
        </a-button>
      </div>
      <div
        v-show="!leftSidebarCollapsed"
        class="panel-resizer"
        @mousedown.prevent="onResizeMouseDown"
      />

      <main class="right-panel">
        <div class="right-panel-head">
          <div class="head-left">
            <span v-if="!basicInfoExpanded" class="basic-summary">{{ basicInfoSummary }}</span>
          </div>
          <a-space class="head-actions">
            <a-button type="link" size="small" class="toggle-btn" @click="toggleBasicInfo">
              {{ basicInfoExpanded ? '收起信息' : '展开信息' }}
              <UpOutlined v-if="basicInfoExpanded" />
              <DownOutlined v-else />
            </a-button>
            <a-button type="primary" :disabled="!hasRoot" @click="overviewModalOpen = true">
              概览
            </a-button>
            <a-button :disabled="!hasRoot" @click="relationOpen = true"> 查看关联BOM </a-button>
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

        <div v-show="basicInfoExpanded" class="section-card info-card">
          <div class="info-body">
            <div class="info-block">
              <a-form
                ref="formRef"
                :model="form"
                :rules="rules"
                layout="inline"
                size="small"
                class="inline-info-form"
              >
                <a-form-item label="BOM编码" name="bomNo">
                  <a-input
                    v-model:value="form.bomNo"
                    placeholder="保存时自动生成"
                    :disabled="isEditMode"
                    allow-clear
                    style="width: 180px"
                  />
                </a-form-item>
                <a-form-item label="BOM名称" name="bomName">
                  <a-input
                    v-model:value="form.bomName"
                    placeholder="请输入 BOM 名称"
                    style="width: 220px"
                  />
                </a-form-item>
                <a-form-item label="BOM类型" name="bomType">
                  <a-select
                    v-model:value="form.bomType"
                    style="width: 140px"
                    :options="bomTypeSelectOptions"
                  />
                </a-form-item>
              </a-form>
            </div>

            <div class="info-block">
              <div class="info-block-head">
                <div class="info-block-title">父项产品信息</div>
              </div>
              <a-form layout="inline" size="small" class="inline-info-form">
                <a-form-item label="物品名称">
                  <a-input
                    :value="selectedParentInfo.itemName || '—'"
                    disabled
                    style="width: 180px"
                  />
                </a-form-item>
                <a-form-item v-if="isEditMode" label="BOM版本">
                  <a-input :value="editVersion" disabled style="width: 120px" />
                </a-form-item>
                <a-form-item label="规格型号">
                  <a-input
                    :value="selectedParentInfo.specModel || '—'"
                    disabled
                    style="width: 140px"
                  />
                </a-form-item>
                <a-form-item label="材质">
                  <a-input
                    :value="selectedParentInfo.material || '—'"
                    disabled
                    style="width: 120px"
                  />
                </a-form-item>
                <a-form-item label="图号">
                  <a-input
                    :value="selectedParentInfo.drawingNo || '—'"
                    disabled
                    style="width: 140px"
                  />
                </a-form-item>
                <a-form-item label="工艺路线">
                  <a-select
                    v-if="isSelectedRoot"
                    v-model:value="form.processRoute"
                    allow-clear
                    show-search
                    placeholder="选择物品后带出，可修改"
                    :filter-option="filterRoute"
                    :options="processRouteOpts"
                    style="width: 180px"
                  />
                  <a-input
                    v-else
                    :value="selectedParentInfo.processRoute || '—'"
                    disabled
                    style="width: 180px"
                  />
                </a-form-item>
                <div class="params-pair-row">
                  <a-form-item label="技术参数" class="pair-item">
                    <a-textarea
                      v-if="isSelectedRoot"
                      v-model:value="form.techParams"
                      placeholder="选择物品后带出，可修改"
                      allow-clear
                      :rows="3"
                      style="width: 100%"
                    />
                    <a-textarea
                      v-else
                      :value="selectedParentInfo.techParams || '—'"
                      disabled
                      :rows="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                  <a-form-item label="配套要求" class="pair-item">
                    <a-textarea
                      :value="selectedParentInfo.matchingRequirements || '—'"
                      disabled
                      :rows="3"
                      style="width: 100%"
                    />
                  </a-form-item>
                </div>
              </a-form>
            </div>
          </div>
        </div>

        <div class="section-card table-section">
          <BomMaterialTable
            :lines="displayLines"
            :column-settings="columnSettings"
            :empty-variant="hasRoot ? 'no-children' : 'default'"
            @refresh="refreshLines"
            @open-column-setting="columnDrawerOpen = true"
            @delete-line="onDeleteLine"
            @delete-lines="onDeleteLines"
            @add-sub-item="onAddSubItem"
            @add-by-bom="onAddByBom"
            @add-detail-line="onAddDetailLine"
            @reorder-lines="onReorderLines"
            @material-change="onMaterialChange"
          />
        </div>
      </main>
    </div>

    <ImportBomTemplateModal
      v-model:open="templateModalOpen"
      :has-root="hasRoot"
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      @imported="onTemplateImported"
    />
    <SelectBomMaterialModal v-model:open="materialModalOpen" @selected="onMaterialSelected" />
    <AddByBomModal v-model:open="addByBomModalOpen" @confirm="onAddByBomConfirm" />
    <SelectBomMaterialModal
      v-model:open="switchProductOpen"
      title="选择物品"
      ecn-new-material-mode
      hide-add-material
      :multiple="false"
      @selected="onSwitchProductSelected"
    />
    <BomColumnSettingDrawer v-model:open="columnDrawerOpen" v-model:settings="columnSettings" />
    <BomOverviewModal
      v-model:open="overviewModalOpen"
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      :root-item-name="form.itemName"
      :overview-info="overviewInfo"
    />
    <BomRelationDrawer
      v-model:open="relationOpen"
      :bom="relationBomContext"
      :line-items="lineItems"
    />
  </div>
</template>

<script>
export default { name: 'ProductBomCreateView' }
</script>

<script setup>
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  SaveOutlined,
  CloseOutlined,
  UpOutlined,
  DownOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  generateBomNo,
  getProductBomById,
  saveProductBom,
  isBomPending,
} from '@/store/productBomStore'
import { isBomEditable } from '@/mock/productBomOptions'
import { loadBomDetailStructure, importBomByReference } from '@/utils/bomImport'
import { defaultBomColumnSettings, bomTypeSelectOptions } from '@/mock/bomMaterialColumns'
import { mergeColumnSettings } from '@/utils/tableColumnSettings'
import { processRouteState } from '@/store/processRouteStore'
import { applyMaterialToLine, createEmptySubLine } from '@/utils/bomLineMaterial'
import {
  createRootTreeNode,
  getLinesForTreeNode,
  addChildMaterial,
  deleteTreeNode,
  reorderLinesForTreeNode,
  ROOT_ID,
  isRootNode,
  getRootTreeId,
} from '@/utils/bomTree'
import { syncRootNodeFromItem } from '@/utils/bomImport'
import { useTabs } from '@/composables/useTabs'
import BomTreePanel from './components/BomTreePanel.vue'
import BomMaterialTable from './components/BomMaterialTable.vue'
import ImportBomTemplateModal from './components/ImportBomTemplateModal.vue'
import SelectBomMaterialModal from './components/SelectBomMaterialModal.vue'
import AddByBomModal from './components/AddByBomModal.vue'
import BomColumnSettingDrawer from './components/BomColumnSettingDrawer.vue'
import BomOverviewModal from './components/BomOverviewModal.vue'
import BomRelationDrawer from './components/BomRelationDrawer.vue'
import { validateAllBomParentChildLines, validateParentChildNotSame } from '@/utils/bomValidation'
import { resolveBomNodeItemInfo } from '@/utils/bomTreeDisplay'

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
const editBomStatus = ref('')
const canSwitchProduct = computed(() => {
  if (!isEditMode.value) return true
  return isBomPending({ status: editBomStatus.value })
})
const basicInfoExpanded = ref(true)
const leftSidebarCollapsed = ref(false)
const leftPanelWidth = ref(280)
const switchProductOpen = ref(false)
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 520
let resizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const formRef = ref()
const saving = ref(false)
const flatNodes = ref([])
const lineItems = ref([])
const selectedNodeId = ref(ROOT_ID)
const templateRef = ref(null)
const templateModalOpen = ref(false)
const materialModalOpen = ref(false)
const addByBomModalOpen = ref(false)
const addChildParentId = ref('')
const columnDrawerOpen = ref(false)
const overviewModalOpen = ref(false)
const relationOpen = ref(false)
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))

const form = reactive({
  bomNo: generateBomNo(),
  bomName: '',
  bomType: '基准BOM',
  itemId: undefined,
  itemType: 'product',
  itemName: '',
  itemCode: '',
  specModel: '',
  material: '',
  drawingNo: '',
  techParams: '',
  processRoute: undefined,
  matchingRequirements: '',
})

const rules = {
  bomName: [{ required: true, message: '请输入 BOM 名称' }],
}

const switchSelectedId = computed(() => {
  if (!form.itemId) return ''
  const raw = form.itemId
  return typeof raw === 'string' && raw.includes(':') ? raw.split(':')[1] : raw
})

const rootMeta = computed(() => {
  const rootId = getRootTreeId(flatNodes.value)
  const master = form.itemId ? findMasterItem(form.itemType, switchSelectedId.value) : null
  return {
    code: form.itemCode,
    name: form.itemName,
    specModel: form.specModel,
    supplyForm: master?.supplyForm || '',
    subItemCount: lineItems.value.filter((l) => l.parentTreeId === rootId).length,
  }
})

const basicInfoSummary = computed(() => {
  const parts = [form.bomName, form.itemName].filter(Boolean)
  return parts.length ? parts.join(' · ') : '请填写 BOM 基础信息'
})

const overviewInfo = computed(() => ({
  bomNo: form.bomNo || '—',
  specModel: form.specModel || '—',
  version: editVersion.value || '—',
  material: form.material || '—',
  drawingNo: form.drawingNo || '—',
  techParams: form.techParams || '—',
  matchingRequirements: form.matchingRequirements || '—',
}))

const relationBomContext = computed(() => {
  if (isEditMode.value && editBomId.value) {
    return (
      getProductBomById(editBomId.value) || {
        id: editBomId.value,
        bomName: form.bomName,
        bomNo: form.bomNo,
        itemName: form.itemName,
        itemType: form.itemType,
        itemId: switchSelectedId.value,
        lineItems: lineItems.value,
        treeNodes: flatNodes.value,
      }
    )
  }
  return {
    bomName: form.bomName,
    bomNo: form.bomNo,
    itemName: form.itemName,
    itemType: form.itemType,
    itemId: switchSelectedId.value,
    lineItems: lineItems.value,
    treeNodes: flatNodes.value,
  }
})

const processRouteOpts = computed(() =>
  (processRouteState.routes || [])
    .filter((r) => r.status === '使用中')
    .map((r) => ({
      label: `${r.code} ${r.name}`,
      value: r.name,
    })),
)

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

const selectedNode = computed(() => {
  const id = selectedNodeId.value || getRootTreeId(flatNodes.value)
  return flatNodes.value.find((n) => n.id === id) || flatNodes.value.find((n) => n.isRoot) || null
})

const isSelectedRoot = computed(() => !selectedNode.value || selectedNode.value.isRoot)

const selectedParentInfo = computed(() =>
  resolveBomNodeItemInfo(selectedNode.value, lineItems.value, form),
)

function filterRoute(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function findMasterItem(itemType, itemId) {
  if (itemType === 'product') {
    return productInfoState.products.find((p) => p.id === itemId)
  }
  return materialInfoState.materials.find((m) => m.id === itemId)
}

function applyReadonlyMasterFields(itemType, itemId) {
  const master = findMasterItem(itemType, itemId)
  if (!master) return
  form.material = master.material || ''
  form.drawingNo = master.drawingNo || ''
}

function applyEditableMasterFields(itemType, itemId) {
  const master = findMasterItem(itemType, itemId)
  if (!master) return
  form.techParams = master.techParams || ''
  form.processRoute = master.production?.defaultProcessRoute || undefined
}

function toggleBasicInfo() {
  basicInfoExpanded.value = !basicInfoExpanded.value
}

function onResizeMouseDown(e) {
  resizing = true
  resizeStartX = e.clientX
  resizeStartWidth = leftPanelWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMouseMove(e) {
  if (!resizing) return
  const next = resizeStartWidth + (e.clientX - resizeStartX)
  leftPanelWidth.value = Math.min(MAX_LEFT_WIDTH, Math.max(MIN_LEFT_WIDTH, next))
}

function onResizeMouseUp() {
  if (!resizing) return
  resizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function resetNewBomState() {
  Object.assign(form, {
    bomNo: generateBomNo(),
    bomName: '',
    bomType: '基准BOM',
    itemId: undefined,
    itemType: 'product',
    itemName: '',
    itemCode: '',
    specModel: '',
    material: '',
    drawingNo: '',
    techParams: '',
    processRoute: undefined,
    matchingRequirements: '',
  })
  flatNodes.value = []
  lineItems.value = []
  selectedNodeId.value = ROOT_ID
  templateRef.value = null
  editVersion.value = ''
  editBomStatus.value = ''
  columnSettings.value = JSON.parse(JSON.stringify(defaultBomColumnSettings))
}

function initPageFromRoute() {
  if (isEditMode.value && editBomId.value) {
    loadEditBom(String(editBomId.value))
    return
  }
  if (route.name === 'product-process-bom-new') {
    if (!form.itemId && !flatNodes.value.length) {
      resetNewBomState()
      const { itemType, itemId } = route.query
      if (itemType && itemId) {
        const val = `${itemType}:${itemId}`
        form.itemId = val
        onItemChange(val)
      } else {
        switchProductOpen.value = true
      }
    }
  }
}

onMounted(() => {
  document.addEventListener('mousemove', onResizeMouseMove)
  document.addEventListener('mouseup', onResizeMouseUp)
  initPageFromRoute()
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMouseMove)
  document.removeEventListener('mouseup', onResizeMouseUp)
})

function applySelectedItem(opt, { preserveChildren = false } = {}) {
  form.itemType = opt.itemType
  form.itemName = opt.itemName
  form.itemCode = opt.itemCode
  form.specModel = opt.specModel
  applyReadonlyMasterFields(opt.itemType, opt.itemId)
  applyEditableMasterFields(opt.itemType, opt.itemId)
  if (!form.bomName) form.bomName = `${opt.itemName} BOM`

  const hadRoot = hasRoot.value
  if (hadRoot) {
    flatNodes.value = syncRootNodeFromItem(flatNodes.value, {
      itemCode: opt.itemCode,
      itemName: opt.itemName,
      specModel: opt.specModel,
      bomName: form.bomName,
    })
    if (!preserveChildren) {
      lineItems.value = []
    }
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
  if (!preserveChildren) {
    templateRef.value = null
  }
}

function onItemChange(val, { preserveChildren = false } = {}) {
  const opt = itemOptions.value.find((o) => o.value === val)
  if (!opt) return
  form.itemId = val
  applySelectedItem(opt, { preserveChildren })
}

function openSwitchProduct() {
  if (isEditMode.value && !canSwitchProduct.value) {
    message.info('仅待发布状态的 BOM 可切换产品')
    return
  }
  switchProductOpen.value = true
}

function onSwitchProductSelected(items) {
  const row = Array.isArray(items) ? items[0] : items
  if (!row) return
  onSwitchProductConfirm(row)
}

function onSwitchProductConfirm(row) {
  const itemType = row.itemType === '物料' ? 'material' : 'product'
  const preserveChildren = isEditMode.value && canSwitchProduct.value && hasRoot.value
  form.itemId = `${itemType}:${row.id}`
  applySelectedItem(
    {
      itemType,
      itemId: row.id,
      itemName: row.name,
      itemCode: row.code,
      specModel: row.specModel || '',
    },
    { preserveChildren },
  )
  if (preserveChildren) {
    message.success('已切换产品，仅更新顶级物料，子级结构已保留')
  }
}

function onAddSubItem() {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  addChildParentId.value = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  materialModalOpen.value = true
}

function onAddByBom() {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  addByBomModalOpen.value = true
}

function onAddByBomConfirm({ pickerRow, usageCoefficient }) {
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  const check = validateParentChildNotSame(
    parentId,
    pickerRow.code,
    flatNodes.value,
    lineItems.value,
    form,
  )
  if (!check.ok) {
    message.warning(check.message)
    return
  }
  const result = importBomByReference(
    parentId,
    pickerRow,
    flatNodes.value,
    lineItems.value,
    usageCoefficient,
  )
  if (!result) {
    message.error('导入失败，请确认所选物品已关联生效的 BOM')
    return
  }
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  selectedNodeId.value = parentId
  message.success('已按 BOM 添加本级及下级结构')
}

function onAddDetailLine() {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  lineItems.value = [...lineItems.value, createEmptySubLine(parentId)]
}

function onReorderLines({ fromIndex, toIndex }) {
  const result = reorderLinesForTreeNode(
    lineItems.value,
    flatNodes.value,
    selectedNodeId.value,
    fromIndex,
    toIndex,
  )
  lineItems.value = result.lineItems
  flatNodes.value = result.flatNodes
}

function onMaterialChange({ lineId, material }) {
  const line = lineItems.value.find((l) => l.id === lineId)
  const parentId =
    line?.parentTreeId || selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  const check = validateParentChildNotSame(
    parentId,
    material.code,
    flatNodes.value,
    lineItems.value,
    form,
  )
  if (!check.ok) {
    message.warning(check.message)
    return
  }
  const result = applyMaterialToLine(flatNodes.value, lineItems.value, lineId, material)
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
}

function onAddChild(parentId) {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  addChildParentId.value = parentId || ROOT_ID
  materialModalOpen.value = true
}

function onMaterialSelected(items) {
  const list = Array.isArray(items) ? items : [items]
  if (!list.length) return
  const parentId = addChildParentId.value || ROOT_ID
  const accepted = []
  list.forEach((material) => {
    const check = validateParentChildNotSame(
      parentId,
      material.code,
      flatNodes.value,
      lineItems.value,
      form,
    )
    if (!check.ok) {
      message.warning(`${material.name || material.code}：${check.message}`)
      return
    }
    accepted.push(material)
  })
  if (!accepted.length) return

  let nodes = flatNodes.value
  let lines = lineItems.value
  accepted.forEach((material) => {
    const result = addChildMaterial(nodes, lines, parentId, material)
    nodes = result.flatNodes
    lines = result.lineItems
  })
  flatNodes.value = nodes
  lineItems.value = lines
  selectedNodeId.value = parentId
  if (accepted.length > 1) {
    message.success(`已添加 ${accepted.length} 个子项`)
  }
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

function onDeleteLines(lineIds) {
  ;[...lineIds].forEach((lineId) => onDeleteLine(lineId))
}

function onTemplateImported(result) {
  if (result.mode === 'full') {
    Object.assign(form, result.basicInfo)
  }
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  templateRef.value = result.templateRef
  selectedNodeId.value = ROOT_ID
  message.success(
    result.mode === 'full'
      ? '已带入子级物料清单（保留当前父项，不含模板顶级物料）'
      : '已带入所选 BOM 的子级物料（保留当前根节点）',
  )
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
  if (!isBomEditable(bom)) {
    message.warning('当前状态的 BOM 不可编辑')
    router.push('/product-process/bom')
    return
  }

  const { flatNodes: nodes, lineItems: lines } = loadBomDetailStructure(bom)
  flatNodes.value = nodes
  lineItems.value = lines
  selectedNodeId.value = nodes.find((n) => n.isRoot)?.id || ROOT_ID
  templateRef.value = bom.templateRef || null
  columnSettings.value = bom.columnSettings?.length
    ? mergeColumnSettings(defaultBomColumnSettings, bom.columnSettings)
    : JSON.parse(JSON.stringify(defaultBomColumnSettings))

  editVersion.value = bom.version || ''
  editBomStatus.value = bom.status || ''
  form.bomNo = bom.bomNo
  form.bomName = bom.bomName
  form.bomType = bom.bomType === '基础BOM' ? '基准BOM' : bom.bomType || '基准BOM'
  form.itemId = `${bom.itemType}:${bom.itemId}`
  form.itemType = bom.itemType
  form.itemName = bom.itemName
  form.itemCode = bom.itemCode
  form.specModel = bom.specModel || ''
  form.material = bom.material || ''
  form.drawingNo = bom.drawingNo || ''
  form.techParams = bom.techParams || ''
  form.processRoute = bom.processRoute || undefined
  form.matchingRequirements = bom.matchingRequirements || bom.remark || ''
  applyReadonlyMasterFields(bom.itemType, bom.itemId)
}

async function handleSave() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  if (!hasRoot.value || !form.itemId) {
    message.warning('请先通过左侧树切换选择产品/物料')
    return
  }
  if (lineItems.value.some((l) => !l.materialCode)) {
    message.warning('请为所有子项选择物料')
    return
  }
  const parentChildCheck = validateAllBomParentChildLines(lineItems.value, flatNodes.value, form)
  if (!parentChildCheck.ok) {
    message.warning(parentChildCheck.message)
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
    material: form.material || '',
    drawingNo: form.drawingNo || '',
    techParams: form.techParams || '',
    processRoute: form.processRoute || '',
    matchingRequirements: form.matchingRequirements || '',
    treeNodes: flatNodes.value,
    lineItems: lineItems.value,
    templateRef: templateRef.value,
    columnSettings: columnSettings.value,
  }

  saving.value = true
  try {
    const bomId = isEditMode.value ? editBomId.value : null
    const res = saveProductBom(bomId, payload)
    if (res?.error) {
      message.warning(res.error)
      return
    }
    if (res.versionUpgraded) {
      message.success(`已生成新版本 ${res.record.version}（待发布），旧版本已归档`)
    } else if (isEditMode.value) {
      message.success('BOM 已更新')
    } else {
      message.success('BOM 已保存，状态为待发布，审核发布后方可用于生产')
    }
    if (!isEditMode.value) {
      resetNewBomState()
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
      if (!isEditMode.value) {
        resetNewBomState()
      }
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
  height: calc(100vh - 112px);
  overflow: hidden;
  background: #f5f6f8;
}

.page-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 0;
  padding: 8px;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 auto;
  min-width: 200px;
  max-width: 520px;
  height: 100%;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.bom-tree-panel) {
    flex: 1;
    min-height: 0;
    height: auto;
  }
}

.panel-resizer {
  flex: 0 0 6px;
  margin: 0 2px;
  cursor: col-resize;
  border-radius: 3px;
  position: relative;

  &:hover,
  &:active {
    background: rgba(22, 119, 255, 0.12);
  }

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 36px;
    border-radius: 1px;
    background: #d9d9d9;
  }
}

.right-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.right-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
  padding: 4px 4px 0;

  .head-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .head-actions {
    flex-shrink: 0;
  }

  .basic-summary {
    font-size: 12px;
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toggle-btn {
    padding: 0 4px;
    height: auto;
    flex-shrink: 0;
  }
}

.section-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 12px 16px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
  }
}

.info-card {
  flex-shrink: 0;
  padding: 10px 16px;

  .info-body {
    padding-top: 0;
  }

  .info-block + .info-block {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #f0f0f0;
  }

  .info-block-title {
    font-size: 13px;
    font-weight: 600;
    color: #333;
  }

  .info-block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;

    .head-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .parent-info-summary {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.inline-info-form {
  width: 100%;

  :deep(.ant-form-item) {
    margin-bottom: 8px;
    margin-right: 12px;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 12px;
    color: #666;
  }

  .full-row-item {
    display: flex;
    width: 100%;
    margin-right: 0;
  }

  .params-pair-row {
    display: flex;
    width: 100%;
    gap: 12px;
    flex-wrap: wrap;

    .pair-item {
      flex: 1;
      min-width: 280px;
      margin-right: 0;
    }
  }
}

.sidebar-expand-trigger {
  flex: 0 0 28px;
  display: flex;
  align-items: flex-start;
  padding-top: 8px;
}

.table-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.bom-material-table) {
    height: 100%;
  }
}

.basic-form {
  width: 100%;
}

@media (max-width: 992px) {
  .page-body {
    flex-direction: column;
  }

  .left-panel {
    flex: none;
    width: 100% !important;
    max-width: none;
    min-height: 240px;
  }

  .panel-resizer {
    display: none;
  }
}
</style>
