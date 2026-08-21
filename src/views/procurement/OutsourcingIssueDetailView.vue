<template>
  <div class="outsourcing-issue-detail-page">
    <div class="page-header">
      <div class="header-left">
        <template v-if="record">
          <span class="page-title">{{ record.issueOrderNo }}</span>
          <a-badge
            :status="outsourcingIssueOutboundBadge(record.outboundStatus)"
            :text="record.outboundStatus"
          />
        </template>
        <span v-else class="page-title">发料申请详情</span>
      </div>
      <a-space :size="8">
        <a-button size="small" @click="goBack">返回列表</a-button>
      </a-space>
    </div>

    <template v-if="!record">
      <div class="page-body">
        <a-empty description="发料申请单不存在或已删除" />
      </div>
    </template>

    <template v-else>
      <div class="detail-tabs-wrap">
        <a-tabs
          v-model:active-key="activeTab"
          class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
        >
          <a-tab-pane key="basic" tab="基本信息" />
          <a-tab-pane key="outbound" :tab="`出库信息 (${outboundRows.length})`" />
        </a-tabs>
      </div>

      <div class="tab-body">
        <template v-if="activeTab === 'basic'">
          <div class="section-card">
            <div class="section-title">基本信息</div>
            <OutsourcingIssueBasicInfoSection :record="record">
              <template #outsourcingOrderNo>
                <a class="doc-link" @click="goOutsourcingOrder">{{
                  record.outsourcingOrderNo || '—'
                }}</a>
              </template>
            </OutsourcingIssueBasicInfoSection>
          </div>

          <div v-if="productSetRows.length" class="section-card">
            <div class="section-title">外协产品套数（{{ productSetRows.length }}）</div>
            <a-table
              :columns="productSetColumns"
              :data-source="productSetRows"
              :row-key="(r) => r.lineId || r.key"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: productSetScrollX }"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'planQty'">
                  {{ formatQty(row.planQty) }}
                </template>
                <template v-else-if="column.key === 'appliedIssueQty'">
                  {{ formatQty(row.appliedIssueQty) }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </div>

          <div class="section-card">
            <div class="section-title">发料物料明细（{{ materialRows.length }}）</div>
            <a-table
              :columns="materialColumns"
              :data-source="materialRows"
              :row-key="(r) => r.id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: materialScrollX }"
              :locale="{ emptyText: '暂无发料物料' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'applyQty'">
                  {{ row.applyQtyText }}
                </template>
                <template v-else-if="column.key === 'unitUsage'">
                  {{ formatQty(row.unitUsage) }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </div>
        </template>

        <template v-else-if="activeTab === 'outbound'">
          <div class="section-card">
            <div class="section-title">出库信息</div>
            <a-table
              :columns="outboundColumns"
              :data-source="outboundRows"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="{ x: outboundTableScrollX }"
              :locale="{ emptyText: '暂无出库信息' }"
            >
              <template #bodyCell="{ column, record: row, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'outboundOrderNo'">
                  {{ row.outboundOrderNo || '—' }}
                </template>
                <template v-else-if="column.key === 'applyQty'">
                  {{ formatQty(row.applyQty) }}
                </template>
                <template v-else-if="column.key === 'actualQty'">
                  {{ formatQty(row.actualQty) }}
                </template>
                <template v-else>
                  {{ row[column.dataIndex] || '—' }}
                </template>
              </template>
            </a-table>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
export default { name: 'OutsourcingIssueDetailView' }
</script>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { formatQty } from '@/utils/numberFormat'
import { flattenOutsourcingIssueOutboundLines } from '@/mock/outsourcingOrders'
import {
  createOutboundIssueLineColumns,
  getOutboundIssueLineScrollX,
} from '@/utils/outboundIssueLines'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import {
  getOutsourcingIssueApplicationById,
  outsourcingIssueOutboundBadge,
} from '@/utils/outsourcingIssueApplications'
import OutsourcingIssueBasicInfoSection from './components/OutsourcingIssueBasicInfoSection.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref('basic')

const record = computed(() => {
  void outsourcingOrderState.orders.length
  return getOutsourcingIssueApplicationById(route.params.id)
})

const outboundRows = computed(() => {
  if (!record.value?.rawIssueOrder) return []
  return flattenOutsourcingIssueOutboundLines({
    issueOrders: [record.value.rawIssueOrder],
  })
})

const outboundColumns = createOutboundIssueLineColumns()
const outboundTableScrollX = getOutboundIssueLineScrollX(outboundColumns)

const productSetRows = computed(() => {
  const order = record.value?.rawOutsourcingOrder
  const sets = record.value?.productSets || []
  return sets.map((s, idx) => {
    const line = (order?.lineItems || []).find((l) => l.id === s.lineId)
    const setQty = Number(s.setQty) || 0
    return {
      key: `${s.lineId || idx}`,
      lineId: s.lineId,
      productName: line?.productName || line?.itemName || '—',
      productCode: line?.productCode || line?.itemCode || '—',
      specModel: line?.specModel || '',
      material: line?.material || '',
      drawingNo: line?.drawingNo || '',
      bom: line?.bom || '',
      planQty: Number(line?.planQty) || 0,
      // 本单申请套数；无快照时回退行上累计已申请
      appliedIssueQty: setQty || Number(line?.appliedIssueQty) || 0,
      unit: line?.unit || '',
    }
  })
})

function resolveSourceProductText(line, order) {
  if (line?.sourceProductText) return line.sourceProductText
  const ids = line?.sourceProductLineIds || (line?.lineId ? [line.lineId] : [])
  const names = ids
    .map((id) => (order?.lineItems || []).find((l) => l.id === id))
    .filter(Boolean)
    .map((l) => l.productName || l.productCode || '')
    .filter(Boolean)
  return names.length ? names.join('、') : '—'
}

function resolveMaterialMeta(line, order) {
  const ids = line?.sourceProductLineIds || (line?.lineId ? [line.lineId] : [])
  for (const id of ids) {
    const product = (order?.lineItems || []).find((l) => l.id === id)
    if (!product) continue
    const comps = product.componentLines || product.issueBomLines || []
    const code = line.productCode || line.itemCode
    const hit = comps.find(
      (c) =>
        (c.itemCode || c.productCode) === code ||
        (c.itemName || c.productName) === (line.productName || line.itemName),
    )
    if (hit) {
      return {
        drawingNo: hit.drawingNo || '',
        unitUsage: Number(hit.unitUsage ?? hit.unitQty) || 0,
        blankSizeText: hit.blankSizeText || '',
      }
    }
  }
  return { drawingNo: '', unitUsage: 0, blankSizeText: '' }
}

const materialRows = computed(() => {
  const order = record.value?.rawOutsourcingOrder
  const issueWh = record.value?.shipWarehouse || ''
  return (record.value?.lineItems || []).map((line, idx) => {
    const meta = resolveMaterialMeta(line, order)
    const qty = Number(line.applyQty ?? line.issueQty) || 0
    const unit = line.unit || ''
    return {
      id: line.id || `mat-${idx}`,
      sourceProductText: resolveSourceProductText(line, order),
      productName: line.productName || line.itemName || '',
      productCode: line.productCode || line.itemCode || '',
      specModel: line.specModel || '',
      material: line.material || '',
      drawingNo: line.drawingNo || meta.drawingNo || '',
      blankSizeText: line.blankSizeText || meta.blankSizeText || '',
      unitUsage: Number(line.unitUsage) || meta.unitUsage || 0,
      applyQtyText: unit ? `${formatQty(qty)}${unit}` : formatQty(qty),
      shipWarehouse: line.shipWarehouse || issueWh || '',
      remark: line.remark || '',
    }
  })
})

const productSetColumns = [
  { title: '产品', dataIndex: 'productName', key: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '关联BOM', dataIndex: 'bom', key: 'bom', width: 140, ellipsis: true },
  { title: '计划数量', key: 'planQty', width: 90, align: 'right' },
  { title: '已申请', key: 'appliedIssueQty', width: 90, align: 'right' },
]

const materialColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  {
    title: '来源产品',
    dataIndex: 'sourceProductText',
    key: 'sourceProduct',
    width: 160,
    ellipsis: true,
  },
  { title: '物料名称', dataIndex: 'productName', key: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  {
    title: '下料尺寸',
    dataIndex: 'blankSizeText',
    key: 'blankSizeText',
    width: 110,
    ellipsis: true,
  },
  { title: '单位用量', key: 'unitUsage', width: 90, align: 'right' },
  { title: '申请出库数量', key: 'applyQty', width: 120, align: 'right' },
  {
    title: '出库仓库',
    dataIndex: 'shipWarehouse',
    key: 'shipWarehouse',
    width: 110,
    ellipsis: true,
  },
  { title: '备注', dataIndex: 'remark', key: 'remark', width: 120, ellipsis: true },
]

const productSetScrollX = productSetColumns.reduce((s, c) => s + (c.width || 100), 0)
const materialScrollX = materialColumns.reduce((s, c) => s + (c.width || 100), 0)

function goBack() {
  router.push('/procurement/outsourcing-issue')
}

function goOutsourcingOrder() {
  if (!record.value?.outsourcingOrderId) return
  router.push(`/procurement/outsourcing-orders/${record.value.outsourcingOrderId}`)
}
</script>

<style lang="less" scoped>
.outsourcing-issue-detail-page {
  margin: -12px;
  height: calc(100vh - 56px - 40px - 24px);
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  z-index: 30;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-wrap: wrap;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.page-body,
.tab-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}

.detail-tabs-wrap {
  flex-shrink: 0;
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #f0f0f0;
}

.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.doc-link {
  color: #1677ff;
  cursor: pointer;
}
</style>
