<template>
  <div class="location-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="所属仓库">
              <a-select
                v-model:value="filters.warehouseId"
                allow-clear
                size="small"
                placeholder="全部仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="货位编码">
              <a-input
                v-model:value="filters.code"
                allow-clear
                size="small"
                placeholder="请输入货位编码"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="库区">
              <a-select
                v-model:value="filters.zone"
                allow-clear
                size="small"
                placeholder="全部"
                :options="zoneOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="货位类型">
              <a-select
                v-model:value="filters.locationType"
                allow-clear
                size="small"
                placeholder="全部"
                :options="typeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="占用状态">
              <a-select
                v-model:value="filters.occupyStatus"
                allow-clear
                size="small"
                placeholder="全部"
                :options="occupyOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">搜索</a-button>
                <a-button size="small" @click="handleReset">清空</a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <a-space>
        <a-button type="primary" size="small" @click="openCreate">新增</a-button>
        <a-button size="small" @click="batchOpen = true">批量生成</a-button>
      </a-space>
      <a-space :size="4">
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
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: tableScrollX }"
        :pagination="{
          pageSize: 10,
          size: 'small',
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
        }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'code'">
            <a class="link-code" @click="openEdit(record)">{{ record.code }}</a>
          </template>
          <template v-else-if="column.key === 'enabled'">
            <a-tag :color="record.enabled === false ? 'default' : 'success'">
              {{ record.enabled === false ? '停用' : '启用' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'occupyStatus'">
            <a-tag :color="occupyColor(record.occupyStatus)">{{ record.occupyStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'mixSku'">
            {{ record.mixSku === false ? '否' : '是' }}
          </template>
          <template v-else-if="column.key === 'mixBatch'">
            {{ record.mixBatch === false ? '否' : '是' }}
          </template>
          <template v-else-if="column.key === 'capacity'">
            {{ capacityText(record) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space :size="8">
              <a @click="openEdit(record)">编辑</a>
              <a @click="toggleEnabled(record)">
                {{ record.enabled === false ? '启用' : '停用' }}
              </a>
              <a class="danger-link" @click="confirmDelete(record)">删除</a>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <WarehouseLocationFormModal
      v-model:open="modalOpen"
      :record="editRecord"
      :default-warehouse-id="applied.warehouseId"
      @saved="handleSearch"
    />
    <WarehouseLocationBatchModal
      v-model:open="batchOpen"
      :default-warehouse-id="applied.warehouseId"
      @created="handleSearch"
    />
    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />
  </div>
</template>

<script>
export default { name: 'WarehouseLocationView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import WarehouseLocationFormModal from './components/WarehouseLocationFormModal.vue'
import WarehouseLocationBatchModal from './components/WarehouseLocationBatchModal.vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  warehouseLocationState,
  filterWarehouseLocations,
  deleteWarehouseLocation,
  setWarehouseLocationEnabled,
  LOCATION_TYPE_OPTIONS,
  LOCATION_OCCUPY_OPTIONS,
  LOCATION_ZONE_OPTIONS,
} from '@/store/warehouseLocationStore'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { findCreatePageByListPath } from '@/config/createPages'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  warehouseId: undefined,
  code: '',
  zone: undefined,
  locationType: undefined,
  occupyStatus: undefined,
})
const applied = reactive({ ...filters })
const modalOpen = ref(false)
const editRecord = ref(null)
const batchOpen = ref(false)

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions().map((o) => {
    const wh = warehouseState.warehouses.find((w) => w.name === o.value)
    return { label: o.label, value: wh?.id || o.value }
  })
})
const typeOpts = LOCATION_TYPE_OPTIONS.map((v) => ({ label: v, value: v }))
const occupyOpts = LOCATION_OCCUPY_OPTIONS.map((v) => ({ label: v, value: v }))
const zoneOpts = LOCATION_ZONE_OPTIONS.map((v) => ({ label: v, value: v }))

const baseColumns = [
  { title: '货位编码', key: 'code', width: 160 },
  { title: '货位名称', dataIndex: 'name', width: 140, ellipsis: true },
  { title: '所属仓库', dataIndex: 'warehouseName', width: 120 },
  { title: '库区', dataIndex: 'zone', width: 90 },
  { title: '货位类型', dataIndex: 'locationType', width: 100 },
  { title: '通道', dataIndex: 'aisle', width: 70 },
  { title: '货架', dataIndex: 'rack', width: 70 },
  { title: '层', dataIndex: 'level', width: 60 },
  { title: '位', dataIndex: 'bin', width: 60 },
  { title: '状态', key: 'enabled', width: 80 },
  { title: '占用', key: 'occupyStatus', width: 90 },
  { title: '混SKU', key: 'mixSku', width: 80 },
  { title: '混批次', key: 'mixBatch', width: 80 },
  { title: '容量', key: 'capacity', width: 140, ellipsis: true },
  { title: '创建时间', dataIndex: 'createdAt', width: 170 },
  { title: '操作', key: 'actions', width: 160, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('warehouse-location-list', baseColumns, { minScrollX: 1600 })

const filteredList = computed(() =>
  filterWarehouseLocations(warehouseLocationState.locations, applied),
)

watch(
  () => route.query.warehouseId,
  (id) => {
    if (id) {
      filters.warehouseId = String(id)
      applied.warehouseId = String(id)
    }
  },
  { immediate: true },
)

function occupyColor(status) {
  const map = { 空闲: 'success', 部分占用: 'warning', 占用: 'processing', 锁定: 'error' }
  return map[status] || 'default'
}

function capacityText(row) {
  const parts = []
  if (row.maxQty != null) parts.push(`${row.maxQty}件`)
  if (row.maxWeight != null) parts.push(`${row.maxWeight}kg`)
  return parts.length ? parts.join(' / ') : '不限制'
}

function handleSearch() {
  applied.warehouseId = filters.warehouseId
  applied.code = filters.code?.trim() || ''
  applied.zone = filters.zone
  applied.locationType = filters.locationType
  applied.occupyStatus = filters.occupyStatus
}

function handleReset() {
  filters.warehouseId = undefined
  filters.code = ''
  filters.zone = undefined
  filters.locationType = undefined
  filters.occupyStatus = undefined
  handleSearch()
}

function openCreate() {
  const page = findCreatePageByListPath('/basic-config/warehouse-locations')
  if (!page) return
  openCreateTab(router, openTab, { path: page.newPath, title: page.title })
}

function openEdit(record) {
  editRecord.value = record
  modalOpen.value = true
}

function toggleEnabled(record) {
  const next = record.enabled === false
  const res = setWarehouseLocationEnabled(record.id, next)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(next ? '已启用' : '已停用')
}

function confirmDelete(record) {
  Modal.confirm({
    title: '确认删除货位',
    content: `确定删除货位「${record.code}」吗？占用中的货位不可删除。`,
    okType: 'danger',
    onOk: () => {
      const res = deleteWarehouseLocation(record.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('已删除')
    },
  })
}
</script>

<style lang="less" scoped>
.location-page {
  .filter-card,
  .table-card {
    background: #fff;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 12px;
  }

  .toolbar-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .link-code {
    color: #1677ff;
    cursor: pointer;
  }

  .danger-link {
    color: #ff4d4f;
  }
}
</style>
