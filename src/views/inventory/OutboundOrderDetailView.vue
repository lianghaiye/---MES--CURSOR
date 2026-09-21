<template>
  <div class="outbound-detail-page">
    <a-spin :spinning="loading">
      <template v-if="record">
        <div class="detail-sticky-bar">
          <div class="page-header">
            <div class="header-left">
              <span class="order-no">{{ record.docNo }}</span>
              <a-tag :color="outboundStatusColor(record.status)">{{ record.status }}</a-tag>
              <span class="sub">{{ record.outboundType }}</span>
            </div>
            <a-space :size="8">
              <a-button size="small" @click="openPrint">打印</a-button>
              <a-button
                v-if="canApproveOutbound(record)"
                type="primary"
                size="small"
                @click="handleApprove"
              >
                审批
              </a-button>
              <a-button
                v-if="canConfirm(record)"
                type="primary"
                size="small"
                @click="handleConfirmOutbound"
              >
                确认出库
              </a-button>
              <a-button
                v-if="canRefuseOutbound(record)"
                size="small"
                danger
                @click="handleRefuseOutbound"
              >
                拒绝出库
              </a-button>
              <a-button v-if="canEditOutbound(record)" size="small" @click="openEdit">
                编辑
              </a-button>
              <a-button v-if="canDeleteOutbound(record)" size="small" danger @click="handleDelete">
                删除
              </a-button>
              <a-button v-if="canInitiateFactoryQc(record)" size="small" @click="handleInitiateQc">
                {{ initiateQcActionLabel(record) }}
              </a-button>
              <a-button size="small" @click="goBack">返回列表</a-button>
            </a-space>
          </div>

          <div class="detail-tabs-wrap">
            <a-tabs
              v-model:active-key="infoTab"
              class="detail-tabs detail-tabs-pill detail-tabs-pill--nav-only"
            >
              <a-tab-pane key="basic" tab="基本信息" />
              <a-tab-pane
                v-if="isSalesOutbound"
                key="relatedDelivery"
                :tab="`关联单据 (${relatedDeliveries.length})`"
              />
              <a-tab-pane
                v-if="isSalesOutbound"
                key="relatedQc"
                :tab="`关联质检 (${relatedFactoryQcList.length})`"
              />
              <a-tab-pane
                v-if="isPurchaseReturnOutbound"
                key="relatedPurchaseReturn"
                :tab="`关联单据 (${relatedPurchaseReturns.length})`"
              />
              <a-tab-pane
                v-if="isMaterialReqOutbound"
                key="related"
                :tab="`关联单据 (${relatedInbounds.length})`"
              />
              <a-tab-pane
                v-if="isTransferOutbound"
                key="relatedTransfer"
                :tab="`关联单据 (${relatedTransfers.length})`"
              />
              <a-tab-pane
                v-if="isStocktakeOutbound"
                key="relatedStocktake"
                :tab="`关联单据 (${relatedStocktakes.length})`"
              />
              <a-tab-pane
                v-if="isMaterialReqOutbound"
                key="cutSettle"
                :tab="`下料结算 (${relatedCutSettleLines.length})`"
              />
              <a-tab-pane key="logs" tab="操作日志" />
            </a-tabs>
          </div>
        </div>

        <div class="tab-body">
          <template v-if="infoTab === 'basic'">
            <DetailSectionCard title="基本信息">
              <OutboundOrderBasicInfoSection
                :record="record"
                :is-material-req-outbound="isMaterialReqOutbound"
              >
                <template #sourceOrderNo>
                  <a v-if="record.sourceOrderNo" class="link-code" @click="goSource">{{
                    record.sourceOrderNo
                  }}</a>
                  <span v-else>—</span>
                </template>
                <template #salesOrderNo>
                  <a v-if="record.salesOrderNo" class="link-code" @click="goSalesOrder">{{
                    record.salesOrderNo
                  }}</a>
                  <span v-else>—</span>
                </template>
                <template #factoryQc>
                  <a v-if="linkedQc" class="link-code" @click="goFactoryQc">{{ linkedQc.qcNo }}</a>
                  <span v-else>—</span>
                </template>
              </OutboundOrderBasicInfoSection>
            </DetailSectionCard>

            <div v-if="workOrderList.length" class="section-card">
              <OutboundWorkOrderList :work-orders="workOrderList" />
            </div>

            <div v-if="outsourcingOrderList.length" class="section-card">
              <OutboundOutsourcingOrderList :outsourcing-orders="outsourcingOrderList" />
            </div>

            <DetailSectionCard title="出库明细">
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
                  <template v-if="column.key === 'batchPick'">
                    <span class="col-title-with-tip">
                      拣选批次
                      <a-tooltip title="出库确认时实际扣减的批次">
                        <InfoCircleOutlined class="col-tip-icon" />
                      </a-tooltip>
                    </span>
                  </template>
                  <template v-else>{{ column.title }}</template>
                </template>
                <template #bodyCell="{ column, record: line, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'lineStatus'">
                    <a-tag
                      :color="(line.lineStatus || '待出库') === '已出库' ? 'success' : 'processing'"
                    >
                      {{ line.lineStatus || '待出库' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'locationNo'">
                    {{ line.locationNo || '—' }}
                  </template>
                  <template v-else-if="column.key === 'shipQty'">
                    {{ formatQtyWithUnit(line.shipQty, resolveOutboundStockUnit(line)) }}
                  </template>
                  <template v-else-if="column.key === 'weight'">
                    {{ line.weight != null && line.weight !== '' ? formatQty(line.weight) : '—' }}
                  </template>
                  <template v-else-if="column.key === 'blankSizeText'">
                    <template v-if="line.blankSizeText">
                      {{ line.blankSizeText }}
                      <div v-if="line.blankArea > 0" class="blank-size-hint">
                        ≈ {{ formatQty(line.blankArea) }}㎡/件
                      </div>
                      <div v-else-if="line.blankLength > 0" class="blank-size-hint">
                        ≈ {{ formatQty(line.blankLength) }}米/件
                      </div>
                    </template>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'batchPick'">
                    <template v-if="formatOutboundIssuedBatchText(line)">
                      <div v-if="line.manualBatchPick" class="manual-pick-tag">自主拣选</div>
                      <span>{{ formatOutboundIssuedBatchText(line) }}</span>
                      <div
                        v-if="normalizePieceSerialNos(line.issuedPieceSerialNos).length"
                        class="piece-serials"
                      >
                        件码：{{ normalizePieceSerialNos(line.issuedPieceSerialNos).join('、') }}
                      </div>
                    </template>
                    <span v-else-if="(line.lineStatus || '待出库') !== '已出库'">
                      {{ line.manualBatchPick ? '待选批次' : '确认出库时扣减批次' }}
                    </span>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'barcodeType'">
                    {{ line.barcodeType || '—' }}
                  </template>
                  <template v-else-if="column.key === 'packagingForm'">
                    {{ line.packagingForm || '—' }}
                  </template>
                  <template v-else-if="column.key === 'deliveryRemark'">
                    <a-tooltip v-if="line.deliveryRemark" :title="line.deliveryRemark">
                      <span class="delivery-remark-cell">{{ line.deliveryRemark }}</span>
                    </a-tooltip>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'unitPrice'">
                    {{ line.unitPrice != null ? line.unitPrice : '—' }}
                  </template>
                  <template v-else-if="column.key === 'totalPrice'">
                    {{ line.totalPrice != null ? line.totalPrice : '—' }}
                  </template>
                  <template v-else-if="column.key === 'lineSource'">
                    {{ line.lineSource || '—' }}
                  </template>
                  <template v-else-if="column.key === 'sourceDocNo'">
                    {{ line.sourceDocNo || '—' }}
                  </template>
                </template>
                <template #summary>
                  <a-table-summary v-if="record.lineItems?.length">
                    <a-table-summary-row class="line-summary-row">
                      <a-table-summary-cell
                        v-for="(col, colIndex) in lineColumns"
                        :key="col.key"
                        :index="colIndex"
                        :align="col.align"
                      >
                        <template v-if="col.key === 'index'">合计</template>
                        <template v-else-if="col.key === 'itemCode'">
                          项数 {{ lineSummary.lineCount }}
                        </template>
                        <template v-else-if="col.key === 'shipQty'">
                          {{ formatQty(lineSummary.shipQtyTotal) }}
                        </template>
                        <template v-else-if="col.key === 'weight'">
                          {{ formatQty(lineSummary.weightTotal) }}
                        </template>
                        <template v-else-if="col.key === 'totalPrice'">
                          {{ formatMoney(lineSummary.totalPrice) }}
                        </template>
                      </a-table-summary-cell>
                    </a-table-summary-row>
                  </a-table-summary>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'relatedDelivery' && isSalesOutbound">
            <DetailSectionCard title="关联单据">
              <a-table
                :columns="relatedDeliveryColumns"
                :data-source="relatedDeliveries"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1280 }"
                :locale="{ emptyText: '暂无关联销售发货单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'deliveryStatus'">
                    <a-tag :color="deliveryStatusColor(row.deliveryStatus)">{{
                      row.deliveryStatus || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'deliveryCode'">
                    <a v-if="row.deliveryCode" class="link-code" @click.prevent="goDelivery(row)">
                      {{ row.deliveryCode }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'applyShipQty'">
                    {{ formatOutboundQtyInt(row.applyShipQty) }}
                  </template>
                  <template v-else-if="column.key === 'actualOutboundQty'">
                    {{ formatOutboundQtyInt(row.actualOutboundQty) }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'relatedQc' && isSalesOutbound">
            <DetailSectionCard title="关联质检">
              <a-table
                :columns="relatedQcColumns"
                :data-source="relatedFactoryQcList"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: 1280 }"
                :locale="{ emptyText: '暂无关联出厂质检单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'qcNo'">
                    <a v-if="row.qcNo" class="link-code" @click.prevent="openFactoryQcDetail(row)">
                      {{ row.qcNo }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'qcStatus'">
                    <a-tag :color="factoryQcStatusColor(row.qcStatus)">{{
                      row.qcStatus || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'qcResult'">
                    <a-tag v-if="row.qcResult" :color="factoryQcResultColor(row.qcResult)">{{
                      row.qcResult
                    }}</a-tag>
                    <span v-else>—</span>
                  </template>
                  <template v-else-if="column.key === 'qcQty'">
                    {{ formatFactoryQcQty(row) }}
                  </template>
                  <template v-else-if="column.key === 'inspectedAt'">
                    {{ formatDateTimeMinute(row.inspectedAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'related' && isMaterialReqOutbound">
            <DetailSectionCard title="关联单据">
              <a-table
                :columns="relatedInboundColumns"
                :data-source="relatedInbounds"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无领入仓入库单（确认出库后生成）' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="inboundStatusColor(row.status)">{{ row.status || '—' }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goInbound(row)">{{ row.docNo || '—' }}</a>
                  </template>
                  <template v-else-if="column.key === 'inboundAt'">
                    {{
                      formatDateTimeMinute(row.confirmedAt || row.inboundTime || row.createdAt) ||
                      '—'
                    }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'relatedTransfer' && isTransferOutbound">
            <DetailSectionCard title="关联单据">
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
                    {{ formatDateTimeMinute(row.transferDate) || '—' }}
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
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'relatedStocktake' && isStocktakeOutbound">
            <DetailSectionCard title="关联单据">
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
                    {{ formatDateTimeMinute(row.stocktakeDate) || '—' }}
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
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'relatedPurchaseReturn' && isPurchaseReturnOutbound">
            <DetailSectionCard title="关联单据">
              <a-table
                :columns="relatedPurchaseReturnColumns"
                :data-source="relatedPurchaseReturns"
                row-key="id"
                size="small"
                bordered
                :pagination="false"
                :locale="{ emptyText: '暂无关联的采购退货单' }"
                :scroll="{ x: 1280 }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="purchaseReturnStatusColor(row.status)">{{
                      row.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'outboundStatus'">
                    <a-tag :color="purchaseReturnOutboundStatusColor(row.outboundStatus)">{{
                      row.outboundStatus || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'returnNo'">
                    <a class="link-code" @click.prevent="goPurchaseReturn(row)">{{
                      row.returnNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'returnQty'">
                    {{ row.returnQtyText || '—' }}
                  </template>
                  <template v-else-if="column.key === 'createdAt'">
                    {{ formatDateTimeMinute(row.createdAt) || '—' }}
                  </template>
                  <template v-else-if="column.key === 'updatedAt'">
                    {{ formatDateTimeMinute(row.updatedAt) || '—' }}
                  </template>
                  <template v-else>
                    {{ row[column.dataIndex] || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'cutSettle'">
            <DetailSectionCard title="下料结算">
              <a-table
                :columns="cutSettleColumns"
                :data-source="relatedCutSettleLines"
                row-key="rowKey"
                size="small"
                bordered
                :pagination="false"
                :scroll="{ x: cutSettleScrollX }"
                :locale="{ emptyText: '暂无关联的下料结算单' }"
              >
                <template #bodyCell="{ column, record: row, index }">
                  <template v-if="column.key === 'index'">{{ index + 1 }}</template>
                  <template v-else-if="column.key === 'status'">
                    <a-tag :color="row.status === '已确认' ? 'green' : 'orange'">{{
                      row.status || '—'
                    }}</a-tag>
                  </template>
                  <template v-else-if="column.key === 'docNo'">
                    <a class="link-code" @click.prevent="goCutSettle(row)">{{
                      row.docNo || '—'
                    }}</a>
                  </template>
                  <template v-else-if="column.key === 'demandMeters'">
                    {{ formatQtyWithUnit(row.demandMeters, cutSettleLineUnit(row)) }}
                  </template>
                  <template v-else-if="column.key === 'actualConsumeMeters'">
                    {{ formatQtyWithUnit(row.actualConsumeMeters, cutSettleLineUnit(row)) }}
                  </template>
                  <template v-else-if="column.key === 'remnantLength'">
                    {{ formatQtyWithUnit(row.remnantLength, cutSettleLineUnit(row)) }}
                  </template>
                  <template v-else-if="column.key === 'remnantInboundDocNo'">
                    <a
                      v-if="row.remnantInboundDocNo"
                      class="link-code"
                      @click.prevent="goRemnantInbound(row)"
                    >
                      {{ row.remnantInboundDocNo }}
                    </a>
                    <span v-else>—</span>
                  </template>
                  <template v-else>
                    {{ (column.dataIndex ? row[column.dataIndex] : row[column.key]) || '—' }}
                  </template>
                </template>
              </a-table>
            </DetailSectionCard>
          </template>

          <template v-else-if="infoTab === 'logs'">
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
      <a-empty v-else-if="!loading" description="未找到该出库单" />
    </a-spin>

    <OutboundRefuseModal
      v-model:open="refuseModalOpen"
      :doc-nos="record ? [record.docNo] : []"
      @confirm="submitRefuse"
    />

    <OutboundOrderPrintModal v-model:open="printModalOpen" :order="record" />
  </div>
</template>

<script>
import { formatQty, formatQtyWithUnit } from '@/utils/numberFormat'
export default { name: 'OutboundOrderDetailView' }
</script>

<script setup>
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Modal, message } from 'ant-design-vue'
import { outboundStatusColor, isOutboundBusinessSource } from '@/mock/outboundOptions'
import {
  getOutboundOrderById,
  confirmOutbound,
  refuseOutbound,
  canRefuseOutbound,
  validateOutboundForConfirm,
  initiateFactoryQcFromOutbound,
  canInitiateFactoryQc,
  approveOutboundOrder,
  canApproveOutbound,
  canEditOutbound,
  canDeleteOutbound,
  deleteOutboundOrder,
} from '@/store/outboundStore'
import { cutSettleState } from '@/store/cutSettleStore'
import {
  factoryQcState,
  getFactoryQcById,
  listFactoryQcByOutbound,
  qcResultBlocksOutbound,
} from '@/store/factoryQcStore'
import { findSalesOrderByOrderNo } from '@/store/salesOrderStore'
import { tabStore, useTabs } from '@/composables/useTabs'
import { openCreateTab } from '@/utils/openCreateTab'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import { outboundDetailLineColumns, filterOutboundLineColumns } from '@/utils/outboundLineColumns'
import {
  enrichOutboundLine,
  formatOutboundIssuedBatchText,
  normalizePieceSerialNos,
  resolveOutboundStockUnit,
} from '@/utils/outboundLineHelpers'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import OutboundOrderBasicInfoSection from './components/OutboundOrderBasicInfoSection.vue'
import OutboundRefuseModal from './components/OutboundRefuseModal.vue'
import OutboundOrderPrintModal from './components/OutboundOrderPrintModal.vue'
import OutboundWorkOrderList from './components/OutboundWorkOrderList.vue'
import OutboundOutsourcingOrderList from './components/OutboundOutsourcingOrderList.vue'
import {
  mobileMaterialReqState,
  syncMaterialReqOnOutboundRefuse,
} from '@/store/mobileMaterialReqStore'
import { resolveOutboundWorkOrders } from '@/utils/outboundWorkOrders'
import { resolveOutboundOutsourcingOrders } from '@/utils/outboundOutsourcingOrders'
import { outsourcingOrderState } from '@/store/outsourcingOrderStore'
import { flattenCutSettleLines } from '@/utils/cutSettleLines'
import { inboundOrderState } from '@/store/inboundOrderStore'
import { inboundStatusColor } from '@/mock/inboundOptions'
import { purchaseReturnState } from '@/store/purchaseReturnStore'
import { deliveryOrderState } from '@/store/deliveryOrderStore'
import { transferOrderState } from '@/store/transferOrderStore'
import { stocktakeOrderState } from '@/store/stocktakeOrderStore'
import { transferStatusColor } from '@/mock/transferOptions'
import { stocktakeStatusColor } from '@/mock/stocktakeOptions'
import { deliveryStatusColor, formatOutboundQtyInt } from '@/utils/deliveryOrder'
import {
  listRelatedInboundsForOutbound,
  listRelatedPurchaseReturnsForOutbound,
  listRelatedDeliveriesForOutbound,
  listRelatedTransfersForOutbound,
  listRelatedStocktakesForOutbound,
} from '@/utils/outboundRelatedDocs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const loading = ref(false)
const record = ref(null)
const infoTab = ref('basic')
const refuseModalOpen = ref(false)
const printModalOpen = ref(false)

const isMaterialReqOutbound = computed(() => record.value?.outboundType === '领料出库')
const isPurchaseReturnOutbound = computed(() => record.value?.outboundType === '采购退货')
const isSalesOutbound = computed(() => record.value?.outboundType === '销售出库')
const isTransferOutbound = computed(() => record.value?.outboundType === '调拨出库')
const isStocktakeOutbound = computed(() => record.value?.outboundType === '盘点出库')

const relatedFactoryQcList = computed(() => {
  void factoryQcState.records
  if (!isSalesOutbound.value || !record.value) return []
  return listFactoryQcByOutbound(record.value)
})

const relatedDeliveries = computed(() => {
  void deliveryOrderState.orders
  return listRelatedDeliveriesForOutbound(record.value)
})

const relatedTransfers = computed(() => {
  void transferOrderState.orders
  return listRelatedTransfersForOutbound(record.value)
})

const relatedStocktakes = computed(() => {
  void stocktakeOrderState.orders
  return listRelatedStocktakesForOutbound(record.value)
})

const relatedQcColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '质检单号', key: 'qcNo', width: 150 },
  { title: '质检状态', key: 'qcStatus', width: 96 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140 },
  { title: '质检数量', key: 'qcQty', width: 90, align: 'right' },
  { title: '质检人', dataIndex: 'inspector', width: 90 },
  { title: '质检时间', key: 'inspectedAt', width: 150 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const relatedDeliveryColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '发货状态', key: 'deliveryStatus', width: 96 },
  { title: '发货单号', key: 'deliveryCode', width: 150 },
  { title: '客户名称', dataIndex: 'customerName', width: 140, ellipsis: true },
  { title: '销售单号', dataIndex: 'salesOrderNo', width: 140 },
  { title: '申请发货数量', key: 'applyShipQty', width: 110, align: 'right' },
  { title: '实际出库数量', key: 'actualOutboundQty', width: 110, align: 'right' },
  { title: '交货方式', dataIndex: 'shipmentMethod', width: 100 },
  { title: '创建人', dataIndex: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', width: 150 },
]

const operationLogs = computed(() => record.value?.operationLogs || [])

const logColumns = [
  { title: '操作时间', dataIndex: 'operatedAt', width: 180 },
  { title: '操作人', dataIndex: 'operator', width: 120 },
  { title: '操作', dataIndex: 'action', width: 140 },
  { title: '说明', dataIndex: 'remark', ellipsis: true },
]

const workOrderList = computed(() => {
  void mobileMaterialReqState.items
  return resolveOutboundWorkOrders(record.value, mobileMaterialReqState.items)
})

const outsourcingOrderList = computed(() => {
  void outsourcingOrderState.orders
  return resolveOutboundOutsourcingOrders(record.value)
})

const relatedInbounds = computed(() => {
  void inboundOrderState.orders
  return listRelatedInboundsForOutbound(record.value)
})

const relatedPurchaseReturns = computed(() => {
  void purchaseReturnState.returns
  return listRelatedPurchaseReturnsForOutbound(record.value)
})

const relatedInboundColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '入库单号', key: 'docNo', width: 160 },
  { title: '入库类型', dataIndex: 'inboundType', width: 110 },
  { title: '入库仓库', dataIndex: 'warehouse', width: 110 },
  { title: '入库时间', key: 'inboundAt', width: 160 },
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

const relatedPurchaseReturnColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '出库状态', key: 'outboundStatus', width: 100 },
  { title: '退货单号', key: 'returnNo', width: 150 },
  { title: '采购单号', dataIndex: 'purchaseOrderNo', key: 'purchaseOrderNo', width: 140 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '退货数量', key: 'returnQty', width: 110, align: 'right' },
  { title: '创建人', dataIndex: 'creator', key: 'creator', width: 90 },
  { title: '创建时间', key: 'createdAt', dataIndex: 'createdAt', width: 150 },
  { title: '更新人', dataIndex: 'updater', key: 'updater', width: 90 },
  { title: '更新时间', key: 'updatedAt', dataIndex: 'updatedAt', width: 150 },
]

const relatedCutSettles = computed(() => {
  void cutSettleState.records
  const id = record.value?.id
  const docNo = record.value?.docNo
  if (!id && !docNo) return []
  return cutSettleState.records.filter(
    (r) => (id && r.outboundId === id) || (docNo && r.outboundDocNo === docNo),
  )
})

const relatedCutSettleLines = computed(() => flattenCutSettleLines(relatedCutSettles.value))

const cutSettleColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'status', width: 90 },
  { title: '结算单号', key: 'docNo', width: 140 },
  { title: '物料名称', dataIndex: 'itemName', width: 150, ellipsis: true },
  { title: '编码', dataIndex: 'itemCode', width: 130 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '图号', dataIndex: 'drawingNo', width: 110, ellipsis: true },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 150, ellipsis: true },
  { title: '需求数', key: 'demandMeters', width: 100, align: 'right' },
  { title: '实耗', key: 'actualConsumeMeters', width: 100, align: 'right' },
  { title: '余料', key: 'remnantLength', width: 100, align: 'right' },
  { title: '工单编号', dataIndex: 'workOrderNo', width: 140 },
  { title: '余料入库单号', key: 'remnantInboundDocNo', width: 150 },
  { title: '确认人', dataIndex: 'confirmer', width: 90 },
  { title: '确认时间', dataIndex: 'confirmedAt', width: 160 },
  { title: '拣选批次', dataIndex: 'pickedBatchNo', width: 140 },
  { title: '余料新批次', dataIndex: 'remnantBatchNo', width: 140 },
]

const cutSettleScrollX = cutSettleColumns.reduce((s, c) => s + (c.width || 100), 0)

const lineColumns = computed(() =>
  filterOutboundLineColumns(outboundDetailLineColumns, record.value?.outboundType),
)
const lineScrollX = computed(() => lineColumns.value.reduce((s, c) => s + (c.width || 80), 0))

const linkedQc = computed(() => {
  if (!record.value?.factoryQcId) return null
  return getFactoryQcById(record.value.factoryQcId)
})

const lineSummary = computed(() => {
  const lines = record.value?.lineItems || []
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

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function canConfirm(order) {
  if (!order) return false
  return validateOutboundForConfirm(order).ok
}

function initiateQcActionLabel(row) {
  const qc = getFactoryQcById(row?.factoryQcId)
  if (qc?.qcStatus === '已完成' && qcResultBlocksOutbound(qc.qcResult)) {
    return '重新发起出厂质检'
  }
  return '发起出厂质检'
}

function reload() {
  const row = getOutboundOrderById(route.params.id)
  record.value = row
    ? {
        ...row,
        lineItems: (row.lineItems || []).map((l) => enrichOutboundLine({ ...l })),
      }
    : null
  if (record.value?.docNo) {
    const tab = tabStore.tabs.find((t) => t.path === route.path)
    if (tab) tab.title = record.value.docNo
  }
}

watch(
  () => route.params.id,
  () => {
    loading.value = true
    infoTab.value = 'basic'
    reload()
    loading.value = false
  },
  { immediate: true },
)

function goBack() {
  router.push('/inventory/outbound')
}

function goCutSettle(row) {
  const id = row?.settleId || row?.id
  if (!id) return
  const path = `/inventory/cut-settle/${id}`
  openTab(path, row.docNo || '下料结算详情')
  router.push(path)
}

function cutSettleLineUnit(row) {
  return String(row?.unit || '').trim() || '米'
}

function goRemnantInbound(row) {
  const id = row?.remnantInboundId
  if (id) {
    const path = `/inventory/inbound/${id}`
    openTab(path, row.remnantInboundDocNo || '入库单详情')
    router.push(path)
    return
  }
  const docNo = row?.remnantInboundDocNo
  if (!docNo) return
  const found = inboundOrderState.orders.find((o) => o.docNo === docNo)
  if (found) {
    const path = `/inventory/inbound/${found.id}`
    openTab(path, docNo)
    router.push(path)
    return
  }
  message.info(`未找到余料入库单 ${docNo}`)
}

function openEdit() {
  if (!record.value?.id) return
  openCreateTab(router, openTab, {
    path: `/inventory/outbound/${record.value.id}/edit`,
    title: `编辑出库单 ${record.value.docNo || ''}`.trim(),
  })
}

function openPrint() {
  if (!record.value) return
  printModalOpen.value = true
}

function goSource() {
  if (record.value?.outboundType === '销售出库' && record.value?.linkedDeliveryId) {
    const path = `/sales/delivery/${record.value.linkedDeliveryId}`
    openTab(path, `发货单 ${record.value.linkedDeliveryCode || ''}`)
    router.push(path)
    return
  }
  message.info('暂无源单跳转')
}

function goSalesOrder() {
  const no = record.value?.salesOrderNo
  if (!no) return
  const order = findSalesOrderByOrderNo(no)
  if (!order) {
    message.info('未找到关联销售订单')
    return
  }
  const path = `/sales/orders/${order.id}`
  openTab(path, `销售订单 ${no}`)
  router.push(path)
}

function goFactoryQc() {
  if (!linkedQc.value) return
  openFactoryQcDetail(linkedQc.value)
}

function openFactoryQcDetail(row) {
  if (!row?.id) return
  const path = `/quality/factory-qc/${row.id}`
  openTab(path, row.qcNo || '出厂质检详情')
  router.push(path)
}

function factoryQcStatusColor(status) {
  const map = { 待质检: 'processing', 已完成: 'success', 已终止: 'default' }
  return map[status] || 'default'
}

function factoryQcResultColor(result) {
  const map = { 质检通过: 'success', 质检不通过: 'error', 部分通过: 'warning' }
  return map[result] || 'default'
}

function formatFactoryQcQty(row) {
  const lines = row?.lineItems || []
  if (!lines.length) return '—'
  const total = lines.reduce(
    (sum, line) => sum + (Number(line.inspectQty) || Number(line.shipQty) || 0),
    0,
  )
  if (!(total > 0)) return '—'
  const units = [...new Set(lines.map((l) => l.unit).filter(Boolean))]
  const unit = units.length === 1 ? units[0] : ''
  return unit ? `${total} ${unit}` : String(total)
}

function goInbound(row) {
  if (!row?.id) return
  const path = `/inventory/inbound/${row.id}`
  openTab(path, row.docNo || '入库单详情')
  router.push(path)
}

function goDelivery(row) {
  if (!row?.id) return
  const path = `/sales/delivery/${row.id}`
  openTab(path, `发货单 ${row.deliveryCode || ''}`.trim())
  router.push(path)
}

function goTransfer(row) {
  if (!row?.id) return
  const path = `/inventory/transfer/${row.id}`
  openTab(path, `调拨单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-transfer-detail', params: { id: row.id } })
}

function goStocktake(row) {
  if (!row?.id) return
  const path = `/inventory/stocktake/${row.id}`
  openTab(path, `盘点单 ${row.docNo || ''}`.trim())
  router.push({ name: 'inventory-stocktake-detail', params: { id: row.id } })
}

function goPurchaseReturn(row) {
  if (!row?.id) return
  const path = `/procurement/purchase-returns/${row.id}`
  openTab(path, `采购退货 ${row.returnNo || ''}`.trim())
  router.push(path)
}

function purchaseReturnStatusColor(status) {
  if (status === '已完成') return 'success'
  if (status === '进行中') return 'processing'
  if (status === '作废') return 'default'
  return 'warning'
}

function purchaseReturnOutboundStatusColor(status) {
  const map = {
    待出库: 'default',
    出库中: 'processing',
    部分出库: 'warning',
    已出库: 'success',
  }
  return map[status] || 'default'
}

function handleApprove() {
  Modal.confirm({
    title: `审批通过出库单 ${record.value.docNo}？`,
    okText: '审批',
    onOk: () => {
      const res = approveOutboundOrder(record.value.id)
      if (!res.ok) {
        message.warning(res.message)
        return
      }
      message.success('审批已通过')
      reload()
    },
  })
}

function handleConfirmOutbound() {
  Modal.confirm({
    title: `确认出库 ${record.value.docNo}？`,
    onOk: () => {
      const { count, blocked, warnings } = confirmOutbound([record.value.id])
      if (blocked.length) {
        message.warning(blocked.map((b) => b.message).join('；'))
        return
      }
      if (warnings?.length) {
        message.warning(warnings.join('；'))
      }
      if (count > 0) {
        message.success('已确认出库')
        reload()
      }
    },
  })
}

function applyRefuseOutbound(orderId, reason) {
  const result = refuseOutbound([orderId], { reason })
  ;(result.refused || []).forEach((order) => syncMaterialReqOnOutboundRefuse(order))
  return result
}

function handleRefuseOutbound() {
  if (!record.value) return
  refuseModalOpen.value = true
}

function submitRefuse(reason) {
  if (!record.value) return
  const { count, blocked } = applyRefuseOutbound(record.value.id, reason)
  if (blocked.length) {
    message.warning(blocked.map((b) => b.message).join('；'))
    return
  }
  if (count > 0) {
    message.success('已拒绝出库')
    refuseModalOpen.value = false
    reload()
  }
}

function handleDelete() {
  if (!canDeleteOutbound(record.value)) {
    message.warning(
      isOutboundBusinessSource(record.value) ? '业务来源出库单不支持删除' : '当前状态不可删除',
    )
    return
  }
  Modal.confirm({
    title: `确认删除出库单 ${record.value.docNo}？`,
    onOk: () => {
      if (deleteOutboundOrder(record.value.id)) {
        message.success('已删除')
        goBack()
      }
    },
  })
}

function handleInitiateQc() {
  const res = initiateFactoryQcFromOutbound(record.value.id)
  if (res.ok) {
    message.success('已发起出厂质检')
    reload()
    if (res.record?.id) {
      const path = `/quality/factory-qc/${res.record.id}`
      openTab(path, res.record.qcNo || '出厂质检详情')
      router.push(path)
    }
  } else {
    message.warning(res.message || '发起失败')
  }
}
</script>

<style lang="less" scoped>
.outbound-detail-page {
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
  color: rgba(0, 0, 0, 0.85);
}

.link-code {
  color: #1677ff;
  cursor: pointer;
}

.delivery-remark-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
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

.blank-size-hint {
  margin-top: 2px;
  font-size: 11px;
  color: #d46b08;
  line-height: 1.25;
  word-break: break-all;
}

.manual-pick-tag {
  margin-bottom: 2px;
  font-size: 11px;
  color: #1677ff;
}

.piece-serials {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.4;
  word-break: break-all;
}

:deep(.line-summary-row .ant-table-cell) {
  background: #fafafa;
  font-weight: 600;
}
</style>
