<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="apply-delivery-modal"
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
          <a-col :span="12">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                size="small"
                placeholder="请输入 备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="form.lineItems.length" class="section-block">
      <div class="section-title">整机发货</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 2900 }"
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
          <template v-else>
            <span class="th-nowrap">{{ column.title }}</span>
          </template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
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
              :disabled="isDeliveryLineShipLocked(record)"
              @change="onLineCalc(record)"
            />
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
              :disabled="isDeliveryLineShipLocked(record)"
              @change="onLineCalc(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryUnitPriceInTax'">
            <a-tooltip title="发货单价按申请时订单有效价锁定，改价请走订单价格变更">
              <span class="price-locked-wrap">
                <a-input-number
                  v-model:value="record.deliveryUnitPriceInTax"
                  size="small"
                  :min="0"
                  :precision="4"
                  :formatter="deliveryDecimalFormatter"
                  :parser="deliveryDecimalParser"
                  style="width: 100%"
                  disabled
                  @change="onLineCalc(record)"
                />
              </span>
            </a-tooltip>
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
              :disabled="isDeliveryLineShipLocked(record)"
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
              v-if="!isDeliveryLineShipLocked(record)"
              :value="record.lineRemark"
              @edit="openLongTextEdit(record, 'lineRemark')"
            />
            <span v-else>{{ record.lineRemark || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="!isDeliveryLineShipLocked(record)" :size="0">
              <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="removeWholeLineFromOrder(index)">
                移出本单
              </a-button>
            </a-space>
            <span v-else class="line-locked-hint">{{ deliveryLineLockedHint(record) }}</span>
          </template>
          <template v-else>{{ displayCell(record, column) }}</template>
        </template>
      </a-table>
    </div>

    <div v-if="form.scatterShipments.length" class="section-block">
      <div class="section-title">散件发运</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="scatterLineColumns"
        :data-source="form.scatterShipments"
        row-key="salesLineId"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 2800 }"
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
          <template v-else>
            <span class="th-nowrap">{{ column.title }}</span>
          </template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
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
              :disabled="isDeliveryLineShipLocked(record)"
              @change="onScatterLinePriceChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'deliveryUnitPriceInTax'">
            <a-tooltip title="发货单价按申请时订单有效价锁定，改价请走订单价格变更">
              <span class="price-locked-wrap">
                <a-input-number
                  v-model:value="record.deliveryUnitPriceInTax"
                  size="small"
                  :min="0"
                  :precision="4"
                  :formatter="deliveryDecimalFormatter"
                  :parser="deliveryDecimalParser"
                  style="width: 100%"
                  disabled
                  @change="onScatterLinePriceChange(record)"
                />
              </span>
            </a-tooltip>
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
              :disabled="isDeliveryLineShipLocked(record)"
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
              v-if="!isDeliveryLineShipLocked(record)"
              :value="record.lineRemark"
              @edit="openLongTextEdit(record, 'lineRemark')"
            />
            <span v-else>{{ record.lineRemark || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'scatterAction'">
            <a-space v-if="!isDeliveryLineShipLocked(record)" :size="0">
              <a-button type="link" size="small" @click="openScatterLineEdit(record)"
                >编辑</a-button
              >
              <a-button type="link" size="small" @click="openScatterDrawer(record)">
                选择发运物料
              </a-button>
              <a-button type="link" size="small" danger @click="removeScatterLineFromOrder(index)">
                移出本单
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

    <div class="section-block">
      <div class="section-title-row">
        <div class="section-title">
          发货附件
          <a-tooltip
            title="按产品分组管理发运附件包。套数展示为「已选择套数/订单套数」；可通过「从发运BOM添加」多次累加套数（可大于订单套数，用于赠送）。"
          >
            <QuestionCircleOutlined class="th-tip-icon" />
          </a-tooltip>
        </div>
        <a-space :size="8">
          <a-button size="small" @click="openAddFromShipBom">从发运BOM添加</a-button>
          <a-button type="primary" size="small" @click="attachmentPickerOpen = true">
            手工添加
          </a-button>
        </a-space>
      </div>
      <a-divider class="section-divider" />

      <a-alert
        v-if="shipAttachmentProductSummaries.length"
        type="info"
        show-icon
        class="ship-att-alert"
        :message="shipAttachmentAlertMessage"
      />

      <a-empty
        v-if="!shipAttachmentProductSummaries.length"
        description="暂无发货附件（选择销售订单后，有发运 BOM 的产品会按产品分组列出）"
      />

      <a-collapse
        v-else
        v-model:active-key="attachmentActiveKey"
        accordion
        class="ship-att-collapse"
      >
        <a-collapse-panel
          v-for="group in shipAttachmentProductSummaries"
          :key="group.key"
          :header="attachmentGroupHeader(group)"
        >
          <template #extra>
            <a-space :size="8" @click.stop>
              <span class="ship-att-sets-label">
                已选套数：{{ attachmentGroupKitSets(group) }}/{{ attachmentGroupOrderSets(group) }}
              </span>
              <a-input-number
                size="small"
                :min="0"
                :precision="0"
                :value="attachmentGroupKitSets(group)"
                style="width: 88px"
                :disabled="group.key === '__unlinked__'"
                @change="(val) => onAttachmentGroupKitSetsChange(group, val)"
              />
              <a-button
                type="link"
                size="small"
                @click="setProductAttachmentsSelected(group, true)"
              >
                全部纳入
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="setProductAttachmentsSelected(group, false)"
              >
                全部不纳入
              </a-button>
            </a-space>
          </template>

          <a-table
            :columns="shipAttachmentColumns"
            :data-source="attachmentsOfGroup(group)"
            row-key="id"
            size="small"
            bordered
            :pagination="false"
            :scroll="{ x: 1200 }"
          >
            <template #headerCell="{ column }">
              <template v-if="column.key === 'shipProgress'">
                <span>
                  发货进度
                  <a-tooltip title="已发货数量 / 已申请数量 / 计划数量（订单套数×单位用量）">
                    <QuestionCircleOutlined class="th-tip-icon" />
                  </a-tooltip>
                </span>
              </template>
              <template v-else>{{ column.title }}</template>
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'index'">
                {{ attachmentsOfGroup(group).indexOf(record) + 1 }}
              </template>
              <template v-else-if="column.key === 'selected'">
                <a-checkbox v-model:checked="record.selected" />
              </template>
              <template v-else-if="column.key === 'shipStatus'">
                <a-tag :color="attachmentShipStatusColor(record.shipStatus)">
                  {{ record.shipStatus || '未发货' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'shipProgress'">
                {{
                  formatAttachmentShipProgress(record.shippedQty, record.appliedQty, record.planQty)
                }}
              </template>
              <template v-else-if="column.key === 'source'">
                <a-tag :color="record.source === 'BOM' ? 'blue' : 'default'">
                  {{ record.source || '手工' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'productName'">
                <a-select
                  v-if="record.source === '手工'"
                  :value="record.productId || ''"
                  size="small"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  placeholder="不关联"
                  style="width: 100%"
                  :options="shipAttachmentProductOpts"
                  @change="(val) => onManualAttachmentProductChange(record, val)"
                />
                <template v-else>
                  {{ record.productName || '—' }}
                  <span v-if="record.productCode" class="ship-att-line-code">
                    （{{ record.productCode }}）
                  </span>
                </template>
              </template>
              <template v-else-if="column.key === 'unitQty'">
                {{ formatDeliveryQty(record.unitQty) }}
              </template>
              <template v-else-if="column.key === 'kitSets'">
                <a-input-number
                  v-model:value="record.kitSets"
                  size="small"
                  :min="0"
                  :precision="0"
                  style="width: 100%"
                  :disabled="record.selected === false"
                  @change="() => onAttachmentRowKitSetsChange(record)"
                />
              </template>
              <template v-else-if="column.key === 'shipQty'">
                <a-input-number
                  v-model:value="record.shipQty"
                  size="small"
                  :min="0"
                  :precision="4"
                  style="width: 100%"
                  :disabled="record.selected === false"
                />
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button type="link" size="small" danger @click="removeShipAttachment(record)">
                  删除
                </a-button>
              </template>
              <template v-else>{{ record[column.dataIndex] || '—' }}</template>
            </template>
          </a-table>
        </a-collapse-panel>
      </a-collapse>
    </div>

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

    <SelectBomMaterialModal
      v-model:open="attachmentPickerOpen"
      :multiple="true"
      :include-spu-templates="false"
      @selected="onAttachmentMaterialsPicked"
    />

    <a-modal
      v-model:open="shipBomAddOpen"
      title="从发运BOM添加"
      ok-text="添加"
      destroy-on-close
      @ok="confirmAddFromShipBom"
    >
      <a-form layout="vertical" class="ship-bom-add-form">
        <a-form-item label="产品" required>
          <a-select
            v-model:value="shipBomAddForm.productKey"
            placeholder="请选择本单产品"
            show-search
            option-filter-prop="label"
            :options="shipBomAddProductOpts"
          />
        </a-form-item>
        <a-form-item label="添加套数" required>
          <a-input-number
            v-model:value="shipBomAddForm.addSets"
            :min="1"
            :precision="0"
            style="width: 100%"
            placeholder="支持多于订单套数（赠送）"
          />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          message="可多次添加。添加套数可大于订单套数，用于随机多赠送等场景；本次发运 = 套数 × 单位用量。"
        />
      </a-form>
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
import { computed, reactive, ref, watch } from 'vue'
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
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import {
  collectShipAttachmentsFromSalesLines,
  createShipAttachmentLine,
  mergeShipAttachmentLists,
  productHasShipBom,
  summarizeShipAttachmentsByProduct,
  enrichShipAttachmentsWithShipStatus,
  attachmentShipStatusColor,
  formatAttachmentShipProgress,
  applyKitSetsToAttachmentGroup,
  calcAttachmentShipQtyBySets,
  addShipBomAttachmentSets,
} from '@/utils/shipBomAttachments'
import { getActiveShipBomForProduct } from '@/store/productBomStore'
import { calcSalesLineAvailableQty } from '@/utils/salesLineShipped'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import { getFreeQtyByItemCode, getLineAllocatedQty } from '@/store/salesStockAllocationStore'

const props = defineProps({
  open: Boolean,
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  record: { type: Object, default: null },
  /** create=发货管理新增；apply=销售订单申请发货 */
  mode: { type: String, default: 'create' },
  initialSalesOrderId: { type: String, default: '' },
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
  getTitle: () => (isEdit.value ? '编辑发货单' : '新增发货单'),
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
  { title: '发货重量', key: 'shipWeight', width: 110, align: 'right' },
  { title: '发货单价（含税）', key: 'deliveryUnitPriceInTax', width: 148, align: 'right' },
  { title: '发货总额（含税）', key: 'deliveryAmountInTax', width: 124, align: 'right' },
  { title: '包装形式', dataIndex: 'packagingForm', width: 88, ellipsis: true },
  { title: '交付方式', key: 'deliveryMode', width: 88, align: 'center' },
  { title: '备注', key: 'lineRemark', width: 140 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

const scatterLineColumns = computed(() =>
  lineColumns
    .filter((c) => c.key !== 'shipQty')
    .map((c) =>
      c.key === 'action' ? { title: '操作', key: 'scatterAction', width: 240, fixed: 'right' } : c,
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

const prevHeaderWarehouse = ref(undefined)
const attachmentPickerOpen = ref(false)
const shipBomAddOpen = ref(false)
const shipBomAddForm = reactive({
  productKey: undefined,
  addSets: 1,
})

const shipAttachmentColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '纳入本单', key: 'selected', width: 88, align: 'center' },
  { title: '发货状态', key: 'shipStatus', width: 88, align: 'center' },
  { title: '发货进度', key: 'shipProgress', width: 140, align: 'right' },
  { title: '关联产品', key: 'productName', dataIndex: 'productName', width: 180, ellipsis: true },
  { title: '来源', key: 'source', width: 72 },
  { title: '物料编码', dataIndex: 'materialCode', width: 120, ellipsis: true },
  { title: '物料名称', dataIndex: 'materialName', width: 140, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '单位用量', key: 'unitQty', width: 88, align: 'right' },
  { title: '发货套数', key: 'kitSets', width: 100 },
  { title: '本次发运', key: 'shipQty', width: 110 },
  { title: '操作', key: 'action', width: 72, align: 'center' },
]

const attachmentActiveKey = ref('')

const shipAttachmentProductSummaries = computed(() =>
  summarizeShipAttachmentsByProduct(form.shipAttachments),
)

/** 本单产品（整机+散件），供手工附件关联下拉 */
const shipAttachmentProductOpts = computed(() => {
  const map = new Map()
  const push = (line) => {
    if (!line) return
    const id = String(line.productId || line.itemId || line.salesLineId || line.id || '')
    if (!id || map.has(id)) return
    const code = line.productCode || line.itemCode || ''
    const name = line.productName || line.itemName || ''
    map.set(id, {
      value: id,
      label: [name, code].filter(Boolean).join(' / ') || id,
      productId: line.productId || line.itemId || id,
      productCode: code,
      productName: name,
      salesLineId: line.salesLineId || line.id || '',
    })
  }
  ;(form.lineItems || []).forEach(push)
  ;(form.scatterShipments || []).forEach(push)
  return [{ value: '', label: '不关联' }, ...Array.from(map.values())]
})

const shipAttachmentAlertMessage = computed(() => {
  const groups = shipAttachmentProductSummaries.value
  if (!groups.length) return ''
  const names = groups.map((g) => g.productName).filter(Boolean)
  const picked = groups.reduce((s, g) => s + g.selectedCount, 0)
  const total = groups.reduce((s, g) => s + g.total, 0)
  const done = (form.shipAttachments || []).filter((r) => r.shipStatus === '已发完').length
  const doneHint = done ? `其中 ${done} 项历史已发完，后续发货可不勾选。` : ''
  return `本单 ${groups.length} 组发货附件（${names.join('、')}），共 ${total} 项；已纳入 ${picked} 项。${doneHint}仅展示本单整机/散件产品的附件，请按产品填写发货套数并勾选是否随货发出。`
})

function excludeDeliveryIds() {
  return props.record?.id ? [props.record.id] : []
}

function attachmentGroupHeader(group) {
  if (group.key === '__unlinked__') {
    const totalPcs = attachmentGroupTotalPieces(group)
    return `${group.productName} · 附件 ${group.total} 项 · 已纳入 ${group.selectedCount}/${group.total} 共计：${formatDeliveryQty(totalPcs)} 件`
  }
  const selected = attachmentGroupKitSets(group)
  const orderSets = attachmentGroupOrderSets(group)
  const totalPcs = attachmentGroupTotalPieces(group)
  return `${group.productName}${group.productCode ? `（${group.productCode}）` : ''} · 附件 ${group.total} 项 · 已选套数：${selected}/${orderSets} · 已纳入 ${group.selectedCount}/${group.total} 共计：${formatDeliveryQty(totalPcs)} 件`
}

/** 已纳入附件的本次发运件数合计 */
function attachmentGroupTotalPieces(group) {
  return attachmentsOfGroup(group)
    .filter((r) => r.selected !== false)
    .reduce((s, r) => s + (Number(r.shipQty) || 0), 0)
}

function attachmentsOfGroup(group) {
  if (!group) return []
  const pid = String(group.productId || '')
  const code = String(group.productCode || '')
  const name = String(group.productName || '')
  const unlinked = group.key === '__unlinked__' || name === '不关联'
  return (form.shipAttachments || []).filter((row) => {
    const rowUnlinked = !row.productId && !row.productCode && !row.productName
    if (unlinked) return rowUnlinked
    return (
      (pid && String(row.productId) === pid) ||
      (!pid && code && row.productCode === code) ||
      (!pid && !code && row.productName === name)
    )
  })
}

function attachmentGroupKitSets(group) {
  const rows = attachmentsOfGroup(group)
  const withSets = rows.find((r) => r.kitSets != null)
  if (withSets) return Number(withSets.kitSets) || 0
  return group?.kitSets != null ? Number(group.kitSets) : 0
}

/** 订单套数（该产品在销售订单上的数量） */
function attachmentGroupOrderSets(group) {
  const so = currentSalesOrder()
  const line =
    (so?.lineItems || []).find((l) => String(l.id) === String(group.salesLineId)) ||
    (so?.lineItems || []).find(
      (l) =>
        String(l.productId || l.itemId) === String(group.productId) ||
        (group.productCode && (l.productCode || l.itemCode) === group.productCode),
    )
  if (line) return Number(line.salesQty ?? line.qty ?? line.orderQty) || 0

  const whole = (form.lineItems || []).find(
    (l) =>
      String(l.productId || l.itemId) === String(group.productId) ||
      l.salesLineId === group.salesLineId ||
      (group.productCode && (l.productCode || l.itemCode) === group.productCode),
  )
  const scatter = (form.scatterShipments || []).find(
    (l) =>
      String(l.productId || l.itemId) === String(group.productId) ||
      l.salesLineId === group.salesLineId ||
      (group.productCode && (l.productCode || l.itemCode) === group.productCode),
  )
  const local = whole || scatter
  return Number(local?.orderQty) || 0
}

function onAttachmentGroupKitSetsChange(group, val) {
  const sets = Math.max(0, Number(val) || 0)
  form.shipAttachments = applyKitSetsToAttachmentGroup(form.shipAttachments, group.key, sets)
}

function onAttachmentRowKitSetsChange(record) {
  if (!record) return
  const unitQty = Number(record.unitQty) || 1
  record.shipQty = calcAttachmentShipQtyBySets(unitQty, record.kitSets)
}

function removeShipAttachment(record) {
  const idx = form.shipAttachments.findIndex((r) => r.id === record.id)
  if (idx !== -1) form.shipAttachments.splice(idx, 1)
}

/** 整机本次发货数量变更时，同步同产品附件套数建议 */
function syncAttachmentKitSetsFromWholeLines() {
  const so = currentSalesOrder()
  ;(form.lineItems || []).forEach((line) => {
    if (isDeliveryLineShipLocked(line)) return
    const pid = String(line.productId || line.itemId || '')
    const key = pid || String(line.productCode || line.productName || '')
    if (!key) return
    const hasAtt = (form.shipAttachments || []).some(
      (a) =>
        (pid && String(a.productId) === pid) ||
        (line.salesLineId && a.salesLineId === line.salesLineId) ||
        (line.id && a.salesLineId === line.id),
    )
    if (!hasAtt) return
    const groupKey = pid || String(line.productCode || line.productName)
    const sets = Number(line.shipQty) || 0
    form.shipAttachments = applyKitSetsToAttachmentGroup(form.shipAttachments, groupKey, sets)
  })
  if (so) refreshAttachmentShipStatus(true)
}

function currentSalesOrder() {
  if (!form.salesOrderId) return null
  return salesOrderState.orders.find((o) => o.id === form.salesOrderId) || null
}

const pendingPriceChangeBlock = computed(() =>
  isEdit.value ? '' : getPendingPriceChangeDeliveryBlock(form.salesOrderId),
)

function refreshAttachmentShipStatus(preserveShipQty = false) {
  const so = currentSalesOrder()
  form.shipAttachments = enrichShipAttachmentsWithShipStatus(form.shipAttachments, so, {
    preserveShipQty,
  })
}

function onManualAttachmentProductChange(record, productKey) {
  if (!record) return
  const key = productKey == null ? '' : String(productKey)
  if (!key) {
    record.productId = ''
    record.productCode = ''
    record.productName = ''
    record.salesLineId = ''
    refreshAttachmentShipStatus(true)
    return
  }
  const opt = shipAttachmentProductOpts.value.find((o) => String(o.value) === key)
  if (!opt || opt.value === '') {
    record.productId = ''
    record.productCode = ''
    record.productName = ''
    record.salesLineId = ''
    refreshAttachmentShipStatus(true)
    return
  }
  record.productId = opt.productId || ''
  record.productCode = opt.productCode || ''
  record.productName = opt.productName || ''
  record.salesLineId = opt.salesLineId || ''
  refreshAttachmentShipStatus(true)
}

function lineHasShipAttachmentHint(record) {
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

function setProductAttachmentsSelected(group, selected) {
  if (!group) return
  const pid = String(group.productId || '')
  const code = String(group.productCode || '')
  const name = String(group.productName || '')
  const unlinked = group.key === '__unlinked__' || name === '不关联'
  form.shipAttachments.forEach((row) => {
    const rowUnlinked = !row.productId && !row.productCode && !row.productName
    const match = unlinked
      ? rowUnlinked
      : (pid && String(row.productId) === pid) ||
        (!pid && code && row.productCode === code) ||
        (!pid && !code && row.productName === name)
    if (match) row.selected = selected
  })
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
  () => [isActive.value, props.initialSalesOrderId, props.mode, props.record?.id],
  ([active]) => {
    if (!active) return
    if (props.record) {
      loadFromRecord(props.record)
      return
    }
    if (isApplyMode.value) {
      const soId = props.initialSalesOrderId
      // 切回标签时保留用户已填内容；仅在订单变化时重载
      if (form.salesOrderId || form.lineItems.length) {
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
  pruneShipAttachmentsToCurrentDelivery()
  attachmentActiveKey.value = shipAttachmentProductSummaries.value[0]?.key || ''
  syncExpandedScatterRows()
}

function currentDeliveryLinesForAttachments() {
  const lines = []
  const push = (row) => {
    if (!row) return
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
  return isDeliveryLineShipLocked(record) ? 'delivery-line-locked' : ''
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
    (line) => !isDeliveryLineShipLocked(line) && Number(line.shipQty) > 0,
  )
}

function savableScatterShipments() {
  return (form.scatterShipments || []).filter(
    (ship) => !isDeliveryLineShipLocked(ship) && getSelectedMaterialPicks(ship).length > 0,
  )
}

function isAttachmentOnCurrentDelivery(att) {
  if (!att) return false
  // 未关联产品的手工附件保留
  if (!att.productId && !att.productCode && !att.productName && !att.salesLineId) return true
  const lines = currentDeliveryLinesForAttachments()
  return lines.some((line) => {
    if (att.salesLineId && (att.salesLineId === line.id || att.salesLineId === line.salesLineId)) {
      return true
    }
    if (att.productId && String(att.productId) === String(line.productId)) return true
    if (att.productCode && att.productCode === line.productCode) return true
    return false
  })
}

/** 发货附件仅保留「本单整机/散件产品」对应行，避免带出订单上未纳入本单的产品附件 */
function pruneShipAttachmentsToCurrentDelivery() {
  form.shipAttachments = (form.shipAttachments || []).filter(isAttachmentOnCurrentDelivery)
  if (
    attachmentActiveKey.value &&
    !shipAttachmentProductSummaries.value.some((g) => g.key === attachmentActiveKey.value)
  ) {
    attachmentActiveKey.value = shipAttachmentProductSummaries.value[0]?.key || ''
  }
}

function rebuildShipAttachmentsFromCurrentDelivery({ merge = false } = {}) {
  const so = currentSalesOrder()
  const fromBom = enrichShipAttachmentsWithShipStatus(
    collectShipAttachmentsFromSalesLines(currentDeliveryLinesForAttachments(), {
      warehouse: form.outboundWarehouse,
    }),
    so,
  )
  if (merge) {
    form.shipAttachments = enrichShipAttachmentsWithShipStatus(
      mergeShipAttachmentLists(fromBom, form.shipAttachments),
      so,
      { preserveShipQty: true },
    )
  } else {
    form.shipAttachments = fromBom
  }
  pruneShipAttachmentsToCurrentDelivery()
  syncAttachmentKitSetsFromWholeLines()
  attachmentActiveKey.value = shipAttachmentProductSummaries.value[0]?.key || ''
}

function removeWholeLineFromOrder(index) {
  form.lineItems.splice(index, 1)
  pruneShipAttachmentsToCurrentDelivery()
}

function removeScatterLineFromOrder(index) {
  form.scatterShipments.splice(index, 1)
  pruneShipAttachmentsToCurrentDelivery()
  syncExpandedScatterRows()
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
  applyDefaultWarehouseToLines(form.lineItems)
  applyDefaultWarehouseToLines(form.scatterShipments)
  rebuildShipAttachmentsFromCurrentDelivery({ merge: false })
  syncExpandedScatterRows()
}

const shipBomAddProductOpts = computed(() => {
  return currentDeliveryLinesForAttachments()
    .filter((line) => productHasShipBom(line.productId))
    .map((line) => {
      const key = String(line.id || line.productId || line.productCode)
      const label = [line.productName, line.productCode].filter(Boolean).join(' / ') || key
      return {
        value: key,
        label,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        salesLineId: line.id || '',
        orderSets: Number(line.orderQty ?? line.salesQty ?? line.qty) || 0,
      }
    })
})

function openAddFromShipBom() {
  if (!form.salesOrderId) {
    message.warning('请先选择销售订单')
    return
  }
  if (!shipBomAddProductOpts.value.length) {
    message.warning('本单产品均无生效发运 BOM，请先配置或使用手工添加')
    return
  }
  shipBomAddForm.productKey = shipBomAddProductOpts.value[0]?.value
  shipBomAddForm.addSets = 1
  shipBomAddOpen.value = true
}

function confirmAddFromShipBom() {
  const opt = shipBomAddProductOpts.value.find((o) => o.value === shipBomAddForm.productKey)
  if (!opt) {
    message.warning('请选择产品')
    return Promise.reject()
  }
  const addSets = Math.max(1, Number(shipBomAddForm.addSets) || 0)
  if (!addSets) {
    message.warning('请填写添加套数')
    return Promise.reject()
  }
  const shipBom = getActiveShipBomForProduct(opt.productId)
  if (!shipBom) {
    message.warning(`产品「${opt.productName}」无生效发运 BOM`)
    return Promise.reject()
  }
  form.shipAttachments = enrichShipAttachmentsWithShipStatus(
    addShipBomAttachmentSets(form.shipAttachments, shipBom, {
      addSets,
      productId: opt.productId,
      productCode: opt.productCode,
      productName: opt.productName,
      salesLineId: opt.salesLineId,
      orderSets: opt.orderSets || addSets,
      warehouse: form.outboundWarehouse,
    }),
    currentSalesOrder(),
    { preserveShipQty: true },
  )
  const groupKey = String(opt.productId || opt.productCode || opt.productName)
  attachmentActiveKey.value = groupKey
  shipBomAddOpen.value = false
  const curSets =
    (form.shipAttachments || []).find(
      (r) =>
        (opt.productId && String(r.productId) === String(opt.productId)) ||
        (opt.productCode && r.productCode === opt.productCode),
    )?.kitSets ?? addSets
  message.success(
    `已为「${opt.productName}」添加 ${addSets} 套发运附件（当前套数：${curSets}/${opt.orderSets}）`,
  )
}

function onAttachmentMaterialsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  list.forEach((item) => {
    const code = item.code || item.itemCode || ''
    if (!code) return
    const exists = form.shipAttachments.find(
      (r) => r.materialCode === code && r.source === '手工' && !r.salesLineId,
    )
    if (exists) {
      exists.shipQty = (Number(exists.shipQty) || 0) + 1
      return
    }
    form.shipAttachments.push(
      createShipAttachmentLine({
        materialCode: code,
        materialName: item.name || item.itemName || '',
        specModel: item.specModel || item.spec || '',
        material: item.material || '',
        drawingNo: item.drawingNo || '',
        unit: item.unit || item.inventoryUnit || '件',
        shipQty: 1,
        source: '手工',
        productId: '',
        productCode: '',
        productName: '',
        salesLineId: '',
        warehouse: form.outboundWarehouse,
        selected: true,
      }),
    )
  })
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
  if (isDeliveryLineShipLocked(ship)) {
    message.info('该产品已发完，不可再选择发运物料')
    return
  }
  activeScatterShipment.value = ship
  scatterDrawerOpen.value = true
}

function openLineEdit(record) {
  if (isDeliveryLineShipLocked(record)) {
    message.info('该产品已发完，不可编辑')
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
  if (isDeliveryLineShipLocked(record)) {
    message.info('该产品已发完，不可编辑')
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
  const lines = (form.lineItems || []).filter((line) => !isDeliveryLineShipLocked(line))
  if (!lines.length) return true
  for (const line of lines) {
    const shipQty = Number(line.shipQty)
    if (!shipQty && shipQty !== 0) {
      message.warning(`「${line.productName}」请填写本次发货数量`)
      return false
    }
    if (shipQty <= 0) {
      message.warning(`「${line.productName}」本次发货数量须大于 0；若不发此产品请移出本单`)
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
    if (so?.id) {
      const alloc = getLineAllocatedQty(so.id, salesLine?.id || line.salesLineId || line.id)
      const free = getFreeQtyByItemCode(line.productCode)
      const softAvail = alloc + free
      if (shipQty > softAvail + 1e-9) {
        message.warning(
          `「${line.productName}」本单占用 ${alloc} + 自由备货 ${free} = ${softAvail}，本次申请 ${shipQty} 超出软占用口径（仍允许提交，建议补货）`,
        )
      }
    }
  }
  return true
}

function validateScatterShipments() {
  const ships = (form.scatterShipments || []).filter((ship) => !isDeliveryLineShipLocked(ship))
  for (const ship of ships) {
    if (!getSelectedMaterialPicks(ship).length) {
      message.warning(`散件行「${ship.productName}」请选择发运物料；若不发请移出本单`)
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
  for (const group of shipAttachmentProductSummaries.value) {
    if (group.key === '__unlinked__') continue
    const sets = attachmentGroupKitSets(group)
    const selected = attachmentsOfGroup(group).filter((r) => r.selected !== false)
    if (selected.length && sets <= 0) {
      message.warning(
        `产品「${group.productName}」已纳入附件，请填写发货套数（可为赠送多于订单套数）`,
      )
      return false
    }
  }
  return true
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
  const unlockedWhole = (form.lineItems || []).filter((l) => !isDeliveryLineShipLocked(l))
  const unlockedScatter = (form.scatterShipments || []).filter((s) => !isDeliveryLineShipLocked(s))

  if (!form.lineItems.length && !form.scatterShipments.length) {
    message.warning('请选择销售订单并确认有可发运明细')
    return
  }
  if (!unlockedWhole.length && !unlockedScatter.length) {
    message.warning('本单产品均已发完，无法再次申请发货')
    return
  }
  if (!wholeLines.length && !scatterLines.length) {
    message.warning('请至少填写一条未发完产品的发货数量，或不发的产品请移出本单')
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
    lineItems: JSON.parse(JSON.stringify(wholeLines)),
    scatterShipments: JSON.parse(JSON.stringify(scatterLines)),
    shipAttachments: JSON.parse(JSON.stringify(form.shipAttachments || [])),
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
        totalShipQty: wholeQty + scatterQty,
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
.section-block {
  margin-bottom: 12px;

  &:last-child {
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

.ship-att-alert {
  margin-bottom: 10px;
}

.ship-att-collapse {
  margin-bottom: 8px;

  :deep(.ant-collapse-header) {
    align-items: center !important;
  }

  :deep(.ant-collapse-extra) {
    margin-left: 12px;
  }
}

.ship-att-sets-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  white-space: nowrap;
}

.ship-bom-add-form {
  margin-top: 8px;
}

.ship-att-line-code {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
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

.price-locked-wrap {
  display: block;
  width: 100%;
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
