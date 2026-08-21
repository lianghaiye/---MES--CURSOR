<template>
  <div class="production-plan">
    <div class="filter-card">
      <a-form :model="filters" class="filter-form horizontal-form" layout="inline">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="订单编号">
              <a-input
                v-model:value="filters.orderNo"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="5">
            <a-form-item label="客户名称">
              <a-input
                v-model:value="filters.customerName"
                allow-clear
                placeholder="请输入"
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="紧急度">
              <a-select
                v-model:value="filters.urgency"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
              >
                <a-select-option value="紧急">紧急</a-select-option>
                <a-select-option value="加急">加急</a-select-option>
                <a-select-option value="普通">普通</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="计划来源">
              <a-select
                v-model:value="filters.planSource"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
                :options="planSourceFilterOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="4">
            <a-form-item label="订单状态">
              <a-select
                v-model:value="filters.orderStatus"
                allow-clear
                placeholder="全部"
                size="small"
                style="width: 100%"
              >
                <a-select-option value="部分下达">部分下达</a-select-option>
                <a-select-option value="待下达">待下达</a-select-option>
                <a-select-option value="执行中">执行中</a-select-option>
                <a-select-option value="已完成">已完成</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="6" :lg="6">
            <a-form-item class="filter-actions-item">
              <a-space>
                <a-button type="primary" size="small" @click="handleSearch">查询</a-button>
                <a-button size="small" @click="handleReset">重置</a-button>
                <a-button size="small" @click="goReplenishCenter">库存预警</a-button>
              </a-space>
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="8">
            <a-form-item label="订单日期">
              <a-range-picker
                v-model:value="filters.orderDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :xs="24" :sm="12" :md="8" :lg="8">
            <a-form-item label="交付日期">
              <a-range-picker
                v-model:value="filters.deliveryDateRange"
                size="small"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="master-detail">
      <div class="order-list-panel">
        <div
          v-for="order in pagedOrders"
          :key="order.id"
          class="order-card"
          :class="{ active: selectedId === order.id }"
          @click="selectOrder(order.id)"
        >
          <div class="card-tags">
            <a-tag v-for="tag in order.tags" :key="tag" :color="tagColor(tag)">{{ tag }}</a-tag>
          </div>
          <div class="card-row"><span class="label">计划编号</span>{{ order.orderNo }}</div>
          <div class="card-row">
            <span class="label">计划来源</span>{{ planSourceLabel(order.planSource) }}
          </div>
          <div class="card-row"><span class="label">客户名称</span>{{ order.customerName }}</div>
          <div class="card-row"><span class="label">产品数量</span>{{ order.productQty }}</div>
          <div class="card-row">
            <span class="label">业务员</span>{{ order.salesperson || '—' }}
          </div>
        </div>
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="filteredOrders.length"
          size="small"
          show-size-changer
          class="list-pagination"
        />
      </div>

      <div v-if="selectedOrder" class="detail-panel" :class="{ 'is-fullscreen': detailFullscreen }">
        <template v-if="!detailFullscreen">
          <div class="detail-header">
            <div>
              <h3>{{ selectedOrder.orderNo }} · {{ selectedOrder.customerName }}</h3>
              <a-space>
                <a-tag color="blue">距离交付还剩 {{ selectedOrder.daysToDelivery }} 天</a-tag>
                <a-tag v-for="tag in selectedOrder.tags" :key="tag" :color="tagColor(tag)">
                  {{ tag }}
                </a-tag>
              </a-space>
            </div>
            <a-space :size="0" class="detail-header-actions">
              <a-button type="link" @click="detailCollapsed = !detailCollapsed">
                {{ detailCollapsed ? '展开详情' : '收起详情' }}
              </a-button>
              <a-button type="link" @click="openEbomPrint">
                <PrinterOutlined />
                打印
              </a-button>
              <a-button type="link" @click="toggleDetailFullscreen">全屏</a-button>
            </a-space>
          </div>

          <a-descriptions
            v-show="!detailCollapsed"
            :column="4"
            size="small"
            bordered
            class="info-grid"
          >
            <a-descriptions-item label="计划来源">{{
              planSourceLabel(selectedOrder.planSource)
            }}</a-descriptions-item>
            <a-descriptions-item label="所属区域">{{
              selectedOrder.region || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="结算类型">{{
              selectedOrder.settlementType || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="交货方式">{{
              selectedOrder.deliveryMethod || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="业务员">{{
              selectedOrder.salesperson || '—'
            }}</a-descriptions-item>
            <a-descriptions-item label="订单日期">{{
              selectedOrder.orderDate
            }}</a-descriptions-item>
            <a-descriptions-item label="备注" :span="2">{{
              selectedOrder.remark || '-'
            }}</a-descriptions-item>
          </a-descriptions>
        </template>

        <div v-else class="fullscreen-toolbar">
          <a-space>
            <TableColumnSettingButton @click="workColumnDrawerOpen = true" />
            <a-button type="link" @click="openEbomPrint">
              <PrinterOutlined />
              打印
            </a-button>
            <a-button type="link" @click="toggleDetailFullscreen">退出全屏</a-button>
          </a-space>
        </div>

        <a-tabs v-model:activeKey="detailTab" class="detail-tabs detail-tabs-pill">
          <a-tab-pane key="work" tab="工作项">
            <div class="detail-tab-body">
              <a-table
                :columns="displayWorkColumns"
                :data-source="selectedOrder.workItems"
                :pagination="false"
                row-key="id"
                size="small"
                bordered
                :scroll="{ x: workTableScrollX }"
                :row-class-name="workItemRowClassName"
                :custom-row="workItemCustomRow"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag
                      :color="
                        record.status === '进行中'
                          ? 'processing'
                          : record.status === '设计中'
                            ? 'orange'
                            : record.status === '待BOM'
                              ? 'gold'
                              : 'default'
                      "
                    >
                      {{ record.status }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'deliveryMode'">
                    <a-tag :color="record.deliveryMode === '散件' ? 'orange' : 'blue'">
                      {{ record.deliveryMode || '整机' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'stockQty'">
                    <span>{{
                      record.stockQty != null && record.stockQty !== ''
                        ? formatQty(record.stockQty)
                        : '—'
                    }}</span>
                  </template>
                  <template v-else-if="column.key === 'planQty'">
                    <a-input-number
                      v-model:value="record.planQty"
                      size="small"
                      :min="0"
                      :precision="4"
                      :formatter="inputNumberFormatter"
                      :parser="inputNumberParser"
                      style="width: 100%"
                      :disabled="isPlanQtyLocked"
                      @change="onWorkItemPlanQtyChange(record)"
                    />
                  </template>
                  <template v-else-if="column.key === 'action'">
                    <a-space @click.stop>
                      <a-button type="link" size="small" @click="toggleWorkItemExpand(record)">
                        {{ expandedWorkItemId === record.id ? '收起' : '展开' }}
                      </a-button>
                      <a-button type="link" size="small" danger>终止</a-button>
                    </a-space>
                  </template>
                  <template
                    v-else-if="
                      column.key === 'specModel' ||
                      column.key === 'drawingNo' ||
                      column.key === 'material' ||
                      column.key === 'techParams' ||
                      column.key === 'matchingRequirements' ||
                      column.key === 'packagingForm' ||
                      column.key === 'supplementDesc' ||
                      column.key === 'attachment'
                    "
                  >
                    <span class="ellipsis-cell" :title="record[column.dataIndex] || ''">{{
                      record[column.dataIndex] || '—'
                    }}</span>
                  </template>
                </template>
              </a-table>

              <div class="action-row">
                <a-space wrap>
                  <span>计划总装日期</span>
                  <a-date-picker
                    :value="planAssemblyDateValue"
                    size="small"
                    allow-clear
                    @change="onPlanAssemblyDateChange"
                  />
                  <span>计划完成日期</span>
                  <a-date-picker
                    :value="planCompleteDateValue"
                    size="small"
                    allow-clear
                    @change="onPlanCompleteDateChange"
                  />
                  <span>调整紧急度</span>
                  <a-select style="width: 100px" placeholder="选择" />
                  <a-button type="primary" @click="openAssemblyWorkOrderModal"
                    >生成总装/部装工单</a-button
                  >
                  <a-button type="primary" @click="generatePurchaseReq">生成采购申请</a-button>
                  <a-button type="primary" @click="openWorkOrderModal">生成加工工单</a-button>
                  <a-button type="primary" @click="openOutsourceWorkOrderModal"
                    >生成外协工单</a-button
                  >
                </a-space>
              </div>

              <div v-if="activeWorkItem && materialTree.length" class="ebom-panel-title">
                <span>BOM名称：{{ activeWorkItemBomTitle }}</span>
                <TableColumnSettingButton
                  v-if="detailFullscreen"
                  @click="materialColumnDrawerOpen = true"
                />
              </div>
              <a-empty
                v-if="!activeWorkItem"
                description="请点击产品明细行查看 EBOM 物料树"
                class="ebom-empty"
              />
              <div v-else-if="activeWorkItem" class="material-tree-wrap">
                <a-table
                  :columns="displayMaterialColumns"
                  :data-source="materialTree"
                  :pagination="false"
                  row-key="id"
                  size="small"
                  bordered
                  :scroll="{ x: materialTableScrollX }"
                  v-model:expanded-row-keys="materialExpandedRowKeys"
                  :default-expand-all-rows="true"
                >
                  <template #headerCell="{ column }">
                    <template v-if="column.key === 'availableStock'">
                      <span class="col-title-with-tip">
                        可用库存
                        <a-tooltip
                          title="展示为 工单占用/可用库存；工单占用=开立工单 BOM 需求−已领，可用库存=现存量−工单占用"
                        >
                          <InfoCircleOutlined class="col-tip-icon" />
                        </a-tooltip>
                      </span>
                    </template>
                    <template v-else-if="column.key === 'inTransitQty'">
                      <span class="col-title-with-tip">
                        在途/在制
                        <a-tooltip
                          title="外购：申请量/订单量（采购单位）；自制/外协/组装：待下发/执行中（库存单位）。缺口仍按需求−可用库存，不扣本列。"
                        >
                          <InfoCircleOutlined class="col-tip-icon" />
                        </a-tooltip>
                      </span>
                    </template>
                    <template v-else>{{ column.title }}</template>
                  </template>
                  <template #bodyCell="{ column, record }">
                    <template v-if="column.key === 'status'">
                      <a-tag :color="materialStatusColor(record.status)">{{ record.status }}</a-tag>
                    </template>
                    <template v-else-if="column.key === 'supplyType'">
                      <a-select
                        v-if="record.isTopLevel"
                        v-model:value="record.supplyType"
                        size="small"
                        :options="topLevelSupplyTypeOptions"
                        style="width: 100%"
                        @change="onTopLevelSupplyTypeChange(record)"
                      />
                      <a-select
                        v-else
                        v-model:value="record.supplyType"
                        size="small"
                        :options="supplyTypeOptions"
                        style="width: 100%"
                        @change="onMaterialSupplyTypeChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'planQty'">
                      <a-input-number
                        v-if="record.isTopLevel"
                        :value="activeWorkItem.planQty"
                        :min="0"
                        :precision="4"
                        :formatter="inputNumberFormatter"
                        :parser="inputNumberParser"
                        size="small"
                        style="width: 100%"
                        :disabled="isPlanQtyLocked"
                        @change="(val) => onTopLevelPlanQtyChange(val)"
                      />
                      <a-input-number
                        v-else
                        v-model:value="record.planQty"
                        :min="0"
                        :precision="4"
                        :formatter="inputNumberFormatter"
                        :parser="inputNumberParser"
                        size="small"
                        style="width: 100%"
                        :disabled="isPlanQtyLocked"
                        @change="onMaterialPlanQtyChange(record)"
                      />
                    </template>
                    <template v-else-if="column.key === 'joinPlan'">
                      <a-switch
                        :checked="record.joinPlan === '是'"
                        size="small"
                        @change="(checked) => (record.joinPlan = checked ? '是' : '否')"
                      />
                    </template>
                    <template v-else-if="column.key === 'designateSupplier'">
                      <a-switch
                        v-if="isPurchasedOrOutsourced(record.supplyType)"
                        :checked="!!record.designateSupplier"
                        size="small"
                        @change="(checked) => onMaterialDesignateSupplierChange(record, checked)"
                      />
                      <span v-else class="muted">—</span>
                    </template>
                    <template v-else-if="column.key === 'supplier'">
                      <PlanSupplierSelect
                        v-model:value="record.supplier"
                        size="small"
                        :disabled="!isPurchasedOrOutsourced(record.supplyType)"
                        :status="
                          record.designateSupplier &&
                          isPurchasedOrOutsourced(record.supplyType) &&
                          !record.supplier
                            ? 'error'
                            : undefined
                        "
                      />
                    </template>
                    <template v-else-if="column.key === 'processRoute'">
                      <a-select
                        v-model:value="record.processRoute"
                        show-search
                        allow-clear
                        size="small"
                        placeholder="请选择"
                        :options="processRouteOpts"
                        style="width: 100%"
                        :filter-option="filterSelectOption"
                      />
                    </template>
                    <template v-else-if="column.key === 'processFile'">
                      <a-select
                        v-model:value="record.processFile"
                        show-search
                        allow-clear
                        size="small"
                        placeholder="暂未配置"
                        :options="processFileOptions"
                        style="width: 100%"
                        :filter-option="filterSelectOption"
                      />
                    </template>
                    <template v-else-if="column.key === 'standardCycle'">
                      <a-input
                        v-model:value="record.standardCycle"
                        size="small"
                        placeholder="天"
                        allow-clear
                        @change="onMaterialStandardCycleChange(record, selectedOrder)"
                      />
                    </template>
                    <template v-else-if="column.key === 'latestProcessTime'">
                      <a-date-picker
                        :value="materialDateValue(record.latestProcessTime)"
                        size="small"
                        allow-clear
                        style="width: 100%"
                        @change="(d) => onMaterialLatestDateChange(record, d)"
                      />
                    </template>
                    <template v-else-if="column.key === 'remark'">
                      <a-input
                        v-model:value="record.remark"
                        size="small"
                        placeholder="补充说明"
                        allow-clear
                      />
                    </template>
                    <template v-else-if="column.key === 'availableStock'">
                      <span>{{ formatAvailableStockText(record) }}</span>
                    </template>
                    <template v-else-if="column.key === 'inTransitQty'">
                      <a-tooltip
                        :title="
                          record.inTransitTip ||
                          '外购为申请/订单；自制/外协/组装为待下发/执行中。不参与缺口计算。'
                        "
                      >
                        <span>{{ record.inTransitText || '—' }}</span>
                      </a-tooltip>
                    </template>
                  </template>
                </a-table>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="stats" tab="合并统计">
            <div class="detail-tab-body">
              <a-empty description="该 Tab 为占位，后续扩展" />
            </div>
          </a-tab-pane>

          <a-tab-pane key="orders" tab="所有工单">
            <div class="detail-tab-body">
              <ProductionPlanOrderTree
                v-if="selectedOrder.workItems?.length"
                :tree-data="planOrderTreeData"
              />
              <a-empty v-else description="暂无工作项" />
            </div>
          </a-tab-pane>

          <a-tab-pane key="ebom-info">
            <template #tab>
              <span>EBOM信息</span>
              <a-badge
                v-if="ebomChangedCount"
                :count="ebomChangedCount"
                :number-style="{ backgroundColor: '#fa8c16', marginLeft: '6px' }"
              />
            </template>
            <div class="detail-tab-body">
              <div class="section-card">
                <div class="section-title">EBOM 信息</div>
                <div class="section-hint">
                  展示各工作项现行
                  EBOM（始终为最新版本）；「初始版本」为订单审核通过时生成的快照版本。
                </div>
                <a-table
                  :columns="ebomColumns"
                  :data-source="productionPlanEbomRows"
                  row-key="id"
                  size="small"
                  bordered
                  :pagination="false"
                  :scroll="{ x: ebomTableScrollX }"
                  :locale="{ emptyText: '暂无工作项' }"
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

              <div v-if="bomChangedWorkItems.length" class="section-card">
                <div class="section-title">EBOM 版本变更</div>
                <div v-for="wi in bomChangedWorkItems" :key="wi.id" class="bom-product-block">
                  <div class="bom-line-head">
                    <span class="bom-product-name">{{ wi.productName }}</span>
                    <span class="bom-product-code">{{ wi.productCode }}</span>
                    <a-tag color="orange">初始版本 {{ wi.bomVersion || '—' }}</a-tag>
                    <a-tag v-if="workItemActiveVersion(wi)" color="blue">
                      现行版本 {{ workItemActiveVersion(wi) }}
                    </a-tag>
                  </div>
                  <BomVersionInfoSection
                    :product-id="wi.productId"
                    :bom-id="wi.bomId"
                    :bound-version="wi.bomVersion"
                    :compare-quantity="Number(wi.salesQty ?? wi.orderQty) || 1"
                  />
                  <SalesOrderEbomDiffSection :line="workItemToEbomLine(wi)" />
                </div>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="log" tab="操作日志">
            <div class="detail-tab-body">
              <a-empty description="该 Tab 为占位，后续扩展" />
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
      <a-empty v-else class="detail-empty" description="请选择左侧订单" />
    </div>

    <GenerateAssemblyWorkOrderModal
      v-model:open="assemblyWorkOrderModalOpen"
      :order="selectedOrder"
      :materials="assemblyMaterialsForPlan"
      @save="handleAssemblyWorkOrderSave"
    />

    <GenerateWorkOrderModal
      v-model:open="workOrderModalOpen"
      :order="selectedOrder"
      :materials="selfMadeMaterials"
      @save="handleWorkOrderSave"
    />

    <GenerateOutsourceWorkOrderModal
      v-model:open="outsourceWorkOrderModalOpen"
      :order="selectedOrder"
      :materials="outsourcedMaterials"
      @save="handleOutsourceWorkOrderSave"
    />

    <GeneratePurchaseRequisitionModal
      v-model:open="purchaseReqModalOpen"
      :order="selectedOrder"
      :materials="purchasedMaterialsForReq"
      @saved="handlePurchaseReqSave"
    />

    <TableColumnSettingDrawer
      v-model:open="workColumnDrawerOpen"
      v-model:settings="workColumnSettings"
      :default-settings="defaultWorkColumnSettings"
    />

    <TableColumnSettingDrawer
      v-model:open="materialColumnDrawerOpen"
      v-model:settings="materialColumnSettings"
      :default-settings="defaultMaterialColumnSettings"
    />

    <BomPrintModal
      v-model:open="ebomPrintModalOpen"
      :flat-nodes="printEbomFlatNodes"
      :line-items="printEbomLineItems"
      :root-item-name="printEbomRootName"
      :overview-info="printEbomOverviewInfo"
      :quantity="printEbomQuantity"
      :fixed-column-settings="productionPlanPrintColumnSettings"
      :print-base-columns="productionPlanPrintBaseColumns"
      :material-qty-by-code="printEbomMaterialQtyMap"
    />
  </div>
</template>

<script>
export default {
  name: 'ProductionPlanView',
}
</script>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { formatQty, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { productionPlanState, filterProductionPlans } from '@/store/productionPlanStore'
import { getOwnActiveBomForItem } from '@/store/productBomStore'
import { useTabs } from '@/composables/useTabs'
import GenerateWorkOrderModal from './components/GenerateWorkOrderModal.vue'
import GenerateAssemblyWorkOrderModal from './components/GenerateAssemblyWorkOrderModal.vue'
import GenerateOutsourceWorkOrderModal from './components/GenerateOutsourceWorkOrderModal.vue'
import GeneratePurchaseRequisitionModal from './components/GeneratePurchaseRequisitionModal.vue'
import { PLAN_SOURCE_OPTIONS, planSourceLabel } from '@/utils/planSource'
import {
  workOrderState,
  addWorkOrdersFromPlanRows,
  addOutsourceWorkOrdersFromPlanRows,
} from '@/store/workOrderStore'
import {
  assemblyWorkOrderState,
  addAssemblyWorkOrdersFromPlanRows,
} from '@/store/assemblyWorkOrderStore'
import {
  getOutsourcedMaterialsFromWorkItem,
  getPurchasedMaterialsFromWorkItem,
  updateMaterialInOrder,
  patchMaterialFromWorkOrderRow,
  patchMaterialFromOutsourceWorkOrderRow,
  patchMaterialFromAssemblyWorkOrderRow,
  calcDemandQty,
  calcGapQty,
  flattenMaterials,
} from '@/utils/material'
import { buildProductionPlanEbomRows } from '@/utils/salesOrderBomRows'
import { addPurchaseRequisition, purchaseRequisitionState } from '@/store/purchaseRequisitionStore'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { outboundState } from '@/store/outboundStore'
import { materialRequisitionState } from '@/store/materialRequisitionStore'
import { stockState } from '@/store/stockStore'
import {
  enrichPlanMaterialTree,
  getProcessRouteSelectOptions,
  getSelfMadeMaterialsForPlan,
  getAssemblyMaterialsForPlan,
  buildDisplayMaterialTree,
  cascadeMaterialPlanQtyFromParent,
  collectAllMaterialRowKeys,
  isOrderPlanQtyLocked,
  lockOrderPlanQty,
  resolveWorkItemMaterials,
  syncWorkItemMaterialPlanQty,
  isPurchasedOrOutsourced,
  onMaterialDesignateSupplierChange,
  onMaterialStandardCycleChange,
  onMaterialSupplyTypeChange,
  processFileOptions,
  recalcMaterialLatestProcessTimes,
  supplyTypeOptions,
  topLevelSupplyTypeOptions,
} from '@/utils/productionPlanMaterial'
import BomVersionInfoSection from '@/components/BomVersionInfoSection.vue'
import SalesOrderEbomDiffSection from '@/views/sales/components/SalesOrderEbomDiffSection.vue'
import { useTableColumnSettings } from '@/composables/useTableColumnSettings'
import TableColumnSettingButton from '@/components/TableColumnSettingButton.vue'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'
import BomPrintModal from '@/views/product-process/components/BomPrintModal.vue'
import ProductionPlanOrderTree from '@/views/planning/components/ProductionPlanOrderTree.vue'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import {
  productionPlanPrintBaseColumns,
  productionPlanPrintColumnSettings,
} from '@/mock/productionPlanPrintColumns'
import { buildProductionPlanOrderTree } from '@/utils/productionPlanOrderTree'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()

const filters = reactive({
  orderNo: '',
  customerName: '',
  urgency: undefined,
  orderStatus: undefined,
  planSource: undefined,
  orderDateRange: null,
  deliveryDateRange: null,
})

const planSourceFilterOpts = PLAN_SOURCE_OPTIONS.filter((o) => o.value)

const appliedFilters = ref({ ...filters })
const selectedId = ref(productionPlanState.plans[0]?.id || null)
const expandedWorkItemId = ref(null)
const detailCollapsed = ref(false)
const detailFullscreen = ref(false)
const detailTab = ref('work')
const workOrderModalOpen = ref(false)
const assemblyWorkOrderModalOpen = ref(false)
const outsourceWorkOrderModalOpen = ref(false)
const purchaseReqModalOpen = ref(false)
const ebomPrintModalOpen = ref(false)

const pagination = reactive({
  current: 1,
  pageSize: 5,
})

const baseWorkColumns = [
  { title: '状态', key: 'status', dataIndex: 'status', width: 80, fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '产品编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '图号', key: 'drawingNo', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '材质', key: 'material', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '订单数量', dataIndex: 'orderQty', width: 88, align: 'right' },
  { title: '库存数量', key: 'stockQty', width: 100, align: 'right' },
  { title: '计划数量', key: 'planQty', width: 100, align: 'right' },
  { title: '交付方式', key: 'deliveryMode', dataIndex: 'deliveryMode', width: 88 },
  { title: '已发货数量', dataIndex: 'shippedQty', width: 96, align: 'right' },
  { title: '交付日期', dataIndex: 'deliveryDate', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 56 },
  { title: '技术参数', key: 'techParams', dataIndex: 'techParams', width: 100, ellipsis: true },
  {
    title: '配套要求',
    key: 'matchingRequirements',
    dataIndex: 'matchingRequirements',
    width: 120,
    ellipsis: true,
  },
  {
    title: '包装方式',
    key: 'packagingForm',
    dataIndex: 'packagingForm',
    width: 88,
    ellipsis: true,
  },
  {
    title: '补充说明',
    key: 'supplementDesc',
    dataIndex: 'supplementDesc',
    width: 120,
    ellipsis: true,
  },
  { title: '附件', key: 'attachment', dataIndex: 'attachment', width: 160, ellipsis: true },
  { title: '操作', key: 'action', width: 110, fixed: 'right' },
]

const {
  columnSettings: workColumnSettings,
  columnDrawerOpen: workColumnDrawerOpen,
  displayColumns: displayWorkColumns,
  tableScrollX: workTableScrollX,
  defaultColumnSettings: defaultWorkColumnSettings,
} = useTableColumnSettings('production-plan-work-list', baseWorkColumns, { minScrollX: 1960 })

const baseMaterialColumns = [
  { title: '状态', key: 'status', dataIndex: 'status', width: 90, fixed: 'left' },
  { title: '物料名称', dataIndex: 'name', width: 140, ellipsis: true, fixed: 'left' },
  { title: '物料编码', dataIndex: 'code', width: 120 },
  { title: '规格型号', dataIndex: 'spec', width: 120 },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '物料类型', dataIndex: 'type', width: 90 },
  { title: '单位用量', dataIndex: 'unitUsage', width: 90 },
  { title: '库存单位', dataIndex: 'unit', width: 90 },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 160, ellipsis: true },
  { title: '供应型态', key: 'supplyType', dataIndex: 'supplyType', width: 100 },
  { title: '库存数量', dataIndex: 'stockQty', width: 90 },
  {
    title: '可用库存',
    key: 'availableStock',
    dataIndex: 'availableStock',
    width: 120,
  },
  {
    title: '在途/在制',
    key: 'inTransitQty',
    dataIndex: 'inTransitText',
    width: 140,
  },
  { title: '需求数', dataIndex: 'demandQty', width: 80 },
  { title: '缺口数', dataIndex: 'gapQty', width: 80 },
  { title: '计划数', key: 'planQty', dataIndex: 'planQty', width: 96 },
  { title: '参与计划', key: 'joinPlan', width: 88 },
  { title: '指定供应商', key: 'designateSupplier', width: 96 },
  { title: '供方单位', key: 'supplier', width: 140 },
  { title: '工艺路线', key: 'processRoute', width: 140 },
  { title: '工艺文件', key: 'processFile', width: 130 },
  { title: '标准生产周期', key: 'standardCycle', width: 110 },
  { title: '最晚处理时间', key: 'latestProcessTime', width: 130 },
  { title: '补充说明', key: 'remark', width: 140 },
]

const {
  columnSettings: materialColumnSettings,
  columnDrawerOpen: materialColumnDrawerOpen,
  displayColumns: displayMaterialColumns,
  tableScrollX: materialTableScrollX,
  defaultColumnSettings: defaultMaterialColumnSettings,
} = useTableColumnSettings('production-plan-material-list', baseMaterialColumns, {
  minScrollX: 2600,
})

const processRouteOpts = computed(() => getProcessRouteSelectOptions())

const filteredOrders = computed(() => {
  const f = { ...appliedFilters.value }
  if (f.orderDateRange?.length === 2) {
    f.orderDateRange = [
      f.orderDateRange[0].format('YYYY-MM-DD'),
      f.orderDateRange[1].format('YYYY-MM-DD'),
    ]
  }
  if (f.deliveryDateRange?.length === 2) {
    f.deliveryDateRange = [
      f.deliveryDateRange[0].format('YYYY-MM-DD'),
      f.deliveryDateRange[1].format('YYYY-MM-DD'),
    ]
  }
  return filterProductionPlans(productionPlanState.plans, f)
})

const pagedOrders = computed(() => {
  const start = (pagination.current - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})

const selectedOrder = computed(() => filteredOrders.value.find((o) => o.id === selectedId.value))

const planOrderTreeData = computed(() => {
  if (!selectedOrder.value) return []
  return buildProductionPlanOrderTree(selectedOrder.value, {
    workOrders: workOrderState.orders,
    assemblyWorkOrders: assemblyWorkOrderState.orders,
    purchaseRequisitions: purchaseRequisitionState.requisitions,
  })
})

const isPlanQtyLocked = computed(() => isOrderPlanQtyLocked(selectedOrder.value))

const activeWorkItem = computed(() => {
  const order = selectedOrder.value
  if (!order?.workItems?.length || !expandedWorkItemId.value) return null
  return order.workItems.find((w) => w.id === expandedWorkItemId.value) || null
})

const materialExpandedRowKeys = ref([])

const materialTree = computed(() => {
  // 依赖采购/工单/领料变更，刷新在途与工单占用
  void purchaseRequisitionState.requisitions
  void purchaseOrderState.orders
  void workOrderState.orders
  void assemblyWorkOrderState.orders
  void outboundState.orders
  void materialRequisitionState.records
  void stockState.records
  if (!activeWorkItem.value) return []
  return buildDisplayMaterialTree(activeWorkItem.value, selectedOrder.value)
})

watch(
  materialTree,
  (tree) => {
    nextTick(() => {
      materialExpandedRowKeys.value = collectAllMaterialRowKeys(tree)
    })
  },
  { immediate: true, deep: true },
)

const productionPlanEbomRows = computed(() =>
  buildProductionPlanEbomRows(selectedOrder.value?.workItems || []),
)

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

function workItemBomVersionHint(wi) {
  if (!wi?.productId) return false
  const active = getOwnActiveBomForItem('product', wi.productId)
  return Boolean(active?.version && wi.bomVersion && active.version !== wi.bomVersion)
}

const bomChangedWorkItems = computed(() =>
  (selectedOrder.value?.workItems || []).filter((wi) => workItemBomVersionHint(wi)),
)

const ebomChangedCount = computed(() => bomChangedWorkItems.value.length)

function workItemActiveVersion(wi) {
  return getOwnActiveBomForItem('product', wi.productId)?.version || ''
}

function workItemToEbomLine(wi) {
  return {
    id: wi.id,
    productId: wi.productId,
    productName: wi.productName,
    productCode: wi.productCode,
    bomId: wi.bomId,
    bomName: wi.bomName,
    bomVersion: wi.bomVersion,
    ebomSnapshot: wi.ebomSnapshot,
    salesQty: wi.salesQty ?? wi.orderQty,
    ebomStatus: wi.ebomStatus,
  }
}

function openBomDetail(bomId, bomName) {
  if (!bomId) return
  const path = `/product-process/bom/${bomId}`
  openTab(path, bomName || 'BOM详情')
  router.push(path)
}

const selfMadeMaterials = computed(() =>
  selectedOrder.value ? getSelfMadeMaterialsForPlan(selectedOrder.value) : [],
)

const assemblyMaterialsForPlan = computed(() =>
  selectedOrder.value ? getAssemblyMaterialsForPlan(selectedOrder.value) : [],
)

const activeWorkItemBomTitle = computed(() => {
  const wi = activeWorkItem.value
  if (!wi) return '—'
  const name = wi.bomName || wi.ebomSnapshot?.bomName || ''
  const version = wi.bomVersion || wi.ebomSnapshot?.bomVersion || ''
  const label = `${name}${version}`
  return label || '—'
})

const outsourcedMaterials = computed(() => {
  if (!selectedOrder.value || !activeWorkItem.value) return []
  return getOutsourcedMaterialsFromWorkItem(activeWorkItem.value)
})

const purchasedMaterialsForReq = computed(() => {
  if (!activeWorkItem.value) return []
  return getPurchasedMaterialsFromWorkItem(activeWorkItem.value)
})

const printEbomFlatNodes = computed(() => activeWorkItem.value?.ebomSnapshot?.treeNodes || [])
const printEbomLineItems = computed(() => activeWorkItem.value?.ebomSnapshot?.lineItems || [])
const printEbomRootName = computed(() => activeWorkItem.value?.productName || '—')
const printEbomQuantity = computed(() => {
  const wi = activeWorkItem.value
  if (!wi) return 1
  return wi.orderQty ?? wi.salesQty ?? selectedOrder.value?.productQty ?? 1
})
const printEbomOverviewInfo = computed(() => {
  const wi = activeWorkItem.value
  if (!wi) {
    return {
      bomNo: '—',
      specModel: '—',
      version: '—',
      material: '—',
      drawingNo: '—',
      techParams: '—',
      matchingRequirements: '—',
    }
  }
  const snap = wi.ebomSnapshot || {}
  return {
    bomNo: snap.bomNo || wi.bomNo || '—',
    specModel: wi.specModel || '—',
    version: wi.bomVersion || snap.bomVersion || '—',
    material: wi.material || '—',
    drawingNo: wi.drawingNo || '—',
    techParams: wi.techParams || '—',
    matchingRequirements: wi.matchingRequirements || '—',
  }
})

/** 打印组件清单：按物料编码匹配 EBOM 行的库存数、需求数 */
const printEbomMaterialQtyMap = computed(() => {
  const map = {}
  const all = []
  flattenMaterials(materialTree.value, all)
  all.forEach((m) => {
    if (!m.code) return
    map[m.code] = {
      stockQty: m.stockQty ?? 0,
      demandQty: m.demandQty ?? 0,
    }
  })
  return map
})

const planAssemblyDateValue = computed(() => {
  const order = selectedOrder.value
  if (!order) return null
  const date = order.planAssemblyDate || order.workItems?.[0]?.deliveryDate || order.deliveryDate
  return date ? dayjs(date) : null
})

const planCompleteDateValue = computed(() => {
  const order = selectedOrder.value
  if (!order) return null
  const date = order.planCompleteDate || order.deliveryDate
  return date ? dayjs(date) : null
})

function onPlanAssemblyDateChange(date) {
  if (!selectedOrder.value) return
  selectedOrder.value.planAssemblyDate = date ? date.format('YYYY-MM-DD') : ''
  if (activeWorkItem.value?.materials?.length) {
    recalcMaterialLatestProcessTimes(activeWorkItem.value.materials, selectedOrder.value)
  }
}

function onPlanCompleteDateChange(date) {
  if (!selectedOrder.value) return
  selectedOrder.value.planCompleteDate = date ? date.format('YYYY-MM-DD') : ''
}

function refreshWorkItemMaterials(wi, order) {
  const baseQty = wi.orderQty ?? wi.salesQty ?? order?.productQty ?? 0
  const materials = resolveWorkItemMaterials(wi)
  const walk = (nodes) => {
    nodes?.forEach((m) => {
      m.demandQty = calcDemandQty(m.unitUsage, baseQty)
      m.gapQty = calcGapQty(m.demandQty, m.availableStock)
      if (m.children?.length) walk(m.children)
    })
  }
  walk(materials)
  syncWorkItemMaterialPlanQty(wi)
  enrichPlanMaterialTree(materials, order, wi)
}

function onWorkItemPlanQtyChange(record) {
  if (isPlanQtyLocked.value) return
  cascadeMaterialPlanQtyFromParent(record.planQty, record.materials)
}

function onTopLevelPlanQtyChange(val) {
  if (isPlanQtyLocked.value) return
  const wi = activeWorkItem.value
  if (!wi) return
  wi.planQty = val
  cascadeMaterialPlanQtyFromParent(val, wi.materials)
}

function onMaterialPlanQtyChange(record) {
  if (isPlanQtyLocked.value) return
  if (record.children?.length) {
    cascadeMaterialPlanQtyFromParent(record.planQty, record.children)
  }
}

function onTopLevelSupplyTypeChange(record) {
  const wi = activeWorkItem.value
  if (wi && record.isTopLevel) {
    wi.topLevelSupplyType = record.supplyType
    record.joinPlan = record.supplyType === '自制件' ? '是' : '否'
  }
  onMaterialSupplyTypeChange(record)
}

function filterSelectOption(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function materialDateValue(val) {
  return val ? dayjs(val) : null
}

function onMaterialLatestDateChange(record, date) {
  record.latestProcessTime = date ? date.format('YYYY-MM-DD') : ''
}

function selectWorkItem(record) {
  const order = selectedOrder.value
  if (!order || !record) return
  expandedWorkItemId.value = record.id
  order.workItems?.forEach((w) => {
    w.expanded = w.id === record.id
  })
  refreshWorkItemMaterials(record, order)
}

function collapseWorkItem() {
  expandedWorkItemId.value = null
  selectedOrder.value?.workItems?.forEach((w) => {
    w.expanded = false
  })
}

function workItemRowClassName(record) {
  return expandedWorkItemId.value === record.id ? 'work-item-row-active' : 'work-item-row'
}

function workItemCustomRow(record) {
  return {
    onClick: () => selectWorkItem(record),
  }
}

watch(
  selectedOrder,
  (order) => {
    if (!order) {
      expandedWorkItemId.value = null
      return
    }
    const items = order.workItems || []
    if (!items.length) {
      expandedWorkItemId.value = null
      return
    }
    const current = items.find((w) => w.id === expandedWorkItemId.value)
    if (!current) {
      const preferred = items.find((w) => w.expanded) || items[0]
      if (preferred) selectWorkItem(preferred)
      return
    }
    selectWorkItem(current)
  },
  { immediate: true },
)

function toggleWorkItemExpand(record) {
  if (expandedWorkItemId.value === record.id) {
    collapseWorkItem()
    return
  }
  selectWorkItem(record)
}

watch(filteredOrders, (list) => {
  if (!list.find((o) => o.id === selectedId.value)) {
    selectedId.value = list[0]?.id || null
  }
})

function materialStatusColor(status) {
  const map = {
    待下达: 'warning',
    不转产: 'default',
    进行中: 'processing',
    已完成: 'success',
  }
  return map[status] || 'default'
}

/** 可用库存列：工单占用/可用库存 */
function formatAvailableStockText(record) {
  if (!record || record.isTopLevel) return '—'
  const allocated = formatQty(record.woAllocatedQty ?? 0)
  const available = formatQty(record.availableStock ?? 0)
  return `${allocated}/${available}`
}

function openAssemblyWorkOrderModal() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  if (activeWorkItem.value?.status === '设计中') {
    message.warning('当前工作项处于「设计中」，请先完成设计任务审核')
    return
  }
  if (activeWorkItem.value?.status === '待BOM') {
    message.warning('当前工作项处于「待BOM」，请先维护产品 BOM 或改选 BOM 来源后补绑')
    return
  }
  if (!assemblyMaterialsForPlan.value.length) {
    message.info('当前订单没有供应型态为「组装」的物料，或顶级物料未设为「组装」')
    return
  }
  assemblyWorkOrderModalOpen.value = true
}

function openWorkOrderModal() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  if (activeWorkItem.value?.status === '设计中') {
    message.warning('当前工作项处于「设计中」，请先完成设计任务审核')
    return
  }
  if (activeWorkItem.value?.status === '待BOM') {
    message.warning('当前工作项处于「待BOM」，请先维护产品 BOM 或改选 BOM 来源后补绑')
    return
  }
  if (!selfMadeMaterials.value.length) {
    message.info('当前订单没有供应型态为「自制件」的物料，或顶级物料未设为「自制件」')
    return
  }
  workOrderModalOpen.value = true
}

function openEbomPrint() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  if (!activeWorkItem.value) {
    message.warning('请先展开工作项查看 EBOM 清单')
    return
  }
  if (activeWorkItem.value.status === '设计中') {
    message.warning('当前工作项处于「设计中」，暂无 EBOM 可打印')
    return
  }
  if (activeWorkItem.value.status === '待BOM') {
    message.warning('当前工作项处于「待BOM」，暂无 EBOM 可打印')
    return
  }
  if (!printEbomFlatNodes.value.length || !printEbomLineItems.value.length) {
    message.info('当前工作项暂无 EBOM 清单可打印')
    return
  }
  ebomPrintModalOpen.value = true
}

function openOutsourceWorkOrderModal() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  if (!activeWorkItem.value) {
    message.warning('请先展开工作项查看物料清单')
    return
  }
  if (activeWorkItem.value.status === '设计中') {
    message.warning('当前工作项处于「设计中」，请先完成设计任务审核')
    return
  }
  if (activeWorkItem.value.status === '待BOM') {
    message.warning('当前工作项处于「待BOM」，请先维护产品 BOM')
    return
  }
  if (!outsourcedMaterials.value.length) {
    message.info('当前物料清单没有供应型态为「外协件」的物料')
    return
  }
  outsourceWorkOrderModalOpen.value = true
}

function generatePurchaseReq() {
  if (!selectedOrder.value) {
    message.warning('请先选择订单')
    return
  }
  if (!activeWorkItem.value) {
    message.warning('请先展开工作项查看物料清单')
    return
  }
  if (activeWorkItem.value.status === '设计中') {
    message.warning('当前工作项处于「设计中」，请先完成设计任务审核')
    return
  }
  if (activeWorkItem.value.status === '待BOM') {
    message.warning('当前工作项处于「待BOM」，请先维护产品 BOM')
    return
  }
  const wi = activeWorkItem.value
  const hasBomId = Boolean(wi.bomId)
  const hasSnapshot = Boolean(wi.ebomSnapshot?.materials?.length || wi.materials?.length)
  if (!hasBomId && !hasSnapshot) {
    message.warning('当前工作项无绑定 BOM / 有效 EBOM 快照，无法生成采购申请')
    return
  }
  if (!purchasedMaterialsForReq.value.length) {
    message.info('当前物料清单没有供应型态为「外购件」的物料')
    return
  }
  purchaseReqModalOpen.value = true
}

function handlePurchaseReqSave(requisition) {
  const order = productionPlanState.plans.find((o) => o.id === selectedId.value)
  addPurchaseRequisition(requisition)
  if (order && requisition.lineItems?.length) {
    lockOrderPlanQty(order)
    requisition.lineItems.forEach((line) => {
      const material = purchasedMaterialsForReq.value.find((m) => m.code === line.inventoryCode)
      if (!material) return
      updateMaterialInOrder(order, material.id, {
        designateSupplier: line.designatedSupplier,
        supplier: line.supplierName,
        planQty: line.planPurchaseQty,
        status: '进行中',
        joinPlan: '是',
      })
    })
  }
  message.success(`已生成采购申请 ${requisition.reqNo}，共 ${requisition.lineItems.length} 条物料`)
}

function handleAssemblyWorkOrderSave(savedRows) {
  const order = productionPlanState.plans.find((o) => o.id === selectedId.value)
  if (!order) return
  lockOrderPlanQty(order)
  savedRows.forEach((row) => {
    updateMaterialInOrder(order, row.materialId, patchMaterialFromAssemblyWorkOrderRow(row))
  })
  const created = addAssemblyWorkOrdersFromPlanRows(savedRows, order)
  if (created.length) {
    message.success(`已同步 ${created.length} 条工单至总装工单`)
  }
}

function handleWorkOrderSave(savedRows) {
  const order = productionPlanState.plans.find((o) => o.id === selectedId.value)
  if (!order) return
  lockOrderPlanQty(order)
  savedRows.forEach((row) => {
    updateMaterialInOrder(order, row.materialId, patchMaterialFromWorkOrderRow(row))
  })
  const created = addWorkOrdersFromPlanRows(savedRows, order)
  if (created.length) {
    message.success(`已同步 ${created.length} 条工单至生产工单`)
  }
}

function handleOutsourceWorkOrderSave(savedRows) {
  const order = productionPlanState.plans.find((o) => o.id === selectedId.value)
  if (!order) return
  lockOrderPlanQty(order)
  savedRows.forEach((row) => {
    updateMaterialInOrder(order, row.materialId, patchMaterialFromOutsourceWorkOrderRow(row))
  })
  const created = addOutsourceWorkOrdersFromPlanRows(savedRows, order)
  if (created.length) {
    message.success(`已同步 ${created.length} 条外协工单至生产工单`)
  }
}

function tagColor(tag) {
  if (tag.includes('逾期')) return 'error'
  if (tag.includes('完成')) return 'success'
  if (tag.includes('部分') || tag.includes('生产')) return 'warning'
  return 'default'
}

function selectOrder(id) {
  selectedId.value = id
  expandedWorkItemId.value = null
  const order = filteredOrders.value.find((o) => o.id === id)
  const first = order?.workItems?.[0]
  if (first) selectWorkItem(first)
}

function toggleDetailFullscreen() {
  detailFullscreen.value = !detailFullscreen.value
}

function onFullscreenKeydown(event) {
  if (event.key === 'Escape' && detailFullscreen.value) {
    detailFullscreen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onFullscreenKeydown)
  const qOrderNo = String(route.query.orderNo || '').trim()
  if (qOrderNo) {
    filters.orderNo = qOrderNo
    appliedFilters.value = { ...filters }
    pagination.current = 1
    const hit = productionPlanState.plans.find(
      (p) => p.salesOrderNo === qOrderNo || p.orderNo === qOrderNo || p.id === qOrderNo,
    )
    if (hit) selectedId.value = hit.id
  }
  if (!selectedId.value && filteredOrders.value[0]) {
    selectedId.value = filteredOrders.value[0].id
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onFullscreenKeydown)
})

function handleSearch() {
  appliedFilters.value = { ...filters }
  pagination.current = 1
}

function goReplenishCenter() {
  openTab('/planning/replenish-center', '库存预警')
  router.push('/planning/replenish-center')
}

function handleReset() {
  filters.orderNo = ''
  filters.customerName = ''
  filters.urgency = undefined
  filters.orderStatus = undefined
  filters.planSource = undefined
  filters.orderDateRange = null
  filters.deliveryDateRange = null
  appliedFilters.value = { ...filters }
  pagination.current = 1
}
</script>

<style lang="less" scoped>
.production-plan {
  display: flex;
  flex-direction: column;
  margin: -12px;
  padding: 12px;
  background: #f5f6f8;
  height: calc(100vh - 56px - 40px - 24px);
  min-height: calc(100vh - 56px - 40px - 24px);
  box-sizing: border-box;
  overflow: hidden;
}

.filter-card {
  flex-shrink: 0;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 10px 12px 6px;
  margin-bottom: 8px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
  }

  .filter-actions-item {
    :deep(.ant-form-item-label) {
      display: none;
    }
  }
}

.master-detail {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.order-list-panel {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow-y: auto;
  background: #fff;
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.order-card {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;

  &:hover,
  &.active {
    border-color: #1677ff;
    background: #e6f4ff;
  }

  .card-tags {
    margin-bottom: 8px;
  }

  .card-row {
    font-size: 12px;
    line-height: 22px;
    color: rgba(0, 0, 0, 0.85);

    .label {
      color: rgba(0, 0, 0, 0.45);
      margin-right: 6px;
    }
  }
}

.list-pagination {
  margin-top: auto;
  text-align: center;
}

.detail-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 6px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;

  :deep(.detail-tabs.ant-tabs) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  :deep(.detail-tabs .ant-tabs-content-holder) {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  :deep(.detail-tabs .ant-tabs-tabpane) {
    height: 100%;
  }

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #fff;
    padding: 16px 20px 20px;
    overflow: auto;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

.detail-tab-body {
  min-height: 100%;
}

.detail-header-actions {
  flex-shrink: 0;
}

.fullscreen-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
  }
}

.info-grid {
  margin-bottom: 12px;
}

.action-row {
  margin: 12px 0;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.detail-empty {
  flex: 1;
  min-height: 0;
  height: 100%;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.material-tree-wrap {
  margin-bottom: 0;
}

.ebom-empty {
  margin: 12px 0;
}

.ebom-panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 8px;
  font-weight: 600;
  font-size: 13px;

  .ebom-sub {
    margin-left: 8px;
    font-weight: 400;
    color: rgba(0, 0, 0, 0.45);
  }
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
  margin-bottom: 10px;
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

.link-code {
  color: #1677ff;
  cursor: pointer;
}

:deep(.work-item-row) {
  cursor: pointer;
}

:deep(.work-item-row-active) {
  cursor: pointer;
  background: #e6f4ff !important;

  > td {
    background: #e6f4ff !important;
  }
}

.ellipsis-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: #bfbfbf;
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

@media (max-width: 992px) {
  .production-plan {
    height: auto;
    min-height: calc(100vh - 56px - 40px - 24px);
    overflow: visible;
  }

  .master-detail {
    flex-direction: column;
    flex: none;
  }

  .order-list-panel {
    width: 100%;
    height: auto;
    max-height: 280px;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .order-card {
    width: calc(50% - 4px);
  }
}
</style>
