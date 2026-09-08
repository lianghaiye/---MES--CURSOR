<template>
  <div class="ship-attachment-query-page">
    <a-tabs v-model:active-key="mode" class="query-mode-tabs" @change="onModeChange">
      <a-tab-pane key="delivery" tab="按发货单" />
      <a-tab-pane key="product" tab="按产品" />
    </a-tabs>

    <a-alert type="info" show-icon class="scene-alert" :message="modeHint" />

    <template v-if="mode === 'delivery'">
      <div class="filter-card">
        <a-form :model="deliveryFilters" layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="发货单号">
                <a-input
                  v-model:value="deliveryFilters.deliveryCode"
                  allow-clear
                  size="small"
                  placeholder="请输入"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="客户">
                <a-select
                  v-model:value="deliveryFilters.customerName"
                  allow-clear
                  size="small"
                  placeholder="请选择"
                  :options="customerOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="产品">
                <a-input
                  v-model:value="deliveryFilters.productKeyword"
                  allow-clear
                  size="small"
                  placeholder="名称/编码"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="6">
              <a-form-item label="发货状态">
                <a-select
                  v-model:value="deliveryFilters.deliveryStatus"
                  allow-clear
                  size="small"
                  placeholder="请选择"
                  :options="deliveryStatusOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item>
                <a-checkbox v-model:checked="deliveryFilters.onlyWithAttachments">
                  仅看已纳入附件
                </a-checkbox>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="12" :md="8">
              <a-form-item class="filter-actions-item">
                <a-space>
                  <a-button type="primary" size="small" @click="searchDelivery">
                    <SearchOutlined />
                    搜索
                  </a-button>
                  <a-button size="small" @click="resetDelivery">清空</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="table-card">
        <a-table
          :columns="deliveryColumns"
          :data-source="pagedDeliveries"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1100 }"
        >
          <template #expandedRowRender="{ record }">
            <div class="expand-block">
              <div class="expand-title-row">
                <div class="expand-title">本单纳入附件（执行）</div>
                <a-tooltip :title="maintainDisabledTip(record)">
                  <span>
                    <a-button
                      type="link"
                      size="small"
                      :disabled="!canMaintain(record)"
                      @click="openMaintain(record)"
                    >
                      维护附件
                    </a-button>
                  </span>
                </a-tooltip>
              </div>
              <a-table
                v-if="record.selectedRows.length"
                :columns="attachmentColumns"
                :data-source="record.selectedRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: line }">
                  <template v-if="column.key === 'source'">
                    <a-tag :color="line.source === 'BOM' ? 'blue' : 'default'">
                      {{ line.source || '手工' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'shipStatus'">
                    <a-tag :color="attachmentShipStatusColor(line.shipStatus)">
                      {{ line.shipStatus || '未发货' }}
                    </a-tag>
                  </template>
                  <template v-else>
                    {{ line[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
              <a-empty
                v-else
                description="本单尚未纳入随货附件"
                :image="false"
                class="inner-empty"
              />

              <div class="expand-title">标准随货包（参考）</div>
              <div v-if="record.standardKits.length" class="kit-list">
                <div v-for="kit in record.standardKits" :key="kit.key" class="kit-card">
                  <div class="kit-head">
                    <span>
                      {{ kit.productName }}
                      <span v-if="kit.productCode" class="kit-code">{{ kit.productCode }}</span>
                    </span>
                    <span v-if="kit.bomName" class="kit-bom">
                      {{ kit.bomName }}（{{ kit.bomNo }}）· {{ kit.materialCount }} 项
                    </span>
                    <span v-else class="kit-bom muted">未命中已启用随货附件</span>
                  </div>
                  <a-table
                    v-if="kit.lines.length"
                    :columns="kitLineColumns"
                    :data-source="kit.lines"
                    row-key="id"
                    size="small"
                    bordered
                    :pagination="false"
                  />
                </div>
              </div>
              <a-empty
                v-else
                description="本单没有可匹配的产品"
                :image="false"
                class="inner-empty"
              />
            </div>
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'deliveryCode'">
              <a class="link-name" @click.prevent="openDelivery(record)">{{
                record.deliveryCode || '—'
              }}</a>
            </template>
            <template v-else-if="column.key === 'deliveryStatus'">
              <a-tag :color="deliveryStatusColor(record.deliveryStatus)">
                {{ record.deliveryStatus || '—' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'attachmentCount'">
              {{ record.selectedCount }}/{{ record.attachmentTotal }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" @click="openDelivery(record)">查看发货单</a-button>
              <a-tooltip :title="maintainDisabledTip(record)">
                <span>
                  <a-button
                    type="link"
                    size="small"
                    :disabled="!canMaintain(record)"
                    @click="openMaintain(record)"
                  >
                    维护附件
                  </a-button>
                </span>
              </a-tooltip>
            </template>
          </template>
        </a-table>
        <div class="table-pagination">
          <a-pagination
            v-model:current="deliveryPager.current"
            v-model:page-size="deliveryPager.pageSize"
            :total="deliveryList.length"
            size="small"
            show-size-changer
            :page-size-options="['10', '20', '50']"
            :show-total="(t) => `共 ${t} 条`"
            show-quick-jumper
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div class="filter-card">
        <a-form layout="inline" class="filter-form horizontal-form">
          <a-row :gutter="[12, 8]" style="width: 100%">
            <a-col :xs="24" :sm="16" :md="12">
              <a-form-item label="产品" required>
                <div class="item-pick-row">
                  <a-select
                    v-model:value="productForm.itemCode"
                    show-search
                    allow-clear
                    size="small"
                    placeholder="输入编码/名称搜索"
                    style="flex: 1; min-width: 0"
                    :filter-option="false"
                    :options="itemSearchOptions"
                    @search="onItemSearch"
                    @change="onItemCodeChange"
                  />
                  <a-button type="link" size="small" @click="itemPickerOpen = true">
                    查看更多
                  </a-button>
                </div>
                <div v-if="productForm.itemName || productForm.categoryName" class="item-meta">
                  <span v-if="productForm.itemName">名称：{{ productForm.itemName }}</span>
                  <span v-if="productForm.categoryName">类别：{{ productForm.categoryName }}</span>
                </div>
              </a-form-item>
            </a-col>
            <a-col :xs="24" :sm="8" :md="8">
              <a-form-item class="filter-actions-item">
                <a-space>
                  <a-button type="primary" size="small" @click="runProductQuery">
                    <SearchOutlined />
                    查询
                  </a-button>
                  <a-button size="small" @click="resetProduct">清空</a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div v-if="productResult" class="result-stack">
        <div class="table-card result-card">
          <div class="section-title">命中的标准随货包</div>
          <a-empty
            v-if="!productResult.kit"
            :description="productResult.probe.message || '该产品没有命中已启用的随货附件'"
          />
          <template v-else>
            <a-descriptions bordered size="small" :column="2" class="winner-block">
              <a-descriptions-item label="编号">{{ productResult.kit.bomNo }}</a-descriptions-item>
              <a-descriptions-item label="名称">{{
                productResult.kit.bomName
              }}</a-descriptions-item>
              <a-descriptions-item label="适用范围">
                {{ productResult.probe.scopeTypeLabel || '—' }}
              </a-descriptions-item>
              <a-descriptions-item label="命中原因">
                <a-tag color="blue">{{ productResult.probe.matchSourceLabel }}</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="物料数">
                {{ productResult.kit.materialCount }}
              </a-descriptions-item>
              <a-descriptions-item label="操作">
                <a-button
                  type="link"
                  size="small"
                  @click="openShipAttachment(productResult.kit.id)"
                >
                  查看随货附件
                </a-button>
              </a-descriptions-item>
            </a-descriptions>
            <div class="priority-tip">{{ productResult.probe.priorityTip }}</div>
            <a-table
              :columns="kitLineColumns"
              :data-source="productResult.kit.lines"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
            />
          </template>
        </div>

        <div class="table-card result-card">
          <div class="section-title">该产品相关发货单</div>
          <a-table
            :columns="relatedDeliveryColumns"
            :data-source="productResult.deliveries"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :locale="{ emptyText: '暂无相关发货单' }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'deliveryCode'">
                <a class="link-name" @click.prevent="openDelivery(record)">{{
                  record.deliveryCode || '—'
                }}</a>
              </template>
              <template v-else-if="column.key === 'deliveryStatus'">
                <a-tag :color="deliveryStatusColor(record.deliveryStatus)">
                  {{ record.deliveryStatus || '—' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'attachmentCount'">
                {{ record.selectedCount }}/{{ record.attachmentTotal }}
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button type="link" size="small" @click="openDelivery(record)"
                  >查看发货单</a-button
                >
                <a-tooltip :title="maintainDisabledTip(record)">
                  <span>
                    <a-button
                      type="link"
                      size="small"
                      :disabled="!canMaintain(record)"
                      @click="openMaintain(record)"
                    >
                      维护附件
                    </a-button>
                  </span>
                </a-tooltip>
              </template>
            </template>
          </a-table>
        </div>
      </div>
      <div v-else class="table-card">
        <a-empty description="请选择产品后查询标准随货包" />
      </div>
    </template>

    <SelectBomMaterialModal
      v-model:open="itemPickerOpen"
      title="选择产品"
      :multiple="false"
      hide-add-material
      :include-spu-templates="false"
      :spu-can-sell-only="false"
      picker-default-item-type="产品"
      @selected="onItemPicked"
    />

    <ShipAttachmentMaintainDrawer
      v-model:open="maintainOpen"
      :delivery="maintainTarget"
      @saved="onMaintainSaved"
    />
  </div>
</template>

<script>
export default { name: 'ShipAttachmentQueryView' }
</script>

<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { deliveryOrderState, canEditDeliveryOrder } from '@/store/deliveryOrderStore'
import { DELIVERY_STATUS_OPTIONS, deliveryStatusColor } from '@/utils/deliveryOrder'
import { attachmentShipStatusColor } from '@/utils/shipBomAttachments'
import {
  listDeliveryShipQueryRows,
  queryShipAttachmentByProduct,
} from '@/utils/shipAttachmentQuery'
import { shipAttachmentDetailPath } from '@/utils/shipAttachmentNav'
import { buildBomSubItemPickerRows, filterBomSubItemPickerRows } from '@/utils/bomSubItemPicker'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import ShipAttachmentMaintainDrawer from './components/ShipAttachmentMaintainDrawer.vue'

const router = useRouter()
const { openTab } = useTabs()

const mode = ref('delivery')
const modeHint = computed(() => {
  if (mode.value === 'product') {
    return '按产品匹配已启用的随货附件模板（单产品 > 类别 > 全局）。这是标准包，不是某一票发货单。相关发货单待发货/待出库时可维护附件。'
  }
  return '按发货单查看并维护本票要发的附件。待发货、待出库可点「维护附件」勾选纳入；已出库后不可再改。标准随货包仅供参考，不会覆盖本单已勾选内容。'
})

const deliveryFilters = reactive({
  deliveryCode: '',
  customerName: undefined,
  productKeyword: '',
  deliveryStatus: undefined,
  onlyWithAttachments: false,
})
const appliedDeliveryFilters = ref({ ...deliveryFilters })
const deliveryPager = reactive({ current: 1, pageSize: 10 })

const deliveryStatusOpts = DELIVERY_STATUS_OPTIONS.map((v) => ({ label: v, value: v }))

const customerOpts = computed(() => {
  void deliveryOrderState.orders
  const names = [
    ...new Set((deliveryOrderState.orders || []).map((o) => o.customerName).filter(Boolean)),
  ]
  return names.map((n) => ({ label: n, value: n }))
})

const deliveryList = computed(() => {
  void deliveryOrderState.orders
  return listDeliveryShipQueryRows(appliedDeliveryFilters.value)
})

const pagedDeliveries = computed(() => {
  const start = (deliveryPager.current - 1) * deliveryPager.pageSize
  return deliveryList.value.slice(start, start + deliveryPager.pageSize)
})

const deliveryColumns = [
  { title: '发货单号', key: 'deliveryCode', width: 150, ellipsis: true },
  { title: '客户', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '源单号', dataIndex: 'sourceOrderNo', width: 140, ellipsis: true },
  { title: '单据日期', dataIndex: 'documentDate', width: 110 },
  { title: '发货状态', key: 'deliveryStatus', width: 90 },
  { title: '产品', dataIndex: 'productSummary', ellipsis: true },
  { title: '纳入/全部', key: 'attachmentCount', width: 90, align: 'right' },
  { title: '操作', key: 'action', width: 180, fixed: 'right' },
]

const attachmentColumns = [
  { title: '物料编码', dataIndex: 'materialCode', width: 120 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '关联产品', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '来源', key: 'source', width: 72 },
  { title: '发运数量', dataIndex: 'shipQty', width: 88, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '发货状态', key: 'shipStatus', width: 88 },
]

const kitLineColumns = [
  { title: '物料编码', dataIndex: 'materialCode', width: 130 },
  { title: '物料名称', dataIndex: 'materialName', ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '单位用量', dataIndex: 'unitQty', width: 90, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 64 },
]

const relatedDeliveryColumns = [
  { title: '发货单号', key: 'deliveryCode', width: 150 },
  { title: '客户', dataIndex: 'customerName', ellipsis: true },
  { title: '单据日期', dataIndex: 'documentDate', width: 110 },
  { title: '发货状态', key: 'deliveryStatus', width: 90 },
  { title: '纳入/全部', key: 'attachmentCount', width: 90, align: 'right' },
  { title: '操作', key: 'action', width: 180 },
]

function searchDelivery() {
  appliedDeliveryFilters.value = { ...deliveryFilters }
  deliveryPager.current = 1
}

function resetDelivery() {
  deliveryFilters.deliveryCode = ''
  deliveryFilters.customerName = undefined
  deliveryFilters.productKeyword = ''
  deliveryFilters.deliveryStatus = undefined
  deliveryFilters.onlyWithAttachments = false
  searchDelivery()
}

const itemPickerOpen = ref(false)
const itemSearchKeyword = ref('')
const productResult = ref(null)
const productForm = reactive({
  itemId: '',
  itemCode: undefined,
  itemName: '',
  categoryKey: '',
  categoryCode: '',
  categoryName: '',
})

const allItemRows = computed(() =>
  buildBomSubItemPickerRows({
    skipSubItemCount: true,
    includeSpuTemplates: false,
    spuCanSellOnly: false,
  }).filter((r) => r.itemType === '产品'),
)

const itemSearchOptions = computed(() => {
  const kw = itemSearchKeyword.value.trim()
  return filterBomSubItemPickerRows(allItemRows.value, kw)
    .slice(0, 30)
    .map((r) => ({
      value: r.code,
      label: `${r.code} ${r.name || ''}`.trim(),
    }))
})

function onItemSearch(kw) {
  itemSearchKeyword.value = kw || ''
}

function applyItemRow(row) {
  if (!row) return
  productForm.itemId = row.itemId || row.id || ''
  productForm.itemCode = row.code || row.value
  productForm.itemName = row.name || row.label || ''
  productForm.categoryKey = row.categoryKey || ''
  productForm.categoryCode = row.categoryCode || row.categoryKey || ''
  productForm.categoryName = row.categoryName || ''
}

function onItemCodeChange(code) {
  if (!code) {
    productForm.itemId = ''
    productForm.itemName = ''
    productForm.categoryKey = ''
    productForm.categoryCode = ''
    productForm.categoryName = ''
    productResult.value = null
    return
  }
  const row = allItemRows.value.find((r) => r.code === code)
  applyItemRow(row || { code })
}

function onItemPicked(payload) {
  const picked = Array.isArray(payload) ? payload[0] : payload
  if (!picked) return
  const code = picked.code || picked.itemCode
  applyItemRow(
    allItemRows.value.find((r) => r.code === code) || {
      code,
      itemId: picked.itemId || picked.id,
      name: picked.name || picked.itemName,
      categoryKey: picked.categoryKey,
      categoryCode: picked.categoryCode || picked.categoryKey,
      categoryName: picked.categoryName,
    },
  )
}

function runProductQuery() {
  if (!productForm.itemCode && !productForm.itemId) {
    message.warning('请选择产品')
    return
  }
  productResult.value = queryShipAttachmentByProduct({
    productId: productForm.itemId,
    productCode: productForm.itemCode,
    itemId: productForm.itemId,
    itemCode: productForm.itemCode,
    categoryCode: productForm.categoryCode,
    categoryKey: productForm.categoryKey,
  })
}

function resetProduct() {
  productForm.itemId = ''
  productForm.itemCode = undefined
  productForm.itemName = ''
  productForm.categoryKey = ''
  productForm.categoryCode = ''
  productForm.categoryName = ''
  productResult.value = null
}

function onModeChange() {
  if (mode.value === 'product' && productForm.itemCode && !productResult.value) {
    runProductQuery()
  }
}

function openDelivery(record) {
  if (!record?.id) return
  const path = `/sales/delivery/${record.id}`
  openTab(path, `发货单 ${record.deliveryCode || ''}`)
  router.push(path)
}

const maintainOpen = ref(false)
const maintainTarget = ref(null)

function resolveLiveDelivery(record) {
  if (!record?.id) return record
  return (deliveryOrderState.orders || []).find((o) => o.id === record.id) || record
}

function canMaintain(record) {
  void deliveryOrderState.orders
  return canEditDeliveryOrder(resolveLiveDelivery(record))
}

function maintainDisabledTip(record) {
  return canMaintain(record) ? '' : '已出库或已发货，不可再改附件'
}

function openMaintain(record) {
  const live = resolveLiveDelivery(record)
  if (!canMaintain(live)) {
    message.warning('当前发货单不可维护附件')
    return
  }
  maintainTarget.value = live
  maintainOpen.value = true
}

function onMaintainSaved() {
  if (mode.value === 'product' && productForm.itemCode) {
    runProductQuery()
  }
}

function openShipAttachment(id) {
  if (!id) return
  const path = shipAttachmentDetailPath(id)
  openTab(path, '随货附件详情')
  router.push(path)
}
</script>

<style lang="less" scoped>
.query-mode-tabs {
  margin-bottom: 8px;
}

.scene-alert {
  margin-bottom: 12px;
}

.filter-card {
  margin-bottom: 12px;
}

.item-pick-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.item-meta {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.table-card {
  padding: 8px 12px 12px;
  background: #fff;
}

.result-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-card {
  padding-top: 12px;
}

.section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
}

.winner-block {
  margin-bottom: 8px;
}

.priority-tip {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 10px;
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.link-name {
  color: #1677ff;
  cursor: pointer;
  &:hover {
    color: #4096ff;
  }
}

.expand-block {
  padding: 4px 8px 8px;
}

.expand-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.expand-title {
  font-size: 13px;
  font-weight: 600;
  margin: 8px 0 6px;
}

.inner-empty {
  margin: 8px 0 12px;
  :deep(.ant-empty-description) {
    font-size: 12px;
  }
}

.kit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kit-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fafafa;
}

.kit-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}

.kit-code {
  margin-left: 6px;
  color: rgba(0, 0, 0, 0.45);
}

.kit-bom {
  color: rgba(0, 0, 0, 0.65);
  flex-shrink: 0;
}

.muted {
  color: rgba(0, 0, 0, 0.45);
}
</style>
