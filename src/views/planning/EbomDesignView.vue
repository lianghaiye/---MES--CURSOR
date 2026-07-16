<template>
  <div class="ebom-design-page">
    <div class="page-body">
      <aside class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
        <BomTreePanel
          :flat-nodes="flatNodes"
          :line-items="lineItems"
          :selected-node-id="selectedNodeId"
          :template-ref="templateRef"
          :root-meta="rootMeta"
          hide-switch-product
          @import-template="templateModalOpen = true"
          @add-child="onAddChild"
          @delete-node="onDeleteNode"
          @select-node="selectedNodeId = $event"
        />
      </aside>
      <div class="panel-resizer" @mousedown.prevent="onResizeMouseDown" />
      <main class="right-panel">
        <div class="right-panel-head">
          <div class="head-left">
            <span v-if="!basicInfoExpanded" class="basic-summary">{{ basicInfoSummary }}</span>
          </div>
          <a-space class="head-actions" wrap>
            <a-button type="link" size="small" class="toggle-btn" @click="toggleBasicInfo">
              {{ basicInfoExpanded ? '收起信息' : '展开信息' }}
              <UpOutlined v-if="basicInfoExpanded" />
              <DownOutlined v-else />
            </a-button>
            <a-button v-if="showSalesOrderButton" size="small" @click="salesOrderDrawerOpen = true">
              查看销售订单
            </a-button>
            <a-button
              type="primary"
              :disabled="!hasRoot"
              size="small"
              @click="overviewModalOpen = true"
            >
              概览
            </a-button>
            <a-button :disabled="!hasRoot" size="small" @click="printModalOpen = true">
              <PrinterOutlined />
              打印
            </a-button>
            <a-button size="small" @click="handleCancel">取消</a-button>
            <a-button size="small" :loading="saving" @click="handleSaveDraft">保存为草稿</a-button>
            <a-button type="primary" size="small" :loading="saving" @click="handleSaveAndSubmit">
              保存并提交
            </a-button>
          </a-space>
        </div>

        <div v-show="basicInfoExpanded" class="section-card info-card">
          <div class="info-body">
            <div class="info-block">
              <a-form layout="inline" size="small" class="inline-info-form">
                <a-form-item label="EBOM编码">
                  <a-input
                    v-model:value="ebomForm.ebomNo"
                    placeholder="不填则保存时自动生成"
                    allow-clear
                    style="width: 180px"
                  />
                </a-form-item>
                <a-form-item label="EBOM名称">
                  <a-input
                    v-model:value="ebomForm.ebomName"
                    placeholder="请输入 EBOM 名称"
                    allow-clear
                    style="width: 220px"
                  />
                </a-form-item>
                <a-form-item label="BOM类型">
                  <a-input :value="EBOM_TYPE_VALUE" disabled style="width: 140px" />
                </a-form-item>
              </a-form>
            </div>

            <div class="info-block">
              <div class="info-block-title">父项产品信息</div>
              <a-form layout="inline" size="small" class="inline-info-form">
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
          </div>
        </div>

        <div class="section-card table-section">
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
    <BomOverviewModal
      v-model:open="overviewModalOpen"
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      :root-item-name="parentForm.itemName"
      :overview-info="overviewInfo"
    />
    <BomPrintModal
      v-model:open="printModalOpen"
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      :root-item-name="parentForm.itemName"
      :overview-info="overviewInfo"
    />
    <DesignTaskSalesOrderDrawer v-model:open="salesOrderDrawerOpen" :task="task" />
  </div>
</template>

<script>
export default { name: 'EbomDesignView' }
</script>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { UpOutlined, DownOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { defaultBomColumnSettings, EBOM_TYPE_VALUE } from '@/mock/bomMaterialColumns'
import { DESIGN_TASK_SOURCE } from '@/constants/designTask'
import { productInfoState } from '@/store/productInfoStore'
import { processRouteState } from '@/store/processRouteStore'
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
  generateEbomNo,
} from '@/store/ebomStore'
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
import BomOverviewModal from '@/views/product-process/components/BomOverviewModal.vue'
import BomPrintModal from '@/views/product-process/components/BomPrintModal.vue'
import DesignTaskSalesOrderDrawer from '@/views/planning/components/DesignTaskSalesOrderDrawer.vue'

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
const overviewModalOpen = ref(false)
const printModalOpen = ref(false)
const salesOrderDrawerOpen = ref(false)
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))
const basicInfoExpanded = ref(true)

const ebomForm = reactive({
  ebomNo: '',
  ebomName: '',
})

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
  const src =
    ebomRecord.value.baselineSource === 'spu_template' ||
    ebomRecord.value.templateRef?.source === 'spu_template'
      ? '族模板'
      : '基准骨架'
  return `${src} ${ebomRecord.value.baselineBomNo || ebomRecord.value.baselineBomId}`
})

const showSalesOrderButton = computed(() => {
  const t = task.value
  if (!t?.salesOrderNo) return false
  return t.source !== DESIGN_TASK_SOURCE.MANUAL
})

const basicInfoSummary = computed(() => {
  const parts = [ebomForm.ebomName, parentForm.itemName, baselineLabel.value].filter(Boolean)
  return parts.length ? parts.join(' · ') : '请填写 EBOM 基础信息'
})

const overviewInfo = computed(() => ({
  bomNo: ebomForm.ebomNo || '—',
  specModel: parentForm.specModel || '—',
  version: ebomRecord.value?.version || 'V1.0',
  material: parentForm.material || '—',
  drawingNo: parentForm.drawingNo || '—',
  techParams: parentForm.techParams || '—',
  matchingRequirements: parentForm.matchingRequirements || '—',
}))

const rootMeta = computed(() => {
  const rootId = getRootTreeId(flatNodes.value)
  return {
    code: parentForm.itemCode || task.value?.productCode || '',
    name: parentForm.itemName || task.value?.productName || '',
    specModel: parentForm.specModel || task.value?.specModel || '',
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

function resolveEbomNoForSave() {
  const trimmed = String(ebomForm.ebomNo || '').trim()
  if (trimmed) return trimmed
  const generated = generateEbomNo()
  ebomForm.ebomNo = generated
  return generated
}

function toggleBasicInfo() {
  basicInfoExpanded.value = !basicInfoExpanded.value
}

watch(
  () => [parentForm.itemName, parentForm.itemCode, parentForm.specModel],
  () => {
    if (!hasRoot.value) return
    syncRootFromParentForm()
  },
)

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
  const ebom = ensureEbomDraftForDesignTask(t, product)
  if (!t.hasEbomDraft) {
    if (ebom.baselineSource === 'spu_template') {
      message.info('已从产品族 BOM 模板带入骨架，请按本 SKU 调整后提交')
    } else if (!ebom.baselineBomId) {
      message.info('该产品未关联自有 BOM / 族模板，将从空白结构开始设计')
    }
  }
  ebomRecord.value = ebom
  ebomForm.ebomNo = ebom.ebomNo || ''
  ebomForm.ebomName = ebom.ebomName || `${t.productName || product?.name || '定制产品'} EBOM`
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
    ebomNo: resolveEbomNoForSave(),
    ebomName: ebomForm.ebomName,
    bomType: EBOM_TYPE_VALUE,
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

.right-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #fff;
  border-radius: 4px;
  padding: 12px 16px;
  overflow: hidden;
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

    .toggle-btn {
      padding: 0 4px;
      height: auto;
      flex-shrink: 0;
    }
  }
}

.parent-info-section {
  flex-shrink: 0;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px dashed #f0f0f0;
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
</style>
