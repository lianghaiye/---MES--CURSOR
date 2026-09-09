<template>
  <a-modal
    :open="open"
    title="生成采购入库单"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="generate-inbound-modal"
    wrap-class-name="generate-inbound-modal-wrap"
    @cancel="handleCancel"
  >
    <div class="modal-basic-card">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="6">
            <a-form-item :label="isReceiptSource ? '收货单号' : '采购单号'" required>
              <a-input :value="headerOrderNo" disabled size="small" :title="headerOrderNo" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="供应商" required>
              <a-input :value="headerSupplier" disabled size="small" :title="headerSupplier" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="收货日期" required>
              <a-date-picker
                v-model:value="form.receiptDate"
                size="small"
                style="width: 100%"
                placeholder="请选择收货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="6">
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
          <a-col :span="6">
            <a-form-item label="发票号码">
              <a-input
                v-model:value="form.invoiceNo"
                size="small"
                :maxlength="30"
                placeholder="请输入发票号码"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                placeholder="请输入备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="isReceiptSource" class="section-block">
      <div class="section-title source-section-head">
        <span>
          采购收货单 ({{ receiptRows.length }})
          <span class="section-hint">{{ receiptSectionHint }}</span>
        </span>
        <a-button
          type="link"
          size="small"
          @click="receiptSectionExpanded = !receiptSectionExpanded"
        >
          {{ receiptSectionExpanded ? '收起' : '展开' }}
        </a-button>
      </div>
      <a-table
        v-show="receiptSectionExpanded"
        :columns="receiptColumns"
        :data-source="receiptRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 900 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'inboundStatus'">
            <a-tag :color="inboundStatusColor(record.inboundStatus)">
              {{ record.inboundStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            {{ record.itemCount }}
          </template>
          <template v-else-if="column.key === 'receiptQty'">
            {{ formatQty(record.receiptQty) }}
          </template>
          <template v-else-if="column.key === 'receivedAt'">
            {{ formatReceiptTime(record.receivedAt) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div v-else class="section-block">
      <div class="section-title">
        采购订单 ({{ orderRows.length }})
        <span class="section-hint">{{ orderSectionHint }}</span>
      </div>
      <a-table
        :columns="orderColumns"
        :data-source="orderRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 820 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'inboundStatus'">
            <a-tag :color="inboundStatusColor(record.inboundStatus)">
              {{ record.inboundStatus || '—' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'itemCount'">
            {{ record.itemCount }}
          </template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatQty(record.purchaseQty) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div v-if="showQcResultSection" class="section-block">
      <div class="section-title qc-result-head">
        <span>
          质检结果 ({{ qcResultRows.length }})
          <span class="section-hint">一个产品一行；可对照合格入库数填写下方入库明细</span>
        </span>
        <a-button type="link" size="small" @click="qcResultExpanded = !qcResultExpanded">
          {{ qcResultExpanded ? '收起' : '展开' }}
        </a-button>
      </div>
      <a-table
        v-show="qcResultExpanded"
        :columns="qcResultColumns"
        :data-source="qcResultRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1280 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'qcStatus'">
            <a-tag :color="qcStatusColor(record.qcStatus)">{{ record.qcStatus || '—' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'qcResult'">
            <a-tag v-if="record.qcResult" :color="qcResultColor(record.qcResult)">
              {{ record.qcResult }}
            </a-tag>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'productInfo'">
            <span :title="formatQcProductInfo(record)">{{ formatQcProductInfo(record) }}</span>
          </template>
          <template v-else-if="column.key === 'inspectQty' || column.key === 'acceptInboundQty'">
            {{
              record[column.key] === '' || record[column.key] == null
                ? '—'
                : formatQty(record[column.key])
            }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? record[column.key] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div class="section-block">
      <div class="section-title">
        入库明细 ({{ displayLines.length }})
        <span v-if="purchaseReceipt || isReceiptSource" class="section-hint"
          >仅含收货单明细，一收货单一张入库单</span
        >
      </div>
      <a-alert
        v-if="showQcQtyHintAlert"
        type="info"
        show-icon
        class="qc-qty-hint-alert"
        message="已按质检「合格入库数量」带入本次入库数量，可改小，不可超过合格入库数与可入剩余。"
      />
      <InboundLineScopeToggle v-model="lineScope" />

      <a-table
        :columns="columns"
        :data-source="displayLines"
        row-key="rowKey"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        :row-class-name="(record) => (isLineCompleted(record) ? 'inbound-row-locked' : '')"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'inboundProgress'">
            <span class="col-title-with-tip">
              入库进度
              <a-tooltip :title="INBOUND_PROGRESS_TOOLTIP">
                <InfoCircleOutlined class="col-tip-icon" />
              </a-tooltip>
            </span>
          </template>
          <template v-else-if="column.key === 'qty' || column.key === 'warehouse'">
            <span class="col-title-required">
              <span class="required-star">*</span>{{ column.title }}
            </span>
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'inboundProgress'">
            {{
              formatInboundProgress(
                record.receivedQty,
                record.appliedInboundQty,
                record.poPurchaseQty,
              )
            }}
          </template>
          <template v-else-if="column.key === 'itemName'">
            <span class="item-name-text" :title="formatInboundProductName(record)">
              {{ formatInboundProductName(record) }}
            </span>
          </template>
          <template v-else-if="column.key === 'warehouse'">
            <a-select
              v-model:value="record.warehouse"
              allow-clear
              size="small"
              placeholder="请选择"
              style="width: 100%"
              :options="warehouseOpts"
              :disabled="isLineCompleted(record)"
            />
          </template>
          <template v-else-if="column.key === 'qty'">
            <div class="qty-with-unit">
              <a-input-number
                v-model:value="record.qty"
                size="small"
                :min="0"
                :max="record.remainingQty"
                :precision="3"
                style="flex: 1; min-width: 0"
                :disabled="isLineCompleted(record)"
                @change="() => onLineQtyChange(record)"
              />
              <span class="unit-suffix">{{ record.unit || '' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'settleQty'">
            <div v-if="record.settleUnit" class="qty-with-unit">
              <a-input-number
                v-model:value="record.settleQty"
                size="small"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="flex: 1; min-width: 0"
                :disabled="isLineCompleted(record)"
                placeholder="实重"
                @change="() => onLineSettleQtyChange(record)"
              />
              <span class="unit-suffix">{{ record.settleUnit }}</span>
            </div>
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'unitPrice'">
            {{ formatMoney(record.unitPrice) }}
          </template>
          <template v-else-if="column.key === 'totalPrice'">
            {{ formatMoney(record.totalPrice) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space v-if="!isLineCompleted(record)" :size="0">
              <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="removeLine(record)">
                移除本单
              </a-button>
            </a-space>
            <span v-else class="locked-tip">已入库</span>
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
        <template #emptyText>
          <a-empty :image="false" description="没有可入库的明细" />
        </template>
      </a-table>

      <div class="line-summary">
        合计数量：<strong>{{ totalQty.toLocaleString() }}</strong>
      </div>
    </div>

    <a-modal
      v-model:open="lineEditOpen"
      title="编辑明细"
      width="720px"
      :mask-closable="false"
      destroy-on-close
      class="inbound-line-edit-modal"
      @cancel="lineEditOpen = false"
    >
      <a-form v-if="lineEditDraft" layout="vertical" class="edit-form">
        <div class="item-preview">
          <a-row :gutter="[16, 8]">
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">物品编码</span>
                <span class="preview-value">{{ lineEditDraft.itemCode || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">产品名称</span>
                <span class="preview-value">{{ lineEditDraft.itemName || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">规格型号</span>
                <span class="preview-value">{{ lineEditDraft.specModel || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">材质</span>
                <span class="preview-value">{{ lineEditDraft.material || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">变体属性</span>
                <span class="preview-value">{{ lineEditDraft.variantSummary || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">图号</span>
                <span class="preview-value">{{ lineEditDraft.drawingNo || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">条码类型</span>
                <span class="preview-value">{{ lineEditDraft.barcodeType || '—' }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">单价</span>
                <span class="preview-value">{{ formatMoney(lineEditDraft.unitPrice) }}</span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="preview-row">
                <span class="preview-label">入库进度</span>
                <span class="preview-value">
                  {{
                    formatInboundProgress(
                      lineEditDraft.receivedQty,
                      lineEditDraft.appliedInboundQty,
                      lineEditDraft.poPurchaseQty,
                    )
                  }}
                </span>
              </div>
            </a-col>
          </a-row>
        </div>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="入库仓库" required>
              <a-select
                v-model:value="lineEditDraft.warehouse"
                style="width: 100%"
                placeholder="请选择入库仓库"
                :options="warehouseOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入库数量" required>
              <a-input-number
                v-model:value="lineEditDraft.qty"
                :min="0"
                :max="lineEditDraft.remainingQty"
                :precision="3"
                style="width: 100%"
                :addon-after="lineEditDraft.unit || ''"
              />
            </a-form-item>
          </a-col>
          <a-col v-if="lineEditDraft.settleUnit" :span="12">
            <a-form-item :label="`结算数量（${lineEditDraft.settleUnit}）`" required>
              <a-input-number
                v-model:value="lineEditDraft.settleQty"
                :min="0"
                :precision="4"
                :formatter="inputNumberFormatter"
                :parser="inputNumberParser"
                style="width: 100%"
                placeholder="实重"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <template #footer>
        <a-button @click="lineEditOpen = false">取消</a-button>
        <a-button type="primary" @click="applyLineEdit">确定</a-button>
      </template>
    </a-modal>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { CheckOutlined, InfoCircleOutlined } from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { createInboundFromPurchaseOrder } from '@/store/inboundOrderStore'
import { getPurchaseOrderById } from '@/store/purchaseOrderStore'
import { getPendingPurchasePriceChangeBlock } from '@/store/purchasePriceChangeStore'
import { updatePurchaseReceipt } from '@/store/purchaseReceiptStore'
import { resolveDefaultWarehouseByMaterialCode } from '@/utils/warehouseResolver'
import { inboundFormLineColumns } from '@/utils/inboundLineColumns'
import { syncInboundLineTotalFromUnit } from '@/utils/inboundLineHelpers'
import { estimateSettleQty } from '@/utils/settleUnit'
import { formatDateTimeMinute } from '@/utils/dateTimeDisplay'
import {
  calcPoLineAppliedOccupyQty,
  calcPoLineReceivedQty,
  calcPoLineRemainInboundQty,
  formatInboundProgress,
  INBOUND_PROGRESS_TOOLTIP,
  isPoLineOccupyFull,
} from '@/utils/purchaseLineInbound'
import InboundLineScopeToggle from '@/components/InboundLineScopeToggle.vue'
import { filterInboundLinesByScope, isInboundLineCompleted } from '@/utils/inboundLineScope'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import { applyQcQtyHintsToInboundLines } from '@/utils/qcInboundFromReceipt'
import {
  listQcProductResultLinesForPurchaseOrders,
  listQcProductResultLinesForReceipt,
} from '@/utils/purchaseOrderQc'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'

/** 采购场景生成入库：不展示状态/库存换算/货位相关列 */
const HIDDEN_LINE_KEYS = new Set([
  'actions',
  'lineStatus',
  'stockUnitQty',
  'stockUnit',
  'locationNo',
  'stockQty',
  'warehouseStockQty',
])

const props = defineProps({
  open: { type: Boolean, default: false },
  purchaseOrder: { type: Object, default: null },
  /** 多张（列表多选）；优先于 purchaseOrder */
  purchaseOrders: { type: Array, default: null },
  /** 从采购收货进入时传入，保存后由列表侧回写关联 */
  purchaseReceipt: { type: Object, default: null },
  /** 多张收货单（质检批量入库）；优先于 purchaseReceipt */
  purchaseReceipts: { type: Array, default: null },
  /** 来料质检：按合格入库数量带入；enforce 时不可超过该上限 */
  qcQtyHints: { type: Object, default: null },
  qcEnforceQtyCap: { type: Boolean, default: false },
  /**
   * 批量质检入库：按收货单分别带入合格入库数量
   * [{ receiptId, hints, enforceQtyCap }]
   */
  qcHintBundles: { type: Array, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const inboundLines = ref([])
const lineScope = ref('pending')
const prevHeaderWarehouse = ref(undefined)
const lineEditOpen = ref(false)
const lineEditDraft = ref(null)
const lineEditId = ref('')
const qcResultExpanded = ref(true)
const receiptSectionExpanded = ref(false)

const sourceReceipts = computed(() => {
  if (Array.isArray(props.purchaseReceipts) && props.purchaseReceipts.length) {
    return props.purchaseReceipts.filter(Boolean)
  }
  return props.purchaseReceipt ? [props.purchaseReceipt] : []
})
const isReceiptSource = computed(() => sourceReceipts.value.length > 0)
const isMultiReceipt = computed(() => sourceReceipts.value.length > 1)

const sourceOrders = computed(() => {
  if (Array.isArray(props.purchaseOrders) && props.purchaseOrders.length) {
    return props.purchaseOrders.filter(Boolean)
  }
  if (props.purchaseOrder) return [props.purchaseOrder]
  // 仅传收货单时，从收货反查采购单
  const fromReceipts = []
  const seen = new Set()
  sourceReceipts.value.forEach((r) => {
    const po = (r.purchaseOrderId && getPurchaseOrderById(r.purchaseOrderId)) || null
    if (po && !seen.has(po.id)) {
      seen.add(po.id)
      fromReceipts.push(po)
    }
  })
  return fromReceipts
})
const isMultiOrder = computed(() => sourceOrders.value.length > 1)
const headerOrderNo = computed(() => {
  if (isReceiptSource.value) {
    const nos = sourceReceipts.value.map((r) => r.receiptNo).filter(Boolean)
    if (!nos.length) return ''
    if (nos.length === 1) return nos[0]
    return nos.length <= 3 ? nos.join('、') : `${nos.slice(0, 2).join('、')} 等 ${nos.length} 单`
  }
  const nos = sourceOrders.value.map((o) => o.orderNo).filter(Boolean)
  if (!nos.length) return ''
  if (nos.length === 1) return nos[0]
  return nos.length <= 3 ? nos.join('、') : `${nos.slice(0, 2).join('、')} 等 ${nos.length} 单`
})
const headerSupplier = computed(() => {
  const fromReceipt = [...new Set(sourceReceipts.value.map((r) => r.supplier).filter(Boolean))]
  if (fromReceipt.length) {
    return fromReceipt.length === 1 ? fromReceipt[0] : fromReceipt.join('、')
  }
  const list = [...new Set(sourceOrders.value.map((o) => o.supplier).filter(Boolean))]
  if (!list.length) return ''
  return list.length === 1 ? list[0] : list.join('、')
})

const orderSectionHint = computed(() => '本次入库来源采购单，批量入库时展示多条')
const receiptSectionHint = computed(() =>
  isMultiReceipt.value
    ? '批量入库：一收货单一张入库单'
    : `来源收货单 ${sourceReceipts.value[0]?.receiptNo || ''}，入库明细仅含该收货单物料`,
)

const qcResultRows = computed(() => {
  if (isReceiptSource.value) {
    return sourceReceipts.value.flatMap((r) => listQcProductResultLinesForReceipt(r))
  }
  return listQcProductResultLinesForPurchaseOrders(sourceOrders.value)
})
const showQcResultSection = computed(() => qcResultRows.value.length > 0)
const showQcQtyHintAlert = computed(() => {
  if (props.qcEnforceQtyCap && props.qcQtyHints) return true
  return (props.qcHintBundles || []).some((b) => b?.enforceQtyCap && b?.hints)
})

const qcResultColumns = [
  { title: '质检单号', dataIndex: 'qcNo', key: 'qcNo', width: 150, ellipsis: true },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '产品信息', key: 'productInfo', width: 280, ellipsis: true },
  { title: '质检方式', dataIndex: 'inspectMethod', key: 'inspectMethod', width: 90 },
  { title: '质检数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '处理方案', dataIndex: 'treatmentPlan', key: 'treatmentPlan', width: 100 },
  { title: '合格入库数', key: 'acceptInboundQty', width: 100, align: 'right' },
  {
    title: '退/换货',
    dataIndex: 'returnExchange',
    key: 'returnExchange',
    width: 120,
    ellipsis: true,
  },
]

function formatQcProductInfo(record = {}) {
  const parts = [
    record.itemCode,
    record.itemName && record.itemName !== '—' ? record.itemName : '',
    record.specModel,
    record.material,
  ].map((v) => String(v || '').trim())
  const text = parts.filter(Boolean).join('/')
  return text || '—'
}

function formatInboundProductName(record = {}) {
  const name = String(record.itemName || '').trim()
  const code = String(record.itemCode || '').trim()
  if (code && name) return `[${code}] ${name}`
  return name || code || '—'
}

function qcStatusColor(status) {
  const map = {
    待质检: 'warning',
    检验中: 'processing',
    已完成: 'success',
    已终止: 'default',
    未质检: 'default',
    质检中: 'processing',
    质检通过: 'success',
    部分通过: 'warning',
    质检不通过: 'error',
  }
  return map[status] || 'default'
}

/** 与来料质检列表/详情一致 */
function qcResultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL || result === '部分合格') return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

const orderColumns = [
  { title: '采购单号', dataIndex: 'orderNo', key: 'orderNo', width: 160, ellipsis: true },
  { title: '入库状态', key: 'inboundStatus', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 140, ellipsis: true },
  { title: '采购项数', key: 'itemCount', width: 90, align: 'right' },
  { title: '采购数量', key: 'purchaseQty', width: 110, align: 'right' },
  { title: '采购员', dataIndex: 'purchaser', key: 'purchaser', width: 100 },
]

const orderRows = computed(() =>
  sourceOrders.value.map((o) => {
    const itemCount = (o.lineItems || []).length
    const purchaseQty =
      o.totalQty ?? (o.lineItems || []).reduce((s, l) => s + (Number(l.purchaseQty) || 0), 0)
    return {
      id: o.id,
      orderNo: o.orderNo || '',
      inboundStatus: o.inboundStatus || '待入库',
      supplier: o.supplier || '',
      itemCount,
      purchaseQty,
      purchaser: o.purchaser || '',
    }
  }),
)

const receiptColumns = [
  { title: '收货单号', dataIndex: 'receiptNo', key: 'receiptNo', width: 160, ellipsis: true },
  { title: '入库状态', key: 'inboundStatus', width: 100 },
  { title: '收货项数', key: 'itemCount', width: 90, align: 'right' },
  { title: '收货数量', key: 'receiptQty', width: 110, align: 'right' },
  { title: '收货人', dataIndex: 'receiver', key: 'receiver', width: 100 },
  { title: '收货时间', key: 'receivedAt', width: 150 },
]

const receiptRows = computed(() =>
  sourceReceipts.value.map((r) => {
    const lines = r.lineItems || []
    return {
      id: r.id,
      receiptNo: r.receiptNo || '',
      inboundStatus: r.inboundStatus || '待入库',
      itemCount: lines.length,
      receiptQty: lines.reduce((s, l) => s + (Number(l.receiptQty) || 0), 0),
      receiver: r.purchaser || r.receiver || r.creator || '',
      receivedAt: r.receivedAt || r.createdAt || '',
    }
  }),
)

function formatReceiptTime(val) {
  return formatDateTimeMinute(val) || val || '—'
}

function inboundStatusColor(status) {
  const map = {
    待入库: 'default',
    入库中: 'processing',
    部分入库: 'warning',
    已入库: 'success',
  }
  return map[status] || 'default'
}

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

const displayLines = computed(() => filterInboundLinesByScope(inboundLines.value, lineScope.value))
const isLineCompleted = isInboundLineCompleted

const form = reactive({
  receiptDate: dayjs(),
  invoiceNo: '',
  remark: '',
  warehouse: undefined,
})

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const columns = computed(() => {
  const base = inboundFormLineColumns
    .filter((c) => !HIDDEN_LINE_KEYS.has(c.key))
    .map((c) => {
      if (c.key === 'itemName') {
        return { ...c, title: '产品名称', width: 220, ellipsis: true }
      }
      return c
    })
  const itemNameIdx = base.findIndex((c) => c.key === 'itemName')
  const progressCol = {
    title: '入库进度',
    key: 'inboundProgress',
    width: 180,
    ellipsis: true,
  }
  let withProgress =
    itemNameIdx >= 0
      ? [...base.slice(0, itemNameIdx), progressCol, ...base.slice(itemNameIdx)]
      : [progressCol, ...base]
  if (isMultiOrder.value || isMultiReceipt.value) {
    const codeIdx = withProgress.findIndex((c) => c.key === 'itemCode')
    const extraCols = []
    if (isMultiReceipt.value) {
      extraCols.push({
        title: '收货单号',
        key: 'receiptNo',
        dataIndex: 'receiptNo',
        width: 140,
        ellipsis: true,
      })
    }
    if (isMultiOrder.value) {
      extraCols.push({
        title: '采购单号',
        key: 'purchaseOrderNo',
        dataIndex: 'purchaseOrderNo',
        width: 140,
        ellipsis: true,
      })
    }
    withProgress =
      codeIdx >= 0
        ? [...withProgress.slice(0, codeIdx), ...extraCols, ...withProgress.slice(codeIdx)]
        : [...extraCols, ...withProgress]
  }
  return [...withProgress, { title: '操作', key: 'action', width: 140, fixed: 'right' }]
})

const tableScrollX = computed(() => columns.value.reduce((sum, col) => sum + (col.width || 100), 0))

const totalQty = computed(() =>
  displayLines.value.reduce((sum, line) => sum + (Number(line.qty) || 0), 0),
)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    if (!sourceOrders.value.length && !sourceReceipts.value.length) return
    form.receiptDate = dayjs()
    form.invoiceNo = ''
    if (isReceiptSource.value) {
      form.remark =
        sourceReceipts.value.length === 1
          ? `收货单 ${sourceReceipts.value[0].receiptNo || ''} 生成`
          : `批量入库：${sourceReceipts.value
              .map((r) => r.receiptNo)
              .filter(Boolean)
              .join('、')}`
    } else {
      form.remark =
        sourceOrders.value.length === 1
          ? sourceOrders.value[0].remark || ''
          : `批量入库：${sourceOrders.value
              .map((o) => o.orderNo)
              .filter(Boolean)
              .join('、')}`
    }
    lineScope.value = 'pending'
    qcResultExpanded.value = true
    receiptSectionExpanded.value = false
    if (isReceiptSource.value) {
      inboundLines.value = sourceReceipts.value.flatMap((receipt) => {
        const order =
          sourceOrders.value.find(
            (o) =>
              (receipt.purchaseOrderId && o.id === receipt.purchaseOrderId) ||
              (receipt.purchaseOrderNo && o.orderNo === receipt.purchaseOrderNo),
          ) || (receipt.purchaseOrderId ? getPurchaseOrderById(receipt.purchaseOrderId) : null)
        if (!order) return []
        return buildLinesFromPurchaseReceipt(order, receipt)
      })
      if (!inboundLines.value.length) {
        message.warning('收货单明细无法匹配到采购订单行，请检查物料编码是否一致')
      }
    } else {
      inboundLines.value = sourceOrders.value.flatMap((order) => buildLinesFromPurchaseOrder(order))
    }
    applyQcQtyHints(inboundLines.value)
    const warehouses = [
      ...new Set(inboundLines.value.map((line) => line.warehouse).filter(Boolean)),
    ]
    form.warehouse = warehouses.length === 1 ? warehouses[0] : undefined
    prevHeaderWarehouse.value = form.warehouse
  },
)

/** 质检「合格入库数量」优先写入本次入库 qty（不超过可入剩余）；部分通过时封顶 */
function applyQcQtyHints(lines = []) {
  const bundles = Array.isArray(props.qcHintBundles) ? props.qcHintBundles.filter(Boolean) : []
  if (bundles.length) {
    bundles.forEach((bundle) => {
      const scoped = lines.filter((l) => l.purchaseReceiptId === bundle.receiptId)
      applyQcQtyHintsToInboundLines(scoped, bundle.hints, {
        enforceQtyCap: Boolean(bundle.enforceQtyCap),
        syncTotal: syncInboundLineTotalFromUnit,
      })
    })
    return
  }
  applyQcQtyHintsToInboundLines(lines, props.qcQtyHints, {
    enforceQtyCap: props.qcEnforceQtyCap,
    syncTotal: syncInboundLineTotalFromUnit,
  })
}

/** 按采购单位入库；有结算单位时带入 settleQty（实重），库存 qty 仍为件数 */
function buildPurchaseInboundLine(line, order) {
  const remaining = calcPoLineRemainInboundQty(order, line)
  const received = calcPoLineReceivedQty(order, line)
  const applied = calcPoLineAppliedOccupyQty(order, line)
  const locked = isPoLineOccupyFull(order, line)
  const poPurchaseQty = Number(line.purchaseQty) || 0
  const purchaseUnit = line.unit || '个'
  const warehouse =
    line.receivingWarehouse ||
    resolveDefaultWarehouseByMaterialCode(line.itemCode || line.productCode) ||
    undefined
  const settleUnit = String(line.settleUnit || '').trim()
  const next = {
    rowKey: `${order.id}__${line.id}`,
    id: line.id,
    poLineId: line.id,
    purchaseOrderId: order.id,
    purchaseOrderNo: order.orderNo || '',
    itemCode: line.itemCode || line.productCode || '',
    itemName: line.itemName || line.productName || '',
    itemType: line.itemType || '物料',
    specModel: line.specModel || '',
    specAttr: line.specAttr || '',
    material: line.material || '',
    drawingNo: line.drawingNo || '',
    barcodeType: line.barcodeType || '',
    variantSummary: line.variantSummary || '',
    unit: purchaseUnit,
    purchaseUnit,
    stockUnit: purchaseUnit,
    unitPrice: line.unitPriceInTax ?? line.unitPriceExTax ?? null,
    locationNo: '',
    warehouse,
    qty: locked ? 0 : remaining,
    remainingQty: remaining,
    receivedQty: received,
    appliedInboundQty: applied,
    poPurchaseQty,
    locked,
    isVariableLength: false,
    purchaseQty: undefined,
    totalValue: undefined,
    inboundEntryMode: undefined,
    settleUnit: settleUnit || '',
    settleQty: settleUnit
      ? Number(line.settleQty) > 0
        ? Number(line.settleQty)
        : (estimateSettleQty(
            { ...line, settleQty: undefined, purchaseQty: remaining },
            remaining,
          ) ?? undefined)
      : undefined,
    standardUnitWeight: line.standardUnitWeight,
    settledSettleQty: 0,
  }
  syncInboundLineTotalFromUnit(next)
  return next
}

function buildLinesFromPurchaseOrder(order) {
  return (order.lineItems || [])
    .filter((line) => (Number(line.purchaseQty) || 0) > 0)
    .map((line) => buildPurchaseInboundLine(line, order))
}

/** 收货单行 → 采购行匹配 */
function matchPoLineForReceiptLine(order, receiptLine) {
  const lines = order.lineItems || []
  if (receiptLine?.poLineId) {
    const hit = lines.find((l) => l.id === receiptLine.poLineId)
    if (hit) return hit
  }
  if (receiptLine?.sourceLineId) {
    const hit = lines.find((l) => l.id === receiptLine.sourceLineId)
    if (hit) return hit
  }
  const code = String(receiptLine?.itemCode || receiptLine?.productCode || '').trim()
  if (!code) return null
  return lines.find((l) => String(l.itemCode || l.productCode || '').trim() === code) || null
}

/**
 * 仅按收货单明细生成入库行（不拉整单采购明细）
 * 默认数量：min(采购可入剩余, 收货数量)
 */
function buildLinesFromPurchaseReceipt(order, receipt) {
  if (!receipt || !order) return []
  const idOk = !receipt.purchaseOrderId || receipt.purchaseOrderId === order.id
  const noOk = !receipt.purchaseOrderNo || receipt.purchaseOrderNo === order.orderNo
  if (!idOk || !noOk) return []
  const rows = []
  ;(receipt.lineItems || []).forEach((rLine) => {
    const receiptQty = Number(rLine.receiptQty) || 0
    if (receiptQty <= 0) return
    const poLine = matchPoLineForReceiptLine(order, rLine)
    if (!poLine) return
    const inbound = buildPurchaseInboundLine(poLine, order)
    const remain = Number(inbound.remainingQty) || 0
    const cap = Math.min(remain, receiptQty)
    inbound.remainingQty = cap
    inbound.qty = inbound.locked ? 0 : cap
    inbound.receiptLineId = rLine.id
    inbound.receiptQty = receiptQty
    inbound.purchaseReceiptId = receipt.id
    inbound.receiptNo = receipt.receiptNo || ''
    inbound.rowKey = `${receipt.id}__${order.id}__${poLine.id}`
    if (rLine.receivingWarehouse) inbound.warehouse = rLine.receivingWarehouse
    if (rLine.itemName || rLine.productName) {
      inbound.itemName = rLine.itemName || rLine.productName
    }
    if (rLine.specModel) inbound.specModel = rLine.specModel
    if (rLine.material) inbound.material = rLine.material
    syncInboundLineTotalFromUnit(inbound)
    rows.push(inbound)
  })
  return rows
}

function onLineQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onLineSettleQtyChange(line) {
  syncInboundLineTotalFromUnit(line)
}

function onHeaderWarehouseChange(newVal) {
  const oldVal = prevHeaderWarehouse.value
  const changed = newVal !== oldVal
  prevHeaderWarehouse.value = newVal

  if (!changed || !newVal || !inboundLines.value.length) return

  Modal.confirm({
    title: '入库仓库已修改，是否同步修改明细仓库？',
    okText: '是',
    cancelText: '否',
    onOk: () => {
      inboundLines.value.forEach((line) => {
        if (!isLineCompleted(line)) line.warehouse = newVal
      })
    },
  })
}

function removeLine(record) {
  const key = record?.rowKey
  const idx = inboundLines.value.findIndex((l) => l.rowKey === key)
  if (idx >= 0) inboundLines.value.splice(idx, 1)
}

function openLineEdit(record) {
  if (isLineCompleted(record)) return
  lineEditId.value = record.rowKey
  lineEditDraft.value = { ...record }
  lineEditOpen.value = true
}

function applyLineEdit() {
  const draft = lineEditDraft.value
  if (!draft) {
    lineEditOpen.value = false
    return
  }
  if (!draft.warehouse) {
    message.warning('请选择入库仓库')
    return
  }
  if (!(Number(draft.qty) > 0)) {
    message.warning('请填写入库数量')
    return
  }
  if (Number(draft.qty) > Number(draft.remainingQty) + 1e-9) {
    message.warning(`入库数量不能超过剩余可入库数量 ${draft.remainingQty}`)
    return
  }
  if (draft.settleUnit && !(Number(draft.settleQty) > 0)) {
    message.warning(`请填写结算数量（${draft.settleUnit}）`)
    return
  }
  const target = inboundLines.value.find((r) => r.rowKey === lineEditId.value)
  if (target) {
    Object.assign(target, {
      warehouse: draft.warehouse,
      qty: draft.qty,
      settleQty: draft.settleQty,
    })
    syncInboundLineTotalFromUnit(target)
  }
  lineEditOpen.value = false
}

function formatMoney(val) {
  return formatNumber(val, 4)
}

function handleCancel() {
  emit('update:open', false)
}

function mapSubmitLine(line) {
  return {
    poLineId: line.poLineId,
    itemCode: line.itemCode,
    itemName: line.itemName,
    itemType: line.itemType,
    specModel: line.specModel,
    specAttr: line.specAttr,
    material: line.material,
    drawingNo: line.drawingNo,
    barcodeType: line.barcodeType || '',
    variantSummary: line.variantSummary || '',
    unit: line.unit,
    stockUnit: line.unit,
    purchaseUnit: line.unit,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
    locationNo: '',
    warehouse: line.warehouse,
    qty: Number(line.qty),
    isVariableLength: false,
    settleUnit: line.settleUnit || '',
    settleQty: line.settleQty,
    standardUnitWeight: line.standardUnitWeight,
    settledSettleQty: 0,
  }
}

function handleSave() {
  if (!sourceOrders.value.length && !sourceReceipts.value.length) return
  for (const order of sourceOrders.value) {
    const block = getPendingPurchasePriceChangeBlock(order.id, '生成入库单')
    if (block) {
      message.warning(block)
      return
    }
  }
  if (!form.receiptDate) {
    message.warning('请选择收货日期')
    return
  }
  const editableLines = inboundLines.value.filter((line) => !isInboundLineCompleted(line))
  if (!editableLines.length) {
    message.warning('没有可入库的明细')
    return
  }
  const submitLines = editableLines.filter((line) => Number(line.qty) > 0)
  if (!submitLines.length) {
    message.warning('请至少填写一行入库数量')
    return
  }
  const overQcCap = submitLines.find(
    (line) => line.qcMaxQty != null && Number(line.qty) > Number(line.qcMaxQty) + 1e-9,
  )
  if (overQcCap) {
    message.warning(
      `「${overQcCap.itemName}」入库数量不可超过质检合格入库数量（${overQcCap.qcMaxQty}）`,
    )
    return
  }
  const invalidWarehouse = submitLines.find((line) => !line.warehouse)
  if (invalidWarehouse) {
    message.warning(`请为「${invalidWarehouse.itemName}」选择入库仓库`)
    return
  }
  const settleInvalid = submitLines.find(
    (line) => String(line.settleUnit || '').trim() && !(Number(line.settleQty) > 0),
  )
  if (settleInvalid) {
    message.warning(`请为「${settleInvalid.itemName}」填写结算数量（${settleInvalid.settleUnit}）`)
    return
  }

  saving.value = true
  const allCreated = []
  const errors = []
  let okCount = 0

  const linkReceipt = (receipt, createdList) => {
    if (!receipt?.id || !createdList.length) return
    const ids = [...new Set([...(receipt.inboundOrderIds || []), ...createdList.map((o) => o.id)])]
    const docNos = createdList.map((o) => o.docNo).filter(Boolean)
    const prevNos = String(receipt.inboundOrderNo || '')
      .split(/[、,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    updatePurchaseReceipt(receipt.id, {
      inboundOrderIds: ids,
      inboundOrderNo: [...new Set([...prevNos, ...docNos])].join('、') || receipt.inboundOrderNo,
      inboundStatus: '入库中',
    })
  }

  if (isReceiptSource.value) {
    const byReceipt = new Map()
    submitLines.forEach((line) => {
      const rid = line.purchaseReceiptId || sourceReceipts.value[0]?.id
      if (!rid) return
      if (!byReceipt.has(rid)) byReceipt.set(rid, [])
      byReceipt.get(rid).push(line)
    })
    for (const [receiptId, lines] of byReceipt) {
      const receipt = sourceReceipts.value.find((r) => r.id === receiptId)
      const orderId = lines[0]?.purchaseOrderId || receipt?.purchaseOrderId
      const order =
        sourceOrders.value.find((o) => o.id === orderId) || getPurchaseOrderById(orderId)
      const receiptRemark = receipt?.receiptNo ? `收货单 ${receipt.receiptNo} 生成` : ''
      const result = createInboundFromPurchaseOrder(orderId, {
        deliveryDate: form.receiptDate.format('YYYY-MM-DD'),
        invoiceNo: form.invoiceNo?.trim(),
        remark:
          form.remark?.trim() ||
          receiptRemark ||
          (order?.orderNo ? `采购单 ${order.orderNo} 生成` : ''),
        warehouse: form.warehouse || '',
        purchaseReceiptId: receiptId,
        lineItems: lines.map(mapSubmitLine),
      })
      if (result.ok) {
        okCount += 1
        const created = result.orders?.length ? result.orders : result.order ? [result.order] : []
        const tagged = created.map((o) => ({ ...o, purchaseReceiptId: receiptId }))
        allCreated.push(...tagged)
        linkReceipt(receipt, tagged)
      } else {
        errors.push(result.message || `收货单「${receipt?.receiptNo || receiptId}」生成失败`)
      }
    }
  } else {
    const byOrder = new Map()
    submitLines.forEach((line) => {
      const oid = line.purchaseOrderId
      if (!byOrder.has(oid)) byOrder.set(oid, [])
      byOrder.get(oid).push(line)
    })
    for (const [orderId, lines] of byOrder) {
      const order = sourceOrders.value.find((o) => o.id === orderId)
      const result = createInboundFromPurchaseOrder(orderId, {
        deliveryDate: form.receiptDate.format('YYYY-MM-DD'),
        invoiceNo: form.invoiceNo?.trim(),
        remark: form.remark?.trim() || (order?.orderNo ? `采购单 ${order.orderNo} 生成` : ''),
        warehouse: form.warehouse || '',
        purchaseReceiptId: '',
        lineItems: lines.map(mapSubmitLine),
      })
      if (result.ok) {
        okCount += 1
        const created = result.orders?.length ? result.orders : result.order ? [result.order] : []
        allCreated.push(...created)
      } else {
        errors.push(result.message || `采购单「${order?.orderNo || orderId}」生成失败`)
      }
    }
  }
  saving.value = false

  if (okCount) {
    const nos = allCreated
      .map((o) => o.docNo)
      .filter(Boolean)
      .join('、')
    message.success(
      nos ? `已创建 ${allCreated.length} 张入库单：${nos}` : `已创建 ${okCount} 张入库单`,
    )
    emit('saved', allCreated[0] || null, allCreated)
    emit('update:open', false)
  }
  if (errors.length) {
    const preview = errors.slice(0, 3).join('；')
    message.warning(errors.length > 3 ? `${preview}…等 ${errors.length} 条失败` : preview)
  }
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 16px;
}

.qc-qty-hint-alert {
  margin-bottom: 12px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.section-hint {
  font-weight: 400;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.qc-result-head,
.source-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-form {
  margin-bottom: 0;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
      align-self: flex-start;
    }
  }
}

.item-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-title-required .required-star {
  color: #ff4d4f;
  margin-right: 2px;
  font-family: SimSun, sans-serif;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}

.line-summary {
  margin-top: 10px;
  text-align: right;
  font-size: 13px;
  color: #595959;

  strong {
    color: #1677ff;
    font-size: 15px;
    margin-left: 4px;
  }
}

.locked-tip {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.qty-with-unit {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.unit-suffix {
  flex-shrink: 0;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

:deep(.inbound-row-locked) {
  color: rgba(0, 0, 0, 0.45);
  background: #fafafa;
}

.edit-form {
  :deep(.ant-form-item) {
    margin-bottom: 12px;
  }
}

.item-preview {
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}

.preview-row {
  display: flex;
  gap: 8px;
  font-size: 13px;
  min-height: 22px;
}

.preview-label {
  flex: 0 0 64px;
  color: rgba(0, 0, 0, 0.45);
}

.preview-value {
  flex: 1;
  min-width: 0;
  word-break: break-all;
}
</style>
