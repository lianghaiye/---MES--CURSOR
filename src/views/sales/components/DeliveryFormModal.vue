<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="apply-delivery-form"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="section-block">
      <div class="section-title">发货信息</div>
      <a-alert
        v-if="pendingPriceChangeBlock"
        type="warning"
        show-icon
        class="pending-price-alert"
        :message="pendingPriceChangeBlock"
      />
      <a-divider class="section-divider" />
      <a-form layout="inline" class="horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="6">
            <a-form-item label="发货类型" required>
              <a-select
                v-model:value="form.deliveryType"
                size="small"
                placeholder="请选择 发货类型"
                :options="DELIVERY_TYPE_OPTIONS"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="源销售订单" required>
              <a-select
                v-if="!salesOrderLocked"
                v-model:value="form.salesOrderId"
                show-search
                placeholder="请选择 销售订单"
                size="small"
                :options="salesOrderOpts"
                @change="onSalesOrderChange"
              />
              <a-input v-else :value="form.salesOrderNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="发货单号">
              <a-input
                v-model:value="form.deliveryCode"
                size="small"
                placeholder="可自定义，未填则按系统规则生成"
                allow-clear
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="客户名称" required>
              <a-select
                v-model:value="form.customerName"
                size="small"
                placeholder="请选择 客户名称"
                :options="customerOpts"
                @change="onCustomerChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="交货方式" required>
              <a-select
                v-model:value="form.shipmentMethod"
                size="small"
                placeholder="请选择 交货方式"
                :options="shipmentMethodOpts"
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
            <a-form-item label="客户联系人">
              <a-select
                v-model:value="form.contactPerson"
                allow-clear
                size="small"
                placeholder="请选择 客户联系人"
                :options="contactOpts"
                @change="onContactChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="客户联系方式">
              <a-input v-model:value="form.contactPhone" size="small" placeholder="请输入" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="交货日期">
              <a-date-picker
                v-model:value="form.deliveryDate"
                size="small"
                style="width: 100%"
                placeholder="请选择 交货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="交货地址">
              <a-input
                v-model:value="form.deliveryAddress"
                size="small"
                placeholder="请输入 交货地址"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="申请出库">
              <a-switch v-model:checked="form.applyOutbound" size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="出库仓库">
              <a-select
                v-model:value="form.outboundWarehouse"
                allow-clear
                size="small"
                placeholder="请选择 出库仓库"
                :options="warehouseOpts"
                @change="onHeaderWarehouseChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="司机姓名">
              <a-input v-model:value="form.driverName" size="small" placeholder="请输入 司机姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="司机联系方式">
              <a-input
                v-model:value="form.driverPhone"
                size="small"
                placeholder="请输入 司机联系方式"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="车牌号">
              <a-input v-model:value="form.plateNo" size="small" placeholder="请输入 车牌号" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                placeholder="请输入 备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="form.lineItems.length" class="section-block section-block--lines">
      <div class="section-title">整机发货</div>
      <a-divider class="section-divider" />
      <div
        ref="lineTablePanelRef"
        class="line-table-panel"
        :class="{ 'panel-scrolling': isLineTableScrolling }"
        :style="lineTablePanelStyle"
      >
        <div class="line-table-body" :class="{ 'is-scrolling': isLineTableScrolling }">
          <a-table
            :columns="lineColumns"
            :data-source="form.lineItems"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="lineTableScroll"
            :row-class-name="deliveryLineRowClassName"
          >
            <template #headerCell="{ column }">
              <template v-if="column.key === 'shipProgress'">
                <span class="th-nowrap">
                  发货进度
                  <a-tooltip :title="SHIP_PROGRESS_TOOLTIP">
                    <QuestionCircleOutlined class="th-tip-icon" />
                  </a-tooltip>
                </span>
              </template>
              <template v-else-if="column.key === 'selected'">
                <span class="th-nowrap">
                  纳入本单
                  <a-tooltip title="勾选后本票发运该产品；取消勾选则本行不发货，置灰且不可编辑。">
                    <QuestionCircleOutlined class="th-tip-icon" />
                  </a-tooltip>
                </span>
              </template>
              <template v-else>
                <span class="th-nowrap">{{ column.title }}</span>
              </template>
            </template>
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'selected'">
                <a-checkbox
                  :checked="isDeliveryLineIncluded(record)"
                  :disabled="isDeliveryLineShipLocked(record)"
                  @change="(e) => onDeliveryLineIncludeChange(record, e.target.checked)"
                />
              </template>
              <template v-else-if="column.key === 'productName'">
                <span>{{ record.productName || '—' }}</span>
                <a-tag
                  v-if="lineHasShipAttachmentHint(record)"
                  color="orange"
                  class="ship-att-hint-tag"
                >
                  有发货附件
                </a-tag>
              </template>
              <template v-else-if="column.key === 'lineShipStatus'">
                <a-tag :color="lineShipStatusColor(record.lineShipStatus)">
                  {{ record.lineShipStatus }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'shipProgress'">
                {{
                  formatShipProgress(
                    record.confirmedOutboundQty ?? record.shippedQty,
                    record.appliedShipQty ?? record.shippedQty,
                    record.orderQty,
                  )
                }}
              </template>
              <template v-else-if="column.key === 'orderQty'">
                {{ formatDeliveryQty(record.orderQty) }}
              </template>
              <template v-else-if="column.key === 'unitPriceExTax'">
                {{ formatDeliveryPrice(record.unitPriceExTax) }}
              </template>
              <template v-else-if="column.key === 'unitPriceInTax'">
                {{ formatDeliveryPrice(record.unitPriceInTax) }}
              </template>
              <template v-else-if="column.key === 'deliveryMode'">
                <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
                  {{ record.deliveryMode || '整机' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'variantAttr'">
                <a-tooltip v-if="record.variantAttr" :title="record.variantAttr">
                  <span>{{ record.variantAttr }}</span>
                </a-tooltip>
                <span v-else>—</span>
              </template>
              <template v-else-if="column.key === 'shipQty'">
                <a-input-number
                  v-model:value="record.shipQty"
                  size="small"
                  :min="0"
                  :max="lineRemainShipQty(record)"
                  :precision="4"
                  :formatter="deliveryDecimalFormatter"
                  :parser="deliveryDecimalParser"
                  style="width: 100%"
                  :disabled="isDeliveryLineFieldsDisabled(record)"
                  @change="onLineCalc(record)"
                />
              </template>
              <template v-else-if="column.key === 'barcodeBatchNo'">
                <span :title="record.barcodeBatchNo || ''">{{ record.barcodeBatchNo || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'shipWeight'">
                <a-input-number
                  v-model:value="record.shipWeight"
                  size="small"
                  :min="0"
                  :precision="4"
                  :formatter="deliveryDecimalFormatter"
                  :parser="deliveryDecimalParser"
                  style="width: 100%"
                  :disabled="isDeliveryLineFieldsDisabled(record)"
                  @change="onLineCalc(record)"
                />
              </template>
              <template v-else-if="column.key === 'deliveryAmountExTax'">
                {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
              </template>
              <template v-else-if="column.key === 'deliveryAmountInTax'">
                {{ formatDeliveryPrice(record.deliveryAmountInTax) }}
              </template>
              <template v-else-if="column.key === 'shipWarehouse'">
                <a-select
                  v-model:value="record.shipWarehouse"
                  allow-clear
                  size="small"
                  placeholder="请选择"
                  style="width: 100%"
                  :options="warehouseOpts"
                  :disabled="isDeliveryLineFieldsDisabled(record)"
                  @change="() => onLineWarehouseChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'stockQty'">
                {{ formatDeliveryQty(record.stockQty) }}
              </template>
              <template v-else-if="column.key === 'warehouseStockQty'">
                {{ formatDeliveryQty(record.warehouseStockQty) }}
              </template>
              <template v-else-if="column.key === 'lineRemark'">
                <SalesLineLongTextCell
                  v-if="!isDeliveryLineFieldsDisabled(record)"
                  :value="record.lineRemark"
                  @edit="openLongTextEdit(record, 'lineRemark')"
                />
                <span v-else>{{ record.lineRemark || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button
                  v-if="!isDeliveryLineShipLocked(record)"
                  type="link"
                  size="small"
                  :disabled="!isDeliveryLineIncluded(record)"
                  @click="openLineEdit(record)"
                >
                  编辑
                </a-button>
                <span v-else class="line-locked-hint">{{ deliveryLineLockedHint(record) }}</span>
              </template>
              <template v-else>{{ displayCell(record, column) }}</template>
            </template>
          </a-table>
        </div>
      </div>
    </div>

    <div v-if="form.scatterShipments.length" class="section-block section-block--lines">
      <div class="section-title">散件发运</div>
      <a-divider class="section-divider" />
      <div
        ref="scatterTablePanelRef"
        class="line-table-panel"
        :class="{ 'panel-scrolling': isScatterTableScrolling }"
        :style="scatterTablePanelStyle"
      >
        <div class="line-table-body" :class="{ 'is-scrolling': isScatterTableScrolling }">
          <a-table
            :columns="scatterLineColumns"
            :data-source="form.scatterShipments"
            row-key="salesLineId"
            size="small"
            bordered
            :pagination="false"
            :scroll="scatterTableScroll"
            v-model:expanded-row-keys="expandedScatterRowKeys"
            :row-class-name="deliveryLineRowClassName"
          >
            <template #headerCell="{ column }">
              <template v-if="column.key === 'shipProgress'">
                <span class="th-nowrap">
                  发货进度
                  <a-tooltip :title="SHIP_PROGRESS_TOOLTIP">
                    <QuestionCircleOutlined class="th-tip-icon" />
                  </a-tooltip>
                </span>
              </template>
              <template v-else-if="column.key === 'selected'">
                <span class="th-nowrap">
                  纳入本单
                  <a-tooltip title="勾选后本票发运该产品；取消勾选则本行不发货，置灰且不可编辑。">
                    <QuestionCircleOutlined class="th-tip-icon" />
                  </a-tooltip>
                </span>
              </template>
              <template v-else>
                <span class="th-nowrap">{{ column.title }}</span>
              </template>
            </template>
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'selected'">
                <a-checkbox
                  :checked="isDeliveryLineIncluded(record)"
                  :disabled="isDeliveryLineShipLocked(record)"
                  @change="(e) => onDeliveryLineIncludeChange(record, e.target.checked)"
                />
              </template>
              <template v-else-if="column.key === 'productName'">
                <span>{{ record.productName || '—' }}</span>
                <a-tag
                  v-if="lineHasShipAttachmentHint(record)"
                  color="orange"
                  class="ship-att-hint-tag"
                >
                  有发货附件
                </a-tag>
              </template>
              <template v-else-if="column.key === 'lineShipStatus'">
                <a-tag :color="lineShipStatusColor(record.lineShipStatus)">
                  {{ record.lineShipStatus }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'shipProgress'">
                {{
                  formatShipProgress(
                    record.confirmedOutboundQty ?? record.shippedQty,
                    record.appliedShipQty ?? record.shippedQty,
                    record.orderQty,
                  )
                }}
              </template>
              <template v-else-if="column.key === 'orderQty'">
                {{ formatDeliveryQty(record.orderQty) }}
              </template>
              <template v-else-if="column.key === 'unitPriceExTax'">
                {{ formatDeliveryPrice(record.unitPriceExTax) }}
              </template>
              <template v-else-if="column.key === 'unitPriceInTax'">
                {{ formatDeliveryPrice(record.unitPriceInTax) }}
              </template>
              <template v-else-if="column.key === 'deliveryMode'">
                <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
                  {{ record.deliveryMode || '散件' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'variantAttr'">
                <a-tooltip v-if="record.variantAttr" :title="record.variantAttr">
                  <span>{{ record.variantAttr }}</span>
                </a-tooltip>
                <span v-else>—</span>
              </template>
              <template v-else-if="column.key === 'shipWeight'">
                <a-input-number
                  v-model:value="record.shipWeight"
                  size="small"
                  :min="0"
                  :precision="4"
                  :formatter="deliveryDecimalFormatter"
                  :parser="deliveryDecimalParser"
                  style="width: 100%"
                  :disabled="isDeliveryLineFieldsDisabled(record)"
                  @change="onScatterLinePriceChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'deliveryAmountExTax'">
                {{ formatDeliveryPrice(record.deliveryAmountExTax) }}
              </template>
              <template v-else-if="column.key === 'deliveryAmountInTax'">
                {{ formatDeliveryPrice(record.deliveryAmountInTax) }}
              </template>
              <template v-else-if="column.key === 'shipWarehouse'">
                <a-select
                  v-model:value="record.shipWarehouse"
                  allow-clear
                  size="small"
                  placeholder="请选择"
                  style="width: 100%"
                  :options="warehouseOpts"
                  :disabled="isDeliveryLineFieldsDisabled(record)"
                  @change="() => onLineWarehouseChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'stockQty'">
                {{ formatDeliveryQty(record.stockQty) }}
              </template>
              <template v-else-if="column.key === 'warehouseStockQty'">
                {{ formatDeliveryQty(record.warehouseStockQty) }}
              </template>
              <template v-else-if="column.key === 'lineRemark'">
                <SalesLineLongTextCell
                  v-if="!isDeliveryLineFieldsDisabled(record)"
                  :value="record.lineRemark"
                  @edit="openLongTextEdit(record, 'lineRemark')"
                />
                <span v-else>{{ record.lineRemark || '—' }}</span>
              </template>
              <template v-else-if="column.key === 'scatterAction'">
                <a-space v-if="!isDeliveryLineShipLocked(record)" :size="0">
                  <a-button
                    type="link"
                    size="small"
                    :disabled="!isDeliveryLineIncluded(record)"
                    @click="openScatterLineEdit(record)"
                  >
                    编辑
                  </a-button>
                  <a-button
                    type="link"
                    size="small"
                    :disabled="!isDeliveryLineIncluded(record)"
                    @click="openScatterDrawer(record)"
                  >
                    选择发运物料
                  </a-button>
                </a-space>
                <span v-else class="line-locked-hint">{{ deliveryLineLockedHint(record) }}</span>
              </template>
              <template v-else>{{ displayCell(record, column) }}</template>
            </template>
            <template #expandedRowRender="{ record }">
              <div class="scatter-picks-panel">
                <div class="scatter-picks-title">已选发运物料</div>
                <a-table
                  v-if="selectedMaterialPicks(record).length"
                  :columns="scatterPickColumns"
                  :data-source="selectedMaterialPicks(record)"
                  :row-key="(r) => r.materialId"
                  size="small"
                  bordered
                  :pagination="false"
                >
                  <template #bodyCell="{ column, record: mat }">
                    <template v-if="column.key === 'shipProgress'">
                      {{
                        formatMaterialShipProgress(
                          mat.shippedQty,
                          mat.appliedQty,
                          mat.orderDemandQty ?? mat.demandQty,
                        )
                      }}
                    </template>
                    <template v-else-if="column.key === 'pickAction'">
                      <a-button
                        type="link"
                        size="small"
                        danger
                        :disabled="isDeliveryLineFieldsDisabled(record)"
                        @click="removeScatterMaterialPick(record, mat)"
                      >
                        删除
                      </a-button>
                    </template>
                  </template>
                </a-table>
                <a-empty v-else description="请点击「选择发运物料」勾选 EBOM" :image="false" />
                <div v-if="record.remark" class="scatter-line-remark">
                  发运备注：{{ record.remark }}
                </div>
              </div>
            </template>
          </a-table>
        </div>
      </div>
    </div>

    <DeliveryShipAttachmentSection
      v-if="showShipAttachmentUi || isAccessoryReship"
      ref="attachmentSectionRef"
      v-model="form.shipAttachments"
      :line-items="form.lineItems"
      :scatter-shipments="form.scatterShipments"
      :sales-order="currentSalesOrder()"
      :sales-order-id="form.salesOrderId || ''"
      :warehouse="form.outboundWarehouse || ''"
      :accessory-reship="isAccessoryReship"
      :anchor-line-items="accessoryReshipAnchorLines"
      :show-bring-standard-kit="isAccessoryReship"
      title="随货配件"
    />

    <ScatterShipDrawer
      v-model:open="scatterDrawerOpen"
      :shipment="activeScatterShipment"
      :sales-order="currentSalesOrder()"
      :exclude-delivery-id="props.record?.id || ''"
      @save="onScatterDrawerSave"
    />

    <DeliveryLineEditModal
      v-model:open="lineEditOpen"
      :line="lineEditTarget"
      :show-ship-qty="lineEditShowShipQty"
      @saved="onLineEditSaved"
    />

    <a-modal
      v-model:open="longTextEdit.open"
      :title="`编辑${longTextEdit.title}`"
      width="640px"
      :mask-closable="false"
      destroy-on-close
      @ok="confirmLongTextEdit"
      @cancel="longTextEdit.open = false"
    >
      <a-textarea
        v-model:value="longTextEdit.draft"
        :rows="10"
        :placeholder="`请输入${longTextEdit.title}`"
        show-count
        :maxlength="5000"
      />
    </a-modal>

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" :loading="saving" @click="handleOk">
        {{ isEdit ? '保存' : '确定' }}
      </a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { customerOptions, shipmentMethodOptions } from '@/mock/salesOrderOptions'
import {
  generateDeliveryCode,
  salesOrderState,
  addDeliveryApplication,
} from '@/store/salesOrderStore'
import { getCustomerByName } from '@/store/customerStore'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { createDeliveryOrder, updateDeliveryOrder } from '@/store/deliveryOrderStore'
import { getPendingPriceChangeDeliveryBlock } from '@/store/salesPriceChangeStore'
import {
  mapSalesLineToDeliveryLine,
  recalcDeliveryLine,
  formatDeliveryQty,
  formatDeliveryPrice,
  formatShipProgress,
  lineShipStatusColor,
  SHIP_PROGRESS_TOOLTIP,
  deliveryDecimalFormatter,
  deliveryDecimalParser,
  roundDeliveryDecimal,
  refreshDeliveryLineStock,
  resolveDeliveryVariantAttr,
  isDeliveryLineShipLocked,
} from '@/utils/deliveryLine'
import {
  getSelectedMaterialPicks,
  initScatterShipment,
  refreshScatterShipmentMeta,
  removeMaterialPickFromShipment,
  sumSelectedShipQty,
  formatMaterialShipProgress,
} from '@/utils/shipEbom'
import ScatterShipDrawer from './ScatterShipDrawer.vue'
import DeliveryLineEditModal from './DeliveryLineEditModal.vue'
import SalesLineLongTextCell from './SalesLineLongTextCell.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import { useInventoryLineTableScroll } from '@/composables/useInventoryLineTableScroll'
import DeliveryShipAttachmentSection from './DeliveryShipAttachmentSection.vue'
import { productHasShipBom, enrichShipAttachmentsWithShipStatus } from '@/utils/shipBomAttachments'
import { calcSalesLineAvailableQty } from '@/utils/salesLineShipped'
import {
  isSalesOutboundByOrder,
  isShipAttachmentDecidedAtApply,
  isShipAttachmentDecidedAtOrder,
  functionParamState,
} from '@/store/functionParamStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import {
  formatAllocationsBarcode,
  preallocateDeliveryBatches,
} from '@/utils/salesOrderDedicatedStock'
import {
  DELIVERY_KIND,
  DELIVERY_TYPE,
  DELIVERY_TYPE_OPTIONS,
  normalizeDeliveryType,
  salesOrderLinesAsAttachmentAnchors,
} from '@/utils/accessoryReship'
import { cloneOrderShipAccessoriesForDelivery } from '@/utils/salesOrderShipAccessories'

const props = defineProps({
  open: Boolean,
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  record: { type: Object, default: null },
  /** create=发货管理新增；apply=销售订单申请发货 */
  mode: { type: String, default: 'create' },
  initialSalesOrderId: { type: String, default: '' },
  /** normal | accessory_reship */
  deliveryKind: { type: String, default: DELIVERY_KIND.NORMAL },
})

const emit = defineEmits(['update:open', 'saved', 'confirmed'])

const isApplyMode = computed(() => props.mode === 'apply')
const isEdit = computed(() => Boolean(props.record?.id))
/** 编辑或已从销售订单带入时，锁定源销售订单 */
const salesOrderLocked = computed(
  () => isEdit.value || isApplyMode.value || Boolean(props.initialSalesOrderId),
)
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/sales/delivery',
  getTitle: () => {
    if (props.record?.id) return '编辑发货单'
    if (props.mode === 'apply' || props.initialSalesOrderId) return '申请发货'
    return '新增发货单'
  },
})
const saving = ref(false)
const scatterDrawerOpen = ref(false)
const activeScatterShipment = ref(null)
const expandedScatterRowKeys = ref([])
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const lineEditShowShipQty = ref(true)
const longTextEdit = reactive({
  open: false,
  title: '',
  fieldKey: '',
  record: null,
  draft: '',
})

const lineColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '纳入本单', key: 'selected', width: 100, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '发货状态', key: 'lineShipStatus', width: 88, align: 'center' },
  { title: '发货进度', key: 'shipProgress', width: 160, align: 'right' },
  { title: '编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 72 },
  { title: '变体属性', key: 'variantAttr', dataIndex: 'variantAttr', width: 140, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '订单数量', key: 'orderQty', width: 96, align: 'right' },
  { title: '单价（不含税）', key: 'unitPriceExTax', width: 120, align: 'right' },
  { title: '单价（含税）', key: 'unitPriceInTax', width: 110, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56, align: 'center' },
  { title: '出库仓库', key: 'shipWarehouse', width: 120 },
  { title: '库存数', key: 'stockQty', width: 100, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 110, align: 'right' },
  { title: '本次发货数量', key: 'shipQty', width: 120, align: 'right' },
  { title: '条码号/批次号', key: 'barcodeBatchNo', width: 160, ellipsis: true },
  { title: '发货重量', key: 'shipWeight', width: 110, align: 'right' },
  { title: '发货总额（不含税）', key: 'deliveryAmountExTax', width: 148, align: 'right' },
  { title: '发货总额（含税）', key: 'deliveryAmountInTax', width: 124, align: 'right' },
  { title: '包装形式', dataIndex: 'packagingForm', width: 88, ellipsis: true },
  { title: '交付方式', key: 'deliveryMode', width: 88, align: 'center' },
  { title: '备注', key: 'lineRemark', width: 140 },
  { title: '操作', key: 'action', width: 72, fixed: 'right' },
]

const scatterLineColumns = computed(() =>
  lineColumns
    .filter((c) => c.key !== 'shipQty')
    .map((c) =>
      c.key === 'action' ? { title: '操作', key: 'scatterAction', width: 168, fixed: 'right' } : c,
    ),
)

const scatterPickColumns = [
  { title: '物料名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '编码', dataIndex: 'code', width: 120, ellipsis: true },
  { title: '规格', dataIndex: 'spec', width: 100, ellipsis: true },
  { title: '发货进度', key: 'shipProgress', width: 130, align: 'right' },
  { title: '需求数量', dataIndex: 'demandQty', width: 88, align: 'right' },
  { title: '可用库存', dataIndex: 'availableStock', width: 88, align: 'right' },
  { title: '本次发运', dataIndex: 'shipQty', width: 88, align: 'right' },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '操作', key: 'pickAction', width: 64, align: 'center' },
]

const form = reactive({
  salesOrderId: undefined,
  salesOrderNo: '',
  deliveryType: DELIVERY_TYPE.SALES,
  deliveryCode: '',
  customerName: undefined,
  shipmentMethod: undefined,
  logisticsNo: '',
  contactPerson: undefined,
  contactPhone: '',
  deliveryDate: null,
  deliveryAddress: '',
  applyOutbound: true,
  outboundWarehouse: undefined,
  driverName: '',
  driverPhone: '',
  plateNo: '',
  remark: '',
  lineItems: [],
  scatterShipments: [],
  shipAttachments: [],
})

const isAccessoryReship = computed(() => form.deliveryType === DELIVERY_TYPE.ACCESSORY_RESHIP)

const {
  panelRef: lineTablePanelRef,
  panelStyle: lineTablePanelStyle,
  tableScroll: lineTableScroll,
  isScrolling: isLineTableScrolling,
} = useInventoryLineTableScroll({
  scrollX: 2900,
  getRowCount: () => form.lineItems?.length || 0,
})

const {
  panelRef: scatterTablePanelRef,
  panelStyle: scatterTablePanelStyle,
  tableScroll: scatterTableScroll,
  isScrolling: isScatterTableScrolling,
} = useInventoryLineTableScroll({
  scrollX: 2800,
  getRowCount: () => form.scatterShipments?.length || 0,
})

const prevHeaderWarehouse = ref(undefined)
const attachmentSectionRef = ref(null)

const showShipAttachmentUi = computed(() => {
  void functionParamState.params.shipAttachmentDecideStage
  if (isAccessoryReship.value) return Boolean(form.salesOrderId || isEdit.value)
  // 申请发货时确定：空白新增单不展示，选定销售订单后再加载
  if (!isShipAttachmentDecidedAtOrder() && !isEdit.value && !form.salesOrderId) return false
  // 申请发货且配置为仓管确定时，不展示附件能力
  return !isApplyMode.value || isShipAttachmentDecidedAtApply()
})

const accessoryReshipAnchorLines = computed(() => {
  if (!isAccessoryReship.value) return []
  return salesOrderLinesAsAttachmentAnchors(currentSalesOrder())
})

function excludeDeliveryIds() {
  return props.record?.id ? [props.record.id] : []
}

function currentSalesOrder() {
  if (!form.salesOrderId) return null
  return salesOrderState.orders.find((o) => o.id === form.salesOrderId) || null
}

const pendingPriceChangeBlock = computed(() =>
  isEdit.value ? '' : getPendingPriceChangeDeliveryBlock(form.salesOrderId),
)

function syncAttachmentKitSetsFromWholeLines() {
  if (!showShipAttachmentUi.value) return
  attachmentSectionRef.value?.syncKitSetsFromWholeLines()
}

function lineHasShipAttachmentHint(record) {
  if (!showShipAttachmentUi.value) return false
  if (attachmentSectionRef.value) return attachmentSectionRef.value.lineHasHint(record)
  const productId = record?.productId || record?.itemId
  if (productId && productHasShipBom(productId)) return true
  const pid = String(productId || '')
  const code = String(record?.productCode || '')
  return (form.shipAttachments || []).some(
    (a) =>
      (pid && String(a.productId) === pid) ||
      (code && a.productCode === code) ||
      (record?.id && a.salesLineId === record.id) ||
      (record?.salesLineId && a.salesLineId === record.salesLineId),
  )
}

const customerOpts = customerOptions.map((c) => ({ label: c.label, value: c.value }))
const shipmentMethodOpts = shipmentMethodOptions.map((v) => ({ label: v, value: v }))
const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

function normalizeShipmentMethod(value) {
  const map = {
    送货上门: '送货',
    专车配送: '送货',
    物料: '物流',
  }
  const normalized = map[value] || value
  return shipmentMethodOptions.includes(normalized) ? normalized : undefined
}

function resolveDefaultShipmentMethod(customerName, fallback) {
  const customer = getCustomerByName(customerName)
  return (
    normalizeShipmentMethod(customer?.defaultDeliveryMethod) ||
    normalizeShipmentMethod(fallback) ||
    '送货'
  )
}

const salesOrderOpts = computed(() =>
  (salesOrderState.orders || []).map((o) => ({
    label: `${o.orderNo} · ${o.customerName || ''}`,
    value: o.id,
  })),
)

const contactOpts = computed(() => {
  const customer = customerOptions.find((c) => c.value === form.customerName)
  return (customer?.contacts || []).map((c) => ({ label: c.name, value: c.name, phone: c.phone }))
})

watch(
  () => [
    isActive.value,
    props.initialSalesOrderId,
    props.mode,
    props.record?.id,
    props.deliveryKind,
  ],
  ([active]) => {
    if (!active) return
    if (props.record) {
      loadFromRecord(props.record)
      return
    }
    if (isApplyMode.value) {
      const soId = props.initialSalesOrderId
      // 切回标签时保留用户已填内容；仅在订单变化时重载
      if (form.salesOrderId || form.lineItems.length || form.shipAttachments.length) {
        if (soId && form.salesOrderId && soId !== form.salesOrderId) {
          resetForm()
          const so = salesOrderState.orders.find((o) => o.id === soId)
          if (so) {
            form.salesOrderId = so.id
            populateFromSalesOrder(so)
          }
        }
        return
      }
      if (!soId) return
      resetForm()
      const so = salesOrderState.orders.find((o) => o.id === soId)
      if (so) {
        form.salesOrderId = so.id
        populateFromSalesOrder(so)
      }
      return
    }
    // 新增发货：已有编辑中内容则不重置（保活切签）
    if (form.salesOrderId || form.lineItems.length || form.deliveryCode) return
    resetForm()
  },
  { immediate: true },
)

function resetForm() {
  form.salesOrderId = undefined
  form.salesOrderNo = ''
  form.deliveryType = normalizeDeliveryType(props.deliveryKind)
  form.deliveryCode = ''
  form.customerName = undefined
  form.shipmentMethod = undefined
  form.logisticsNo = ''
  form.contactPerson = undefined
  form.contactPhone = ''
  form.deliveryDate = null
  form.deliveryAddress = ''
  form.applyOutbound = true
  form.outboundWarehouse = undefined
  form.driverName = ''
  form.driverPhone = ''
  form.plateNo = ''
  form.remark = ''
  form.lineItems = []
  form.scatterShipments = []
  form.shipAttachments = []
  expandedScatterRowKeys.value = []
  prevHeaderWarehouse.value = undefined
}

function applyDefaultWarehouseToLines(lines) {
  const warehouse = form.outboundWarehouse || ''
  ;(lines || []).forEach((line) => {
    if (!line.shipWarehouse) line.shipWarehouse = warehouse
    refreshDeliveryLineStock(line)
  })
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal
  prevHeaderWarehouse.value = newVal

  const hasLines = form.lineItems.length > 0 || form.scatterShipments.length > 0
  if (!changed || !newVal || !hasLines) return

  Modal.confirm({
    title: '出库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      form.lineItems.forEach((line) => {
        line.shipWarehouse = newVal
        refreshDeliveryLineStock(line)
      })
      form.scatterShipments.forEach((line) => {
        line.shipWarehouse = newVal
        refreshDeliveryLineStock(line)
      })
    },
  })
}

function onLineWarehouseChange(line) {
  refreshDeliveryLineStock(line)
}

function loadFromRecord(record) {
  form.salesOrderId = record.salesOrderId
  form.salesOrderNo = record.salesOrderNo || record.sourceOrderNo || ''
  form.deliveryType = normalizeDeliveryType(record.deliveryType || record.deliveryKind)
  form.deliveryCode = record.deliveryCode || ''
  form.customerName = record.customerName
  form.shipmentMethod = resolveDefaultShipmentMethod(record.customerName, record.shipmentMethod)
  form.logisticsNo = record.logisticsNo || ''
  form.contactPerson = record.contactPerson || undefined
  form.contactPhone = record.contactPhone || ''
  form.deliveryDate = record.documentDate ? dayjs(record.documentDate) : null
  form.deliveryAddress = record.deliveryAddress || ''
  form.applyOutbound = Boolean(record.applyOutbound)
  form.outboundWarehouse = record.outboundWarehouse || undefined
  prevHeaderWarehouse.value = form.outboundWarehouse
  form.driverName = record.driverName || ''
  form.driverPhone = record.driverPhone || ''
  form.plateNo = record.plateNo || ''
  form.remark = record.remark || ''
  form.lineItems = JSON.parse(JSON.stringify(record.lineItems || [])).map((line) => {
    if (line.selected == null) line.selected = true
    line.shipWeight = roundDeliveryDecimal(line.shipWeight ?? line.itemWeightKg ?? 0, 4)
    line.unitPriceInTax = roundDeliveryDecimal(line.unitPriceInTax ?? 0, 4)
    if (!line.shipWarehouse) line.shipWarehouse = form.outboundWarehouse || ''
    line.variantAttr = resolveDeliveryVariantAttr(line)
    recalcDeliveryLine(line)
    refreshDeliveryLineStock(line)
    return line
  })
  form.scatterShipments = JSON.parse(JSON.stringify(record.scatterShipments || []))
  form.scatterShipments.forEach((s) => {
    if (s.selected == null) s.selected = true
    s.shipWeight = roundDeliveryDecimal(s.shipWeight ?? s.itemWeightKg ?? 0, 4)
    s.unitPriceInTax = roundDeliveryDecimal(s.unitPriceInTax ?? 0, 4)
    if (!s.shipWarehouse) s.shipWarehouse = form.outboundWarehouse || ''
    s.variantAttr = resolveDeliveryVariantAttr(s)
    recalcDeliveryLine(s)
    refreshScatterShipmentMeta(s)
    refreshDeliveryLineStock(s)
  })
  form.shipAttachments = enrichShipAttachmentsWithShipStatus(
    JSON.parse(JSON.stringify(record.shipAttachments || [])),
    salesOrderState.orders.find((o) => o.id === record.salesOrderId) || null,
    { preserveShipQty: true },
  )
  restoreExcludedSalesLines()
  pruneShipAttachmentsToCurrentDelivery()
  syncExpandedScatterRows()
}

function restoreExcludedSalesLines() {
  const so = currentSalesOrder()
  if (!so) return
  const wholeIds = new Set((form.lineItems || []).map((line) => line.salesLineId || line.id))
  ;(so.lineItems || []).forEach((line) => {
    const mapped = mapSalesLineToDeliveryLine(line, so)
    if (!mapped) return
    const id = mapped.salesLineId || mapped.id
    if (!id || wholeIds.has(id)) return
    mapped.selected = false
    if (!mapped.shipWarehouse) mapped.shipWarehouse = form.outboundWarehouse || ''
    refreshDeliveryLineStock(mapped)
    form.lineItems.push(mapped)
  })
  const scatterIds = new Set(
    (form.scatterShipments || []).map((line) => line.salesLineId || line.id),
  )
  ;(so.lineItems || []).forEach((line) => {
    const mapped = initScatterShipment(line, so)
    if (!mapped) return
    const id = mapped.salesLineId || mapped.id
    if (!id || scatterIds.has(id)) return
    mapped.selected = false
    if (!mapped.shipWarehouse) mapped.shipWarehouse = form.outboundWarehouse || ''
    refreshDeliveryLineStock(mapped)
    form.scatterShipments.push(mapped)
  })
}

function isDeliveryLineIncluded(record) {
  return record?.selected !== false
}

function isDeliveryLineFieldsDisabled(record) {
  return isDeliveryLineShipLocked(record) || !isDeliveryLineIncluded(record)
}

function onDeliveryLineIncludeChange(record, checked) {
  if (!record || isDeliveryLineShipLocked(record)) return
  record.selected = checked
  pruneShipAttachmentsToCurrentDelivery()
}

function currentDeliveryLinesForAttachments() {
  const lines = []
  const push = (row) => {
    if (!row) return
    if (!isDeliveryLineIncluded(row)) return
    // 已发完产品不再带出发货附件
    if (isDeliveryLineShipLocked(row)) return
    const productId = row.productId || row.itemId
    const productCode = row.productCode || row.itemCode || ''
    if (!productId && !productCode) return
    lines.push({
      id: row.salesLineId || row.id,
      productId,
      productCode,
      productName: row.productName || row.itemName || '',
      salesQty: row.orderQty ?? row.salesQty ?? row.qty,
      qty: row.orderQty ?? row.salesQty ?? row.qty,
      orderQty: row.orderQty,
    })
  }
  ;(form.lineItems || []).forEach(push)
  ;(form.scatterShipments || []).forEach(push)
  return lines
}

function deliveryLineRowClassName(record) {
  if (isDeliveryLineShipLocked(record) || !isDeliveryLineIncluded(record)) {
    return 'delivery-line-locked'
  }
  return ''
}

function deliveryLineLockedHint(record) {
  const confirmed = Number(record?.confirmedOutboundQty ?? record?.shippedQty) || 0
  const orderQty = Number(record?.orderQty) || 0
  if (orderQty > 0 && confirmed >= orderQty - 1e-9) return '已发完'
  return '待出库占用'
}

function lineRemainShipQty(record) {
  if (!record) return 0
  if (record.remainShipQty != null) return Math.max(0, Number(record.remainShipQty) || 0)
  return Math.max(
    0,
    Number(record.orderQty) - Number(record.appliedShipQty ?? record.shippedQty ?? 0),
  )
}

function savableWholeLines() {
  return (form.lineItems || []).filter(
    (line) =>
      isDeliveryLineIncluded(line) && !isDeliveryLineShipLocked(line) && Number(line.shipQty) > 0,
  )
}

function savableScatterShipments() {
  return (form.scatterShipments || []).filter(
    (ship) =>
      isDeliveryLineIncluded(ship) &&
      !isDeliveryLineShipLocked(ship) &&
      getSelectedMaterialPicks(ship).length > 0,
  )
}

function isAttachmentOnCurrentDelivery(att) {
  if (!att) return false
  if (att.fromOrderSnapshot) return true
  // 未关联产品的手工附件保留
  if (!att.productId && !att.productCode && !att.productName && !att.salesLineId) return true
  const lines = currentDeliveryLinesForAttachments()
  return lines.some((line) => {
    if (att.salesLineId && (att.salesLineId === line.id || att.salesLineId === line.salesLineId)) {
      return true
    }
    if (
      att.productId &&
      (String(att.productId) === String(line.productId) ||
        String(att.productId) === String(line.id))
    ) {
      return true
    }
    const attCode = att.productCode || ''
    const lineCode = line.productCode || line.itemCode || ''
    if (attCode && lineCode && attCode === lineCode) return true
    return false
  })
}

/** 发货附件仅保留「本单整机/散件产品」对应行，避免带出订单上未纳入本单的产品附件 */
function pruneShipAttachmentsToCurrentDelivery() {
  if (attachmentSectionRef.value) {
    attachmentSectionRef.value.pruneToCurrentDelivery()
    return
  }
  form.shipAttachments = (form.shipAttachments || []).filter(isAttachmentOnCurrentDelivery)
}

function rebuildShipAttachmentsFromCurrentDelivery({ merge = false } = {}) {
  if (!showShipAttachmentUi.value) return
  // 等销售订单和随货配件快照传到子组件后再重建，避免用空清单覆盖订单快照
  nextTick(() => {
    attachmentSectionRef.value?.rebuildFromCurrentDelivery({ merge })
  })
}

function markDeliveryLinesIncluded(lines) {
  ;(lines || []).forEach((line) => {
    if (line.selected == null) line.selected = true
  })
}

function populateFromSalesOrder(so) {
  if (!so) return
  form.salesOrderNo = so.orderNo
  form.customerName = so.customerName
  form.contactPerson = so.contactPerson || undefined
  form.contactPhone = so.contactPhone || ''
  form.deliveryAddress = so.deliveryAddress || ''
  form.shipmentMethod = resolveDefaultShipmentMethod(so.customerName, so.deliveryMethod)
  // 再次申请：已发完产品仍展示（置灰），未发完可继续填写剩余数量
  form.lineItems = (so.lineItems || [])
    .map((line) => mapSalesLineToDeliveryLine(line, so))
    .filter(Boolean)
  form.scatterShipments = (so.lineItems || [])
    .map((line) => initScatterShipment(line, so))
    .filter(Boolean)
  form.scatterShipments.forEach((s) => refreshScatterShipmentMeta(s))
  markDeliveryLinesIncluded(form.lineItems)
  markDeliveryLinesIncluded(form.scatterShipments)
  applyDefaultWarehouseToLines(form.lineItems)
  applyDefaultWarehouseToLines(form.scatterShipments)
  form.shipAttachments =
    showShipAttachmentUi.value && so.shipAccessories?.length
      ? cloneOrderShipAccessoriesForDelivery(so, {
          warehouse: form.outboundWarehouse || '',
        })
      : []
  if (showShipAttachmentUi.value) {
    rebuildShipAttachmentsFromCurrentDelivery({ merge: false })
  }
  syncExpandedScatterRows()
}

function onSalesOrderChange(id) {
  const so = salesOrderState.orders.find((o) => o.id === id)
  populateFromSalesOrder(so)
}

function selectedMaterialPicks(record) {
  return getSelectedMaterialPicks(record)
}

function syncExpandedScatterRows() {
  expandedScatterRowKeys.value = form.scatterShipments
    .filter((s) => getSelectedMaterialPicks(s).length > 0)
    .map((s) => s.salesLineId)
}

function openScatterDrawer(ship) {
  if (!isDeliveryLineIncluded(ship) || isDeliveryLineShipLocked(ship)) {
    message.info('该产品已发完或未纳入本单，不可再选择发运物料')
    return
  }
  activeScatterShipment.value = ship
  scatterDrawerOpen.value = true
}

function openLineEdit(record) {
  if (!isDeliveryLineIncluded(record) || isDeliveryLineShipLocked(record)) {
    message.info('该产品已发完或未纳入本单，不可编辑')
    return
  }
  lineEditTarget.value = record
  lineEditShowShipQty.value = true
  lineEditOpen.value = true
}

function openLongTextEdit(record, fieldKey) {
  longTextEdit.record = record
  longTextEdit.fieldKey = fieldKey
  longTextEdit.title = fieldKey === 'lineRemark' ? '备注' : '内容'
  longTextEdit.draft = record[fieldKey] || ''
  longTextEdit.open = true
}

function confirmLongTextEdit() {
  if (longTextEdit.record && longTextEdit.fieldKey) {
    longTextEdit.record[longTextEdit.fieldKey] = longTextEdit.draft || ''
  }
  longTextEdit.open = false
}

function openScatterLineEdit(record) {
  if (!isDeliveryLineIncluded(record) || isDeliveryLineShipLocked(record)) {
    message.info('该产品已发完或未纳入本单，不可编辑')
    return
  }
  lineEditTarget.value = record
  lineEditShowShipQty.value = false
  lineEditOpen.value = true
}

function onLineEditSaved(updated) {
  const wholeIdx = form.lineItems.findIndex((line) => line.id === updated.id)
  if (wholeIdx !== -1) {
    Object.assign(form.lineItems[wholeIdx], updated)
    recalcDeliveryLine(form.lineItems[wholeIdx])
    refreshDeliveryLineStock(form.lineItems[wholeIdx])
    return
  }
  const scatterIdx = form.scatterShipments.findIndex(
    (ship) => ship.salesLineId === updated.salesLineId || ship.id === updated.id,
  )
  if (scatterIdx !== -1) {
    Object.assign(form.scatterShipments[scatterIdx], updated)
    recalcDeliveryLine(form.scatterShipments[scatterIdx])
    refreshScatterShipmentMeta(form.scatterShipments[scatterIdx])
    refreshDeliveryLineStock(form.scatterShipments[scatterIdx])
  }
}

function onScatterLinePriceChange(record) {
  recalcDeliveryLine(record)
}

function onScatterDrawerSave(payload) {
  if (!activeScatterShipment.value) return
  Object.assign(activeScatterShipment.value, payload)
  if (payload.shipSets != null) {
    activeScatterShipment.value.shipSets = payload.shipSets
  }
  refreshScatterShipmentMeta(activeScatterShipment.value)
  const id = activeScatterShipment.value.salesLineId
  if (
    getSelectedMaterialPicks(activeScatterShipment.value).length &&
    !expandedScatterRowKeys.value.includes(id)
  ) {
    expandedScatterRowKeys.value = [...expandedScatterRowKeys.value, id]
  }
  syncExpandedScatterRows()
}

function removeScatterMaterialPick(shipment, mat) {
  removeMaterialPickFromShipment(shipment, mat.materialId)
  syncExpandedScatterRows()
}

function onLineCalc(record) {
  recalcDeliveryLine(record)
  syncAttachmentKitSetsFromWholeLines()
  refreshLineBatchPreview(record)
}

function refreshLineBatchPreview(line) {
  if (isDeliveryLineShipLocked(line)) return { ok: true }
  const so = currentSalesOrder()
  const shipQty = Number(line.shipQty) || 0
  if (!(shipQty > 0) || !so) {
    line.batchAllocations = []
    line.barcodeBatchNo = ''
    line.manualBatchPick = false
    return { ok: true }
  }
  if (!isSalesOutboundByOrder()) {
    line.batchAllocations = []
    line.barcodeBatchNo = ''
    line.manualBatchPick = false
    return { ok: true }
  }
  const salesLine = (so.lineItems || []).find((l) => l.id === line.salesLineId || l.id === line.id)
  const res = preallocateDeliveryBatches({
    salesOrder: so,
    salesLine,
    itemCode: line.productCode,
    warehouse: line.shipWarehouse || form.outboundWarehouse || undefined,
    shipQty,
    stockFulfillmentMode: salesLine?.stockFulfillmentMode,
  })
  if (!res.ok) {
    line.batchAllocations = []
    line.barcodeBatchNo = ''
    return res
  }
  line.batchAllocations = res.allocations
  line.barcodeBatchNo = formatAllocationsBarcode(res.allocations)
  line.manualBatchPick = true
  return res
}

function displayCell(record, column) {
  const val = record[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '-'
}

function onContactChange(name) {
  const contact = contactOpts.value.find((c) => c.value === name)
  if (contact?.phone) form.contactPhone = contact.phone
}

function onCustomerChange(name) {
  form.customerName = name
  form.shipmentMethod = resolveDefaultShipmentMethod(name, form.shipmentMethod)
  form.contactPerson = undefined
  form.contactPhone = ''
}

function validateWholeMachineLines() {
  const so = currentSalesOrder()
  const lines = (form.lineItems || []).filter(
    (line) => isDeliveryLineIncluded(line) && !isDeliveryLineShipLocked(line),
  )
  if (!lines.length) return true
  for (const line of lines) {
    const shipQty = Number(line.shipQty)
    if (!shipQty && shipQty !== 0) {
      message.warning(`「${line.productName}」请填写本次发货数量`)
      return false
    }
    if (shipQty <= 0) {
      message.warning(`「${line.productName}」本次发货数量须大于 0；若不发此产品请取消纳入本单`)
      return false
    }
    const salesLine = (so?.lineItems || []).find(
      (l) => l.id === line.salesLineId || l.id === line.id,
    )
    const maxQty = salesLine
      ? calcSalesLineAvailableQty(so, salesLine, { excludeIds: excludeDeliveryIds() })
      : lineRemainShipQty(line)
    if (shipQty > maxQty + 1e-9) {
      message.warning(
        `「${line.productName}」本次发货数量不能超过可发数量 ${formatDeliveryQty(maxQty)}（订单 ${formatDeliveryQty(line.orderQty)}，已申请 ${formatDeliveryQty(line.appliedShipQty)}）`,
      )
      return false
    }
    const pre = refreshLineBatchPreview(line)
    if (!pre.ok) {
      message.error(`「${line.productName}」${pre.message}`)
      return false
    }
  }
  return true
}

function validateScatterShipments() {
  const ships = (form.scatterShipments || []).filter(
    (ship) => isDeliveryLineIncluded(ship) && !isDeliveryLineShipLocked(ship),
  )
  for (const ship of ships) {
    if (!getSelectedMaterialPicks(ship).length) {
      message.warning(`散件行「${ship.productName}」请选择发运物料；若不发请取消纳入本单`)
      return false
    }
    const sets = Number(ship.shipSets)
    const maxSets =
      ship.maxShipSets != null
        ? Number(ship.maxShipSets)
        : Math.max(0, Number(ship.orderQty) - Number(ship.appliedShipQty || 0))
    if (Number.isFinite(sets) && sets > maxSets + 1e-9) {
      message.warning(`散件「${ship.productName}」发货套数不能大于可发套数 ${maxSets}`)
      return false
    }
  }
  return true
}

function validateShipAttachments() {
  if (!showShipAttachmentUi.value) return true
  return attachmentSectionRef.value?.validate() !== false
}

function handleOk() {
  if (!form.salesOrderId) {
    message.warning('请选择源销售订单')
    return
  }
  if (pendingPriceChangeBlock.value) {
    message.warning(pendingPriceChangeBlock.value)
    return
  }
  if (!form.deliveryType) {
    message.warning('请选择发货类型')
    return
  }
  if (!form.customerName) {
    message.warning('请选择客户名称')
    return
  }
  if (!form.shipmentMethod) {
    message.warning('请选择交货方式')
    return
  }

  const wholeLines = savableWholeLines()
  const scatterLines = savableScatterShipments()
  const unlockedWhole = (form.lineItems || []).filter(
    (l) => isDeliveryLineIncluded(l) && !isDeliveryLineShipLocked(l),
  )
  const unlockedScatter = (form.scatterShipments || []).filter(
    (s) => isDeliveryLineIncluded(s) && !isDeliveryLineShipLocked(s),
  )
  const selectedAtt = (form.shipAttachments || []).filter(
    (a) => a.selected !== false && (Number(a.shipQty) || 0) > 0,
  )

  if (!form.lineItems.length && !form.scatterShipments.length && !selectedAtt.length) {
    message.warning('请选择销售订单并确认有可发运明细或随货配件')
    return
  }
  if (!wholeLines.length && !scatterLines.length && !selectedAtt.length) {
    message.warning(
      isAccessoryReship.value
        ? '请至少纳入一条未发完产品，或勾选随货配件并填写数量'
        : '本单没有可发的产品。若只需补发配件，请将发货类型改为「配件补发」后再添加配件',
    )
    return
  }
  if (!isAccessoryReship.value && !wholeLines.length && !scatterLines.length) {
    message.warning('请至少纳入一条未发完产品并填写发货数量')
    return
  }

  if (unlockedWhole.length && !validateWholeMachineLines()) return
  if (unlockedScatter.length && !validateScatterShipments()) return
  if (!validateShipAttachments()) return

  if (isEdit.value) {
    const linked = findLinkedSalesOutbound(props.record)
    if (linked && linked.status !== '待出库') {
      message.warning('关联出库单已出库，不允许修改发货数量。请新建发货单继续发剩余数量。')
      return
    }
  }

  wholeLines.forEach(recalcDeliveryLine)

  const accessoryQty = selectedAtt.reduce((s, a) => s + (Number(a.shipQty) || 0), 0)

  const payload = {
    salesOrderId: form.salesOrderId,
    salesOrderNo: form.salesOrderNo,
    deliveryCode: form.deliveryCode?.trim() || generateDeliveryCode(),
    documentDate: form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : '',
    customerName: form.customerName,
    shipmentMethod: form.shipmentMethod,
    logisticsNo: form.logisticsNo,
    contactPerson: form.contactPerson || '',
    contactPhone: form.contactPhone,
    deliveryAddress: form.deliveryAddress,
    applyOutbound: form.applyOutbound,
    outboundWarehouse: form.outboundWarehouse,
    driverName: form.driverName,
    driverPhone: form.driverPhone,
    plateNo: form.plateNo,
    remark: form.remark,
    deliveryType: form.deliveryType || DELIVERY_TYPE.SALES,
    deliveryKind: isAccessoryReship.value ? DELIVERY_KIND.ACCESSORY_RESHIP : DELIVERY_KIND.NORMAL,
    lineItems: JSON.parse(JSON.stringify(wholeLines)),
    scatterShipments: JSON.parse(JSON.stringify(scatterLines)),
    shipAttachments: JSON.parse(
      JSON.stringify(
        showShipAttachmentUi.value || isEdit.value || isAccessoryReship.value
          ? form.shipAttachments || []
          : [],
      ),
    ),
  }

  saving.value = true
  try {
    if (isEdit.value) {
      const res = updateDeliveryOrder(props.record.id, payload)
      if (res && res.ok === false) {
        message.warning(res.message || '保存失败')
        return
      }
      const synced = res?.outboundSynced ? '，关联待出库出库单已同步更新' : ''
      message.success(`已保存${synced}`)
      emit('saved')
      closeAfterSave()
      return
    }
    if (isApplyMode.value) {
      const wholeQty = (payload.lineItems || []).reduce((s, l) => s + (Number(l.shipQty) || 0), 0)
      const scatterQty = (payload.scatterShipments || []).reduce(
        (s, ship) => s + sumSelectedShipQty(ship),
        0,
      )
      addDeliveryApplication(payload.salesOrderId, {
        ...payload,
        totalShipQty: wholeQty + scatterQty + accessoryQty,
      })
      message.success('发货申请已记录')
      emit('confirmed', payload)
      emit('saved')
    } else {
      createDeliveryOrder(payload)
      message.success('发货单已创建')
      emit('saved')
    }
    closeAfterSave()
  } finally {
    saving.value = false
  }
}
</script>

<script>
export default { name: 'DeliveryFormModal' }
</script>

<style lang="less" scoped>
@import '@/views/inventory/components/inventoryLineTablePanel.less';

:deep(.form-create-page.apply-delivery-form) {
  height: auto;
  max-height: none;
  overflow: visible;

  .form-body {
    overflow: visible;
    display: flex;
    flex-direction: column;
    padding-bottom: 12px;
  }
}

:deep(.ant-modal.apply-delivery-form) {
  .ant-modal-body {
    max-height: calc(100vh - 160px);
    overflow: auto;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding-bottom: 12px;
  }
}

.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;

  &.section-block--lines {
    min-width: 0;
    display: flex;
    flex-direction: column;
    margin-bottom: 0;
  }
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.88);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.th-tip-icon {
  margin-left: 4px;
  color: rgba(0, 0, 0, 0.45);
}

.th-nowrap {
  display: inline-block;
  white-space: nowrap;
}

.ship-att-hint-tag {
  margin-left: 6px;
  vertical-align: middle;
}

.section-divider {
  margin: 8px 0 12px;
}

.scatter-picks-panel {
  margin: 4px 0 8px 48px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px dashed #e8e8e8;
  border-radius: 4px;
}

.scatter-picks-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 8px;
  color: rgba(0, 0, 0, 0.88);
}

.scatter-line-remark {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
}

:deep(.ant-table-expanded-row > .ant-table-cell) {
  padding: 8px 12px !important;
  background: #fff;
}

:deep(.ant-table-cell) {
  .ant-input-number {
    width: 100%;
  }
}

.line-locked-hint {
  color: rgba(0, 0, 0, 0.35);
  font-size: 12px;
}

.pending-price-alert {
  margin: 8px 0 0;
}

:deep(.delivery-line-locked) > td {
  color: rgba(0, 0, 0, 0.35) !important;
  background: #f5f5f5 !important;
}

:deep(.delivery-line-locked) .ant-input-number,
:deep(.delivery-line-locked) .ant-select-selector,
:deep(.delivery-line-locked) .ant-input {
  background: #f5f5f5 !important;
  color: rgba(0, 0, 0, 0.35);
}
</style>
