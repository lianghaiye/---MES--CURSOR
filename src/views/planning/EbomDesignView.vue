<template>
  <div class="ebom-design-page">
    <div class="page-sticky-head">
      <div class="head-left">
        <a-tooltip :title="leftSidebarCollapsed ? '展开结构树' : '收起结构树'">
          <a-button type="text" size="small" class="head-tree-toggle-btn" @click="toggleLeft">
            <MenuUnfoldOutlined v-if="leftSidebarCollapsed" />
            <MenuFoldOutlined v-else />
          </a-button>
        </a-tooltip>
        <span class="page-title">{{ pageHeadTitle }}</span>
        <span v-if="!basicInfoExpanded" class="basic-summary">{{ basicInfoSummary }}</span>
      </div>
      <a-space class="head-actions" :size="8">
        <a-button type="link" size="small" class="toggle-btn" @click="toggleBasicInfo">
          {{ basicInfoExpanded ? '收起信息' : '展开信息' }}
          <UpOutlined v-if="basicInfoExpanded" />
          <DownOutlined v-else />
        </a-button>
        <a-button v-if="showSalesOrderButton" @click="salesOrderDrawerOpen = true">
          查看销售订单
        </a-button>
        <a-button type="primary" :disabled="!hasRoot" @click="overviewModalOpen = true">
          概览
        </a-button>
        <a-button :disabled="!hasRoot" @click="printModalOpen = true">
          <PrinterOutlined />
          打印
        </a-button>
        <a-button type="primary" :loading="saving" @click="handleSaveDraft">
          <SaveOutlined />
          保存为草稿
        </a-button>
        <a-button type="primary" ghost :loading="saving" @click="handleSaveAndSubmit">
          保存并提交
        </a-button>
        <a-button @click="handleCancel">
          <CloseOutlined />
          取消
        </a-button>
      </a-space>
    </div>

    <div class="page-body">
      <aside
        v-show="!leftSidebarCollapsed"
        class="left-panel"
        :style="{ width: `${leftPanelWidth}px` }"
      >
        <BomTreePanel
          hide-import-template
          :flat-nodes="flatNodes"
          :line-items="lineItems"
          :selected-node-id="selectedNodeId"
          :template-ref="templateRef"
          :root-meta="rootMeta"
          :hide-switch-product="true"
          @add-child="onAddChild"
          @delete-node="onDeleteNode"
          @select-node="selectedNodeId = $event"
        />
      </aside>
      <div
        v-show="!leftSidebarCollapsed"
        class="panel-resizer"
        @mousedown.prevent="onResizeMouseDown"
      />

      <main class="right-panel">
        <div v-show="basicInfoExpanded" class="section-card info-card">
          <div class="info-body">
            <div class="info-block">
              <a-form layout="inline" size="small" class="inline-info-form">
                <div class="basic-fields-grid">
                  <a-form-item label="EBOM编码" class="grid-field-item">
                    <a-input
                      v-model:value="ebomForm.ebomNo"
                      placeholder="不填则保存时自动生成"
                      allow-clear
                      class="field-control"
                    />
                  </a-form-item>
                  <a-form-item label="EBOM名称" class="grid-field-item">
                    <a-input
                      v-model:value="ebomForm.ebomName"
                      placeholder="请输入 EBOM 名称"
                      allow-clear
                      class="field-control"
                    />
                  </a-form-item>
                  <a-form-item label="BOM类型" class="grid-field-item">
                    <a-input :value="EBOM_TYPE_VALUE" disabled class="field-control" />
                  </a-form-item>
                  <a-form-item v-if="baselineLabel" label="骨架来源" class="grid-field-item">
                    <a-input :value="baselineLabel" disabled class="field-control" />
                  </a-form-item>
                </div>
              </a-form>
            </div>

            <div class="info-block">
              <BomRootProductEditor
                :readonly="true"
                :can-change-item="false"
                item-type="product"
                :item-id="rootItemId"
                :item-name="parentForm.itemName"
                :item-code="parentForm.itemCode"
                :spec-model="parentForm.specModel"
                :material="parentForm.material"
                :drawing-no="parentForm.drawingNo"
                :process-route="parentForm.processRoute"
                :tech-params="parentForm.techParams"
                :matching-requirements="parentForm.matchingRequirements"
                :process-route-opts="processRouteOpts"
                @open-detail="openRootItemDetail"
              />
            </div>
          </div>
        </div>

        <div class="section-card table-section">
          <BomMaterialTable
            :flat-nodes="flatNodes"
            :line-items="lineItems"
            :column-settings="columnSettings"
            :context-node-id="selectedNodeId"
            :root-item-label="rootItemLabel"
            :summary-meta="materialSummaryMeta"
            :hide-switch-product="true"
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
            @item-name-change="onItemNameChange"
            @bom-ref-descendant-edit="onBomRefDescendantEdit"
            @configure-variant="openVariantConfig"
            @select-node="selectedNodeId = $event"
            @import-template="templateModalOpen = true"
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
    <SelectBomMaterialModal
      v-model:open="materialModalOpen"
      :include-spu-templates="true"
      :spu-can-sell-only="false"
      @selected="onMaterialSelected"
    />
    <ConfigureSalesSpuVariantModal
      v-model:open="variantConfigOpen"
      :spu-id="variantConfigSpuId"
      :initial-variant-values="variantConfigInitialValues"
      confirm-text="确定"
      @confirm="onVariantConfigConfirm"
    />
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
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  UpOutlined,
  DownOutlined,
  PrinterOutlined,
  SaveOutlined,
  CloseOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue'
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
import { useBomSplitLayout } from '@/composables/useBomSplitLayout'
import { useSpuVariantConfig } from '@/composables/useSpuVariantConfig'
import {
  applyMaterialToLine,
  createEmptySubLine,
  applyResolvedSkuToBomLineInTree,
} from '@/utils/bomLineMaterial'
import {
  createRootTreeNode,
  addChildMaterial,
  deleteTreeNode,
  reorderLinesForTreeNode,
  reorderSiblingLinesByIds,
  ROOT_ID,
  getRootTreeId,
  normalizeFlatNodesWithRoot,
  stripLineTreeChildren,
} from '@/utils/bomTree'
import { importBomByReference, expandActiveBomOneLevelUnderLine } from '@/utils/bomImport'
import {
  detachChildBomRefForDescendantEdit,
  detachChildBomRefForTreeNodeEdit,
} from '@/utils/bomChildRefDetach'
import { validateParentChildNotSame } from '@/utils/bomValidation'
import { validateLinesSkuResolved, lineVariantSummary } from '@/utils/spuLineResolve'
import { findInvalidBlankSizeLine } from '@/utils/bomBlankSize'
import BomTreePanel from '@/views/product-process/components/BomTreePanel.vue'
import BomRootProductEditor from '@/views/product-process/components/BomRootProductEditor.vue'
import BomMaterialTable from '@/views/product-process/components/BomMaterialTable.vue'
import ImportBomTemplateModal from '@/views/product-process/components/ImportBomTemplateModal.vue'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import BomColumnSettingDrawer from '@/views/product-process/components/BomColumnSettingDrawer.vue'
import BomOverviewModal from '@/views/product-process/components/BomOverviewModal.vue'
import BomPrintModal from '@/views/product-process/components/BomPrintModal.vue'
import DesignTaskSalesOrderDrawer from '@/views/planning/components/DesignTaskSalesOrderDrawer.vue'
import ConfigureSalesSpuVariantModal from '@/views/sales/components/ConfigureSalesSpuVariantModal.vue'

const route = useRoute()
const router = useRouter()
const { closeTab, openTab } = useTabs()
const {
  variantConfigOpen,
  variantConfigSpuId,
  variantConfigInitialValues,
  variantConfigTargetLine,
  openVariantConfig,
} = useSpuVariantConfig()

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

const { leftSidebarCollapsed, leftPanelWidth, toggleLeft, onResizeMouseDown } = useBomSplitLayout({
  scopeKey: 'ebom-design',
})

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

const pageHeadTitle = computed(() => {
  const productName = parentForm.itemName || ebomForm.ebomName || '—'
  return `EBOM设计 / ${productName}`
})

const rootItemId = computed(() => String(task.value?.productId || ''))

const rootItemLabel = computed(() => {
  const parts = [parentForm.itemCode, parentForm.itemName].filter(Boolean)
  return parts.length ? parts.join(' ') : ebomForm.ebomName || ''
})

const materialSummaryMeta = computed(() => ({
  version: ebomRecord.value?.version || 'V1.0',
  effectiveAt: '—',
  creator: task.value?.designer || task.value?.creator || '—',
}))

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

const hasRoot = computed(() => flatNodes.value.some((n) => n.isRoot))

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

function openRootItemDetail() {
  const id = rootItemId.value
  if (!id) {
    message.info('当前设计任务未关联产品主数据')
    return
  }
  const path = `/product-process/products/${id}/edit`
  openTab(path, parentForm.itemName || '产品详情')
}

function maybeDetachChildBomRef(editedLineId, parentTreeNodeId) {
  const result = editedLineId
    ? detachChildBomRefForDescendantEdit(flatNodes.value, lineItems.value, editedLineId)
    : detachChildBomRefForTreeNodeEdit(flatNodes.value, lineItems.value, parentTreeNodeId)
  return result.detached
}

function onBomRefDescendantEdit({ lineId, lineIds }) {
  if (lineIds?.length) {
    lineIds.forEach((id) => maybeDetachChildBomRef(id))
    return
  }
  if (lineId) maybeDetachChildBomRef(lineId)
}

function refreshLines() {
  lineItems.value = [...lineItems.value]
}

function buildPayload() {
  syncRootFromParentForm()
  stripLineTreeChildren(lineItems.value)
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
  const skuCheck = validateLinesSkuResolved(lineItems.value)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return false
  }
  if (lineItems.value.some((l) => !l.materialCode)) {
    message.warning('请为所有子项选择物料')
    return false
  }
  const vlCheck = findInvalidBlankSizeLine(lineItems.value)
  if (!vlCheck.ok) {
    message.warning(vlCheck.message)
    return false
  }
  return true
}

function handleSaveDraft() {
  if (!ebomRecord.value) return
  saving.value = true
  try {
    const payload = buildPayload()
    const res = saveEbomDraft(ebomRecord.value.id, payload)
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
  if (!hasRoot.value) {
    message.warning('请先确认根产品')
    return
  }
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  maybeDetachChildBomRef(null, parentId)
  lineItems.value = [...lineItems.value, createEmptySubLine(parentId)]
}

function onDeleteLine(lineId) {
  lineItems.value = lineItems.value.filter((l) => l.id !== lineId)
}

function onDeleteLines(ids) {
  lineItems.value = lineItems.value.filter((l) => !ids.includes(l.id))
}

function onReorderLines({ fromIndex, toIndex, fromLineId, toLineId, parentTreeId }) {
  const result =
    fromLineId && toLineId
      ? reorderSiblingLinesByIds(lineItems.value, flatNodes.value, fromLineId, toLineId)
      : reorderLinesForTreeNode(
          lineItems.value,
          flatNodes.value,
          parentTreeId || selectedNodeId.value,
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
  const wasEmpty = !String(line?.materialCode || '').trim()
  if (!wasEmpty) {
    maybeDetachChildBomRef(lineId)
  }
  let result = applyMaterialToLine(flatNodes.value, lineItems.value, lineId, material)
  const isSpuPick = material?.pickType === 'spu' || material?.isSpuTemplate
  if (wasEmpty && !isSpuPick) {
    result = expandActiveBomOneLevelUnderLine(
      result.flatNodes,
      result.lineItems,
      lineId,
      material,
      line?.unitQty ?? 1,
    )
  }
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  if (isSpuPick) {
    message.success('已添加产品族，请点击规格型号 / 材质 / 变体属性完成配置')
  } else if (wasEmpty && result.expanded && result.hasChildren) {
    message.success('已自动带入子件 BOM 下级')
  } else if (wasEmpty && result.expanded) {
    message.success('已关联子件 BOM')
  }
}

function onItemNameChange({ lineId, itemName }) {
  const line = lineItems.value.find((l) => l.id === lineId)
  if (!line?.treeNodeId) return
  const title =
    `${line.materialCode || ''} ${itemName || ''}`.trim() || line.materialCode || '未命名'
  flatNodes.value = flatNodes.value.map((n) => (n.id === line.treeNodeId ? { ...n, title } : n))
}

function onVariantConfigConfirm(payload) {
  const { resolved, variantValues } = payload || {}
  if (!resolved?.sku) {
    message.warning('未匹配到 SKU')
    return
  }
  const target = variantConfigTargetLine.value
  if (!target) {
    message.warning('未找到待配置的明细行')
    return
  }
  const dup = lineItems.value.some(
    (line) => line.id !== target.id && line.materialCode === resolved.productCode,
  )
  if (dup) {
    message.warning(`子项编码「${resolved.productCode}」已在明细中`)
    return
  }
  const parentId = target.parentTreeId || getRootTreeId(flatNodes.value) || ROOT_ID
  const check = validateParentChildNotSame(
    parentId,
    resolved.productCode,
    flatNodes.value,
    lineItems.value,
    parentForm,
  )
  if (!check.ok) {
    message.warning(check.message)
    return
  }
  const result = applyResolvedSkuToBomLineInTree(
    flatNodes.value,
    lineItems.value,
    target.id,
    resolved,
  )
  if (!result.ok) {
    message.warning('更新变体失败')
    return
  }
  flatNodes.value = result.flatNodes
  lineItems.value = result.lineItems
  if (result.line) {
    result.line.variantValues = { ...(variantValues || resolved.variantValues || {}) }
    result.line.variantSummary = lineVariantSummary(result.line)
  }
  message.success('变体已配置')
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
      parentForm,
    )
    if (!check.ok) {
      message.warning(check.message)
      return
    }
    accepted.push(material)
  })
  if (!accepted.length) return

  let nodes = flatNodes.value
  let lines = lineItems.value
  let spuAdded = 0
  accepted.forEach((material) => {
    const result = addChildMaterial(nodes, lines, parentId, material)
    nodes = result.flatNodes
    lines = result.lineItems
    if (material?.pickType === 'spu' || material?.isSpuTemplate) spuAdded += 1
  })
  flatNodes.value = nodes
  lineItems.value = lines
  addChildParentId.value = ''
  if (spuAdded) {
    message.success(`已添加 ${spuAdded} 个产品族，请点击规格型号 / 材质 / 变体属性完成配置`)
  } else if (accepted.length > 1) {
    message.success(`已添加 ${accepted.length} 个子项`)
  }
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

onMounted(() => {
  loadPage()
})
</script>

<style lang="less" scoped>
.ebom-design-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  height: calc(100% + 24px);
  max-height: calc(100% + 24px);
  overflow: hidden;
  background: #f5f6f8;
}

.page-sticky-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

  .head-left {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
  }

  .head-tree-toggle-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    padding: 0;
    color: rgba(0, 0, 0, 0.65);
  }

  .page-title {
    flex-shrink: 0;
    font-size: 14px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
    white-space: nowrap;
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

.page-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  padding: 8px;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 auto;
  align-self: stretch;
  height: 100%;
  min-height: 0;
  min-width: 200px;
  max-width: 520px;
  overflow: hidden;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 10px;
  display: flex;
  flex-direction: column;

  :deep(.bom-tree-panel) {
    flex: 1;
    height: 100%;
    min-height: 0;
  }
}

.panel-resizer {
  flex: 0 0 6px;
  align-self: stretch;
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
  height: 100%;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
}

.inline-info-form {
  width: 100%;

  .basic-fields-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px 12px;
    width: 100%;
    align-items: flex-start;
  }

  .grid-field-item {
    margin-right: 0;
    margin-bottom: 0;
    min-width: 0;

    :deep(.ant-form-item-row) {
      flex-wrap: nowrap;
      width: 100%;
    }

    :deep(.ant-form-item-label) {
      flex: 0 0 auto;
      max-width: none;
    }

    :deep(.ant-form-item-control) {
      flex: 1;
      min-width: 0;
    }

    :deep(.ant-form-item-control-input) {
      width: 100%;
    }
  }

  .field-control {
    width: 100%;
  }

  :deep(.ant-form-item) {
    margin-bottom: 8px;
    margin-right: 12px;
  }

  :deep(.ant-form-item-label > label) {
    font-size: 12px;
    color: #666;
  }
}

@media (max-width: 1200px) {
  .inline-info-form .basic-fields-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.table-section {
  flex: 1;
  display: flex;
  flex-direction: column;

  :deep(.bom-material-table) {
    height: auto;
  }
}
</style>
