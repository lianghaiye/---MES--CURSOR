<template>
  <div class="generate-po-page">
    <div class="page-header">
      <div class="header-left">
        <span class="title">生成采购订单</span>
        <a-tag v-if="draftId" color="processing">草稿 {{ draftOrderNo }}</a-tag>
        <span class="sub">共 {{ rows.length }} 行 · 来源申请 {{ sourceReqLabel }}</span>
      </div>
      <a-space>
        <a-button @click="handleCancel">取消</a-button>
        <a-button @click="handleSaveDraft">保存草稿</a-button>
        <a-button type="primary" @click="handleConfirm">确认并生成</a-button>
      </a-space>
    </div>

    <a-alert
      type="info"
      show-icon
      class="tip-bar"
      message="移出本单的物料不会生成采购订单，仍保留在采购申请中（未生成采购），可再次发起。处理中途可「保存草稿」下次继续。"
    />

    <div class="toolbar-row">
      <a-space wrap :size="8" align="center">
        <span class="toolbar-label">交货日期</span>
        <a-date-picker
          :value="headerDeliveryDate"
          size="small"
          allow-clear
          placeholder="请选择交货日期"
          style="width: 160px"
          @change="onHeaderDeliveryDateChange"
        />
        <span class="toolbar-label">收货仓库</span>
        <a-select
          :value="headerReceivingWarehouse"
          size="small"
          allow-clear
          show-search
          placeholder="请选择收货仓库"
          style="width: 180px"
          :options="warehouseOpts"
          :filter-option="filterWarehouseOption"
          @change="onHeaderReceivingWarehouseChange"
        />
        <a-button class="tax-toggle-btn" size="small" @click="toggleTaxMode">
          切换为：{{ taxModeExcluding ? '计算含税' : '计算不含税' }}
        </a-button>
        <span class="tax-hint">{{ taxModeHint }}</span>
      </a-space>
      <TableColumnSettingButton @click="columnDrawerOpen = true" />
    </div>

    <a-table
      :columns="resizableColumns"
      :data-source="rows"
      row-key="key"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: tableScrollX, y: 'calc(100vh - 320px)' }"
      class="gen-table"
    >
      <template #headerCell="{ column }">
        <div class="header-cell">
          <span v-if="column.required" class="col-title-required header-title">
            <span class="required-star">*</span>{{ column.title }}
          </span>
          <span v-else class="header-title">{{ column.title }}</span>
          <span
            v-if="column.key !== 'index' && column.key !== 'action'"
            class="resize-handle"
            @mousedown.prevent="(e) => startResize(e, column.key)"
          />
        </div>
      </template>
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'index'">{{ index + 1 }}</template>

        <template v-else-if="column.key === 'variantSummary'">
          {{ record.variantSummary || '—' }}
        </template>

        <template v-else-if="column.key === 'planPurchaseQty'">
          <a-input-number
            v-model:value="record.planPurchaseQty"
            size="small"
            :min="0"
            :precision="4"
            :formatter="inputNumberFormatter"
            :parser="inputNumberParser"
            style="width: 100%"
            @change="onRowChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'stockAlert'">
          <span :class="stockAlertClass(record._stockAlert?.type)">
            {{ formatStockAlertDisplay(record._stockAlert) }}
          </span>
        </template>

        <template v-else-if="column.key === 'unit'">
          <a-select
            v-model:value="record.unit"
            size="small"
            show-search
            allow-clear
            style="width: 100%"
            :options="purchaseUnitOpts"
            :filter-option="filterUnitOption"
            @change="onUnitChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'settleUnit'">
          {{ record.settleUnit || '—' }}
        </template>

        <template v-else-if="column.key === 'settleQty'">
          <div v-if="hasSettleUnit(record)" class="settle-qty-cell">
            <a-input-number
              v-model:value="record.settleQty"
              size="small"
              :min="0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
              placeholder="选填预估"
              @change="onSettleQtyChange(record)"
            />
            <span v-if="record.settleUnit" class="unit-suffix">{{ record.settleUnit }}</span>
          </div>
          <span v-else>—</span>
        </template>

        <template v-else-if="column.key === 'orderSizeText'">
          <span v-if="isOrderSizeReadonly(record)" :title="orderSizeReadonlyTip(record)">
            {{ displayOrderSizeText(record) || '—' }}
          </span>
          <a v-else class="order-size-link" @click.prevent="openOrderSizeEdit(record)">
            {{ displayOrderSizeText(record) || '填写订货尺寸' }}
          </a>
        </template>

        <template v-else-if="column.key === 'stockQty'">
          {{ formatStockQty(record.stockQty) }}
        </template>

        <template v-else-if="column.key === 'designatedSupplier'">
          <a-select
            v-model:value="record.designatedSupplier"
            size="small"
            style="width: 100%"
            :options="designatedOpts"
          />
        </template>

        <template v-else-if="column.key === 'supplierName'">
          <PlanSupplierSelect
            :value="record.supplierName"
            size="small"
            placeholder="搜索或选择"
            @update:value="(v) => (record.supplierName = v)"
          />
        </template>

        <template v-else-if="column.key === 'settlementType'">
          <a-select
            v-model:value="record.settlementType"
            size="small"
            style="width: 100%"
            :options="settlementOpts"
          />
        </template>

        <template v-else-if="column.key === 'unitPriceExTax'">
          <a-input-number
            v-if="taxModeExcluding"
            v-model:value="record.unitPriceExTax"
            size="small"
            :min="0"
            :precision="4"
            :formatter="inputNumberFormatter"
            :parser="inputNumberParser"
            style="width: 100%"
            @change="onRowChange(record)"
          />
          <span v-else>{{ formatQty(record.unitPriceExTax) }}</span>
        </template>

        <template v-else-if="column.key === 'taxRate'">
          <a-input-number
            v-model:value="record.taxRate"
            size="small"
            :min="0"
            :max="100"
            :precision="4"
            :formatter="inputNumberFormatter"
            :parser="inputNumberParser"
            style="width: 100%"
            @change="onRowChange(record)"
          />
        </template>

        <template v-else-if="column.key === 'unitPriceInTax'">
          <a-input-number
            v-if="!taxModeExcluding"
            v-model:value="record.unitPriceInTax"
            size="small"
            :min="0"
            :precision="4"
            :formatter="inputNumberFormatter"
            :parser="inputNumberParser"
            style="width: 100%"
            @change="onRowChange(record)"
          />
          <span v-else>{{ formatQty(record.unitPriceInTax) }}</span>
        </template>
        <template v-else-if="column.key === 'totalPriceExTax'">
          {{ formatQty(record.totalPriceExTax) }}
        </template>
        <template v-else-if="column.key === 'totalPriceInTax'">
          {{ formatQty(record.totalPriceInTax) }}
        </template>

        <template v-else-if="column.key === 'receivingMode'">
          <a-select
            v-model:value="record.receivingMode"
            size="small"
            style="width: 100%"
            :options="receivingModeOpts"
          />
        </template>

        <template v-else-if="column.key === 'leadTimeDays'">
          <a-input-number
            v-model:value="record.leadTimeDays"
            size="small"
            :min="0"
            :precision="0"
            style="width: 100%"
          />
        </template>

        <template v-else-if="column.key === 'deliveryDate'">
          <a-date-picker
            :value="dateValue(record.deliveryDate)"
            size="small"
            style="width: 100%"
            @change="(d) => onDateChange(record, 'deliveryDate', d)"
          />
        </template>

        <template v-else-if="column.key === 'receivingWarehouse'">
          <a-select
            v-model:value="record.receivingWarehouse"
            size="small"
            allow-clear
            style="width: 100%"
            :options="warehouseOpts"
          />
        </template>

        <template v-else-if="column.key === 'urgency'">
          <a-select
            v-model:value="record.urgency"
            size="small"
            style="width: 100%"
            :options="urgencyOpts"
          />
        </template>

        <template v-else-if="column.key === 'remark'">
          <LongTextEditCell :value="record.remark" @edit="openRemarkEdit(record)" />
        </template>

        <template v-else-if="column.key === 'sourceReqNos'">
          {{ (record.sourceReqNos || []).join('、') }}
        </template>

        <template v-else-if="column.key === 'sourceSalesOrderNos'">
          {{ (record.sourceSalesOrderNos || []).join('、') || '-' }}
        </template>

        <template v-else-if="column.key === 'action'">
          <a-space :size="0">
            <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
            <a-button type="link" size="small" danger @click="removeFromOrder(record)">
              移出本单
            </a-button>
          </a-space>
        </template>

        <template v-else>
          {{ record[column.dataIndex] ?? '-' }}
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="remarkEdit.open"
      title="编辑备注"
      width="640px"
      :mask-closable="false"
      destroy-on-close
      @ok="confirmRemarkEdit"
      @cancel="remarkEdit.open = false"
    >
      <a-textarea v-model:value="remarkEdit.draft" :rows="6" placeholder="请输入备注" allow-clear />
    </a-modal>

    <a-modal
      v-model:open="lineEditOpen"
      title="编辑明细"
      width="900px"
      destroy-on-close
      @ok="applyLineEdit"
    >
      <a-form v-if="lineEditDraft" layout="vertical" class="line-edit-form">
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="物料名称">
              <a-input :value="lineEditDraft.materialName" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="规格型号">
              <a-input :value="lineEditDraft.specModel || '—'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="材质">
              <a-input :value="lineEditDraft.material || '—'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="变体属性">
              <a-input :value="lineEditDraft.variantSummary || '—'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="库存数量">
              <a-input :value="formatStockQty(lineEditDraft.stockQty)" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="库存预警信息">
              <a-input :value="formatStockAlertDisplay(lineEditDraft._stockAlert)" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="期望到货日期">
              <a-input :value="lineEditDraft.expectedArrivalDate || '—'" disabled />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="计划采购量" required>
              <a-input-number
                v-model:value="lineEditDraft.planPurchaseQty"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="采购单位" required>
              <a-select
                v-model:value="lineEditDraft.unit"
                show-search
                allow-clear
                style="width: 100%"
                :options="purchaseUnitOpts"
                :filter-option="filterUnitOption"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="hasSettleUnit(lineEditDraft)" :span="8">
            <a-form-item label="结算单位">
              <a-input :value="lineEditDraft.settleUnit" disabled />
            </a-form-item>
          </a-col>
          <a-col v-if="hasSettleUnit(lineEditDraft)" :span="8">
            <a-form-item :label="`预计结算数量（${lineEditDraft.settleUnit || '结算'}）`">
              <a-input-number
                v-model:value="lineEditDraft.settleQty"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
                placeholder="有标准单重时可自动预估"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="指定供应商">
              <a-select
                v-model:value="lineEditDraft.designatedSupplier"
                style="width: 100%"
                :options="designatedOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供应商名称" required>
              <PlanSupplierSelect
                :value="lineEditDraft.supplierName"
                @update:value="(v) => (lineEditDraft.supplierName = v)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item :label="taxModeExcluding ? '不含税单价' : '含税单价'">
              <a-input-number
                v-if="taxModeExcluding"
                v-model:value="lineEditDraft.unitPriceExTax"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
              />
              <a-input-number
                v-else
                v-model:value="lineEditDraft.unitPriceInTax"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="税率(%)">
              <a-input-number
                v-model:value="lineEditDraft.taxRate"
                :min="0"
                :max="100"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货模式">
              <a-select
                v-model:value="lineEditDraft.receivingMode"
                style="width: 100%"
                :options="receivingModeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供货期/天">
              <a-input-number
                v-model:value="lineEditDraft.leadTimeDays"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货日期">
              <a-date-picker
                :value="dateValue(lineEditDraft.deliveryDate)"
                style="width: 100%"
                @change="(d) => onDateChange(lineEditDraft, 'deliveryDate', d)"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结算类型">
              <a-select
                v-model:value="lineEditDraft.settlementType"
                style="width: 100%"
                :options="settlementOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货仓库">
              <a-select
                v-model:value="lineEditDraft.receivingWarehouse"
                allow-clear
                style="width: 100%"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="紧急度">
              <a-select
                v-model:value="lineEditDraft.urgency"
                style="width: 100%"
                :options="urgencyOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="lineEditDraft.remark" :rows="3" allow-clear />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>

    <TableColumnSettingDrawer
      v-model:open="columnDrawerOpen"
      v-model:settings="columnSettings"
      :default-settings="defaultColumnSettings"
    />

    <BomBlankSizeModal
      v-model:open="orderSizeOpen"
      purpose="order"
      :line="orderSizeModalLine"
      @confirm="onOrderSizeConfirm"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { mergeRequisitionLines, recalcMergedLine } from '@/utils/purchaseMerge'
import {
  hasSettleUnit,
  applySettleFieldsFromMaterial,
  resolveSettleEstimateRate,
} from '@/utils/settleUnit'
import { materialInfoState } from '@/store/materialInfoStore'
import {
  confirmGeneratePurchaseOrders,
  getRequisitionsByIds,
} from '@/store/purchaseRequisitionStore'
import {
  saveGeneratePurchaseOrderDraft,
  getGeneratePurchaseOrderDraft,
  findDraftsBySourceReqIds,
} from '@/store/purchaseOrderStore'
import {
  settlementTypeOptions,
  receivingModeOptions,
  designatedSupplierOptions,
  urgencyOptions,
} from '@/mock/purchaseRequisitionOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { getPurchaseUnitOptions, unitState } from '@/store/unitStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import {
  resolveStockAlertHint,
  stockAlertClass,
  formatStockAlertDisplay,
} from '@/utils/stockAlertDisplay'
import { generatePurchaseOrderColumns } from '@/utils/generatePurchaseOrderColumns'
import {
  applyOrderSizeToLine,
  displayOrderSizeText,
  isOrderSizeReadonly,
  toOrderSizeModalLine,
} from '@/utils/orderSize'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import BomBlankSizeModal from '@/views/product-process/components/BomBlankSizeModal.vue'
import LongTextEditCell from '@/components/LongTextEditCell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { calcTableScrollX, getColumnKey } from '@/utils/tableColumnSettings'
import { useTabs } from '@/composables/useTabs'
import { formatQty, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'

defineOptions({ name: 'GeneratePurchaseOrderView' })

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const rows = ref([])
const draftId = ref('')
const draftOrderNo = ref('')
const taxModeExcluding = ref(true)
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)
const lineEditKey = ref('')
const headerDeliveryDate = ref(null)
const prevHeaderDeliveryDate = ref(undefined)
const headerReceivingWarehouse = ref(undefined)
const prevHeaderReceivingWarehouse = ref(undefined)
const remarkEdit = reactive({
  open: false,
  record: null,
  draft: '',
})

const orderSizeOpen = ref(false)
const orderSizeTargetLine = ref(null)
const orderSizeModalLine = computed(() => toOrderSizeModalLine(orderSizeTargetLine.value))

function orderSizeReadonlyTip(record) {
  if (!isOrderSizeReadonly(record)) return ''
  return '来自生产计划的订货尺寸，不可修改'
}

function openOrderSizeEdit(record) {
  if (isOrderSizeReadonly(record)) {
    message.info('来自生产计划的订货尺寸不可修改')
    return
  }
  orderSizeTargetLine.value = record
  orderSizeOpen.value = true
}

function onOrderSizeConfirm(payload) {
  const line = orderSizeTargetLine.value
  if (!line || isOrderSizeReadonly(line)) return
  applyOrderSizeToLine(line, payload?.blankSize ?? payload, { mode: payload?.mode })
  // 手填不算计划带出，允许后续再改
  line.orderSizeFromPlan = false
  line.orderSizeLocked = false
  message.success(line.orderSizeText ? '订货尺寸已更新' : '已清空订货尺寸')
}

const columnWidths = reactive(
  Object.fromEntries(generatePurchaseOrderColumns.map((c) => [getColumnKey(c), c.width || 100])),
)

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))

const purchaseUnitOpts = computed(() => {
  void unitState.units
  return getPurchaseUnitOptions()
})

const { columnSettings, columnDrawerOpen, displayColumns, defaultColumnSettings } =
  useTableColumnSettings('generate-purchase-order-lines-v7', generatePurchaseOrderColumns, {
    minScrollX: 3200,
    pinEdgeColumns: false,
    pinIndexColumn: true,
    pinActionColumn: true,
  })

const resizableColumns = computed(() =>
  displayColumns.value.map((col) => {
    const key = getColumnKey(col)
    return {
      ...col,
      width: columnWidths[key] ?? col.width,
    }
  }),
)

const tableScrollX = computed(() => calcTableScrollX(resizableColumns.value, 3200))

function startResize(e, key) {
  if (!key || !(key in columnWidths)) return
  const startX = e.clientX
  const startWidth = columnWidths[key]

  const onMove = (ev) => {
    columnWidths[key] = Math.max(64, startWidth + ev.clientX - startX)
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价算含税（请填不含税单价，含税单价自动计算且不可编辑）'
    : '当前：按含税单价算不含税（请填含税单价，不含税单价自动计算且不可编辑）',
)

const settlementOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const receivingModeOpts = receivingModeOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})
const designatedOpts = designatedSupplierOptions

const sourceReqLabel = computed(() => {
  const nos = [...new Set(rows.value.flatMap((r) => r.sourceReqNos || []))]
  return nos.length ? nos.join('、') : '—'
})

function decorateRow(row) {
  const hint = resolveStockAlertHint({
    materialCode: row.materialCode,
    stockQty: row.stockQty,
  })
  const next = {
    ...row,
    urgency: row.urgency || '正常',
    variantSummary: row.variantSummary || '',
    _stockAlert: hint,
  }
  if (!String(next.settleUnit || '').trim()) {
    const master = materialInfoState.materials.find((m) => m.code === next.materialCode)
    if (master) applySettleFieldsFromMaterial(next, master)
  } else if (!(Number(next.standardUnitWeight) > 0)) {
    const { rate, source } = resolveSettleEstimateRate(next)
    if (rate != null) {
      next.standardUnitWeight = rate
      next.settleEstimateRateSource = source
    }
  }
  return next
}

function recalcRow(record, options = {}) {
  recalcMergedLine(record, taxModeExcluding.value, options)
}

function syncHeaderDeliveryFromRows() {
  const dates = [...new Set(rows.value.map((r) => r.deliveryDate).filter(Boolean))]
  if (dates.length === 1) {
    headerDeliveryDate.value = dayjs(dates[0])
    prevHeaderDeliveryDate.value = dates[0]
  } else {
    headerDeliveryDate.value = null
    prevHeaderDeliveryDate.value = undefined
  }
}

function syncHeaderReceivingFromRows() {
  const warehouses = [...new Set(rows.value.map((r) => r.receivingWarehouse).filter(Boolean))]
  if (warehouses.length === 1) {
    headerReceivingWarehouse.value = warehouses[0]
    prevHeaderReceivingWarehouse.value = warehouses[0]
  } else {
    headerReceivingWarehouse.value = undefined
    prevHeaderReceivingWarehouse.value = undefined
  }
}

function filterWarehouseOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function loadFromQuery() {
  const draftQuery = String(route.query.draftId || '').trim()
  if (draftQuery) {
    const draft = getGeneratePurchaseOrderDraft(draftQuery)
    if (draft?.draftRows?.length) {
      draftId.value = draft.id
      draftOrderNo.value = draft.orderNo
      rows.value = draft.draftRows.map((r) => {
        const row = decorateRow({ ...r })
        recalcRow(row)
        return row
      })
      syncHeaderDeliveryFromRows()
      syncHeaderReceivingFromRows()
      return
    }
    message.warning('草稿不存在或已失效，已按申请单重新加载')
  }

  const ids = String(route.query.ids || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const existingDrafts = findDraftsBySourceReqIds(ids)
  if (existingDrafts.length && !draftQuery) {
    const latest = [...existingDrafts].sort((a, b) =>
      String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')),
    )[0]
    message.info(`已关联草稿「${latest.orderNo}」，已自动打开该草稿`)
    router.replace({
      query: { draftId: latest.id },
    })
    return
  }
  const requisitions = getRequisitionsByIds(ids)
  if (!requisitions.length) {
    rows.value = []
    message.warning('未找到可生成的采购申请')
    syncHeaderDeliveryFromRows()
    syncHeaderReceivingFromRows()
    return
  }
  rows.value = mergeRequisitionLines(requisitions, { onlyPending: true }).map((r) => {
    const row = decorateRow({ ...r })
    recalcRow(row)
    if (!row.receivingWarehouse) {
      row.receivingWarehouse = resolveDefaultWarehouseByMaterialCode(row.materialCode) || undefined
    }
    return row
  })
  syncHeaderDeliveryFromRows()
  syncHeaderReceivingFromRows()
  if (!rows.value.length) {
    message.info('所选申请单没有「未生成采购」的明细行')
  }
}

watch(
  () => [route.query.ids, route.query.draftId],
  () => loadFromQuery(),
  { immediate: true },
)

function formatStockQty(val) {
  return formatQty(val)
}

function dateValue(val) {
  return val ? dayjs(val) : null
}

function onDateChange(record, field, date) {
  record[field] = date ? date.format('YYYY-MM-DD') : ''
}

function onHeaderDeliveryDateChange(date) {
  const newVal = date ? date.format('YYYY-MM-DD') : ''
  const oldVal = prevHeaderDeliveryDate.value
  const changed = newVal !== (oldVal || '')

  headerDeliveryDate.value = date
  prevHeaderDeliveryDate.value = newVal || undefined

  if (!changed || !newVal || !rows.value.length) return

  Modal.confirm({
    title: '交货日期已修改，是否同步修改明细交货日期？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      rows.value.forEach((row) => {
        row.deliveryDate = newVal
      })
    },
  })
}

function onHeaderReceivingWarehouseChange(newVal) {
  const next = newVal || undefined
  const oldVal = prevHeaderReceivingWarehouse.value
  const changed = next !== oldVal

  headerReceivingWarehouse.value = next
  prevHeaderReceivingWarehouse.value = next

  if (!changed || !next || !rows.value.length) return

  Modal.confirm({
    title: '收货仓库已修改，是否同步修改明细收货仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      rows.value.forEach((row) => {
        row.receivingWarehouse = next
      })
    },
  })
}

function onRowChange(record) {
  recalcRow(record)
}

function onSettleQtyChange(record) {
  recalcRow(record, { refreshSettleEstimate: false })
}

function filterUnitOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

function onUnitChange(record) {
  record.purchaseUnit = record.unit || record.purchaseUnit || ''
  onRowChange(record)
}

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
  rows.value.forEach(recalcRow)
}

function openRemarkEdit(record) {
  remarkEdit.record = record
  remarkEdit.draft = record.remark || ''
  remarkEdit.open = true
}

function confirmRemarkEdit() {
  if (remarkEdit.record) {
    remarkEdit.record.remark = remarkEdit.draft || ''
  }
  remarkEdit.open = false
}

function openLineEdit(record) {
  lineEditKey.value = record.key
  lineEditDraft.value = { ...record, _stockAlert: record._stockAlert }
  lineEditOpen.value = true
}

function applyLineEdit() {
  const draft = lineEditDraft.value
  if (!draft) {
    lineEditOpen.value = false
    return
  }
  const target = rows.value.find((r) => r.key === lineEditKey.value)
  if (target) {
    Object.assign(target, draft)
    target.purchaseUnit = target.unit || target.purchaseUnit || ''
    if (hasSettleUnit(target) && !(Number(target.settleQty) > 0)) {
      recalcRow(target)
    } else {
      recalcRow(target, { refreshSettleEstimate: false })
    }
    target._stockAlert = resolveStockAlertHint({
      materialCode: target.materialCode,
      stockQty: target.stockQty,
    })
  }
  lineEditOpen.value = false
}

function removeFromOrder(record) {
  rows.value = rows.value.filter((r) => r.key !== record.key)
  if (!rows.value.length) {
    message.info('明细已全部移出，请返回列表重新选择申请单后再生成')
  }
}

function goList() {
  const path = '/procurement/purchase-req'
  openTab(path, '采购申请')
  router.push(path)
}

function handleCancel() {
  goList()
}

function stripUiFields(row) {
  const next = { ...row }
  delete next._stockAlert
  return next
}

function handleSaveDraft() {
  if (!rows.value.length) {
    message.warning('没有可保存的明细')
    return
  }
  const result = saveGeneratePurchaseOrderDraft({
    rows: rows.value.map(stripUiFields),
    draftId: draftId.value || undefined,
  })
  if (!result.ok) {
    message.error(result.message || '保存失败')
    return
  }
  draftId.value = result.draft.id
  draftOrderNo.value = result.draft.orderNo
  message.success(`草稿已保存：${result.draft.orderNo}`)
  router.replace({
    query: {
      ...route.query,
      draftId: result.draft.id,
    },
  })
}

function handleConfirm() {
  if (!rows.value.length) {
    message.warning('没有可生成的明细，请先保留至少一行')
    return
  }
  const missingQty = rows.value.find((r) => !(Number(r.planPurchaseQty) > 0))
  if (missingQty) {
    message.warning(
      `请填写「${missingQty.materialName || missingQty.materialCode || '明细'}」的计划采购量`,
    )
    return
  }
  const missingUnit = rows.value.find((r) => !String(r.unit || '').trim())
  if (missingUnit) {
    message.warning(
      `请填写「${missingUnit.materialName || missingUnit.materialCode || '明细'}」的采购单位`,
    )
    return
  }
  const missingSupplier = rows.value.find((r) => !String(r.supplierName || '').trim())
  if (missingSupplier) {
    message.warning(
      `请填写「${missingSupplier.materialName || missingSupplier.materialCode || '明细'}」的供应商名称`,
    )
    return
  }
  rows.value.forEach(recalcRow)
  const payload = rows.value.map(stripUiFields)
  const result = confirmGeneratePurchaseOrders(payload, { draftId: draftId.value || undefined })
  const tip =
    result.writtenSuppliers > 0 ? `；已回写 ${result.writtenSuppliers} 个物料默认供应商` : ''
  message.success(`已按供应商生成 ${result.poCount} 张采购单：${result.poNos.join('、')}${tip}`)
  goList()
}
</script>

<style lang="less" scoped>
.generate-po-page {
  padding: 12px 16px 24px;
  background: #fff;
  min-height: calc(100vh - 120px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex-wrap: wrap;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
  }

  .sub {
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }
}

.tip-bar {
  margin-bottom: 12px;
}

.toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  gap: 12px;
}

.toolbar-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.tax-toggle-btn {
  flex-shrink: 0;
}

.tax-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.col-title-required {
  .required-star {
    margin-right: 2px;
    color: #ff4d4f;
    font-family: SimSun, sans-serif;
  }
}

.gen-table {
  :deep(.ant-table-thead > tr > th) {
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  :deep(.ant-table-thead > tr > th .ant-table-column-sorters) {
    white-space: nowrap;
  }
}

.settle-qty-cell {
  display: flex;
  align-items: center;
  gap: 4px;

  .unit-suffix {
    flex-shrink: 0;
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }
}

.header-cell {
  display: flex;
  align-items: center;
  position: relative;
  padding-right: 6px;
  min-height: 22px;
  user-select: none;

  .header-title {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .resize-handle {
    position: absolute;
    right: -4px;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: col-resize;
    z-index: 2;

    &:hover {
      background: rgba(22, 119, 255, 0.25);
    }
  }
}

.line-edit-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}

.stock-alert-below {
  color: #ff4d4f;
  font-weight: 500;
}

.stock-alert-above {
  color: #1677ff;
  font-weight: 500;
}

.order-size-link {
  color: #1677ff;
  cursor: pointer;
}
</style>
