<template>
  <div class="sales-order-detail-page">
    <a-spin :spinning="loading">
      <template v-if="order">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ order.orderNo }}</span>
              <a-tag :color="salesOrderStatusColor(order.progressStatus)">{{
                order.progressStatus
              }}</a-tag>
              <a-tag :color="salesDeliveryStatusColor(order.deliveryStatus)">
                {{ order.deliveryStatus || '未发货' }}
              </a-tag>
            </div>
            <a-space :size="8">
              <template v-if="canEditSalesOrder(order)">
                <a-button
                  v-if="canSubmitSalesOrder(order)"
                  type="primary"
                  size="small"
                  @click="handleSubmit"
                >
                  提交审核
                </a-button>
                <a-button
                  v-if="canResubmitSalesOrder(order)"
                  type="primary"
                  size="small"
                  @click="handleResubmit"
                >
                  重新提交
                </a-button>
                <a-button size="small" @click="handleEdit">编辑</a-button>
                <a-button size="small" danger @click="handleDelete">删除</a-button>
              </template>
              <template v-else-if="canApproveSalesOrder(order)">
                <a-button type="primary" size="small" @click="openApprovePage">审核</a-button>
                <a-button size="small" @click="handleWithdraw">撤回</a-button>
              </template>
              <template v-else-if="canRevokeSalesOrderApproval(order)">
                <a-button size="small" @click="handleRevokeApprove">反审</a-button>
                <a-button type="primary" size="small" @click="handleApplyDelivery"
                  >申请发货</a-button
                >
                <a-button size="small" @click="handlePriceChange">
                  {{ pendingPriceChange ? '审核价格变更' : '价格变更' }}
                </a-button>
                <a-button size="small" @click="handleChangeDeliveryMode">变更交付方式</a-button>
                <a-button size="small" @click="handleComplete">完成</a-button>
                <a-button size="small" danger @click="handleTerminate">作废</a-button>
              </template>
              <a-button size="small" @click="openPrint">打印</a-button>
              <a-button size="small" @click="handleBack">返回列表</a-button>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="activeTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="overview" tab="概览" />
              <a-tab-pane key="shipping" :tab="`发货信息 (${shippingTabCount})`" />
              <a-tab-pane key="inbound" :tab="`入库信息 (${inboundRows.length})`" />
              <a-tab-pane key="purchase" :tab="`采购 (${purchaseTabCount})`" />
              <a-tab-pane key="production" :tab="`生产 (${productionTabCount})`" />
              <a-tab-pane key="outsourcing" :tab="`外协 (${relations.outsourcingOrders.length})`" />
              <a-tab-pane key="attachments" :tab="`附件 (${relations.attachments.length})`" />
              <a-tab-pane key="ebom-info">
                <template #tab>
                  <span>EBOM信息</span>
                  <a-badge
                    v-if="bomChangedCount"
                    :count="bomChangedCount"
                    :number-style="{ backgroundColor: '#fa8c16', marginLeft: '6px' }"
                  />
                </template>
              </a-tab-pane>
              <a-tab-pane key="price-change" :tab="`价格变更 (${priceChangeCount})`" />
              <a-tab-pane key="industrial-label" :tab="`工业标识 (${industrialLabelSnCount})`" />
              <a-tab-pane key="approval" tab="审批信息" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'overview'">
            <a-alert
              v-if="pendingPriceChange"
              type="warning"
              show-icon
              class="pending-price-alert"
              :message="`价格变更「${pendingPriceChange.changeNo}」待审核，通过前不可申请发货。`"
            />
            <div class="section-card">
              <div class="section-title">基本信息</div>
              <SalesOrderBasicInfoSection :order="order" />
            </div>

            <div class="section-card">
              <div class="price-summary-header">
                <div class="section-title">价格汇总</div>
                <div class="discount-strategy-row">
                  <span class="strategy-label">折扣策略</span>
                  <a-tag bordered :color="discountStrategyTagColor" class="discount-strategy-tag">
                    {{ discountStrategyLabel }}
                  </a-tag>
                </div>
              </div>

              <a-row :gutter="[16, 12]" class="price-summary-grid">
                <a-col :span="8">
                  <div class="price-summary-item">
                    <div class="price-label">
                      行优惠（合计）
                      <a-tooltip :title="lineDiscountTooltip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </div>
                    <div class="price-value discount">
                      -￥{{ formatMoney(orderPricing.lineDiscountTotal) }}
                    </div>
                  </div>
                </a-col>
                <a-col :span="8">
                  <div class="price-summary-item">
                    <div class="price-label">
                      整单优惠合计
                      <a-tooltip :title="orderDiscountTooltip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </div>
                    <div class="price-value discount">
                      -￥{{ formatMoney(orderPricing.orderDiscountTotal) }}
                    </div>
                  </div>
                </a-col>
                <a-col :span="8">
                  <div class="price-summary-item">
                    <div class="price-label">优惠总额</div>
                    <div class="price-value discount">
                      -￥{{ formatMoney(orderPricing.totalDiscountAmount) }}
                    </div>
                  </div>
                </a-col>
              </a-row>

              <a-divider class="price-summary-divider" />

              <a-row :gutter="[16, 12]" class="price-summary-grid">
                <a-col :span="6">
                  <div class="price-summary-item">
                    <div class="price-label">
                      销售总额（不含税）
                      <a-tooltip :title="lineAmountExTaxTooltip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </div>
                    <div class="price-value">￥{{ formatMoney(orderPricing.lineAmountExTax) }}</div>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="price-summary-item">
                    <div class="price-label">
                      销售总额（含税）
                      <a-tooltip :title="lineAmountInTaxTooltip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </div>
                    <div class="price-value">￥{{ formatMoney(orderPricing.lineAmountInTax) }}</div>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="price-summary-item">
                    <div class="price-label">
                      最终成交额（不含税）
                      <a-tooltip :title="finalAmountExTaxTooltip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </div>
                    <div class="price-value price-value-final">
                      ￥{{ formatMoney(orderPricing.amountExTax) }}
                    </div>
                  </div>
                </a-col>
                <a-col :span="6">
                  <div class="price-summary-item">
                    <div class="price-label">
                      最终成交额（含税）
                      <a-tooltip :title="finalAmountInTaxTooltip">
                        <QuestionCircleOutlined class="label-tip-icon" />
                      </a-tooltip>
                    </div>
                    <div class="price-value price-value-final">
                      ￥{{ formatMoney(orderPricing.amountInTax) }}
                    </div>
                  </div>
                </a-col>
              </a-row>

              <div v-if="order.orderDiscountReason" class="discount-reason-row">
                <span class="reason-label">优惠原因</span>
                <span class="reason-text">{{ order.orderDiscountReason }}</span>
              </div>
            </div>

            <div v-if="showLiveStockRemind" class="section-card">
              <div class="section-title">库存提醒</div>
              <SalesOrderStockRemindPanel :order="order" />
            </div>

            <div class="section-card">
              <div class="section-title">销售明细</div>
              <a-table
                :columns="lineColumns"
                :data-source="order.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineTableScrollX }"
              >
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'businessType'">
                    {{ resolveLineBusinessType(line, order) }}
                  </template>
                  <template v-else-if="column.key === 'needIndustrialLabel'">
                    {{ line.needIndustrialLabel ? '是' : '否' }}
                  </template>
                  <template v-else-if="column.key === 'industrialLabelStatus'">
                    <a-tag
                      v-if="line.industrialLabelStatus && line.industrialLabelStatus !== '—'"
                      :color="industrialLabelStatusColor(line.industrialLabelStatus)"
                    >
                      {{ line.industrialLabelStatus }}
                    </a-tag>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'industrialLabelSuccessCount'">
                    {{
                      line.needIndustrialLabel
                        ? formatQty(line.industrialLabelSuccessCount || 0)
                        : '—'
                    }}
                  </template>
                  <template v-else-if="column.key === 'deliveryMode'">
                    <a-tag :color="line.deliveryMode === '散件' ? 'orange' : 'blue'">
                      {{ line.deliveryMode || '整机' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'stockFulfillmentMode'">
                    {{ stockFulfillmentModeLabel(line.stockFulfillmentMode) }}
                  </template>
                  <template
                    v-else-if="column.key === 'stockTakeQty' || column.key === 'planProduceQty'"
                  >
                    {{
                      line[column.dataIndex] == null || line[column.dataIndex] === ''
                        ? '—'
                        : formatQty(line[column.dataIndex])
                    }}
                  </template>
                  <template v-else-if="column.key === 'lineDiscountRate'">
                    {{ formatDiscountRatePercent(line.lineDiscountRate) }}
                  </template>
                  <template v-else-if="column.key === 'salesQty' || column.key === 'taxRate'">
                    {{ formatQty(line[column.dataIndex]) }}
                  </template>
                  <template v-else-if="isMoneyColumn(column.key)">
                    {{ formatMoneyCell(line, column) }}
                  </template>
                  <template v-else>
                    {{ displayCell(line, column) }}
                  </template>
                </template>
              </a-table>
            </div>

            <div class="section-card">
              <div class="section-title">工业标识</div>
              <div class="section-hint">
                审核时按「现货占用 + 排产缺口」预申请
                SN。成品入库不自动挂码；小程序装牌确认后再挂到实物。失败或部分成功时可重试 /
                补申请。
              </div>
              <a-table
                :columns="industrialLabelLineColumns"
                :data-source="industrialLabelRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 720 }"
                :locale="{ emptyText: '本单无需工业标识' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'need'">
                    {{ row.needIndustrialLabel ? '是' : '否' }}
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag
                      v-if="row.status && row.status !== '—'"
                      :color="industrialLabelStatusColor(row.status)"
                    >
                      {{ row.status }}
                    </a-tag>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-space v-if="canOperateIndustrialLabel">
                      <a
                        v-if="row.canRetry"
                        class="link-code"
                        @click.prevent="handleRetryIndustrialLabel(row)"
                      >
                        重试
                      </a>
                      <a
                        v-if="row.canSupplement"
                        class="link-code"
                        @click.prevent="openSupplementIndustrialLabel(row)"
                      >
                        补申请
                      </a>
                    </a-space>
                    <span v-else>—</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'ebom-info'">
            <div class="section-card">
              <div class="section-title">EBOM 信息</div>
              <div class="section-hint">
                展示各明细行现行
                EBOM（始终为最新版本）；「初始版本」为订单审核通过时生成的快照版本。
              </div>
              <a-table
                :columns="ebomColumns"
                :data-source="salesOrderEbomRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: ebomTableScrollX }"
                :locale="{ emptyText: '暂无销售明细' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'index'">{{ row.index }}</template>
                  <template v-else-if="column.key === 'ebomStatus'">
                    <a-tag :color="row.ebomStatusColor">{{ row.ebomStatus }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'bomName'">
                    <a
                      v-if="row.bomId"
                      class="link-code"
                      @click.prevent="openBomDetail(row.bomId, row.bomName)"
                    >
                      {{ row.bomName }}
                    </a>
                    <span v-else>{{ row.bomName }}</span>
                  </template>
                  <template v-else-if="column.key === 'boundVersion'">
                    <span>{{ row.boundVersion }}</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>

            <div v-if="bomChangedLines.length" class="section-card">
              <div class="section-title">EBOM 版本变更</div>
              <div v-for="line in bomChangedLines" :key="line.id" class="bom-product-block">
                <div class="bom-line-head">
                  <span class="bom-product-name">{{ line.productName }}</span>
                  <span class="bom-product-code">{{ line.productCode }}</span>
                  <a-tag color="orange">初始版本 {{ line.bomVersion || '—' }}</a-tag>
                  <a-tag v-if="lineActiveVersion(line)" color="blue">
                    现行版本 {{ lineActiveVersion(line) }}
                  </a-tag>
                </div>
                <BomVersionInfoSection
                  :product-id="line.productId"
                  :bom-id="line.bomId"
                  :bound-version="line.bomVersion"
                  :compare-quantity="Number(line.salesQty ?? line.qty) || 1"
                />
                <SalesOrderEbomDiffSection :line="line" />
              </div>
            </div>
          </template>

          <template v-else-if="activeTab === 'shipping'">
            <div class="section-card">
              <div class="section-title">发货申请</div>
              <a-table
                :columns="deliveryColumns"
                :data-source="relations.deliveryApplications"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: deliveryTableScrollX }"
                :locale="{ emptyText: '暂无发货申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'deliveryStatus'">
                    <a-tag :color="deliveryStatusColor(row.deliveryStatus)">
                      {{ row.deliveryStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'deliveryCode'">
                    <a v-if="row.deliveryOrderId" class="link-code" @click="goDeliveryDetail(row)">
                      {{ row.deliveryCode }}
                    </a>
                    <span v-else>{{ row.deliveryCode || '—' }}</span>
                  </template>
                  <template v-else-if="column.key === 'applyShipQty'">
                    {{ formatOutboundQtyInt(row.applyShipQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualOutboundQty'">
                    {{ formatOutboundQtyInt(row.actualOutboundQty) }}
                  </template>
                  <template v-else-if="column.key === 'shipWeight'">
                    {{ formatShipWeight(row.shipWeight) }}
                  </template>
                  <template v-else-if="column.key === 'totalAmountExTax'">
                    {{ formatAmountExTax(row.totalAmountExTax) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card shipping-outbound-section">
              <div class="section-title">出库信息</div>
              <a-table
                :columns="outboundColumns"
                :data-source="outboundRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: outboundTableScrollX }"
                :locale="{ emptyText: '暂无出库信息' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'outboundOrderNo'">
                    <a
                      v-if="row.outboundId || row.outboundOrderNo"
                      class="link-code"
                      @click="goOutboundDetail(row)"
                    >
                      {{ row.outboundOrderNo || '—' }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'applyQty'">
                    {{ formatQty(row.applyQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualQty'">
                    {{ formatQty(row.actualQty) }}
                  </template>
                  <template v-else-if="column.key === 'barcodeBatchNo'">
                    <span :title="row.barcodeBatchNo || ''">{{ row.barcodeBatchNo || '—' }}</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'inbound'">
            <div class="section-card">
              <div class="section-title">入库信息</div>
              <a-table
                :columns="inboundLineColumns"
                :data-source="inboundRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: inboundTableScrollX }"
                :locale="{ emptyText: '暂无入库明细' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goInboundDetail(row)">
                      {{ row.docNo || '—' }}
                    </a>
                  </template>
                  <template v-else-if="column.key === 'applyQty'">
                    {{ formatQty(row.applyQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualQty'">
                    {{ formatQty(row.actualQty) }}
                  </template>
                  <template v-else-if="column.key === 'barcodeBatchNo'">
                    <span :title="row.barcodeBatchNo || ''">{{ row.barcodeBatchNo || '—' }}</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'purchase'">
            <div class="section-card">
              <div class="section-title">采购申请</div>
              <a-table
                :columns="purchaseReqColumns"
                :data-source="relations.purchaseRequisitions"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: purchaseReqTableScrollX }"
                class="sub-table"
                :locale="{ emptyText: '暂无采购申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'docStatus'">
                    <a-tag :color="purchaseReqStatusColor(row.docStatus)">
                      {{ row.docStatus || row.status || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'reqNo'">
                    <a class="link-code" @click.prevent="goPurchaseReq(row.id)">{{
                      row.reqNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'planItemCount'">
                    {{ purchaseReqPlanItemCount(row) }}
                  </template>
                  <template v-else-if="column.key === 'plannedQty'">
                    {{ formatPurchaseQty(row.plannedQty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">采购订单</div>
              <a-table
                :columns="purchaseOrderColumns"
                :data-source="relations.purchaseOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: purchaseOrderTableScrollX }"
                :locale="{ emptyText: '暂无采购订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="purchaseOrderStatusColor(row.status)">{{
                      row.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'inboundStatus'">
                    <a-tag :color="purchaseInboundStatusColor(row.inboundStatus)">
                      {{ row.inboundStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'orderNo'">
                    <a class="link-code" @click.prevent="goPurchaseOrder(row)">{{
                      row.orderNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'supplier'">
                    {{ row.supplier || row.supplierName || '—' }}
                  </template>
                  <template v-else-if="column.key === 'purchaseItemCount'">
                    {{ purchaseOrderItemCount(row) }}
                  </template>
                  <template v-else-if="column.key === 'purchaseQty'">
                    {{ formatPurchaseQty(purchaseOrderQty(row)) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'production'">
            <div class="section-card">
              <div class="section-title">生产计划</div>
              <a-table
                :columns="planColumns"
                :data-source="relations.productionPlans"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: planTableScrollX }"
                class="sub-table"
                :locale="{ emptyText: '暂无生产计划（自产订单审核后生成）' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'orderStatus'">
                    <a-tag :color="productionPlanStatusColor(row.orderStatus)">
                      {{ row.orderStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatProductionQty(productionPlanScheduleQty(row)) }}
                  </template>
                  <template v-else-if="column.key === 'productQty'">
                    {{ formatProductionQty(row.productQty) }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">生产工单</div>
              <a-table
                :columns="productionWorkOrderColumns"
                :data-source="relations.workOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: productionWorkOrderTableScrollX }"
                class="sub-table"
                :locale="{ emptyText: '暂无生产工单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="workOrderStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'code'">
                    <a class="link-code" @click.prevent="goWorkOrderDetail(row)">{{
                      row.code || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'progress'">
                    {{ row.progressLabel || row.status || '—' }}
                  </template>
                  <template v-else-if="column.key === 'orderType'">
                    {{ row.orderCategory || row.orderType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatProductionQty(row.scheduleQty ?? row.planQty) }}
                  </template>
                  <template v-else-if="column.key === 'owner'">
                    {{ row.owner || row.personInCharge || '—' }}
                  </template>
                  <template v-else>
                    {{ productionWorkOrderCell(row, column) }}
                  </template>
                </template>
              </a-table>
            </div>
            <div class="section-card">
              <div class="section-title">总装工单</div>
              <a-table
                :columns="assemblyWorkOrderColumns"
                :data-source="relations.assemblyWorkOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: assemblyWorkOrderTableScrollX }"
                :locale="{ emptyText: '暂无总装工单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="workOrderStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'code'">
                    <a class="link-code" @click.prevent="goWorkOrderDetail(row)">{{
                      row.code || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'progress'">
                    {{ row.progressLabel || row.status || '—' }}
                  </template>
                  <template v-else-if="column.key === 'orderType'">
                    {{ row.orderCategory || row.orderType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'scheduleQty'">
                    {{ formatProductionQty(row.scheduleQty ?? row.planQty) }}
                  </template>
                  <template v-else-if="column.key === 'owner'">
                    {{ row.owner || row.personInCharge || '—' }}
                  </template>
                  <template v-else>
                    {{ productionWorkOrderCell(row, column) }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'outsourcing'">
            <div class="section-card">
              <div class="section-title">外协订单</div>
              <a-table
                :columns="outsourcingColumns"
                :data-source="relations.outsourcingOrders"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: outsourcingTableScrollX }"
                :locale="{ emptyText: '暂无外协订单' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="outsourcingStatusColor(row.status)">{{
                      row.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'inboundStatus'">
                    <a-tag :color="purchaseInboundStatusColor(row.inboundStatus)">
                      {{ row.inboundStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'productName'">
                    {{ row.productName || row.itemName || '—' }}
                  </template>
                  <template v-else-if="column.key === 'specModel'">
                    {{ row.specModel || row.model || '—' }}
                  </template>
                  <template v-else-if="column.key === 'material'">
                    {{ row.material || '—' }}
                  </template>
                  <template v-else-if="column.key === 'drawingNo'">
                    {{ row.drawingNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'variantAttr'">
                    {{ row.variantAttr || row.variantSummary || '—' }}
                  </template>
                  <template v-else-if="column.key === 'outsourceQty'">
                    {{ formatProductionQty(row.outsourceQty ?? row.qty) }}
                  </template>
                  <template v-else-if="column.key === 'planTime'">
                    {{ row.planTime || row.planCompleteDate || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'attachments'">
            <div class="section-card">
              <div class="section-title">附件信息</div>
              <a-table
                v-if="relations.attachments.length"
                :columns="attachmentColumns"
                :data-source="relations.attachments"
                row-key="uid"
                size="small"
                bordered
                :pagination="false"
              >
                <template #bodyCell="{ column, record: file }">
                  <template v-if="column.key === 'action'">
                    <a-button type="link" size="small" @click="previewFile(file)">预览</a-button>
                  </template>
                  <template v-else>
                    {{ file[column.dataIndex] ?? file.name ?? '—' }}
                  </template>
                </template>
              </a-table>
              <a-empty v-else description="暂无附件" />
            </div>
          </template>

          <template v-else-if="activeTab === 'price-change'">
            <div class="section-card">
              <div class="section-title">价格变更履历</div>
              <SalesPriceChangeHistoryPanel :order="order" />
            </div>
          </template>

          <template v-else-if="activeTab === 'industrial-label'">
            <div class="section-card">
              <div class="section-title">工业标识申请摘要</div>
              <a-table
                :columns="industrialLabelLineColumns"
                :data-source="industrialLabelRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 720 }"
                :locale="{ emptyText: '本单暂无工业标识申请' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'need'">
                    {{ row.needIndustrialLabel ? '是' : '否' }}
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag
                      v-if="row.status && row.status !== '—'"
                      :color="industrialLabelStatusColor(row.status)"
                    >
                      {{ row.status }}
                    </a-tag>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-space v-if="canOperateIndustrialLabel">
                      <a
                        v-if="row.canRetry"
                        class="link-code"
                        @click.prevent="handleRetryIndustrialLabel(row)"
                      >
                        重试
                      </a>
                      <a
                        v-if="row.canSupplement"
                        class="link-code"
                        @click.prevent="openSupplementIndustrialLabel(row)"
                      >
                        补申请
                      </a>
                    </a-space>
                    <span v-else>—</span>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>

            <div class="section-card">
              <div class="section-title-row">
                <div class="section-title">SN / 二维码明细</div>
                <a-button
                  size="small"
                  :disabled="!industrialLabelSnRows.length"
                  @click="exportIndustrialLabelSns"
                >
                  导出
                </a-button>
              </div>
              <a-table
                :columns="industrialLabelSnColumns"
                :data-source="industrialLabelSnRows"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1100 }"
                :locale="{ emptyText: '暂无已申请的工业标识 SN' }"
              >
                <template #bodyCell="{ column, record: row }">
                  <template v-if="column.key === 'labelCode'">
                    <a class="link-code" @click.prevent="openIndustrialLabelQr(row)">
                      {{ row.labelCode }}
                    </a>
                  </template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="row.status === '有效' ? 'success' : 'default'">
                      {{ row.status || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'qrStatus'">
                    <a-tag :color="row.qrStatus === '已绑定' ? 'blue' : 'orange'">
                      {{ row.qrStatus || '—' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'qrPreview'">
                    <div class="il-qr-thumb" @click="openIndustrialLabelQr(row)">
                      <IndustrialLabelQrMock :size="48" />
                    </div>
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a class="link-code" @click.prevent="goLabelDetail(row)">标识管理</a>
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </div>
          </template>

          <template v-else-if="activeTab === 'approval'">
            <div class="section-card">
              <div class="section-title">销售订单审批</div>
              <a-divider style="margin: 12px 0" />
              <div v-if="approvalRecords.length" class="history-list">
                <div v-for="(item, idx) in approvalRecords" :key="idx" class="history-item">
                  <div class="history-head">
                    <span class="history-user">{{ item.name }}</span>
                    <span class="history-role">（{{ item.role }}）</span>
                    <a-tag :color="approvalResultColor(item.result)" size="small">
                      {{ item.result }}
                    </a-tag>
                    <span class="history-time">{{ item.time }}</span>
                  </div>
                  <div v-if="item.opinion" class="history-opinion">{{ item.opinion }}</div>
                </div>
              </div>
              <a-empty v-else description="暂无销售订单审批记录" />
            </div>

            <div class="section-card">
              <div class="section-title">价格变更审批</div>
              <a-divider style="margin: 12px 0" />
              <div v-if="priceChangeApprovalGroups.length" class="price-change-approval">
                <div
                  v-for="group in priceChangeApprovalGroups"
                  :key="group.id"
                  class="price-change-approval-group"
                >
                  <div class="group-head">
                    <span class="group-no">{{ group.changeNo }}</span>
                    <a-tag :color="priceChangeStatusColor(group.status)" size="small">
                      {{ group.status }}
                    </a-tag>
                    <span v-if="group.reasonType" class="group-reason">{{ group.reasonType }}</span>
                  </div>
                  <div class="history-list">
                    <div
                      v-for="(item, idx) in group.items"
                      :key="`${group.id}-${idx}`"
                      class="history-item"
                    >
                      <div class="history-head">
                        <span class="history-user">{{ item.name }}</span>
                        <span class="history-role">（{{ item.role }}）</span>
                        <a-tag :color="approvalResultColor(item.result)" size="small">
                          {{ item.result }}
                        </a-tag>
                        <span v-if="item.time" class="history-time">{{ item.time }}</span>
                      </div>
                      <div v-if="item.opinion" class="history-opinion">{{ item.opinion }}</div>
                    </div>
                  </div>
                </div>
              </div>
              <a-empty v-else description="暂无价格变更审批记录" />
            </div>
          </template>
        </div>
      </template>

      <a-empty v-else-if="!loading" description="未找到该销售订单" />
    </a-spin>

    <ChangeDeliveryModeModal
      v-model:open="changeDeliveryModeOpen"
      :sales-order="changeDeliveryModeOrder"
      @saved="onChangeDeliveryModeSaved"
    />
    <SalesPriceChangeModal
      v-model:open="priceChangeOpen"
      :sales-order="priceChangeOrder"
      :pending-change="priceChangePending"
      @done="onPriceChangeDone"
    />
    <SalesOrderPrintModal v-model:open="printModalOpen" :sales-order="order" />
    <a-modal
      v-model:open="supplementLabelOpen"
      title="工业标识补申请"
      ok-text="确认申请"
      cancel-text="取消"
      @ok="confirmSupplementIndustrialLabel"
    >
      <p v-if="supplementLabelLine" style="margin-bottom: 12px">
        {{ supplementLabelLine.productName }}（{{ supplementLabelLine.productCode }}）
      </p>
      <a-form layout="vertical">
        <a-form-item label="申请数量">
          <a-input-number
            v-model:value="supplementLabelQty"
            :min="1"
            :max="supplementLabelMax"
            style="width: 100%"
          />
        </a-form-item>
        <div style="color: rgba(0, 0, 0, 0.45); font-size: 12px">
          默认 = 申请数量 − 已成功数；批次号使用销售单号。
        </div>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="industrialQrOpen"
      title="工业标识二维码"
      :footer="null"
      width="420px"
      destroy-on-close
    >
      <div v-if="industrialQrLabel" class="il-qr-modal">
        <div class="il-qr-modal-preview">
          <IndustrialLabelQrMock :size="180" />
        </div>
        <div class="il-qr-modal-meta">
          <div class="il-qr-code">{{ industrialQrLabel.labelCode }}</div>
          <div class="il-qr-row">
            <span class="il-qr-k">产品</span>
            <span>{{ industrialQrLabel.productName || '—' }}</span>
          </div>
          <div class="il-qr-row">
            <span class="il-qr-k">批次号</span>
            <span>{{ industrialQrLabel.batchNo || '—' }}</span>
          </div>
          <div class="il-qr-row">
            <span class="il-qr-k">申请单号</span>
            <span>{{ industrialQrLabel.requestOrderNo || '—' }}</span>
          </div>
          <div class="il-qr-row">
            <span class="il-qr-k">二维码状态</span>
            <a-tag
              :color="industrialQrLabel.qrStatus === '已绑定' ? 'blue' : 'orange'"
              size="small"
            >
              {{ industrialQrLabel.qrStatus || '—' }}
            </a-tag>
          </div>
          <div class="il-qr-hint">演示二维码 · 内容为 SN 码（非真实注册平台）</div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
export default { name: 'SalesOrderDetailView' }
</script>

<script setup>
import { formatQty } from '@/utils/numberFormat'
import { computed, onActivated, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { tabStore, useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { getSalesOrderById, resolveSalesOrderRelations } from '@/utils/salesOrderDetail'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { workOrderState } from '@/store/workOrderStore'
import {
  deleteSalesOrder,
  revokeSalesOrderApproval,
  canEditSalesOrder,
  canChangeDeliveryMode,
  canApproveSalesOrder,
  canSubmitSalesOrder,
  canResubmitSalesOrder,
  canRevokeSalesOrderApproval,
  submitSalesOrderForApprove,
  withdrawSalesOrder,
  resubmitSalesOrder,
} from '@/store/salesOrderStore'
import {
  SALES_ORDER_REVOKE_BLOCKED_MESSAGE,
  hasSalesOrderRevokeBlockers,
} from '@/utils/salesOrderRevokeApproval'
import { salesOrderStatusColor, salesDeliveryStatusColor } from '@/utils/salesOrderStatus'
import { buildPriceChangeApprovalGroups, priceChangeStatusColor } from '@/utils/salesPriceChange'
import ChangeDeliveryModeModal from './components/ChangeDeliveryModeModal.vue'
import SalesPriceChangeModal from './components/SalesPriceChangeModal.vue'
import SalesPriceChangeHistoryPanel from './components/SalesPriceChangeHistoryPanel.vue'
import SalesOrderStockRemindPanel from './components/SalesOrderStockRemindPanel.vue'
import {
  canApplySalesPriceChange,
  getPendingPriceChange,
  getPendingPriceChangeDeliveryBlock,
  listPriceChangesByOrderId,
  salesPriceChangeState,
} from '@/store/salesPriceChangeStore'
import {
  releaseOrderAllocations,
  shouldShowLiveStockRemind,
  ensureStockTransferDemoMocksForOrder,
} from '@/store/salesStockAllocationStore'
import { stockFulfillmentModeLabel } from '@/utils/salesStockFulfillment'
import { buildEligibleDeliveryModeLines } from '@/utils/changeDeliveryMode'
import {
  deliveryStatusColor,
  formatAmountExTax,
  formatOutboundQtyInt,
  formatShipWeight,
} from '@/utils/deliveryOrder'
import {
  flattenOutboundOrdersToIssueLines,
  createOutboundIssueLineColumns,
  getOutboundIssueLineScrollX,
} from '@/utils/outboundIssueLines'
import {
  flattenPurchaseOrderInboundLines,
  createInboundInfoLineColumns,
  getInboundInfoLineScrollX,
} from '@/utils/purchaseOrderInboundLines'
import { getInboundOrdersBySalesOrder, inboundOrderState } from '@/store/inboundOrderStore'
import { resolveLineBusinessType } from '@/utils/salesOrderBusiness'
import { getActiveBomForItem } from '@/store/productBomStore'
import BomVersionInfoSection from '@/components/BomVersionInfoSection.vue'
import SalesOrderBasicInfoSection from './components/SalesOrderBasicInfoSection.vue'
import SalesOrderPrintModal from './components/SalesOrderPrintModal.vue'
import SalesOrderEbomDiffSection from './components/SalesOrderEbomDiffSection.vue'
import IndustrialLabelQrMock from './components/IndustrialLabelQrMock.vue'
import { salesOrderDetailLineColumns } from '@/utils/salesOrderLineColumns'
import {
  industrialLabelState,
  listLabelsBySalesOrder,
  retryLabelRequestForSalesLine,
  supplementLabelRequest,
  applyLabelSummaryToSalesLines,
  salesLineIndustrialLabelNeedQty,
} from '@/store/industrialLabelStore'
import {
  formatDiscountRatePercent,
  calcOrderAmounts,
  DISCOUNT_STRATEGY_LABELS,
  DISCOUNT_STRATEGIES,
} from '@/utils/salesOrderPricing'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { buildSalesOrderEbomRows } from '@/utils/salesOrderBomRows'
import {
  normalizeSalesOrderDetailTab,
  persistSalesOrderDetailTab,
  readSalesOrderDetailTab,
} from '@/utils/salesOrderDetailTab'
import { buildExportFileName, exportRowsToExcel } from '@/utils/excelExport'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const loading = ref(false)
const order = ref(null)
const changeDeliveryModeOpen = ref(false)
const changeDeliveryModeOrder = ref(null)
const priceChangeOpen = ref(false)
const priceChangeOrder = ref(null)
const printModalOpen = ref(false)
const supplementLabelOpen = ref(false)
const supplementLabelLine = ref(null)
const supplementLabelQty = ref(1)
const supplementLabelMax = ref(99)
const industrialQrOpen = ref(false)
const industrialQrLabel = ref(null)

const pendingPriceChange = computed(() => {
  void salesPriceChangeState.orders
  return getPendingPriceChange(order.value?.id)
})
const priceChangePending = computed(() => getPendingPriceChange(priceChangeOrder.value?.id))
const priceChangeRecords = computed(() => {
  void salesPriceChangeState.orders
  return listPriceChangesByOrderId(order.value?.id)
})
const priceChangeCount = computed(() => priceChangeRecords.value.length)
const priceChangeApprovalGroups = computed(() =>
  buildPriceChangeApprovalGroups(priceChangeRecords.value),
)

const showLiveStockRemind = computed(() => shouldShowLiveStockRemind(order.value))

function initActiveTab() {
  return readSalesOrderDetailTab(route.params.id, route.query.tab)
}

const activeTab = ref(initActiveTab())

const relations = computed(() => resolveSalesOrderRelations(order.value))

const outboundRows = computed(() =>
  flattenOutboundOrdersToIssueLines(relations.value.outboundOrders || []),
)

const shippingTabCount = computed(
  () => (relations.value.deliveryApplications?.length || 0) + outboundRows.value.length,
)

const inboundRows = computed(() => {
  void inboundOrderState.orders
  const rel = relations.value
  const orders = getInboundOrdersBySalesOrder(order.value, {
    purchaseOrders: rel.purchaseOrders,
    workOrders: rel.workOrders,
    assemblyWorkOrders: rel.assemblyWorkOrders,
  })
  return flattenPurchaseOrderInboundLines(orders)
})

const approvalRecords = computed(() => order.value?.approvalRecords || [])

function approvalResultColor(result) {
  if (result === '已通过') return 'success'
  if (result === '已驳回' || result === '已拒绝') return 'error'
  if (result === '待审核') return 'warning'
  if (result === '已提交') return 'processing'
  return 'default'
}

const orderPricing = computed(() => {
  if (!order.value) {
    return {
      lineListAmountExTax: 0,
      lineAmountExTax: 0,
      lineAmountInTax: 0,
      lineDiscountTotal: 0,
      orderDiscountTotal: 0,
      totalDiscountAmount: 0,
      amountExTax: 0,
      amountInTax: 0,
      discountStrategy: DISCOUNT_STRATEGIES.LINE,
    }
  }
  return calcOrderAmounts(order.value)
})

const discountStrategyLabel = computed(() => {
  const strategy = order.value?.discountStrategy || DISCOUNT_STRATEGIES.LINE
  return DISCOUNT_STRATEGY_LABELS[strategy] || DISCOUNT_STRATEGY_LABELS[DISCOUNT_STRATEGIES.LINE]
})

const discountStrategyTagColor = computed(() => {
  const strategy = order.value?.discountStrategy || DISCOUNT_STRATEGIES.LINE
  if (strategy === DISCOUNT_STRATEGIES.NONE) return 'default'
  if (strategy === DISCOUNT_STRATEGIES.ORDER) return 'warning'
  if (strategy === DISCOUNT_STRATEGIES.STACK) return 'processing'
  return 'success'
})

const lineDiscountTooltip = '行优惠（合计）= Σ [标准单价(不含税) × 数量 × (1 - 行折扣率)]'

const orderDiscountTooltip =
  '整单优惠合计 = Σ [各行明细折后不含税 × (1 - 整单折扣率)] + 整单减免(元)（减免按行金额占比分摊）'

const lineAmountInTaxTooltip =
  '销售总额（含税）= Σ 各行明细折后含税金额（已含行折扣，未扣整单优惠）'

const lineAmountExTaxTooltip =
  '销售总额（不含税）= Σ 各行明细折后不含税金额（已含行折扣，未扣整单优惠）'

const finalAmountInTaxTooltip = '最终成交额（含税）= Σ 各行折后含税金额（整单折扣已代入各行后求和）'

const finalAmountExTaxTooltip =
  '最终成交额（不含税）= Σ 各行折后不含税金额（整单折扣已代入各行后求和）'

const purchaseTabCount = computed(
  () => relations.value.purchaseRequisitions.length + relations.value.purchaseOrders.length,
)

const productionTabCount = computed(
  () =>
    relations.value.productionPlans.length +
    relations.value.workOrders.length +
    relations.value.assemblyWorkOrders.length,
)

const bomChangedLines = computed(() =>
  (order.value?.lineItems || []).filter((line) => line.productId && lineBomVersionHint(line)),
)

const bomChangedCount = computed(() => bomChangedLines.value.length)

const salesOrderEbomRows = computed(() => buildSalesOrderEbomRows(order.value?.lineItems || []))

const ebomColumns = [
  { key: 'index', title: '序号', width: 56, align: 'center', fixed: 'left' },
  { key: 'ebomStatus', title: 'EBOM状态', width: 100, fixed: 'left' },
  {
    key: 'bomName',
    title: 'EBOM名称',
    dataIndex: 'bomName',
    width: 160,
    ellipsis: true,
    fixed: 'left',
  },
  { key: 'bomNo', title: 'EBOM编码', dataIndex: 'bomNo', width: 130, ellipsis: true },
  { key: 'itemName', title: '产品名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { key: 'initialVersion', title: '初始版本', dataIndex: 'initialVersion', width: 96 },
  { key: 'boundVersion', title: '订单绑定版本', dataIndex: 'boundVersion', width: 120 },
  { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { key: 'material', title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { key: 'drawingNo', title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { key: 'levelCount', title: '层级数', dataIndex: 'levelCount', width: 72, align: 'center' },
  { key: 'materialCount', title: '物料数', dataIndex: 'materialCount', width: 72, align: 'center' },
  { key: 'snapshotAt', title: '快照时间', dataIndex: 'snapshotAt', width: 150 },
]

const ebomTableScrollX = computed(() =>
  ebomColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const lineColumns = salesOrderDetailLineColumns

const lineTableScrollX = computed(() =>
  lineColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const industrialLabelLineColumns = [
  { key: 'productName', title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { key: 'productCode', title: '产品编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { key: 'need', title: '勾选', width: 64, align: 'center' },
  { key: 'needQty', title: '申请数量', dataIndex: 'needQty', width: 88, align: 'right' },
  { key: 'status', title: '申请状态', width: 100 },
  { key: 'success', title: '成功数', dataIndex: 'success', width: 80, align: 'right' },
  { key: 'fail', title: '失败数', dataIndex: 'fail', width: 80, align: 'right' },
  { key: 'action', title: '操作', width: 120, fixed: 'right' },
]

const industrialLabelSnColumns = [
  { key: 'labelCode', title: 'SN 码', width: 200, fixed: 'left' },
  { key: 'qrPreview', title: '二维码', width: 72, align: 'center' },
  { key: 'productName', title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { key: 'productCode', title: '产品编码', dataIndex: 'productCode', width: 120, ellipsis: true },
  { key: 'specModel', title: '规格型号', dataIndex: 'specModel', width: 120, ellipsis: true },
  { key: 'material', title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { key: 'requestOrderNo', title: '申请单号', dataIndex: 'requestOrderNo', width: 150 },
  { key: 'status', title: '标识状态', width: 88 },
  { key: 'qrStatus', title: '二维码状态', width: 100 },
  { key: 'regTime', title: '注册时间', dataIndex: 'regTime', width: 160 },
  { key: 'action', title: '操作', width: 100, fixed: 'right' },
]

const canOperateIndustrialLabel = computed(() => {
  const st = order.value?.progressStatus
  return st === '进行中' || st === '待发货' || st === '部分发货'
})

const industrialLabelRows = computed(() => {
  void industrialLabelState.labels
  void industrialLabelState.requests
  const o = order.value
  if (!o) return []
  const all = listLabelsBySalesOrder(o.orderNo).filter((l) => l.status !== '作废')
  return (o.lineItems || [])
    .filter((line) => line.needIndustrialLabel)
    .map((line) => {
      const labels = all.filter((l) => l.salesLineId === line.id)
      const needQty = salesLineIndustrialLabelNeedQty(line)
      const success = labels.length
      const fail = Number(line.industrialLabelFailCount) || 0
      let status = line.industrialLabelStatus || '—'
      if (line.needIndustrialLabel) {
        if (needQty <= 0) status = '—'
        else if (success >= needQty) status = '成功'
        else if (success > 0) status = '部分成功'
        else if (fail > 0) status = '失败'
        else status = '待申请'
      }
      const canSupplement = status === '失败' || status === '部分成功'
      return {
        id: line.id,
        line,
        productName: line.productName,
        productCode: line.productCode,
        needIndustrialLabel: Boolean(line.needIndustrialLabel),
        needQty,
        status,
        success,
        fail,
        labels,
        canRetry: Boolean(line.needIndustrialLabel) && needQty > success && fail > 0,
        canSupplement,
      }
    })
})

const industrialLabelSnRows = computed(() => {
  void industrialLabelState.labels
  const o = order.value
  if (!o?.orderNo) return []
  const lineMap = Object.fromEntries((o.lineItems || []).map((l) => [l.id, l]))
  return listLabelsBySalesOrder(o.orderNo).map((lbl) => {
    const line = lineMap[lbl.salesLineId] || {}
    return {
      ...lbl,
      salesOrderNo: o.orderNo,
      customerName: o.customerName || '',
      specModel: lbl.specModel || line.specModel || '',
      material: lbl.material || line.material || '',
      productName: lbl.productName || line.productName || '',
      productCode: lbl.productCode || line.productCode || '',
    }
  })
})

const industrialLabelSnCount = computed(() => industrialLabelSnRows.value.length)

const industrialLabelSnExportFields = [
  { title: '销售单号', getValue: (row) => row.salesOrderNo || '' },
  { title: '客户名称', getValue: (row) => row.customerName || '' },
  { title: 'SN 码', getValue: (row) => row.labelCode || '' },
  { title: '产品名称', getValue: (row) => row.productName || '' },
  { title: '产品编码', getValue: (row) => row.productCode || '' },
  { title: '规格型号', getValue: (row) => row.specModel || '' },
  { title: '材质', getValue: (row) => row.material || '' },
  { title: '申请单号', getValue: (row) => row.requestOrderNo || '' },
  { title: '标识状态', getValue: (row) => row.status || '' },
  { title: '二维码状态', getValue: (row) => row.qrStatus || '' },
  { title: '注册时间', getValue: (row) => row.regTime || '' },
]

function exportIndustrialLabelSns() {
  const rows = industrialLabelSnRows.value
  if (!rows.length) {
    message.warning('暂无可导出的 SN')
    return
  }
  const orderNo = order.value?.orderNo || '销售订单'
  exportRowsToExcel({
    rows,
    fields: industrialLabelSnExportFields,
    fileName: buildExportFileName(`工业标识SN_${orderNo}`),
    sheetName: 'SN明细',
  })
  message.success(`已导出 ${rows.length} 条 SN，可发给车间刻铭牌`)
}

function industrialLabelStatusColor(status) {
  if (status === '成功') return 'success'
  if (status === '部分成功') return 'warning'
  if (status === '失败') return 'error'
  if (status === '待申请') return 'processing'
  return 'default'
}

function openIndustrialLabelQr(lbl) {
  industrialQrLabel.value = lbl
  industrialQrOpen.value = true
}

function goLabelDetail(lbl) {
  const path = '/industrial-id/label-management'
  openTab(path, '标识管理')
  router.push({
    path,
    query: { labelCode: lbl.labelCode, batchNo: lbl.batchNo || '' },
  })
}

function handleRetryIndustrialLabel(row) {
  if (!order.value || !row?.line) return
  const res = retryLabelRequestForSalesLine(order.value, row.line)
  applyLabelSummaryToSalesLines(order.value, [
    {
      salesLineId: row.line.id,
      successCount: res.labels?.length || 0,
      failCount: res.ok ? 0 : 1,
    },
  ])
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
  reloadOrder()
}

function openSupplementIndustrialLabel(row) {
  if (!order.value || !row?.line) return
  const needQty = salesLineIndustrialLabelNeedQty(row.line)
  const active = listLabelsBySalesOrder(order.value.orderNo).filter(
    (l) => l.salesLineId === row.line.id && l.status !== '作废',
  )
  const gap = Math.max(1, needQty - active.length)
  const salesQty = Math.floor(Number(row.line.salesQty ?? row.line.qty) || 0)
  supplementLabelLine.value = row.line
  supplementLabelMax.value = Math.max(gap, salesQty || gap)
  supplementLabelQty.value = gap
  supplementLabelOpen.value = true
}

function confirmSupplementIndustrialLabel() {
  if (!order.value || !supplementLabelLine.value) {
    supplementLabelOpen.value = false
    return
  }
  const res = supplementLabelRequest(
    order.value,
    supplementLabelLine.value,
    supplementLabelQty.value,
  )
  applyLabelSummaryToSalesLines(order.value, [
    {
      salesLineId: supplementLabelLine.value.id,
      successCount: res.request?.successCount || 0,
      failCount: res.request?.failCount || 0,
    },
  ])
  if (res.request?.orderNo) {
    supplementLabelLine.value.industrialLabelRequestNo = res.request.orderNo
  }
  supplementLabelOpen.value = false
  if (res.ok) message.success(res.message)
  else message.warning(res.message)
  reloadOrder()
}

function lineBomVersionHint(line) {
  const active = getActiveBomForItem('product', line.productId)
  return Boolean(active?.version && line.bomVersion && active.version !== line.bomVersion)
}

function lineActiveVersion(line) {
  return getActiveBomForItem('product', line.productId)?.version || ''
}

const moneyColumnKeys = new Set([
  'lineDiscountAmount',
  'unitPriceExTax',
  'unitPriceInTax',
  'totalPriceExTax',
  'totalPriceInTax',
])

function isMoneyColumn(key) {
  return moneyColumnKeys.has(key)
}

function formatMoneyCell(line, column) {
  const val = line[column.dataIndex]
  if (val === undefined || val === null || val === '') return '—'
  // 单价按智能小数；金额类仍保留 2 位
  if (column.key === 'unitPriceExTax' || column.key === 'unitPriceInTax') {
    return `￥${formatQty(val)}`
  }
  return `￥${formatMoney(val)}`
}

const deliveryColumns = [
  { title: '发货状态', key: 'deliveryStatus', width: 96, fixed: 'left' },
  { title: '发货单号', key: 'deliveryCode', width: 140, fixed: 'left' },
  { title: '申请发货数量', key: 'applyShipQty', width: 110, align: 'right' },
  { title: '实际出库数量', key: 'actualOutboundQty', width: 110, align: 'right' },
  { title: '发货重量', key: 'shipWeight', width: 96, align: 'right' },
  { title: '发货总金额（不含税）', key: 'totalAmountExTax', width: 140, align: 'right' },
  { title: '交货方式', dataIndex: 'shipmentMethod', width: 88 },
  { title: '物流单号', dataIndex: 'logisticsNo', width: 130, ellipsis: true },
  { title: '客户联系人', dataIndex: 'contactPerson', width: 100 },
  { title: '联系方式', dataIndex: 'contactPhone', width: 120 },
  { title: '交货地址', dataIndex: 'deliveryAddress', width: 180, ellipsis: true },
  { title: '司机姓名', dataIndex: 'driverName', width: 90 },
  { title: '司机联系方式', dataIndex: 'driverPhone', width: 120 },
  { title: '车牌号', dataIndex: 'plateNo', width: 100 },
]

const deliveryTableScrollX = computed(() =>
  deliveryColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const outboundColumns = createOutboundIssueLineColumns()
const outboundTableScrollX = getOutboundIssueLineScrollX(outboundColumns)

const inboundLineColumns = createInboundInfoLineColumns({
  productName: true,
  showInboundWarehouse: true,
})
const inboundTableScrollX = getInboundInfoLineScrollX(inboundLineColumns)

const purchaseReqColumns = [
  { title: '状态', key: 'docStatus', width: 90, fixed: 'left' },
  { title: '申请单号', key: 'reqNo', width: 160, fixed: 'left' },
  { title: '计划项数', key: 'planItemCount', width: 88, align: 'right' },
  { title: '计划数量', key: 'plannedQty', width: 100, align: 'right' },
  { title: '期望到货时间', dataIndex: 'estimatedArrivalDate', width: 120 },
  { title: '预入仓库', dataIndex: 'receivingWarehouse', width: 100, ellipsis: true },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const purchaseReqTableScrollX = computed(() =>
  purchaseReqColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const purchaseOrderColumns = [
  { title: '状态', key: 'status', width: 90, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96, fixed: 'left' },
  { title: '采购单号', key: 'orderNo', width: 140 },
  { title: '供应商', key: 'supplier', width: 140, ellipsis: true },
  { title: '采购项数', key: 'purchaseItemCount', width: 88, align: 'right' },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '交货日期', dataIndex: 'deliveryDate', width: 110 },
  { title: '采购员', dataIndex: 'purchaser', width: 88 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建日期', dataIndex: 'documentDate', width: 110 },
]

const purchaseOrderTableScrollX = computed(() =>
  purchaseOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function purchaseReqPlanItemCount(row) {
  return (row.lineItems || []).length
}

function purchaseOrderItemCount(row) {
  return (row.lineItems || []).length
}

function purchaseOrderQty(row) {
  if (row?.totalQty != null && row.totalQty !== '') return Number(row.totalQty) || 0
  return (row.lineItems || []).reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0)
}

function formatPurchaseQty(val) {
  return formatQty(val)
}

function purchaseReqStatusColor(status) {
  const map = {
    待处理: 'processing',
    处理中: 'warning',
    处理完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function purchaseOrderStatusColor(status) {
  const map = {
    待审核: 'default',
    进行中: 'processing',
    已拒绝: 'error',
    已完成: 'success',
    已作废: 'default',
  }
  return map[status] || 'default'
}

function purchaseInboundStatusColor(status) {
  const map = { 待入库: 'default', 部分入库: 'warning', 已入库: 'success' }
  return map[status] || 'default'
}

const planColumns = [
  { title: '状态', key: 'orderStatus', width: 96, fixed: 'left' },
  { title: '计划单号', dataIndex: 'orderNo', width: 140, fixed: 'left' },
  { title: '产品数量', key: 'productQty', width: 96, align: 'right' },
  { title: '排产数量', key: 'scheduleQty', width: 96, align: 'right' },
]

const planTableScrollX = computed(() =>
  planColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const productionWorkOrderSharedColumns = [
  { title: '状态', key: 'status', width: 88, fixed: 'left' },
  { title: '进度', key: 'progress', width: 88 },
  { title: '工单编号', key: 'code', dataIndex: 'code', width: 150, ellipsis: true, fixed: 'left' },
  { title: '工单名称', dataIndex: 'name', width: 160, ellipsis: true },
  { title: '工单类型', key: 'orderType', width: 96 },
  { title: '产品名称', dataIndex: 'productName', width: 130, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 88, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '排产数量', key: 'scheduleQty', width: 96, align: 'right' },
  { title: '工作中心', dataIndex: 'workCenter', width: 100, ellipsis: true },
  { title: '创建人', key: 'owner', width: 88 },
  { title: '工艺路线', dataIndex: 'processRouteName', width: 120, ellipsis: true },
]

const productionWorkOrderColumns = [
  ...productionWorkOrderSharedColumns,
  { title: '创建日期', dataIndex: 'createdAt', width: 110 },
]

const assemblyWorkOrderColumns = [...productionWorkOrderSharedColumns]

const productionWorkOrderTableScrollX = computed(() =>
  productionWorkOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

const assemblyWorkOrderTableScrollX = computed(() =>
  assemblyWorkOrderColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function productionPlanScheduleQty(plan) {
  const items = plan?.workItems || []
  if (!items.length) return plan?.scheduleQty
  return items.reduce((sum, item) => sum + (Number(item.planQty) || 0), 0)
}

function formatProductionQty(val) {
  return formatQty(val)
}

function productionPlanStatusColor(status) {
  const text = String(status || '')
  if (text.includes('完成')) return 'success'
  if (text.includes('执行') || text.includes('生产')) return 'processing'
  if (text.includes('部分')) return 'warning'
  return 'default'
}

function workOrderStatusColor(status) {
  const map = {
    待下发: 'warning',
    已下发: 'processing',
    执行中: 'blue',
    完成: 'success',
    暂停: 'default',
    终止: 'error',
  }
  return map[status] || 'default'
}

function productionWorkOrderCell(row, column) {
  if (column.dataIndex === 'specModel') {
    return row.specModel || row.model || '—'
  }
  const val = row[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '—'
}

const outsourcingColumns = [
  { title: '状态', key: 'status', width: 88, fixed: 'left' },
  { title: '入库状态', key: 'inboundStatus', width: 96 },
  { title: '外协单号', dataIndex: 'orderNo', width: 130, fixed: 'left' },
  { title: '产品名称', key: 'productName', width: 130, ellipsis: true },
  { title: '规格型号', key: 'specModel', width: 110, ellipsis: true },
  { title: '材质', key: 'material', width: 88, ellipsis: true },
  { title: '图号', key: 'drawingNo', width: 100, ellipsis: true },
  { title: '变体属性', key: 'variantAttr', width: 140, ellipsis: true },
  { title: '供应商', dataIndex: 'supplierName', width: 140, ellipsis: true },
  { title: '外协数量', key: 'outsourceQty', width: 96, align: 'right' },
  { title: '计划时间', key: 'planTime', width: 110 },
  { title: '创建人', dataIndex: 'creator', width: 88 },
  { title: '创建时间', dataIndex: 'createdAt', width: 150 },
]

const outsourcingTableScrollX = computed(() =>
  outsourcingColumns.reduce((sum, col) => sum + (col.width || 100), 0),
)

function outsourcingStatusColor(status) {
  const map = {
    待下达: 'default',
    进行中: 'processing',
    已完成: 'success',
    已关闭: 'default',
  }
  return map[status] || 'default'
}

const attachmentColumns = [
  { title: '范围', dataIndex: 'scope', width: 160, ellipsis: true },
  { title: '文件名', dataIndex: 'name', ellipsis: true },
  { title: '类型', dataIndex: 'type', width: 100 },
  { title: '上传时间', dataIndex: 'uploadedAt', width: 150 },
  { title: '操作', key: 'action', width: 80 },
]

function loadOrder() {
  const id = route.params.id
  loading.value = true
  order.value = getSalesOrderById(id)
  loading.value = false
  if (order.value) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = `销售订单 ${order.value.orderNo}`
  }
}

function syncTabToRoute(tab) {
  const normalized = normalizeSalesOrderDetailTab(tab)
  persistSalesOrderDetailTab(route.params.id, normalized)
  const current = route.query.tab
  const queryTab = normalized === 'overview' ? undefined : normalized
  if ((current || undefined) === queryTab) return
  const query = { ...route.query }
  if (queryTab) query.tab = queryTab
  else delete query.tab
  router.replace({ path: route.path, query })
}

function restoreActiveTab() {
  if (route.query.tab) {
    const next = normalizeSalesOrderDetailTab(route.query.tab)
    if (activeTab.value !== next) activeTab.value = next
    return
  }
  const stored = readSalesOrderDetailTab(route.params.id)
  if (stored !== 'overview') {
    if (activeTab.value !== stored) activeTab.value = stored
    return
  }
  if (activeTab.value !== 'overview') {
    persistSalesOrderDetailTab(route.params.id, activeTab.value)
  }
}

watch(
  () => route.query.tab,
  (tab) => {
    if (tab) {
      const next = normalizeSalesOrderDetailTab(tab)
      if (activeTab.value !== next) activeTab.value = next
      return
    }
    restoreActiveTab()
  },
)

watch(
  () => route.params.id,
  () => {
    restoreActiveTab()
  },
)

watch(activeTab, (tab) => {
  syncTabToRoute(tab)
})

onActivated(() => {
  restoreActiveTab()
})

watch(() => route.params.id, loadOrder, { immediate: true })

function formatMoney(val) {
  return Number(val || 0).toFixed(2)
}

function displayCell(line, column) {
  const val = line[column.dataIndex]
  return val !== undefined && val !== null && val !== '' ? val : '—'
}

function previewFile(file) {
  message.info(`预览：${file.name || '附件'}`)
}

function openPrint() {
  printModalOpen.value = true
}

function reloadOrder() {
  order.value = getSalesOrderById(route.params.id)
  if (order.value) ensureStockTransferDemoMocksForOrder(order.value)
}

function openApprovePage() {
  if (!order.value) return
  const path = `/sales/orders/${order.value.id}/approve`
  openTab(path, `审核销售订单 ${order.value.orderNo || ''}`.trim())
  router.push({ name: 'sales-orders-approve', params: { id: order.value.id } })
}

function handleSubmit() {
  if (!order.value) return
  doSubmitForApprove()
}

function doSubmitForApprove() {
  const res = submitSalesOrderForApprove(order.value.id)
  if (res.ok) {
    message.success(res.message)
    reloadOrder()
  } else {
    message.warning(res.message)
  }
}

function handleResubmit() {
  if (!order.value) return
  const res = resubmitSalesOrder(order.value.id)
  if (res.ok) {
    message.success(res.message)
    reloadOrder()
  } else {
    message.warning(res.message)
  }
}

function handleWithdraw() {
  if (!order.value) return
  const res = withdrawSalesOrder(order.value.id)
  if (res.ok) {
    message.success(res.message)
    reloadOrder()
  } else {
    message.warning(res.message)
  }
}

function handleEdit() {
  if (!order.value || !canEditSalesOrder(order.value)) {
    message.warning('当前状态不可编辑')
    return
  }
  openCreateTab(router, openTab, {
    path: `/sales/orders/${order.value.id}/edit`,
    title: `编辑销售订单 ${order.value.orderNo || ''}`.trim(),
  })
}

function handleDelete() {
  if (!order.value || !canEditSalesOrder(order.value)) {
    message.warning('当前状态不可删除')
    return
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定删除销售订单「${order.value.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      deleteSalesOrder(order.value.id)
      message.success('已删除')
      handleBack()
    },
  })
}

function handleRevokeApprove() {
  if (!order.value) return
  if (hasSalesOrderRevokeBlockers(order.value)) {
    Modal.warning({
      title: '无法反审',
      content: SALES_ORDER_REVOKE_BLOCKED_MESSAGE,
      okText: '知道了',
    })
    return
  }
  Modal.confirm({
    content: '确认反审该销售订单？反审后将恢复为待审核。',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      const res = revokeSalesOrderApproval(order.value.id)
      if (res.ok) {
        message.success(res.message)
        reloadOrder()
      } else if (res.blocked) {
        Modal.warning({ title: '无法反审', content: res.message, okText: '知道了' })
      } else {
        message.warning(res.message)
      }
    },
  })
}

function handleApplyDelivery() {
  if (!order.value) return
  const block = getPendingPriceChangeDeliveryBlock(order.value.id)
  if (block) {
    message.warning(block)
    return
  }
  openCreateTab(router, openTab, {
    path: '/sales/delivery/new',
    title: `新增发货单 ${order.value.orderNo || ''}`.trim(),
    query: { salesOrderId: order.value.id },
  })
}

function handlePriceChange() {
  if (!order.value) return
  if (!canApplySalesPriceChange(order.value)) {
    message.warning('仅「进行中」的销售订单可申请价格变更')
    return
  }
  priceChangeOrder.value = order.value
  priceChangeOpen.value = true
}

function onPriceChangeDone() {
  priceChangeOrder.value = null
  reloadOrder()
}

function handleChangeDeliveryMode() {
  if (!order.value) return
  if (!canChangeDeliveryMode(order.value)) {
    message.warning('仅「进行中」的自产销售订单可变更交付方式')
    return
  }
  if (!buildEligibleDeliveryModeLines(order.value).length) {
    message.warning('当前订单没有可变更的产品（均已发完或未发货数量为 0）')
    return
  }
  changeDeliveryModeOrder.value = order.value
  changeDeliveryModeOpen.value = true
}

function onChangeDeliveryModeSaved() {
  changeDeliveryModeOrder.value = null
  reloadOrder()
}

function handleComplete() {
  if (!order.value) return
  Modal.confirm({
    content: '确认将该销售订单标记为已完成？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      order.value.progressStatus = '已完成'
      message.success('订单已完成')
      reloadOrder()
    },
  })
}

function handleTerminate() {
  if (!order.value) return
  Modal.confirm({
    title: '确认作废',
    content: `确定作废销售订单「${order.value.orderNo}」吗？`,
    okType: 'danger',
    onOk: () => {
      order.value.progressStatus = '已作废'
      releaseOrderAllocations(order.value.id)
      message.success('订单已作废')
      reloadOrder()
    },
  })
}

function handleBack() {
  router.push('/sales/orders')
}

function goPurchaseReq(id) {
  const path = `/procurement/purchase-req/${id}`
  openTab(path, '采购申请详情')
  router.push(path)
}

function goPurchaseOrder(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-orders/${row.id}`
  openTab(path, `采购订单 ${row.orderNo}`)
  router.push({ name: 'procurement-purchase-orders-detail', params: { id: row.id } })
}

function goOutboundDetail(row) {
  const id = row?.outboundId || row?.id
  if (!id) return
  const path = `/inventory/outbound/${id}`
  openTab(path, row.outboundOrderNo || row.docNo || '出库单详情')
  router.push({ name: 'inventory-outbound-detail', params: { id } })
}

function goInboundDetail(row) {
  const id = row?.orderId
  if (!id) return
  const path = `/inventory/inbound/${id}`
  openTab(path, row.docNo ? `入库单 ${row.docNo}` : '入库单详情')
  router.push({ name: 'inventory-inbound-detail', params: { id } })
}

function goDeliveryDetail(row) {
  if (!row.deliveryOrderId) return
  const path = `/sales/delivery/${row.deliveryOrderId}`
  openTab(path, `发货单 ${row.deliveryCode}`)
  router.push({ name: 'sales-delivery-detail', params: { id: row.deliveryOrderId } })
}

function goWorkOrderDetail(row) {
  if (!row?.code) return
  const code = String(row.code)
  const inAssembly = assemblyWorkOrderState.orders.some((o) => o.id === row.id || o.code === code)
  const inProduction = workOrderState.orders.some((o) => o.id === row.id || o.code === code)
  if (!inAssembly && !inProduction) {
    message.info('未找到关联工单')
    return
  }
  const basePath = inAssembly ? '/production/assembly-work-orders' : '/production/work-orders'
  const path = `${basePath}?code=${encodeURIComponent(code)}`
  openTab(path, `工单 ${code}`)
  router.push({ path: basePath, query: { code } })
}

function openBomDetail(bomId, bomName) {
  if (!bomId) return
  const path = `/product-process/bom/${bomId}`
  openTab(path, bomName || 'BOM详情')
  router.push(path)
}
</script>

<style lang="less" scoped>
.link-code {
  color: #1677ff;
  cursor: pointer;
}

.sales-order-detail-page {
  margin: -12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: #f5f6f8;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    flex: 1;
    min-height: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: #f5f6f8;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
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
}

.detail-sticky-bar .detail-tabs-wrap {
  flex-shrink: 0;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  overflow: auto;
}

.pending-price-alert {
  margin-bottom: 12px;
}

.section-card {
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.section-title-row .section-title {
  margin-bottom: 0;
}

.price-summary-header .section-title {
  margin-bottom: 0;
}

.price-summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.discount-strategy-row {
  display: flex;
  align-items: center;
  gap: 8px;

  .strategy-label {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.65);
  }
}

.discount-strategy-tag {
  margin: 0;
  font-size: 13px;
}

.price-summary-divider {
  margin: 4px 0 14px;
}

.discount-reason-row {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed #f0f0f0;
  font-size: 13px;

  .reason-label {
    color: rgba(0, 0, 0, 0.45);
    margin-right: 8px;
  }

  .reason-text {
    color: rgba(0, 0, 0, 0.88);
  }
}

.price-summary-item {
  .price-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    margin-bottom: 4px;
  }

  .label-tip-icon {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.35);
    cursor: help;
  }

  .price-value {
    font-size: 14px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.88);

    &.discount {
      color: #cf1322;
    }

    &.price-value-final {
      font-size: 16px;
      font-weight: 600;
      color: #1677ff;
    }
  }
}

.section-hint {
  margin: -4px 0 10px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
}

.bom-line-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.bom-product-block {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px dashed #f0f0f0;

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.bom-product-name {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
}

.bom-product-code {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.sub-table {
  margin-bottom: 12px;
}

.history-item {
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
}

.history-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.history-user {
  font-weight: 500;
}

.history-role {
  font-size: 12px;
  color: #8c8c8c;
}

.price-change-approval-group {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.group-no {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.group-reason {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.history-time {
  margin-left: auto;
  font-size: 12px;
  color: #8c8c8c;
}

.history-opinion {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}

.il-qr-thumb {
  display: inline-flex;
  cursor: pointer;
  line-height: 0;
}

.il-qr-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 8px 0 4px;
}

.il-qr-modal-preview {
  padding: 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.il-qr-modal-meta {
  width: 100%;
}

.il-qr-code {
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  word-break: break-all;
  text-align: center;
}

.il-qr-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.il-qr-k {
  flex: 0 0 72px;
  color: rgba(0, 0, 0, 0.45);
}

.il-qr-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  text-align: center;
}
</style>
