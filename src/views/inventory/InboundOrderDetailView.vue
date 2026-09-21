<template>
  <div class="inbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.docNo }}</span>
              <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
              <span class="sub">{{ record.inboundType }}</span>
            </div>
            <a-space :size="8">
              <a-button size="small" @click="openPrint">打印</a-button>
              <template v-if="canApproveInbound(record)">
                <a-button type="primary" size="small" @click="handleApprovePass">通过</a-button>
                <a-button size="small" danger @click="handleApproveReject">拒绝</a-button>
                <a-button size="small" @click="goBack">返回列表</a-button>
              </template>
              <template v-else>
                <a-button
                  v-if="canConfirmInbound(record)"
                  type="primary"
                  size="small"
                  @click="handleConfirmInbound"
                >
                  确认入库
                </a-button>
                <a-button v-if="canRefuseInbound(record)" size="small" danger @click="openRefuse">
                  拒绝入库
                </a-button>
                <a-button v-if="canEditInbound(record)" size="small" @click="openEdit"
                  >编辑</a-button
                >
                <a-button v-if="canDeleteInbound(record)" size="small" danger @click="handleDelete">
                  删除
                </a-button>
                <a-button size="small" @click="goBack">返回列表</a-button>
              </template>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="activeTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="basic" tab="基本信息" />
              <a-tab-pane
                v-if="showRelatedTab"
                key="related"
                :tab="`关联单据 (${relatedTabCount})`"
              />
              <a-tab-pane v-if="showQcTab" key="qc" :tab="`质检信息 (${qcLines.length})`" />
              <a-tab-pane
                v-if="showCutSettleTab"
                key="cutSettle"
                :tab="`下料结算 (${cutSettleLines.length})`"
              />
              <a-tab-pane key="batches" :tab="`批次详情 (${batchList.length})`" />
              <a-tab-pane key="logs" :tab="`操作日志 (${operationLogs.length})`" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="activeTab === 'basic'">
            <DetailSectionCard title="基本信息">
              <InboundOrderBasicInfoSection :record="record">
                <template #sourceOrderNo>
                  <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                    record.sourceOrderNo
                  }}</a>
                  <span v-else>—</span>
                </template>
              </InboundOrderBasicInfoSection>
            </DetailSectionCard>

            <div v-if="workOrderList.length" class="section-card">
              <InboundWorkOrderList :work-orders="workOrderList" />
            </div>

            <DetailSectionCard title="入库明细">
              <a-table
                :columns="lineColumns"
                :data-source="record.lineItems || []"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: lineScrollX }"
              >
                <template #headerCell="{ column }">
                  <template v-if="column.key === 'qty'">
                    <span class="col-title-with-tip">
                      点收数量
                      <a-tooltip :title="RECEIVE_QTY_TIP">
                        <InfoCircleOutlined class="col-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <template v-else-if="column.key === 'stockUnitQty'">
                    <span class="col-title-with-tip">
                      入库数量
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
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'lineStatus'">
                    <a-tag :color="lineStatusColor(line.lineStatus)">
                      {{ line.lineStatus || '待入库' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'barcodeType'">
                    {{ line.barcodeType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'stockQty'">
                    {{ formatQty(line.stockQty) }}
                    <span class="unit-suffix">{{ resolveInboundStockUnit(line) }}</span>
                  </template>
                  <template v-else-if="column.key === 'warehouseStockQty'">
                    {{ formatQty(line.warehouseStockQty) }}
                    <span class="unit-suffix">{{ resolveInboundStockUnit(line) }}</span>
                  </template>
                  <template v-else-if="column.key === 'qty'">
                    {{ formatQtyWithUnit(getInboundQtyValue(line), resolveInboundQtyUnit(line)) }}
                  </template>
                  <template v-else-if="column.key === 'stockUnitQty'">
                    {{
                      formatQtyWithUnit(getStockUnitQtyValue(line), resolveInboundStockUnit(line))
                    }}
                  </template>
                  <template v-else-if="column.key === 'settleQty'">
                    {{
                      hasSettleUnit(line) ? formatQtyWithUnit(line.settleQty, line.settleUnit) : '—'
                    }}
                  </template>
                  <template v-else-if="column.key === 'lineSource'">
                    {{ line.lineSource || '—' }}
                  </template>
                  <template v-else-if="column.key === 'locationNo'">
                    {{ line.locationNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'sourceDocNo'">
                    {{ line.sourceDocNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'unitPrice'">
                    {{ line.unitPrice != null && line.unitPrice !== '' ? line.unitPrice : '—' }}
                  </template>
                  <template v-else-if="column.key === 'totalPrice'">
                    {{ line.totalPrice != null && line.totalPrice !== '' ? line.totalPrice : '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && line[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'related' && showRelatedTab">
            <!-- 领料入库：关联出库单 -->
            <DetailSectionCard v-if="isMaterialReqType" title="关联单据">
              <a-table
                :columns="relatedOutboundColumns"
                :data-source="relatedOutbounds"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1200 }"
                :locale="{ emptyText: '暂无关联领料出库单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="outboundStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goOutbound(row)">{{ row.docNo || '—' }}</a>
                  </template>
                  <template v-else-if="column.key === 'outboundQty'">
                    {{ formatQty(calcOutboundQty(row)) }}
                  </template>
                  <template v-else-if="column.key === 'outboundTime'">
                    {{ formatDateTimeMinute(row.outboundTime || row.auditDate) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'operatedAt'">
                    {{
                      formatDateTimeMinute(row.auditDate || row.updatedAt || row.completedAt) || '—'
                    }}
                  </template>
                  <template v-else-if="column.key === 'operator'">
                    {{ row.auditor || row.warehouseKeeper || row.updater || '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>

            <!-- 采购入库：采购单 + 收货单 -->
            <template v-else-if="isPurchaseType">
              <DetailSectionCard title="采购单信息">
                <a-table
                  :columns="relatedPurchaseOrderColumns"
                  :data-source="relatedPurchaseOrders"
                  row-key="id"
                  size="small"
                  bordered
                  :pagination="false"
                  :scroll="{ x: 1280 }"
                  :locale="{ emptyText: '暂无关联采购单' }"
                >
                  <template #bodyCell="{ column, record: row, index }">
                    <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                    <template v-else-if="column.key === 'status'">
                      <a-tag>{{ row.status || '—' }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'orderNo'">
                      <a class="link-code" @click.prevent="goPurchaseOrder(row)">{{
                        row.orderNo || '—'
                      }}</a>
                    </template>
                    <template v-else-if="column.key === 'purchaseQty'">
                      {{ formatQty(row.purchaseQty) }}
                    </template>
                    <template v-else-if="column.key === 'applyInboundQty'">
                      {{ formatQty(row.applyInboundQty) }}
                    </template>
                    <template v-else-if="column.key === 'receiptDate'">
                      {{ formatDateTimeMinute(row.receiptDate) || row.receiptDate || '—' }}
                    </template>
                    <template v-else-if="column.key === 'createdAt'">
                      {{ formatDateTimeMinute(row.createdAt) || '—' }}
                    </template>
                    <template v-else>
                      {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                    </template>
                  </template>
                </a-table>
              </DetailSectionCard>
              <DetailSectionCard title="采购收货单信息">
                <a-table
                  :columns="relatedPurchaseReceiptColumns"
                  :data-source="relatedPurchaseReceipts"
                  row-key="id"
                  size="small"
                  bordered
                  :pagination="false"
                  :scroll="{ x: 1280 }"
                  :locale="{ emptyText: '暂无关联采购收货单' }"
                >
                  <template #bodyCell="{ column, record: row, index }">
                    <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                    <template v-else-if="column.key === 'status'">
                      <a-tag>{{ row.receiptStatus || row.status || '—' }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'receiptNo'">
                      <a class="link-code" @click.prevent="goPurchaseReceipt(row)">{{
                        row.receiptNo || '—'
                      }}</a>
                    </template>
                    <template v-else-if="column.key === 'receiptQty'">
                      {{ formatQty(row.receiptQty) }}
                    </template>
                    <template v-else-if="column.key === 'applyInboundQty'">
                      {{ formatQty(row.applyInboundQty) }}
                    </template>
                    <template v-else-if="column.key === 'receiptDate'">
                      {{ formatDateTimeMinute(row.receiptDate) || row.receiptDate || '—' }}
                    </template>
                    <template v-else-if="column.key === 'createdAt'">
                      {{ formatDateTimeMinute(row.createdAt) || '—' }}
                    </template>
                    <template v-else>
                      {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                    </template>
                  </template>
                </a-table>
              </DetailSectionCard>
            </template>

            <!-- 盘点入库 -->
            <DetailSectionCard v-else-if="isStocktakeType" title="关联单据">
              <a-table
                :columns="relatedStocktakeColumns"
                :data-source="relatedStocktakes"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1400 }"
                :locale="{ emptyText: '暂无关联盘点单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="stocktakeStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goStocktake(row)">{{
                      row.docNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'stocktakeQty'">
                    {{ formatQty(row.stocktakeQty) }}
                  </template>
                  <template v-else-if="column.key === 'stocktakeDate'">
                    {{ row.stocktakeDate || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'approvedAt'">
                    {{ formatDateTimeMinute(row.approvedAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'postedAt'">
                    {{ formatDateTimeMinute(row.postedAt || row.confirmedAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>

            <!-- 调拨入库 -->
            <DetailSectionCard v-else-if="isTransferType" title="关联单据">
              <a-table
                :columns="relatedTransferColumns"
                :data-source="relatedTransfers"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1400 }"
                :locale="{ emptyText: '暂无关联调拨单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="transferStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goTransfer(row)">{{ row.docNo || '—' }}</a>
                  </template>
                  <template v-else-if="column.key === 'transferQty'">
                    {{ formatQty(row.transferQty) }}
                  </template>
                  <template v-else-if="column.key === 'transferDate'">
                    {{ row.transferDate || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'confirmedAt'">
                    {{ formatDateTimeMinute(row.confirmedAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'inboundConfirmedAt'">
                    {{ formatDateTimeMinute(row.inboundConfirmedAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && row[column.dataIndex]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'qc' && showQcTab">
            <DetailSectionCard title="质检信息">
              <a-table
                :columns="qcColumns"
                :data-source="qcLines"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: qcScrollX }"
                :locale="{ emptyText: '暂无质检信息' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'qcNo'">
                    <a class="link-code" @click.prevent="goQcDetail(row)">{{ row.qcNo || '—' }}</a>
                  </template>
                  <template v-else-if="column.key === 'qcStatus'">
                    <a-tag :color="qcStatusColor(row.qcStatus)">{{ row.qcStatus || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'qcResult'">
                    <a-tag v-if="row.qcResult" :color="qcResultColor(row.qcResult)">{{
                      row.qcResult
                    }}</a-tag>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'inspectQty'">
                    {{
                      row.inspectQty === '' || row.inspectQty == null
                        ? '—'
                        : formatQty(row.inspectQty)
                    }}
                  </template>
                  <template v-else-if="column.key === 'acceptInboundQty'">
                    {{
                      row.acceptInboundQty === '' ||
                      row.acceptInboundQty == null ||
                      row.acceptInboundQty === '—'
                        ? '—'
                        : formatQty(row.acceptInboundQty)
                    }}
                  </template>
                  <template v-else-if="column.key === 'inspectedAt'">
                    {{ formatDateTimeMinute(row.inspectedAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] ?? row[column.key] ?? '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'cutSettle' && showCutSettleTab">
            <DetailSectionCard title="下料结算">
              <a-table
                :columns="cutSettleColumns"
                :data-source="cutSettleLines"
                row-key="rowKey"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: cutSettleScrollX }"
                :locale="{ emptyText: '暂无下料结算单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag>{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    {{ row.docNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'demandMeters'">
                    {{ formatQtyWithUnit(row.demandMeters, row.unit) }}
                  </template>
                  <template v-else-if="column.key === 'actualConsumeMeters'">
                    {{ formatQtyWithUnit(row.actualConsumeMeters, row.unit) }}
                  </template>
                  <template v-else-if="column.key === 'remnantLength'">
                    {{ formatQtyWithUnit(row.remnantLength, row.unit) }}
                  </template>
                  <template v-else-if="column.key === 'confirmedAt'">
                    {{ formatDateTimeMinute(row.confirmedAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ (column.dataIndex && row[column.dataIndex]) || row[column.key] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'batches'">
            <DetailSectionCard title="批次详情">
              <a-empty v-if="!batchGroups.length" :image="false" description="暂无入库明细" />
              <div v-for="group in batchGroups" :key="group.key" class="batch-item-block">
                <div class="batch-item-head">
                  <span class="batch-item-code">{{ group.itemCode || '—' }}</span>
                  <span class="batch-item-name">{{ group.itemName || '—' }}</span>
                  <span v-if="group.material" class="batch-item-material">{{
                    group.material
                  }}</span>
                  <a-tag v-if="group.batches.length" color="blue">
                    {{ group.batches.length }} 批
                  </a-tag>
                </div>
                <a-table
                  :columns="batchColumns"
                  :data-source="group.batches"
                  row-key="id"
                  size="small"
                  bordered
                  :pagination="group.batches.length > 10 ? { pageSize: 10 } : false"
                  :scroll="{ x: 780 }"
                  :expandable="batchExpandableFor(group.batches)"
                >
                  <template #bodyCell="{ column, record: batch }">
                    <template v-if="column.key === 'currentLength'">
                      {{ formatQtyWithUnit(batch.currentLength, batch.unit || group.unit) }}
                      <span v-if="batch.attrs?.manageByPiece" class="piece-hint">
                        （{{ piecesOfBatch(batch.id).length }} 件）
                      </span>
                    </template>
                    <template v-else-if="column.key === 'salesOrderNo'">
                      {{ batch.salesOrderNo || '—' }}
                    </template>
                    <template v-else-if="column.key === 'ownership'">
                      <a-tag :color="batch.salesOrderNo ? 'blue' : 'default'">
                        {{ batch.salesOrderNo ? '按单' : '自由备货' }}
                      </a-tag>
                    </template>
                    <template v-else-if="column.key === 'status'">
                      <a-tag :color="batch.status === '在库' ? 'success' : 'default'">{{
                        batch.status || '—'
                      }}</a-tag>
                    </template>
                    <template v-else>
                      {{ (column.dataIndex && batch[column.dataIndex]) || '—' }}
                    </template>
                  </template>
                  <template #expandedRowRender="{ record: batch }">
                    <a-table
                      v-if="batch.attrs?.manageByPiece"
                      size="small"
                      bordered
                      :pagination="false"
                      :columns="pieceColumns"
                      :data-source="piecesOfBatch(batch.id)"
                      row-key="id"
                    >
                      <template #bodyCell="{ column, record: piece }">
                        <template v-if="column.key === 'pieceQty'">
                          {{ formatQty(piece.pieceQty) }}
                          <span class="unit-suffix">{{ piece.unit || '' }}</span>
                        </template>
                        <template v-else-if="column.key === 'status'">
                          <a-tag :color="piece.status === '在库' ? 'success' : 'default'">{{
                            piece.status || '—'
                          }}</a-tag>
                        </template>
                      </template>
                      <template #emptyText>
                        <span class="empty-inline">暂无件码</span>
                      </template>
                    </a-table>
                    <span v-else class="empty-inline">合计入库，无件码</span>
                  </template>
                  <template #emptyText>
                    <a-empty
                      :image="false"
                      :description="
                        record.status === '已入库'
                          ? '该物品暂无批次记录'
                          : '确认入库后生成库存批次：合计为一批；按件（一物一码，或一类/一批的单件、逐件）为 1 父批 + 四位 SN'
                      "
                    />
                  </template>
                </a-table>
              </div>
            </DetailSectionCard>
          </template>

          <template v-else-if="activeTab === 'logs'">
            <DetailSectionCard title="操作日志">
              <a-table
                :columns="logColumns"
                :data-source="operationLogs"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无操作日志' }"
              />
            </DetailSectionCard>
          </template>
        </div>
      </template>
      <a-empty v-else-if="!loading" description="未找到该入库单" />
    </a-spin>

    <InboundRefuseModal
      v-model:open="refuseModalOpen"
      :doc-nos="refuseDocNos"
      @confirm="onRefuseConfirm"
    />
    <InboundOrderPrintModal v-model:open="printModalOpen" :order="record" />
  </div>
</template>

<script>
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
export default { name: 'InboundOrderDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { Modal, message } from 'ant-design-vue'
import {
  getInboundOrderById,
  approveInboundOrder,
  rejectInboundOrder,
  confirmInboundOrders,
  deleteInboundOrder,
  refuseInbound,
  canConfirmInbound,
  canRefuseInbound,
  canEditInbound,
  canDeleteInbound,
  canApproveInbound,
} from '@/store/inboundOrderStore'
import { inboundStatusColor } from '@/mock/inboundOptions'
import { stockBatchState } from '@/store/stockBatchStore'
import { listStockPieces, stockPieceState } from '@/store/stockPieceStore'
import { resolveInboundSourceRoute } from '@/utils/inboundSourceLink'
import {
  inboundDetailLineColumns,
  RECEIVE_QTY_TIP,
  STOCK_UNIT_QTY_TIP,
  SETTLE_QTY_TIP,
} from '@/utils/inboundLineColumns'
import {
  enrichInboundLine,
  getInboundQtyValue,
  getStockUnitQtyValue,
  resolveInboundQtyUnit,
  resolveInboundStockUnit,
} from '@/utils/inboundLineHelpers'
import { hasSettleUnit } from '@/utils/settleUnit'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { outboundStatusColor } from '@/mock/outboundOptions'
import { stocktakeStatusColor } from '@/mock/stocktakeOptions'
import { transferStatusColor } from '@/mock/transferOptions'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import { getQcTaskRouteBundle } from '@/utils/qcTaskRoutes'
import {
  isMaterialReqInbound,
  isPurchaseInbound,
  isFinishedOrSemiInbound,
  isStocktakeInbound,
  isTransferInbound,
  isRemnantInbound,
  listRelatedOutboundsForInbound,
  listRelatedPurchaseOrdersForInbound,
  listRelatedPurchaseReceiptsForInbound,
  listPurchaseQcLinesForInbound,
  listFinishedQcLinesForInbound,
  listRelatedStocktakesForInbound,
  listRelatedTransfersForInbound,
  listRelatedCutSettleLinesForInbound,
} from '@/utils/inboundRelatedDocs'
import InboundOrderBasicInfoSection from './components/InboundOrderBasicInfoSection.vue'
import InboundWorkOrderList from './components/InboundWorkOrderList.vue'
import InboundRefuseModal from './components/InboundRefuseModal.vue'
import InboundOrderPrintModal from './components/InboundOrderPrintModal.vue'
import { resolveInboundWorkOrders } from '@/utils/inboundWorkOrders'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const activeTab = ref('basic')
const refuseModalOpen = ref(false)
const printModalOpen = ref(false)
const refuseDocNos = computed(() => (record.value ? [record.value.docNo || record.value.id] : []))

const workOrderList = computed(() => resolveInboundWorkOrders(record.value))

const lineColumns = inboundDetailLineColumns
const lineScrollX = computed(() => lineColumns.reduce((s, c) => s + (c.width || 80), 0))

const batchColumns = [
  { title: '批次号', dataIndex: 'batchNo', key: 'batchNo', width: 130 },
  { title: '销售订单号', key: 'salesOrderNo', dataIndex: 'salesOrderNo', width: 130 },
  { title: '归属', key: 'ownership', width: 88 },
  { title: '仓库', dataIndex: 'warehouse', key: 'warehouse', width: 100 },
  { title: '数量', key: 'currentLength', width: 140 },
  { title: '状态', key: 'status', width: 88 },
  { title: '来源类型', dataIndex: 'sourceType', key: 'sourceType', width: 100 },
]

const operationLogs = computed(() => record.value?.operationLogs || [])

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const isMaterialReqType = computed(() => isMaterialReqInbound(record.value))
const isPurchaseType = computed(() => isPurchaseInbound(record.value))
const isFinishedType = computed(() => isFinishedOrSemiInbound(record.value))
const isStocktakeType = computed(() => isStocktakeInbound(record.value))
const isTransferType = computed(() => isTransferInbound(record.value))
const isRemnantType = computed(() => isRemnantInbound(record.value))

const relatedOutbounds = computed(() => listRelatedOutboundsForInbound(record.value))
const relatedPurchaseOrders = computed(() => listRelatedPurchaseOrdersForInbound(record.value))
const relatedPurchaseReceipts = computed(() => listRelatedPurchaseReceiptsForInbound(record.value))
const relatedStocktakes = computed(() => listRelatedStocktakesForInbound(record.value))
const relatedTransfers = computed(() => listRelatedTransfersForInbound(record.value))
const cutSettleLines = computed(() => listRelatedCutSettleLinesForInbound(record.value))

const purchaseQcLines = computed(() => listPurchaseQcLinesForInbound(record.value))
const finishedQcLines = computed(() => listFinishedQcLinesForInbound(record.value))
const qcLines = computed(() =>
  isPurchaseType.value ? purchaseQcLines.value : isFinishedType.value ? finishedQcLines.value : [],
)

const showRelatedTab = computed(
  () =>
    isMaterialReqType.value ||
    isPurchaseType.value ||
    isStocktakeType.value ||
    isTransferType.value,
)
const showQcTab = computed(() => isPurchaseType.value || isFinishedType.value)
const showCutSettleTab = computed(() => isRemnantType.value)

const relatedTabCount = computed(() => {
  if (isMaterialReqType.value) return relatedOutbounds.value.length
  if (isPurchaseType.value)
    return relatedPurchaseOrders.value.length + relatedPurchaseReceipts.value.length
  if (isStocktakeType.value) return relatedStocktakes.value.length
  if (isTransferType.value) return relatedTransfers.value.length
  return 0
})

const relatedOutboundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '出库单号', key: 'docNo', width: 150 },
  { title: '出库仓库', dataIndex: 'warehouse', width: 120, ellipsis: true },
  { title: '出库数量', key: 'outboundQty', width: 100, align: 'right' },
  { title: '出库时间', key: 'outboundTime', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '操作人', key: 'operator', width: 90 },
  { title: '操作时间', key: 'operatedAt', width: 150 },
]

const relatedPurchaseOrderColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '采购单号', key: 'orderNo', width: 150 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 100, align: 'right' },
  { title: '申请入库数量', key: 'applyInboundQty', width: 120, align: 'right' },
  { title: '入库仓库', dataIndex: 'inboundWarehouse', width: 120 },
  { title: '收货日期', key: 'receiptDate', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const relatedPurchaseReceiptColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '采购收货单号', key: 'receiptNo', width: 160 },
  { title: '供应商', dataIndex: 'supplier', width: 140, ellipsis: true },
  { title: '收货数量', key: 'receiptQty', width: 100, align: 'right' },
  { title: '申请入库数量', key: 'applyInboundQty', width: 120, align: 'right' },
  { title: '入库仓库', dataIndex: 'inboundWarehouse', width: 120 },
  { title: '收货日期', key: 'receiptDate', width: 140 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const relatedStocktakeColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '盘点单号', key: 'docNo', width: 150 },
  { title: '盘点仓库', dataIndex: 'warehouse', width: 120 },
  { title: '盘点类型', dataIndex: 'stocktakeType', width: 100 },
  { title: '盘点数量', key: 'stocktakeQty', width: 100, align: 'right' },
  { title: '盘点日期', key: 'stocktakeDate', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '审核人', dataIndex: 'approver', width: 90 },
  { title: '审核时间', key: 'approvedAt', width: 150 },
  { title: '过账人', dataIndex: 'poster', width: 90 },
  { title: '过账时间', key: 'postedAt', width: 150 },
]

const relatedTransferColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '调拨单号', key: 'docNo', width: 150 },
  { title: '调出仓库', dataIndex: 'fromWarehouse', width: 120 },
  { title: '调入仓库', dataIndex: 'toWarehouse', width: 120 },
  { title: '调拨数量', key: 'transferQty', width: 100, align: 'right' },
  { title: '调拨日期', key: 'transferDate', width: 120 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', key: 'confirmedAt', width: 150 },
  { title: '入库方确认人', dataIndex: 'inboundConfirmer', width: 110 },
  { title: '入库方确认时间', key: 'inboundConfirmedAt', width: 150 },
]

const purchaseQcColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '质检单号', key: 'qcNo', width: 150 },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '质检数量', key: 'inspectQty', width: 100, align: 'right' },
  { title: '处理方案', dataIndex: 'treatmentPlan', width: 100 },
  { title: '合格入库数', key: 'acceptInboundQty', width: 100, align: 'right' },
  { title: '退/换货', dataIndex: 'returnExchange', width: 120, ellipsis: true },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const finishedQcColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '质检单号', key: 'qcNo', width: 150 },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '质检数量', key: 'inspectQty', width: 100, align: 'right' },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
]

const qcColumns = computed(() => (isPurchaseType.value ? purchaseQcColumns : finishedQcColumns))
const qcScrollX = computed(() => qcColumns.value.reduce((s, c) => s + (c.width || 100), 0))

const cutSettleColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '结算单号', key: 'docNo', width: 140 },
  { title: '物料名称', dataIndex: 'itemName', width: 140, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 140, ellipsis: true },
  { title: '需求数', key: 'demandMeters', width: 100, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 100, align: 'right' },
  { title: '余料', key: 'remnantLength', width: 100, align: 'right' },
  { title: '工单编号', dataIndex: 'workOrderNo', width: 140 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', key: 'confirmedAt', width: 150 },
  { title: '拣选批次', dataIndex: 'pickedBatchNo', width: 140 },
  { title: '余料新批次', dataIndex: 'remnantBatchNo', width: 140 },
]
const cutSettleScrollX = cutSettleColumns.reduce((s, c) => s + (c.width || 100), 0)

function calcOutboundQty(row) {
  return (row?.lineItems || []).reduce((s, l) => s + (Number(l.shipQty ?? l.qty) || 0), 0)
}

function qcStatusColor(status) {
  const map = {
    待质检: 'warning',
    检验中: 'processing',
    已完成: 'success',
    已终止: 'default',
  }
  return map[status] || 'default'
}

function qcResultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL || result === '部分合格') return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

function goOutbound(row) {
  if (!row?.id) return
  const path = `/inventory/outbound/${row.id}`
  openTab(path, `出库单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-outbound-detail', params: { id: row.id } })
}

function goPurchaseOrder(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-orders/${row.id}`
  openTab(path, `采购单 ${row.orderNo || ''}`.trim())
  router.push({ name: 'procurement-purchase-orders-detail', params: { id: row.id } })
}

function goPurchaseReceipt(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-receipts/${row.id}`
  openTab(path, `收货单 ${row.receiptNo || ''}`.trim())
  router.push({ name: 'procurement-purchase-receipts-detail', params: { id: row.id } })
}

function goStocktake(row) {
  if (!row?.id) return
  const path = `/inventory/stocktake/${row.id}`
  openTab(path, `盘点单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-stocktake-detail', params: { id: row.id } })
}

function goTransfer(row) {
  if (!row?.id) return
  const path = `/inventory/transfer/${row.id}`
  openTab(path, `调拨单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-transfer-detail', params: { id: row.id } })
}

function goQcDetail(row) {
  if (!row?.taskId && !row?.id) return
  const taskId = row.taskId || row.id
  const scope = row.bizScope || (isFinishedType.value ? '成品检' : '来料质检')
  const bundle = getQcTaskRouteBundle(scope)
  const path = `${bundle.listPath}/${taskId}`
  openTab(path, row.qcNo || bundle.detailTitle)
  router.push({ name: bundle.detailName, params: { id: taskId } })
}

const pieceColumns = [
  { title: '件码', dataIndex: 'serialNo', key: 'serialNo', width: 160 },
  { title: '单件数量', key: 'pieceQty', width: 120 },
  { title: '状态', key: 'status', width: 88 },
]

const batchList = computed(() => {
  const docNo = record.value?.docNo
  if (!docNo) return []
  const fromLines = new Set()
  ;(record.value?.lineItems || []).forEach((line) => {
    ;(line.batchNos || []).forEach((no) => {
      if (no) fromLines.add(String(no))
    })
  })
  return stockBatchState.batches.filter((b) => {
    if (b.sourceDocNo === docNo) return true
    if (fromLines.size && fromLines.has(String(b.batchNo))) return true
    return false
  })
})

/** 按入库明细分组：上方编号+名称+材质，下方该物品批次 */
const batchGroups = computed(() => {
  const lines = record.value?.lineItems || []
  const allBatches = batchList.value
  const usedBatchIds = new Set()

  const groups = lines.map((line, index) => {
    const code = line.itemCode || ''
    const lineBatchNos = new Set((line.batchNos || []).map((no) => String(no)))
    const batches = allBatches.filter((b) => {
      if (usedBatchIds.has(b.id)) return false
      const matchByNo = lineBatchNos.size && lineBatchNos.has(String(b.batchNo))
      const matchByCode = code && b.itemCode === code
      if (matchByNo || matchByCode) {
        usedBatchIds.add(b.id)
        return true
      }
      return false
    })
    return {
      key: line.id || `${code || 'line'}-${index}`,
      itemCode: code,
      itemName: line.itemName || '',
      material: line.material || '',
      unit: line.stockUnit || line.unit || '',
      batches,
    }
  })

  // 未能挂到明细行的批次（兜底一组）
  const orphanBatches = allBatches.filter((b) => !usedBatchIds.has(b.id))
  if (orphanBatches.length) {
    groups.push({
      key: 'orphan-batches',
      itemCode: '',
      itemName: '其他批次',
      material: '',
      unit: '',
      batches: orphanBatches,
    })
  }

  return groups
})

function batchExpandableFor(batches) {
  return {
    defaultExpandAllRows: (batches || []).some((b) => b.attrs?.manageByPiece),
    rowExpandable: (batch) => Boolean(batch.attrs?.manageByPiece),
  }
}

function piecesOfBatch(batchId) {
  // 依赖 stockPieceState 以触发响应式刷新
  void stockPieceState.pieces.length
  return listStockPieces({ batchId })
}

function reload() {
  const row = getInboundOrderById(route.params.id)
  record.value = row
    ? {
        ...row,
        lineItems: (row.lineItems || []).map((l) => enrichInboundLine({ ...l })),
      }
    : null
}

function statusColor(status) {
  return inboundStatusColor(status)
}

function lineStatusColor(status) {
  const st = status || '待入库'
  if (st === '已入库') return 'success'
  if (st === '已拒绝') return 'error'
  return 'processing'
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    activeTab.value = 'basic'
    reload()
    loading.value = false
  },
  { immediate: true },
)

watch(
  () => [showRelatedTab.value, showQcTab.value, showCutSettleTab.value, activeTab.value],
  () => {
    if (activeTab.value === 'related' && !showRelatedTab.value) activeTab.value = 'basic'
    if (activeTab.value === 'qc' && !showQcTab.value) activeTab.value = 'basic'
    if (activeTab.value === 'cutSettle' && !showCutSettleTab.value) activeTab.value = 'basic'
  },
)

function goBack() {
  router.push('/inventory/inbound')
}

function goSource() {
  const r = resolveInboundSourceRoute(record.value)
  if (r?.path) router.push(r.path)
}

function openEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/inbound/${record.value.id}/edit`,
    title: `编辑入库单 ${record.value.docNo || ''}`.trim(),
  })
}

function handleApprovePass() {
  Modal.confirm({
    title: `通过审批 ${record.value.docNo}？`,
    content: '通过后状态变为「待入库」，可进行确认入库。',
    onOk: () => {
      const res = approveInboundOrder(record.value.id)
      if (res.ok) {
        message.success('审批已通过')
        reload()
      } else message.warning(res.message)
    },
  })
}

function handleApproveReject() {
  Modal.confirm({
    title: `拒绝入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      const res = rejectInboundOrder(record.value.id)
      if (res.ok) {
        message.success('已拒绝')
        reload()
      } else message.warning(res.message)
    },
  })
}

function openRefuse() {
  refuseModalOpen.value = true
}

function openPrint() {
  if (!record.value) return
  printModalOpen.value = true
}

function onRefuseConfirm(reason) {
  if (!record.value?.id) return
  const result = refuseInbound([record.value.id], { reason })
  if (result.blocked?.length) {
    message.warning(result.blocked.map((b) => b.message).join('；'))
    return
  }
  if (result.count > 0) {
    message.success('已拒绝入库')
    refuseModalOpen.value = false
    reload()
  }
}

function handleConfirmInbound() {
  Modal.confirm({
    title: `确认入库 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked } = confirmInboundOrders([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (count > 0) {
        message.success('已确认入库')
        reload()
        activeTab.value = 'batches'
      } else {
        message.warning('确认入库失败')
      }
    },
  })
}

function handleDelete() {
  Modal.confirm({
    title: `确认删除入库单 ${record.value.docNo}？`,
    okType: 'danger',
    onOk: () => {
      if (deleteInboundOrder(record.value.id)) {
        message.success('已删除')
        goBack()
      } else {
        message.warning('当前状态不可删除')
      }
    },
  })
}
</script>

<style lang="less" scoped>
.inbound-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;

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
  background: var(--page-bg, #f0f2f5);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
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

.sub {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
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
  margin-bottom: 8px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;
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

.piece-hint {
  margin-left: 4px;
  color: #1677ff;
  font-size: 12px;
}

.empty-inline {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.batch-item-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.batch-item-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.batch-item-code {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.batch-item-name {
  color: rgba(0, 0, 0, 0.75);
}

.batch-item-material {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;

  &::before {
    content: '·';
    margin-right: 6px;
  }
}
</style>
