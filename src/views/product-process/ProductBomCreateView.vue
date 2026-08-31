<template>
  <div class="product-bom-create-page">
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
        <a-button type="primary" :disabled="!hasRoot" @click="overviewModalOpen = true">
          概览
        </a-button>
        <a-button :disabled="!hasRoot" @click="relationOpen = true">查看关联BOM</a-button>
        <a-button type="primary" :loading="saving" @click="handleSave">
          <SaveOutlined />
          保存
        </a-button>
        <a-button type="primary" ghost :loading="saving" @click="handleSaveAndPublish">
          保存并发布
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

      <main ref="rightPanelRef" class="right-panel">
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
                <div class="basic-fields-grid">
                  <a-form-item label="BOM编码" name="bomNo" class="grid-field-item">
                    <a-input
                      v-model:value="form.bomNo"
                      placeholder="保存时自动生成"
                      :disabled="isEditMode"
                      allow-clear
                      class="field-control"
                    />
                  </a-form-item>
                  <a-form-item label="BOM名称" name="bomName" class="grid-field-item">
                    <a-input
                      v-model:value="form.bomName"
                      placeholder="请输入 BOM 名称"
                      class="field-control"
                    />
                  </a-form-item>
                  <a-form-item label="BOM类型" name="bomType" class="grid-field-item">
                    <a-select
                      v-model:value="form.bomType"
                      class="field-control"
                      :options="bomTypeSelectOptions"
                      :disabled="bomTypeLocked"
                    />
                  </a-form-item>
                  <a-form-item v-if="isEditMode" label="BOM版本" class="grid-field-item">
                    <a-input :value="editVersion || '—'" disabled class="field-control" />
                  </a-form-item>
                  <a-form-item v-else-if="!isShipBomMode" label="BOM版本" class="grid-field-item">
                    <a-input value="保存后生成" disabled class="field-control" />
                  </a-form-item>
                </div>
                <a-form-item v-if="isShipBomMode" label="适用产品" class="applicable-products-item">
                  <div class="applicable-products-field">
                    <a-button
                      size="small"
                      type="primary"
                      ghost
                      @click="applicableProductPickerOpen = true"
                    >
                      选择产品
                    </a-button>
                    <div
                      v-if="selectedApplicableProducts.length"
                      class="applicable-products-selected"
                    >
                      <a-tag
                        v-for="p in selectedApplicableProducts"
                        :key="p.id"
                        closable
                        class="applicable-product-tag"
                        @close.prevent="removeApplicableProduct(p.id)"
                      >
                        <span class="tag-code">{{ p.code || '—' }}</span>
                        <span class="tag-name">{{ p.name || '—' }}</span>
                        <span v-if="p.specModel" class="tag-spec">{{ p.specModel }}</span>
                      </a-tag>
                    </div>
                    <div v-else class="applicable-products-empty">未选择适用产品（可多选）</div>
                  </div>
                </a-form-item>
              </a-form>
            </div>

            <div v-if="!isShipBomMode" class="info-block">
              <BomRootProductEditor
                :readonly="false"
                :can-change-item="canSwitchProduct"
                :item-type="form.itemType"
                :item-id="switchSelectedId"
                :item-name="form.itemName"
                :item-code="form.itemCode"
                :spec-model="form.specModel"
                :material="form.material"
                :drawing-no="form.drawingNo"
                :process-route="form.processRoute"
                :tech-params="form.techParams"
                :matching-requirements="form.matchingRequirements"
                v-model:sync-to-master="syncToMaster"
                :process-route-opts="processRouteOpts"
                @update:item-name="onRootItemNameUpdate"
                @update:spec-model="(v) => (form.specModel = v)"
                @update:material="(v) => (form.material = v)"
                @update:drawing-no="(v) => (form.drawingNo = v)"
                @update:process-route="(v) => (form.processRoute = v)"
                @update:tech-params="(v) => (form.techParams = v)"
                @update:matching-requirements="(v) => (form.matchingRequirements = v)"
                @select-item="onRootCatalogSelected"
                @create-item="onRootItemCreate"
                @open-picker="openSwitchProduct"
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
    <SelectBomMaterialModal
      v-if="!isBaselineBomMode"
      v-model:open="switchProductOpen"
      title="选择产品/物料（SKU）"
      ecn-new-material-mode
      hide-add-material
      :multiple="false"
      @update:open="onSwitchProductOpenChange"
      @selected="onSwitchProductSelected"
    />
    <SelectSpuOnlyModal
      v-else
      v-model:open="switchProductOpen"
      title="选择产品族"
      :multiple="false"
      :can-sell-only="false"
      :require-variant-axes="false"
      :show-flat-sku-search="false"
      @selected="onSwitchSpuSelected"
    />
    <SelectBomMaterialModal
      v-if="isShipBomMode"
      v-model:open="applicableProductPickerOpen"
      title="选择适用产品"
      hide-add-material
      multiple
      picker-default-item-type="产品"
      :initial-selected-ids="form.applicableProductIds"
      @selected="onApplicableProductsSelected"
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
    <BomEnableReferenceModal
      v-model:open="enableRefOpen"
      :product-name="enableTarget?.itemName || ''"
      :bom-name="enableTarget?.bomName || ''"
      :new-version="enableNewVersion"
      :current-version="enableCurrentVersion"
      :refs="enableParentRefs"
      @confirm="onEnableRefConfirm"
    />
  </div>
</template>

<script>
export default { name: 'ProductBomCreateView' }
</script>

<script setup>
import {
  computed,
  reactive,
  ref,
  onMounted,
  onActivated,
  onDeactivated,
  watch,
  nextTick,
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import {
  SaveOutlined,
  CloseOutlined,
  UpOutlined,
  DownOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons-vue'
import {
  productInfoState,
  addProduct,
  updateProduct,
  generateProductCode,
} from '@/store/productInfoStore'
import { materialInfoState, updateMaterial } from '@/store/materialInfoStore'
import {
  generateBomNo,
  getProductBomById,
  saveProductBom,
  enableProductBom,
  isBomPending,
  productBomState,
} from '@/store/productBomStore'
import { isBomEditable, isBomActive } from '@/mock/productBomOptions'
import { findParentRefsForBomUpgrade } from '@/utils/bomVersionReference'
import {
  buildBomQuickCreateProductFields,
  buildBomQuickCreateSpuFields,
} from '@/constants/bomQuickCreateDefaults'
import { loadBomDetailStructure, importBomByReference } from '@/utils/bomImport'
import {
  defaultBomColumnSettings,
  bomTypeSelectOptions,
  BOM_TYPE,
  normalizeBomType,
  SHIP_KIT_ITEM_TYPE,
} from '@/mock/bomMaterialColumns'
import { mergeColumnSettings } from '@/utils/tableColumnSettings'
import { processRouteState } from '@/store/processRouteStore'
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
  ROOT_ID,
  isRootNode,
  getRootTreeId,
  stripLineTreeChildren,
} from '@/utils/bomTree'
import { syncRootNodeFromItem, expandActiveBomOneLevelUnderLine } from '@/utils/bomImport'
import {
  detachChildBomRefForDescendantEdit,
  detachChildBomRefForTreeNodeEdit,
  lineHasChildBomRef,
} from '@/utils/bomChildRefDetach'
import { useTabs } from '@/composables/useTabs'
import { useBomSplitLayout } from '@/composables/useBomSplitLayout'
import { useSpuVariantConfig } from '@/composables/useSpuVariantConfig'
import { findSpuById, updateSpu, addSpu, generateSpuCode } from '@/store/spuStore'
import { validateLinesSkuResolved, lineVariantSummary } from '@/utils/spuLineResolve'
import BomTreePanel from './components/BomTreePanel.vue'
import BomRootProductEditor from './components/BomRootProductEditor.vue'
import BomMaterialTable from './components/BomMaterialTable.vue'
import ImportBomTemplateModal from './components/ImportBomTemplateModal.vue'
import SelectBomMaterialModal from './components/SelectBomMaterialModal.vue'
import SelectSpuOnlyModal from './components/SelectSpuOnlyModal.vue'
import AddByBomModal from './components/AddByBomModal.vue'
import BomColumnSettingDrawer from './components/BomColumnSettingDrawer.vue'
import BomOverviewModal from './components/BomOverviewModal.vue'
import BomRelationDrawer from './components/BomRelationDrawer.vue'
import BomEnableReferenceModal from './components/BomEnableReferenceModal.vue'
import ConfigureSalesSpuVariantModal from '@/views/sales/components/ConfigureSalesSpuVariantModal.vue'
import { validateAllBomParentChildLines, validateParentChildNotSame } from '@/utils/bomValidation'
import { findInvalidBlankSizeLine } from '@/utils/bomBlankSize'
import {
  saveCreatePageDraft,
  loadCreatePageDraft,
  isCreatePageBootstrapped,
} from '@/utils/createPageDraft'

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

const isEditMode = computed(() => route.name === 'product-process-bom-edit')
const editBomId = computed(() => route.params.id)
const pageTabPath = computed(() =>
  isEditMode.value && editBomId.value
    ? `/product-process/bom/${editBomId.value}/edit`
    : '/product-process/bom/new',
)
const editVersion = ref('')
const editBomStatus = ref('')
const editEffectiveAt = ref('')
const editCreator = ref('')
const canSwitchProduct = computed(() => {
  if (!isEditMode.value) return true
  // 订单/工单引用的是 EBOM 快照，改产品 BOM 不影响在制；可编辑（待发布/生效）均可切换根产品
  return isBomEditable({ status: editBomStatus.value })
})
const basicInfoExpanded = ref(true)
const { leftSidebarCollapsed, leftPanelWidth, toggleLeft, onResizeMouseDown } = useBomSplitLayout({
  scopeKey: 'bom-editor',
})
const syncToMaster = ref(false)
const switchProductOpen = ref(false)
/** 已选根产品或用户关过选品窗：禁止再次自动弹出 */
const skipAutoProductPicker = ref(false)
const applicableProductPickerOpen = ref(false)

const formRef = ref()
const rightPanelRef = ref(null)
const saving = ref(false)
const enableRefOpen = ref(false)
const enableTarget = ref(null)
const enableParentRefs = ref([])
const enableNewVersion = ref('')
const enableCurrentVersion = ref('')
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
  bomType: BOM_TYPE.PRODUCT,
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
  /** 发运 BOM：适用产品 id 列表（多产品共用，不绑单一产品） */
  applicableProductIds: [],
})

/** 新增入口与编辑态均锁定 BOM 类型，避免产品 / 基准 / 发运 BOM 混用 */
const bomTypeLocked = computed(() => true)

const isBaselineBomMode = computed(() => form.bomType === BOM_TYPE.BASELINE)
const isShipBomMode = computed(() => form.bomType === BOM_TYPE.SHIP)

const rules = {
  bomName: [{ required: true, message: '请输入 BOM 名称' }],
}

const selectedApplicableProducts = computed(() => {
  const ids = (form.applicableProductIds || []).map(String)
  if (!ids.length) return []
  const products = productInfoState.products || []
  return ids.map((id) => {
    const p = products.find((x) => String(x.id) === id)
    return p
      ? { id: p.id, code: p.code, name: p.name, specModel: p.specModel || '' }
      : { id, code: '', name: id, specModel: '' }
  })
})

function onApplicableProductsSelected(items) {
  const rows = Array.isArray(items) ? items : [items]
  const productIds = [
    ...new Set(
      rows
        .filter((r) => r && (r.itemType === '产品' || !r.itemType))
        .map((r) => r.id)
        .filter(Boolean)
        .map(String),
    ),
  ]
  form.applicableProductIds = productIds
  applicableProductPickerOpen.value = false
}

function removeApplicableProduct(id) {
  form.applicableProductIds = (form.applicableProductIds || []).filter(
    (x) => String(x) !== String(id),
  )
}

const switchSelectedId = computed(() => {
  if (!form.itemId) return ''
  const raw = form.itemId
  return typeof raw === 'string' && raw.includes(':') ? raw.split(':')[1] : raw
})

const rootMeta = computed(() => {
  const rootId = getRootTreeId(flatNodes.value)
  if (isShipBomMode.value) {
    return {
      code: form.itemCode || '',
      name: form.bomName || form.itemName || '发运附件包',
      specModel: '',
      supplyForm: '',
      subItemCount: lineItems.value.filter((l) => l.parentTreeId === rootId).length,
    }
  }
  const master = form.itemId ? findMasterItem(form.itemType, switchSelectedId.value) : null
  return {
    code: form.itemCode,
    name: form.itemName,
    specModel: form.specModel,
    supplyForm: master?.supplyForm || '',
    subItemCount: lineItems.value.filter((l) => l.parentTreeId === rootId).length,
  }
})

/** 物料清单元信息条左侧：根产品/物料名称 */
const rootItemLabel = computed(() => {
  if (isShipBomMode.value) {
    return form.bomName || '发运附件包'
  }
  const parts = [form.itemCode, form.itemName].filter(Boolean)
  return parts.length ? parts.join(' ') : form.bomName || ''
})

const basicInfoSummary = computed(() => {
  if (isShipBomMode.value) {
    const n = (form.applicableProductIds || []).length
    const parts = [form.bomName, n ? `适用 ${n} 个产品` : '未指定适用产品'].filter(Boolean)
    return parts.join(' · ')
  }
  const parts = [form.bomName, form.itemName].filter(Boolean)
  return parts.length ? parts.join(' · ') : '请填写 BOM 基础信息'
})

const pageHeadTitle = computed(() => {
  const bomTypeLabel = form.bomType === '基础BOM' ? '基准BOM' : form.bomType || '产品BOM'
  const productName = isShipBomMode.value
    ? form.bomName || '发运附件包'
    : form.itemName || form.bomName || '—'
  return `${bomTypeLabel} / ${productName}`
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

const materialSummaryMeta = computed(() => ({
  version: editVersion.value || '—',
  effectiveAt: editEffectiveAt.value ? String(editEffectiveAt.value).split(' ')[0] : '—',
  creator: editCreator.value || '—',
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

const hasRoot = computed(() => flatNodes.value.some((n) => n.isRoot))

function findMasterItem(itemType, itemId) {
  if (itemType === 'spu') {
    return findSpuById(itemId)
  }
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
  form.matchingRequirements = master.matchingRequirements || master.remark || ''
}

function toggleBasicInfo() {
  basicInfoExpanded.value = !basicInfoExpanded.value
}

function resolveDefaultBomTypeFromRoute() {
  const qType = route.query.bomType
  if (qType) return normalizeBomType(String(qType))
  if (route.query.itemType === 'spu') return BOM_TYPE.BASELINE
  return BOM_TYPE.PRODUCT
}

function applyItemFromQuery(itemType, itemId, itemName) {
  if (!itemType || !itemId) return false
  if (itemType === 'spu') {
    const spu = findSpuById(itemId)
    form.itemId = `spu:${itemId}`
    applySelectedItem({
      itemType: 'spu',
      itemId,
      itemName: spu?.name || itemName || '',
      itemCode: spu?.code || '',
      specModel: '',
    })
    return true
  }
  const master = findMasterItem(itemType, itemId)
  if (!master) {
    form.itemId = `${itemType}:${itemId}`
    applySelectedItem({
      itemType,
      itemId,
      itemName: itemName || '',
      itemCode: '',
      specModel: '',
    })
    return true
  }
  form.itemId = `${itemType}:${itemId}`
  applySelectedItem({
    itemType,
    itemId,
    itemName: master.name,
    itemCode: master.code,
    specModel: master.specModel || '',
  })
  return true
}

function resetNewBomState() {
  const bomType = resolveDefaultBomTypeFromRoute()
  const ship = bomType === BOM_TYPE.SHIP
  Object.assign(form, {
    bomNo: generateBomNo(),
    bomName: ship ? '标准随货附件包' : '',
    bomType,
    itemId: undefined,
    itemType: ship ? SHIP_KIT_ITEM_TYPE : bomType === BOM_TYPE.BASELINE ? 'spu' : 'product',
    itemName: '',
    itemCode: '',
    specModel: '',
    material: '',
    drawingNo: '',
    techParams: '',
    processRoute: undefined,
    matchingRequirements: '',
    applicableProductIds: [],
  })
  flatNodes.value = []
  lineItems.value = []
  selectedNodeId.value = ROOT_ID
  templateRef.value = null
  editVersion.value = ''
  editBomStatus.value = ''
  editEffectiveAt.value = ''
  editCreator.value = ''
  columnSettings.value = JSON.parse(JSON.stringify(defaultBomColumnSettings))
}

/** 发运 BOM：不绑产品，用名称作为根节点 */
function ensureShipKitRoot() {
  const kitName = form.bomName?.trim() || '发运附件包'
  // 新建共用包：挂到 shipKit；编辑旧「单产品发运 BOM」保留原 itemType/itemId 以延续版本组
  if (!form.itemId || form.itemType === SHIP_KIT_ITEM_TYPE) {
    form.itemType = SHIP_KIT_ITEM_TYPE
    form.itemName = kitName
    if (!form.itemCode) form.itemCode = `KIT-${form.bomNo || 'SHIP'}`
    if (!form.itemId) {
      form.itemId = `${SHIP_KIT_ITEM_TYPE}:ship-kit-${Date.now().toString(36)}`
    }
  } else {
    form.itemName = kitName
  }
  const rootPayload = {
    itemCode: form.itemCode || '',
    itemName: kitName,
    specModel: '',
    bomName: kitName,
  }
  if (hasRoot.value) {
    flatNodes.value = syncRootNodeFromItem(flatNodes.value, rootPayload)
  } else {
    flatNodes.value = [createRootTreeNode(rootPayload)]
    selectedNodeId.value = ROOT_ID
  }
}

/** 本实例只初始化一次：切到其他标签再切回时 keep-alive 复用，禁止 reset / 再弹选品窗 */
const bootstrappedNewBom = ref(false)
const loadedEditBomId = ref('')

function captureNewBomDraft() {
  if (route.name !== 'product-process-bom-new') return
  if (!bootstrappedNewBom.value && !isCreatePageBootstrapped(route.path)) return
  saveCreatePageDraft(route.path, {
    form: { ...form },
    flatNodes: JSON.parse(JSON.stringify(flatNodes.value || [])),
    lineItems: JSON.parse(JSON.stringify(lineItems.value || [])),
    selectedNodeId: selectedNodeId.value,
    syncToMaster: syncToMaster.value,
    skipAutoProductPicker: skipAutoProductPicker.value,
    columnSettings: JSON.parse(JSON.stringify(columnSettings.value || [])),
    basicInfoExpanded: basicInfoExpanded.value,
    templateRef: templateRef.value,
  })
}

function restoreNewBomDraft() {
  const draft = loadCreatePageDraft(route.path)
  if (!draft?.form) return false
  Object.assign(form, draft.form)
  flatNodes.value = draft.flatNodes || []
  lineItems.value = draft.lineItems || []
  selectedNodeId.value = draft.selectedNodeId || ROOT_ID
  syncToMaster.value = Boolean(draft.syncToMaster)
  skipAutoProductPicker.value =
    Boolean(draft.skipAutoProductPicker) ||
    Boolean(draft.form?.itemId) ||
    (draft.flatNodes || []).length > 0
  if (draft.columnSettings) columnSettings.value = draft.columnSettings
  if (typeof draft.basicInfoExpanded === 'boolean')
    basicInfoExpanded.value = draft.basicInfoExpanded
  templateRef.value = draft.templateRef || null
  bootstrappedNewBom.value = true
  switchProductOpen.value = false
  return true
}

function closeProductPicker() {
  switchProductOpen.value = false
}

function initPageFromRoute() {
  if (route.name === 'product-process-bom-edit') {
    const id = String(route.params.id || editBomId.value || '')
    if (!id) return
    if (loadedEditBomId.value === id) return
    loadedEditBomId.value = id
    bootstrappedNewBom.value = false
    loadEditBom(id)
    return
  }
  if (route.name === 'product-process-bom-new') {
    const alreadyBootstrapped = bootstrappedNewBom.value || isCreatePageBootstrapped(route.path)

    if (alreadyBootstrapped) {
      if (!bootstrappedNewBom.value) {
        restoreNewBomDraft()
      }
      closeProductPicker()
      return
    }

    if (restoreNewBomDraft()) return

    bootstrappedNewBom.value = true
    loadedEditBomId.value = ''

    resetNewBomState()
    skipAutoProductPicker.value = true
    if (isShipBomMode.value) {
      ensureShipKitRoot()
      closeProductPicker()
      captureNewBomDraft()
      return
    }
    const { itemType, itemId, itemName } = route.query
    const applied = applyItemFromQuery(
      itemType ? String(itemType) : '',
      itemId ? String(itemId) : '',
      itemName ? String(itemName) : '',
    )
    if (applied) {
      skipAutoProductPicker.value = true
    }
    closeProductPicker()
    captureNewBomDraft()
  }
}

// 仅监听页面身份变化；不要监听 query（切标签丢 query / 还原 query 都会误触发 reset）
watch(
  () => [route.name, String(route.params.id || '')],
  ([name]) => {
    if (name !== 'product-process-bom-new' && name !== 'product-process-bom-edit') return
    initPageFromRoute()
  },
)

watch(
  () => form.bomName,
  () => {
    if (!isShipBomMode.value) return
    if (!hasRoot.value && !form.bomName) return
    ensureShipKitRoot()
  },
)

onMounted(() => {
  initPageFromRoute()
})

/**
 * keep-alive 再次激活（非首次挂载）时：
 * 已有根产品/已选物料则关弹窗，绝不重新 init。
 * 注意：keep-alive 下首次挂载也会触发 onActivated，新建页不再自动打开选品窗。
 */
const activatedOnce = ref(false)
onActivated(() => {
  if (route.name !== 'product-process-bom-new' && route.name !== 'product-process-bom-edit') return

  if (route.name === 'product-process-bom-new') {
    if (isCreatePageBootstrapped(route.path) && !bootstrappedNewBom.value) {
      restoreNewBomDraft()
    }
    if (form.itemId || hasRoot.value || skipAutoProductPicker.value) {
      closeProductPicker()
    }
    captureNewBomDraft()
  }

  if (!activatedOnce.value) {
    activatedOnce.value = true
    return
  }

  if (form.itemId || hasRoot.value || skipAutoProductPicker.value) {
    closeProductPicker()
  }
})

onDeactivated(() => {
  captureNewBomDraft()
})

function applySelectedItem(opt, { preserveChildren = false } = {}) {
  form.itemType = opt.itemType
  form.itemName = opt.itemName
  form.itemCode = opt.itemCode
  form.specModel = opt.specModel
  applyReadonlyMasterFields(opt.itemType, opt.itemId)
  applyEditableMasterFields(opt.itemType, opt.itemId)
  if (!form.bomName) {
    form.bomName = isShipBomMode.value ? `${opt.itemName}-发运附件` : `${opt.itemName} BOM`
  }

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

function openSwitchProduct() {
  if (isShipBomMode.value) {
    message.info('发运 BOM 不绑定单一产品，请在「适用产品」中多选')
    return
  }
  if (isEditMode.value && !canSwitchProduct.value) {
    message.info('当前状态的 BOM 不可切换产品')
    return
  }
  switchProductOpen.value = true
}

function onSwitchProductOpenChange(open) {
  switchProductOpen.value = open
  if (!open && route.name === 'product-process-bom-new') {
    skipAutoProductPicker.value = true
    captureNewBomDraft()
  }
}

function onRootItemNameUpdate(name) {
  form.itemName = name
  if (hasRoot.value) {
    flatNodes.value = syncRootNodeFromItem(flatNodes.value, {
      itemCode: form.itemCode,
      itemName: form.itemName,
      specModel: form.specModel,
      bomName: form.bomName,
    })
  }
}

function onRootCatalogSelected(item) {
  if (!item?.id) return
  if (isEditMode.value && !canSwitchProduct.value) {
    message.info('当前状态的 BOM 不可切换产品')
    return
  }
  const preserveChildren = hasRoot.value
  form.itemId = `${item.itemType}:${item.id}`
  applySelectedItem(
    {
      itemType: item.itemType,
      itemId: item.id,
      itemName: item.name || '',
      itemCode: item.code || '',
      specModel: item.specModel || '',
    },
    { preserveChildren },
  )
  if (item.material) form.material = item.material
  if (item.drawingNo) form.drawingNo = item.drawingNo
  if (preserveChildren) {
    message.success('已切换根产品，子级结构已保留')
  }
  skipAutoProductPicker.value = true
  closeProductPicker()
  captureNewBomDraft()
}

function onRootItemCreate({ name }) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return
  if (isEditMode.value && !canSwitchProduct.value) {
    message.info('当前状态的 BOM 不可切换产品')
    return
  }
  if (isBaselineBomMode.value) {
    const spu = addSpu({
      code: generateSpuCode(),
      name: trimmed,
      ...buildBomQuickCreateSpuFields(),
    })
    onRootCatalogSelected({
      id: spu.id,
      code: spu.code,
      name: spu.name,
      itemType: 'spu',
      specModel: '',
      material: '',
      drawingNo: '',
    })
    message.success(`已创建产品族「${trimmed}」并设为根节点`)
    return
  }
  const product = addProduct({
    code: generateProductCode(),
    name: trimmed,
    ...buildBomQuickCreateProductFields(form),
  })
  onRootCatalogSelected({
    id: product.id,
    code: product.code,
    name: product.name,
    itemType: 'product',
    specModel: product.specModel || '',
    material: product.material || '',
    drawingNo: product.drawingNo || '',
  })
  message.success(`已创建产品「${trimmed}」并设为根节点（待归类 / 成品）`)
}

function openRootItemDetail() {
  const id = switchSelectedId.value
  if (!id) {
    message.info('请先选择产品')
    return
  }
  if (form.itemType === 'spu') {
    message.info('产品族暂无独立详情页')
    return
  }
  const path = `/product-process/products/${id}/edit`
  openTab(path, form.itemName || '产品详情')
}

function syncRootFieldsToMaster() {
  if (!syncToMaster.value || isShipBomMode.value) return
  const id = switchSelectedId.value
  if (!id) return
  const patch = {
    name: form.itemName || undefined,
    specModel: form.specModel || '',
    material: form.material || '',
    drawingNo: form.drawingNo || '',
    techParams: form.techParams || '',
    matchingRequirements: form.matchingRequirements || '',
  }
  if (form.itemType === 'product') {
    updateProduct(id, {
      ...patch,
      production: {
        ...(findMasterItem('product', id)?.production || {}),
        defaultProcessRoute: form.processRoute || '',
      },
    })
    return
  }
  if (form.itemType === 'material') {
    updateMaterial(id, {
      ...patch,
      production: {
        ...(findMasterItem('material', id)?.production || {}),
        defaultProcessRoute: form.processRoute || '',
      },
    })
    return
  }
  if (form.itemType === 'spu') {
    updateSpu(id, {
      name: form.itemName || undefined,
      sharedFields: {
        ...(findSpuById(id)?.sharedFields || {}),
        techParams: form.techParams || '',
        matchingRequirements: form.matchingRequirements || '',
        processRoute: form.processRoute || '',
        material: form.material || '',
        drawingNo: form.drawingNo || '',
        specModel: form.specModel || '',
      },
    })
  }
}

function onSwitchProductSelected(items) {
  skipAutoProductPicker.value = true
  closeProductPicker()
  const row = Array.isArray(items) ? items[0] : items
  if (!row) return
  nextTick(() => {
    onSwitchProductConfirm(row)
    closeProductPicker()
    captureNewBomDraft()
  })
}

function onSwitchSpuSelected(items) {
  switchProductOpen.value = false
  const row = Array.isArray(items) ? items[0] : items
  if (!row) return
  const id = row.spuId || row.id
  const spu = findSpuById(id) || row
  const preserveChildren = hasRoot.value
  form.itemId = `spu:${id}`
  applySelectedItem(
    {
      itemType: 'spu',
      itemId: id,
      itemName: spu.name || row.name || '',
      itemCode: spu.code || row.code || '',
      specModel: '',
    },
    { preserveChildren },
  )
  if (preserveChildren) {
    message.success('已切换产品族，仅更新顶级物料，子级结构已保留')
  }
}

function onSwitchProductConfirm(row) {
  closeProductPicker()
  skipAutoProductPicker.value = true
  const itemType = row.itemType === '物料' ? 'material' : 'product'
  const preserveChildren = hasRoot.value
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
  captureNewBomDraft()
}

function onAddSubItem(parentNodeId) {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  addChildParentId.value =
    parentNodeId || selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  selectedNodeId.value = addChildParentId.value
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

function scrollPageToLatestDetail() {
  nextTick(() => {
    requestAnimationFrame(() => {
      const panel = rightPanelRef.value
      if (!panel) return
      panel.scrollTo({ top: panel.scrollHeight, behavior: 'smooth' })
    })
  })
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

function onAddDetailLine() {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  maybeDetachChildBomRef(null, parentId)
  lineItems.value = [...lineItems.value, createEmptySubLine(parentId)]
  scrollPageToLatestDetail()
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
  maybeDetachChildBomRef(lineId)
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
    form,
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

function onAddChild(parentId) {
  if (!hasRoot.value) {
    message.warning('请先选择产品/物料')
    return
  }
  addChildParentId.value = parentId || ROOT_ID
  materialModalOpen.value = true
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
  let spuAdded = 0
  accepted.forEach((material) => {
    const result = addChildMaterial(nodes, lines, parentId, material)
    nodes = result.flatNodes
    lines = result.lineItems
    if (material?.pickType === 'spu' || material?.isSpuTemplate) spuAdded += 1
  })
  flatNodes.value = nodes
  lineItems.value = lines
  selectedNodeId.value = parentId
  if (spuAdded) {
    message.success(`已添加 ${spuAdded} 个产品族，请点击规格型号 / 材质 / 变体属性完成配置`)
  } else if (accepted.length > 1) {
    message.success(`已添加 ${accepted.length} 个子项`)
  }
  scrollPageToLatestDetail()
}

function onDeleteLine(lineId) {
  const line = lineItems.value.find((l) => l.id === lineId)
  if (line && !lineHasChildBomRef(line)) {
    maybeDetachChildBomRef(lineId)
  }
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
  editEffectiveAt.value = bom.effectiveAt || ''
  editCreator.value = bom.creator || ''
  form.bomNo = bom.bomNo
  form.bomName = bom.bomName
  form.bomType = normalizeBomType(bom.bomType || BOM_TYPE.PRODUCT)
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
  form.applicableProductIds = Array.isArray(bom.applicableProductIds)
    ? [...bom.applicableProductIds]
    : []
  if (form.bomType !== BOM_TYPE.SHIP) {
    applyReadonlyMasterFields(bom.itemType, bom.itemId)
  }
}

async function persistBom({ closeAfter = true } = {}) {
  try {
    await formRef.value.validate()
  } catch {
    return null
  }
  if (isShipBomMode.value) {
    ensureShipKitRoot()
  }
  if (!hasRoot.value || !form.itemId) {
    message.warning(
      isShipBomMode.value
        ? '请填写发运 BOM 名称'
        : isBaselineBomMode.value
          ? '请先通过左侧树切换选择产品族'
          : '请先通过左侧树切换选择产品/物料',
    )
    return null
  }
  const skuCheck = validateLinesSkuResolved(lineItems.value)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return null
  }
  if (lineItems.value.some((l) => !l.materialCode)) {
    message.warning('请为所有子项选择物料')
    return null
  }
  const vlCheck = findInvalidBlankSizeLine(lineItems.value)
  if (!vlCheck.ok) {
    message.warning(vlCheck.message)
    return null
  }
  const parentChildCheck = validateAllBomParentChildLines(lineItems.value, flatNodes.value, form)
  if (!parentChildCheck.ok) {
    message.warning(parentChildCheck.message)
    return null
  }
  if (!lineItems.value.length) {
    message.warning('请至少添加一条物料明细')
    return null
  }

  const rawItemId = form.itemId
  const itemId =
    typeof rawItemId === 'string' && rawItemId.includes(':') ? rawItemId.split(':')[1] : rawItemId

  let applicableProductIds = isShipBomMode.value ? [...(form.applicableProductIds || [])] : []
  if (
    isShipBomMode.value &&
    form.itemType === 'product' &&
    itemId &&
    !applicableProductIds.map(String).includes(String(itemId))
  ) {
    applicableProductIds = [...applicableProductIds, itemId]
  }

  const payload = {
    bomNo: form.bomNo || generateBomNo(),
    bomName: form.bomName,
    bomType: form.bomType,
    itemType: isShipBomMode.value
      ? form.itemType === SHIP_KIT_ITEM_TYPE
        ? SHIP_KIT_ITEM_TYPE
        : form.itemType
      : form.itemType,
    itemId,
    itemName: isShipBomMode.value ? form.bomName : form.itemName,
    itemCode: form.itemCode,
    specModel: isShipBomMode.value ? '' : form.specModel,
    material: isShipBomMode.value ? '' : form.material || '',
    drawingNo: isShipBomMode.value ? '' : form.drawingNo || '',
    techParams: isShipBomMode.value ? '' : form.techParams || '',
    processRoute: isShipBomMode.value ? '' : form.processRoute || '',
    matchingRequirements: form.matchingRequirements || '',
    applicableProductIds,
    treeNodes: flatNodes.value,
    lineItems: lineItems.value.map((line) => {
      const copy = { ...line }
      delete copy.children
      delete copy._treeIndex
      return copy
    }),
    templateRef: templateRef.value,
    columnSettings: columnSettings.value,
  }

  stripLineTreeChildren(lineItems.value)

  saving.value = true
  try {
    const bomId = isEditMode.value ? editBomId.value : null
    const res = saveProductBom(bomId, payload)
    if (res?.error) {
      message.warning(res.error)
      return null
    }
    if (payload.itemType === 'spu' && normalizeBomType(payload.bomType) === BOM_TYPE.BASELINE) {
      updateSpu(payload.itemId, { baseBomId: res.record.id })
    }
    if (syncToMaster.value) {
      syncRootFieldsToMaster()
    }
    if (closeAfter) {
      if (res.versionUpgraded) {
        message.success(
          `已生成新版本 ${res.record.version}（待发布），当前生效版本保持不变，审核发布后新版本才生效`,
        )
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
    }
    return res
  } finally {
    saving.value = false
  }
}

async function handleSave() {
  await persistBom({ closeAfter: true })
}

function doEnableBom(record, upgradeParentRefs = false, parentRefs = []) {
  const res = enableProductBom(record.id, { upgradeParentRefs, parentRefs })
  if (res?.error) {
    message.warning(res.error)
    return false
  }
  const syncHint =
    upgradeParentRefs && parentRefs.length
      ? `，已同步更新 ${parentRefs.length} 个父级 BOM 的引用版本`
      : ''
  message.success(`保存并发布成功，当前版本已生效可用于生产${syncHint}`)
  return true
}

function startPublishFlow(record) {
  if (!record) return
  if (!isBomPending(record)) {
    message.warning('仅待发布状态的 BOM 可发布')
    return
  }
  const refs = findParentRefsForBomUpgrade(record)
  if (refs.length) {
    enableTarget.value = record
    enableParentRefs.value = refs
    enableNewVersion.value = record.version || ''
    const active = productBomState.boms.find(
      (b) =>
        b.itemType === record.itemType &&
        b.itemId === record.itemId &&
        b.id !== record.id &&
        isBomActive(b),
    )
    enableCurrentVersion.value = active?.version || ''
    enableRefOpen.value = true
    return
  }
  if (doEnableBom(record)) {
    if (!isEditMode.value) resetNewBomState()
    closeTab(pageTabPath.value)
    router.push('/product-process/bom')
  }
}

function onEnableRefConfirm({ action, selectedRefs }) {
  if (!enableTarget.value) return
  if (action === 'reject') {
    message.info('已取消本次审核发布（BOM 已保存为待发布）')
    enableTarget.value = null
    enableParentRefs.value = []
    enableNewVersion.value = ''
    enableCurrentVersion.value = ''
    if (!isEditMode.value) resetNewBomState()
    closeTab(pageTabPath.value)
    router.push('/product-process/bom')
    return
  }
  const upgrade = action === 'upgrade'
  const ok = doEnableBom(enableTarget.value, upgrade, upgrade ? selectedRefs : [])
  enableTarget.value = null
  enableParentRefs.value = []
  enableNewVersion.value = ''
  enableCurrentVersion.value = ''
  if (ok) {
    if (!isEditMode.value) resetNewBomState()
    closeTab(pageTabPath.value)
    router.push('/product-process/bom')
  }
}

async function handleSaveAndPublish() {
  const res = await persistBom({ closeAfter: false })
  if (!res?.record) return
  startPublishFlow(res.record)
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

    .info-block-hint {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      flex-shrink: 0;
    }
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

  .full-row-item {
    display: flex;
    width: 100%;
    margin-right: 0;
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

.basic-form {
  width: 100%;
}

.applicable-products-item {
  :deep(.ant-form-item-control-input-content) {
    display: block;
  }
}

.applicable-products-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  min-width: 320px;
  max-width: 720px;
}

.applicable-products-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  width: 100%;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}

.applicable-product-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  max-width: 100%;
  line-height: 22px;
  white-space: normal;
}

.applicable-product-tag .tag-code {
  color: #1677ff;
  font-weight: 500;
}

.applicable-product-tag .tag-name {
  color: rgba(0, 0, 0, 0.85);
}

.applicable-product-tag .tag-spec {
  color: rgba(0, 0, 0, 0.45);
}

.applicable-products-empty {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
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
