<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="purchase-req-form-modal"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block" :class="{ 'is-collapsed': basicInfoCollapsed }">
        <div class="section-title-row">
          <span class="section-title">基本信息</span>
          <a-button type="link" size="small" class="collapse-btn" @click="toggleBasicInfo">
            {{ basicInfoCollapsed ? '展开' : '收起' }}
            <DownOutlined v-if="basicInfoCollapsed" />
            <UpOutlined v-else />
          </a-button>
        </div>
        <a-form
          v-show="!basicInfoCollapsed"
          :model="form"
          layout="inline"
          class="header-form horizontal-form"
        >
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="6">
              <a-form-item label="申请单号">
                <a-input
                  v-model:value="form.reqNo"
                  placeholder="不填则系统自动生成"
                  allow-clear
                  size="small"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="期望到货日期" required>
                <a-date-picker
                  v-model:value="form.estimatedArrivalDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择期望到货日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="紧急度">
                <a-select v-model:value="form.urgency" size="small" :options="urgencyOpts" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="交货日期">
                <a-date-picker
                  v-model:value="form.deliveryDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择交货日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="收货仓库">
                <a-select
                  v-model:value="form.receivingWarehouse"
                  size="small"
                  allow-clear
                  placeholder="请选择收货仓库"
                  :options="warehouseOpts"
                  @change="onHeaderReceivingWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="18">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  size="small"
                  :maxlength="500"
                  show-count
                  placeholder="请输入备注"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">采购清单</div>
        <div class="line-toolbar">
          <a-space>
            <a-button type="primary" size="small" :loading="addingItems" @click="openProductPicker">
              <PlusOutlined />
              添加物品
            </a-button>
            <TableColumnSettingButton @click="columnDrawerOpen = true" />
          </a-space>
        </div>

        <div
          ref="lineTablePanelRef"
          class="line-table-panel"
          :class="{ 'panel-scrolling': isLineTableScrolling }"
          :style="lineTablePanelStyle"
        >
          <div class="line-table-body" :class="{ 'is-scrolling': isLineTableScrolling }">
            <a-table
              :columns="displayColumns"
              :data-source="form.lineItems"
              row-key="id"
              size="small"
              bordered
              :pagination="false"
              :scroll="lineTableScroll"
            >
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'specModel'">
                  <a
                    v-if="isSpuLine(record)"
                    class="variant-field-link"
                    @click.prevent="openVariantConfig(record)"
                  >
                    {{ record.specModel || '点击配置' }}
                  </a>
                  <span v-else>{{ record.specModel || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'material'">
                  <a
                    v-if="isSpuLine(record)"
                    class="variant-field-link"
                    @click.prevent="openVariantConfig(record)"
                  >
                    {{ record.material || '点击配置' }}
                  </a>
                  <span v-else>{{ record.material || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'variantAttr'">
                  <a
                    v-if="isSpuLine(record)"
                    class="variant-field-link"
                    @click.prevent="openVariantConfig(record)"
                  >
                    {{ lineVariantDisplay(record) || '—' }}
                  </a>
                  <span v-else>{{ lineVariantDisplay(record) || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'stockQty'">
                  {{ formatQty(record.stockQty) }}
                </template>
                <template v-else-if="column.key === 'unit'">
                  <a-select
                    v-model:value="record.unit"
                    size="small"
                    show-search
                    allow-clear
                    :options="purchaseUnitOpts"
                    :filter-option="filterUnitOption"
                    placeholder="采购单位"
                    style="width: 100%"
                    @change="onUnitChange(record)"
                  />
                </template>
                <template v-else-if="column.key === 'orderSizeText'">
                  <a class="order-size-link" @click.prevent="openOrderSizeEdit(record)">
                    {{ record.orderSizeText || record.blankSizeText || '填写订货尺寸' }}
                  </a>
                </template>
                <template v-else-if="column.key === 'planPurchaseQty'">
                  <a-input-number
                    v-model:value="record.planPurchaseQty"
                    size="small"
                    :min="0"
                    :precision="2"
                    style="width: 100%"
                    @change="onQtyChange(record)"
                  />
                </template>
                <template v-else-if="column.key === 'supplierName'">
                  <PlanSupplierSelect
                    v-model:value="record.supplierName"
                    size="small"
                    placeholder="请搜索或选择供应商"
                  />
                </template>
                <template v-else-if="column.key === 'receivingWarehouse'">
                  <a-select
                    v-model:value="record.receivingWarehouse"
                    size="small"
                    allow-clear
                    show-search
                    :options="warehouseOpts"
                    :filter-option="filterWarehouseOption"
                    placeholder="收货仓库"
                    style="width: 100%"
                  />
                </template>
                <template v-else-if="column.key === 'remark'">
                  <a-input
                    v-model:value="record.remark"
                    size="small"
                    allow-clear
                    placeholder="请输入备注"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a class="danger-link" @click="removeLine(record.id)">删除</a>
                </template>
                <template v-else>
                  {{ record[column.dataIndex] ?? '—' }}
                </template>
              </template>
              <template #emptyText>
                <div class="line-empty-placeholder">暂无数据</div>
              </template>
            </a-table>
          </div>
          <InventoryLineTableFooter
            :columns="displayColumns"
            :scroll-x="lineScrollX"
            @add-line="addBlankLine"
          >
            <template #cell="{ column }">
              <template v-if="column.key === 'index'">合计</template>
              <template v-else-if="column.key === 'productCode'">
                项数 {{ lineSummary.lineCount }}
              </template>
              <template v-else-if="column.key === 'planPurchaseQty'">
                {{ formatQty(lineSummary.qtyTotal) }}
              </template>
            </template>
          </InventoryLineTableFooter>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-if="isActive"
    v-model:open="productPickerOpen"
    title="添加产品/物料"
    :include-spu-templates="true"
    @selected="onSalesProductsSelected"
  />

  <ConfigureSalesSpuVariantModal
    v-model:open="variantConfigOpen"
    :spu-id="variantConfigSpuId"
    :initial-variant-values="variantConfigInitialValues"
    confirm-text="确定"
    @confirm="onVariantConfigConfirm"
  />

  <TableColumnSettingDrawer
    v-model:open="columnDrawerOpen"
    v-model:settings="columnSettings"
    :default-settings="defaultColumnSettings"
    title="采购清单列设置"
  />

  <BomBlankSizeModal
    v-model:open="orderSizeOpen"
    purpose="order"
    :line="orderSizeModalLine"
    @confirm="onOrderSizeConfirm"
  />
</template>

<script setup>
import { formatQty } from '@/utils/numberFormat'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { PlusOutlined, CheckOutlined, UpOutlined, DownOutlined } from '@ant-design/icons-vue'
import { urgencyOptions } from '@/mock/purchaseRequisitionOptions'
import { mockInventory } from '@/mock/inventory'
import { createLineItem } from '@/mock/purchaseRequisitions'
import {
  addPurchaseRequisition,
  generateReqNo,
  updatePurchaseRequisition,
} from '@/store/purchaseRequisitionStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getPurchaseUnitOptions, unitState } from '@/store/unitStore'
import { convertStockDemandToPurchase, purchaseQtyToStockQty } from '@/utils/purchaseUomConvert'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import BomBlankSizeModal from '@/views/product-process/components/BomBlankSizeModal.vue'
import ConfigureSalesSpuVariantModal from '@/views/sales/components/ConfigureSalesSpuVariantModal.vue'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import InventoryLineTableFooter from '@/views/inventory/components/InventoryLineTableFooter.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import { useSpuVariantConfig } from '@/composables/useSpuVariantConfig'
import {
  createSpuLineDraft,
  isSpuLine,
  lineVariantSummary,
  applyResolvedSkuToProcurementLine,
  validateLinesSkuResolved,
} from '@/utils/spuLineResolve'
import { useInventoryLineTableScroll } from '@/composables/useInventoryLineTableScroll'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { purchaseRequisitionFormLineColumns } from '@/utils/purchaseRequisitionLineColumns'
import { applyOrderSizeToLine, toOrderSizeModalLine } from '@/utils/orderSize'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/procurement/purchase-req',
  getTitle: () => (isEdit.value ? '编辑采购申请单' : '新增采购申请单'),
})

const saving = ref(false)
const addingItems = ref(false)
const basicInfoCollapsed = ref(false)
const productPickerOpen = ref(false)
const orderSizeOpen = ref(false)
const orderSizeTargetLine = ref(null)
const orderSizeModalLine = computed(() => toOrderSizeModalLine(orderSizeTargetLine.value))
const {
  variantConfigOpen,
  variantConfigSpuId,
  variantConfigInitialValues,
  variantConfigTargetLine,
  openVariantConfig,
  lineVariantDisplay,
} = useSpuVariantConfig()

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-req-form-lines-v5', purchaseRequisitionFormLineColumns, {
    minScrollX: 1560,
    pinEdgeColumns: false,
    pinActionColumn: true,
  })

const lineScrollX = tableScrollX

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const form = reactive({
  reqNo: '',
  urgency: '正常',
  deliveryDate: null,
  estimatedArrivalDate: null,
  receivingWarehouse: undefined,
  remark: '',
  lineItems: [],
})

const prevHeaderReceivingWarehouse = ref(undefined)

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((line) => lineItemCode(line))
  const qtyTotal = lines.reduce((sum, line) => sum + (Number(line.planPurchaseQty) || 0), 0)
  return {
    lineCount: lines.length,
    qtyTotal: Math.round(qtyTotal * 100) / 100,
  }
})

const {
  panelRef: lineTablePanelRef,
  panelStyle: lineTablePanelStyle,
  tableScroll: lineTableScroll,
  isScrolling: isLineTableScrolling,
  updateScrollY,
} = useInventoryLineTableScroll({
  scrollX: lineScrollX,
  getRowCount: () => form.lineItems.length,
})

watch(
  () => isActive.value,
  (visible) => {
    if (visible) nextTick(updateScrollY)
  },
)

watch(
  () => [isActive.value, props.editRecord?.id],
  ([visible]) => {
    if (!visible) return
    basicInfoCollapsed.value = false
    if (props.editRecord) loadEditForm(props.editRecord)
    else resetForm()
    nextTick(() => {
      updateScrollY()
      setTimeout(updateScrollY, 120)
    })
  },
  { immediate: true },
)

function toggleBasicInfo() {
  basicInfoCollapsed.value = !basicInfoCollapsed.value
  nextTick(() => {
    updateScrollY()
    setTimeout(updateScrollY, 120)
  })
}

function normalizeLineItems(items) {
  return items.map((line) => ({
    ...line,
    productName: line.productName || line.inventoryName || '',
    productCode: line.productCode || line.inventoryCode || '',
    inventoryName: line.inventoryName || line.productName || '',
    inventoryCode: line.inventoryCode || line.productCode || '',
    drawingNo: line.drawingNo || '',
    remark: line.remark || '',
  }))
}

function resetForm() {
  form.reqNo = ''
  form.urgency = '正常'
  form.deliveryDate = null
  form.estimatedArrivalDate = null
  form.receivingWarehouse = undefined
  form.remark = ''
  form.lineItems = []
  prevHeaderReceivingWarehouse.value = undefined
}

function loadEditForm(record) {
  form.reqNo = record.reqNo
  form.urgency = record.urgency
  form.deliveryDate = record.deliveryDate ? dayjs(record.deliveryDate) : null
  form.estimatedArrivalDate = record.estimatedArrivalDate
    ? dayjs(record.estimatedArrivalDate)
    : null
  form.receivingWarehouse = record.receivingWarehouse || undefined
  form.remark = record.remark || ''
  form.lineItems = normalizeLineItems(record.lineItems || [])
  prevHeaderReceivingWarehouse.value = form.receivingWarehouse
}

function filterWarehouseOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function syncLineReceivingWarehouses(warehouse) {
  form.lineItems.forEach((line) => {
    line.receivingWarehouse = warehouse || ''
  })
}

function onHeaderReceivingWarehouseChange(newVal) {
  const oldVal = prevHeaderReceivingWarehouse.value
  const changed = newVal !== oldVal
  prevHeaderReceivingWarehouse.value = newVal

  if (!changed || !form.lineItems.length) return

  if (!oldVal && newVal) {
    form.lineItems.forEach((line) => {
      if (!line.receivingWarehouse) line.receivingWarehouse = newVal
    })
    return
  }

  if (!newVal) return

  Modal.confirm({
    title: '收货仓库已修改，是否同步修改明细收货仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => syncLineReceivingWarehouses(newVal),
  })
}

function resolveLineWarehouse(code) {
  return form.receivingWarehouse || resolveDefaultWarehouseByMaterialCode(code) || ''
}

function resolveStockQty(code) {
  const inv = mockInventory.find((m) => m.code === code)
  return inv?.stockQty ?? 0
}

function lineItemCode(line) {
  return line.productCode || line.inventoryCode || ''
}

function openProductPicker() {
  productPickerOpen.value = true
}

function mapPickerToLineItem(payload) {
  const code = payload.code || ''
  const name = payload.name || ''
  const master = materialInfoState.materials.find((m) => m.code === code) || payload
  const converted = convertStockDemandToPurchase(1, master)
  return createLineItem({
    productId: payload.itemId || payload.id || '',
    productName: name,
    productCode: code,
    inventoryName: name,
    inventoryCode: code,
    specModel: payload.specModel || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    materialType: payload.materialType || '零部件',
    supplyType: payload.supplyForm || '',
    unit: converted.purchaseUnit,
    inventoryUnit: converted.inventoryUnit,
    purchaseUnit: converted.purchaseUnit,
    packageContent: converted.packageContent,
    convertHint: converted.convertHint,
    stockQty: resolveStockQty(code),
    demandQty: converted.demandStockQty,
    planPurchaseQty: Math.max(converted.planPurchaseQty, 1),
    supplierName: payload.defaultSupplier || '',
    designatedSupplier: Boolean(payload.defaultSupplier),
    receivingWarehouse: resolveLineWarehouse(code),
    remark: '',
    isSpuLine: false,
    spuId: payload.spuId || '',
    spuName: payload.spuName || '',
    variantValues: payload.variantValues ? { ...payload.variantValues } : {},
    variantSummary: payload.variantSummary || '',
  })
}

function onSalesProductsSelected(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  const skuRows = list.filter((r) => r.pickType !== 'spu')
  const spuRows = list.filter((r) => r.pickType === 'spu')
  if (skuRows.length) onProductsSelected(skuRows)
  if (spuRows.length) onSpuDraftSelected(spuRows)
}

function onSpuDraftSelected(rows) {
  let added = 0
  rows.forEach((payload) => {
    const spuId = payload.spuId || payload.id
    if (!spuId) return
    const dup = form.lineItems.some(
      (line) => isSpuLine(line) && line.spuId === spuId && !line.productId,
    )
    if (dup) return
    const draft = createSpuLineDraft(payload)
    form.lineItems.push(
      createLineItem({
        ...draft,
        inventoryName: draft.productName,
        inventoryCode: '',
        planPurchaseQty: 1,
        demandQty: 1,
        stockQty: 0,
        receivingWarehouse: form.receivingWarehouse || '',
        remark: '',
      }),
    )
    added += 1
  })
  if (!added) {
    message.info('所选产品族已在明细中（待配置变体），未重复添加')
    return
  }
  message.success(`已添加 ${added} 个产品族，请点击规格型号 / 材质 / 变体属性完成配置`)
}

function onVariantConfigConfirm(payload) {
  const { resolved, variantValues } = payload || {}
  if (!resolved?.sku) {
    message.warning('未匹配到 SKU')
    return
  }
  const target = variantConfigTargetLine.value
  if (!target) {
    message.warning('未找到待配置的明细行')
    return
  }
  const dupSku = form.lineItems.some(
    (line) => line.id !== target.id && lineItemCode(line) === resolved.productCode,
  )
  if (dupSku) {
    message.warning(`产品编码「${resolved.productCode}」已在明细中`)
    return
  }
  applyResolvedSkuToProcurementLine(target, resolved)
  target.variantValues = { ...(variantValues || resolved.variantValues || {}) }
  target.variantSummary = lineVariantSummary(target)
  target.stockQty = resolveStockQty(resolved.productCode)
  message.success('变体已配置')
}

function onProductsSelected(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  if (!list.length) {
    message.warning('未选择物品')
    return
  }
  addingItems.value = true
  productPickerOpen.value = false
  nextTick(() => {
    try {
      const before = form.lineItems.length
      list.forEach((payload) => {
        const code = payload.code || ''
        if (!code) return
        if (form.lineItems.some((l) => lineItemCode(l) === code)) return
        form.lineItems.push(mapPickerToLineItem(payload))
      })
      const added = form.lineItems.length - before
      if (added > 0) message.success(`已添加 ${added} 条明细`)
      else message.info('所选物品已在明细中')
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  form.lineItems.push(
    createLineItem({
      productName: '',
      productCode: '',
      inventoryName: '',
      inventoryCode: '',
      planPurchaseQty: 1,
      receivingWarehouse: form.receivingWarehouse || '',
    }),
  )
}

const purchaseUnitOpts = computed(() => {
  void unitState.units
  return getPurchaseUnitOptions()
})

function filterUnitOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function onUnitChange(record) {
  record.purchaseUnit = record.unit || record.purchaseUnit || ''
  if (record.unit && record.inventoryUnit && record.unit === record.inventoryUnit) {
    record.convertHint = ''
  }
  onQtyChange(record)
}

function onQtyChange(record) {
  const content = Number(record.packageContent) > 0 ? Number(record.packageContent) : 1
  const purchaseUnit = record.unit || record.purchaseUnit
  if (purchaseUnit && record.inventoryUnit && purchaseUnit !== record.inventoryUnit) {
    record.demandQty = purchaseQtyToStockQty(record.planPurchaseQty, content)
  } else {
    record.demandQty = record.planPurchaseQty
  }
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((line) => line.id !== id)
}

function openOrderSizeEdit(record) {
  orderSizeTargetLine.value = record
  orderSizeOpen.value = true
}

function onOrderSizeConfirm(payload) {
  const line = orderSizeTargetLine.value
  if (!line) return
  applyOrderSizeToLine(line, payload?.blankSize ?? payload, { mode: payload?.mode })
  message.success(line.orderSizeText ? '订货尺寸已更新' : '已清空订货尺寸')
}

function handleSave() {
  if (!form.estimatedArrivalDate) {
    message.warning('请选择期望到货日期')
    return
  }

  const skuCheck = validateLinesSkuResolved(form.lineItems)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return
  }

  const validLines = form.lineItems.filter((line) => lineItemCode(line))
  if (!validLines.length) {
    message.warning('请至少添加一条有效明细')
    return
  }

  const missingQty = validLines.find(
    (line) => line.planPurchaseQty == null || Number(line.planPurchaseQty) <= 0,
  )
  if (missingQty) {
    message.warning(
      `请填写「${missingQty.productName || missingQty.inventoryName || '明细'}」的计划采购数`,
    )
    return
  }

  saving.value = true
  const reqNo = form.reqNo?.trim() || generateReqNo()
  const deliveryDate = form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : ''
  const estimatedArrivalDate = form.estimatedArrivalDate.format('YYYY-MM-DD')

  const lineItems = validLines.map((line) => {
    const next = { ...line }
    const content = Number(next.packageContent) > 0 ? Number(next.packageContent) : 1
    if (next.purchaseUnit && next.inventoryUnit && next.purchaseUnit !== next.inventoryUnit) {
      next.demandQty = purchaseQtyToStockQty(next.planPurchaseQty, content)
    } else if (next.demandQty == null) {
      next.demandQty = next.planPurchaseQty
    }
    next.deliveryDate = deliveryDate
    next.expectedArrivalDate = estimatedArrivalDate
    next.receivingWarehouse = next.receivingWarehouse || form.receivingWarehouse || ''
    next.productName = next.productName || next.inventoryName || ''
    next.productCode = next.productCode || next.inventoryCode || ''
    next.inventoryName = next.productName
    next.inventoryCode = next.productCode
    next.purchaseUnit = next.unit || next.purchaseUnit || ''
    return next
  })

  const payload = {
    reqNo,
    urgency: form.urgency,
    deliveryDate,
    estimatedArrivalDate,
    receivingWarehouse: form.receivingWarehouse || '',
    remark: form.remark?.trim() || '',
    lineItems,
    orderDate: dayjs().format('YYYY-MM-DD'),
    source: '新增',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    salesOrderNo: props.editRecord?.salesOrderNo || '',
    purchaseOrderNo: props.editRecord?.purchaseOrderNo || '',
    operator: '管理员',
    creator: props.editRecord?.creator || '管理员',
    createdAt: props.editRecord?.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }

  if (props.pageMode) {
    if (isEdit.value) {
      updatePurchaseRequisition(props.editRecord.id, payload)
    } else {
      addPurchaseRequisition({ ...payload, id: `pr-${Date.now()}` })
    }
  } else {
    emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  }

  saving.value = false
  message.success(isEdit.value ? '采购申请已更新' : '采购申请已保存')
  closeAfterSave()
}
</script>

<style lang="less">
@import '@/views/inventory/components/inventoryLineTablePanel.less';
</style>

<style lang="less" scoped>
:deep(.form-create-page.purchase-req-form-modal) {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;

  .form-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
}

.form-layout {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  .section-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 12px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 0;
    color: #1f1f1f;
  }

  .collapse-btn {
    padding-inline: 4px;
    height: auto;
    flex-shrink: 0;
  }

  &.is-collapsed {
    padding-top: 10px;
    padding-bottom: 10px;

    .section-title-row {
      margin-bottom: 0;
    }
  }

  &.section-block--lines {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;

    .section-title {
      margin-bottom: 12px;
    }
  }
}

.header-form {
  flex-shrink: 0;

  :deep(.ant-form-item) {
    margin-bottom: 0;
    width: 100%;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 72px;
    align-self: flex-start;
  }
}

.line-toolbar {
  flex-shrink: 0;
  margin-bottom: 8px;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px !important;
}

.variant-field-link {
  color: #1677ff;
  cursor: pointer;
  word-break: break-word;

  &:hover {
    color: #4096ff;
  }
}

.order-size-link {
  color: #1677ff;
  cursor: pointer;
  word-break: break-word;

  &:hover {
    color: #4096ff;
  }
}
</style>
