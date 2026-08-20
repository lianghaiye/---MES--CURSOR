<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="inbound-form-modal"
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="入库单号">
                <a-input
                  v-model:value="form.docNo"
                  size="small"
                  placeholder="不填则系统自动生成"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="入库类型" required>
                <a-select
                  v-model:value="form.inboundType"
                  size="small"
                  placeholder="请选择"
                  :options="inboundTypeOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="入库日期">
                <a-date-picker
                  v-model:value="form.inboundDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择入库日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="入库仓库">
                <a-select
                  v-model:value="form.warehouse"
                  allow-clear
                  size="small"
                  placeholder="请选择 入库仓库"
                  :options="warehouseOpts"
                  @change="onHeaderWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="供应商">
                <a-select
                  v-model:value="form.supplier"
                  allow-clear
                  show-search
                  size="small"
                  placeholder="请选择 供应商"
                  :options="supplierOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="送货日期">
                <a-date-picker
                  v-model:value="form.deliveryDate"
                  size="small"
                  style="width: 100%"
                  placeholder="请选择送货日期"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="经手人">
                <a-select
                  v-model:value="form.handler"
                  size="small"
                  show-search
                  :options="handlerOpts"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="发票号码">
                <a-input
                  v-model:value="form.invoiceNo"
                  size="small"
                  :maxlength="30"
                  show-count
                  placeholder="请输入发票号码"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item
                label="销售订单"
                :required="isFinishedOrSemiType"
                :rules="
                  isFinishedOrSemiType
                    ? [{ required: true, message: '成品/半成品入库须选择销售订单' }]
                    : undefined
                "
              >
                <a-input-group compact>
                  <a-input
                    :value="form.salesOrderNo"
                    readonly
                    size="small"
                    style="width: calc(100% - 72px)"
                    :placeholder="isFinishedOrSemiType ? '必选：关联销售订单' : '请选择销售订单'"
                  />
                  <a-button size="small" @click="salesOrderPickerOpen = true">选择</a-button>
                </a-input-group>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="合同编号">
                <a-input
                  v-model:value="form.contractNo"
                  allow-clear
                  size="small"
                  placeholder="请输入合同编号"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="form.salesOrderNo" :span="24">
              <div class="sales-order-summary">
                {{ form.salesOrderNo }} / {{ form.customerName || '-' }} /
                {{ form.salesperson || '-' }}
              </div>
            </a-col>
            <a-col v-if="isFinishedOrSemiType && dedicatedSplitPreview.length" :span="24">
              <a-alert type="info" show-icon class="split-preview-alert">
                <template #message>
                  确认入库将按销售未满足数量切开：
                  <span v-for="(p, i) in dedicatedSplitPreview" :key="p.itemCode">
                    <template v-if="i">；</template>
                    {{ p.itemCode }} 本单 {{ p.dedicatedTotal }} / 自由备货 {{ p.freeTotal }}
                  </span>
                </template>
              </a-alert>
            </a-col>
            <a-col :span="24">
              <a-form-item label="备注" class="remark-item">
                <a-textarea
                  v-model:value="form.remark"
                  :rows="2"
                  size="small"
                  :maxlength="200"
                  show-count
                  placeholder="请输入 备注"
                />
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </div>

      <div v-if="workOrderList.length" class="section-block">
        <InboundWorkOrderList :work-orders="workOrderList" />
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">入库清单</div>
        <div class="line-toolbar">
          <a-space>
            <a-button type="primary" size="small" :loading="addingItems" @click="pickerOpen = true">
              <PlusOutlined />
              添加物品
            </a-button>
            <a-button size="small" @click="bomModalOpen = true">按BOM添加</a-button>
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
              <template #headerCell="{ column }">
                <template v-if="column.key === 'stockUnitQty'">
                  <span class="col-title-with-tip">
                    库存数量
                    <a-tooltip :title="STOCK_UNIT_QTY_TIP">
                      <InfoCircleOutlined class="col-tip-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template v-else-if="column.key === 'settleQty'">
                  <span class="col-title-with-tip">
                    结算数量
                    <a-tooltip :title="SETTLE_QTY_TIP">
                      <InfoCircleOutlined class="col-tip-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template v-else>{{ column.title }}</template>
              </template>
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'lineStatus'">
                  <a-tag
                    :color="(record.lineStatus || '待入库') === '已入库' ? 'success' : 'processing'"
                  >
                    {{ record.lineStatus || '待入库' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'itemName'">
                  <span v-if="record.itemCode" class="item-name-text" :title="record.itemName">
                    {{ record.itemName || '—' }}
                  </span>
                  <span
                    v-else-if="isSpuLine(record)"
                    class="item-name-text"
                    :title="record.itemName || record.spuName"
                  >
                    {{ record.itemName || record.spuName || '—' }}
                  </span>
                  <InventoryLineItemSelect
                    v-else
                    :value="record.itemCode"
                    :fallback-name="record.itemName"
                    @select="(item) => onLineItemSelect(record, item)"
                    @clear="onLineItemClear(record)"
                  />
                </template>
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
                <template v-else-if="column.key === 'barcodeType'">
                  {{ record.barcodeType || '—' }}
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
                  <span class="unit-suffix">{{ resolveInboundStockUnit(record) }}</span>
                </template>
                <template v-else-if="column.key === 'warehouseStockQty'">
                  {{ formatQty(record.warehouseStockQty) }}
                  <span class="unit-suffix">{{ resolveInboundStockUnit(record) }}</span>
                </template>
                <template v-else-if="column.key === 'warehouse'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'warehouse')"
                    :display="lineWarehouseLabel(record.warehouse)"
                    :empty="!record.warehouse"
                    placeholder="请选择"
                    @activate="startLineCellEdit(record.id, 'warehouse', { select: true })"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-select
                        v-model:value="record.warehouse"
                        allow-clear
                        size="small"
                        placeholder="请选择"
                        style="width: 100%"
                        :open="lineCellSelectOpen"
                        :options="warehouseOpts"
                        @dropdownVisibleChange="onLineCellSelectOpenChange"
                        @change="
                          () => {
                            refreshLine(record)
                            endEdit()
                          }
                        "
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'locationNo'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'locationNo')"
                    :display="record.locationNo || '—'"
                    :empty="!record.locationNo"
                    placeholder="请输入"
                    @activate="startLineCellEdit(record.id, 'locationNo')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input
                        v-model:value="record.locationNo"
                        size="small"
                        allow-clear
                        placeholder="请输入货位号"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'qty'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'qty')"
                    :display="
                      formatQtyWithUnit(getInboundQtyValue(record), resolveInboundQtyUnit(record))
                    "
                    :empty="getInboundQtyValue(record) == null || getInboundQtyValue(record) === ''"
                    numeric
                    @activate="startLineCellEdit(record.id, 'qty')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-if="isInboundDualUnitLine(record)"
                        v-model:value="record.purchaseQty"
                        :min="1"
                        :precision="0"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                      />
                      <a-input-number
                        v-else
                        v-model:value="record.qty"
                        :min="0"
                        :precision="4"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onLineQtyChange(record)"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'stockUnitQty'">
                  <template v-if="isInboundDualUnitLine(record)">
                    <InventoryLineEditableCell
                      v-if="allowsLineTotalEntry(record)"
                      :active="isLineCellEditing(record.id, 'stockUnitQty')"
                      :display="
                        formatQtyWithUnit(
                          getStockUnitQtyValue(record),
                          resolveInboundStockUnit(record),
                        )
                      "
                      :empty="
                        getStockUnitQtyValue(record) == null || getStockUnitQtyValue(record) === ''
                      "
                      numeric
                      @activate="startLineCellEdit(record.id, 'stockUnitQty')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input-number
                          :value="getStockUnitQtyValue(record)"
                          :min="0.001"
                          :precision="4"
                          size="small"
                          style="width: 100%"
                          autofocus
                          @update:value="(v) => onLineStockUnitQtyInput(record, v)"
                          @blur="endEdit"
                          @pressEnter="endEdit"
                        />
                      </template>
                    </InventoryLineEditableCell>
                    <InventoryLineEditableCell
                      v-else
                      :active="isLineCellEditing(record.id, 'stockUnitQty')"
                      :display="
                        formatQtyWithUnit(
                          getStockUnitQtyValue(record),
                          resolveInboundStockUnit(record),
                        )
                      "
                      :empty="
                        getUniformPieceValue(record) == null || getUniformPieceValue(record) === ''
                      "
                      numeric
                      @activate="startLineCellEdit(record.id, 'stockUnitQty')"
                      @end="endLineCellEdit"
                    >
                      <template #edit="{ endEdit }">
                        <a-input-number
                          :value="getUniformPieceValue(record)"
                          :min="0.001"
                          :precision="4"
                          size="small"
                          style="width: 100%"
                          autofocus
                          placeholder="单件数量"
                          @update:value="(v) => onLineStockUnitQtyInput(record, v)"
                          @blur="endEdit"
                          @pressEnter="endEdit"
                        />
                      </template>
                    </InventoryLineEditableCell>
                  </template>
                  <span v-else class="cell-disabled">{{
                    formatQtyWithUnit(record.qty, resolveInboundStockUnit(record))
                  }}</span>
                </template>
                <template v-else-if="column.key === 'settleQty'">
                  <InventoryLineEditableCell
                    v-if="hasSettleUnit(record)"
                    :active="isLineCellEditing(record.id, 'settleQty')"
                    :display="formatQtyWithUnit(record.settleQty, record.settleUnit)"
                    :empty="record.settleQty == null || record.settleQty === ''"
                    numeric
                    @activate="startLineCellEdit(record.id, 'settleQty')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.settleQty"
                        :min="0"
                        :precision="4"
                        size="small"
                        style="width: 100%"
                        autofocus
                        placeholder="结算数量"
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onLineSettleQtyChange(record)"
                      />
                    </template>
                  </InventoryLineEditableCell>
                  <span v-else class="cell-disabled">—</span>
                </template>
                <template v-else-if="column.key === 'unitPrice'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'unitPrice')"
                    :display="formatMoney(record.unitPrice)"
                    :empty="record.unitPrice == null || record.unitPrice === ''"
                    numeric
                    @activate="startLineCellEdit(record.id, 'unitPrice')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.unitPrice"
                        :min="0"
                        :precision="2"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onLineUnitPriceChange(record)"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'totalPrice'">
                  {{ formatMoney(record.totalPrice) }}
                </template>
                <template v-else-if="column.key === 'actions'">
                  <a-space :size="4">
                    <a
                      v-if="(record.lineStatus || '待入库') !== '已入库'"
                      @click="handleConfirmLineInbound(record)"
                    >
                      确认入库
                    </a>
                    <a
                      v-if="(record.lineStatus || '待入库') !== '已入库'"
                      @click="openLineEdit(record, 'edit')"
                    >
                      编辑
                    </a>
                    <a
                      v-if="(record.lineStatus || '待入库') !== '已入库'"
                      @click="openLineEdit(record, 'copy')"
                    >
                      复制
                    </a>
                    <a
                      v-if="(record.lineStatus || '待入库') !== '已入库'"
                      class="danger-link"
                      @click="removeLine(record.id)"
                    >
                      删除
                    </a>
                    <span v-else class="muted-text">已入库</span>
                  </a-space>
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
              <template v-else-if="column.key === 'itemCode'"
                >项数 {{ lineSummary.lineCount }}</template
              >
              <template v-else-if="column.key === 'qty'">{{
                formatQty(lineSummary.qtyTotal)
              }}</template>
              <template v-else-if="column.key === 'stockUnitQty'">{{
                formatQty(lineSummary.stockUnitQtyTotal)
              }}</template>
              <template v-else-if="column.key === 'totalPrice'">{{
                formatMoney(lineSummary.totalPrice)
              }}</template>
            </template>
          </InventoryLineTableFooter>
        </div>
      </div>
    </div>

    <template #footer>
      <a-button @click="onShellCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-if="isActive"
    v-model:open="pickerOpen"
    title="选择产品"
    hide-add-material
    :include-spu-templates="true"
    :spu-can-sell-only="false"
    @selected="onSalesProductsSelected"
  />

  <ConfigureSalesSpuVariantModal
    v-model:open="variantConfigOpen"
    :spu-id="variantConfigSpuId"
    :initial-variant-values="variantConfigInitialValues"
    confirm-text="确定"
    @confirm="onVariantConfigConfirm"
  />

  <AddByBomModal
    v-if="isActive"
    v-model:open="bomModalOpen"
    own-active-only
    qty-label="入库数量"
    qty-hint="子项入库数量 = 入库数量 × 子件原单位用量"
    preview-tip="确定后将添加所选物品自有生效 BOM 的下级结构"
    modal-width="720px"
    @confirm="onBomAdded"
  />

  <InboundLineEditModal
    v-if="isActive"
    v-model:open="lineEditOpen"
    :line="lineEditTarget"
    :mode="lineEditMode"
    @confirm="onLineEditConfirm"
  />

  <TableColumnSettingDrawer
    v-model:open="columnDrawerOpen"
    v-model:settings="columnSettings"
    :default-settings="defaultColumnSettings"
    title="入库明细列设置"
  />

  <SalesOrderSelectModal v-model:open="salesOrderPickerOpen" @confirm="onSalesOrderPicked" />
</template>

<script setup>
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, InfoCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { useInventoryLineTableScroll } from '@/composables/useInventoryLineTableScroll'
import { useInventoryLineCellEdit } from '@/composables/useInventoryLineCellEdit'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import ConfigureSalesSpuVariantModal from '@/views/sales/components/ConfigureSalesSpuVariantModal.vue'
import AddByBomModal from '@/views/product-process/components/AddByBomModal.vue'
import InboundLineEditModal from './InboundLineEditModal.vue'
import InventoryLineItemSelect from './InventoryLineItemSelect.vue'
import InventoryLineEditableCell from './InventoryLineEditableCell.vue'
import InventoryLineTableFooter from './InventoryLineTableFooter.vue'
import { inboundTypeOptions, handlerOptions } from '@/mock/inboundOptions'
import { supplierOptions } from '@/mock/purchaseRequisitionOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  addInboundOrder,
  updateInboundOrder,
  resolveWarehouseKeeper,
  confirmInboundLine,
  getInboundOrderById,
} from '@/store/inboundOrderStore'
import {
  inboundFormLineColumns,
  STOCK_UNIT_QTY_TIP,
  SETTLE_QTY_TIP,
} from '@/utils/inboundLineColumns'
import { normalizeInventoryPickerItem } from '@/utils/inventoryLineItemPicker'
import { warehouseOptionLabel } from '@/utils/inventoryFormLineDisplay'
import {
  applyPickerItemToInboundLine,
  buildInboundLineFromPickerItem,
  buildInboundLinesFromBom,
  cloneInboundLine,
  createBlankInboundLine,
  enrichInboundLine,
  getInboundQtyValue,
  getStockUnitQtyValue,
  getUniformPieceValue,
  isInboundDualUnitLine,
  mergeInboundLines,
  resolveInboundQtyUnit,
  resolveInboundStockUnit,
  syncInboundLineTotalFromUnit,
} from '@/utils/inboundLineHelpers'
import { hasSettleUnit } from '@/utils/settleUnit'
import { createInboundLine } from '@/mock/inboundOrders'
import {
  INBOUND_ENTRY_MODE,
  allowsInboundTotalEntry,
  isOneItemOneCodeBarcode,
} from '@/utils/variableLengthMaterial'
import { useSpuVariantConfig } from '@/composables/useSpuVariantConfig'
import {
  createInventorySpuLineDraft,
  isSpuLine,
  lineVariantSummary,
  applyResolvedSkuToInventoryLine,
  validateLinesSkuResolved,
} from '@/utils/spuLineResolve'
import SalesOrderSelectModal from '@/views/production/components/SalesOrderSelectModal.vue'
import { findSalesOrderByOrderNo, getSalesOrderById } from '@/store/salesOrderStore'
import InboundWorkOrderList from './InboundWorkOrderList.vue'
import { resolveInboundWorkOrders } from '@/utils/inboundWorkOrders'
import {
  findSalesOrderByNoOrId,
  previewInboundDedicatedSplit,
} from '@/utils/salesOrderDedicatedStock'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))

const workOrderList = computed(() => {
  const orderLike = {
    ...(props.editRecord || {}),
    inboundType: form.inboundType,
    workOrders: form.workOrders,
    sourceOrderNo: props.editRecord?.sourceOrderNo,
    sourceType: props.editRecord?.sourceType,
    lineItems: form.lineItems,
  }
  return resolveInboundWorkOrders(orderLike)
})

const {
  isActive,
  shellTitle,
  handleCancel: onShellCancel,
  closeAfterSave,
} = useFormCreateModal(props, emit, {
  listPath: '/inventory/inbound',
  getTitle: () => (isEdit.value ? '编辑入库单' : '新增入库单'),
})

const saving = ref(false)
const addingItems = ref(false)
const pickerOpen = ref(false)
const bomModalOpen = ref(false)
const {
  variantConfigOpen,
  variantConfigSpuId,
  variantConfigInitialValues,
  variantConfigTargetLine,
  openVariantConfig,
  lineVariantDisplay,
} = useSpuVariantConfig()
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditMode = ref('edit')
const lineEditSourceId = ref(null)
const prevHeaderWarehouse = ref(undefined)
const salesOrderPickerOpen = ref(false)

const inboundTypeOpts = inboundTypeOptions.map((v) => ({ label: v, value: v }))
const handlerOpts = handlerOptions.map((v) => ({ label: v, value: v }))
const supplierOpts = supplierOptions

const isFinishedOrSemiType = computed(
  () => form.inboundType === '成品入库' || form.inboundType === '半成品入库',
)

function linePieceValuesForPreview(line) {
  if (line.isVariableLength || (line.pieceValues || line.pieceLengths || []).length) {
    const pv = line.pieceValues?.length
      ? line.pieceValues
      : line.pieceWeights?.length
        ? line.pieceWeights
        : line.pieceLengths
    return (pv || []).map(Number).filter((v) => v > 0)
  }
  const qty = Number(line.qty ?? line.stockQty ?? line.purchaseQty) || 0
  if (!(qty > 0)) return []
  if (isOneItemOneCodeBarcode(line.barcodeType)) {
    const n = Math.max(1, Math.round(qty))
    return Array.from({ length: n }, () => 1)
  }
  return [qty]
}

const dedicatedSplitPreview = computed(() => {
  if (!isFinishedOrSemiType.value || !form.salesOrderNo) return []
  return (form.lineItems || [])
    .filter((l) => l.itemCode)
    .map((l) => {
      const pieceValues = linePieceValuesForPreview(l)
      if (!pieceValues.length) return null
      const split = previewInboundDedicatedSplit({
        salesOrderId: form.salesOrderId,
        salesOrderNo: form.salesOrderNo,
        itemCode: l.itemCode,
        pieceValues,
        preferredSalesLineId: l.salesLineId || '',
      })
      return {
        itemCode: l.itemCode,
        dedicatedTotal: split.dedicatedTotal,
        freeTotal: split.freeTotal,
      }
    })
    .filter(Boolean)
})

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

function lineWarehouseLabel(value) {
  return warehouseOptionLabel(value, warehouseOpts.value)
}

const {
  selectOpen: lineCellSelectOpen,
  isEditing: isLineCellEditing,
  startEdit: startLineCellEdit,
  endEdit: endLineCellEdit,
  onSelectOpenChange: onLineCellSelectOpenChange,
} = useInventoryLineCellEdit()

const form = reactive({
  docNo: '',
  inboundType: '其他入库',
  warehouse: undefined,
  inboundDate: dayjs(),
  supplier: undefined,
  deliveryDate: undefined,
  handler: 'admin1',
  invoiceNo: '',
  salesOrderId: '',
  salesOrderNo: '',
  customerName: '',
  salesperson: '',
  contractNo: '',
  remark: '',
  workOrders: [],
  lineItems: [],
})

const { columnSettings, columnDrawerOpen, displayColumns, tableScrollX, defaultColumnSettings } =
  useTableColumnSettings('inbound-form-lines-v9', inboundFormLineColumns, {
    minScrollX: 2150,
    pinEdgeColumns: false,
    pinActionColumn: true,
  })

const lineScrollX = tableScrollX

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((l) => l.itemCode)
  const qtyTotal = lines.reduce((sum, line) => sum + (Number(getInboundQtyValue(line)) || 0), 0)
  const stockUnitQtyTotal = lines.reduce(
    (sum, line) => sum + (Number(getStockUnitQtyValue(line)) || 0),
    0,
  )
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    qtyTotal: Math.round(qtyTotal * 1000) / 1000,
    stockUnitQtyTotal: Math.round(stockUnitQtyTotal * 1000) / 1000,
    totalPrice: Math.round(totalPrice * 100) / 100,
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
    if (props.editRecord) loadEditForm(props.editRecord)
    else resetForm()
  },
  { immediate: true },
)

function syncSalesOrderMeta(orderNo, orderId) {
  const order = (orderId && getSalesOrderById(orderId)) || findSalesOrderByOrderNo(orderNo) || null
  form.customerName = order?.customerName || ''
  form.salesperson = order?.salesperson || ''
}

function onSalesOrderPicked(order) {
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo
  form.customerName = order.customerName || ''
  form.salesperson = order.salesperson || ''
  if (!form.contractNo?.trim() && order.contractNo) {
    form.contractNo = order.contractNo
  }
  // 明细按物料编码匹配销售行（同编码取首个未填行）
  const used = new Set()
  ;(form.lineItems || []).forEach((line) => {
    if (!line.itemCode) return
    const hit = (order.lineItems || []).find(
      (sl) =>
        String(sl.productCode || '').trim() === String(line.itemCode).trim() && !used.has(sl.id),
    )
    if (hit) {
      used.add(hit.id)
      line.salesLineId = hit.id
      line.salesOrderNo = order.orderNo
      line.salesOrderId = order.id
    }
  })
}

function resetForm() {
  endLineCellEdit()
  Object.assign(form, {
    docNo: '',
    inboundType: '其他入库',
    warehouse: undefined,
    inboundDate: dayjs(),
    supplier: undefined,
    deliveryDate: undefined,
    handler: 'admin1',
    invoiceNo: '',
    salesOrderId: '',
    salesOrderNo: '',
    customerName: '',
    salesperson: '',
    contractNo: '',
    remark: '',
    workOrders: [],
    lineItems: [],
  })
  prevHeaderWarehouse.value = undefined
}

function loadEditForm(record) {
  endLineCellEdit()
  prevHeaderWarehouse.value = record.warehouse || undefined
  Object.assign(form, {
    docNo: record.docNo,
    inboundType: record.inboundType,
    warehouse: record.warehouse || undefined,
    inboundDate: record.inboundDate ? dayjs(record.inboundDate) : dayjs(),
    supplier: record.supplier,
    deliveryDate: record.deliveryDate ? dayjs(record.deliveryDate) : undefined,
    handler: record.handler || 'admin1',
    invoiceNo: record.invoiceNo || '',
    salesOrderId: record.salesOrderId || '',
    salesOrderNo: record.salesOrderNo || '',
    customerName: record.customerName || '',
    salesperson: record.salesperson || '',
    contractNo: record.contractNo || '',
    remark: record.remark || '',
    workOrders: Array.isArray(record.workOrders) ? [...record.workOrders] : [],
    lineItems: (record.lineItems || []).map((l) =>
      enrichInboundLine({ ...l, lineStatus: l.lineStatus || '待入库' }),
    ),
  })
  if (!form.workOrders.length) {
    form.workOrders = resolveInboundWorkOrders(record)
  }
  if (form.salesOrderNo && (!form.customerName || !form.salesperson)) {
    syncSalesOrderMeta(form.salesOrderNo, form.salesOrderId)
  }
}

function handleConfirmLineInbound(record) {
  if (!isEdit.value || !props.editRecord?.id) {
    message.warning('请先保存入库单后再确认入库')
    return
  }
  if ((record.lineStatus || '待入库') === '已入库') {
    message.info('该明细已入库')
    return
  }
  const payload = buildPayload()
  const saved = updateInboundOrder(props.editRecord.id, payload)
  if (saved && !saved.ok) {
    message.warning(saved.message || '保存失败，无法确认入库')
    return
  }
  const res = confirmInboundLine(props.editRecord.id, record.id)
  if (!res.ok) {
    message.warning(res.message || '确认入库失败')
    return
  }
  message.success(
    res.order?.status === '已完成'
      ? '明细已入库，入库单已全部完成'
      : '明细已入库，入库单状态：部分入库',
  )
  const latest = getInboundOrderById(props.editRecord.id)
  if (latest) loadEditForm(latest)
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function refreshLine(line) {
  Object.assign(line, enrichInboundLine(line))
}

function onLineQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function allowsLineTotalEntry(line) {
  return allowsInboundTotalEntry(line?.barcodeType)
}

function isOneItemOneCodeLine(line) {
  return isOneItemOneCodeBarcode(line?.barcodeType)
}

function onLineStockUnitQtyInput(line, value) {
  if (allowsLineTotalEntry(line)) {
    line.inboundEntryMode = INBOUND_ENTRY_MODE.TOTAL
    line.totalValue = value
    line.qty = value
    line.uniformValue = undefined
    syncInboundLineTotalFromUnit(line)
    return
  }
  // 一物一码：列表按「统一单件数量」填写
  line.inboundEntryMode = INBOUND_ENTRY_MODE.UNIFORM
  line.uniformValue = value
  line.totalValue = undefined
  const n = Number(line.purchaseQty) || 0
  const per = Number(value) || 0
  line.qty = n > 0 && per > 0 ? Math.round(n * per * 10000) / 10000 : null
  syncInboundLineTotalFromUnit(line)
}

function onLineUnitPriceChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onLineSettleQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal
  prevHeaderWarehouse.value = newVal

  if (!changed || !newVal || !form.lineItems.length) return

  Modal.confirm({
    title: '入库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      form.lineItems.forEach((line) => {
        line.warehouse = newVal
        refreshLine(line)
      })
    },
  })
}

function onSalesProductsSelected(rows) {
  const list = Array.isArray(rows) ? rows : [rows]
  const skuRows = list.filter((r) => r.pickType !== 'spu')
  const spuRows = list.filter((r) => r.pickType === 'spu')
  if (skuRows.length) onItemsPicked(skuRows)
  if (spuRows.length) onSpuDraftSelected(spuRows)
}

function onSpuDraftSelected(rows) {
  let added = 0
  rows.forEach((payload) => {
    const spuId = payload.spuId || payload.id
    if (!spuId) return
    const dup = form.lineItems.some(
      (line) => isSpuLine(line) && line.spuId === spuId && !line.itemId && !line.productId,
    )
    if (dup) return
    const draft = createInventorySpuLineDraft(payload)
    form.lineItems.push(
      enrichInboundLine(
        createInboundLine({
          ...draft,
          qty: 1,
          warehouse: form.warehouse || '',
        }),
      ),
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
    (line) => line.id !== target.id && line.itemCode === resolved.productCode,
  )
  if (dupSku) {
    message.warning(`产品编码「${resolved.productCode}」已在明细中`)
    return
  }
  applyResolvedSkuToInventoryLine(target, resolved)
  target.variantValues = { ...(variantValues || resolved.variantValues || {}) }
  target.variantSummary = lineVariantSummary(target)
  Object.assign(target, enrichInboundLine(target))
  message.success('变体已配置')
}

function onItemsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  if (!list.length) {
    message.warning('未选择物品')
    return
  }
  addingItems.value = true
  pickerOpen.value = false
  nextTick(() => {
    try {
      const before = form.lineItems.length
      const incoming = list
        .filter((it) => it?.code)
        .map((it) =>
          buildInboundLineFromPickerItem(normalizeInventoryPickerItem(it), form.warehouse || ''),
        )
      if (!incoming.length) {
        message.warning('所选物品无效，请重新选择')
        return
      }
      form.lineItems = mergeInboundLines(form.lineItems, incoming)
      const added = form.lineItems.length - before
      if (added > 0) message.success(`已添加 ${added} 条明细`)
      else message.info('所选物品已在明细中')
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  form.lineItems.push(createBlankInboundLine(form.warehouse || ''))
}

function onLineItemSelect(record, item) {
  if (item?.pickType === 'spu') {
    const spuId = item.spuId || item.id
    if (!spuId) return
    const dup = form.lineItems.some(
      (line) =>
        line.id !== record.id &&
        isSpuLine(line) &&
        line.spuId === spuId &&
        !line.itemId &&
        !line.productId,
    )
    if (dup) {
      message.warning('该产品族已在明细中（待配置变体）')
      return
    }
    const draft = createInventorySpuLineDraft(item)
    Object.assign(
      record,
      enrichInboundLine(
        createInboundLine({
          ...draft,
          id: record.id,
          qty: record.qty ?? 1,
          warehouse: record.warehouse || form.warehouse || '',
        }),
      ),
    )
    return
  }
  if (!item?.code) return
  const duplicate = form.lineItems.find((l) => l.id !== record.id && l.itemCode === item.code)
  if (duplicate) {
    message.warning('该物品已在明细中')
    return
  }
  Object.assign(record, applyPickerItemToInboundLine(record, item, form.warehouse || ''))
}

function onLineItemClear(record) {
  record.itemCode = ''
  record.itemName = ''
  record.itemId = ''
  record.itemType = ''
  record.specAttr = ''
  record.specModel = ''
  record.material = ''
  record.drawingNo = ''
  record.stockQty = null
  record.warehouseStockQty = null
}

function onBomAdded({ pickerRow, usageCoefficient }) {
  const incoming = buildInboundLinesFromBom(
    pickerRow,
    usageCoefficient,
    form.warehouse || '',
    false,
  )
  if (!incoming.length) {
    message.warning('该物品无自有生效 BOM 明细，请先维护 SKU 产品 BOM')
    return
  }
  form.lineItems = mergeInboundLines(form.lineItems, incoming)
  message.success(`已添加 ${incoming.length} 条明细`)
}

function openLineEdit(record, mode) {
  lineEditSourceId.value = record.id
  lineEditTarget.value = { ...record }
  lineEditMode.value = mode
  lineEditOpen.value = true
}

function onLineEditConfirm(updated) {
  const enriched = enrichInboundLine(updated)
  if (lineEditMode.value === 'copy') {
    form.lineItems.push(cloneInboundLine(enriched))
    return
  }
  const idx = form.lineItems.findIndex((l) => l.id === lineEditSourceId.value)
  if (idx !== -1) form.lineItems[idx] = { ...form.lineItems[idx], ...enriched }
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
}

function buildPayload() {
  return {
    docNo: form.docNo?.trim(),
    inboundType: form.inboundType,
    warehouse: form.warehouse || '',
    warehouseKeeper: resolveWarehouseKeeper(form.warehouse),
    inboundDate: form.inboundDate?.format?.('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
    deliveryDate: form.deliveryDate?.format?.('YYYY-MM-DD') || '',
    supplier: form.supplier,
    handler: form.handler,
    invoiceNo: form.invoiceNo?.trim(),
    salesOrderNo: form.salesOrderNo?.trim() || '',
    salesOrderId: form.salesOrderId || '',
    contractNo: form.contractNo?.trim() || '',
    customerName: form.customerName || '',
    remark: form.remark?.trim(),
    workOrders: form.workOrders || [],
    lineItems: form.lineItems.filter((l) => l.itemCode).map((l) => enrichInboundLine({ ...l })),
  }
}

function handleSave() {
  if (!form.inboundType) {
    message.warning('请选择入库类型')
    return
  }
  if (isFinishedOrSemiType.value && !String(form.salesOrderNo || '').trim()) {
    message.warning('成品/半成品入库须选择销售订单')
    return
  }
  if (isFinishedOrSemiType.value) {
    const so = findSalesOrderByNoOrId({
      salesOrderId: form.salesOrderId,
      salesOrderNo: form.salesOrderNo,
    })
    if (!so) {
      message.warning('销售订单无法解析，请重新选择')
      return
    }
  }

  const skuCheck = validateLinesSkuResolved(form.lineItems)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return
  }

  const validLines = form.lineItems.filter((l) => l.itemCode)
  if (!validLines.length) {
    message.warning('请至少添加一条有效明细')
    return
  }

  const invalidDual = validLines.find((line) => {
    if (!isInboundDualUnitLine(line)) return false
    if (allowsInboundTotalEntry(line.barcodeType)) {
      return !(Number(line.purchaseQty) > 0) || !(Number(getStockUnitQtyValue(line)) > 0)
    }
    // 一物一码：须已按件展开（pieceValues / pieceLengths）或统一单件
    const mode = line.inboundEntryMode
    if (mode === INBOUND_ENTRY_MODE.TOTAL) return true
    if (!(Number(line.purchaseQty) > 0)) return true
    if (mode === INBOUND_ENTRY_MODE.UNIFORM) {
      return !(Number(line.uniformValue ?? line.uniformLength ?? line.uniformWeight) > 0)
    }
    const pieces = line.pieceValues || line.pieceLengths || []
    return !pieces.length || pieces.some((v) => !(Number(v) > 0))
  })
  if (invalidDual) {
    message.warning(
      isOneItemOneCodeLine(invalidDual)
        ? `一物一码「${invalidDual.itemName}」请填写统一单件数量（库存单位量），或点编辑改逐件`
        : `双物料单位「${invalidDual.itemName}」请填写入库数量与库存单位量`,
    )
    return
  }

  saving.value = true
  const payload = buildPayload()

  if (isEdit.value) {
    const res = updateInboundOrder(props.editRecord.id, payload)
    saving.value = false
    if (!res.ok) {
      message.warning(res.message)
      return
    }
    message.success('入库单已更新')
  } else {
    addInboundOrder(payload)
    saving.value = false
    message.success('入库单已创建')
  }

  emit('saved')
  closeAfterSave()
}
</script>

<style lang="less">
@import '@/views/inventory/components/inventoryLineTablePanel.less';
</style>

<style lang="less" scoped>
:deep(.form-create-page.inbound-form-modal) {
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
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
}

:deep(.ant-modal.inbound-form-modal) {
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

.item-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
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

.sales-order-summary {
  margin: -4px 0 8px;
  padding: 6px 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  background: #fafafa;
  border-radius: 4px;
}

.split-preview-alert {
  margin-bottom: 8px;
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}

.unit-suffix {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.cell-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.danger-link {
  color: #ff4d4f;
}

.muted-text {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
