<template>
  <div class="ebom-design-page">
    <div class="page-head">
      <div class="head-info">
        <h2 class="page-title">EBOM 设计 · {{ task?.taskNo }}</h2>
        <p class="page-sub">
          {{ task?.productName }}（{{ task?.productCode }}）
          <a-tag v-if="baselineLabel" color="blue">{{ baselineLabel }}</a-tag>
        </p>
      </div>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button :loading="saving" @click="handleSaveDraft">保存为草稿</a-button>
        <a-button type="primary" :loading="saving" @click="handleSaveAndSubmit">
          保存并提交
        </a-button>
      </a-space>
    </div>

    <div class="page-body">
      <aside class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
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
        />
      </aside>
      <div class="panel-resizer" @mousedown.prevent="onResizeMouseDown" />
      <main class="right-panel">
        <div class="parent-info-section">
          <div class="parent-info-head">
            <div class="head-left">
              <span class="info-block-title">父项产品信息</span>
              <span v-if="!parentInfoExpanded" class="parent-info-summary">{{
                parentInfoSummary
              }}</span>
            </div>
            <a-button type="link" size="small" class="toggle-btn" @click="toggleParentInfo">
              {{ parentInfoExpanded ? '收起信息' : '展开信息' }}
              <UpOutlined v-if="parentInfoExpanded" />
              <DownOutlined v-else />
            </a-button>
          </div>
          <a-form v-show="parentInfoExpanded" layout="inline" size="small" class="inline-info-form">
            <a-form-item label="物品名称">
              <a-input
                v-if="isSelectedRoot"
                v-model:value="parentForm.itemName"
                allow-clear
                style="width: 180px"
              />
              <a-input
                v-else
                :value="selectedParentInfo.itemName || '—'"
                disabled
                style="width: 180px"
              />
            </a-form-item>
            <a-form-item label="规格型号">
              <a-input
                v-if="isSelectedRoot"
                v-model:value="parentForm.specModel"
                allow-clear
                style="width: 140px"
              />
              <a-input
                v-else
                :value="selectedParentInfo.specModel || '—'"
                disabled
                style="width: 140px"
              />
            </a-form-item>
            <a-form-item label="材质">
              <a-input
                v-if="isSelectedRoot"
                v-model:value="parentForm.material"
                allow-clear
                style="width: 120px"
              />
              <a-input
                v-else
                :value="selectedParentInfo.material || '—'"
                disabled
                style="width: 120px"
              />
            </a-form-item>
            <a-form-item label="图号">
              <a-input
                v-if="isSelectedRoot"
                v-model:value="parentForm.drawingNo"
                allow-clear
                style="width: 140px"
              />
              <a-input
                v-else
                :value="selectedParentInfo.drawingNo || '—'"
                disabled
                style="width: 140px"
              />
            </a-form-item>
            <a-form-item label="工艺路线">
              <a-select
                v-if="isSelectedRoot"
                v-model:value="parentForm.processRoute"
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
                  v-model:value="parentForm.techParams"
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
                  v-if="isSelectedRoot"
                  v-model:value="parentForm.matchingRequirements"
                  placeholder="请输入配套要求"
                  allow-clear
                  :rows="3"
                  style="width: 100%"
                />
                <a-textarea
                  v-else
                  :value="selectedParentInfo.matchingRequirements || '—'"
                  disabled
                  :rows="3"
                  style="width: 100%"
                />
              </a-form-item>
            </div>
          </a-form>
        </div>

        <div class="table-section">
          <BomMaterialTable
            :lines="displayLines"
            :column-settings="columnSettings"
            empty-variant="no-children"
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
    <BomColumnSettingDrawer v-model:open="columnDrawerOpen" v-model:settings="columnSettings" />
  </div>
</template>

<script>
export default { name: 'EbomDesignView' }
</script>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { UpOutlined, DownOutlined } from '@ant-design/icons-vue'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import { productInfoState } from '@/store/productInfoStore'
import { processRouteState } from '@/store/processRouteStore'
import {
  findDesignTaskById,
  onDesignTaskEbomDraftSaved,
  onDesignTaskEbomSubmitted,
  canOpenEbomDesign,
} from '@/store/designTaskStore'
import { ensureEbomDraftForDesignTask, saveEbomDraft, finalizeEbom } from '@/store/ebomStore'
import { getBaselineBomForProduct } from '@/store/productBomStore'
import { useTabs } from '@/composables/useTabs'
import { applyMaterialToLine, createEmptySubLine } from '@/utils/bomLineMaterial'
import {
  createRootTreeNode,
  getLinesForTreeNode,
  deleteTreeNode,
  reorderLinesForTreeNode,
  ROOT_ID,
  getRootTreeId,
  normalizeFlatNodesWithRoot,
} from '@/utils/bomTree'
import { importBomByReference } from '@/utils/bomImport'
import { validateParentChildNotSame } from '@/utils/bomValidation'
import { resolveBomNodeItemInfo } from '@/utils/bomTreeDisplay'
import BomTreePanel from '@/views/product-process/components/BomTreePanel.vue'
import BomMaterialTable from '@/views/product-process/components/BomMaterialTable.vue'
import ImportBomTemplateModal from '@/views/product-process/components/ImportBomTemplateModal.vue'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import BomColumnSettingDrawer from '@/views/product-process/components/BomColumnSettingDrawer.vue'

const route = useRoute()
const router = useRouter()
const { closeTab } = useTabs()

const designTaskId = computed(() => String(route.params.taskId || ''))
const pageTabPath = computed(() => `/planning/design-task/${designTaskId.value}/ebom`)

const task = ref(null)
const ebomRecord = ref(null)
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
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))
const parentInfoExpanded = ref(true)

const parentForm = reactive({
  itemName: '',
  itemCode: '',
  specModel: '',
  material: '',
  drawingNo: '',
  techParams: '',
  processRoute: undefined,
  matchingRequirements: '',
})

const leftPanelWidth = ref(280)
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 520
let resizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const baselineLabel = computed(() => {
  if (!ebomRecord.value?.baselineBomId) return ''
  return `基准骨架 ${ebomRecord.value.baselineBomNo || ebomRecord.value.baselineBomId}`
})

const rootMeta = computed(() => {
  const rootId = getRootTreeId(flatNodes.value)
  return {
    code: task.value?.productCode || '',
    name: task.value?.productName || '',
    specModel: task.value?.specModel || '',
    supplyForm: '',
    subItemCount: lineItems.value.filter((l) => l.parentTreeId === rootId).length,
  }
})

const displayLines = computed(() =>
  getLinesForTreeNode(lineItems.value, selectedNodeId.value, flatNodes.value),
)

const selectedNode = computed(() => {
  const id = selectedNodeId.value || getRootTreeId(flatNodes.value)
  return flatNodes.value.find((n) => n.id === id) || flatNodes.value.find((n) => n.isRoot) || null
})

const isSelectedRoot = computed(() => !selectedNode.value || selectedNode.value.isRoot)

const hasRoot = computed(() => flatNodes.value.some((n) => n.isRoot))

const selectedParentInfo = computed(() =>
  resolveBomNodeItemInfo(selectedNode.value, lineItems.value, parentForm),
)

const parentInfoSummary = computed(() => {
  const info = selectedParentInfo.value
  const parts = [info?.itemName, info?.specModel].filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
})

function toggleParentInfo() {
  parentInfoExpanded.value = !parentInfoExpanded.value
}

const processRouteOpts = computed(() =>
  (processRouteState.routes || [])
    .filter((r) => r.status === '使用中')
    .map((r) => ({
      label: `${r.code} ${r.name}`,
      value: r.name,
    })),
)

function filterRoute(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

function applyParentFormFromProduct(taskRow, product, ebom) {
  parentForm.itemName = taskRow.productName || product?.name || ''
  parentForm.itemCode = taskRow.productCode || product?.code || ''
  parentForm.specModel = taskRow.specModel || product?.specModel || ''
  parentForm.material = ebom?.material || product?.material || ''
  parentForm.drawingNo = ebom?.drawingNo || product?.drawingNo || ''
  parentForm.techParams = ebom?.techParams ?? product?.techParams ?? ''
  parentForm.processRoute =
    ebom?.processRoute ?? product?.production?.defaultProcessRoute ?? undefined
  parentForm.matchingRequirements =
    ebom?.matchingRequirements || product?.matchingRequirements || product?.remark || ''
}

function loadPage() {
  const t = findDesignTaskById(designTaskId.value)
  if (!t) {
    message.error('设计任务不存在')
    router.replace('/planning/design-task')
    return
  }
  if (!canOpenEbomDesign(t)) {
    message.warning('当前设计任务状态不可编辑 EBOM')
    router.replace('/planning/design-task')
    return
  }
  task.value = t
  const product = productInfoState.products.find((p) => p.id === t.productId)
  const baseline = getBaselineBomForProduct(t.productId)
  if (!baseline && !t.hasEbomDraft) {
    message.info('该产品未关联基准 BOM，将从空白结构开始设计')
  }
  const ebom = ensureEbomDraftForDesignTask(t, product)
  ebomRecord.value = ebom
  applyParentFormFromProduct(t, product, ebom)
  flatNodes.value = normalizeFlatNodesWithRoot(JSON.parse(JSON.stringify(ebom.treeNodes || [])), {
    itemCode: parentForm.itemCode || t.productCode,
    itemName: parentForm.itemName || t.productName,
    specModel: parentForm.specModel || t.specModel,
  })
  lineItems.value = JSON.parse(JSON.stringify(ebom.lineItems || []))
  templateRef.value = ebom.templateRef ? { ...ebom.templateRef } : null
  columnSettings.value = JSON.parse(
    JSON.stringify(ebom.columnSettings?.length ? ebom.columnSettings : defaultBomColumnSettings),
  )
  selectedNodeId.value = getRootTreeId(flatNodes.value)
}

function ensureDesignRootNode() {
  if (hasRoot.value) return
  flatNodes.value = [
    createRootTreeNode({
      itemCode: parentForm.itemCode || task.value?.productCode,
      itemName: parentForm.itemName || task.value?.productName,
      specModel: parentForm.specModel || task.value?.specModel,
    }),
  ]
  selectedNodeId.value = getRootTreeId(flatNodes.value)
}

function syncRootFromParentForm() {
  const rootId = getRootTreeId(flatNodes.value)
  const title = [parentForm.itemCode, parentForm.itemName, parentForm.specModel]
    .filter(Boolean)
    .join(' ')
    .trim()
  flatNodes.value = flatNodes.value.map((n) =>
    n.id === rootId || n.isRoot ? { ...n, title: title || n.title } : n,
  )
}

function buildPayload() {
  syncRootFromParentForm()
  return {
    ebomName: ebomRecord.value?.ebomName || `${task.value?.productName} EBOM`,
    material: parentForm.material,
    drawingNo: parentForm.drawingNo,
    techParams: parentForm.techParams,
    processRoute: parentForm.processRoute || '',
    matchingRequirements: parentForm.matchingRequirements,
    treeNodes: flatNodes.value,
    lineItems: lineItems.value,
    templateRef: templateRef.value,
    columnSettings: columnSettings.value,
  }
}

function validateForSubmit() {
  const rootId = getRootTreeId(flatNodes.value)
  const subs = lineItems.value.filter((l) => l.parentTreeId === rootId)
  if (!subs.length) {
    message.warning('请至少添加一条子项后再提交')
    return false
  }
  if (lineItems.value.some((l) => !l.materialCode)) {
    message.warning('请为所有子项选择物料')
    return false
  }
  return true
}

function handleSaveDraft() {
  if (!ebomRecord.value) return
  saving.value = true
  try {
    const res = saveEbomDraft(ebomRecord.value.id, buildPayload())
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    onDesignTaskEbomDraftSaved(designTaskId.value, res.record)
    message.success('EBOM 草稿已保存，设计任务状态：设计中')
  } finally {
    saving.value = false
  }
}

function handleSaveAndSubmit() {
  if (!validateForSubmit()) return
  Modal.confirm({
    title: '保存并提交',
    content: '提交后 EBOM 将定稿并进入待审核，提交时刻的结构即为最终版本。是否继续？',
    okText: '提交',
    cancelText: '取消',
    onOk: () => {
      saving.value = true
      try {
        const draftRes = saveEbomDraft(ebomRecord.value.id, buildPayload())
        if (!draftRes.ok) {
          message.warning(draftRes.message)
          return
        }
        const finalRes = finalizeEbom(ebomRecord.value.id, buildPayload())
        if (!finalRes.ok) {
          message.warning(finalRes.message)
          return
        }
        const taskRes = onDesignTaskEbomSubmitted(designTaskId.value, finalRes.record)
        if (!taskRes.ok) {
          message.warning(taskRes.message)
          return
        }
        message.success('EBOM 已定稿并提交审核')
        closeTab(pageTabPath.value)
        router.push('/planning/design-task')
      } finally {
        saving.value = false
      }
    },
  })
}

function handleCancel() {
  Modal.confirm({
    title: '确认取消',
    content: '未保存的修改将丢失，是否离开？',
    onOk: () => {
      closeTab(pageTabPath.value)
      router.push('/planning/design-task')
    },
  })
}

function onAddChild(parentId) {
  addChildParentId.value = parentId || ROOT_ID
  materialModalOpen.value = true
}

function onAddSubItem() {
  addChildParentId.value = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  materialModalOpen.value = true
}

function onAddByBom() {
  addByBomModalOpen.value = true
}

function onAddDetailLine() {
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  lineItems.value = [...lineItems.value, createEmptySubLine(parentId)]
}

function onDeleteLine(lineId) {
  lineItems.value = lineItems.value.filter((l) => l.id !== lineId)
}

function onDeleteLines(ids) {
  lineItems.value = lineItems.value.filter((l) => !ids.includes(l.id))
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
    parentForm,
  )
  if (!check.ok) {
    message.warning(check.message)
    return
  }
  const result = applyMaterialToLine(flatNodes.value, lineItems.value, lineId, material)
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
}

function onMaterialSelected(items) {
  const list = Array.isArray(items) ? items : [items]
  const parentId = addChildParentId.value || ROOT_ID
  list.forEach((material) => {
    const check = validateParentChildNotSame(
      parentId,
      material.code,
      flatNodes.value,
      lineItems.value,
      parentForm,
    )
    if (!check.ok) {
      message.warning(check.message)
      return
    }
    lineItems.value = [...lineItems.value, createEmptySubLine(parentId, material)]
  })
  addChildParentId.value = ''
}

function onAddByBomConfirm({ pickerRow, usageCoefficient }) {
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  const check = validateParentChildNotSame(
    parentId,
    pickerRow.code,
    flatNodes.value,
    lineItems.value,
    parentForm,
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
  message.success('已按 BOM 添加下级结构')
}

function onTemplateImported(result) {
  if (!result) return

  ensureDesignRootNode()

  if (!result.lineItems?.length) {
    message.warning('所选 BOM 无下级结构可导入')
    return
  }

  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  templateRef.value = result.templateRef || null
  selectedNodeId.value = getRootTreeId(flatNodes.value)
  message.success(
    result.mode === 'full'
      ? '已带入子级物料清单（保留当前父项，不含模板顶级物料）'
      : '已带入所选 BOM 的子级物料（保留当前根节点）',
  )
}

function onDeleteNode(nodeId) {
  const res = deleteTreeNode(flatNodes.value, lineItems.value, nodeId)
  flatNodes.value = res.flatNodes
  lineItems.value = res.lineItems
  selectedNodeId.value = getRootTreeId(flatNodes.value)
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
  leftPanelWidth.value = Math.min(
    MAX_LEFT_WIDTH,
    Math.max(MIN_LEFT_WIDTH, resizeStartWidth + (e.clientX - resizeStartX)),
  )
}

function onResizeMouseUp() {
  if (!resizing) return
  resizing = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onMounted(() => {
  loadPage()
  document.addEventListener('mousemove', onResizeMouseMove)
  document.addEventListener('mouseup', onResizeMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMouseMove)
  document.removeEventListener('mouseup', onResizeMouseUp)
})
</script>

<style lang="less" scoped>
.ebom-design-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  overflow: hidden;
  background: #f5f6f8;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.page-title {
  margin: 0;
  font-size: 18px;
}

.page-sub {
  margin: 4px 0 0;
  color: rgba(0, 0, 0, 0.55);
  font-size: 13px;
}

.parent-info-section {
  flex-shrink: 0;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed #f0f0f0;
}

.parent-info-head {
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

  .toggle-btn {
    padding: 0 4px;
    height: auto;
    flex-shrink: 0;
  }
}

.info-block-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
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

.page-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: 8px;
  gap: 0;
}

.left-panel {
  flex-shrink: 0;
  height: 100%;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 10px;

  :deep(.bom-tree-panel) {
    flex: 1;
    min-height: 0;
  }
}

.panel-resizer {
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
}
</style>
