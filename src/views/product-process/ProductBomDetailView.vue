<template>
  <div class="product-bom-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-page-head">
          <div class="head-left">
            <a-tooltip
              v-if="activeTab === 'detail'"
              :title="leftSidebarCollapsed ? '展开结构树' : '收起结构树'"
            >
              <a-button type="text" size="small" class="head-tree-toggle-btn" @click="toggleLeft">
                <MenuUnfoldOutlined v-if="leftSidebarCollapsed" />
                <MenuFoldOutlined v-else />
              </a-button>
            </a-tooltip>
            <a-tabs v-model:active-key="activeTab" class="detail-tabs">
              <a-tab-pane key="detail" tab="BOM明细" />
              <a-tab-pane key="versions" tab="历史版本" />
              <a-tab-pane key="logs" tab="操作记录" />
            </a-tabs>
          </div>
          <a-space class="head-actions">
            <a-button
              v-if="activeTab === 'detail'"
              type="primary"
              @click="overviewModalOpen = true"
            >
              概览
            </a-button>
            <a-button v-if="activeTab === 'detail'" @click="relationOpen = true">
              查看关联BOM
            </a-button>
            <a-button v-if="activeTab === 'detail'" @click="printModalOpen = true">
              <PrinterOutlined />
              打印
            </a-button>
            <a-button :disabled="!canEdit" @click="handleEdit">编辑</a-button>
            <a-button :disabled="record.status === '已归档'" @click="handleArchive">归档</a-button>
            <a-button @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <template v-if="activeTab === 'detail'">
          <div class="detail-tab-body">
            <div class="page-body">
              <aside
                v-show="!leftSidebarCollapsed"
                class="left-panel"
                :style="{ width: `${leftPanelWidth}px` }"
              >
                <BomTreePanel
                  readonly
                  hide-import-template
                  :flat-nodes="flatNodes"
                  :line-items="lineItems"
                  :selected-node-id="selectedNodeId"
                  :root-meta="detailRootMeta"
                  @select-node="selectedNodeId = $event"
                />
              </aside>
              <div
                v-show="!leftSidebarCollapsed"
                class="panel-resizer"
                @mousedown.prevent="onResizeMouseDown"
              />
              <main class="right-panel">
                <div class="section-card info-card">
                  <div class="info-block">
                    <div class="section-title">基础信息</div>
                    <BomBasicInfoSection :bom="record" />
                  </div>
                  <div v-if="!isShipBom" class="info-block">
                    <BomRootProductEditor
                      readonly
                      :item-type="record.itemType || 'product'"
                      :item-id="String(record.itemId || '')"
                      :item-name="record.itemName || ''"
                      :item-code="record.itemCode || ''"
                      :spec-model="record.specModel || ''"
                      :material="record.material || ''"
                      :drawing-no="record.drawingNo || ''"
                      :process-route="record.processRoute || ''"
                      :tech-params="record.techParams || ''"
                      :matching-requirements="record.matchingRequirements || record.remark || ''"
                      @open-detail="openDetailRootItem"
                    />
                  </div>
                </div>
                <div class="section-card table-section">
                  <BomMaterialTable
                    readonly
                    :flat-nodes="flatNodes"
                    :line-items="lineItems"
                    :column-settings="columnSettings"
                    :context-node-id="selectedNodeId"
                    :root-item-label="detailRootItemLabel"
                    :summary-meta="detailSummaryMeta"
                    empty-variant="no-children"
                    @select-node="selectedNodeId = $event"
                  />
                </div>
              </main>
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'versions'">
          <div class="section-card versions-tab-card">
            <div class="section-title">BOM 版本变更</div>
            <BomVersionHistoryPanel
              :version-group-id="record.versionGroupId"
              :current-bom="record"
              @view-bom="handleVersionViewBom"
              @compare="handleVersionCompare"
            />
          </div>
        </template>

        <template v-else-if="activeTab === 'logs'">
          <div class="section-card">
            <a-table
              :columns="logColumns"
              :data-source="operationLogs"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            />
          </div>
        </template>

        <BomOverviewModal
          v-model:open="overviewModalOpen"
          :flat-nodes="flatNodes"
          :line-items="lineItems"
          :root-item-name="record.itemName"
          :overview-info="overviewInfo"
        />
        <BomPrintModal
          v-model:open="printModalOpen"
          :flat-nodes="flatNodes"
          :line-items="lineItems"
          :root-item-name="record.itemName"
          :overview-info="overviewInfo"
          :column-settings="overviewColumnSettings"
        />
        <BomRelationDrawer v-model:open="relationOpen" :bom="record" :line-items="lineItems" />

        <BomArchiveReferenceModal
          v-model:open="archiveRefOpen"
          :item-name="record?.itemName || ''"
          :bom-name="record?.bomName || ''"
          :version="record?.version || ''"
          :refs="archiveParentRefs"
          @confirm="onArchiveRefConfirm"
        />

        <BomVersionCompareModal
          v-model:open="versionCompareOpen"
          :old-bom="compareOldBom"
          :new-bom="compareNewBom"
          :title="versionCompareTitle"
        />
      </template>
      <a-empty v-else-if="!loading" description="未找到该 BOM" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'ProductBomDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PrinterOutlined, MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons-vue'
import { getVersionsInGroup } from '@/mock/productBom'
import { buildBomOperationLogs } from '@/mock/bomOperationLogs'
import { defaultBomColumnSettings, isShipBomType } from '@/mock/bomMaterialColumns'
import { defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'
import { mergeColumnSettings } from '@/utils/tableColumnSettings'
import { isBomEditable } from '@/mock/productBomOptions'
import { getProductBomById, archiveProductBom, productBomState } from '@/store/productBomStore'
import { findParentBomReferences } from '@/utils/bomVersionReference'
import { loadBomDetailStructure } from '@/utils/bomImport'
import { getRootTreeId, ROOT_ID } from '@/utils/bomTree'
import { tabStore, useTabs } from '@/composables/useTabs'
import { useBomSplitLayout } from '@/composables/useBomSplitLayout'
import BomTreePanel from './components/BomTreePanel.vue'
import BomBasicInfoSection from './components/BomBasicInfoSection.vue'
import BomRootProductEditor from './components/BomRootProductEditor.vue'
import BomMaterialTable from './components/BomMaterialTable.vue'
import BomVersionHistoryPanel from './components/BomVersionHistoryPanel.vue'
import BomOverviewModal from './components/BomOverviewModal.vue'
import BomPrintModal from './components/BomPrintModal.vue'
import BomRelationDrawer from './components/BomRelationDrawer.vue'
import BomArchiveReferenceModal from './components/BomArchiveReferenceModal.vue'
import BomVersionCompareModal from '@/components/BomVersionCompareModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab, closeTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const flatNodes = ref([])
const lineItems = ref([])
const selectedNodeId = ref(ROOT_ID)
const activeTab = ref('detail')
const overviewModalOpen = ref(false)
const printModalOpen = ref(false)
const relationOpen = ref(false)
const archiveRefOpen = ref(false)
const archiveParentRefs = ref([])
const versionCompareOpen = ref(false)
const compareOldBom = ref(null)
const compareNewBom = ref(null)
const versionCompareTitle = ref('')
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))
const overviewColumnSettings = ref(loadOverviewColumnSettings())

function loadOverviewColumnSettings() {
  try {
    const raw = localStorage.getItem('i_doms_table_col_bom-overview-list')
    if (raw) {
      return mergeColumnSettings(defaultBomOverviewColumnSettings, JSON.parse(raw))
    }
  } catch {
    /* ignore */
  }
  return JSON.parse(JSON.stringify(defaultBomOverviewColumnSettings))
}

const { leftSidebarCollapsed, leftPanelWidth, toggleLeft, onResizeMouseDown } = useBomSplitLayout({
  scopeKey: 'bom-detail',
})

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 160 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '操作类型', dataIndex: 'action', width: 100 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const isShipBom = computed(() => isShipBomType(record.value?.bomType))

const detailRootMeta = computed(() => {
  const bom = record.value
  if (!bom) return { code: '', name: '', specModel: '', supplyForm: '', subItemCount: 0 }
  const rootId = getRootTreeId(flatNodes.value)
  return {
    code: bom.itemCode,
    name: bom.itemName,
    specModel: bom.specModel,
    supplyForm: '',
    subItemCount: lineItems.value.filter((l) => l.parentTreeId === rootId).length,
  }
})

const detailRootItemLabel = computed(() => {
  const bom = record.value
  if (!bom) return ''
  const parts = [bom.itemCode, bom.itemName].filter(Boolean)
  return parts.length ? parts.join(' ') : bom.bomName || ''
})

const detailSummaryMeta = computed(() => {
  const bom = record.value
  if (!bom) return { version: '—', effectiveAt: '—', creator: '—' }
  return {
    version: bom.version || '—',
    effectiveAt: formatDisplayDate(bom.effectiveAt),
    creator: bom.creator || '—',
  }
})

function openDetailRootItem() {
  const bom = record.value
  if (!bom?.itemId) {
    message.info('未绑定产品')
    return
  }
  if (bom.itemType === 'spu') {
    message.info('产品族暂无独立详情页')
    return
  }
  const path = `/product-process/products/${bom.itemId}/edit`
  openTab(path, bom.itemName || '产品详情')
}

const versionList = computed(() => {
  if (!record.value?.versionGroupId) return record.value ? [record.value] : []
  return getVersionsInGroup(productBomState.boms, record.value.versionGroupId)
})

const operationLogs = computed(() => buildBomOperationLogs(record.value))

const overviewInfo = computed(() => {
  const bom = record.value
  if (!bom) {
    return {
      bomNo: '—',
      specModel: '—',
      version: '—',
      material: '—',
      drawingNo: '—',
      techParams: '—',
      matchingRequirements: '—',
    }
  }
  return {
    bomNo: bom.bomNo || '—',
    specModel: bom.specModel || '—',
    version: bom.version || '—',
    material: bom.material || '—',
    drawingNo: bom.drawingNo || '—',
    techParams: bom.techParams || '—',
    matchingRequirements: bom.matchingRequirements || bom.remark || '—',
  }
})

const canEdit = computed(() => isBomEditable(record.value))

function formatDisplayDate(val) {
  if (!val) return '—'
  return String(val).split(' ')[0]
}

function loadDetail() {
  const id = route.params.id
  loading.value = true
  const bom = getProductBomById(id)
  record.value = bom ? { ...bom } : null
  if (bom) {
    const structure = loadBomDetailStructure(bom)
    flatNodes.value = structure.flatNodes
    lineItems.value = structure.lineItems
    selectedNodeId.value = structure.flatNodes.find((n) => n.isRoot)?.id || ROOT_ID

    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = bom.bomName || 'BOM详情'
  }
  loading.value = false
}

watch(() => route.params.id, loadDetail, { immediate: true })

function openBomDetail(row) {
  if (row.id === record.value?.id) return
  const resolved = router.resolve({
    name: 'product-process-bom-detail',
    params: { id: row.id },
  })
  openTab(resolved.path, row.bomName || 'BOM详情')
  router.push(resolved)
}

function findBomByVersion(version) {
  if (!version) return null
  return versionList.value.find((b) => b.version === version) || null
}

function handleVersionViewBom(item) {
  const bomId = item.bomId
  if (!bomId) {
    message.info('未找到该版本 BOM')
    return
  }
  if (bomId === record.value?.id) return
  const bom = getProductBomById(bomId)
  if (!bom) {
    message.info('未找到该版本 BOM')
    return
  }
  openBomDetail(bom)
}

function handleVersionCompare(item) {
  const newBom = findBomByVersion(item.version)
  const oldBom = findBomByVersion(item.compareVersion)
  if (!newBom || !oldBom) {
    message.info('暂无可对比的版本数据')
    return
  }
  compareOldBom.value = oldBom
  compareNewBom.value = newBom
  versionCompareTitle.value = `${record.value?.itemName || record.value?.bomName || 'BOM'} · ${item.compareVersion} → ${item.version}`
  versionCompareOpen.value = true
}

function handleEdit() {
  if (!canEdit.value || !record.value) {
    message.info('当前状态的 BOM 不可编辑')
    return
  }
  const path = `/product-process/bom/${record.value.id}/edit`
  openTab(path, `编辑BOM·${record.value.bomName || ''}`)
  router.push(path)
}

function handleArchive() {
  if (!record.value) return
  const refs = findParentBomReferences(record.value)
  if (refs.length) {
    archiveParentRefs.value = refs
    archiveRefOpen.value = true
    return
  }
  Modal.confirm({
    title: '确认归档',
    content: `确定归档 BOM「${record.value.bomName}」吗？`,
    onOk: () => {
      const res = archiveProductBom(record.value.id)
      if (!res) {
        message.warning('归档失败')
        return
      }
      loadDetail()
      message.success('已归档')
    },
  })
}

function onArchiveRefConfirm({ removeRefs = [], keepSelfRefs = [] }) {
  if (!record.value) return
  const res = archiveProductBom(record.value.id, {
    removeRefs,
    keepSelfRefs,
  })
  if (!res) {
    message.warning('归档失败')
    return
  }
  loadDetail()
  const parts = ['已归档']
  if (res.removedCount) parts.push(`已从母件移除 ${res.removedCount} 处`)
  if (res.keptCount) parts.push(`已保留本级 ${res.keptCount} 处`)
  message.success(parts.join('，'))
}

function handleBack() {
  const detailPath = route.path
  const listPath = '/product-process/bom'
  const closingActive = tabStore.activePath === detailPath
  closeTab(detailPath)
  router.push(closingActive ? tabStore.activePath || listPath : listPath)
}
</script>

<style lang="less" scoped>
.product-bom-detail-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  height: calc(100% + 24px);
  max-height: calc(100% + 24px);
  overflow: hidden;
  background: #f5f6f8;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
}

.detail-tab-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  padding: 0 12px;
  margin-bottom: 8px;
  border-radius: 6px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 25;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);

  .head-left {
    display: flex;
    align-items: center;
    gap: 4px;
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

  .head-actions {
    flex-shrink: 0;
    padding: 8px 0;
  }
}

.detail-tabs {
  flex: 1;
  min-width: 0;
  background: transparent;
  padding: 0;
  margin-bottom: 0;
  border-radius: 0;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}

.page-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 0;
  padding: 0 8px 8px;
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
  flex-shrink: 0;

  .section-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 12px;
  }
}

.info-card {
  .info-block + .info-block {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #f0f0f0;
  }
}

.table-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  :deep(.bom-material-table) {
    height: auto;
  }
}

.versions-tab-card {
  margin: 0 8px 8px;
}

.link {
  color: #1677ff;
  cursor: pointer;
}

@media (max-width: 992px) {
  .page-body {
    flex-direction: column;
  }

  .left-panel {
    width: 100% !important;
    max-width: none;
    min-height: 240px;
  }

  .panel-resizer {
    display: none;
  }
}
</style>
