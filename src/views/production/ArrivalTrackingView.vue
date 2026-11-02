<template>
  <div class="arrival-tracking-page">
    <ListPeriodStatsPanel
      title="到货概览"
      tip="仅关键件；已到货按近7/15/30天查看"
      :show-period="false"
      :cards="statsCards"
      storage-key="i_doms_arrival_tracking_stats_collapsed"
    />

    <div class="filter-card">
      <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col v-if="activeTab === 'arrived'" :xs="24" :sm="12" :md="8">
            <a-form-item label="到货时段">
              <a-radio-group
                v-model:value="filters.rangeDays"
                size="small"
                button-style="solid"
                @change="onRangeDaysChange"
              >
                <a-radio-button
                  v-for="opt in arrivedRangeOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </a-radio-button>
              </a-radio-group>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="关键词">
              <a-input
                v-model:value="filters.keyword"
                allow-clear
                placeholder="供应商/单号/仓库"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物料编码">
              <a-input
                v-model:value="filters.itemCode"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="物料名称">
              <a-input
                v-model:value="filters.itemName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6">
            <a-form-item label="规格型号">
              <a-input
                v-model:value="filters.specModel"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="activeTab === 'expected'" :xs="24" :sm="12" :md="6">
            <a-form-item label="状态">
              <a-select
                v-model:value="filters.status"
                allow-clear
                placeholder="请选择"
                size="small"
                :options="expectedStatusOptions"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="activeTab === 'expected'" :xs="24" :sm="12" :md="6">
            <a-form-item label="仅逾期">
              <a-checkbox v-model:checked="filters.overdueOnly">只看已逾期</a-checkbox>
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
      <a-space wrap>
        <a-button size="small" @click="handleRefresh">
          <ReloadOutlined />
          刷新
        </a-button>
      </a-space>
    </div>

    <a-alert type="info" show-icon class="selection-bar" :banner="false">
      <template #message>
        <span v-if="activeTab === 'arrived'">
          当前展示 <strong>{{ arrivedRangeLabel }}</strong> 到货记录，共计
          <strong>{{ rows.length }}</strong> 条；超出时段后不再出现在本列表。
        </span>
        <span v-else>
          共计 <strong>{{ rows.length }}</strong> 条预计到货；待入数量为 0 或采购单关闭后不再展示。
        </span>
      </template>
    </a-alert>

    <a-tabs v-model:activeKey="activeTab" size="small" class="list-status-tabs">
      <a-tab-pane key="arrived" :tab="`已到货 (${summary.arrivedCount})`" />
      <a-tab-pane key="expected" :tab="`预计到货 (${summary.expectedCount})`" />
    </a-tabs>

    <div class="table-card">
      <a-table
        size="small"
        bordered
        row-key="id"
        :columns="columns"
        :data-source="pagedRows"
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        :locale="{
          emptyText:
            activeTab === 'arrived'
              ? `近${applied.rangeDays}天暂无关键件到货记录`
              : '暂无预计到货的关键件',
        }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">
            {{ rowIndex(index) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.statusTone">{{ record.status }}</a-tag>
          </template>
          <template v-else-if="column.key === 'item'">
            <div class="item-cell">
              <div class="item-name">{{ record.itemName || '—' }}</div>
              <div class="item-meta">{{ record.itemCode || '—' }}</div>
              <div v-if="record.specModel" class="item-meta">{{ record.specModel }}</div>
            </div>
          </template>
          <template v-else-if="column.key === 'qty'">
            {{ formatQty(record.qty) }}{{ record.unit ? ` ${record.unit}` : '' }}
          </template>
          <template v-else-if="column.key === 'stockQty'">
            {{ formatQty(record.stockQty) }}{{ record.unit ? ` ${record.unit}` : '' }}
          </template>
          <template v-else-if="column.key === 'progress'">
            {{ formatQty(record.receivedQty) }} / {{ formatQty(record.remainQty) }} /
            {{ formatQty(record.purchaseQty) }}
          </template>
          <template v-else-if="column.key === 'doc'">
            <a v-if="record.docNo" class="link-code" @click.prevent="goDoc(record)">
              {{ record.docNo }}
            </a>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'orderNo'">
            <a v-if="record.orderNo" class="link-code" @click.prevent="goPurchaseOrder(record)">
              {{ record.orderNo }}
            </a>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-button
              v-if="activeTab === 'arrived'"
              type="link"
              size="small"
              @click="goRequisition(record)"
            >
              去领料
            </a-button>
            <a-button v-else type="link" size="small" @click="goPurchaseOrder(record)">
              查看
            </a-button>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
      <div class="table-pagination">
        <a-pagination
          v-model:current="pageState.current"
          v-model:page-size="pageState.pageSize"
          :total="rows.length"
          size="small"
          show-size-changer
          :page-size-options="['10', '20', '50', '100']"
          :show-total="(t) => `共 ${t} 条`"
          show-quick-jumper
        />
      </div>
    </div>
  </div>
</template>

<script>
export default { name: 'ArrivalTrackingView' }
</script>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import ListPeriodStatsPanel from '@/components/ListPeriodStatsPanel.vue'
import { openCreateTab } from '@/utils/openCreateTab'
import { formatQty } from '@/utils/numberFormat'
import {
  ARRIVED_RANGE_OPTIONS,
  DEFAULT_ARRIVED_RANGE_DAYS,
  getArrivalTrackingSummary,
  listArrivedArrivalTrackingRows,
  listExpectedArrivalTrackingRows,
} from '@/utils/arrivalTracking'
import { keyPartArrivalState } from '@/store/keyPartArrivalStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const activeTab = ref(route.query.tab === 'expected' ? 'expected' : 'arrived')
const refreshTick = ref(0)
const arrivedRangeOptions = ARRIVED_RANGE_OPTIONS
const filters = reactive({
  keyword: '',
  itemCode: '',
  itemName: '',
  specModel: '',
  status: undefined,
  overdueOnly: false,
  rangeDays: DEFAULT_ARRIVED_RANGE_DAYS,
})
const applied = reactive({ ...filters })

const pageState = reactive({
  current: 1,
  pageSize: 10,
})

const expectedStatusOptions = [
  { label: '已逾期', value: '已逾期' },
  { label: '今日到期', value: '今日到期' },
  { label: '待到货', value: '待到货' },
]

const arrivedRangeLabel = computed(() => {
  const hit = ARRIVED_RANGE_OPTIONS.find((o) => o.value === applied.rangeDays)
  return hit?.label || `近${applied.rangeDays}天`
})

const summary = computed(() => {
  void refreshTick.value
  void keyPartArrivalState.messages
  void purchaseOrderState.orders
  return getArrivalTrackingSummary({ rangeDays: applied.rangeDays })
})

const statsCards = computed(() => {
  const s = summary.value
  return [
    {
      key: 'arrived',
      title: `已到货（${arrivedRangeLabel.value}）`,
      value: String(s.arrivedCount),
      tip: `所选时段（${arrivedRangeLabel.value}）内，关键件入库确认的条数；随筛选区「到货时段」切换。`,
      iconClass: 'icon-shop',
    },
    {
      key: 'todayArrived',
      title: '今日到货',
      value: String(s.todayArrivedCount),
      tip: '今天已入库确认的关键件条数，不随「到货时段」切换变化。',
      iconClass: 'icon-shop',
    },
    {
      key: 'expected',
      title: '预计待到',
      value: String(s.expectedCount),
      tip: '未关闭采购单中，关键件且仍有待入数量的明细行数。',
      iconClass: 'icon-screen',
    },
    {
      key: 'overdue',
      title: '已逾期',
      value: String(s.overdueCount),
      tip: '预计待到中，约定交货日早于今天、仍未到齐的行数。',
      iconClass: 'icon-screen',
    },
    {
      key: 'dueToday',
      title: '今日到期',
      value: String(s.dueTodayCount),
      tip: '预计待到中，约定交货日为今天、仍未到齐的行数。',
      iconClass: 'icon-shop',
    },
  ]
})

const rows = computed(() => {
  void refreshTick.value
  void keyPartArrivalState.messages
  void purchaseOrderState.orders
  if (activeTab.value === 'arrived') {
    return listArrivedArrivalTrackingRows(applied)
  }
  return listExpectedArrivalTrackingRows(applied)
})

const pagedRows = computed(() => {
  const list = rows.value
  const start = (pageState.current - 1) * pageState.pageSize
  return list.slice(start, start + pageState.pageSize)
})

const arrivedColumns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '关键件', key: 'item', width: 220 },
  { title: '到货数量', key: 'qty', width: 110, align: 'right' },
  { title: '库存数量', key: 'stockQty', width: 110, align: 'right' },
  { title: '仓库', dataIndex: 'warehouse', width: 100, ellipsis: true },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '入库单', key: 'doc', width: 160 },
  { title: '来源采购', key: 'orderNo', width: 140, ellipsis: true },
  { title: '到货时间', dataIndex: 'arrivedAt', width: 170 },
  { title: '操作', key: 'actions', width: 96, fixed: 'right' },
]

const expectedColumns = [
  { title: '序号', key: 'index', width: 56, fixed: 'left' },
  { title: '状态', key: 'status', width: 100, fixed: 'left' },
  { title: '关键件', key: 'item', width: 220 },
  { title: '待到数量', key: 'qty', width: 110, align: 'right' },
  {
    title: '进度(已入/待入/采购)',
    key: 'progress',
    width: 160,
    align: 'right',
  },
  { title: '预计到货日', dataIndex: 'expectedDate', width: 120 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '采购订单', key: 'doc', width: 150 },
  { title: '收货仓', dataIndex: 'warehouse', width: 100, ellipsis: true },
  { title: '操作', key: 'actions', width: 80, fixed: 'right' },
]

const columns = computed(() => (activeTab.value === 'arrived' ? arrivedColumns : expectedColumns))

const tableScrollX = computed(() => columns.value.reduce((sum, col) => sum + (col.width || 100), 0))

watch(activeTab, () => {
  pageState.current = 1
})

function rowIndex(index) {
  return (pageState.current - 1) * pageState.pageSize + index + 1
}

function handleSearch() {
  Object.assign(applied, { ...filters })
  pageState.current = 1
}

function onRangeDaysChange() {
  applied.rangeDays = filters.rangeDays
  pageState.current = 1
}

function handleReset() {
  filters.keyword = ''
  filters.itemCode = ''
  filters.itemName = ''
  filters.specModel = ''
  filters.status = undefined
  filters.overdueOnly = false
  filters.rangeDays = DEFAULT_ARRIVED_RANGE_DAYS
  handleSearch()
}

function handleRefresh() {
  refreshTick.value += 1
  message.success('已刷新')
}

function goRequisition(record) {
  const query = {}
  if (record?.itemCode) query.itemCode = record.itemCode
  if (record?.itemName) query.itemName = record.itemName
  if (record?.specModel) query.specModel = record.specModel
  if (record?.qty != null && record.qty !== '') query.qty = String(record.qty)
  if (record?.unit) query.unit = record.unit
  if (record?.warehouse) query.warehouse = record.warehouse
  openCreateTab(router, openTab, {
    path: '/production/material-requisition/create',
    title: '申请领料',
    query,
  })
}

function goInbound(record) {
  if (record?.inboundOrderId) {
    const path = `/inventory/inbound/${record.inboundOrderId}`
    openTab(path, `入库单 ${record.docNo || ''}`)
    router.push(path)
    return
  }
  if (record?.docNo) {
    openTab('/inventory/inbound', '入库管理')
    router.push({ path: '/inventory/inbound', query: { docNo: record.docNo } })
    return
  }
  message.warning('未找到入库单')
}

function goPurchaseOrder(record) {
  const orderNo = record?.trackType === 'arrived' ? record.orderNo : record.docNo || record.orderNo
  if (record?.orderId) {
    const path = `/procurement/purchase-orders/${record.orderId}`
    openTab(path, `采购订单 ${orderNo || ''}`)
    router.push(path)
    return
  }
  if (orderNo) {
    openTab('/procurement/purchase-orders', '采购订单')
    router.push({ path: '/procurement/purchase-orders', query: { orderNo } })
    return
  }
  message.warning('未找到采购单')
}

/** 已到货点入库单；预计到货点采购订单 */
function goDoc(record) {
  if (record?.trackType === 'arrived') {
    goInbound(record)
    return
  }
  goPurchaseOrder(record)
}
</script>

<style scoped lang="less">
.arrival-tracking-page {
  margin: -12px;
  padding: 12px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}

.filter-card,
.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-card {
  padding: 12px 16px;
  margin-bottom: 8px;
}

.selection-bar {
  margin: 0 0 8px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.list-status-tabs {
  margin-bottom: 0;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  padding: 0 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

  :deep(.ant-tabs-nav) {
    margin: 0;
  }

  :deep(.ant-tabs-nav::before) {
    border-bottom-color: #f0f0f0;
  }
}

.list-status-tabs + .table-card {
  border-radius: 0 0 8px 8px;
}

.table-card {
  margin-top: 0;
  padding: 12px;
  border: 1px solid #e5e6eb;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 4px 4px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.horizontal-form {
  width: 100%;
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }
}

.filter-actions-item {
  :deep(.ant-form-item-control) {
    display: flex;
    justify-content: flex-end;
  }
}

.item-cell {
  line-height: 1.35;
}
.item-name {
  font-weight: 500;
}
.item-meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
