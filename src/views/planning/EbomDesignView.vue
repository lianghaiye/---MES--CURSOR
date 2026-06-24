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

    <a-alert
      v-if="baselineLabel"
      type="info"
      show-icon
      class="baseline-tip"
      message="已从基准 BOM 骨架复制结构，请在此基础上微调；保存结果写入 EBOM，不会回写产品 BOM。"
    />

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
      </main>
    </div>

    <ImportBomTemplateModal
      v-model:open="templateModalOpen"
      :has-root="true"
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
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import { productInfoState } from '@/store/productInfoStore'
import {
  findDesignTaskById,
  onDesignTaskEbomDraftSaved,
  onDesignTaskEbomSubmitted,
  canOpenEbomDesign,
} from '@/store/designTaskStore'
import {
  ensureEbomDraftForDesignTask,
  saveEbomDraft,
  finalizeEbom,
} from '@/store/ebomStore'
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
} from '@/utils/bomTree'
import { importBomByReference } from '@/utils/bomImport'
import { validateParentChildNotSame } from '@/utils/bomValidation'
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

const formStub = computed(() => ({
  itemType: 'product',
  itemCode: task.value?.productCode || '',
  itemName: task.value?.productName || '',
}))

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
  flatNodes.value = JSON.parse(JSON.stringify(ebom.treeNodes || []))
  lineItems.value = JSON.parse(JSON.stringify(ebom.lineItems || []))
  templateRef.value = ebom.templateRef ? { ...ebom.templateRef } : null
  columnSettings.value = JSON.parse(
    JSON.stringify(ebom.columnSettings?.length ? ebom.columnSettings : defaultBomColumnSettings),
  )
  if (!flatNodes.value.length) {
    flatNodes.value = [
      createRootTreeNode({
        code: t.productCode,
        name: t.productName,
        specModel: t.specModel,
      }),
    ]
  }
  selectedNodeId.value = getRootTreeId(flatNodes.value)
}

function buildPayload() {
  return {
    ebomName: ebomRecord.value?.ebomName || `${task.value?.productName} EBOM`,
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
    formStub.value,
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
      formStub.value,
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
    formStub.value,
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
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  templateRef.value = result.templateRef || null
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
  min-height: calc(100vh - 112px);
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

.baseline-tip {
  margin: 8px 12px 0;
}

.page-body {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 8px;
  gap: 0;
}

.left-panel {
  flex-shrink: 0;
  background: #fff;
  border-radius: 4px;
  overflow: hidden;
}

.panel-resizer {
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
}

.right-panel {
  flex: 1;
  min-width: 0;
  background: #fff;
  border-radius: 4px;
  overflow: auto;
}
</style>
