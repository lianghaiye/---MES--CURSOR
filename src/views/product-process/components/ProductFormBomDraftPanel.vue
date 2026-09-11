<template>
  <div class="product-form-bom-draft">
    <div class="draft-hint">
      同步维护 BOM（预览版）：可添加/删除子项看效果；保存产品时暂不落库 BOM。
    </div>
    <BomMaterialTable
      :flat-nodes="flatNodes"
      :line-items="lineItems"
      :column-settings="columnSettings"
      :context-node-id="selectedNodeId"
      :root-item-label="rootItemLabel"
      :summary-meta="summaryMeta"
      :readonly="readonly"
      :hide-switch-product="true"
      empty-variant="default"
      @add-detail-line="onAddDetailLine"
      @add-sub-item="onAddSubItem"
      @delete-line="onDeleteLine"
      @delete-lines="onDeleteLines"
      @reorder-lines="onReorderLines"
      @material-change="onMaterialChange"
      @item-name-change="onItemNameChange"
      @add-by-bom="onAddByBom"
      @import-template="onImportTemplate"
      @open-column-setting="columnDrawerOpen = true"
      @refresh="refreshLines"
    />

    <SelectBomMaterialModal
      v-model:open="materialModalOpen"
      :include-spu-templates="true"
      :spu-can-sell-only="false"
      @selected="onMaterialSelected"
    />
    <AddByBomModal v-model:open="addByBomModalOpen" @confirm="onAddByBomConfirm" />
    <BomColumnSettingDrawer v-model:open="columnDrawerOpen" v-model:settings="columnSettings" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import BomMaterialTable from '@/views/product-process/components/BomMaterialTable.vue'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import BomColumnSettingDrawer from '@/views/product-process/components/BomColumnSettingDrawer.vue'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import {
  createRootTreeNode,
  getRootTreeId,
  deleteTreeNode,
  reorderSiblingLinesByIds,
  ROOT_ID,
} from '@/utils/bomTree'
import { syncRootNodeFromItem, importBomByReference } from '@/utils/bomImport'
import {
  createEmptySubLine,
  applyMaterialToLine,
  insertEmptySiblingAfter,
} from '@/utils/bomLineMaterial'

const props = defineProps({
  productName: { type: String, default: '' },
  productCode: { type: String, default: '' },
  specModel: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})

const flatNodes = ref([])
const lineItems = ref([])
const selectedNodeId = ref(ROOT_ID)
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))
const columnDrawerOpen = ref(false)
const materialModalOpen = ref(false)
const addByBomModalOpen = ref(false)
const pendingParentId = ref('')

const rootItemLabel = computed(
  () => props.productName || props.productCode || '当前产品（保存后生效）',
)

const summaryMeta = computed(() => ({
  version: '草稿',
  effectiveAt: '',
  creator: '',
}))

function ensureRoot() {
  const meta = {
    itemCode: props.productCode || '',
    itemName: props.productName || '未命名产品',
    specModel: props.specModel || '',
    bomName: '',
  }
  if (!flatNodes.value.some((n) => n.isRoot)) {
    flatNodes.value = [createRootTreeNode(meta)]
  } else {
    flatNodes.value = syncRootNodeFromItem(flatNodes.value, meta)
  }
  selectedNodeId.value = getRootTreeId(flatNodes.value) || ROOT_ID
}

watch(
  () => [props.productName, props.productCode, props.specModel],
  () => ensureRoot(),
  { immediate: true },
)

function refreshLines() {
  lineItems.value = [...lineItems.value]
}

function onAddDetailLine(payload) {
  if (props.readonly) return
  ensureRoot()
  const afterLineId = payload?.afterLineId
  if (afterLineId) {
    const result = insertEmptySiblingAfter(lineItems.value, flatNodes.value, afterLineId)
    flatNodes.value = result.flatNodes
    lineItems.value = result.lineItems
    return
  }
  const parentId = getRootTreeId(flatNodes.value) || ROOT_ID
  lineItems.value = [...lineItems.value, createEmptySubLine(parentId)]
}

function onAddSubItem(parentTreeId) {
  if (props.readonly) return
  ensureRoot()
  pendingParentId.value =
    parentTreeId || selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  materialModalOpen.value = true
}

/** 行内选料：直接套用；无 material 时打开弹窗 */
function onMaterialChange(payload) {
  if (props.readonly) return
  const lineId = payload?.lineId
  const material = payload?.material
  if (!lineId) return
  if (material) {
    const result = applyMaterialToLine(flatNodes.value, lineItems.value, lineId, material)
    flatNodes.value = result.flatNodes
    lineItems.value = result.lineItems
    return
  }
  const line = lineItems.value.find((l) => l.id === lineId)
  pendingParentId.value =
    line?.parentTreeId || selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  materialModalOpen.value = true
}

function onMaterialSelected(materials) {
  const list = Array.isArray(materials) ? materials : materials ? [materials] : []
  if (!list.length) return
  ensureRoot()
  const parentId = pendingParentId.value || getRootTreeId(flatNodes.value) || ROOT_ID
  let nodes = flatNodes.value
  let lines = lineItems.value
  list.forEach((material) => {
    const empty = createEmptySubLine(parentId)
    lines = [...lines, empty]
    const result = applyMaterialToLine(nodes, lines, empty.id, material)
    nodes = result.flatNodes
    lines = result.lineItems
  })
  flatNodes.value = nodes
  lineItems.value = lines
  pendingParentId.value = ''
  materialModalOpen.value = false
}

function onItemNameChange({ lineId, itemName }) {
  const line = lineItems.value.find((l) => l.id === lineId)
  if (!line) return
  const name = String(itemName ?? '').trim()
  line.itemName = name
  if (line.treeNodeId) {
    flatNodes.value = flatNodes.value.map((n) =>
      n.id === line.treeNodeId ? { ...n, title: `${line.materialCode || ''} ${name}`.trim() } : n,
    )
  }
}

function onDeleteLine(lineId) {
  const line = lineItems.value.find((l) => l.id === lineId)
  if (!line) return
  lineItems.value = lineItems.value.filter((l) => l.id !== lineId)
  if (line.treeNodeId) {
    const result = deleteTreeNode(flatNodes.value, lineItems.value, line.treeNodeId)
    flatNodes.value = result.flatNodes
    lineItems.value = result.lineItems
  }
}

function onDeleteLines(lineIds) {
  ;[...(lineIds || [])].forEach((id) => onDeleteLine(id))
}

function onReorderLines({ fromLineId, toLineId }) {
  if (!fromLineId || !toLineId || fromLineId === toLineId) return
  const result = reorderSiblingLinesByIds(lineItems.value, flatNodes.value, fromLineId, toLineId)
  lineItems.value = result.lineItems
  flatNodes.value = result.flatNodes
}

function onAddByBom() {
  if (props.readonly) return
  ensureRoot()
  addByBomModalOpen.value = true
}

function onAddByBomConfirm({ pickerRow, usageCoefficient }) {
  ensureRoot()
  const parentId = selectedNodeId.value || getRootTreeId(flatNodes.value) || ROOT_ID
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
  addByBomModalOpen.value = false
  message.success('已按 BOM 添加本级及下级结构')
}

function onImportTemplate() {
  message.info('预览版暂不支持从模板导入')
}

defineExpose({
  getDraft() {
    return {
      flatNodes: JSON.parse(JSON.stringify(flatNodes.value)),
      lineItems: JSON.parse(JSON.stringify(lineItems.value)),
    }
  },
  clearDraft() {
    flatNodes.value = []
    lineItems.value = []
    ensureRoot()
  },
})
</script>

<style lang="less" scoped>
.product-form-bom-draft {
  margin-top: 0;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
}

.draft-hint {
  margin-bottom: 10px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.55);
  background: #f5f8ff;
  border: 1px solid #d6e4ff;
  border-radius: 6px;
}
</style>
