<template>
  <div class="product-bom-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item :label="isShipList ? '编号' : 'BOM编号'">
              <a-input
                v-model:value="filters.bomNo"
                allow-clear
                size="small"
                :placeholder="isShipList ? '请输入编号' : '请输入 BOM 编号'"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item :label="isShipList ? '名称' : 'BOM名称'">
              <a-input
                v-model:value="filters.bomName"
                allow-clear
                size="small"
                :placeholder="isShipList ? '请输入名称' : '请输入 BOM 名称'"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="isShipList" :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="适用范围">
              <a-select
                v-model:value="filters.scopeType"
                allow-clear
                size="small"
                placeholder="请选择"
                :options="shipAttachmentScopeTypeOptions"
              />
            </a-form-item>
          </a-col>
          <a-col v-else :xs="24" :sm="12" :md="6" :lg="5">
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
            <a-form-item :label="isShipList ? '状态' : 'BOM状态'">
              <a-select
                v-model:value="filters.status"
                allow-clear
                size="small"
                placeholder="请选择状态"
                :options="isShipList ? shipAttachmentStatusOptions : bomStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="!isShipList" :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                size="small"
                placeholder="请输入规格型号"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="!isShipList" :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="材质">
              <a-input
                v-model:value="filters.material"
                allow-clear
                size="small"
                placeholder="请输入材质"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="!isShipList" :xs="24" :sm="12" :md="6" :lg="5">
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
        <a-button v-if="!isShipList" type="primary" size="small" @click="openCreateProductBom">
          <PlusOutlined />
          新增产品BOM
        </a-button>
        <a-button v-if="!isShipList" size="small" @click="openCreateBaselineBom">
          <PlusOutlined />
          新增基准BOM
        </a-button>
        <a-button v-if="isShipList" type="primary" size="small" @click="openCreateShipBom">
          <PlusOutlined />
          新增随货附件
        </a-button>
        <a-button v-if="isShipList" size="small" @click="probeOpen = true">匹配试算</a-button>
        <a-button v-if="!isShipList" size="small" @click="handleBatchEnable">
          <CheckOutlined />
          审核发布
        </a-button>
        <a-button v-if="!isShipList" size="small" @click="handleBatchArchive">
          <InboxOutlined />
          归档
        </a-button>
        <a-dropdown v-if="!isShipList">
          <a-button size="small">
            <DownloadOutlined />
            {{ isShipList ? '导出' : '导出BOM' }}
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
        :row-selection="isShipList ? null : rowSelection"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag
              v-if="isShipList"
              :color="isShipAttachmentEnabled(record) ? 'success' : 'default'"
            >
              {{ displayShipAttachmentStatus(record) }}
            </a-tag>
            <a-tag v-else :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'bomName'">
            <a class="link-name" @click.prevent="openDetail(record)">{{ record.bomName }}</a>
          </template>
          <template v-else-if="column.key === 'bomType'">
            {{ formatBomTypeLabel(record.bomType) }}
          </template>
          <template v-else-if="column.key === 'scopeType'">
            {{
              shipAttachmentScopeTypeLabel(
                record.scopeType || normalizeShipAttachmentScope(record).scopeType,
              )
            }}
          </template>
          <template v-else-if="column.key === 'scopeObjects'">
            <span :title="formatShipAttachmentObjects(record)">
              {{ formatShipAttachmentObjects(record) }}
            </span>
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
            <a-space v-if="isShipList" :size="0">
              <a-button type="link" size="small" @click="handleToggleShipStatus(record)">
                {{ isShipAttachmentEnabled(record) ? '停用' : '启用' }}
              </a-button>
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" @click="handleClone(record)">复制</a-button>
            </a-space>
            <a-space v-else-if="isBomPending(record)" :size="0" wrap>
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
              <a-button
                v-if="!isShipList"
                type="link"
                size="small"
                @click="openRelationDrawer(record)"
              >
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

    <BomArchiveReferenceModal
      v-model:open="archiveRefOpen"
      :item-name="archiveTarget?.itemName || ''"
      :bom-name="archiveTarget?.bomName || ''"
      :version="archiveTarget?.version || ''"
      :refs="archiveParentRefs"
      @confirm="onArchiveRefConfirm"
      @cancel="onArchiveRefCancel"
    />

    <BomRelationDrawer v-model:open="relationOpen" :bom="relationBom" />

    <QcTemplateConflictModal
      v-model:open="shipConflictOpen"
      title="随货附件冲突"
      entity-label="随货附件"
      :kind="shipConflictKind"
      :conflicts="shipConflictRows"
      :current-template-name="shipConflictName"
      @confirm="onShipConflictConfirm"
      @cancel="pendingShipEnableId = ''"
    />

    <ShipAttachmentMatchProbeDrawer v-if="isShipList" v-model:open="probeOpen" />

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
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
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
import { isShipBomType, SHIP_KIT_ITEM_TYPE, BOM_TYPE } from '@/mock/bomMaterialColumns'
import {
  SHIP_ATTACHMENT_DISPLAY_NAME,
  SHIP_ATTACHMENT_LIST_PATH,
  SHIP_ATTACHMENT_ROUTE,
  formatBomTypeLabel,
  shipAttachmentCreatePath,
  bomWorkspaceDetailPath,
  bomWorkspaceEditPath,
} from '@/utils/shipAttachmentNav'
import { productBomState } from '@/store/productBomStore'
import {
  deleteProductBom,
  cloneProductBom,
  archiveProductBom,
  batchEnableProductBom,
  enableProductBom,
  enableShipAttachment,
  disableShipAttachment,
} from '@/store/productBomStore'
import { findParentBomReferences, findParentRefsForBomUpgrade } from '@/utils/bomVersionReference'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import ProductBomVersionDrawer from './components/ProductBomVersionDrawer.vue'
import BomEnableReferenceModal from './components/BomEnableReferenceModal.vue'
import BomArchiveReferenceModal from './components/BomArchiveReferenceModal.vue'
import BomRelationDrawer from './components/BomRelationDrawer.vue'
import QcTemplateConflictModal from '@/views/quality/components/QcTemplateConflictModal.vue'
import ShipAttachmentMatchProbeDrawer from './components/ShipAttachmentMatchProbeDrawer.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { buildMasterLookup, enrichProductBomList } from '@/utils/productBomListEnrich'
import {
  displayShipAttachmentStatus,
  formatShipAttachmentObjects,
  isShipAttachmentEnabled,
  normalizeShipAttachmentScope,
  shipAttachmentScopeTypeLabel,
  shipAttachmentScopeTypeOptions,
  shipAttachmentStatusOptions,
} from '@/utils/shipAttachmentScope'

const router = useRouter()
const route = useRoute()
const { openTab } = useTabs()

const isShipList = computed(
  () =>
    route.name === SHIP_ATTACHMENT_ROUTE.list ||
    String(route.path).startsWith(SHIP_ATTACHMENT_LIST_PATH),
)

const filters = reactive({
  bomNo: '',
  bomName: '',
  itemId: undefined,
  status: undefined,
  scopeType: undefined,
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
const archiveRefOpen = ref(false)
const archiveTarget = ref(null)
const archiveParentRefs = ref([])
/** 批量归档时待处理队列（需弹窗的 BOM） */
const archiveQueue = ref([])
const relationOpen = ref(false)
const relationBom = ref(null)
const shipConflictOpen = ref(false)
const shipConflictKind = ref('single')
const shipConflictRows = ref([])
const shipConflictName = ref('')
const pendingShipEnableId = ref('')
const probeOpen = ref(false)

const itemFilterOptions = computed(() => {
  const products = productInfoState.products.slice(0, 150).map((p) => ({
    label: p.name,
    value: p.id,
  }))
  if (isShipList.value) return products
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

const filteredList = computed(() =>
  filterProductBoms(enrichedList.value, {
    ...appliedFilters.value,
    onlyShip: isShipList.value,
    excludeShip: !isShipList.value,
  }),
)

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

const productBaseColumns = [
  { title: 'BOM状态', key: 'status', width: 92, fixed: 'left' },
  { title: 'BOM名称', key: 'bomName', width: 160, fixed: 'left', ellipsis: true },
  { title: 'BOM编号', dataIndex: 'bomNo', width: 140, ellipsis: true },
  { title: 'BOM类型', key: 'bomType', width: 100 },
  { title: '物品名称', key: 'itemName', dataIndex: 'itemName', width: 180, ellipsis: true },
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

const shipBaseColumns = [
  { title: '状态', key: 'status', width: 80, fixed: 'left' },
  { title: '名称', key: 'bomName', width: 180, fixed: 'left', ellipsis: true },
  { title: '编号', dataIndex: 'bomNo', width: 140, ellipsis: true },
  { title: '适用范围', key: 'scopeType', width: 90 },
  { title: '适用对象', key: 'scopeObjects', width: 200, ellipsis: true },
  { title: '层级数', key: 'levelCount', width: 72, align: 'center' },
  { title: '物料数', key: 'materialCount', width: 72, align: 'center' },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const productTable = useTableColumnSettings('product-bom-list', productBaseColumns, {
  minScrollX: 2200,
})
const shipTable = useTableColumnSettings('ship-attachment-list-v2', shipBaseColumns, {
  minScrollX: 1600,
})

const columnSettings = computed({
  get: () =>
    isShipList.value ? shipTable.columnSettings.value : productTable.columnSettings.value,
  set: (value) => {
    if (isShipList.value) shipTable.columnSettings.value = value
    else productTable.columnSettings.value = value
  },
})
const columnDrawerOpen = computed({
  get: () =>
    isShipList.value ? shipTable.columnDrawerOpen.value : productTable.columnDrawerOpen.value,
  set: (value) => {
    if (isShipList.value) shipTable.columnDrawerOpen.value = value
    else productTable.columnDrawerOpen.value = value
  },
})
const displayColumns = computed(() =>
  isShipList.value ? shipTable.displayColumns.value : productTable.displayColumns.value,
)
const tableScrollX = computed(() =>
  isShipList.value ? shipTable.tableScrollX.value : productTable.tableScrollX.value,
)
const defaultColumnSettings = computed(() =>
  isShipList.value ? shipTable.defaultColumnSettings : productTable.defaultColumnSettings,
)

function rowIndex(index) {
  return (pagination.current - 1) * pagination.pageSize + index + 1
}

function formatShipBomItemLabel(record) {
  const n = Array.isArray(record.applicableProductIds) ? record.applicableProductIds.length : 0
  if (record.itemType === SHIP_KIT_ITEM_TYPE || n > 0) {
    return n > 0 ? `适用 ${n} 个产品` : '未指定适用产品'
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
  filters.scopeType = undefined
  handleSearch()
}

function openDetail(record) {
  const path = bomWorkspaceDetailPath(record)
  openTab(path, record.bomName || (isShipList.value ? '随货附件详情' : 'BOM详情'))
  router.push(path)
}

function openCreateProductBom() {
  openCreateTab(router, openTab, {
    path: '/product-process/bom/new',
    title: '新增产品BOM',
    query: { bomType: '产品BOM' },
  })
}

function openCreateBaselineBom() {
  openCreateTab(router, openTab, {
    path: '/product-process/bom/new',
    title: '新增基准BOM',
    query: { bomType: '基准BOM' },
  })
}

function openCreateShipBom() {
  openCreateTab(router, openTab, {
    path: shipAttachmentCreatePath(),
    title: `新增${SHIP_ATTACHMENT_DISPLAY_NAME}`,
    query: { bomType: BOM_TYPE.SHIP },
  })
}

function openEdit(record) {
  if (!isShipList.value && !isBomPending(record) && !isBomActive(record)) {
    message.warning('当前状态的 BOM 不可编辑')
    return
  }
  const path = bomWorkspaceEditPath(record)
  openTab(
    path,
    `编辑${isShipList.value ? SHIP_ATTACHMENT_DISPLAY_NAME : 'BOM'}·${record.bomName || ''}`,
  )
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
      content: `确定删除${isShipBomType(record.bomType) ? '随货附件' : 'BOM'}「${record.bomName}」吗？`,
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
    requestArchive(record)
    return
  }
  if (key === 'clone') handleClone(record)
}

function archiveSuccessMessage(res) {
  if (!res || res === true) return '已归档'
  const parts = ['已归档']
  if (res.removedCount) parts.push(`已从母件移除 ${res.removedCount} 处`)
  if (res.keptCount) parts.push(`已保留本级 ${res.keptCount} 处`)
  if (parts.length === 1 && res.parentTouched) {
    return `已归档，并已处理 ${res.parentTouched} 处母件引用`
  }
  return parts.join('，')
}

function doArchive(record, options = {}) {
  const res = archiveProductBom(record.id, options)
  if (!res) {
    message.warning('归档失败')
    return false
  }
  message.success(archiveSuccessMessage(res))
  return true
}

function openArchiveRefModal(record, refs) {
  archiveTarget.value = record
  archiveParentRefs.value = refs
  archiveRefOpen.value = true
}

function requestArchive(record) {
  const refs = findParentBomReferences(record)
  if (!refs.length) {
    doArchive(record)
    return
  }
  archiveQueue.value = []
  openArchiveRefModal(record, refs)
}

function processNextArchiveInQueue() {
  const next = archiveQueue.value.shift()
  if (!next) return
  const refs = findParentBomReferences(next)
  if (!refs.length) {
    doArchive(next)
    processNextArchiveInQueue()
    return
  }
  openArchiveRefModal(next, refs)
}

function onArchiveRefConfirm({ removeRefs = [], keepSelfRefs = [] }) {
  const target = archiveTarget.value
  if (!target) return
  doArchive(target, { removeRefs, keepSelfRefs })
  archiveTarget.value = null
  archiveParentRefs.value = []
  processNextArchiveInQueue()
}

function onArchiveRefCancel() {
  archiveTarget.value = null
  archiveParentRefs.value = []
  archiveQueue.value = []
}

function handleBatchEnable() {
  if (!selectedRowKeys.value.length) {
    message.warning(isShipList.value ? '请先选择要启用的记录' : '请先选择要启用的 BOM')
    return
  }
  const targets = productBomState.boms.filter(
    (r) => selectedRowKeys.value.includes(r.id) && isBomPending(r),
  )
  if (!targets.length) {
    message.warning(
      isShipList.value
        ? '所选记录中没有「待发布」状态的随货附件'
        : '所选记录中没有「待发布」状态的 BOM',
    )
    return
  }
  Modal.confirm({
    title: '批量审核发布',
    content: `确定审核发布选中的 ${targets.length} 条待发布${isShipList.value ? '随货附件' : 'BOM'}吗？${isShipList.value ? '同一附件包仅允许一个生效版本。' : '同物品仅允许一个生效版本。'}`,
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
    message.warning(isShipList.value ? '请先选择要归档的记录' : '请先选择要归档的 BOM')
    return
  }
  const targets = productBomState.boms.filter(
    (r) => selectedRowKeys.value.includes(r.id) && r.status !== '已归档',
  )
  if (!targets.length) {
    message.warning('所选记录均已归档或不可归档')
    return
  }

  const withRefs = []
  const withoutRefs = []
  targets.forEach((row) => {
    const refs = findParentBomReferences(row)
    if (refs.length) withRefs.push(row)
    else withoutRefs.push(row)
  })

  Modal.confirm({
    title: '批量归档',
    content:
      withRefs.length > 0
        ? `将归档 ${targets.length} 条记录，其中 ${withRefs.length} 条被母件引用，需逐条确认如何处理母件中的子件。`
        : `确定归档选中的 ${targets.length} 条${isShipList.value ? '随货附件' : 'BOM'}吗？`,
    onOk: () => {
      withoutRefs.forEach((row) => archiveProductBom(row.id))
      selectedRowKeys.value = []
      if (!withRefs.length) {
        message.success(`已归档 ${withoutRefs.length} 条`)
        return
      }
      if (withoutRefs.length) {
        message.success(`已先归档 ${withoutRefs.length} 条无母件引用的 BOM`)
      }
      archiveQueue.value = [...withRefs]
      processNextArchiveInQueue()
    },
  })
}

function handleClone(record) {
  const cloned = cloneProductBom(record.id)
  if (cloned) {
    message.success(isShipList.value ? '已复制为停用状态' : '已克隆为待发布版本')
  }
}

function isShipAttachmentReferenced(record) {
  const id = String(record?.id || '')
  if (!id) return false
  const inDelivery = (deliveryOrderState.orders || []).some((o) =>
    (o.shipAttachments || []).some((a) => String(a.sourceBomId) === id),
  )
  if (inDelivery) return true
  return (salesOrderState.orders || []).some((so) =>
    (so.deliveryApplications || []).some((app) =>
      (app.shipAttachments || []).some((a) => String(a.sourceBomId) === id),
    ),
  )
}

function handleToggleShipStatus(record) {
  if (isShipAttachmentEnabled(record)) {
    const referenced = isShipAttachmentReferenced(record)
    Modal.confirm({
      title: '停用确认',
      content: referenced
        ? '当前随货附件已被引用，停用后，发货将按优先级匹配已启用的随货附件。是否确认停用？'
        : `确定要停用随货附件「${record.bomName}」吗？`,
      onOk: () => {
        const res = disableShipAttachment(record.id, { force: true })
        if (!res.ok) {
          message.warning(res.message || '操作失败')
          return
        }
        message.success('已停用')
      },
    })
    return
  }

  const res = enableShipAttachment(record.id)
  if (res.needConflict) {
    pendingShipEnableId.value = record.id
    shipConflictKind.value = res.conflict.kind
    shipConflictRows.value = res.conflict.conflicts || []
    shipConflictName.value = record.bomName || ''
    shipConflictOpen.value = true
    return
  }
  if (!res.ok) {
    message.warning(res.message || '启用失败')
    return
  }
  message.success('已启用')
}

function onShipConflictConfirm({ mode }) {
  if (!pendingShipEnableId.value) return
  const res = enableShipAttachment(pendingShipEnableId.value, {
    conflictResolution: { mode },
  })
  pendingShipEnableId.value = ''
  if (!res.ok) {
    message.warning(res.message || '启用失败')
    return
  }
  message.success('已启用')
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
  message.success(
    isShipBomType(record.bomType)
      ? `审核发布成功，当前版本已生效可用于发货${syncHint}`
      : `审核发布成功，当前版本已生效可用于生产${syncHint}`,
  )
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
