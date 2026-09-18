<template>
  <div class="design-task-detail-page">
    <a-spin :spinning="loading">
      <template v-if="task">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ task.taskNo }}</span>
            <a-tag :color="designTaskStatusColor(task.status)">{{ task.status }}</a-tag>
          </div>
          <a-space :size="8" class="header-actions">
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
            <DetailSectionCard title="基本信息" class="info-card">
              <div class="basic-info-section">
                <div class="meta-bar">
                  <div class="meta-item">
                    <span class="field-label">来源</span>
                    <span class="field-value">{{ designTaskSourceLabel(task.source) }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="field-label">设计人</span>
                    <span class="field-value">{{ task.designer || '—' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="field-label">设计时间</span>
                    <span class="field-value">{{ task.designTime || '—' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="field-label">校核人</span>
                    <span class="field-value">{{ task.checker || '—' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="field-label">校核时间</span>
                    <span class="field-value">{{ task.checkTime || '—' }}</span>
                  </div>
                </div>

                <div class="info-grid">
                  <div class="info-item">
                    <span class="field-label">销售订单</span>
                    <span class="field-value" :title="task.salesOrderNo || ''">{{
                      task.salesOrderNo || '—'
                    }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">客户</span>
                    <span class="field-value" :title="task.customerName || ''">{{
                      task.customerName || '—'
                    }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">业务员</span>
                    <span class="field-value">{{ task.salesperson || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">产品</span>
                    <span class="field-value" :title="task.productName || ''">{{
                      task.productName || '—'
                    }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">编码</span>
                    <span class="field-value">{{ task.productCode || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">规格型号</span>
                    <span class="field-value">{{ task.specModel || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">材质</span>
                    <span class="field-value">{{ task.material || '—' }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">EBOM</span>
                    <span class="field-value" :title="task.ebomName || ''">{{
                      task.ebomName || '—'
                    }}</span>
                  </div>
                  <div class="info-item">
                    <span class="field-label">EBOM编码</span>
                    <span class="field-value">{{ task.ebomCode || '—' }}</span>
                  </div>
                  <div class="info-item info-item-full">
                    <span class="field-label">技术参数</span>
                    <span class="field-value">{{ task.techParams || '—' }}</span>
                  </div>
                  <div class="info-item info-item-full">
                    <span class="field-label">配套要求</span>
                    <span class="field-value">{{ matchingRequirements || '—' }}</span>
                  </div>
                  <div class="info-item info-item-full">
                    <span class="field-label">补充说明</span>
                    <span class="field-value">{{ supplementDesc || '—' }}</span>
                  </div>
                  <div class="info-item info-item-full">
                    <span class="field-label">订单附件</span>
                    <span class="field-value field-value-block">
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
                      <template v-else>—</template>
                    </span>
                  </div>
                </div>
              </div>
            </DetailSectionCard>

            <DetailSectionCard title="物料清单" class="table-section">
              <BomMaterialTable
                readonly
                hide-toolbar
                :lines="displayLines"
                :column-settings="columnSettings"
                empty-variant="no-children"
              />
            </DetailSectionCard>
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
import DetailSectionCard from '@/components/DetailSectionCard.vue'
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
@label-width: 96px;

.design-task-detail-page {
  /* 与 GlobalTabs（margin 24）左缘对齐 */
  margin: -12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  overflow: hidden;
  background: #f5f6f8;
  box-sizing: border-box;
  gap: 12px;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    gap: 12px;
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  flex-shrink: 0;
  /* 渐变由 detail-page-header.less 统一覆盖 */
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.header-actions {
  flex-shrink: 0;
}

.page-body {
  flex: 1;
  display: flex;
  gap: 0;
  padding: 0;
  min-height: 0;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 auto;
  min-width: 200px;
  max-width: 520px;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e6eb;
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
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;

  :deep(.detail-section-card) {
    margin-bottom: 0;
    border-radius: 8px;
    border: 1px solid #e5e6eb;
  }
}

.info-card {
  max-height: 52%;
  overflow: auto;
  flex-shrink: 0;
}

.basic-info-section {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.field-label {
  flex: 0 0 @label-width;
  width: @label-width;
  padding-right: 8px;
  text-align: right;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.info-item-full {
  grid-column: 1 / -1;

  .field-value {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.field-value-block {
  overflow: visible;
  text-overflow: unset;
  white-space: normal;
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

  :deep(.section-body) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.bom-material-table) {
    height: 100%;
  }
}

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
