<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="purchase-order-form-modal"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="po-form-shell">
      <div class="form-layout">
        <div class="section-block">
          <div class="section-title">基本信息</div>
          <a-form layout="inline" class="header-form horizontal-form">
            <a-row :gutter="[12, 12]" style="width: 100%">
              <a-col :span="6">
                <a-form-item label="采购单号">
                  <a-input
                    v-model:value="form.orderNo"
                    placeholder="留空则系统自动生成"
                    allow-clear
                    size="small"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="供应商" required>
                  <PlanSupplierSelect
                    v-model:value="form.supplier"
                    placeholder="请搜索或选择供应商"
                    @change="onSupplierChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="结算类型">
                  <a-select
                    v-model:value="form.settlementType"
                    size="small"
                    :options="settlementTypeOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="结算周期">
                  <a-select
                    v-model:value="form.settlementCycle"
                    size="small"
                    :options="settlementCycleOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="结算方式">
                  <a-select
                    v-model:value="form.settlementMethod"
                    size="small"
                    :options="settlementMethodOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="销售订单">
                  <SalesOrderSearchSelect v-model:value="form.salesOrderNo" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="生产工单">
                  <WorkOrderSearchSelect v-model:value="form.workOrderNo" />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="交货日期" required>
                  <a-date-picker
                    v-model:value="form.deliveryDate"
                    size="small"
                    style="width: 100%"
                    @change="onHeaderDeliveryDateChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="提醒日期">
                  <a-date-picker
                    v-model:value="form.reminderDate"
                    size="small"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="交货方式">
                  <a-select
                    v-model:value="form.deliveryMethod"
                    size="small"
                    :options="deliveryMethodOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="供货期/天">
                  <a-input-number
                    v-model:value="form.leadTimeDays"
                    size="small"
                    :min="0"
                    style="width: 100%"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="物流单号">
                  <a-input
                    v-model:value="form.logisticsNo"
                    size="small"
                    placeholder="请输入 物流单号"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="联系人">
                  <a-select
                    v-model:value="form.contactPerson"
                    size="small"
                    allow-clear
                    :options="contactOpts"
                    @change="onContactChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="联系方式">
                  <a-input
                    v-model:value="form.contactPhone"
                    size="small"
                    placeholder="请输入 联系方式"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="合同编号">
                  <a-input
                    v-model:value="form.contractNo"
                    size="small"
                    placeholder="请输入 合同编号"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="收货地址">
                  <a-input
                    v-model:value="form.shippingAddress"
                    size="small"
                    placeholder="请输入 收货地址"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="收货仓库">
                  <a-select
                    v-model:value="form.receivingWarehouse"
                    size="small"
                    allow-clear
                    placeholder="请选择 收货仓库"
                    :options="warehouseOpts"
                    @change="onHeaderReceivingWarehouseChange"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="6">
                <a-form-item label="采购员">
                  <a-select
                    v-model:value="form.purchaser"
                    size="small"
                    show-search
                    :options="purchaserOpts"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item label="备注" class="remark-item">
                  <a-textarea
                    v-model:value="form.remark"
                    :rows="2"
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
            <a-space wrap>
              <a-button
                type="primary"
                size="small"
                :loading="addingItems"
                @click="openProductPicker"
              >
                <PlusOutlined />
                选择产品
              </a-button>
              <a-button class="tax-toggle-btn" size="small" @click="toggleTaxMode">
                切换为：{{ taxModeExcluding ? '计算含税' : '计算不含税' }}
              </a-button>
              <span class="tax-hint">{{ taxModeHint }}</span>
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
                  <template v-else-if="column.key === 'purchaseQty'">
                    <InventoryLineEditableCell
                      :active="isLineCellEditing(record.id, 'purchaseQty')"
                      :display="formatQty(record.purchaseQty)"
                      :empty="record.purchaseQty == null || record.purchaseQty === ''"
                      numeric
                      @activate="startLineCellEdit(record.id, 'purchaseQty')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input-number
                          v-model:value="record.purchaseQty"
                          :min="0"
                          :precision="4"
                          :formatter="inputNumberFormatter"
                          :parser="inputNumberParser"
                          size="small"
                          style="width: 100%"
                          autofocus
                          @blur="endEdit"
                          @pressEnter="endEdit"
                          @change="() => onLineChange(record)"
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <template v-else-if="column.key === 'unit'">
                    <InventoryLineEditableCell
                      :active="isLineCellEditing(record.id, 'unit')"
                      :display="record.unit || '—'"
                      :empty="!record.unit"
                      placeholder="采购单位"
                      @activate="startLineCellEdit(record.id, 'unit', { select: true })"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-select
                          v-model:value="record.unit"
                          size="small"
                          show-search
                          allow-clear
                          placeholder="采购单位"
                          style="width: 100%"
                          :open="lineCellSelectOpen"
                          :options="purchaseUnitOpts"
                          :filter-option="filterUnitOption"
                          @dropdownVisibleChange="onLineCellSelectOpenChange"
                          @change="
                            () => {
                              record.purchaseUnit = record.unit || record.purchaseUnit || ''
                              endEdit()
                            }
                          "
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <template v-else-if="column.key === 'orderSizeText'">
                    {{ record.orderSizeText || record.blankSizeText || '—' }}
                  </template>
                  <template v-else-if="column.key === 'unitPriceExTax'">
                    <InventoryLineEditableCell
                      v-if="taxModeExcluding"
                      :active="isLineCellEditing(record.id, 'unitPriceExTax')"
                      :display="formatQty(record.unitPriceExTax)"
                      :empty="record.unitPriceExTax == null || record.unitPriceExTax === ''"
                      numeric
                      @activate="startLineCellEdit(record.id, 'unitPriceExTax')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input-number
                          v-model:value="record.unitPriceExTax"
                          :min="0"
                          :precision="4"
                          :formatter="inputNumberFormatter"
                          :parser="inputNumberParser"
                          size="small"
                          style="width: 100%"
                          autofocus
                          @blur="endEdit"
                          @pressEnter="endEdit"
                          @change="() => onLineChange(record)"
                        />
                      </template>
                    </InventoryLineEditableCell>
                    <span v-else>{{ formatQty(record.unitPriceExTax) }}</span>
                  </template>
                  <template v-else-if="column.key === 'taxRate'">
                    <InventoryLineEditableCell
                      :active="isLineCellEditing(record.id, 'taxRate')"
                      :display="formatQty(record.taxRate)"
                      :empty="record.taxRate == null || record.taxRate === ''"
                      numeric
                      @activate="startLineCellEdit(record.id, 'taxRate')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input-number
                          v-model:value="record.taxRate"
                          :min="0"
                          :max="100"
                          :precision="2"
                          size="small"
                          style="width: 100%"
                          autofocus
                          @blur="endEdit"
                          @pressEnter="endEdit"
                          @change="() => onLineChange(record)"
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <template v-else-if="column.key === 'unitPriceInTax'">
                    <InventoryLineEditableCell
                      v-if="!taxModeExcluding"
                      :active="isLineCellEditing(record.id, 'unitPriceInTax')"
                      :display="formatQty(record.unitPriceInTax)"
                      :empty="record.unitPriceInTax == null || record.unitPriceInTax === ''"
                      numeric
                      @activate="startLineCellEdit(record.id, 'unitPriceInTax')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input-number
                          v-model:value="record.unitPriceInTax"
                          :min="0"
                          :precision="4"
                          :formatter="inputNumberFormatter"
                          :parser="inputNumberParser"
                          size="small"
                          style="width: 100%"
                          autofocus
                          @blur="endEdit"
                          @pressEnter="endEdit"
                          @change="() => onLineChange(record)"
                        />
                      </template>
                    </InventoryLineEditableCell>
                    <span v-else>{{ formatQty(record.unitPriceInTax) }}</span>
                  </template>
                  <template v-else-if="column.key === 'totalPriceExTax'">
                    {{ formatMoney(record.totalPriceExTax) }}
                  </template>
                  <template v-else-if="column.key === 'totalPriceInTax'">
                    {{ formatMoney(record.totalPriceInTax) }}
                  </template>
                  <template v-else-if="column.key === 'deliveryDate'">
                    <InventoryLineEditableCell
                      :active="isLineCellEditing(record.id, 'deliveryDate')"
                      :display="record.deliveryDate || '—'"
                      :empty="!record.deliveryDate"
                      placeholder="请选择"
                      @activate="startLineCellEdit(record.id, 'deliveryDate', { select: true })"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-date-picker
                          :value="lineDeliveryDateValue(record.deliveryDate)"
                          size="small"
                          style="width: 100%"
                          :open="lineCellSelectOpen"
                          @openChange="onLineCellSelectOpenChange"
                          @change="
                            (date) => {
                              onLineDeliveryDateChange(record, date)
                              endEdit()
                            }
                          "
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <template v-else-if="column.key === 'receivingWarehouse'">
                    <InventoryLineEditableCell
                      :active="isLineCellEditing(record.id, 'receivingWarehouse')"
                      :display="record.receivingWarehouse || '—'"
                      :empty="!record.receivingWarehouse"
                      placeholder="请选择"
                      @activate="
                        startLineCellEdit(record.id, 'receivingWarehouse', { select: true })
                      "
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-select
                          v-model:value="record.receivingWarehouse"
                          allow-clear
                          size="small"
                          placeholder="请选择"
                          style="width: 100%"
                          :open="lineCellSelectOpen"
                          :options="warehouseOpts"
                          @dropdownVisibleChange="onLineCellSelectOpenChange"
                          @change="endEdit"
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <template v-else-if="column.key === 'remark'">
                    <InventoryLineEditableCell
                      :active="isLineCellEditing(record.id, 'remark')"
                      :display="record.remark || '—'"
                      :empty="!record.remark"
                      placeholder="请输入"
                      @activate="startLineCellEdit(record.id, 'remark')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input
                          v-model:value="record.remark"
                          size="small"
                          allow-clear
                          placeholder="请输入备注"
                          autofocus
                          @blur="endEdit"
                          @pressEnter="endEdit"
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space :size="4">
                      <a @click="openLineEdit(record)">编辑</a>
                      <a class="danger-link" @click="removeLine(record.id)">删除</a>
                    </a-space>
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
                <template v-else-if="column.key === 'purchaseQty'">
                  {{ formatQty(lineSummary.qtyTotal) }}
                </template>
                <template v-else-if="column.key === 'totalPriceExTax'">
                  {{ formatMoney(lineSummary.amountExTax) }}
                </template>
                <template v-else-if="column.key === 'totalPriceInTax'">
                  {{ formatMoney(lineSummary.amountInTax) }}
                </template>
              </template>
            </InventoryLineTableFooter>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button size="small" @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" size="small" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-if="isActive"
    v-model:open="productPickerOpen"
    title="添加产品/物料"
    picker-default-item-type="产品"
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

  <PurchaseOrderLineEditModal
    v-model:open="lineEditOpen"
    :line="lineEditTarget"
    :tax-mode-excluding="taxModeExcluding"
    :warehouse-opts="warehouseOpts"
    @save="onLineEditSave"
  />

  <TableColumnSettingDrawer
    v-model:open="columnDrawerOpen"
    v-model:settings="columnSettings"
    :default-settings="defaultColumnSettings"
    title="采购清单列设置"
  />
</template>

<script setup>
import { formatQty, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import {
  settlementTypeOptions,
  settlementCycleOptions,
  settlementMethodOptions,
  deliveryMethodOptions,
  contactOptions,
  purchaserOptions,
  warehouseOptions,
} from '@/mock/purchaseOrderOptions'
import { mockInventory } from '@/mock/inventory'
import { createPoLineItem } from '@/mock/purchaseOrders'
import { productInfoState } from '@/store/productInfoStore'
import { materialInfoState } from '@/store/materialInfoStore'
import { getPurchaseUnitOptions, unitState } from '@/store/unitStore'
import { resolvePurchaseUnit, resolveInventoryUnit } from '@/utils/purchaseUomConvert'
import {
  addPurchaseOrder,
  generatePurchaseOrderNo,
  recalcPoLine,
  updatePurchaseOrder,
} from '@/store/purchaseOrderStore'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import ConfigureSalesSpuVariantModal from '@/views/sales/components/ConfigureSalesSpuVariantModal.vue'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import SalesOrderSearchSelect from './SalesOrderSearchSelect.vue'
import WorkOrderSearchSelect from './WorkOrderSearchSelect.vue'
import PurchaseOrderLineEditModal from './PurchaseOrderLineEditModal.vue'
import InventoryLineEditableCell from '@/views/inventory/components/InventoryLineEditableCell.vue'
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
import { useInventoryLineCellEdit } from '@/composables/useInventoryLineCellEdit'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import { purchaseOrderFormLineColumns } from '@/utils/purchaseOrderLineColumns'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/procurement/purchase-orders',
  getTitle: () => (isEdit.value ? '编辑采购单' : '新增采购单'),
})

const taxModeExcluding = ref(true)
const addingItems = ref(false)
const productPickerOpen = ref(false)
const prevHeaderDeliveryDate = ref('')
const prevHeaderReceivingWarehouse = ref(undefined)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditSourceId = ref(null)
const {
  variantConfigOpen,
  variantConfigSpuId,
  variantConfigInitialValues,
  variantConfigTargetLine,
  openVariantConfig,
  lineVariantDisplay,
} = useSpuVariantConfig()

const settlementTypeOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const settlementCycleOpts = settlementCycleOptions.map((v) => ({ label: v, value: v }))
const settlementMethodOpts = settlementMethodOptions.map((v) => ({ label: v, value: v }))
const deliveryMethodOpts = deliveryMethodOptions.map((v) => ({ label: v, value: v }))
const purchaserOpts = purchaserOptions.map((v) => ({ label: v, value: v }))
const contactOpts = contactOptions.map((c) => ({ label: c.label, value: c.value, phone: c.phone }))
const warehouseOpts = warehouseOptions

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价算含税（请填不含税单价，含税单价自动计算且不可编辑）'
    : '当前：按含税单价算不含税（请填含税单价，不含税单价自动计算且不可编辑）',
)

const purchaseUnitOpts = computed(() => {
  void unitState.units
  return getPurchaseUnitOptions()
})

function filterUnitOption(input, option) {
  return (option?.label || '').toLowerCase().includes(String(input || '').toLowerCase())
}

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('purchase-order-form-lines-v5', purchaseOrderFormLineColumns, {
    minScrollX: 2200,
    pinEdgeColumns: false,
    pinActionColumn: true,
  })

const lineScrollX = tableScrollX

const form = reactive({
  orderNo: '',
  supplier: '',
  settlementType: '先款后货',
  settlementCycle: '月结',
  settlementMethod: '现金结算',
  salesOrderNo: '',
  workOrderNo: '',
  deliveryDate: null,
  reminderDate: null,
  deliveryMethod: '定时交货',
  leadTimeDays: 12,
  logisticsNo: '',
  contactPerson: undefined,
  contactPhone: '',
  contractNo: '',
  shippingAddress: '',
  receivingWarehouse: undefined,
  purchaser: 'admin1',
  remark: '',
  lineItems: [],
})

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((line) => lineItemCode(line))
  const qtyTotal = lines.reduce((sum, line) => sum + (Number(line.purchaseQty) || 0), 0)
  const amountExTax = lines.reduce((sum, line) => sum + (Number(line.totalPriceExTax) || 0), 0)
  const amountInTax = lines.reduce((sum, line) => sum + (Number(line.totalPriceInTax) || 0), 0)
  return {
    lineCount: lines.length,
    qtyTotal: Math.round(qtyTotal * 100) / 100,
    amountExTax: Math.round(amountExTax * 100) / 100,
    amountInTax: Math.round(amountInTax * 100) / 100,
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

const {
  selectOpen: lineCellSelectOpen,
  isEditing: isLineCellEditing,
  startEdit: startLineCellEdit,
  endEdit: endLineCellEdit,
  onSelectOpenChange: onLineCellSelectOpenChange,
} = useInventoryLineCellEdit()

watch(
  () => isActive.value,
  (visible) => {
    if (!visible) return
    nextTick(() => {
      updateScrollY()
      setTimeout(updateScrollY, 120)
    })
  },
)

watch(displayColumns, () => nextTick(updateScrollY), { deep: true })

watch(
  () => [isActive.value, props.editRecord?.id],
  ([visible]) => {
    if (!visible) return
    taxModeExcluding.value = true
    if (props.editRecord) loadEditForm(props.editRecord)
    else resetForm()
  },
  { immediate: true },
)

function normalizeLineItems(items) {
  return items.map((line) => ({
    ...line,
    productName: line.productName || line.itemName || '',
    productCode: line.productCode || line.itemCode || '',
    itemName: line.itemName || line.productName || '',
    itemCode: line.itemCode || line.productCode || '',
    drawingNo: line.drawingNo || '',
    stockQty: line.stockQty ?? 0,
    deliveryDate: line.deliveryDate || '',
    receivingWarehouse: line.receivingWarehouse || '',
    remark: line.remark || '',
  }))
}

function syncHeaderTrackers() {
  prevHeaderDeliveryDate.value = form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : ''
  prevHeaderReceivingWarehouse.value = form.receivingWarehouse
}

function resetForm() {
  form.orderNo = ''
  form.supplier = ''
  form.settlementType = '先款后货'
  form.settlementCycle = '月结'
  form.settlementMethod = '现金结算'
  form.salesOrderNo = ''
  form.workOrderNo = ''
  form.deliveryDate = null
  form.reminderDate = null
  form.deliveryMethod = '定时交货'
  form.leadTimeDays = 12
  form.logisticsNo = ''
  form.contactPerson = undefined
  form.contactPhone = ''
  form.contractNo = ''
  form.shippingAddress = ''
  form.receivingWarehouse = undefined
  form.purchaser = 'admin1'
  form.remark = ''
  form.lineItems = []
  syncHeaderTrackers()
}

function loadEditForm(record) {
  form.orderNo = record.orderNo
  form.supplier = record.supplier
  form.settlementType = record.settlementType
  form.settlementCycle = record.settlementCycle
  form.settlementMethod = record.settlementMethod
  form.salesOrderNo = record.salesOrderNo || ''
  form.workOrderNo = record.workOrderNo || ''
  form.deliveryDate = record.deliveryDate ? dayjs(record.deliveryDate) : null
  form.reminderDate = record.reminderDate ? dayjs(record.reminderDate) : null
  form.deliveryMethod = record.deliveryMethod
  form.leadTimeDays = record.leadTimeDays
  form.logisticsNo = record.logisticsNo || ''
  form.contactPerson = record.contactPerson || undefined
  form.contactPhone = record.contactPhone || ''
  form.contractNo = record.contractNo || ''
  form.shippingAddress = record.shippingAddress || ''
  form.receivingWarehouse = record.receivingWarehouse || undefined
  form.purchaser = record.purchaser
  form.remark = record.remark || ''
  form.lineItems = normalizeLineItems(record.lineItems || [])
  syncHeaderTrackers()
}

function onSupplierChange() {
  /* placeholder for supplier linkage */
}

function onContactChange(name) {
  const c = contactOpts.find((item) => item.value === name)
  if (c?.phone) form.contactPhone = c.phone
}

function resolveStockQty(code) {
  const inv = mockInventory.find((m) => m.code === code)
  return inv?.stockQty ?? 0
}

function resolveMasterRecord(payload) {
  if (payload.itemType === '产品') {
    return productInfoState.products.find((p) => p.id === payload.id) || null
  }
  return materialInfoState.materials.find((m) => m.id === payload.id) || null
}

function headerDeliveryDateStr() {
  return form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : ''
}

function mapPickerToPoLine(payload) {
  const master = resolveMasterRecord(payload)
  const code = payload.code || ''
  const unitPrice = Number(master?.unitPrice ?? payload.unitPrice ?? 0)
  const taxRate = Number(master?.inputTaxRate ?? 13)
  const variantValues = master?.variantValues
    ? { ...master.variantValues }
    : payload.variantValues
      ? { ...payload.variantValues }
      : {}

  const line = createPoLineItem({
    productName: payload.name,
    productCode: code,
    itemName: payload.name,
    itemCode: code,
    itemType: payload.itemType || '物料',
    category: payload.categoryName || master?.categoryName || '',
    specModel: payload.specModel || master?.specModel || '',
    specAttr: master?.standardSpec || '',
    material: payload.material || master?.material || '',
    drawingNo: payload.drawingNo || '',
    stockQty: resolveStockQty(code),
    purchaseQty: 1,
    unit: resolvePurchaseUnit(master || payload),
    purchaseUnit: resolvePurchaseUnit(master || payload),
    inventoryUnit: resolveInventoryUnit(master || payload),
    unitPriceExTax: unitPrice,
    taxRate,
    deliveryDate: headerDeliveryDateStr(),
    receivingWarehouse: form.receivingWarehouse || '',
    remark: '',
    isSpuLine: false,
    spuId: master?.spuId || payload.spuId || '',
    spuName: master?.spuName || payload.spuName || '',
    productId: payload.id || master?.id || '',
    variantValues,
    variantSummary: master?.variantSummary || payload.variantSummary || '',
  })
  recalcLineWithMode(line)
  return line
}

function lineItemCode(line) {
  return line.productCode || line.itemCode || ''
}

function openProductPicker() {
  productPickerOpen.value = true
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
    const line = createPoLineItem({
      ...draft,
      itemName: draft.productName,
      itemCode: '',
      purchaseQty: 1,
      deliveryDate: headerDeliveryDateStr(),
      receivingWarehouse: form.receivingWarehouse || '',
      remark: '',
    })
    recalcLineWithMode(line)
    form.lineItems.push(line)
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
  target.itemName = target.productName
  target.itemCode = target.productCode
  target.stockQty = resolveStockQty(resolved.productCode)
  const master = resolveMasterBySkuId(resolved.productId)
  if (master) {
    const unitPrice = Number(master.unitPrice ?? 0)
    if (taxModeExcluding.value) {
      target.unitPriceExTax = unitPrice
    } else {
      target.unitPriceInTax =
        Math.round(unitPrice * (1 + (Number(target.taxRate) || 13) / 100) * 100) / 100
    }
    target.taxRate = Number(master.inputTaxRate ?? target.taxRate ?? 13)
    target.unit = resolvePurchaseUnit(master)
    target.purchaseUnit = target.unit
    target.inventoryUnit = resolveInventoryUnit(master)
    target.drawingNo = master.drawingNo || target.drawingNo || ''
    target.category = master.categoryName || target.category || ''
  }
  recalcLineWithMode(target)
  message.success('变体已配置')
}

function resolveMasterBySkuId(productId) {
  if (!productId) return null
  return (
    productInfoState.products.find((p) => p.id === productId) ||
    materialInfoState.materials.find((m) => m.id === productId) ||
    null
  )
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
      let added = 0
      list.forEach((payload) => {
        const code = payload.code || ''
        if (!code) return
        if (form.lineItems.some((l) => lineItemCode(l) === code)) return
        form.lineItems.push(mapPickerToPoLine(payload))
        added += 1
      })
      if (added > 0) message.success(`已添加 ${added} 条明细`)
      else message.info('所选物品已在明细中')
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  const line = createPoLineItem({
    deliveryDate: headerDeliveryDateStr(),
    receivingWarehouse: form.receivingWarehouse || '',
  })
  recalcLineWithMode(line)
  form.lineItems.push(line)
}

function syncLineDeliveryDates(dateStr) {
  form.lineItems.forEach((line) => {
    line.deliveryDate = dateStr
  })
}

function onHeaderDeliveryDateChange(date) {
  const newStr = date ? date.format('YYYY-MM-DD') : ''
  const oldStr = prevHeaderDeliveryDate.value
  prevHeaderDeliveryDate.value = newStr

  if (newStr === oldStr || !form.lineItems.length) return

  if (!oldStr && newStr) {
    syncLineDeliveryDates(newStr)
    return
  }

  if (!newStr) return

  Modal.confirm({
    title: '交货日期已修改，是否同步修改明细交货日期？',
    okText: '是',
    cancelText: '否',
    onOk: () => syncLineDeliveryDates(newStr),
  })
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

function lineDeliveryDateValue(value) {
  return value ? dayjs(value) : null
}

function onLineDeliveryDateChange(record, date) {
  record.deliveryDate = date ? date.format('YYYY-MM-DD') : ''
}

function recalcLineWithMode(record) {
  const rate = Number(record.taxRate) || 0
  if (taxModeExcluding.value) {
    const ex = Number(record.unitPriceExTax) || 0
    record.unitPriceInTax = Math.round(ex * (1 + rate / 100) * 100) / 100
  } else {
    const inc = Number(record.unitPriceInTax) || 0
    record.unitPriceExTax = Math.round((inc / (1 + rate / 100)) * 100) / 100
  }
  recalcPoLine(record)
}

function onLineChange(record) {
  recalcLineWithMode(record)
}

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
  form.lineItems.forEach(recalcLineWithMode)
}

function removeLine(id) {
  const idx = form.lineItems.findIndex((l) => l.id === id)
  if (idx >= 0) form.lineItems.splice(idx, 1)
}

function openLineEdit(record) {
  lineEditSourceId.value = record.id
  lineEditTarget.value = { ...record }
  lineEditOpen.value = true
}

function onLineEditSave(updated) {
  const idx = form.lineItems.findIndex((l) => l.id === lineEditSourceId.value)
  if (idx < 0) return
  Object.assign(form.lineItems[idx], updated)
  recalcLineWithMode(form.lineItems[idx])
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function handleSave() {
  if (!form.supplier) {
    message.warning('请选择供应商')
    return
  }
  if (!form.deliveryDate) {
    message.warning('请选择交货日期')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条采购清单')
    return
  }

  const skuCheck = validateLinesSkuResolved(form.lineItems)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return
  }

  const missingQty = form.lineItems.find(
    (line) => line.purchaseQty == null || Number(line.purchaseQty) <= 0,
  )
  if (missingQty) {
    message.warning(
      `请填写「${missingQty.productName || missingQty.itemName || '明细'}」的采购数量`,
    )
    return
  }

  form.lineItems.forEach((line) => {
    recalcLineWithMode(line)
    line.productName = line.productName || line.itemName || ''
    line.productCode = line.productCode || line.itemCode || ''
    line.itemName = line.productName
    line.itemCode = line.productCode
    if (!line.deliveryDate) {
      line.deliveryDate = headerDeliveryDateStr()
    }
    if (!line.receivingWarehouse && form.receivingWarehouse) {
      line.receivingWarehouse = form.receivingWarehouse
    }
  })

  const orderNo = form.orderNo?.trim() || generatePurchaseOrderNo()

  const payload = {
    ...JSON.parse(JSON.stringify(form)),
    orderNo,
    reqNo: props.editRecord?.reqNo || '',
    deliveryDate: form.deliveryDate.format('YYYY-MM-DD'),
    reminderDate: form.reminderDate ? form.reminderDate.format('YYYY-MM-DD') : '',
    receivingWarehouse: form.receivingWarehouse || '',
    documentDate: props.editRecord?.documentDate || dayjs().format('YYYY-MM-DD'),
    orderSource: props.editRecord?.orderSource || '新增',
    applyType: props.editRecord?.applyType || '日常采购申请',
    status: props.editRecord?.status || '待审批',
    approvalResult: props.editRecord?.approvalResult || '待审批',
    approverName: props.editRecord?.approverName || '',
    inboundStatus: props.editRecord?.inboundStatus || '未入库',
    creator: props.editRecord?.creator || 'admin1',
    createdAt: props.editRecord?.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    totalQty: form.lineItems.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0),
    amountExTax: form.lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0),
    amountInTax: form.lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0),
  }

  if (props.pageMode) {
    if (isEdit.value) {
      updatePurchaseOrder(props.editRecord.id, payload)
    } else {
      addPurchaseOrder({ ...payload, id: `po-${Date.now()}` })
    }
  } else {
    emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  }
  message.success(isEdit.value ? '采购单已更新' : '采购单已保存')
  closeAfterSave()
}
</script>

<style lang="less">
@import '@/views/inventory/components/inventoryLineTablePanel.less';
</style>

<style lang="less" scoped>
.po-form-shell {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

:deep(.ant-modal-body) .po-form-shell {
  max-height: calc(100vh - 200px);
}

:deep(.form-create-page.purchase-order-form-modal) {
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

:deep(.ant-modal.purchase-order-form-modal) {
  .ant-modal-body {
    max-height: calc(100vh - 160px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-bottom: 12px;
  }

  .form-layout {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
  }
}

.form-layout {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
}

.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #1f1f1f;
  }

  &.section-block--lines {
    flex: 1;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
  }
}

.header-form {
  flex-shrink: 0;

  :deep(.ant-form-item) {
    margin-bottom: 0;
    width: 100%;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 72px;
    align-self: flex-start;
  }
}

.line-toolbar {
  flex-shrink: 0;
  margin-bottom: 8px;

  .tax-toggle-btn {
    color: #1677ff;
    border-color: #91caff;
    background: #e6f4ff;
  }

  .tax-hint {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
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
</style>
