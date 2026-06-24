<template>
  <div class="product-bom-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-page-head">
          <a-tabs v-model:active-key="activeTab" class="detail-tabs">
            <a-tab-pane key="detail" tab="BOM明细" />
            <a-tab-pane key="versions" tab="历史版本" />
            <a-tab-pane key="logs" tab="操作记录" />
          </a-tabs>
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
          <div class="page-body">
            <aside class="left-panel" :style="{ width: `${leftPanelWidth}px` }">
              <BomTreePanel
                readonly
                :flat-nodes="flatNodes"
                :line-items="lineItems"
                :selected-node-id="selectedNodeId"
                :version-info="versionInfo"
                :root-meta="detailRootMeta"
                @select-node="selectedNodeId = $event"
              />
            </aside>
            <div class="panel-resizer" @mousedown.prevent="onResizeMouseDown" />
            <main class="right-panel">
              <div class="section-card">
                <div class="section-title">基础信息</div>
                <a-descriptions :column="3" size="small" bordered class="basic-desc">
                  <a-descriptions-item label="BOM编码">{{ record.bomNo }}</a-descriptions-item>
                  <a-descriptions-item label="BOM名称">{{ record.bomName }}</a-descriptions-item>
                  <a-descriptions-item label="BOM类型">
                    {{ record.bomType === '基础BOM' ? '基准BOM' : record.bomType || '基准BOM' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="物品名称">{{ record.itemName }}</a-descriptions-item>
                  <a-descriptions-item label="规格型号">
                    {{ record.specModel || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="BOM版本">{{ record.version }}</a-descriptions-item>
                  <a-descriptions-item label="材质">
                    {{ record.material || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="图号">
                    {{ record.drawingNo || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="技术参数">
                    {{ record.techParams || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="工艺路线">
                    {{ record.processRoute || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="BOM状态">
                    <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="生效日期">
                    {{ formatDisplayDate(record.effectiveAt) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="失效日期">
                    {{ formatDisplayDate(record.expiredAt) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="配套要求" :span="3">
                    {{ record.matchingRequirements || record.remark || '—' }}
                  </a-descriptions-item>
                </a-descriptions>
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

        <template v-else-if="activeTab === 'versions'">
          <div class="section-card">
            <a-table
              :columns="versionColumns"
              :data-source="versionList"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            >
              <template #bodyCell="{ column, record: ver }">
                <template v-if="column.key === 'status'">
                  <a-tag :color="bomStatusColor(ver.status)">{{ ver.status }}</a-tag>
                </template>
                <template v-else-if="column.key === 'isDefault'">
                  <a-tag :color="ver.isDefault ? 'success' : 'default'">
                    {{ ver.isDefault ? '是' : '否' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'bomNo'">
                  <a class="link" @click.prevent="openBomDetail(ver)">{{ ver.bomNo }}</a>
                </template>
              </template>
            </a-table>
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
      </template>
      <a-empty v-else-if="!loading" description="未找到该 BOM" />
    </a-spin>
  </div>
</template>

<script>
export default { name: 'ProductBomDetailView' }
</script>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { PrinterOutlined } from '@ant-design/icons-vue'
import { getVersionsInGroup } from '@/mock/productBom'
import { buildBomOperationLogs } from '@/mock/bomOperationLogs'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import { defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'
import { mergeColumnSettings } from '@/utils/tableColumnSettings'
import { bomStatusColor, isBomEditable } from '@/mock/productBomOptions'
import { getProductBomById, archiveProductBom, productBomState } from '@/store/productBomStore'
import { loadBomDetailStructure } from '@/utils/bomImport'
import { getLinesForTreeNode, ROOT_ID, getRootTreeId } from '@/utils/bomTree'
import { tabStore, useTabs } from '@/composables/useTabs'
import BomTreePanel from './components/BomTreePanel.vue'
import BomMaterialTable from './components/BomMaterialTable.vue'
import BomOverviewModal from './components/BomOverviewModal.vue'
import BomPrintModal from './components/BomPrintModal.vue'
import BomRelationDrawer from './components/BomRelationDrawer.vue'

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
const leftPanelWidth = ref(280)
const MIN_LEFT_WIDTH = 200
const MAX_LEFT_WIDTH = 520
let resizing = false
let resizeStartX = 0
let resizeStartWidth = 0

const versionColumns = [
  { title: 'BOM状态', key: 'status', width: 90 },
  { title: 'BOM编号', key: 'bomNo', width: 130 },
  { title: 'BOM名称', dataIndex: 'bomName', width: 160, ellipsis: true },
  { title: 'BOM版本', dataIndex: 'version', width: 96 },
  { title: '是否默认', key: 'isDefault', width: 88 },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '失效日期', dataIndex: 'expiredAt', width: 150 },
]

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 160 },
  { title: '操作人', dataIndex: 'operator', width: 100 },
  { title: '操作类型', dataIndex: 'action', width: 100 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const versionInfo = computed(() =>
  record.value
    ? {
        version: record.value.version,
        effectiveAt: record.value.effectiveAt,
      }
    : null,
)

const displayLines = computed(() =>
  getLinesForTreeNode(lineItems.value, selectedNodeId.value, flatNodes.value),
)

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
  Modal.confirm({
    title: '确认归档',
    content: `确定归档 BOM「${record.value.bomName}」吗？`,
    onOk: () => {
      archiveProductBom(record.value.id)
      loadDetail()
      message.success('已归档')
    },
  })
}

function handleBack() {
  const detailPath = route.path
  const listPath = '/product-process/bom'
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
.product-bom-detail-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 112px);
  background: #f5f6f8;
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
  display: flex;
  gap: 0;
  padding: 0 8px 8px;
  min-height: 0;
}

.left-panel {
  flex: 0 0 auto;
  min-width: 200px;
  max-width: 520px;
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
    margin-bottom: 12px;
  }
}

.table-section {
  flex: 1;
  min-height: 280px;
}

.basic-desc {
  :deep(.ant-descriptions-item-label) {
    width: 100px;
    color: rgba(0, 0, 0, 0.45);
  }
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
    width: 100%;
  }
}
</style>
