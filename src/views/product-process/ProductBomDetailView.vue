<template>
  <div class="product-bom-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <a-tabs v-model:active-key="activeTab" class="detail-tabs">
          <a-tab-pane key="detail" tab="BOM明细" />
          <a-tab-pane key="versions" tab="历史版本" />
          <a-tab-pane key="logs" tab="操作记录" />
        </a-tabs>

        <template v-if="activeTab === 'detail'">
          <div class="page-body">
            <aside class="left-panel">
              <BomTreePanel
                readonly
                :flat-nodes="flatNodes"
                :selected-node-id="selectedNodeId"
                :version-info="versionInfo"
                @select-node="selectedNodeId = $event"
              />
            </aside>
            <main class="right-panel">
              <div class="section-card">
                <div class="section-title">基础信息</div>
                <a-descriptions :column="3" size="small" bordered class="basic-desc">
                  <a-descriptions-item label="BOM编码">{{ record.bomNo }}</a-descriptions-item>
                  <a-descriptions-item label="BOM名称">{{ record.bomName }}</a-descriptions-item>
                  <a-descriptions-item label="BOM类型">
                    {{ record.bomType || '基础BOM' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="物品名称">{{ record.itemName }}</a-descriptions-item>
                  <a-descriptions-item label="规格型号">
                    {{ record.specModel || '—' }}
                  </a-descriptions-item>
                  <a-descriptions-item label="BOM版本">{{ record.version }}</a-descriptions-item>
                  <a-descriptions-item label="BOM状态">
                    <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
                  </a-descriptions-item>
                  <a-descriptions-item label="生效日期">
                    {{ formatDisplayDate(record.effectiveAt) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="失效日期">
                    {{ formatDisplayDate(record.expiredAt) }}
                  </a-descriptions-item>
                  <a-descriptions-item label="备注" :span="3">
                    {{ record.remark || '—' }}
                  </a-descriptions-item>
                </a-descriptions>
              </div>
              <div class="section-card table-section">
                <BomMaterialTable
                  readonly
                  :lines="displayLines"
                  :column-settings="columnSettings"
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

        <div class="page-footer">
          <a-space>
            <a-button :disabled="!canEdit" @click="handleEdit">编辑</a-button>
            <a-button
              :disabled="record.status === '已归档'"
              @click="handleArchive"
            >
              归档
            </a-button>
            <a-button @click="handleBack">返回</a-button>
          </a-space>
        </div>
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
import { getVersionsInGroup } from '@/mock/productBom'
import { buildBomOperationLogs } from '@/mock/bomOperationLogs'
import { defaultBomColumnSettings } from '@/mock/bomMaterialColumns'
import { bomStatusColor } from '@/mock/productBomOptions'
import {
  getProductBomById,
  archiveProductBom,
  productBomState,
} from '@/store/productBomStore'
import { loadBomDetailStructure } from '@/utils/bomImport'
import { getLinesForTreeNode, ROOT_ID } from '@/utils/bomTree'
import { tabStore, useTabs } from '@/composables/useTabs'
import BomTreePanel from './components/BomTreePanel.vue'
import BomMaterialTable from './components/BomMaterialTable.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const flatNodes = ref([])
const lineItems = ref([])
const selectedNodeId = ref(ROOT_ID)
const activeTab = ref('detail')
const columnSettings = ref(JSON.parse(JSON.stringify(defaultBomColumnSettings)))

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
  getLinesForTreeNode(lineItems.value, selectedNodeId.value),
)

const versionList = computed(() => {
  if (!record.value?.versionGroupId) return record.value ? [record.value] : []
  return getVersionsInGroup(productBomState.boms, record.value.versionGroupId)
})

const operationLogs = computed(() => buildBomOperationLogs(record.value))

const canEdit = computed(() => record.value?.status === '待启用')

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
    selectedNodeId.value = ROOT_ID

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
  if (!canEdit.value) {
    message.info('仅待启用状态的 BOM 可编辑')
    return
  }
  message.info('编辑功能：请返回列表使用编辑操作')
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
  router.push('/product-process/bom')
}
</script>

<style lang="less" scoped>
.product-bom-detail-page {
  margin: -12px;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 112px);
  background: #f5f6f8;
}

.detail-tabs {
  background: #fff;
  padding: 0 12px;
  margin-bottom: 8px;
  border-radius: 6px 6px 0 0;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }
}

.page-body {
  flex: 1;
  display: flex;
  gap: 8px;
  padding: 0 8px 8px;
  min-height: 0;
}

.left-panel {
  flex: 0 0 280px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 10px;
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

.page-footer {
  flex-shrink: 0;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  margin: 0 8px 8px;
  border-radius: 0 0 6px 6px;
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
