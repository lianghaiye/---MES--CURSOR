<template>
  <div class="product-master-detail-page">
    <a-empty v-if="!record" description="未找到该产品" />
    <template v-else>
      <div class="detail-sticky-bar">
        <div class="page-header">
          <div class="header-left">
            <span class="order-no">{{ display(record.code) }}</span>
            <span v-if="record.name" class="product-name">{{ record.name }}</span>
            <a-tag v-if="kindLabel">{{ kindLabel }}</a-tag>
            <a-tag v-if="record.supplyForm">{{ record.supplyForm }}</a-tag>
            <a-tag v-if="record.materialType">{{ record.materialType }}</a-tag>
          </div>
          <a-space :size="8">
            <a-button size="small" @click="handleEdit">编辑</a-button>
            <a-button v-if="showBomAction" size="small" @click="handleMaintainBom"
              >BOM维护</a-button
            >
            <a-button size="small" @click="handleBack">返回列表</a-button>
          </a-space>
        </div>
        <div class="detail-tabs-wrap">
          <a-tabs
            v-model:active-key="activeTab"
            class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
          >
            <a-tab-pane key="basic" tab="基本信息" />
            <a-tab-pane key="labor" tab="工时配置" />
            <a-tab-pane key="bom" tab="BOM信息" />
          </a-tabs>
        </div>
      </div>

      <div class="tab-body">
        <template v-if="activeTab === 'basic'">
          <DetailSectionCard title="基本信息">
            <DetailInfoGrid :meta-items="capabilityMeta" :fields="basicFields" flush />
          </DetailSectionCard>
          <DetailSectionCard title="单位管理">
            <DetailInfoGrid :fields="unitFields" flush />
            <a-table
              class="detail-sub-table"
              :columns="auxUnitColumns"
              :data-source="auxUnits"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无辅助单位' }"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'roles'">
                  {{ roleLabels(row.roles).join('、') || '—' }}
                </template>
                <template v-else-if="column.key === 'convert'">
                  {{ formatAuxConvertText(row, unitHydrated.baseUnit) }}
                </template>
                <template v-else-if="column.key === 'status'">
                  {{ row.enabled === false ? '停用' : '启用' }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
          <DetailSectionCard title="销售">
            <DetailInfoGrid :fields="salesFields" flush />
          </DetailSectionCard>
          <DetailSectionCard title="采购">
            <DetailInfoGrid :fields="purchaseFields" flush />
            <a-table
              class="detail-sub-table"
              :columns="supplierColumns"
              :data-source="purchaseSuppliers"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :locale="{ emptyText: '暂无供应商' }"
            >
              <template #bodyCell="{ column, record: row }">
                <template v-if="column.key === 'unitPriceInclTax'">
                  {{
                    displayMoney(calcPurchasePriceInclTax(row.unitPriceExTax, record.inputTaxRate))
                  }}
                </template>
                <template v-else>
                  {{ display(row[column.dataIndex]) }}
                </template>
              </template>
            </a-table>
          </DetailSectionCard>
          <DetailSectionCard title="生产控制">
            <DetailInfoGrid :fields="productionFields" flush />
          </DetailSectionCard>
          <DetailSectionCard title="预警信息">
            <DetailInfoGrid :fields="alertFields" flush />
          </DetailSectionCard>
        </template>

        <div v-else-if="activeTab === 'labor'" class="section-card">
          <DetailInfoGrid :fields="laborSwitchFields" flush />
          <a-table
            v-if="record.laborEnabled"
            class="detail-sub-table"
            :columns="laborColumns"
            :data-source="laborRows"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :locale="{ emptyText: '暂无工时配置' }"
          >
            <template #bodyCell="{ column, record: row }">
              {{ display(row[column.dataIndex]) }}
            </template>
          </a-table>
        </div>

        <div v-else-if="activeTab === 'bom'" class="section-card">
          <ItemBomInfoTab :item-type="bomItemType" :item-id="record.id || ''" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { productCategoryState } from '@/store/productCategoryStore'
import { materialCategoryState } from '@/store/materialCategoryStore'
import { getMaterialGradeById } from '@/store/materialGradeStore'
import { resolveMasterItemEditRecord } from '@/utils/masterItemSave'
import { ITEM_KIND, itemKindLabel, resolveItemKind } from '@/utils/masterItemKind'
import { flattenCategoryNodes } from '@/mock/materialCategories'
import { PLAN_STRATEGY_OPTIONS, isPlanStrategyMts } from '@/mock/productInfoOptions'
import { inboundQcOptions } from '@/mock/materialInfoOptions'
import { hydratePurchaseSuppliers, calcPurchasePriceInclTax } from '@/utils/purchaseSuppliers'
import {
  hydrateUnitManageFromSource,
  formatAuxConvertText,
  roleLabels,
} from '@/utils/unitManageTab'
import { resolveItemBomNavigation } from '@/utils/itemBomNavigation'
import { openCreateTab } from '@/utils/openCreateTab'
import { useTabs, tabStore } from '@/composables/useTabs'
import DetailInfoGrid from './components/DetailInfoGrid.vue'
import ItemBomInfoTab from './components/ItemBomInfoTab.vue'

defineOptions({ name: 'MasterItemDetailView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const activeTab = ref('basic')

function findById(list, id) {
  const sid = String(id ?? '')
  return list.find((row) => String(row.id) === sid)
}

const record = computed(() => {
  const id = route.params.id
  if (!id) return null
  void productInfoState.products
  void materialInfoState.materials
  const product = findById(productInfoState.products, id)
  const material = findById(materialInfoState.materials, id)
  const raw = product || material
  return raw ? resolveMasterItemEditRecord(raw) : null
})

const kind = computed(() =>
  resolveItemKind({ canSell: record.value?.canSell, canProduce: record.value?.canProduce }),
)
const kindLabel = computed(() => (kind.value ? itemKindLabel(kind.value) : ''))
const showBomAction = computed(
  () => kind.value === ITEM_KIND.PRODUCT || kind.value === ITEM_KIND.PRODUCT_MATERIAL,
)
const bomItemType = computed(() => (kind.value === ITEM_KIND.MATERIAL ? 'material' : 'product'))

function display(val) {
  return val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : '—'
}

function yesNo(val) {
  if (val === true || val === 1 || val === '1') return '是'
  if (val === false || val === 0 || val === '0') return '否'
  return '—'
}

function displayMoney(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  return Number.isFinite(n) ? n.toFixed(2) : '—'
}

function optionLabel(options, value) {
  const hit = (options || []).find((o) => o.value === value || o === value)
  if (!hit) return display(value)
  return typeof hit === 'string' ? hit : display(hit.label)
}

function categoryTitle(tree, key) {
  if (!key) return '—'
  const hit = flattenCategoryNodes(tree).find((n) => n.key === key)
  return display(hit?.title)
}

const production = computed(() => record.value?.production || {})
const alert = computed(() => record.value?.alert || {})

const unitHydrated = computed(() => hydrateUnitManageFromSource(record.value || {}))
const auxUnits = computed(() => unitHydrated.value.auxUnits || [])

const purchaseSuppliers = computed(() => hydratePurchaseSuppliers(record.value || {}))
const laborRows = computed(() =>
  Array.isArray(record.value?.laborRows) ? record.value.laborRows : [],
)

const capabilityMeta = computed(() => {
  const r = record.value || {}
  return [
    { key: 'canSell', label: '可销售', value: yesNo(r.canSell) },
    { key: 'canProduce', label: '可生产', value: yesNo(r.canProduce) },
    { key: 'isWholeMachine', label: '整机', value: yesNo(r.isWholeMachine) },
    { key: 'isPart', label: '零部件', value: yesNo(r.isPart) },
    { key: 'canPurchase', label: '可采购', value: yesNo(r.canPurchase) },
    { key: 'canOutsource', label: '可外协', value: yesNo(r.canOutsource) },
    {
      key: 'needIndustrialLabel',
      label: '工业标识',
      value: yesNo(production.value.needIndustrialLabel),
    },
  ]
})

const basicFields = computed(() => {
  const r = record.value || {}
  const p = production.value
  const grade = getMaterialGradeById(r.materialGradeId)
  const fields = [
    { key: 'code', label: '编号', value: display(r.code) },
    { key: 'barcodeType', label: '条码类型', value: display(r.barcodeType) },
    { key: 'materialType', label: '类型', value: display(r.materialType) },
    { key: 'supplyForm', label: '供应型态', value: display(r.supplyForm) },
    { key: 'specModel', label: '规格型号', value: display(r.specModel) },
    {
      key: 'material',
      label: '材质',
      value: display(grade?.name || r.material),
    },
    { key: 'drawingNo', label: '图号', value: display(r.drawingNo) },
    { key: 'inventoryUnit', label: '库存单位', value: display(r.inventoryUnit) },
    {
      key: 'productCategory',
      label: '产品类别',
      value: categoryTitle(productCategoryState.tree, r.productCategoryKey || r.categoryKey),
    },
    {
      key: 'materialCategory',
      label: '物料类别',
      value: categoryTitle(materialCategoryState.tree, r.materialCategoryKey || r.categoryKey),
    },
    { key: 'productAttribute', label: '产品属性', value: display(r.productAttribute) },
    { key: 'standardSpec', label: '标准规范', value: display(r.standardSpec) },
    { key: 'isAssemblyPart', label: '是否需要组装', value: yesNo(r.isAssemblyPart) },
    {
      key: 'planStrategy',
      label: '计划策略',
      value: optionLabel(PLAN_STRATEGY_OPTIONS, p.planStrategy),
    },
  ]
  if (isPlanStrategyMts(p.planStrategy)) {
    fields.push({ key: 'replenishQty', label: '补货批量', value: display(p.replenishQty) })
  }
  fields.push(
    { key: 'defaultWarehouse', label: '默认存放仓库', value: display(p.defaultWarehouse) },
    { key: 'defaultProcessRoute', label: '默认工艺路线', value: display(p.defaultProcessRoute) },
    { key: 'defaultWorkCenter', label: '默认工作中心', value: display(p.defaultWorkCenter) },
    { key: 'techParams', label: '技术参数', value: display(r.techParams), fullRow: true },
    {
      key: 'matchingRequirements',
      label: '配置要求',
      value: display(r.matchingRequirements || r.remark),
      fullRow: true,
    },
  )
  return fields
})

const unitFields = computed(() => [
  { key: 'baseUnit', label: '主单位', value: display(unitHydrated.value.baseUnit) },
])

const auxUnitColumns = [
  { title: '辅助单位', dataIndex: 'unit', key: 'unit', width: 120 },
  { title: '业务角色', key: 'roles', width: 140 },
  { title: '换算说明', key: 'convert' },
  { title: '状态', key: 'status', width: 80 },
]

const salesFields = computed(() => {
  const r = record.value || {}
  const ex = Number(r.unitPrice)
  const rate = Number(r.outputTaxRate)
  const incl =
    Number.isFinite(ex) && Number.isFinite(rate) ? Number((ex * (1 + rate / 100)).toFixed(2)) : ex
  const pack =
    r.standardPackQty != null && r.standardPackQty !== ''
      ? `${r.standardPackQty}${r.standardPackUnit ? ` ${r.standardPackUnit}` : ''}`
      : ''
  return [
    { key: 'unitPrice', label: '标准单价(不含税)', value: displayMoney(r.unitPrice) },
    { key: 'unitPriceInclTax', label: '标准单价(含税)', value: displayMoney(incl) },
    {
      key: 'outputTaxRate',
      label: '销项税',
      value: r.outputTaxRate == null || r.outputTaxRate === '' ? '—' : `${r.outputTaxRate}%`,
    },
    { key: 'standardPackQty', label: '标准包装量', value: display(pack) },
  ]
})

const purchaseFields = computed(() => {
  const r = record.value || {}
  return [
    {
      key: 'inputTaxRate',
      label: '进项税',
      value: r.inputTaxRate == null || r.inputTaxRate === '' ? '—' : `${r.inputTaxRate}%`,
    },
    {
      key: 'purchaseControlStrategy',
      label: '控制策略',
      value: display(r.purchaseControlStrategy || production.value.purchaseControlStrategy),
    },
  ]
})

const supplierColumns = [
  { title: '供应商', dataIndex: 'supplierName', key: 'supplierName' },
  { title: '类型', dataIndex: 'supplierType', key: 'supplierType', width: 120 },
  { title: '采购单价（不含税）', dataIndex: 'unitPriceExTax', key: 'unitPriceExTax', width: 150 },
  { title: '采购单价（含税）', key: 'unitPriceInclTax', width: 140 },
  { title: '币种', dataIndex: 'currency', key: 'currency', width: 80 },
  { title: '供货期（天）', dataIndex: 'leadTimeDays', key: 'leadTimeDays', width: 120 },
]

const productionFields = computed(() => {
  const r = record.value || {}
  const p = production.value
  return [
    {
      key: 'standardCycleDays',
      label: '标准制造周期',
      value:
        p.standardCycleDays == null || p.standardCycleDays === ''
          ? '—'
          : `${p.standardCycleDays} 天`,
    },
    {
      key: 'inboundQcRequirement',
      label: '入库质检要求',
      value: inboundQcOptions.includes(p.inboundQcRequirement)
        ? p.inboundQcRequirement
        : display(p.inboundQcRequirement),
    },
    { key: 'requisitionEnabled', label: '领料属性', value: yesNo(p.requisitionEnabled) },
    { key: 'needsBlankingSettle', label: '需要下料结算', value: yesNo(r.needsBlankingSettle) },
    { key: 'isKeyPart', label: '关键件标识', value: yesNo(p.isKeyPart) },
    { key: 'isAuxiliary', label: '辅料标识', value: yesNo(p.isAuxiliary) },
    { key: 'isHazardous', label: '危险品标识', value: yesNo(p.isHazardous) },
  ]
})

const laborSwitchFields = computed(() => [
  { key: 'laborEnabled', label: '启用工时配置', value: yesNo(record.value?.laborEnabled) },
])

const laborColumns = [
  { title: '工序', dataIndex: 'processName', key: 'processName' },
  { title: '报工类型', dataIndex: 'reportType', key: 'reportType', width: 120 },
  {
    title: '单件标准工时',
    dataIndex: 'standardMinutesPerPiece',
    key: 'standardMinutesPerPiece',
    width: 130,
  },
  {
    title: '整批准备工时',
    dataIndex: 'setupMinutesPerBatch',
    key: 'setupMinutesPerBatch',
    width: 130,
  },
  { title: '计薪方式', dataIndex: 'salaryMethod', key: 'salaryMethod', width: 120 },
  { title: '标准工时单价', dataIndex: 'standardHourlyRate', key: 'standardHourlyRate', width: 130 },
  { title: '单件计件单价', dataIndex: 'pieceRate', key: 'pieceRate', width: 130 },
]

const alertFields = computed(() => {
  const a = alert.value
  const fields = [
    { key: 'stockAlertEnabled', label: '库存预警', value: yesNo(a.stockAlertEnabled) },
  ]
  if (a.stockAlertEnabled) {
    fields.push(
      { key: 'maxStockQty', label: '最高库存', value: display(a.maxStockQty) },
      { key: 'minStockQty', label: '最低库存', value: display(a.minStockQty) },
    )
  }
  fields.push(
    { key: 'expiryAlertEnabled', label: '过期预警', value: yesNo(a.expiryAlertEnabled) },
    {
      key: 'defectRateThreshold',
      label: '不良率预警阈值',
      value:
        a.defectRateThreshold == null || a.defectRateThreshold === ''
          ? '—'
          : `${a.defectRateThreshold}%`,
    },
  )
  return fields
})

watch(
  record,
  (row) => {
    if (!row) return
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `产品 ${row.code || row.name || ''}`.trim()
  },
  { immediate: true },
)

function handleEdit() {
  const id = record.value?.id
  if (!id) return
  openCreateTab(router, openTab, {
    path: `/product-process/products/${id}/edit`,
    title: `编辑产品 ${record.value.code || record.value.name || ''}`.trim(),
  })
}

function handleMaintainBom() {
  const id = record.value?.id
  if (!id) return
  const nav = resolveItemBomNavigation(bomItemType.value, id)
  const resolved = router.resolve({
    path: nav.path,
    query: { ...(nav.query || {}), itemName: record.value.name || '' },
  })
  openTab(resolved.fullPath || resolved.path, nav.title || '维护BOM')
  router.push(resolved)
}

function handleBack() {
  router.push('/product-process/products')
}
</script>

<style lang="less" scoped>
.product-master-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.product-name {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 12px 0 16px;
  overflow: auto;
}

.section-card {
  background: #fff;
  border-radius: 8px;
  padding: 12px 16px 16px;
  margin-bottom: 8px;
  border: 1px solid #e5e6eb;
  box-shadow: none;
}

.section-title {
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: #1f2329;
}

.detail-sub-table {
  margin-top: 12px;
}
</style>
