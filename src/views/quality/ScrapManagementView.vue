<template>
  <div class="scrap-page">
    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="审核状态">
              <a-select
                v-model:value="filters.auditStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="auditStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="报废来源">
              <a-select
                v-model:value="filters.scrapSource"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="scrapSourceOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="报废单号">
              <a-input
                v-model:value="filters.scrapNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="补料状态">
              <a-select
                v-model:value="filters.replenishStatus"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="replenishStatusOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物品名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8">
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
      <a-space :size="4" class="toolbar-icons">
        <a-tooltip title="刷新">
          <a-button type="text" size="small" @click="handleSearch">
            <ReloadOutlined />
          </a-button>
        </a-tooltip>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="summary-bar" :banner="false">
      <template #message>
        <span>
          当前表格已选择 <strong>{{ selectedRowKeys.length }}</strong> 项
          <a-button type="link" size="small" @click="selectedRowKeys = []">清空</a-button>
          共计 {{ filteredList.length }} 条报废记录
        </span>
      </template>
    </a-alert>

    <div class="table-card">
      <a-table
        :columns="columns"
        :data-source="pagedList"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 3200 }"
        :pagination="pagination"
        :row-selection="rowSelection"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'auditStatus'">
            <a-tag :color="displayAuditStatusColor(record.auditStatus)">
              {{ displayAuditStatus(record.auditStatus) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'scrapNo'">
            <a class="link-code" @click="goDetail(record)">{{ displayScrapNo(record) }}</a>
          </template>
          <template v-else-if="column.key === 'replenishStatus'">
            <a-tag :color="replenishStatusColor(record.replenishStatus)">
              {{ formatScrapCell(record.replenishStatus) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'costAmount'">
            {{ formatMoney(record.costAmount) }}
          </template>
          <template v-else-if="column.key === 'applicant'">
            {{ displayApplicant(record) }}
          </template>
          <template v-else-if="column.key === 'appliedAt'">
            {{ displayAppliedAt(record) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="4">
              <a-button
                v-if="record.auditStatus === '待审核'"
                type="link"
                size="small"
                @click="openAudit(record)"
              >
                审批
              </a-button>
              <a-button
                v-if="canReplenish(record)"
                type="link"
                size="small"
                @click="openReplenish(record)"
              >
                补料
              </a-button>
              <a-button v-if="showReplenishDisabled(record)" type="link" size="small" disabled>
                补料
              </a-button>
            </a-space>
          </template>
          <template v-else>
            {{ formatScrapCell(record[column.dataIndex]) }}
          </template>
        </template>
      </a-table>
    </div>

    <ScrapAuditModal v-model:open="auditOpen" :record="currentRecord" @saved="onSaved" />
    <ScrapReplenishModal v-model:open="replenishOpen" :record="currentRecord" @saved="onSaved" />
  </div>
</template>

<script>
export default { name: 'ScrapManagementView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { scrapOrderState } from '@/store/scrapOrderStore'
import {
  displayApplicant,
  displayAppliedAt,
  displayAuditStatus,
  displayAuditStatusColor,
  displayScrapNo,
  formatScrapCell,
  isAuditedStatus,
  replenishStatusColor,
} from '@/utils/scrapOrderUtils'
import ScrapAuditModal from './components/ScrapAuditModal.vue'
import ScrapReplenishModal from './components/ScrapReplenishModal.vue'

const router = useRouter()

const filters = reactive({
  auditStatus: undefined,
  scrapSource: undefined,
  scrapNo: '',
  replenishStatus: undefined,
  itemName: '',
})
const applied = reactive({
  auditStatus: undefined,
  scrapSource: undefined,
  scrapNo: '',
  replenishStatus: undefined,
  itemName: '',
})

const auditOpen = ref(false)
const replenishOpen = ref(false)
const currentRecord = ref(null)
const selectedRowKeys = ref([])
const page = ref(1)
const pageSize = ref(10)

const auditStatusOpts = ['待审核', '已审核'].map((v) => ({ label: v, value: v }))
const scrapSourceOpts = ['报废申请', '拆解报废'].map((v) => ({ label: v, value: v }))
const replenishStatusOpts = ['未补料', '已补料', '不需补料'].map((v) => ({ label: v, value: v }))

const columns = [
  { title: '审核状态', key: 'auditStatus', width: 90, fixed: 'left' },
  { title: '报废来源', dataIndex: 'scrapSource', width: 100, fixed: 'left' },
  { title: '报废单号', key: 'scrapNo', width: 150, fixed: 'left' },
  { title: '关联工单号', dataIndex: 'relatedWorkOrderNo', width: 130 },
  { title: '物品名称', dataIndex: 'itemName', width: 110 },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '型号规格', dataIndex: 'specModel', width: 140 },
  { title: '数量', dataIndex: 'qty', width: 70, align: 'right' },
  { title: '报废原因', dataIndex: 'scrapReason', width: 100 },
  { title: '工序', dataIndex: 'processName', width: 90 },
  { title: '责任工序', dataIndex: 'responsibleProcess', width: 100 },
  { title: '责任人', dataIndex: 'responsiblePerson', width: 90 },
  { title: '处理方式', dataIndex: 'processMethod', width: 90 },
  { title: '处理结果', dataIndex: 'processResult', width: 100 },
  { title: '补料方式', dataIndex: 'replenishMethod', width: 100 },
  { title: '补料状态', key: 'replenishStatus', dataIndex: 'replenishStatus', width: 100 },
  { title: '成本金额', key: 'costAmount', dataIndex: 'costAmount', width: 100, align: 'right' },
  { title: '申请人', key: 'applicant', width: 90 },
  { title: '申请时间', key: 'appliedAt', width: 150 },
  { title: '审核人', dataIndex: 'auditor', width: 90 },
  { title: '审核时间', dataIndex: 'auditedAt', width: 150 },
  { title: '操作', key: 'action', width: 110, fixed: 'right' },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function matchAuditStatus(row, filterStatus) {
  if (!filterStatus) return true
  if (filterStatus === '待审核') return row.auditStatus === '待审核'
  if (filterStatus === '已审核') return isAuditedStatus(row.auditStatus)
  return row.auditStatus === filterStatus
}

const filteredList = computed(() =>
  scrapOrderState.orders.filter((row) => {
    if (!matchAuditStatus(row, applied.auditStatus)) return false
    if (applied.scrapSource && row.scrapSource !== applied.scrapSource) return false
    if (applied.scrapNo) {
      const no = displayScrapNo(row)
      if (!no.includes(applied.scrapNo)) return false
    }
    if (applied.replenishStatus && row.replenishStatus !== applied.replenishStatus) return false
    if (applied.itemName && !row.itemName.includes(applied.itemName)) return false
    return true
  }),
)

const pagedList = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredList.value.slice(start, start + pageSize.value)
})

const pagination = computed(() => ({
  current: page.value,
  pageSize: pageSize.value,
  total: filteredList.value.length,
  size: 'small',
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
}))

function handleSearch() {
  applied.auditStatus = filters.auditStatus
  applied.scrapSource = filters.scrapSource
  applied.scrapNo = filters.scrapNo.trim()
  applied.replenishStatus = filters.replenishStatus
  applied.itemName = filters.itemName.trim()
  page.value = 1
}

function handleReset() {
  filters.auditStatus = undefined
  filters.scrapSource = undefined
  filters.scrapNo = ''
  filters.replenishStatus = undefined
  filters.itemName = ''
  handleSearch()
}

function onTableChange(pag) {
  page.value = pag.current
  pageSize.value = pag.pageSize
}

function formatMoney(v) {
  if (v == null || v === '') return '—'
  return Number(v).toFixed(2)
}

function canReplenish(record) {
  return (
    record.auditStatus === '审核通过' && record.needReplenish && record.replenishStatus === '未补料'
  )
}

function showReplenishDisabled(record) {
  return (
    record.auditStatus === '审核通过' && record.needReplenish && record.replenishStatus === '已补料'
  )
}

function goDetail(record) {
  router.push(`/quality/scrap-orders/${record.id}`)
}

function openAudit(record) {
  currentRecord.value = record
  auditOpen.value = true
}

function openReplenish(record) {
  currentRecord.value = record
  replenishOpen.value = true
}

function onSaved() {
  currentRecord.value = null
}
</script>

<style scoped>
.scrap-page {
  padding: 0;
}
.toolbar-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.summary-bar {
  margin-bottom: 8px;
}
.link-code {
  color: #1677ff;
  cursor: pointer;
}
</style>
