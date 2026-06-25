<template>
  <div class="ebom-mgmt-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="statusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="EBOM编码">
              <a-input
                v-model:value="filters.ebomNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="产品名称">
              <a-input
                v-model:value="filters.productName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="设计任务编号">
              <a-input
                v-model:value="filters.designTaskNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="客户名称">
              <a-input
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">
                  <SearchOutlined />
                  搜索
                </a-button>
                <a-button size="small" @click="handleReset">
                  <ClearOutlined />
                  清空
                </a-button>
              </a-space>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="toolbar-row">
      <span class="toolbar-hint">EBOM 由设计任务产出，定稿后供生产计划使用，不回写产品 BOM。</span>
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
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="ebomStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'ebomNo'">
            <a class="link-code" @click.prevent="openDetail(record)">{{ record.ebomNo }}</a>
          </template>
          <template v-else-if="column.key === 'designTaskNo'">
            <span>{{ record.designTaskNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'baselineBomNo'">
            <span>{{ record.baselineBomNo || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'lineCount'">
            <span>{{ countLines(record) }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
          </template>
          <template v-else>
            <span>{{ record[column.dataIndex] || '—' }}</span>
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
          :show-total="(t) => `共 ${t} 条`"
        />
      </div>
    </div>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <a-drawer v-model:open="detailOpen" title="EBOM 详情" width="720">
      <template v-if="detailRecord">
        <a-descriptions bordered size="small" :column="2" class="detail-desc">
          <a-descriptions-item label="EBOM编码">{{ detailRecord.ebomNo }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="ebomStatusColor(detailRecord.status)">{{ detailRecord.status }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="EBOM名称" :span="2">{{
            detailRecord.ebomName
          }}</a-descriptions-item>
          <a-descriptions-item label="版本">{{ detailRecord.version || '—' }}</a-descriptions-item>
          <a-descriptions-item label="设计任务">{{
            detailRecord.designTaskNo || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="产品">{{ detailRecord.productName }}</a-descriptions-item>
          <a-descriptions-item label="产品编码">{{ detailRecord.productCode }}</a-descriptions-item>
          <a-descriptions-item label="产品属性">{{ detailRecord.productAttr }}</a-descriptions-item>
          <a-descriptions-item label="客户">{{
            detailRecord.customerName || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="销售订单">{{
            detailRecord.salesOrderNo || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="基准BOM">{{
            detailRecord.baselineBomNo || '无（从零设计）'
          }}</a-descriptions-item>
          <a-descriptions-item label="设计人">{{
            detailRecord.designer || '—'
          }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ detailRecord.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="更新时间">{{ detailRecord.updatedAt }}</a-descriptions-item>
          <a-descriptions-item label="定稿时间">{{
            detailRecord.finalizedAt || '—'
          }}</a-descriptions-item>
        </a-descriptions>

        <h4 class="section-title">BOM 结构（{{ countLines(detailRecord) }} 条子项）</h4>
        <a-table
          :columns="lineColumns"
          :data-source="detailLines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ y: 360 }"
        />
      </template>
    </a-drawer>
  </div>
</template>

<script>
export default { name: 'EbomManagementView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { SearchOutlined, ClearOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { EBOM_STATUS, ebomStatusColor } from '@/constants/ebom'
import { ebomState, filterEbomRecords } from '@/store/ebomStore'

const filters = reactive({
  status: undefined,
  ebomNo: '',
  productName: '',
  designTaskNo: '',
  customerName: '',
})

const pagination = reactive({ current: 1, pageSize: 20 })
const detailOpen = ref(false)
const detailRecord = ref(null)

const statusOpts = Object.values(EBOM_STATUS).map((v) => ({ label: v, value: v }))

const allColumns = [
  { title: '状态', key: 'status', dataIndex: 'status', width: 72, fixed: 'left' },
  { title: 'EBOM编码', key: 'ebomNo', dataIndex: 'ebomNo', width: 130 },
  { title: 'EBOM名称', key: 'ebomName', dataIndex: 'ebomName', width: 160, ellipsis: true },
  { title: '产品名称', key: 'productName', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '产品属性', key: 'productAttr', dataIndex: 'productAttr', width: 100 },
  { title: '设计任务编号', key: 'designTaskNo', dataIndex: 'designTaskNo', width: 120 },
  { title: '客户名称', key: 'customerName', dataIndex: 'customerName', width: 130, ellipsis: true },
  { title: '基准BOM', key: 'baselineBomNo', dataIndex: 'baselineBomNo', width: 110 },
  { title: '子项数', key: 'lineCount', width: 72 },
  { title: '设计人', key: 'designer', dataIndex: 'designer', width: 80 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 140 },
  { title: '定稿时间', key: 'finalizedAt', dataIndex: 'finalizedAt', width: 140 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('ebom-mgmt-list', allColumns, { excludeKeys: ['action'] })

const lineColumns = [
  { title: '层级', dataIndex: 'level', width: 56 },
  { title: '物料编码', dataIndex: 'materialCode', width: 110 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '用量', dataIndex: 'usageQty', width: 72 },
  { title: '单位', dataIndex: 'unit', width: 56 },
]

const filteredList = computed(() => filterEbomRecords(ebomState.items, filters))

const pagedList = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredList.value.slice(start, start + pagination.pageSize)
})

const detailLines = computed(() => {
  if (!detailRecord.value?.lineItems?.length) return []
  return detailRecord.value.lineItems.map((line, idx) => ({
    id: line.id || `line-${idx}`,
    level: line.level ?? 1,
    materialCode: line.materialCode || '—',
    materialName: line.materialName || '—',
    specModel: line.specModel || '—',
    usageQty: line.usageQty ?? line.qty ?? '—',
    unit: line.unit || '—',
  }))
})

function countLines(record) {
  return record?.lineItems?.length || 0
}

function handleSearch() {
  pagination.current = 1
}

function handleReset() {
  filters.status = undefined
  filters.ebomNo = ''
  filters.productName = ''
  filters.designTaskNo = ''
  filters.customerName = ''
  handleSearch()
}

function openDetail(record) {
  detailRecord.value = record
  detailOpen.value = true
}
</script>

<style lang="less" scoped>
.ebom-mgmt-page {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 4px;
  padding: 12px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
}

.toolbar-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.detail-desc {
  margin-bottom: 16px;
}

.section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}
</style>
