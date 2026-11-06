<template>
  <div class="kit-shortage-detail">
    <div class="crumb-bar">
      <nav class="breadcrumb">
        <a class="crumb" @click.prevent="goList">齐套进度</a>
        <span class="crumb-sep">›</span>
        <span class="crumb current">{{ crumbTitle }}</span>
      </nav>
      <a-space>
        <a-button size="small" @click="refresh">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" ghost size="small" @click="goList">返回列表</a-button>
      </a-space>
    </div>

    <a-empty v-if="!row" description="未找到齐套记录，请返回列表重试" />

    <template v-else>
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">订单齐套率</div>
          <div class="kpi-value" :class="row.kitRatePct < 100 ? 'tone-danger' : 'tone-ok'">
            {{ row.kitRatePct }}%
          </div>
          <div class="kpi-sub">目标: 100%</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">缺件项</div>
          <div class="kpi-value" :class="row.missingCount > 0 ? 'tone-danger' : 'tone-ok'">
            {{ row.missingCount }}
          </div>
          <div class="kpi-sub">项</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">计划日期</div>
          <div class="kpi-value">{{ formatShortDate(row.planAssemblyDate) }}</div>
          <div class="kpi-sub">{{ daysToAssemblyText(row.planAssemblyDate) }}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">客户 / 产品</div>
          <div class="kpi-value kpi-value-sm">{{ row.customerName || '—' }}</div>
          <div class="kpi-sub">{{ row.productName || '—' }}</div>
        </div>
      </div>

      <div class="filter-card">
        <a-form :model="filters" layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
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
              <a-form-item label="型号规格">
                <a-input
                  v-model:value="filters.specModel"
                  allow-clear
                  placeholder="请输入"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="材质">
                <a-input
                  v-model:value="filters.material"
                  allow-clear
                  placeholder="请输入"
                  size="small"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item class="filter-actions-item">
                <a-space>
                  <a-button type="primary" size="small" @click="applyFilter">查询</a-button>
                  <a-button size="small" @click="resetFilters">重置</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <section class="panel">
        <div class="panel-head">
          <h3 class="sub-title">
            物料明细 · {{ row.productName || '—' }} · {{ row.specModel || '—' }} ·
            {{ row.material || '—' }} · 外部工号 {{ row.externalWorkNo || '—' }}
          </h3>
          <a-button v-if="canRequisition" type="primary" size="small" @click="goRequisition">
            去领料
          </a-button>
        </div>
        <a-alert
          v-if="!filteredLines.length"
          type="warning"
          show-icon
          class="empty-bom-tip"
          message="当前行无物料明细（多半未关联 BOM）。请返回列表优先打开 KIT-DEMO-* 演示单，或选择有物料清单的生产计划。"
          style="margin-bottom: 12px"
        />
        <a-table
          :columns="shortageColumns"
          :data-source="filteredLines"
          :pagination="tablePagination"
          row-key="id"
          size="middle"
          bordered
          :scroll="{ x: 1380 }"
          :row-class-name="lineRowClassName"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              <span class="level-no" :style="levelNoStyle(record.levelNo)">{{
                record.levelNo || index + 1
              }}</span>
            </template>
            <template v-else-if="column.key === 'itemCode'">
              <div :class="['mat-cell', record.isTreeChild && 'mat-cell--child']">
                {{ record.itemCode || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'itemName'">
              <div :class="['mat-cell', record.isTreeChild && 'mat-cell--child']">
                {{ record.itemName || '—' }}
              </div>
            </template>
            <template v-else-if="column.key === 'demandQty'">
              {{ formatQtyUnit(record.demandQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'physicalQty'">
              {{ formatQtyUnit(record.physicalQty ?? record.stockQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'allocatedQty'">
              {{ formatQtyUnit(record.allocatedQty ?? record.availableQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'othersAllocatedQty'">
              <a-tooltip v-if="record.blockedBy?.length" placement="topLeft">
                <template #title>
                  <div v-for="b in record.blockedBy" :key="b.key">
                    {{ b.docNo || '—' }} · {{ b.productName || '' }} 占 {{ formatQty(b.qty) }}
                  </div>
                </template>
                <a class="linkish">{{ formatQtyUnit(record.othersAllocatedQty, record.unit) }}</a>
              </a-tooltip>
              <span v-else>{{ formatQtyUnit(record.othersAllocatedQty || 0, record.unit) }}</span>
            </template>
            <template v-else-if="column.key === 'inTransitQty'">
              {{ formatQtyUnit(record.inTransitQty, record.unit) }}
            </template>
            <template v-else-if="column.key === 'requisitionQty'">
              {{ formatQtyUnit(record.requisitionQty || 0, record.unit) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="record.statusColor">{{ record.statusLabel }}</a-tag>
            </template>
            <template v-else-if="column.key === 'allocAction'">
              <a-button type="link" size="small" @click="openAllocDrawer(record)"
                >占用明细</a-button
              >
            </template>
          </template>
        </a-table>
        <div class="logic-box">
          <div>
            缺料状态（缺口 = 需求 − 本单占用）：已齐套：缺口 ≤ 0；待到货：有缺口，且在途/在制 ≥
            缺口；部分缺口：有缺口，且 0 &lt; 在途/在制 &lt; 缺口；严重缺料：有缺口，且在途/在制 =
            0；被高优先占用：他单占用 &gt; 0 且在途/在制 = 0
          </div>
          <div>
            在途/在制：外购取该物料未转单采购申请 +
            未入库采购订单（库存单位）；自制/组装/外协取该物料待下发/执行中在制量。按物料编码汇总，非单笔采购单绑定。
          </div>
          <div>领料数量：关联工单领料/发料出库已出库量；已领料则自动释放该行手动占用。</div>
          <div>
            占用口径：可用池 = 实物 − 手动锁定；无人手动时按「紧急度 → 计划日期 →
            创建时间」自动预占。有手动占用后锁定优先保留再重算。外购/外协与自制件均可做占用明细。
          </div>
        </div>
      </section>

      <KitAllocDetailDrawer
        v-model:open="allocDrawerOpen"
        :item-code="allocFocus?.itemCode || ''"
        :item-name="allocFocus?.itemName || ''"
        :item-spec-model="allocFocus?.specModel || ''"
        :item-material="allocFocus?.material || ''"
        :item-drawing-no="allocFocus?.drawingNo || ''"
        :item-summary="allocItemSummary"
        :current-key="allocFocus?.id || ''"
        :current-doc-no="row?.docNo || ''"
        :current-allocated="Number(allocFocus?.allocatedQty) || 0"
        :current-gap="Number(allocFocus?.gapQty) || 0"
        :current-demand="Number(allocFocus?.demandQty) || 0"
        @changed="onAllocChanged"
      />
    </template>
  </div>
</template>

<script>
export default { name: 'KitSupplyShortageDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import {
  normalizeKitView,
  isWorkOrderKitView,
  findKittingRowById,
  buildKitSupplyDashboard,
} from '@/utils/kitSupplyDashboard'
import KitAllocDetailDrawer from '@/views/planning/components/KitAllocDetailDrawer.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const row = ref(null)
const filters = ref(createEmptyFilters())
const applied = ref(createEmptyFilters())
const allocDrawerOpen = ref(false)
const allocFocus = ref(null)
const allocSnapshot = ref(null)

function createEmptyFilters() {
  return {
    itemCode: '',
    itemName: '',
    specModel: '',
    material: '',
  }
}

const kitView = computed(() => normalizeKitView(route.query.kitView))

const crumbTitle = computed(() => {
  if (!row.value) return '缺件明细'
  const name = row.value.productName || row.value.customerName || ''
  const no = row.value.docNo || ''
  return [name, no].filter(Boolean).join(' · ') || '缺件明细'
})

const canRequisition = computed(() => {
  const r = row.value
  return (
    isWorkOrderKitView(kitView.value) &&
    r?.workOrderId &&
    r?.docNo &&
    r.docNo !== '待派工' &&
    r.docNo !== '—'
  )
})

const filteredLines = computed(() => {
  // 含已齐套行，便于打开占用明细；上方「缺料项」仍只统计有缺口的行
  const lines = row.value?.allLines?.length ? row.value.allLines : row.value?.shortageLines || []
  const f = applied.value
  return lines.filter((l) => {
    if (f.itemCode && !includesText(l.itemCode, f.itemCode)) return false
    if (f.itemName && !includesText(l.itemName, f.itemName)) return false
    if (f.specModel && !includesText(l.specModel || l.specMaterialText, f.specModel)) return false
    if (f.material && !includesText(l.material || l.specMaterialText, f.material)) return false
    return true
  })
})

const tablePagination = {
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (t) => `共 ${t} 条`,
}

const shortageColumns = [
  { title: '序号', key: 'index', width: 72, align: 'left' },
  { title: '物料编码', dataIndex: 'itemCode', key: 'itemCode', width: 110 },
  { title: '物料名称', dataIndex: 'itemName', key: 'itemName', ellipsis: true },
  { title: '规格 / 材质', dataIndex: 'specMaterialText', key: 'specMaterialText', width: 120 },
  { title: '需求', key: 'demandQty', width: 88, align: 'right' },
  { title: '实物库存', key: 'physicalQty', width: 88, align: 'right' },
  { title: '本单占用', key: 'allocatedQty', width: 88, align: 'right' },
  { title: '他单占用', key: 'othersAllocatedQty', width: 88, align: 'right' },
  { title: '在途/在制', key: 'inTransitQty', width: 88, align: 'right' },
  { title: '领料数量', key: 'requisitionQty', width: 88, align: 'right' },
  { title: '预计到位', dataIndex: 'etaText', key: 'etaText', width: 80 },
  { title: '状态', key: 'status', width: 110 },
  { title: '占用', key: 'allocAction', width: 88, fixed: 'right' },
]

const allocItemSummary = computed(() => {
  const code = allocFocus.value?.itemCode
  if (!code || !allocSnapshot.value?.byItem) return null
  return allocSnapshot.value.byItem.get(code) || null
})

function levelNoStyle(levelNo) {
  const parts = String(levelNo || '')
    .split('.')
    .filter(Boolean)
  const depth = Math.max(0, parts.length - 1)
  return { paddingLeft: `${depth * 12}px`, fontVariantNumeric: 'tabular-nums' }
}

function lineRowClassName(record) {
  if (record?.isTreeParent) return 'line-row-parent'
  if (record?.isTreeChild) return 'line-row-child'
  return ''
}

function includesText(hay, needle) {
  return String(hay || '')
    .toLowerCase()
    .includes(
      String(needle || '')
        .trim()
        .toLowerCase(),
    )
}

function formatQtyUnit(qty, unit) {
  return formatQtyWithUnit(qty, unit)
}

function formatShortDate(v) {
  if (!v) return '—'
  const d = dayjs(v)
  return d.isValid() ? d.format('MM-DD') : String(v).slice(5, 10) || v
}

function daysToAssemblyText(v) {
  if (!v) return '—'
  const d = dayjs(v)
  if (!d.isValid()) return '—'
  const diff = d.startOf('day').diff(dayjs().startOf('day'), 'day')
  if (diff > 0) return `距今 ${diff} 天`
  if (diff === 0) return '今天'
  return `已过 ${Math.abs(diff)} 天`
}

function loadRow() {
  const id = route.params.rowId
  const dashboard = buildKitSupplyDashboard({ kitView: kitView.value })
  allocSnapshot.value = dashboard.kitAllocSnapshot || null
  row.value =
    (dashboard.kitting || []).find((r) => r.id === id) || findKittingRowById(id, kitView.value)
}

function refresh() {
  loadRow()
  message.success('已刷新')
}

function openAllocDrawer(record) {
  allocFocus.value = record
  allocDrawerOpen.value = true
}

function onAllocChanged() {
  loadRow()
  if (allocFocus.value?.id && row.value) {
    const lines = row.value.allLines || row.value.shortageLines || []
    allocFocus.value = lines.find((l) => l.id === allocFocus.value.id) || allocFocus.value
  }
}

function applyFilter() {
  applied.value = { ...filters.value }
}

function resetFilters() {
  filters.value = createEmptyFilters()
  applied.value = createEmptyFilters()
}

function goList() {
  const path = '/production/kit-supply'
  openTab(path, '齐套与供应进度')
  router.push(path)
}

function goRequisition() {
  const r = row.value
  if (!canRequisition.value || !r) {
    message.warning('当前无有效工单，无法发起领料')
    return
  }
  openCreateTab(router, openTab, {
    path: '/production/material-requisition/create',
    title: '申请领料',
    query: {
      workOrderId: r.workOrderId,
      workOrderCode: r.workOrderNo || r.docNo,
    },
  })
}

watch(
  () => [route.params.rowId, route.query.kitView],
  () => {
    loadRow()
    resetFilters()
  },
  { immediate: true },
)
</script>

<style scoped lang="less">
.kit-shortage-detail {
  margin: -12px;
  padding: 16px 20px 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
}

.crumb-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  line-height: 24px;
}

.crumb {
  color: #1677ff;
  cursor: pointer;
  font-weight: 600;
}

.crumb.current {
  color: #262626;
  cursor: default;
}

.crumb-sep {
  color: #bfbfbf;
  margin: 0 2px;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

@media (max-width: 960px) {
  .kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.kpi-card {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 14px 16px;
}

.kpi-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 28px;
  font-weight: 600;
  color: #262626;
  line-height: 1.2;
}

.kpi-value-sm {
  font-size: 18px;
}

.kpi-sub {
  margin-top: 6px;
  font-size: 12px;
  color: #8c8c8c;
}

.tone-danger {
  color: #cf1322;
}

.tone-ok {
  color: #389e0d;
}

.filter-card {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--divider, #e5e6eb);
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.horizontal-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.horizontal-form :deep(.filter-actions-item) {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-height: 32px;
}

.view-count {
  font-size: 13px;
  color: #8c8c8c;
  white-space: nowrap;
}

.panel {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  border: 1px solid #f0f0f0;
}

.panel-head {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sub-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.hint {
  font-size: 12px;
  color: #8c8c8c;
}

.logic-box {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  font-size: 12px;
  color: #595959;
  line-height: 1.6;
}

.linkish {
  color: #1677ff;
  cursor: pointer;
}

.level-no {
  font-variant-numeric: tabular-nums;
}

.mat-cell--child {
  padding-left: 12px;
  border-left: 2px solid #d3adf7;
}

:deep(.line-row-parent) > td {
  background: #f9f0ff !important;
}

:deep(.line-row-child) > td {
  background: #fcfaff !important;
}

:deep(.line-row-child) > td:first-child {
  box-shadow: inset 3px 0 0 #b37feb;
}
</style>
