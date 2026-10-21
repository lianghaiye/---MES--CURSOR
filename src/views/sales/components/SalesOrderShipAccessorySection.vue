<template>
  <div class="so-ship-acc">
    <div class="toolbar">
      <a-space v-if="!readonly" wrap>
        <a-button size="small" @click="openAddPackage">添加配件包</a-button>
        <a-button size="small" @click="openAddStandalone">从主数据添加</a-button>
      </a-space>
      <a-button
        v-if="allowConvertPurchase"
        type="primary"
        size="small"
        :disabled="!gapSummary.gapCount"
        :loading="converting"
        @click="handleFulfillGaps"
      >
        缺口转履约{{ gapSummary.gapCount ? `（${gapSummary.gapCount}）` : '' }}
      </a-button>
      <span class="hint">
        共 {{ gapSummary.total }} 项
        <template v-if="gapSummary.gapCount">
          · 缺口 {{ gapSummary.gapCount }} 项 / {{ formatQty(gapSummary.gapQty) }}
        </template>
      </span>
    </div>

    <a-empty
      v-if="!groups.length"
      class="ship-acc-empty"
      :image="Empty.PRESENTED_IMAGE_SIMPLE"
      :description="
        readonly ? '暂无随货配件' : '暂无随货配件：请添加配件包，或从主数据选择类型为「配件」的物料'
      "
    />

    <div v-for="group in groups" :key="group.key" class="acc-group">
      <div class="acc-group-head">
        <div class="acc-group-title">
          <span class="name">{{ group.title }}</span>
          <a-tag v-if="group.sourceLabel" color="blue">{{ group.sourceLabel }}</a-tag>
        </div>
        <a-space wrap :size="8">
          <span class="field-label">归属产品</span>
          <a-select
            :value="group.productKey"
            size="small"
            style="width: 220px"
            placeholder="可不选"
            :options="productOpts"
            :disabled="readonly"
            allow-clear
            @change="(v) => onGroupProductChange(group, v)"
          />
          <span class="field-label">套数</span>
          <a-input-number
            :value="group.kitSets"
            size="small"
            :min="0"
            :precision="0"
            style="width: 88px"
            :disabled="readonly"
            @change="(v) => onGroupKitSetsChange(group, v)"
          />
          <a-button v-if="!readonly" size="small" type="link" @click="openAddToGroup(group)">
            添加明细
          </a-button>
        </a-space>
      </div>

      <a-table
        :columns="displayLineColumns"
        :data-source="group.rows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1140 }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'shipQty'">
            <a-input-number
              v-if="!readonly"
              v-model:value="record.shipQty"
              size="small"
              :min="0"
              :precision="3"
              style="width: 100px"
              @change="() => onShipQtyChange(record)"
            />
            <span v-else>{{ formatQty(record.shipQty) }}</span>
          </template>
          <template v-else-if="column.key === 'supplyForm'">
            <a-select
              v-if="!readonly"
              :value="record.supplyForm || undefined"
              size="small"
              style="width: 100%"
              :options="supplyFormOpts"
              placeholder="请选择"
              @change="(v) => onSupplyFormChange(record, v)"
            />
            <span v-else>{{ record.supplyForm || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'stockFulfillmentMode'">
            <a-select
              v-if="!readonly"
              :value="record.stockFulfillmentMode || 'prefer_stock'"
              size="small"
              style="width: 100%"
              :options="fulfillmentOpts"
              @change="(v) => onFulfillmentChange(record, v)"
            />
            <span v-else>{{ fulfillmentLabel(record.stockFulfillmentMode) }}</span>
          </template>
          <template v-else-if="column.key === 'availableStock'">
            {{ formatQty(record.availableStock ?? record.warehouseStockQty) }}
          </template>
          <template v-else-if="column.key === 'gapQty'">
            <span :class="{ 'gap-warn': Number(record.gapQty) > 0 }">
              {{ formatQty(record.gapQty) }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeRow(record)">删除</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="packageOpen"
      title="添加随货配件包"
      width="min(1480px, 94vw)"
      :mask-closable="false"
      destroy-on-close
      wrap-class-name="select-ship-package-modal-wrap"
      class="select-ship-package-modal"
      ok-text="添加"
      :ok-button-props="{ disabled: !packageForm.bomId }"
      @ok="confirmAddPackage"
    >
      <div class="filter-card">
        <a-form layout="inline" class="filter-form horizontal-form package-filter-form">
          <ListFilterBar
            :field-count="2"
            search-text="搜索"
            reset-text="清空"
            @search="searchPackageList"
            @reset="resetPackageFilters"
          >
            <a-form-item label="配件包名称">
              <a-input
                v-model:value="packageFilters.bomName"
                allow-clear
                size="small"
                placeholder="请输入"
                @press-enter="searchPackageList"
              />
            </a-form-item>
            <a-form-item label="编号">
              <a-input
                v-model:value="packageFilters.bomNo"
                allow-clear
                size="small"
                placeholder="请输入"
                @press-enter="searchPackageList"
              />
            </a-form-item>
          </ListFilterBar>
        </a-form>
      </div>

      <div class="package-settings">
        <div class="package-settings-item">
          <span class="package-settings-label">归属产品：</span>
          <a-select
            v-model:value="packageForm.productKey"
            show-search
            allow-clear
            size="small"
            option-filter-prop="label"
            placeholder="可不选"
            class="package-product-select"
            :options="productOpts"
          />
        </div>
        <div class="package-settings-item">
          <span class="package-settings-label required">套数：</span>
          <a-input-number
            v-model:value="packageForm.kitSets"
            size="small"
            :min="1"
            :precision="0"
            class="package-sets-input"
          />
        </div>
      </div>

      <div class="picker-body">
        <div class="table-panel">
          <div ref="tableWrapRef" class="table-wrap">
            <a-table
              class="package-pick-table"
              :columns="packageColumns"
              :data-source="pagedPackageRows"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :row-selection="packageRowSelection"
              :custom-row="packageCustomRow"
              :scroll="{ x: 860, y: tableScrollY }"
              :locale="{ emptyText: '暂无已启用的随货配件包' }"
            >
              <template #bodyCell="{ column, index }">
                <template v-if="column.key === 'index'">
                  {{ (packagePage.current - 1) * packagePage.pageSize + index + 1 }}
                </template>
              </template>
            </a-table>
          </div>
          <div class="table-pager">
            <a-pagination
              v-model:current="packagePage.current"
              v-model:page-size="packagePage.pageSize"
              size="small"
              :total="filteredPackageRows.length"
              show-size-changer
              :page-size-options="['8', '10', '20']"
              :show-total="(total) => `共 ${total} 条`"
            />
          </div>
        </div>

        <div class="selected-panel">
          <div class="selected-head">
            <span class="selected-title">已选 {{ selectedPackage ? 1 : 0 }} 项</span>
            <a-button
              v-if="selectedPackage"
              type="link"
              size="small"
              class="clear-btn"
              @click="clearPackageSelection"
            >
              清空
            </a-button>
          </div>
          <div v-if="selectedPackage" class="selected-list">
            <div class="selected-item">
              <div class="selected-item-main">
                <span class="selected-code">{{ selectedPackage.bomNo || '—' }}</span>
                <span class="selected-name" :title="selectedPackage.bomName">
                  {{ selectedPackage.bomName }}
                </span>
              </div>
              <a-button type="text" size="small" class="remove-btn" @click="clearPackageSelection">
                <CloseOutlined />
              </a-button>
            </div>
          </div>
          <a-empty v-else :image="false" description="请从左侧选择" class="selected-empty" />
        </div>
      </div>
    </a-modal>

    <SelectBomMaterialModal
      v-model:open="pickerOpen"
      :title="
        pickerTargetGroup
          ? `向「${pickerTargetGroup.title}」添加明细`
          : '添加配件（建议选择类型为「配件」的物料/产品）'
      "
      picker-default-item-type="配件"
      hide-add-material
      :multiple="true"
      :include-spu-templates="false"
      @selected="onMaterialsPicked"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Empty, message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { useRouter } from 'vue-router'
import {
  enrichShipAccessoryStock,
  fulfillShipAccessoryGapsBySupply,
  summarizeShipAccessoryGaps,
  writebackShipAccessorySupplyForm,
} from '@/utils/salesOrderShipAccessories'
import { buildShipAttachmentsFromBom, createShipAttachmentLine } from '@/utils/shipBomAttachments'
import { listActiveSharedShipBoms, getProductBomById } from '@/store/productBomStore'
import { formatNumber } from '@/utils/numberFormat'
import { SUPPLY_FORM_OPTIONS } from '@/utils/masterDataMigrate'
import {
  STOCK_FULFILLMENT_MODE_OPTIONS,
  normalizeStockFulfillmentMode,
  stockFulfillmentModeLabel,
} from '@/utils/salesStockFulfillment'
import { useTabs } from '@/composables/useTabs'
import { useTableScrollY } from '@/composables/useTableScrollY'
import ListFilterBar from '@/components/ListFilterBar.vue'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  order: { type: Object, required: true },
  warehouse: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  /** 仅审核通过后的详情允许缺口转履约 */
  allowConvertPurchase: { type: Boolean, default: false },
})

const emit = defineEmits(['change'])

const router = useRouter()
const { openTab } = useTabs()
const converting = ref(false)
const packageOpen = ref(false)
const { tableWrapRef, tableScrollY, bindTableResize, unbindTableResize } = useTableScrollY()
const pickerOpen = ref(false)
/** null=顶栏「从主数据添加」独立组；有值=向指定配件包追加明细 */
const pickerTargetGroup = ref(null)
const packageForm = reactive({
  bomId: undefined,
  productKey: undefined,
  kitSets: 1,
})
const packageFilters = reactive({
  bomName: '',
  bomNo: '',
})
const packageFilterApplied = reactive({
  bomName: '',
  bomNo: '',
})

const rows = computed(() => props.order?.shipAccessories || [])
const gapSummary = computed(() => summarizeShipAccessoryGaps(rows.value))

const productOpts = computed(() => {
  const map = new Map()
  ;(props.order?.lineItems || []).forEach((line) => {
    const key = String(line.id || '')
    if (!key || map.has(key)) return
    const code = line.productCode || line.itemCode || ''
    const name = line.productName || line.itemName || ''
    map.set(key, {
      value: key,
      label: [name, code].filter(Boolean).join(' / ') || key,
      salesLineId: line.id,
      productId: line.productId || line.itemId || '',
      productCode: code,
      productName: name,
      salesQty: Number(line.salesQty ?? line.qty) || 1,
    })
  })
  return Array.from(map.values())
})

const packageColumns = [
  { title: '序号', key: 'index', width: 64, align: 'center' },
  { title: '配件包名称', dataIndex: 'bomName', ellipsis: true },
  { title: '编号', dataIndex: 'bomNo', width: 180, ellipsis: true },
  { title: '物料数', dataIndex: 'materialCount', width: 88, align: 'right' },
  { title: '创建人', dataIndex: 'creator', width: 120, ellipsis: true },
  { title: '创建时间', dataIndex: 'createdAt', width: 180, ellipsis: true },
]

const allPackageRows = computed(() =>
  listActiveSharedShipBoms().map((b) => ({
    id: b.id,
    bomName: b.bomName || b.itemName || '未命名配件包',
    bomNo: b.bomNo || '',
    materialCount: (b.lineItems || []).filter((l) => l.materialCode || l.itemCode || l.itemName)
      .length,
    creator: b.creator || b.operator || '—',
    createdAt: b.createdAt || b.updatedAt || '—',
  })),
)

const filteredPackageRows = computed(() => {
  const nameKw = String(packageFilterApplied.bomName || '')
    .trim()
    .toLowerCase()
  const noKw = String(packageFilterApplied.bomNo || '')
    .trim()
    .toLowerCase()
  return allPackageRows.value.filter((row) => {
    if (
      nameKw &&
      !String(row.bomName || '')
        .toLowerCase()
        .includes(nameKw)
    )
      return false
    if (
      noKw &&
      !String(row.bomNo || '')
        .toLowerCase()
        .includes(noKw)
    )
      return false
    return true
  })
})

const packagePage = reactive({ current: 1, pageSize: 8 })

const pagedPackageRows = computed(() => {
  const start = (packagePage.current - 1) * packagePage.pageSize
  return filteredPackageRows.value.slice(start, start + packagePage.pageSize)
})

const packageRowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: packageForm.bomId ? [packageForm.bomId] : [],
  onChange: (keys) => {
    packageForm.bomId = keys[0]
  },
}))

function packageCustomRow(record) {
  return {
    onClick: () => {
      packageForm.bomId = record.id
    },
  }
}

const selectedPackage = computed(
  () => allPackageRows.value.find((row) => row.id === packageForm.bomId) || null,
)

function clearPackageSelection() {
  packageForm.bomId = undefined
}

function searchPackageList() {
  packageFilterApplied.bomName = packageFilters.bomName
  packageFilterApplied.bomNo = packageFilters.bomNo
  packagePage.current = 1
}

function resetPackageFilters() {
  packageFilters.bomName = ''
  packageFilters.bomNo = ''
  packageFilterApplied.bomName = ''
  packageFilterApplied.bomNo = ''
  packagePage.current = 1
}

const groups = computed(() => {
  const map = new Map()
  rows.value.forEach((row) => {
    const bomId = row.sourceBomId || ''
    const key = bomId
      ? `bom:${bomId}:${row.salesLineId || row.productId || ''}`
      : `manual:${row.salesLineId || row.productId || 'none'}`
    if (!map.has(key)) {
      const kitSets =
        row.kitSets != null
          ? Number(row.kitSets)
          : Number(row.unitQty) > 0
            ? Math.round((Number(row.shipQty) || 0) / Number(row.unitQty))
            : 1
      map.set(key, {
        key,
        sourceBomId: bomId,
        title: bomId
          ? row.sourceBomName || row.sourceBomNo || `配件包 ${bomId}`
          : '手工/主数据配件',
        sourceLabel: bomId ? '配件包' : '主数据',
        productKey: row.salesLineId || undefined,
        kitSets: kitSets || 1,
        rows: [],
      })
    }
    map.get(key).rows.push(row)
  })
  return Array.from(map.values())
})

const supplyFormOpts = SUPPLY_FORM_OPTIONS.map((v) => ({ label: v, value: v }))
const fulfillmentOpts = STOCK_FULFILLMENT_MODE_OPTIONS

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '配件编码', dataIndex: 'materialCode', width: 120, ellipsis: true },
  { title: '配件名称', dataIndex: 'materialName', width: 160, ellipsis: true },
  { title: '规格', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '供应型态', key: 'supplyForm', width: 110 },
  { title: '库存履约', key: 'stockFulfillmentMode', width: 168 },
  { title: '单位用量', dataIndex: 'unitQty', width: 88, align: 'right' },
  { title: '需求量', key: 'shipQty', width: 110, align: 'right' },
  { title: '可用库存', key: 'availableStock', width: 96, align: 'right' },
  { title: '缺口', key: 'gapQty', width: 88, align: 'right' },
  { title: '操作', key: 'action', width: 72, align: 'center', fixed: 'right' },
]

const displayLineColumns = computed(() =>
  props.readonly ? lineColumns.filter((c) => c.key !== 'action') : lineColumns,
)

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function ensureList() {
  if (!Array.isArray(props.order.shipAccessories)) {
    // 订单对象为表单/详情可变快照，就地维护清单
    // eslint-disable-next-line vue/no-mutating-props -- shipAccessories 为订单可变字段
    props.order.shipAccessories = []
  }
  return props.order.shipAccessories
}

function persist() {
  ensureList().forEach((r) => enrichShipAccessoryStock(r, props.warehouse))
  emit('change', props.order.shipAccessories)
}

function findProductOpt(productKey) {
  return productOpts.value.find((o) => o.value === productKey)
}

function applyProductToRows(list, opt) {
  list.forEach((r) => {
    r.salesLineId = opt?.salesLineId || ''
    r.productId = opt?.productId || ''
    r.productCode = opt?.productCode || ''
    r.productName = opt?.productName || ''
  })
}

function applyKitSetsToRows(list, kitSets) {
  const sets = Math.max(0, Number(kitSets) || 0)
  list.forEach((r) => {
    r.kitSets = sets
    const unit = Number(r.unitQty) || 1
    r.shipQty = Math.round(unit * sets * 10000) / 10000
    r.planQty = r.shipQty
  })
}

function onGroupProductChange(group, productKey) {
  const opt = findProductOpt(productKey)
  group.productKey = productKey
  applyProductToRows(group.rows, opt)
  persist()
}

function onGroupKitSetsChange(group, kitSets) {
  group.kitSets = kitSets
  applyKitSetsToRows(group.rows, kitSets)
  persist()
}

function onShipQtyChange(record) {
  record.planQty = Number(record.shipQty) || 0
  persist()
}

function fulfillmentLabel(mode) {
  return stockFulfillmentModeLabel(mode)
}

function onFulfillmentChange(record, value) {
  record.stockFulfillmentMode = normalizeStockFulfillmentMode(value)
  persist()
}

function onSupplyFormChange(record, value) {
  const res = writebackShipAccessorySupplyForm(record, value)
  persist()
  if (res.ok) {
    message.success(res.message || '已更新供应型态')
  } else {
    message.warning(res.message || '更新失败')
  }
}

function removeRow(record) {
  const list = ensureList()
  const idx = list.findIndex((r) => r.id === record.id)
  if (idx === -1) return
  list.splice(idx, 1)
  persist()
}

watch(packageOpen, async (open) => {
  if (!open) {
    unbindTableResize()
    return
  }
  await nextTick()
  bindTableResize()
})

function openAddPackage() {
  if (!allPackageRows.value.length) {
    message.warning('暂无已启用的随货配件包，请先在「随货配件」维护')
    return
  }
  resetPackageFilters()
  packageForm.bomId = undefined
  packageForm.productKey = productOpts.value[0]?.value
  packageForm.kitSets = Number(productOpts.value[0]?.salesQty) || 1
  packageOpen.value = true
}

function confirmAddPackage() {
  const bom = getProductBomById(packageForm.bomId)
  const opt = findProductOpt(packageForm.productKey)
  if (!bom) {
    message.warning('请选择配件包')
    return Promise.reject()
  }
  const kitSets = Math.max(1, Number(packageForm.kitSets) || 1)
  const added = buildShipAttachmentsFromBom(bom, {
    productQty: kitSets,
    productId: opt?.productId || '',
    productCode: opt?.productCode || '',
    productName: opt?.productName || '',
    salesLineId: opt?.salesLineId || '',
    warehouse: props.warehouse,
    selected: true,
  }).map((r) => ({
    ...r,
    kitSets,
    sourceBomName: bom.bomName || bom.itemName || '',
    selected: true,
  }))
  if (!added.length) {
    message.warning('该配件包没有明细')
    return Promise.reject()
  }
  const list = ensureList()
  added.forEach((row) => {
    enrichShipAccessoryStock(row, props.warehouse)
    list.push(row)
  })
  persist()
  packageOpen.value = false
  message.success(`已添加配件包「${bom.bomName || bom.itemName}」共 ${added.length} 项`)
}

function openAddStandalone() {
  pickerTargetGroup.value = null
  pickerOpen.value = true
}

function openAddToGroup(group) {
  pickerTargetGroup.value = group
  pickerOpen.value = true
}

function onMaterialsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  const target = pickerTargetGroup.value
  const kitSets = Math.max(1, Number(target?.kitSets) || 1)
  const sample = target?.rows?.[0]
  const ensured = ensureList()
  let n = 0
  list.forEach((item) => {
    const code = item.code || item.itemCode || ''
    if (!code) return
    const sameGroup = (r) => {
      if (target) {
        return (
          r.materialCode === code &&
          (r.sourceBomId || '') === (target.sourceBomId || '') &&
          (r.salesLineId || '') === (sample?.salesLineId || '')
        )
      }
      return r.materialCode === code && !r.sourceBomId && !r.salesLineId
    }
    const exists = ensured.find(sameGroup)
    if (exists) {
      exists.unitQty = (Number(exists.unitQty) || 1) + 1
      exists.shipQty = Math.round((Number(exists.unitQty) || 1) * kitSets * 10000) / 10000
      exists.planQty = exists.shipQty
      exists.kitSets = kitSets
      exists.selected = true
      enrichShipAccessoryStock(exists, props.warehouse)
      n += 1
      return
    }
    const row = createShipAttachmentLine({
      materialCode: code,
      materialName: item.name || item.itemName || code,
      specModel: item.specModel || '',
      material: item.material || '',
      drawingNo: item.drawingNo || '',
      unit: item.inventoryUnit || item.unit || '件',
      unitQty: 1,
      kitSets,
      shipQty: kitSets,
      planQty: kitSets,
      source: target?.sourceBomId ? 'BOM' : '主数据',
      sourceBomId: target?.sourceBomId || '',
      sourceBomNo: sample?.sourceBomNo || '',
      sourceBomName: target?.sourceBomId ? sample?.sourceBomName || target.title : '',
      selected: true,
      warehouse: props.warehouse,
      supplyForm: item.supplyForm || item.supplyType || '',
      materialType: item.materialType || '',
      productId: sample?.productId || '',
      productCode: sample?.productCode || '',
      productName: sample?.productName || '',
      salesLineId: sample?.salesLineId || '',
    })
    enrichShipAccessoryStock(row, props.warehouse)
    ensured.push(row)
    n += 1
  })
  persist()
  pickerTargetGroup.value = null
  if (n) {
    message.success(target ? `已向「${target.title}」添加 ${n} 项明细` : `已添加 ${n} 项配件`)
  }
}

function handleFulfillGaps() {
  converting.value = true
  try {
    const res = fulfillShipAccessoryGapsBySupply(props.order, props.order.shipAccessories, {
      warehouse: props.warehouse,
    })
    if (!res.ok) {
      message.warning(res.message || '转履约失败')
      return
    }
    message.success(res.message)
    if (res.purchase?.id) {
      const path = `/procurement/purchase-req/${res.purchase.id}`
      openTab(path, `采购申请 ${res.purchase.reqNo}`)
      router.push(path).catch(() => {})
    }
  } finally {
    converting.value = false
  }
}

watch(
  () => props.order?.id,
  () => {
    if (!props.order?.shipAccessories?.length) return
    props.order.shipAccessories.forEach((r) => enrichShipAccessoryStock(r, props.warehouse))
  },
  { immediate: true },
)
</script>

<style scoped>
.so-ship-acc {
  width: 100%;
}
.ship-acc-empty {
  margin: 8px 0 4px;
  padding: 8px 0;
}
.ship-acc-empty :deep(.ant-empty-image) {
  height: 40px;
  margin-bottom: 4px;
}
.ship-acc-empty :deep(.ant-empty-description) {
  font-size: 12px;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.hint {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
.acc-group {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
}
.acc-group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.acc-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.acc-group-title .name {
  font-weight: 600;
  font-size: 13px;
}
.field-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.gap-warn {
  color: #ff4d4f;
  font-weight: 600;
}

.package-settings {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 24px;
  margin: 0 0 12px;
  flex-shrink: 0;
}

.package-settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}

.package-settings-label {
  flex: none;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;

  &.required::before {
    content: '*';
    color: #ff4d4f;
    margin-right: 4px;
  }
}

.package-product-select {
  width: 420px;
}

.package-sets-input {
  width: 100px;
}

.filter-card {
  flex-shrink: 0;
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;

  :deep(.ant-form-item) {
    margin-bottom: 0;
  }

  :deep(.list-filter-toolbar) {
    margin-top: 0;
  }
}

.package-filter-form {
  :deep(.list-filter-fields) {
    grid-template-columns: auto auto auto;
    justify-content: start;
    width: auto;
  }

  :deep(.ant-form-item) {
    width: auto;
  }

  :deep(.ant-form-item-control) {
    flex: none;
    width: 420px;
  }

  :deep(.list-filter-actions-cell) {
    grid-column: 3 !important;
    width: auto;
    justify-content: flex-start;
  }
}

.picker-body {
  display: flex;
  gap: 12px;
  align-items: stretch;
  flex: 1;
  min-height: 360px;
  height: 480px;
  max-height: calc(90vh - 260px);
}

.table-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  background: #fff;

  :deep(.ant-table-wrapper),
  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container),
  :deep(.ant-table),
  :deep(.ant-table-container) {
    height: 100%;
  }
}

.table-pager {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
  flex-shrink: 0;
}

.package-pick-table {
  :deep(.ant-table-tbody > tr) {
    cursor: pointer;
  }
}

.selected-panel {
  width: 260px;
  flex-shrink: 0;
  align-self: stretch;
  min-height: 0;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  background: #fafafa;
  overflow: hidden;
}

.selected-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
}

.selected-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

.clear-btn {
  padding: 0;
  height: auto;
}

.selected-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.selected-item {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.selected-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.selected-code {
  font-size: 12px;
  color: #1677ff;
  font-weight: 500;
}

.selected-name {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);

  &:hover {
    color: #ff4d4f;
  }
}

.selected-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}
</style>

<style lang="less">
.select-ship-package-modal-wrap {
  .ant-modal {
    max-width: min(1480px, 94vw);
    top: 24px;
    padding-bottom: 0;
  }

  .ant-modal-content {
    display: flex;
    flex-direction: column;
    max-height: 92vh;
  }

  .ant-modal-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}
</style>
