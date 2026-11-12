<template>
  <div class="pending-purchase-page list-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="供应商">
              <a-select
                v-model:value="filters.supplierName"
                allow-clear
                show-search
                placeholder="请选择"
                size="small"
                :options="supplierOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="filters.reqNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物料编码">
              <a-input
                v-model:value="filters.materialCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物料名称">
              <a-input
                v-model:value="filters.materialName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="销售单号">
              <a-input
                v-model:value="filters.salesOrderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item class="filter-actions-item" label=" ">
              <a-space :size="8">
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
        <a-button
          type="primary"
          size="small"
          :disabled="!selectedRows.length"
          @click="handleGeneratePo"
        >
          按供应商合并生成采购订单
        </a-button>
      </a-space>
      <a-space :size="4">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="refreshTick++">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          已选 <strong>{{ selectedRowKeys.length }}</strong> 行
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          ，共
          {{ filteredList.length }} 条未转采购明细（按供应商分组）。无供应商行须先补供应商再生成。
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        row-key="id"
        size="small"
        bordered
        :pagination="pagination"
        :row-selection="rowSelection"
        :scroll="{ x: 1280 }"
        :row-class-name="rowClassName"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ (pagination.current - 1) * pagination.pageSize + index + 1 }}
          </template>
          <template v-else-if="column.key === 'supplierName'">
            <span :class="{ 'text-danger': !record.supplierName }">
              {{ record.supplierName || '未指定供应商' }}
            </span>
          </template>
          <template v-else-if="column.key === 'planPurchaseQty'">
            {{ formatQty(record.planPurchaseQty) }}
          </template>
          <template v-else-if="column.key === 'urgency'">
            <a-tag :color="urgencyColor(record.urgency)">{{ record.urgency || '正常' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'reqNo'">
            <a @click.prevent="openReq(record)">{{ record.reqNo }}</a>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
export default { name: 'PendingPurchaseListView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { listPendingPurchaseLines, uniqueReqIdsFromPendingLines } from '@/utils/pendingPurchaseList'
import { formatQty } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const { openTab } = useTabs()
const refreshTick = ref(0)
const selectedRowKeys = ref([])
const filters = reactive({
  supplierName: undefined,
  reqNo: '',
  materialCode: '',
  materialName: '',
  salesOrderNo: '',
})
const applied = ref({ ...filters })
const pagination = reactive({
  current: 1,
  pageSize: 20,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
})

const allLines = computed(() => {
  void refreshTick.value
  void purchaseRequisitionState.requisitions
  return listPendingPurchaseLines()
})

const supplierOpts = computed(() => {
  const set = new Set()
  allLines.value.forEach((r) => {
    if (r.supplierName) set.add(r.supplierName)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'zh')).map((v) => ({ label: v, value: v }))
})

const filteredList = computed(() => {
  const f = applied.value
  return allLines.value.filter((row) => {
    if (f.supplierName && row.supplierName !== f.supplierName) return false
    if (f.reqNo && !String(row.reqNo || '').includes(f.reqNo.trim())) return false
    if (f.materialCode && !String(row.materialCode || '').includes(f.materialCode.trim()))
      return false
    if (f.materialName && !String(row.materialName || '').includes(f.materialName.trim()))
      return false
    if (f.salesOrderNo && !String(row.salesOrderNo || '').includes(f.salesOrderNo.trim()))
      return false
    return true
  })
})

const selectedRows = computed(() =>
  filteredList.value.filter((r) => selectedRowKeys.value.includes(r.id)),
)

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

const columns = [
  { title: '#', key: 'index', width: 48, align: 'center', fixed: 'left' },
  { title: '供应商', key: 'supplierName', dataIndex: 'supplierName', width: 140, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', dataIndex: 'reqNo', width: 140 },
  { title: '物料编码', dataIndex: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '计划采购量', key: 'planPurchaseQty', width: 110, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 130, ellipsis: true },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '紧急度', key: 'urgency', width: 90 },
  { title: '来源', dataIndex: 'source', width: 100, ellipsis: true },
]

function urgencyColor(u) {
  if (u === '特急') return 'red'
  if (u === '加急' || u === '紧急') return 'orange'
  return 'default'
}

function rowClassName(record) {
  return record.supplierName ? '' : 'row-missing-supplier'
}

function handleSearch() {
  applied.value = { ...filters }
  pagination.current = 1
  selectedRowKeys.value = []
}

function handleReset() {
  filters.supplierName = undefined
  filters.reqNo = ''
  filters.materialCode = ''
  filters.materialName = ''
  filters.salesOrderNo = ''
  handleSearch()
}

function onTableChange(pag) {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
}

function openReq(record) {
  if (!record?.reqId) return
  openTab(`/procurement/purchase-req/${record.reqId}`, record.reqNo || '采购申请详情')
}

function handleGeneratePo() {
  const rows = selectedRows.value
  if (!rows.length) {
    message.warning('请先勾选待采购明细')
    return
  }
  const missing = rows.filter((r) => !r.supplierName)
  if (missing.length) {
    message.warning(`有 ${missing.length} 行未指定供应商，请先在采购申请中补全`)
    return
  }
  const suppliers = [...new Set(rows.map((r) => r.supplierName))]
  if (suppliers.length > 1) {
    message.warning('请只勾选同一供应商的明细再生成')
    return
  }
  const ids = uniqueReqIdsFromPendingLines(rows)
  if (!ids.length) {
    message.warning('未找到对应采购申请')
    return
  }
  openTab(`/procurement/purchase-req/generate-po?ids=${ids.join(',')}`, '生成采购订单')
}
</script>

<style scoped>
/* 间距交给全局 .list-page / .toolbar-row（统一 margin-bottom: 8px），勿再加 flex gap */
.horizontal-form {
  width: 100%;
}
.horizontal-form :deep(.ant-form-item) {
  width: 100%;
  margin-bottom: 0;
}
.horizontal-form :deep(.ant-form-item-row) {
  flex-wrap: nowrap;
  align-items: center;
}
.horizontal-form :deep(.ant-form-item-label > label) {
  height: 24px;
  line-height: 24px;
  font-size: 13px;
}
.horizontal-form .filter-actions-item :deep(.ant-form-item-label) {
  display: none;
}

.text-danger {
  color: #cf1322;
}
:deep(.row-missing-supplier) td {
  background: #fff2f0;
}
</style>
