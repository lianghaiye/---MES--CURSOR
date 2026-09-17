<template>
  <FormCreateShell
    :page-mode="pageMode"
    :embedded="embedded"
    :content-only="contentOnly"
    :open="open"
    :title="shellTitle"
    width="1400px"
    class="outbound-form-modal"
    :class="{ 'is-embedded': embedded }"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <div class="section-block modal-basic-card">
        <div class="section-title">基本信息</div>
        <a-form :model="form" layout="inline" class="header-form horizontal-form">
          <a-row :gutter="[12, 12]" style="width: 100%">
            <a-col :span="8">
              <a-form-item label="出库单号" required>
                <a-input
                  v-model:value="form.docNo"
                  size="small"
                  placeholder="请输入出库单号"
                  :disabled="isEdit"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库类型" required>
                <a-select
                  v-model:value="form.outboundType"
                  size="small"
                  placeholder="请选择 出库类型"
                  :options="outboundTypeOpts"
                  :disabled="lockOutboundType"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库时间">
                <a-date-picker
                  v-model:value="form.outboundTime"
                  show-time
                  size="small"
                  format="YYYY-MM-DD HH:mm:ss"
                  value-format="YYYY-MM-DD HH:mm:ss"
                  style="width: 100%"
                  placeholder="请选择出库时间"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库仓库">
                <a-select
                  v-model:value="form.warehouse"
                  allow-clear
                  size="small"
                  placeholder="请选择 出库仓库"
                  :options="warehouseOpts"
                  @change="onHeaderWarehouseChange"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="showReceiveWarehouse" :span="8">
              <a-form-item label="领入仓库">
                <a-select
                  v-model:value="form.receiveWarehouse"
                  allow-clear
                  size="small"
                  placeholder="线边仓（确认后从出库仓调入）"
                  :options="receiveWarehouseOpts"
                  :disabled="lockReceiveWarehouse"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="!isSalesOutbound" :span="8">
              <a-form-item label="申请部门">
                <a-select
                  v-model:value="form.requisitionDept"
                  allow-clear
                  size="small"
                  placeholder="请选择 申请部门"
                  :options="requisitionDeptOpts"
                  :disabled="lockRequisitionDept"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="出库总重量(kg)">
                <a-input-number
                  v-model:value="form.totalWeight"
                  :min="0"
                  :precision="3"
                  size="small"
                  style="width: 100%"
                  @change="onTotalWeightManual"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="销售订单">
                <a-input-group compact>
                  <a-input
                    :value="form.salesOrderNo"
                    readonly
                    size="small"
                    :style="{ width: lockSalesOrder ? '100%' : 'calc(100% - 72px)' }"
                    placeholder="请选择销售订单"
                  />
                  <a-button
                    v-if="!lockSalesOrder"
                    size="small"
                    @click="salesOrderPickerOpen = true"
                  >
                    选择
                  </a-button>
                </a-input-group>
              </a-form-item>
            </a-col>
            <a-col v-if="!isSalesOutbound" :span="8">
              <a-form-item label="合同编号">
                <a-input
                  v-model:value="form.contractNo"
                  allow-clear
                  size="small"
                  placeholder="请输入合同编号"
                />
              </a-form-item>
            </a-col>
            <a-col v-if="isSalesOutbound && form.salesOrderNo" :span="24">
              <div class="sales-order-summary">
                <span>客户名称：{{ form.customerName || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>合同编号：{{ form.contractNo || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>交货方式：{{ form.deliveryMethod || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>业务员：{{ form.salesperson || '—' }}</span>
              </div>
            </a-col>
            <a-col v-else-if="form.salesOrderNo" :span="24">
              <div class="sales-order-summary">
                <span>客户名称：{{ form.customerName || '—' }}</span>
                <span class="summary-sep">/</span>
                <span>业务员：{{ form.salesperson || '—' }}</span>
              </div>
            </a-col>
            <a-col v-if="isFromDelivery" :span="24">
              <a-form-item label="发货备注" class="remark-item">
                <a-textarea
                  :value="form.deliveryRemark"
                  :rows="2"
                  size="small"
                  disabled
                  placeholder="—"
                />
              </a-form-item>
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
        <OutboundWorkOrderList :work-orders="workOrderList" />
      </div>

      <div v-if="outsourcingOrderList.length" class="section-block">
        <OutboundOutsourcingOrderList :outsourcing-orders="outsourcingOrderList" />
      </div>

      <div class="section-block section-block--lines">
        <div class="section-title">出库清单</div>
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
                <template v-if="column.key === 'batchPick'">
                  <span class="col-title-with-tip">
                    拣选批次
                    <a-tooltip :title="batchPickTip">
                      <InfoCircleOutlined class="col-tip-icon" />
                    </a-tooltip>
                  </span>
                </template>
                <template v-else>{{ column.title }}</template>
              </template>
              <template #bodyCell="{ column, record, index }">
                <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                <template v-else-if="column.key === 'lineStatus'">
                  <a-tag :color="lineStatusColor(record.lineStatus)">
                    {{ record.lineStatus || '待出库' }}
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
                <template v-else-if="column.key === 'blankSizeText'">
                  <template v-if="record.blankSizeText">
                    {{ record.blankSizeText }}
                    <div v-if="record.blankArea > 0" class="blank-size-hint">
                      ≈ {{ formatQty(record.blankArea) }}㎡/件
                    </div>
                    <div v-else-if="record.blankLength > 0" class="blank-size-hint">
                      ≈ {{ formatQty(record.blankLength) }}米/件
                    </div>
                  </template>
                  <span v-else>—</span>
                </template>
                <template v-else-if="column.key === 'availableStockQty'">
                  {{ formatQty(record.availableStockQty) }}
                  <span class="unit-suffix">{{ resolveOutboundStockUnit(record) }}</span>
                </template>
                <template v-else-if="column.key === 'warehouseStockQty'">
                  {{ formatQty(record.warehouseStockQty) }}
                  <span class="unit-suffix">{{ resolveOutboundStockUnit(record) }}</span>
                </template>
                <template v-else-if="column.key === 'shipWarehouse'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'shipWarehouse')"
                    :display="lineWarehouseLabel(record.shipWarehouse)"
                    :empty="!record.shipWarehouse"
                    placeholder="请选择"
                    @activate="startLineCellEdit(record.id, 'shipWarehouse', { select: true })"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-select
                        v-model:value="record.shipWarehouse"
                        allow-clear
                        size="small"
                        placeholder="请选择"
                        style="width: 100%"
                        :open="lineCellSelectOpen"
                        :options="warehouseOpts"
                        @dropdownVisibleChange="onLineCellSelectOpenChange"
                        @change="
                          () => {
                            onLineWarehouseChange(record)
                            endEdit()
                          }
                        "
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'locationNo'">
                  {{ record.locationNo || '—' }}
                </template>
                <template v-else-if="column.key === 'shipQty'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'shipQty')"
                    :display="formatQtyWithUnit(record.shipQty, resolveOutboundStockUnit(record))"
                    :empty="record.shipQty == null || record.shipQty === ''"
                    editable
                    placeholder="填写数量"
                    numeric
                    @activate="startLineCellEdit(record.id, 'shipQty')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.shipQty"
                        :min="0"
                        :precision="4"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="() => onShipQtyCellChange(record)"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'weight'">
                  <InventoryLineEditableCell
                    :active="isLineCellEditing(record.id, 'weight')"
                    :display="formatQty(record.weight)"
                    :empty="record.weight == null || record.weight === ''"
                    editable
                    placeholder="填写重量"
                    numeric
                    @activate="startLineCellEdit(record.id, 'weight')"
                    @end="endLineCellEdit"
                  >
                    <template #edit="{ endEdit }">
                      <a-input-number
                        v-model:value="record.weight"
                        :min="0"
                        :precision="3"
                        size="small"
                        style="width: 100%"
                        autofocus
                        @blur="endEdit"
                        @pressEnter="endEdit"
                        @change="onLineWeightChange"
                      />
                    </template>
                  </InventoryLineEditableCell>
                </template>
                <template v-else-if="column.key === 'batchPick'">
                  <template v-if="canOutboundBatchPick(record)">
                    <template v-if="isRecordManualPick(record)">
                      <a-select
                        :value="manualBatchIds(record)"
                        mode="multiple"
                        allow-clear
                        size="small"
                        show-search
                        :filter-option="filterBatchOption"
                        placeholder="搜索并多选批次"
                        style="width: 100%"
                        :options="batchOptionsFor(record)"
                        :max-tag-count="2"
                        @change="(v) => onMultiPickBatches(record, v)"
                      />
                      <div class="batch-pick-actions">
                        <a @click="openBatchSearch(record)">搜索更多</a>
                        <a @click="restoreAutoBatchPick(record)">恢复自动</a>
                      </div>
                      <div v-if="manualBatchSummary(record)" class="batch-alloc-summary">
                        {{ manualBatchSummary(record) }}
                      </div>
                    </template>
                    <div v-else class="batch-pick-auto">
                      <a-tooltip :title="autoAllocPreview(record)">
                        <span class="cell-auto-batch">{{ autoAllocPreview(record) }}</span>
                      </a-tooltip>
                      <a class="manual-pick-link" @click="enableManualBatchPick(record)"
                        >自主拣选</a
                      >
                    </div>
                  </template>
                  <span v-else class="cell-disabled">—</span>
                </template>
                <template v-else-if="column.key === 'barcodeType'">
                  {{ record.barcodeType || '—' }}
                </template>
                <template v-else-if="column.key === 'packagingForm'">
                  <span :title="record.packagingForm || ''">{{ record.packagingForm || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'deliveryRemark'">
                  <a-tooltip v-if="record.deliveryRemark" :title="record.deliveryRemark">
                    <span class="delivery-remark-cell">{{ record.deliveryRemark }}</span>
                  </a-tooltip>
                  <span v-else>—</span>
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
                  <a-space :size="8" class="line-actions">
                    <a
                      v-if="isLinePendingOutbound(record)"
                      @click="handleConfirmLineOutbound(record)"
                    >
                      确认
                    </a>
                    <a
                      v-if="canRefuseLine(record)"
                      class="danger-link"
                      @click="openRefuseLine(record)"
                    >
                      拒绝
                    </a>
                    <a v-if="isLinePendingOutbound(record)" @click="openLineEdit(record, 'edit')">
                      编辑
                    </a>
                    <a-tooltip v-if="isLinePendingOutbound(record)" title="复制">
                      <a class="line-action-icon" @click="openLineEdit(record, 'copy')">
                        <CopyOutlined />
                      </a>
                    </a-tooltip>
                    <a-tooltip
                      v-if="canRemoveOutboundLine && isLinePendingOutbound(record)"
                      title="删除"
                    >
                      <a class="line-action-icon danger-link" @click="removeLine(record.id)">
                        <DeleteOutlined />
                      </a>
                    </a-tooltip>
                    <span
                      v-else-if="(record.lineStatus || '待出库') === '已出库'"
                      class="muted-text"
                    >
                      已出库
                    </span>
                    <span
                      v-else-if="(record.lineStatus || '待出库') === '已拒绝'"
                      class="muted-text"
                    >
                      已拒绝
                    </span>
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
              <template v-else-if="column.key === 'shipQty'">
                {{ formatQty(lineSummary.shipQtyTotal) }}
              </template>
              <template v-else-if="column.key === 'weight'">
                {{ formatQty(lineSummary.weightTotal) }}
              </template>
              <template v-else-if="column.key === 'totalPrice'">
                {{ formatMoney(lineSummary.totalPrice) }}
              </template>
            </template>
          </InventoryLineTableFooter>
        </div>
      </div>
    </div>

    <template #header-extra>
      <template v-if="embedded && editRecord">
        <a-tag :color="outboundStatusColor(editRecord.status)">{{ editRecord.status }}</a-tag>
        <a-tag>{{ outboundSourceLabel(editRecord.sourceChannel) }}</a-tag>
      </template>
    </template>

    <template #footer>
      <template v-if="embedded && !contentOnly">
        <a-button type="link" size="small" class="header-print-btn" @click="emit('print')">
          <PrinterOutlined />
          打印
        </a-button>
        <a-button v-if="canConfirmEmbedded" type="primary" size="small" @click="emit('confirm')">
          确认出库
        </a-button>
        <a-button v-if="canRefuseEmbedded" size="small" danger @click="emit('refuse')">
          拒绝出库
        </a-button>
        <a-button v-if="canDeleteEmbedded" size="small" danger @click="emit('delete')">
          删除
        </a-button>
        <a-button size="small" @click="emit('open-full')">打开详情</a-button>
      </template>
      <a-button v-if="!embedded" @click="handleCancel">取消</a-button>
      <a-button :size="embedded ? 'small' : 'middle'" :loading="saving" @click="handleSave">
        保存
      </a-button>
      <a-button
        v-if="canSaveAndConfirm"
        type="primary"
        :size="embedded ? 'small' : 'middle'"
        :loading="saving"
        @click="handleSaveAndConfirm"
      >
        <CheckOutlined />
        保存并出库
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
    qty-label="出库数量"
    qty-hint="子项出库数量 = 出库数量 × 子件原单位用量"
    preview-tip="确定后将添加所选物品自有生效 BOM 的下级结构"
    modal-width="720px"
    @confirm="onBomAdded"
  />

  <OutboundLineEditModal
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
    title="出库明细列设置"
  />

  <SalesOrderSelectModal v-model:open="salesOrderPickerOpen" @confirm="onSalesOrderPicked" />

  <OutboundBatchSearchModal
    v-model:open="batchSearchOpen"
    :warehouse="batchSearchTarget?.shipWarehouse || form.warehouse || ''"
    :item-code="batchSearchTarget?.itemCode || ''"
    :item-name="batchSearchTarget?.itemName || ''"
    :unit-label="batchSearchTarget ? resolveOutboundStockUnit(batchSearchTarget) : ''"
    :selected-ids="batchSearchTarget ? manualBatchIds(batchSearchTarget) : []"
    @confirm="onBatchSearchConfirm"
  />

  <OutboundRefuseModal
    v-model:open="refuseLineOpen"
    mode="line"
    :doc-nos="refuseLineDocNos"
    :confirm-loading="refuseLineLoading"
    @confirm="handleRefuseLineConfirm"
  />
</template>

<script setup>
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
import { computed, reactive, ref, watch, nextTick } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  CheckOutlined,
  CopyOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  PrinterOutlined,
} from '@ant-design/icons-vue'
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
import OutboundLineEditModal from './OutboundLineEditModal.vue'
import OutboundBatchSearchModal from './OutboundBatchSearchModal.vue'
import OutboundWorkOrderList from './OutboundWorkOrderList.vue'
import OutboundOutsourcingOrderList from './OutboundOutsourcingOrderList.vue'
import InventoryLineItemSelect from './InventoryLineItemSelect.vue'
import InventoryLineEditableCell from './InventoryLineEditableCell.vue'
import InventoryLineTableFooter from './InventoryLineTableFooter.vue'
import { mobileMaterialReqState } from '@/store/mobileMaterialReqStore'
import { resolveOutboundWorkOrders } from '@/utils/outboundWorkOrders'
import {
  resolveOutboundOutsourcingOrders,
  snapshotOutsourcingOrdersForOutbound,
} from '@/utils/outboundOutsourcingOrders'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import {
  outboundTypeOptions,
  requisitionDeptOptions,
  OUTBOUND_SOURCE,
  outboundStatusColor,
  outboundSourceLabel,
  isOutboundBusinessSource,
} from '@/mock/outboundOptions'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import {
  addOutboundOrder,
  generateOutboundNo,
  updateOutboundOrder,
  confirmOutbound,
  confirmOutboundLine,
  refuseOutboundLine,
  getOutboundOrderById,
  canRefuseOutbound,
  canRefuseOutboundLine,
  canDeleteOutbound,
  validateOutboundForConfirm,
} from '@/store/outboundStore'
import OutboundRefuseModal from '@/views/inventory/components/OutboundRefuseModal.vue'
import {
  outboundFormLineColumns,
  OUTBOUND_BATCH_PICK_TIP_AUTO,
  filterOutboundLineColumns,
} from '@/utils/outboundLineColumns'
import { normalizeInventoryPickerItem } from '@/utils/inventoryLineItemPicker'
import { warehouseOptionLabel } from '@/utils/inventoryFormLineDisplay'
import {
  applyPickerItemToOutboundLine,
  buildOutboundLineFromPickerItem,
  buildOutboundLinesFromBom,
  cloneOutboundLine,
  createBlankOutboundLine,
  enrichOutboundLine,
  canOutboundBatchPick,
  isOutboundDualUnitLine,
  mergeOutboundLines,
  resolveOutboundStockUnit,
  syncLineTotalFromUnit,
} from '@/utils/outboundLineHelpers'
import { createOutboundLine } from '@/mock/outboundOrders'
import { getBatchById, listBatches, stockBatchState } from '@/store/stockBatchStore'
import {
  getOutboundIssueRule,
  isSalesOutboundByOrder,
  OUTBOUND_ISSUE_RULE_OPTIONS,
  functionParamState,
} from '@/store/functionParamStore'
import {
  allocateFromSelectedBatches,
  allocateOutboundBatches,
  applyBatchAllocationsToLine,
  formatBatchAllocationPreview,
  getLineBatchAllocations,
  getManualPickBatchIds,
  getOutboundAvailableBatchQty,
  isLineManualBatchPick,
  syncManualPickBatchesToLine,
  validateManualBatchAllocations,
} from '@/utils/outboundBatchAllocate'
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
import { getDeliveryOrderById, getDeliveryOrderByCode } from '@/store/deliveryOrderStore'
import {
  formatAllocationsBarcode,
  preallocateDeliveryBatches,
} from '@/utils/salesOrderDedicatedStock'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  embedded: { type: Boolean, default: false },
  contentOnly: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits([
  'update:open',
  'saved',
  'cancel',
  'confirm',
  'refuse',
  'delete',
  'print',
  'open-full',
])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const isFromDelivery = computed(() =>
  Boolean(props.editRecord?.linkedDeliveryId || props.editRecord?.linkedDeliveryCode),
)
const isBusinessSource = computed(() => {
  if (!props.editRecord) return false
  return isOutboundBusinessSource(props.editRecord)
})
const isSalesOutbound = computed(() => form.outboundType === '销售出库')
const showReceiveWarehouse = computed(
  () => form.outboundType === '领料出库' || form.outboundType === '发料出库',
)
const canConfirmEmbedded = computed(
  () => props.embedded && props.editRecord && validateOutboundForConfirm(props.editRecord).ok,
)
const canRefuseEmbedded = computed(() => props.embedded && canRefuseOutbound(props.editRecord))
const canDeleteEmbedded = computed(() => props.embedded && canDeleteOutbound(props.editRecord))
/** 新增，或待出库/部分出库时可「保存并出库」 */
const canSaveAndConfirm = computed(() => {
  if (!isEdit.value) return true
  const st = props.editRecord?.status
  return st === '待出库' || st === '部分出库'
})
const workOrderList = computed(() => {
  void mobileMaterialReqState.items
  const orderLike = {
    ...(props.editRecord || {}),
    outboundType: form.outboundType,
    workOrders: form.workOrders,
    materialReqId: form.materialReqId || props.editRecord?.materialReqId,
    materialReqNo: form.materialReqNo || props.editRecord?.materialReqNo,
    sourceOrderNo: props.editRecord?.sourceOrderNo,
    id: props.editRecord?.id,
    docNo: form.docNo || props.editRecord?.docNo,
  }
  return resolveOutboundWorkOrders(orderLike, mobileMaterialReqState.items)
})

const outsourcingOrderList = computed(() => {
  void outsourcingOrderState.orders
  const orderLike = {
    ...(props.editRecord || {}),
    outboundType: form.outboundType,
    outsourcingOrders: form.outsourcingOrders,
    outsourcingOrderId: form.outsourcingOrderId || props.editRecord?.outsourcingOrderId,
    outsourcingOrderNo:
      form.outsourcingOrderNo ||
      props.editRecord?.outsourcingOrderNo ||
      props.editRecord?.sourceOrderNo,
    sourceOrderNo: props.editRecord?.sourceOrderNo,
  }
  return resolveOutboundOutsourcingOrders(orderLike)
})

const lockOutboundType = computed(() => isFromDelivery.value || isBusinessSource.value)
const lockSalesOrder = computed(() => isFromDelivery.value)
const lockReceiveWarehouse = computed(() => isBusinessSource.value)
const lockRequisitionDept = computed(() => isBusinessSource.value)
/** 来源为业务的出库单不允许删除明细行 */
const canRemoveOutboundLine = computed(() => !isBusinessSource.value)

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/inventory/outbound',
  getTitle: () => {
    if (props.embedded && props.editRecord?.docNo) return props.editRecord.docNo
    return isEdit.value ? '编辑出库单' : '新增出库单'
  },
})

const saving = ref(false)
const addingItems = ref(false)
const pickerOpen = ref(false)
const {
  variantConfigOpen,
  variantConfigSpuId,
  variantConfigInitialValues,
  variantConfigTargetLine,
  openVariantConfig,
  lineVariantDisplay,
} = useSpuVariantConfig()
const bomModalOpen = ref(false)
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditMode = ref('edit')
const lineEditSourceId = ref(null)
const totalWeightManual = ref(false)
const prevHeaderWarehouse = ref(undefined)
const salesOrderPickerOpen = ref(false)
const batchSearchOpen = ref(false)
const refuseLineOpen = ref(false)
const refuseLineLoading = ref(false)
const refuseLineTarget = ref(null)
const batchSearchTarget = ref(null)

const outboundTypeOpts = outboundTypeOptions.map((v) => ({ label: v, value: v }))
const requisitionDeptOpts = requisitionDeptOptions.map((v) => ({ label: v, value: v }))

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const receiveWarehouseOpts = computed(() => {
  void warehouseState.warehouses
  return warehouseState.warehouses
    .filter((w) => w.enabled !== false && w.categoryName === '线边仓')
    .map((w) => ({ label: w.name, value: w.name }))
})

const batchPickTip = computed(() => OUTBOUND_BATCH_PICK_TIP_AUTO)

const issueRuleLabel = computed(() => {
  const rule = getOutboundIssueRule()
  return OUTBOUND_ISSUE_RULE_OPTIONS.find((o) => o.value === rule)?.label || '先进先出'
})

function isRecordManualPick(line) {
  void functionParamState.params.outboundIssueRule
  void functionParamState.params.dualUnitIssueStrategy
  return isLineManualBatchPick(line)
}

function shipQtyMaxFor(line) {
  if (isRecordManualPick(line)) return undefined
  const wh = line.shipWarehouse || form.warehouse
  if (!line.itemCode || !wh) return undefined
  void stockBatchState.batches
  const batchAvail = getOutboundAvailableBatchQty(wh, line.itemCode)
  if (batchAvail > 0 || isOutboundDualUnitLine(line)) return batchAvail || undefined
  return undefined
}

function clearAutoBatchPickFields(line) {
  line.manualPickBatchIds = []
  line.batchAllocations = []
  line.pickedBatchId = null
  line.pickedBatchNo = ''
  line.pickedLength = null
  line.barcodeBatchNo = ''
  line.issuedBatchNo = undefined
  line.outboundIssueRule = undefined
}

function enableManualBatchPick(line) {
  if (!(Number(line.demandMeters) > 0) && Number(line.shipQty) > 0) {
    line.demandMeters = Number(line.shipQty)
  }
  // 进入自主拣选时清空自动规则预分配/回写的批次，避免带入 FIFO 结果
  clearAutoBatchPickFields(line)
  line.manualBatchPick = true
  syncLineTotalFromUnit(line)
  refreshLine(line)
}

function restoreAutoBatchPick(line) {
  line.manualBatchPick = false
  clearAutoBatchPickFields(line)
  syncLineTotalFromUnit(line)
  refreshLine(line)
}

function openBatchSearch(line) {
  batchSearchTarget.value = line
  batchSearchOpen.value = true
}

function onBatchSearchConfirm(ids) {
  const line = batchSearchTarget.value
  if (!line) return
  onMultiPickBatches(line, ids || [])
}

function filterBatchOption(input, option) {
  const text = String(option?.label ?? option?.value ?? '').toLowerCase()
  return text.includes(String(input || '').toLowerCase())
}

function manualBatchIds(record) {
  return getManualPickBatchIds(record)
}

function manualBatchSummary(record) {
  const unit = resolveOutboundStockUnit(record)
  const ids = getManualPickBatchIds(record)
  if (!ids.length) return ''
  const demand = Number(record.shipQty) || 0
  if (!(demand > 0)) {
    return `已选 ${ids.length} 批，请填写出库数量（小批优先跨批扣减）`
  }
  const res = allocateFromSelectedBatches({
    batchIds: ids,
    demandQty: demand,
    unit,
    line: record,
  })
  if (!res.ok) return res.message
  return formatBatchAllocationPreview(res.allocations, unit)
}

function autoAllocPreview(record) {
  void stockBatchState.batches
  void functionParamState.params.outboundIssueRule
  void functionParamState.params.dualUnitIssueStrategy
  void functionParamState.params.salesOutboundIssueRule
  const rule = getOutboundIssueRule()
  const ruleName = issueRuleLabel.value
  const wh = record.shipWarehouse || form.warehouse
  if (!record.itemCode || !wh) {
    return `${ruleName}·确认时自动扣批`
  }
  const batchAvail = getOutboundAvailableBatchQty(wh, record.itemCode)
  if (!(batchAvail > 0)) {
    return '该仓暂无在库批次（当前仓库数量为 0 时请先入库建批，或改选原料仓/半成品仓等有批次的仓库）'
  }
  if (!(Number(record.shipQty) > 0)) {
    return `${ruleName}·确认时自动扣批`
  }
  if (isSalesOutbound.value && isSalesOutboundByOrder()) {
    const so =
      (form.salesOrderId && getSalesOrderById(form.salesOrderId)) ||
      findSalesOrderByOrderNo(form.salesOrderNo) ||
      null
    const salesLine =
      (so?.lineItems || []).find((l) => l.id === record.salesLineId) ||
      (so?.lineItems || []).find((l) => l.productCode === record.itemCode)
    const dedicated = preallocateDeliveryBatches({
      salesOrder: so,
      salesLine,
      itemCode: record.itemCode,
      warehouse: wh,
      shipQty: record.shipQty,
      stockFulfillmentMode: salesLine?.stockFulfillmentMode,
    })
    if (!dedicated.ok) return dedicated.message
    return (
      formatBatchAllocationPreview(dedicated.allocations, resolveOutboundStockUnit(record)) ||
      formatAllocationsBarcode(dedicated.allocations)
    )
  }
  const res = allocateOutboundBatches({
    warehouse: wh,
    itemCode: record.itemCode,
    demandQty: record.shipQty,
    rule,
    line: record,
  })
  if (!res.ok) return res.message
  return formatBatchAllocationPreview(res.allocations, resolveOutboundStockUnit(record))
}

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
  outboundType: '其他出库',
  outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
  warehouse: undefined,
  receiveWarehouse: undefined,
  handler: 'admin1',
  requisitionDept: '默认工厂',
  totalWeight: 0,
  salesOrderId: '',
  salesOrderNo: '',
  customerName: '',
  salesperson: '',
  contractNo: '',
  deliveryMethod: '',
  deliveryRemark: '',
  remark: '',
  workOrders: [],
  outsourcingOrders: [],
  outsourcingOrderId: '',
  outsourcingOrderNo: '',
  materialReqId: '',
  materialReqNo: '',
  lineItems: [],
})

const baseLineColumns = outboundFormLineColumns

const {
  columnSettings,
  columnDrawerOpen,
  displayColumns: rawDisplayColumns,
  defaultColumnSettings,
} = useTableColumnSettings('outbound-form-lines-v11', baseLineColumns, {
  minScrollX: 1874,
  pinEdgeColumns: false,
  pinActionColumn: true,
})

const displayColumns = computed(() =>
  filterOutboundLineColumns(rawDisplayColumns.value, form.outboundType),
)

const lineScrollX = computed(() => displayColumns.value.reduce((s, c) => s + (c.width || 80), 0))

const lineSummary = computed(() => {
  const lines = form.lineItems.filter((l) => l.itemCode)
  const shipQtyTotal = lines.reduce((sum, line) => sum + (Number(line.shipQty) || 0), 0)
  const weightTotal = lines.reduce((sum, line) => sum + (Number(line.weight) || 0), 0)
  const totalPrice = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0)
  return {
    lineCount: lines.length,
    shipQtyTotal: Math.round(shipQtyTotal * 1000) / 1000,
    weightTotal: Math.round(weightTotal * 1000) / 1000,
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

function normalizeOutboundTime(value) {
  if (!value) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  const parsed = dayjs(value)
  if (!parsed.isValid()) return dayjs().format('YYYY-MM-DD HH:mm:ss')
  return parsed.format('YYYY-MM-DD HH:mm:ss')
}

function syncSalesOrderMeta(orderNo, orderId) {
  const order = (orderId && getSalesOrderById(orderId)) || findSalesOrderByOrderNo(orderNo) || null
  form.customerName = order?.customerName || ''
  form.salesperson = order?.salesperson || ''
  form.deliveryMethod = order?.deliveryMethod || ''
  form.contractNo = order?.contractNo || ''
  if (order?.id) form.salesOrderId = order.id
}

function resolveLinkedDelivery(record) {
  if (!record) return null
  return (
    (record.linkedDeliveryId && getDeliveryOrderById(record.linkedDeliveryId)) ||
    (record.linkedDeliveryCode && getDeliveryOrderByCode(record.linkedDeliveryCode)) ||
    (record.sourceOrderNo && getDeliveryOrderByCode(record.sourceOrderNo)) ||
    null
  )
}

function onSalesOrderPicked(order) {
  form.salesOrderId = order.id
  form.salesOrderNo = order.orderNo
  form.customerName = order.customerName || ''
  form.salesperson = order.salesperson || ''
  form.deliveryMethod = order.deliveryMethod || ''
  form.contractNo = order.contractNo || ''
}

function loadEditForm(record) {
  endLineCellEdit()
  totalWeightManual.value = true
  prevHeaderWarehouse.value = record.warehouse || undefined
  const delivery = resolveLinkedDelivery(record)
  Object.assign(form, {
    docNo: record.docNo,
    outboundType: record.outboundType,
    outboundTime: normalizeOutboundTime(record.outboundTime || record.createdAt),
    warehouse: record.warehouse || undefined,
    receiveWarehouse: record.receiveWarehouse || undefined,
    handler: record.handler || 'admin1',
    requisitionDept: record.requisitionDept || '默认工厂',
    totalWeight: record.totalWeight ?? 0,
    salesOrderId: record.salesOrderId || '',
    salesOrderNo: record.salesOrderNo || '',
    customerName: record.customerName || '',
    salesperson: record.salesperson || '',
    contractNo: record.contractNo || '',
    deliveryMethod: '',
    deliveryRemark: delivery?.remark || '',
    remark: record.remark || '',
    workOrders: Array.isArray(record.workOrders) ? [...record.workOrders] : [],
    outsourcingOrders: Array.isArray(record.outsourcingOrders) ? [...record.outsourcingOrders] : [],
    outsourcingOrderId: record.outsourcingOrderId || '',
    outsourcingOrderNo: record.outsourcingOrderNo || '',
    materialReqId: record.materialReqId || '',
    materialReqNo: record.materialReqNo || '',
    lineItems: (record.lineItems || []).map((l) => {
      const row = enrichOutboundLine({
        ...l,
        lineStatus: l.lineStatus || '待出库',
      })
      if (isOutboundDualUnitLine(row)) {
        applyBatchAllocationsToLine(row, getLineBatchAllocations(row))
      }
      return row
    }),
  })
  if (!form.workOrders.length) {
    form.workOrders = resolveOutboundWorkOrders(record, mobileMaterialReqState.items)
  }
  if (!form.outsourcingOrders.length) {
    form.outsourcingOrders = resolveOutboundOutsourcingOrders(record)
    if (form.outsourcingOrders.length && !form.outsourcingOrderId) {
      form.outsourcingOrderId =
        form.outsourcingOrders[0].outsourcingOrderId || record.outsourcingOrderId || ''
      form.outsourcingOrderNo =
        form.outsourcingOrders[0].orderNo || record.outsourcingOrderNo || record.sourceOrderNo || ''
    }
  }
  if (form.salesOrderNo) {
    syncSalesOrderMeta(form.salesOrderNo, form.salesOrderId)
  }
}

const refuseLineDocNos = computed(() => {
  const line = refuseLineTarget.value
  if (!line) return []
  return [`${line.itemCode || ''} ${line.itemName || ''}`.trim() || line.id]
})

function isLinePendingOutbound(record) {
  const st = record?.lineStatus || '待出库'
  return st !== '已出库' && st !== '已拒绝'
}

function lineStatusColor(status) {
  const st = status || '待出库'
  if (st === '已出库') return 'success'
  if (st === '已拒绝') return 'error'
  return 'processing'
}

function canRefuseLine(record) {
  if (!isEdit.value || !props.editRecord) return false
  return canRefuseOutboundLine(props.editRecord, record)
}

function openRefuseLine(record) {
  if (!isEdit.value || !props.editRecord?.id) {
    message.warning('请先保存出库单后再拒绝出库')
    return
  }
  refuseLineTarget.value = record
  refuseLineOpen.value = true
}

async function handleRefuseLineConfirm(reason) {
  const line = refuseLineTarget.value
  if (!line || !props.editRecord?.id) return
  refuseLineLoading.value = true
  try {
    const saved = updateOutboundOrder(props.editRecord.id, buildPayload())
    if (saved && !saved.ok) {
      message.warning(saved.message || '保存失败，无法拒绝出库')
      return
    }
    const res = refuseOutboundLine(props.editRecord.id, line.id, { reason })
    if (!res.ok) {
      message.warning(res.message || '拒绝出库失败')
      return
    }
    message.success(
      res.order?.status === '已拒绝' ? '明细已拒绝，出库单已全部拒绝' : '明细已拒绝出库',
    )
    refuseLineOpen.value = false
    const latest = getOutboundOrderById(props.editRecord.id)
    if (latest) loadEditForm(latest)
  } finally {
    refuseLineLoading.value = false
  }
}

function handleConfirmLineOutbound(record) {
  if (!isEdit.value || !props.editRecord?.id) {
    message.warning('请先保存出库单后再确认出库')
    return
  }
  if ((record.lineStatus || '待出库') === '已出库') {
    message.info('该明细已出库')
    return
  }
  if ((record.lineStatus || '待出库') === '已拒绝') {
    message.info('该明细已拒绝出库')
    return
  }
  // 先落盘当前编辑内容，避免确认时扣账用到旧数据
  const saved = updateOutboundOrder(props.editRecord.id, buildPayload())
  if (saved && !saved.ok) {
    message.warning(saved.message || '保存失败，无法确认出库')
    return
  }
  const res = confirmOutboundLine(props.editRecord.id, record.id)
  if (!res.ok) {
    message.warning(res.message || '确认出库失败')
    return
  }
  if (res.warnings?.length) {
    message.warning(res.warnings.join('；'))
  }
  const inboundNo = res.inboundOrder?.docNo
  let tip =
    res.order?.status === '已出库'
      ? '明细已出库，出库单已全部出库'
      : '明细已出库，出库单状态：部分出库'
  if (inboundNo) tip += `；已生成领料入库单 ${inboundNo}`
  message.success(tip)
  const latest = getOutboundOrderById(props.editRecord.id)
  if (latest) loadEditForm(latest)
}

function resetForm() {
  endLineCellEdit()
  totalWeightManual.value = false
  Object.assign(form, {
    docNo: generateOutboundNo(),
    outboundType: '其他出库',
    outboundTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    warehouse: undefined,
    receiveWarehouse: undefined,
    handler: 'admin1',
    requisitionDept: '默认工厂',
    totalWeight: 0,
    salesOrderId: '',
    salesOrderNo: '',
    customerName: '',
    salesperson: '',
    contractNo: '',
    deliveryMethod: '',
    deliveryRemark: '',
    remark: '',
    workOrders: [],
    outsourcingOrders: [],
    outsourcingOrderId: '',
    outsourcingOrderNo: '',
    materialReqId: '',
    materialReqNo: '',
    lineItems: [],
  })
  prevHeaderWarehouse.value = undefined
}

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function refreshLine(line) {
  Object.assign(line, enrichOutboundLine(line))
}

function clearBatchPick(line) {
  clearAutoBatchPickFields(line)
  if (canOutboundBatchPick(line) && isRecordManualPick(line)) {
    syncLineTotalFromUnit(line)
  }
}

function onLineWarehouseChange(line) {
  clearBatchPick(line)
  refreshLine(line)
}

function batchOptionsFor(record) {
  void stockBatchState.batches
  const warehouse = record.shipWarehouse || ''
  const unit = resolveOutboundStockUnit(record)
  if (!record.itemCode || !warehouse) return []
  return listBatches({ warehouse, itemCode: record.itemCode, inStockOnly: true })
    .slice()
    .sort((a, b) => {
      const da = Number(a.currentLength) || 0
      const db = Number(b.currentLength) || 0
      if (da !== db) return da - db
      return String(a.batchNo || '').localeCompare(String(b.batchNo || ''), 'zh-CN')
    })
    .map((b) => ({
      label: `${b.batchNo}（当前 ${formatQty(b.currentLength)}${unit}）`,
      value: b.id,
    }))
}

function onMultiPickBatches(record, batchIds) {
  syncManualPickBatchesToLine(record, batchIds || [])
  if (!record.shipWarehouse && getManualPickBatchIds(record).length) {
    const batch = getBatchById(getManualPickBatchIds(record)[0])
    if (batch?.warehouse) record.shipWarehouse = batch.warehouse
  }
  const demand = Number(record.shipQty) || 0
  if (demand > 0 && getManualPickBatchIds(record).length) {
    const check = allocateFromSelectedBatches({
      batchIds: getManualPickBatchIds(record),
      demandQty: demand,
      unit: resolveOutboundStockUnit(record),
      line: record,
    })
    if (!check.ok) {
      message.warning(check.message)
    }
  }
  syncLineTotalFromUnit(record)
  refreshLine(record)
  syncTotalWeight()
}

function onShipQtyCellChange(line) {
  const qty = Number(line.shipQty)
  if (!Number.isFinite(qty) || qty < 0) {
    line.shipQty = 0
  }
  if (isRecordManualPick(line)) {
    const ids = getManualPickBatchIds(line)
    if (ids.length && qty > 0) {
      const check = allocateFromSelectedBatches({
        batchIds: ids,
        demandQty: qty,
        unit: resolveOutboundStockUnit(line),
        line,
      })
      if (!check.ok) {
        message.warning(check.message)
      } else {
        syncManualPickBatchesToLine(line, ids)
      }
    } else if (ids.length && !(qty > 0)) {
      // 数量改为 0：保留已选批次，清空扣减预览
      syncManualPickBatchesToLine(line, ids)
    }
    syncLineTotalFromUnit(line)
    syncTotalWeight()
    return
  }
  // 自动规则下改数量：清掉可能残留的自动/历史选批，确认时再按 FIFO 重算
  clearAutoBatchPickFields(line)
  const max = shipQtyMaxFor(line)
  if (max != null && Number.isFinite(qty) && qty > max) {
    line.shipQty = max
    message.warning(`出库数量不能超过可用库存 ${max}`)
  }
  syncLineTotalFromUnit(line)
  syncTotalWeight()
}

function onLineUnitPriceChange(line) {
  syncLineTotalFromUnit(line)
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal

  prevHeaderWarehouse.value = newVal

  if (!changed || !newVal || !form.lineItems.length) {
    return
  }

  Modal.confirm({
    title: '出库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      form.lineItems.forEach((line) => {
        line.shipWarehouse = newVal
        if (canOutboundBatchPick(line)) clearBatchPick(line)
        refreshLine(line)
      })
    },
  })
}

function calcLineWeightTotal() {
  return form.lineItems.reduce((sum, line) => sum + (Number(line.weight) || 0), 0)
}

function syncTotalWeight() {
  if (totalWeightManual.value) return
  form.totalWeight = Math.round(calcLineWeightTotal() * 1000) / 1000
}

function onTotalWeightManual() {
  totalWeightManual.value = true
}

function onLineWeightChange() {
  totalWeightManual.value = false
  syncTotalWeight()
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
      enrichOutboundLine(
        createOutboundLine({
          ...draft,
          shipQty: 1,
          shipWarehouse: form.warehouse || '',
        }),
      ),
    )
    added += 1
  })
  syncTotalWeight()
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
  Object.assign(target, enrichOutboundLine(target))
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
          buildOutboundLineFromPickerItem(normalizeInventoryPickerItem(it), form.warehouse || ''),
        )
      if (!incoming.length) {
        message.warning('所选物品无效，请重新选择')
        return
      }
      form.lineItems = mergeOutboundLines(form.lineItems, incoming)
      syncTotalWeight()
      const added = form.lineItems.length - before
      if (added > 0) {
        message.success(`已添加 ${added} 条明细`)
      } else {
        message.info('所选物品已在明细中')
      }
    } finally {
      addingItems.value = false
    }
  })
}

function addBlankLine() {
  form.lineItems.push(createBlankOutboundLine(form.warehouse || ''))
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
      enrichOutboundLine(
        createOutboundLine({
          ...draft,
          id: record.id,
          shipQty: record.shipQty ?? 1,
          shipWarehouse: record.shipWarehouse || form.warehouse || '',
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
  Object.assign(record, applyPickerItemToOutboundLine(record, item, form.warehouse || ''))
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
  record.availableStockQty = null
  record.softAllocatedQty = null
  record.dedicatedStockQty = null
  record.warehouseStockQty = null
}

function onBomAdded({ pickerRow, usageCoefficient }) {
  const incoming = buildOutboundLinesFromBom(
    pickerRow,
    usageCoefficient,
    form.warehouse || '',
    false,
  )
  if (!incoming.length) {
    message.warning('该物品无自有生效 BOM 明细，请先维护 SKU 产品 BOM')
    return
  }
  form.lineItems = mergeOutboundLines(form.lineItems, incoming)
  syncTotalWeight()
  message.success(`已添加 ${incoming.length} 条明细`)
}

function openLineEdit(record, mode) {
  lineEditSourceId.value = record.id
  lineEditTarget.value = { ...record }
  lineEditMode.value = mode
  lineEditOpen.value = true
}

function onLineEditConfirm(updated) {
  const enriched = enrichOutboundLine(updated)
  if (lineEditMode.value === 'copy') {
    form.lineItems.push(cloneOutboundLine(enriched))
    onLineWeightChange()
    return
  }
  const idx = form.lineItems.findIndex((l) => l.id === lineEditSourceId.value)
  if (idx !== -1) {
    form.lineItems[idx] = { ...form.lineItems[idx], ...enriched }
  }
  onLineWeightChange()
}

function removeLine(id) {
  form.lineItems = form.lineItems.filter((l) => l.id !== id)
  syncTotalWeight()
}

function buildPayload() {
  const payload = {
    docNo: form.docNo?.trim(),
    outboundType: form.outboundType,
    outboundTime: normalizeOutboundTime(form.outboundTime),
    warehouse: form.warehouse || '',
    receiveWarehouse: showReceiveWarehouse.value ? form.receiveWarehouse || '' : '',
    handler: form.handler,
    requisitionDept: isSalesOutbound.value ? '' : form.requisitionDept || '',
    totalWeight: form.totalWeight,
    salesOrderNo: form.salesOrderNo?.trim() || '',
    salesOrderId: form.salesOrderId || '',
    contractNo: form.contractNo?.trim() || '',
    customerName: form.customerName || '',
    remark: form.remark?.trim(),
    workOrders: form.workOrders || [],
    outsourcingOrders: snapshotOutsourcingOrdersForOutbound(form.outsourcingOrders || []),
    outsourcingOrderId: form.outsourcingOrderId || '',
    outsourcingOrderNo: form.outsourcingOrderNo || '',
    materialReqId: form.materialReqId || '',
    materialReqNo: form.materialReqNo || '',
    lineItems: form.lineItems
      .filter((l) => l.itemCode)
      .map((l) => {
        const row = enrichOutboundLine({ ...l })
        if (canOutboundBatchPick(row) && isLineManualBatchPick(row)) {
          row.manualBatchPick = true
          row.manualPickBatchIds = getManualPickBatchIds(row)
          const check = validateManualBatchAllocations(row)
          if (check.ok) {
            applyBatchAllocationsToLine(row, check.allocations, { syncShipQty: false })
          }
        }
        return row
      }),
  }
  // 仓管在出库页新建 →「新增」；编辑不改写原有来源
  if (!props.editRecord) {
    payload.sourceChannel = OUTBOUND_SOURCE.MANUAL
  }
  return payload
}

function validateOutboundForm() {
  if (!form.outboundType) {
    message.warning('请选择出库类型')
    return false
  }
  if (!form.docNo?.trim()) {
    message.warning('请输入出库单号')
    return false
  }

  const skuCheck = validateLinesSkuResolved(form.lineItems)
  if (!skuCheck.ok) {
    message.warning(skuCheck.message)
    return false
  }

  if (!form.lineItems.filter((l) => l.itemCode).length) {
    message.warning('请至少添加一条有效明细')
    return false
  }

  const invalidBatchLine = form.lineItems.find((line) => {
    if (!line.itemCode || !canOutboundBatchPick(line)) return false
    const qty = Number(line.shipQty)
    if (line.shipQty == null || line.shipQty === '' || !Number.isFinite(qty) || qty < 0) {
      return true
    }
    // 允许出库数量为 0（草稿）；有数量时再校验批次/库存
    if (!(qty > 0)) return false
    if (isRecordManualPick(line)) {
      return !validateManualBatchAllocations(line).ok
    }
    const wh = line.shipWarehouse || form.warehouse
    if (!wh) return true
    const available = getOutboundAvailableBatchQty(wh, line.itemCode)
    if (isOutboundDualUnitLine(line) || available > 0) {
      return qty > available
    }
    return false
  })
  if (invalidBatchLine) {
    const qty = Number(invalidBatchLine.shipQty)
    const manualMsg = validateManualBatchAllocations(invalidBatchLine).message
    message.warning(
      isRecordManualPick(invalidBatchLine) && qty > 0
        ? `「${invalidBatchLine.itemName || invalidBatchLine.itemCode}」${manualMsg || '请多选批次并分配数量'}`
        : `「${invalidBatchLine.itemName || invalidBatchLine.itemCode}」请填写出库数量（可为 0），且不超过可用库存（${issueRuleLabel.value}）`,
    )
    return false
  }
  return true
}

/** @returns {{ ok: boolean, order?: object, message?: string }} */
function persistOutboundOrder() {
  return isEdit.value
    ? updateOutboundOrder(props.editRecord.id, buildPayload())
    : addOutboundOrder(buildPayload())
}

function handleSave() {
  if (!validateOutboundForm()) return
  saving.value = true
  const res = persistOutboundOrder()
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '出库单已更新' : '出库单已创建')
  emit('saved', res.order)
  closeAfterSave()
}

function handleSaveAndConfirm() {
  if (!validateOutboundForm()) return
  Modal.confirm({
    title: '保存并出库',
    content: '将先保存当前编辑内容，再确认出库并扣减库存，是否继续？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      saving.value = true
      const saved = persistOutboundOrder()
      if (!saved.ok) {
        saving.value = false
        message.warning(saved.message || '保存失败')
        return Promise.reject()
      }
      const orderId = saved.order?.id
      if (!orderId) {
        saving.value = false
        message.warning('保存成功但无法确认出库')
        return Promise.reject()
      }
      const { count, blocked, warnings } = confirmOutbound([orderId])
      saving.value = false
      if (blocked?.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        emit('saved', saved.order)
        return Promise.reject()
      }
      if (warnings?.length) {
        message.warning(warnings.join('；'))
      }
      if (count > 0) {
        message.success(isEdit.value ? '已保存并确认出库' : '已创建并确认出库')
        const latest = getOutboundOrderById(orderId)
        emit('saved', latest || saved.order)
        closeAfterSave()
        return undefined
      }
      message.warning('未确认出库')
      emit('saved', saved.order)
      return Promise.reject()
    },
  })
}
</script>

<style lang="less">
@import '@/views/inventory/components/inventoryLineTablePanel.less';
</style>

<style lang="less" scoped>
:deep(.form-create-page.outbound-form-modal),
:deep(.form-embedded-panel.outbound-form-modal),
:deep(.form-embedded-content-only.outbound-form-modal),
.form-embedded-panel,
.form-embedded-content-only {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 0;

  .form-body,
  .embedded-body {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
}

:deep(.form-create-page.outbound-form-modal) {
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
}

:deep(.ant-modal.outbound-form-modal) {
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

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.remark-item .ant-form-item-label) {
    flex: 0 0 88px;
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

.delivery-remark-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
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

  .summary-sep {
    margin: 0 8px;
    color: rgba(0, 0, 0, 0.25);
  }
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

.header-print-btn {
  padding-inline: 4px;
  color: rgba(0, 0, 0, 0.65);

  &:hover {
    color: #1677ff;
  }
}

.unit-suffix {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.blank-size-hint {
  margin-top: 2px;
  font-size: 11px;
  color: #d46b08;
  line-height: 1.25;
  word-break: break-all;
}

.cell-disabled {
  color: rgba(0, 0, 0, 0.25);
}

.batch-pick-auto {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}

.cell-auto-batch {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(0, 0, 0, 0.65);
  font-size: 12px;
  cursor: help;
}

.manual-pick-link,
.batch-pick-actions a {
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.batch-pick-actions {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.batch-alloc-summary {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
  word-break: break-all;
}

.line-actions {
  flex-wrap: nowrap;
  white-space: nowrap;
}

.line-action-icon {
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  line-height: 1;
}

.danger-link {
  color: #ff4d4f;
}

.muted-text {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
