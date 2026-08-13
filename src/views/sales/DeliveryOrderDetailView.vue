<template>
  <div class="delivery-order-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="page-header">
          <div class="header-left">
            <span class="doc-no">{{ record.deliveryCode }}</span>
            <a-tag :color="deliveryStatusColor(record.deliveryStatus)">{{
              record.deliveryStatus
            }}</a-tag>
          </div>
          <a-space :size="8">
            <a-button size="small" @click="openPrint">打印</a-button>
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>

        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="outbound" :tab="`出库信息 (${outboundList.length})`" />
          </a-tabs>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <a-descriptions :column="3" size="small" bordered>
                <a-descriptions-item label="发货单号">{{
                  record.deliveryCode
                }}</a-descriptions-item>
                <a-descriptions-item label="源单号">
                  <a v-if="record.salesOrderId" @click="goSalesOrder">{{ record.sourceOrderNo }}</a>
                  <span v-else>{{ record.sourceOrderNo || '—' }}</span>
                </a-descriptions-item>
                <a-descriptions-item label="发货状态">{{
                  record.deliveryStatus
                }}</a-descriptions-item>
                <a-descriptions-item label="客户">{{ record.customerName }}</a-descriptions-item>
                <a-descriptions-item label="业务员">{{
                  record.salesperson || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="单据日期">{{
                  record.documentDate
                }}</a-descriptions-item>
                <a-descriptions-item label="申请发货数量">
                  {{ formatOutboundQtyInt(record.applyShipQty) }}
                </a-descriptions-item>
                <a-descriptions-item label="实际出库数量">
                  {{ formatOutboundQtyInt(record.actualOutboundQty) }}
                </a-descriptions-item>
                <a-descriptions-item label="发货重量">{{
                  formatShipWeight(record.shipWeight)
                }}</a-descriptions-item>
                <a-descriptions-item label="发货总金额（不含税）">
                  ￥{{ formatAmountExTax(record.totalAmountExTax) }}
                </a-descriptions-item>
                <a-descriptions-item label="交货方式">{{
                  record.shipmentMethod || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="物流单号">{{
                  record.logisticsNo || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="出库仓库">{{
                  record.outboundWarehouse || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="客户联系人">{{
                  record.contactPerson || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="联系方式">{{
                  record.contactPhone || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="交货地址" :span="2">
                  {{ record.deliveryAddress || '—' }}
                </a-descriptions-item>
                <a-descriptions-item label="司机姓名">{{
                  record.driverName || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="司机联系方式">{{
                  record.driverPhone || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="车牌号">{{
                  record.plateNo || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="创建时间">{{
                  record.createdAt || '—'
                }}</a-descriptions-item>
                <a-descriptions-item label="备注" :span="3">{{
                  record.remark || '—'
                }}</a-descriptions-item>
              </a-descriptions>
            </div>

            <div v-if="record.lineItems?.length" class="section-card">
              <div class="section-title">整机发货明细</div>
              <a-table
                :columns="wholeColumns"
                :data-source="record.lineItems"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'shipQty'">
                    {{ formatOutboundQtyInt(line.shipQty) }}
                  </template>
                  <template v-else-if="column.key === 'amount'">
                    {{ formatAmountExTax(line.deliveryAmountExTax) }}
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div v-if="record.scatterShipments?.length" class="section-card">
              <div class="section-title">散件发运</div>
              <div v-for="ship in record.scatterShipments" :key="ship.id" class="scatter-block">
                <div class="scatter-head">{{ ship.productName }}（{{ ship.productCode }}）</div>
                <a-table
                  :columns="scatterPickColumns"
                  :data-source="scatterPicks(ship)"
                  row-key="materialId"
                  size="small"
                  bordered
                  :pagination="false"
                />
              </div>
            </div>
            <div v-if="record.shipAttachments?.length" class="section-card">
              <div class="section-title">发货附件</div>
              <a-table
                :columns="shipAttachmentColumns"
                :data-source="record.shipAttachments"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'source'">
                    <a-tag :color="line.source === 'BOM' ? 'blue' : 'default'">
                      {{ line.source || '手工' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'shipStatus'">
                    <a-tag :color="attachmentShipStatusColor(line.shipStatus)">
                      {{ line.shipStatus || '未发货' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'shipProgress'">
                    {{
                      formatAttachmentShipProgress(line.shippedQty, line.appliedQty, line.planQty)
                    }}
                  </template>
                  <template v-else-if="column.key === 'selected'">
                    {{ line.selected === false ? '否' : '是' }}
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <a-empty
              v-if="
                !record.lineItems?.length &&
                !record.scatterShipments?.length &&
                !record.shipAttachments?.length
              "
              description="无发货明细"
            />
          </template>

          <template v-else-if="activeTab === 'outbound'">
            <div class="section-card">
              <a-table
                :columns="outboundColumns"
                :data-source="outboundList"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无关联出库单' }"
              />
            </div>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到发货单" />
    </a-spin>

    <DeliveryOrderPrintModal v-model:open="printModalOpen" :delivery-order="record" />
  </div>
</template>

<script>
export default { name: 'DeliveryOrderDetailView' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tabStore, useTabs } from '@/composables/useTabs'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import { getDeliveryOrderById, refreshOutboundQtyAll } from '@/store/deliveryOrderStore'
import { getSelectedMaterialPicks } from '@/utils/shipEbom'
import {
  deliveryStatusColor,
  formatOutboundQtyInt,
  formatShipWeight,
  formatAmountExTax,
} from '@/utils/deliveryOrder'
import { attachmentShipStatusColor, formatAttachmentShipProgress } from '@/utils/shipBomAttachments'
import DeliveryOrderPrintModal from './components/DeliveryOrderPrintModal.vue'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')
const printModalOpen = ref(false)

const wholeColumns = [
  { title: '#', key: 'index', width: 48 },
  { title: '产品名称', dataIndex: 'productName', ellipsis: true },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '本次发货', key: 'shipQty', width: 90, align: 'right' },
  { title: '单价（不含税）', dataIndex: 'deliveryUnitPriceExTax', width: 110, align: 'right' },
  { title: '金额（不含税）', key: 'amount', width: 110, align: 'right' },
]

const scatterPickColumns = [
  { title: '物料', dataIndex: 'name', ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 110 },
  { title: '本次发运', dataIndex: 'shipQty', width: 90, align: 'right' },
]

const shipAttachmentColumns = [
  { title: '#', key: 'index', width: 48 },
  { title: '发货状态', key: 'shipStatus', width: 88 },
  { title: '发货进度', key: 'shipProgress', width: 140, align: 'right' },
  { title: '来源', key: 'source', width: 72 },
  { title: '物料编码', dataIndex: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '关联产品', dataIndex: 'productName', width: 120, ellipsis: true },
  { title: '发运数量', dataIndex: 'shipQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '纳入本单', key: 'selected', width: 80 },
]

const outboundColumns = [
  { title: '出库单号', dataIndex: 'docNo', width: 140 },
  { title: '类型', dataIndex: 'outboundType', width: 100 },
  { title: '仓库', dataIndex: 'warehouse', width: 100 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
]

const outboundList = computed(() => {
  if (!record.value) return []
  const ob = findLinkedSalesOutbound(record.value)
  return ob ? [ob] : []
})

function scatterPicks(ship) {
  return getSelectedMaterialPicks(ship).map((p) => ({
    materialId: p.materialId,
    name: p.name,
    code: p.code,
    shipQty: formatOutboundQtyInt(p.shipQty),
  }))
}

function loadRecord() {
  loading.value = true
  refreshOutboundQtyAll()
  record.value = getDeliveryOrderById(route.params.id)
  loading.value = false
  if (record.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `发货单 ${record.value.deliveryCode}`
  }
}

watch(() => route.params.id, loadRecord, { immediate: true })

function openPrint() {
  printModalOpen.value = true
}

function handleBack() {
  router.push('/sales/delivery')
}

function goSalesOrder() {
  if (!record.value?.salesOrderId) return
  const path = `/sales/orders/${record.value.salesOrderId}`
  openTab(path, `销售订单 ${record.value.sourceOrderNo}`)
  router.push({ name: 'sales-orders-detail', params: { id: record.value.salesOrderId } })
}
</script>

<style lang="less" scoped>
.delivery-order-detail-page {
  margin: -12px;
  min-height: calc(100vh - 112px);
  background: #f5f6f8;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.doc-no {
  font-size: 16px;
  font-weight: 600;
}

.tab-body {
  padding: 8px 12px 16px;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.scatter-block {
  margin-bottom: 12px;
}

.scatter-head {
  font-weight: 500;
  margin-bottom: 6px;
}
</style>
