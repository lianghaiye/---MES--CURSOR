<template>
  <div class="product-bom-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="BOM编号">
              <a-input
                v-model:value="filters.bomNo"
                allow-clear
                size="small"
                placeholder="请输入 BOM 编号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="BOM名称">
              <a-input
                v-model:value="filters.bomName"
                allow-clear
                size="small"
                placeholder="请输入 BOM 名称"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="物品名称">
              <a-select
                v-model:value="filters.itemId"
                allow-clear
                show-search
                size="small"
                placeholder="请选择物品"
                :filter-option="filterItem"
                :options="itemFilterOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="BOM状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择状态"
                :options="bomStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                size="small"
                placeholder="请输入规格型号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="材质">
              <a-input
                v-model:value="filters.material"
                allow-clear
                size="small"
                placeholder="请输入材质"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="图号">
              <a-input
                v-model:value="filters.drawingNo"
                allow-clear
                size="small"
                placeholder="请输入图号"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space wrap :size="8">
        <a-button type="primary" size="small" @click="openCreateProductBom">
          <PlusOutlined />
          新增产品BOM
        </a-button>
        <a-button size="small" @click="openCreateBaselineBom">
          <PlusOutlined />
          新增基准BOM
        </a-button>
        <a-button size="small" @click="openCreateShipBom">
          <PlusOutlined />
          新增发运BOM
        </a-button>
        <a-button size="small" @click="handleBatchEnable">
          <CheckOutlined />
          审核发布
        </a-button>
        <a-button size="small" @click="handleBatchArchive">
          <InboxOutlined />
          归档
        </a-button>
        <a-dropdown>
          <a-button size="small">
            <DownloadOutlined />
            导出BOM
            <DownOutlined />
          </a-button>
          <template #overlay>
            <a-menu @click="onExportMenu">
              <a-menu-item key="selected">导出选中</a-menu-item>
              <a-menu-item key="all">导出全部</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
        <TableColumnSettingButton @click="columnDrawerOpen = true" />
      </a-space>
    </div>

    <div class="table-card">
      <a-table
        :columns="displayColumns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="false"
        :row-selection="rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'bomName'">
            <a class="link-name" @click.prevent="openDetail(record)">{{ record.bomName }}</a>
          </template>
          <template v-else-if="column.key === 'bomType'">
            {{ normalizeBomType(record.bomType) }}
          </template>
          <template v-else-if="column.key === 'itemName' || column.dataIndex === 'itemName'">
            <span v-if="isShipBomType(record.bomType)">
              {{ formatShipBomItemLabel(record) }}
            </span>
            <span v-else>{{ record.itemName || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'version'">
            <a class="link-name" @click.prevent="openVersionDrawer(record)">{{ record.version }}</a>
          </template>
          <template v-else-if="column.key === 'isDefault'">
            <a-tag :color="record.isDefault ? 'success' : 'error'">
              {{ record.isDefault ? '是' : '否' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'levelCount'">
            {{ record.levelCount ?? '—' }}
          </template>
          <template v-else-if="column.key === 'materialCount'">
            {{ record.materialCount ?? '—' }}
          </template>
          <template v-else-if="column.key === 'matchingRequirements'">
            {{ record.matchingRequirements || record.remark || '—' }}
          </template>
          <template v-else-if="['specModel', 'material', 'drawingNo'].includes(column.dataIndex)">
            {{ record[column.dataIndex] || '—' }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="isBomPending(record)" :size="0" wrap>
              <a-button type="link" size="small" @click="handleEnable(record)">
                <CheckOutlined />
                启用
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />
                编辑
              </a-button>
              <a-dropdown>
                <a-button type="link" size="small">
                  操作
                  <DownOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => onPendingAction(key, record)">
                    <a-menu-item key="delete">
                      <DeleteOutlined />
                      删除
                    </a-menu-item>
                    <a-menu-item key="clone">
                      <CopyOutlined />
                      克隆
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
            <a-space v-else-if="isBomActive(record)" :size="0" wrap>
              <a-button type="link" size="small" @click="openEdit(record)">
                <EditOutlined />
                编辑
              </a-button>
              <a-button type="link" size="small" @click="openRelationDrawer(record)">
                查看关联BOM
              </a-button>
              <a-dropdown>
                <a-button type="link" size="small">
                  操作
                  <DownOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => onActiveAction(key, record)">
                    <a-menu-item key="archive">
                      <InboxOutlined />
                      归档
                    </a-menu-item>
                    <a-menu-item key="clone">
                      <CopyOutlined />
                      克隆
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
            <a-space v-else-if="isBomArchived(record)" :size="0" wrap>
              <a-button type="link" size="small" @click="handleClone(record)">
                <CopyOutlined />
                克隆
              </a-button>
            </a-space>
            <span v-else class="action-disabled">—</span>
          </template>
        </template>
      </a-table>

      <div class="table-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredList.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>

    <ProductBomVersionDrawer v-model:open="versionOpen" :record="versionRecord" />

    <BomEnableReferenceModal
      v-model:open="enableRefOpen"
      :product-name="enableTarget?.itemName || ''"
      :bom-name="enableTarget?.bomName || ''"
      :new-version="enableNewVersion"
      :current-version="enableCurrentVersion"
      :refs="enableParentRefs"
      @confirm="onEnableRefConfirm"
    />

    <BomRelationDrawer v-model:open="relationOpen" :bom="relationBom" />

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'ProductBomView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DeleteOutlined,
  CopyOutlined,
  EditOutlined,
  InboxOutlined,
  DownloadOutlined,
  DownOutlined,
  CheckOutlined,
} from '@ant-design/icons-vue'
import { filterProductBoms } from '@/mock/productBom'
import {
  bomStatusOptions,
  bomStatusColor,
  isBomPending,
  isBomActive,
  isBomArchived,
} from '@/mock/productBomOptions'
import { normalizeBomType, isShipBomType, SHIP_KIT_ITEM_TYPE } from '@/mock/bomMaterialColumns'
import { productBomState } from '@/store/productBomStore'
import {
  deleteProductBom,
  cloneProductBom,
  archiveProductBom,
  batchArchiveProductBom,
  batchEnableProductBom,
  enableProductBom,
} from '@/store/productBomStore'
import { findParentRefsForBomUpgrade } from '@/utils/bomVersionReference'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import ProductBomVersionDrawer from './components/ProductBomVersionDrawer.vue'
import BomEnableReferenceModal from './components/BomEnableReferenceModal.vue'
import BomRelationDrawer from './components/BomRelationDrawer.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { buildMasterLookup, enrichProductBomList } from '@/utils/productBomListEnrich'

const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  bomNo: '',
  bomName: '',
  itemId: undefined,
  status: undefined,
  specModel: '',
  material: '',
  drawingNo: '',
})
const appliedFilters = ref({ ...filters })
const selectedRowKeys = ref([])
const pagination = reactive({ current: 1, pageSize: 10 })
const versionOpen = ref(false)
const versionRecord = ref(null)
const enableRefOpen = ref(false)
const enableTarget = ref(null)
const enableParentRefs = ref([])
const enableNewVersion = ref('')
const enableCurrentVersion = ref('')
const relationOpen = ref(false)
const relationBom = ref(null)

const itemFilterOptions = computed(() => {
  const products = productInfoState.products.slice(0, 150).map((p) => ({
    label: p.name,
    value: p.id,
  }))
  const materials = materialInfoState.materials.slice(0, 80).map((m) => ({
    label: m.name,
    value: m.id,
  }))
  return [...products, ...materials]
})

function filterItem(input, option) {
  return (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
}

const masterLookup = computed(() =>
  buildMasterLookup(productInfoState.products, materialInfoState.materials),
)

const enrichedList = computed(() => enrichProductBomList(productBomState.boms, masterLookup.value))

const filteredList = computed(() => filterProductBoms(enrichedList.value, appliedFilters.value))

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const rowSelection = computed(() => ({
  fixed: true,
  columnWidth: 40,
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

const baseColumns = [
  { title: 'BOM状态', key: 'status', width: 92, fixed: 'left' },
  { title: 'BOM名称', key: 'bomName', width: 160, fixed: 'left', ellipsis: true },
  { title: 'BOM编号', dataIndex: 'bomNo', width: 140, ellipsis: true },
  { title: 'BOM类型', key: 'bomType', width: 100 },
  { title: '物品/适用', key: 'itemName', dataIndex: 'itemName', width: 180, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: 'BOM版本', key: 'version', dataIndex: 'version', width: 100 },
  { title: '层级数', key: 'levelCount', width: 72, align: 'center' },
  { title: '物料数', key: 'materialCount', width: 72, align: 'center' },
  { title: '是否默认', key: 'isDefault', width: 88, align: 'center' },
  { title: '生效日期', dataIndex: 'effectiveAt', width: 150 },
  { title: '失效日期', dataIndex: 'expiredAt', width: 150 },
  { title: '配套要求', key: 'matchingRequirements', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 260, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('product-bom-list', baseColumns, { minScrollX: 2200 })

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function formatShipBomItemLabel(record) {
  const n = Array.isArray(record.applicableProductIds) ? record.applicableProductIds.length : 0
  if (record.itemType === SHIP_KIT_ITEM_TYPE || n > 0) {
    return n > 0 ? `共用附件包 · 适用 ${n} 个产品` : '共用附件包 · 未指定产品'
  }
  return record.itemName || '—'
}

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function handleReset() {
  filters.bomNo = ''
  filters.bomName = ''
  filters.itemId = undefined
  filters.status = undefined
  filters.specModel = ''
  filters.material = ''
  filters.drawingNo = ''
  handleSearch()
}

function openDetail(record) {
  const resolved = router.resolve({
    name: 'product-process-bom-detail',
    params: { id: record.id },
  })
  openTab(resolved.path, record.bomName || 'BOM详情')
  router.push(resolved)
}

function openCreateProductBom() {
  const path = '/product-process/bom/new'
  const query = { bomType: '产品BOM' }
  openTab(path, '新增产品BOM')
  router.push({ path, query })
}

function openCreateBaselineBom() {
  const path = '/product-process/bom/new'
  const query = { bomType: '基准BOM' }
  openTab(path, '新增基准BOM')
  router.push({ path, query })
}

function openCreateShipBom() {
  const path = '/product-process/bom/new'
  const query = { bomType: '发运BOM' }
  openTab(path, '新增发运BOM')
  router.push({ path, query })
}

function openEdit(record) {
  if (!isBomPending(record) && !isBomActive(record)) {
    message.warning('当前状态的 BOM 不可编辑')
    return
  }
  const path = `/product-process/bom/${record.id}/edit`
  openTab(path, `编辑BOM·${record.bomName || ''}`)
  router.push(path)
}

function openVersionDrawer(record) {
  versionRecord.value = record
  versionOpen.value = true
}

function openRelationDrawer(record) {
  relationBom.value = record
  relationOpen.value = true
}

function onPendingAction(key, record) {
  if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除 BOM「${record.bomName}」吗？`,
      okType: 'danger',
      onOk: () => {
        const res = deleteProductBom(record.id)
        if (res?.error) {
          message.warning(res.error)
          return
        }
        message.success('已删除')
        selectedRowKeys.value = selectedRowKeys.value.filter((k) => k !== record.id)
      },
    })
    return
  }
  if (key === 'clone') handleClone(record)
}

function onActiveAction(key, record) {
  if (key === 'archive') {
    archiveProductBom(record.id)
    message.success('已归档')
    return
  }
  if (key === 'clone') handleClone(record)
}

function handleBatchEnable() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要启用的 BOM')
    return
  }
  const targets = productBomState.boms.filter(
    (r) => selectedRowKeys.value.includes(r.id) && isBomPending(r),
  )
  if (!targets.length) {
    message.warning('所选记录中没有「待发布」状态的 BOM')
    return
  }
  Modal.confirm({
    title: '批量审核发布',
    content: `确定审核发布选中的 ${targets.length} 条待发布 BOM 吗？同物品仅允许一个生效版本。`,
    onOk: () => {
      const { ok, errors } = batchEnableProductBom(selectedRowKeys.value)
      selectedRowKeys.value = []
      if (ok) message.success(`已成功发布 ${ok} 条`)
      if (errors.length) {
        message.warning(errors.slice(0, 3).join('；') + (errors.length > 3 ? '…' : ''))
      }
    },
  })
}

function handleBatchArchive() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先选择要归档的 BOM')
    return
  }
  const targets = productBomState.boms.filter(
    (r) => selectedRowKeys.value.includes(r.id) && r.status !== '已归档',
  )
  if (!targets.length) {
    message.warning('所选记录均已归档或不可归档')
    return
  }
  Modal.confirm({
    title: '批量归档',
    content: `确定归档选中的 ${targets.length} 条 BOM 吗？`,
    onOk: () => {
      const count = batchArchiveProductBom(selectedRowKeys.value)
      selectedRowKeys.value = []
      message.success(`已归档 ${count} 条`)
    },
  })
}

function handleClone(record) {
  const cloned = cloneProductBom(record.id)
  if (cloned) message.success('已克隆为待发布版本')
}

function doEnable(record, upgradeParentRefs = false, parentRefs = []) {
  const res = enableProductBom(record.id, { upgradeParentRefs, parentRefs })
  if (res?.error) {
    message.warning(res.error)
    return
  }
  const syncHint =
    upgradeParentRefs && parentRefs.length
      ? `，已同步更新 ${parentRefs.length} 个父级 BOM 的引用版本`
      : ''
  message.success(`审核发布成功，当前版本已生效可用于生产${syncHint}`)
}

function handleEnable(record) {
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
  doEnable(record)
}

function onEnableRefConfirm({ action, selectedRefs }) {
  if (!enableTarget.value) return
  if (action === 'reject') {
    message.info('已取消本次审核发布')
    enableTarget.value = null
    enableParentRefs.value = []
    enableNewVersion.value = ''
    enableCurrentVersion.value = ''
    return
  }
  const upgrade = action === 'upgrade'
  doEnable(enableTarget.value, upgrade, upgrade ? selectedRefs : [])
  enableTarget.value = null
  enableParentRefs.value = []
  enableNewVersion.value = ''
  enableCurrentVersion.value = ''
}

function onExportMenu({ key }) {
  message.info(key === 'selected' ? '导出选中功能开发中' : '导出全部功能开发中')
}
</script>

<style lang="less" scoped>
.product-bom-page {
  margin: -12px;
  padding: 0;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
    white-space: nowrap;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}

.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.table-card {
  padding: 8px 12px 12px;

  :deep(.ant-table-thead > tr > th) {
    background: #fafafa;
    font-weight: 500;
    padding: 8px;
    font-size: 13px;
  }

  :deep(.ant-table-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 13px;
  }
}

.link-name {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}

.action-disabled {
  color: rgba(0, 0, 0, 0.25);
  font-size: 13px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
