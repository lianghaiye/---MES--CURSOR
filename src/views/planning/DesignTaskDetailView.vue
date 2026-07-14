<template>
  <div class="design-task-detail-page">
    <a-spin :spinning="loading">
      <template v-if="task">
        <div class="detail-page-head">
          <div class="head-title">
            <span class="title-text">{{ task.taskNo }}</span>
            <a-tag :color="designTaskStatusColor(task.status)">{{ task.status }}</a-tag>
          </div>
          <a-space class="head-actions">
            <a-button
              v-if="canStartDesign || canOpenDraft"
              type="primary"
              size="small"
              @click="openEbomDesign"
            >
              {{ canOpenDraft ? '打开草稿' : '设计' }}
            </a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="page-body">
          <aside class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
            <BomTreePanel
              v-if="flatNodes.length"
              readonly
              :flat-nodes="flatNodes"
              :line-items="lineItems"
              :selected-node-id="selectedNodeId"
              :root-meta="detailRootMeta"
              hide-switch-product
              @select-node="selectedNodeId = $event"
            />
            <div v-else class="empty-tree">
              <a-empty description="暂无 EBOM 树数据，请先进入设计生成草稿" />
            </div>
          </aside>
          <div class="panel-resizer" @mousedown.prevent="onResizeMouseDown" />
          <main class="right-panel">
            <div class="section-card info-card">
              <div class="info-block">
                <div class="section-title">基础信息</div>
                <a-descriptions :column="3" size="small" bordered class="task-desc">
                  <a-descriptions-item label="任务编号">{{
                    task.taskNo || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="状态">
                    <a-tag :color="designTaskStatusColor(task.status)">{{ task.status }}</a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="来源">{{
                    designTaskSourceLabel(task.source)
                  }}</a-descriptions-item>
                  <a-descriptions-item label="销售订单">{{
                    task.salesOrderNo || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="客户">{{
                    task.customerName || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="业务员">{{
                    task.salesperson || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="产品">{{
                    task.productName || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="产品属性">{{
                    task.productAttr || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="规格型号">{{
                    task.specModel || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="材质">{{ task.material || '—' }}</a-descriptions-item>
                  <a-descriptions-item label="技术参数" :span="3" class="multiline-desc">
                    {{ task.techParams || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="配套要求" :span="3" class="multiline-desc">
                    {{ matchingRequirements || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="补充说明" :span="3" class="multiline-desc">
                    {{ supplementDesc || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="订单附件" :span="3">
                    <template v-if="orderAttachments.length">
                      <div class="attachment-list">
                        <div
                          v-for="file in orderAttachments"
                          :key="file.uid || file.name"
                          class="attachment-row"
                        >
                          <span class="attachment-name">{{ file.name || '未命名附件' }}</span>
                          <span v-if="file.type" class="attachment-meta">{{ file.type }}</span>
                          <span v-if="file.uploadedAt" class="attachment-meta">{{
                            file.uploadedAt
                          }}</span>
                          <a class="attachment-link" @click="previewFile(file)">预览</a>
                        </div>
                      </div>
                    </template>
                    <span v-else>—</span>
                  </a-descriptions-item>
                  <a-descriptions-item label="EBOM">{{ task.ebomName || '—' }}</a-descriptions-item>
                  <a-descriptions-item label="EBOM编码">{{
                    task.ebomCode || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="设计人">{{
                    task.designer || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="设计时间">{{
                    task.designTime || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="校核人">{{
                    task.checker || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="校核时间">{{
                    task.checkTime || '—'
                  }}</a-descriptions-item>
                </a-descriptions>
              </div>

              <div class="info-block">
                <div class="section-title">父级物料信息</div>
                <a-descriptions :column="3" size="small" bordered class="task-desc">
                  <a-descriptions-item label="物品名称">{{
                    selectedParentInfo?.itemName || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="规格型号">{{
                    selectedParentInfo?.specModel || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item v-if="isSelectedRoot" label="EBOM版本">
                    {{ ebom?.version || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="材质">{{
                    selectedParentInfo?.material || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="图号">{{
                    selectedParentInfo?.drawingNo || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="工艺路线">{{
                    selectedParentInfo?.processRoute || '—'
                  }}</a-descriptions-item>
                  <a-descriptions-item label="技术参数" class="multiline-desc">
                    {{ selectedParentInfo?.techParams || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="配套要求" :span="2" class="multiline-desc">
                    {{ selectedParentInfo?.matchingRequirements || '—' }}
                  </a-descriptions-item>
                </a-descriptions>
              </div>
            </div>

            <div class="section-card table-section">
              <BomMaterialTable
                readonly
                :lines="displayLines"
                :column-settings="columnSettings"
                empty-variant="no-children"
              />
            </div>
          </main>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该设计任务" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'DesignTaskDetailView' }
</script>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  DESIGN_TASK_STATUS,
  designTaskSourceLabel,
  designTaskStatusColor,
} from '@/constants/designTask'
import { canOpenEbomDesign, findDesignTaskById } from '@/store/designTaskStore'
import { findEbomByDesignTaskId, findEbomById } from '@/store/ebomStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import {
  ROOT_ID,
  getLinesForTreeNode,
  getRootTreeId,
  normalizeFlatNodesWithRoot,
} from '@/utils/bomTree'
import { resolveBomNodeItemInfo } from '@/utils/bomTreeDisplay'
import { tabStore, useTabs } from '@/composables/useTabs'
import BomTreePanel from '@/views/product-process/components/BomTreePanel.vue'
import BomMaterialTable from '@/views/product-process/components/BomMaterialTable.vue'

const route = useRoute()
const router = useRouter()
const { openTab, closeTab } = useTabs()

const loading = ref(false)
const task = ref(null)
const ebom = ref(null)
const flatNodes = ref([])
const lineItems = ref([])
const selectedNodeId = ref(ROOT_ID)
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))

const leftPanelWidth = ref(280)
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 520
let resizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const relatedSalesOrder = computed(() => {
  const orderNo = task.value?.salesOrderNo
  if (!orderNo) return null
  return findSalesOrderByOrderNo(orderNo)
})

const relatedSalesLine = computed(() => {
  const order = relatedSalesOrder.value
  const lineId = task.value?.salesLineId
  if (!order?.lineItems?.length) return null
  if (lineId) {
    return order.lineItems.find((l) => l.id === lineId) || null
  }
  return order.lineItems[0] || null
})

const matchingRequirements = computed(
  () => relatedSalesLine.value?.matchingRequirements || task.value?.matchingRequirements || '',
)

const supplementDesc = computed(
  () => relatedSalesLine.value?.supplementDesc || task.value?.supplementDesc || '',
)

const orderAttachments = computed(() => {
  const list = relatedSalesOrder.value?.attachments
  return Array.isArray(list) ? list : []
})

const displayLines = computed(() =>
  getLinesForTreeNode(lineItems.value, selectedNodeId.value, flatNodes.value),
)

const rootForm = computed(() => {
  const t = task.value
  if (!t) return {}
  return {
    itemName: t.productName || '',
    itemCode: t.productCode || '',
    specModel: t.specModel || '',
    material: t.material || '',
    drawingNo: relatedSalesLine.value?.drawingNo || '',
    techParams: t.techParams || '',
    processRoute: '',
    matchingRequirements: matchingRequirements.value || '',
  }
})

const selectedNode = computed(() => {
  const id = selectedNodeId.value || getRootTreeId(flatNodes.value)
  return flatNodes.value.find((n) => n.id === id) || flatNodes.value.find((n) => n.isRoot) || null
})

const isSelectedRoot = computed(() => !selectedNode.value || selectedNode.value.isRoot)

const selectedParentInfo = computed(() =>
  resolveBomNodeItemInfo(selectedNode.value, lineItems.value, rootForm.value),
)

const detailRootMeta = computed(() => {
  const t = task.value
  if (!t) return { code: '', name: '', specModel: '', supplyForm: '', subItemCount: 0 }
  const rootId = getRootTreeId(flatNodes.value)
  return {
    code: t.productCode || '',
    name: t.productName || '',
    specModel: t.specModel || '',
    supplyForm: '',
    subItemCount: lineItems.value.filter((l) => l.parentTreeId === rootId).length,
  }
})

const canStartDesign = computed(
  () => task.value?.status === DESIGN_TASK_STATUS.PENDING && canOpenEbomDesign(task.value),
)

const canOpenDraft = computed(
  () =>
    Boolean(task.value?.hasEbomDraft) &&
    canOpenEbomDesign(task.value) &&
    task.value?.status !== DESIGN_TASK_STATUS.PENDING,
)

function previewFile(file) {
  message.info(`预览：${file.name || '附件'}`)
}

function resolveEbom(t) {
  if (!t) return null
  if (t.ebomId) {
    const byId = findEbomById(t.ebomId)
    if (byId) return byId
  }
  return findEbomByDesignTaskId(t.id)
}

function loadDetail() {
  const id = route.params.id
  loading.value = true
  const found = findDesignTaskById(id)
  task.value = found ? { ...found } : null
  flatNodes.value = []
  lineItems.value = []
  ebom.value = null
  selectedNodeId.value = ROOT_ID

  if (found) {
    const ebomRow = resolveEbom(found)
    ebom.value = ebomRow
    if (ebomRow?.treeNodes?.length) {
      flatNodes.value = normalizeFlatNodesWithRoot(JSON.parse(JSON.stringify(ebomRow.treeNodes)), {
        itemCode: found.productCode,
        itemName: found.productName,
        specModel: found.specModel,
      })
      lineItems.value = JSON.parse(JSON.stringify(ebomRow.lineItems || []))
      columnSettings.value = JSON.parse(
        JSON.stringify(
          ebomRow.columnSettings?.length ? ebomRow.columnSettings : defaultBomColumnSettings,
        ),
      )
      selectedNodeId.value = getRootTreeId(flatNodes.value)
    }

    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `设计任务·${found.taskNo || ''}`
  }
  loading.value = false
}

watch(() => route.params.id, loadDetail, { immediate: true })

function openEbomDesign() {
  if (!task.value) return
  const resolved = router.resolve({
    name: 'planning-ebom-design',
    params: { taskId: task.value.id },
  })
  openTab(resolved.path, `EBOM设计·${task.value.taskNo || ''}`)
  router.push(resolved)
}

function handleBack() {
  const detailPath = route.path
  const listPath = '/planning/design-task'
  const closingActive = tabStore.activePath === detailPath
  closeTab(detailPath)
  router.push(closingActive ? tabStore.activePath || listPath : listPath)
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

onMounted(() => {
  document.addEventListener('mousemove', onResizeMouseMove)
  document.addEventListener('mouseup', onResizeMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMouseMove)
  document.removeEventListener('mouseup', onResizeMouseUp)
})
</script>

<style lang="less" scoped>
.design-task-detail-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  overflow: hidden;
  background: #f5f6f8;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.detail-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  padding: 8px 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  flex-shrink: 0;

  .head-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .title-text {
    font-weight: 600;
    font-size: 15px;
  }

  .head-actions {
    flex-shrink: 0;
  }
}

.page-body {
  flex: 1;
  display: flex;
  gap: 0;
  padding: 0 8px 8px;
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

.empty-tree {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
  overflow: hidden;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 12px 16px;
  flex-shrink: 0;
}

.info-card {
  max-height: 52%;
  overflow: auto;

  .info-block + .info-block {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;
  }

  .section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 12px;
  }
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.attachment-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  line-height: 1.4;
}

.attachment-name {
  color: rgba(0, 0, 0, 0.88);
}

.attachment-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.attachment-link {
  color: #1677ff;
  cursor: pointer;
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

.task-desc {
  :deep(.ant-descriptions-item-label) {
    width: 100px;
    color: rgba(0, 0, 0, 0.45);
  }

  :deep(.multiline-desc .ant-descriptions-item-content) {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

@media (max-width: 992px) {
  .page-body {
    flex-direction: column;
  }

  .left-panel {
    width: 100% !important;
    max-width: none;
    min-height: 260px;
  }

  .info-card {
    max-height: none;
  }
}
</style>
