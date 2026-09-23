<template>
  <a-modal
    :open="open"
    title="生成质检单"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    :confirm-loading="saving"
    ok-text="确认"
    cancel-text="取消"
    class="generate-incoming-qc-modal"
    wrap-class-name="generate-incoming-qc-modal-wrap"
    :style="{ top: '24px' }"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <div class="section-block modal-basic-card">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="basic-form header-form horizontal-form">
        <a-row :gutter="[12, 12]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="质检类型">
              <a-input :value="qcTypeLabel" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="质检单号">
              <a-input
                v-model:value="form.qcNo"
                allow-clear
                size="small"
                placeholder="留空则自动生成"
                :maxlength="40"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货单号">
              <a-input :value="receiptNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="200"
                show-count
                placeholder="选填"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div v-if="showQcResultSection" class="section-block modal-basic-card">
      <div class="section-title qc-result-head">
        <span>
          质检结果 ({{ qcResultRows.length }})
          <span class="section-hint"
            >一个产品一行；可对照处理方案中的合格/让步数量填写下方送检数量</span
          >
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
          <template v-else-if="column.key === 'inspectQty'">
            {{
              record[column.key] === '' || record[column.key] == null
                ? '—'
                : formatQty(record[column.key])
            }}
          </template>
          <template v-else-if="column.key === 'treatmentPlan'">
            {{ record.treatmentPlan || '—' }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? record[column.key] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <div class="section-block modal-basic-card">
      <div class="section-title">质检清单（{{ lines.length }}）</div>
      <a-table
        :columns="columns"
        :data-source="lines"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1340 }"
        :locale="{ emptyText: '暂无明细，请从收货单重新打开' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'productName'">
            {{ record.productName || record.itemName || '—' }}
          </template>
          <template v-else-if="column.key === 'productCode'">
            {{ record.productCode || record.itemCode || '—' }}
          </template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatQtyWithUnit(record.purchaseQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'receiptQty'">
            {{ formatQtyWithUnit(record.receiptQty, record.unit) }}
          </template>
          <template v-else-if="column.key === 'inspectQty'">
            <div class="qty-with-unit">
              <a-input-number
                v-model:value="record.inspectQty"
                size="small"
                :min="0"
                :max="Number(record.receiptQty) || undefined"
                :precision="3"
                style="flex: 1; min-width: 0"
              />
              <span class="unit-suffix">{{ record.unit || '' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'warehouse'">
            {{ record.receivingWarehouse || record.warehouse || '—' }}
          </template>
          <template v-else-if="column.key === 'inboundQcRequirement'">
            <a-select
              v-model:value="record.inboundQcRequirement"
              size="small"
              style="width: 100%"
              placeholder="请选择"
              allow-clear
              :options="inboundQcOpts"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="link"
              size="small"
              danger
              :disabled="lines.length <= 1"
              @click="removeLine(record.id)"
            >
              移出本单
            </a-button>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
          </template>
        </template>
      </a-table>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { createInboundQcFromReceipt, listQcTasks, QC_TASK_STATUS } from '@/store/qcTaskStore'
import { QC_TASK_RESULT } from '@/constants/qcTaskResult'
import {
  attachReceiptQcSheet as attachPurchaseReceiptQcSheet,
  updatePurchaseReceipt,
} from '@/store/purchaseReceiptStore'
import {
  attachReceiptQcSheet as attachOutsourcingReceiptQcSheet,
  updateOutsourcingReceipt,
} from '@/store/outsourcingReceiptStore'
import { inboundQcOptions } from '@/mock/materialInfoOptions'
import { resolveEditableInboundQcRequirement } from '@/utils/inboundQcRequirement'
import { canStartReceiptQc } from '@/utils/qcInboundFromReceipt'
import { calcReceiptLineConfirmedInboundQty } from '@/utils/purchaseReceiptSettle'
import {
  listQcProductResultLinesForReceipt,
  listQcProductResultLinesForOutsourcingReceipt,
} from '@/utils/purchaseOrderQc'

const props = defineProps({
  open: { type: Boolean, default: false },
  receipt: { type: Object, default: null },
  /** 来料质检 | 外协回货检 */
  bizScope: { type: String, default: '来料质检' },
})

const emit = defineEmits(['update:open', 'saved'])

const saving = ref(false)
const lines = ref([])
const qcResultExpanded = ref(true)
const form = reactive({
  qcNo: '',
  remark: '',
})

const isOutsourcing = computed(() => props.bizScope === '外协回货检')
const qcTypeLabel = computed(() => (isOutsourcing.value ? '外协回货检' : '来料质检'))
const receiptNo = computed(() => props.receipt?.receiptNo || '—')
const inboundQcOpts = inboundQcOptions.map((v) => ({ label: v, value: v }))

const qcResultRows = computed(() => {
  if (!props.receipt) return []
  return isOutsourcing.value
    ? listQcProductResultLinesForOutsourcingReceipt(props.receipt)
    : listQcProductResultLinesForReceipt(props.receipt)
})
const showQcResultSection = computed(() => qcResultRows.value.length > 0)

const qcResultColumns = [
  { title: '质检单号', dataIndex: 'qcNo', key: 'qcNo', width: 150, ellipsis: true },
  { title: '质检状态', key: 'qcStatus', width: 90 },
  { title: '质检结果', key: 'qcResult', width: 100 },
  { title: '产品信息', key: 'productInfo', width: 280, ellipsis: true },
  { title: '质检方式', dataIndex: 'inspectMethod', key: 'inspectMethod', width: 90 },
  { title: '质检数量', key: 'inspectQty', width: 90, align: 'right' },
  { title: '处理方案', key: 'treatmentPlan', width: 260, ellipsis: true },
]

const columns = computed(() => [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '产品名称', key: 'productName', width: 140, ellipsis: true },
  { title: '产品编号', key: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 140, ellipsis: true },
  {
    title: isOutsourcing.value ? '计划数量' : '采购数量',
    key: 'purchaseQty',
    width: 110,
    align: 'right',
  },
  { title: '收货数量', key: 'receiptQty', width: 110, align: 'right' },
  { title: '送检数量', key: 'inspectQty', width: 130 },
  { title: '收货仓库', key: 'warehouse', width: 110, ellipsis: true },
  { title: '入库质检要求', key: 'inboundQcRequirement', width: 120 },
  { title: '操作', key: 'action', width: 96, fixed: 'right', align: 'center' },
])

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function matchQcLineToReceiptLine(qcLine, receiptLine) {
  if (!qcLine || !receiptLine) return false
  if (
    qcLine.sourceLineId &&
    receiptLine.id &&
    String(qcLine.sourceLineId) === String(receiptLine.id)
  ) {
    return true
  }
  const codeA = String(receiptLine.itemCode || receiptLine.productCode || '').trim()
  const codeB = String(qcLine.itemCode || qcLine.productCode || '').trim()
  return Boolean(codeA && codeB && codeA === codeB)
}

/** 该收货行已确认入库数量 */
function resolveLineInboundQty(receipt, line) {
  if (!receipt || !line) return 0
  const fromOrders = calcReceiptLineConfirmedInboundQty(receipt, line)
  if (fromOrders > 0) return round4(fromOrders)
  return round4(Number(line.inboundedQty) || 0)
}

/** 该收货行历史质检「合格入库数」合计（已完成） */
function resolveLineAcceptInboundQty(receipt, line) {
  if (!receipt || !line) return 0
  const bizScope = props.bizScope || '来料质检'
  const byId = listQcTasks({ sourceDocId: receipt.id, bizScope })
  const no = String(receipt.receiptNo || '').trim()
  const byNo = no
    ? listQcTasks({ bizScope }).filter((t) => String(t.sourceDocNo || '').trim() === no)
    : []
  const map = new Map()
  ;[...byId, ...byNo].forEach((t) => {
    if (!t?.id || t.qcStatus === QC_TASK_STATUS.CANCELLED) return
    if (t.qcStatus !== QC_TASK_STATUS.COMPLETED) return
    map.set(t.id, t)
  })
  let total = 0
  ;[...map.values()].forEach((task) => {
    ;(task.lineItems || []).forEach((ql) => {
      if (!matchQcLineToReceiptLine(ql, line)) return
      const a = Number(ql.acceptInboundQty) || 0
      const c = Number(ql.concessionQty) || 0
      if (a <= 0 && c <= 0) return
      total += a + c
    })
  })
  return round4(total)
}

/**
 * 送检默认：收货数量 - 入库数量；无入库数量时用 收货数量 - 合格入库数量
 */
function resolveDefaultInspectQty(receipt, line) {
  const receiptQty = round4(Number(line.receiptQty ?? line.qty) || 0)
  const inboundQty = resolveLineInboundQty(receipt, line)
  if (inboundQty > 0) {
    return Math.max(0, round4(receiptQty - inboundQty))
  }
  const acceptQty = resolveLineAcceptInboundQty(receipt, line)
  return Math.max(0, round4(receiptQty - acceptQty))
}

function cloneLines(receipt) {
  return (receipt?.lineItems || [])
    .filter((l) => (Number(l.receiptQty) || Number(l.qty) || 0) > 0)
    .map((l) => {
      const receiptQty = Number(l.receiptQty ?? l.qty) || 0
      return {
        ...l,
        id: l.id,
        productName: l.productName || l.itemName || '',
        productCode: l.productCode || l.itemCode || '',
        itemName: l.itemName || l.productName || '',
        itemCode: l.itemCode || l.productCode || '',
        specModel: l.specModel || '',
        material: l.material || l.materialGrade || '',
        variantSummary: l.variantSummary || '',
        unit: l.unit || '件',
        purchaseQty: l.purchaseQty ?? l.planQty,
        receiptQty,
        inspectQty: resolveDefaultInspectQty(receipt, l),
        receivingWarehouse: l.receivingWarehouse || l.warehouse || '',
        inboundQcRequirement: resolveEditableInboundQcRequirement(l),
      }
    })
    .filter((l) => Number(l.inspectQty) > 0 || Number(l.receiptQty) > 0)
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return String(val)
  return String(Number(n.toFixed(4)))
}

function formatQtyWithUnit(qty, unit) {
  const q = formatQty(qty)
  if (q === '—') return '—'
  return unit ? `${q} ${unit}` : q
}

function formatQcProductInfo(record = {}) {
  const parts = [
    record.itemCode,
    record.itemName && record.itemName !== '—' ? record.itemName : '',
    record.specModel,
    record.material,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
  return parts.join('/') || record.productInfo || '—'
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

function qcResultColor(result) {
  if (result === QC_TASK_RESULT.PASS || result === '合格') return 'success'
  if (result === QC_TASK_RESULT.PARTIAL || result === '部分合格') return 'processing'
  if (result === QC_TASK_RESULT.FAIL || result === '不合格') return 'error'
  return 'default'
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function removeLine(id) {
  if (lines.value.length <= 1) {
    message.warning('质检清单至少保留一行')
    return
  }
  lines.value = lines.value.filter((l) => l.id !== id)
}

function resetForm() {
  form.qcNo = ''
  form.remark = ''
  qcResultExpanded.value = true
  lines.value = cloneLines(props.receipt)
}

watch(
  () => [props.open, props.receipt?.id],
  ([visible]) => {
    if (!visible) return
    resetForm()
  },
)

function handleCancel() {
  emit('update:open', false)
}

function syncReceiptLineQcRequirement() {
  const receipt = props.receipt
  if (!receipt?.id) return
  const byId = new Map(lines.value.map((l) => [String(l.id), l.inboundQcRequirement]))
  const nextLines = (receipt.lineItems || []).map((l) => {
    if (!byId.has(String(l.id))) return l
    return { ...l, inboundQcRequirement: byId.get(String(l.id)) || '' }
  })
  if (isOutsourcing.value) {
    updateOutsourcingReceipt(receipt.id, { lineItems: nextLines })
  } else {
    updatePurchaseReceipt(receipt.id, { lineItems: nextLines })
  }
}

async function handleOk() {
  if (!props.receipt) {
    message.warning('未找到收货单')
    return Promise.reject()
  }
  if (!canStartReceiptQc(props.receipt)) {
    const st = String(props.receipt.qcStatus || '').trim()
    if (st === '质检中' || st === '待质检') {
      message.warning('该收货单已有进行中的质检单')
    } else {
      message.warning('当前收货单不可生成质检单（仅未质检或质检不通过可发起）')
    }
    return Promise.reject()
  }
  if (!lines.value.length) {
    message.warning('请至少保留一行质检清单')
    return Promise.reject()
  }
  const badInspect = lines.value.find((l) => !(Number(l.inspectQty) > 0))
  if (badInspect) {
    message.warning(
      `请填写「${badInspect.itemName || badInspect.productName || badInspect.itemCode}」的送检数量`,
    )
    return Promise.reject()
  }
  const overReceipt = lines.value.find((l) => Number(l.inspectQty) > Number(l.receiptQty) + 1e-9)
  if (overReceipt) {
    message.warning(
      `「${overReceipt.itemName || overReceipt.productName || overReceipt.itemCode}」送检数量不能超过收货数量`,
    )
    return Promise.reject()
  }

  saving.value = true
  try {
    const res = createInboundQcFromReceipt({
      receipt: {
        ...props.receipt,
        lineItems: lines.value,
      },
      lineIds: lines.value.map((l) => l.id),
      qcNo: form.qcNo,
      remark: form.remark,
      bizScope: props.bizScope,
      sourceType: isOutsourcing.value ? 'outsourcing_receipt' : 'purchase_receipt',
    })

    if (!res.ok) {
      message.warning(res.message || '生成失败')
      return Promise.reject()
    }

    syncReceiptLineQcRequirement()

    const attach = isOutsourcing.value
      ? attachOutsourcingReceiptQcSheet
      : attachPurchaseReceiptQcSheet
    attach(props.receipt.id, {
      qcNo: res.task.qcNo,
      qcStatus: '质检中',
    })
    message.success(`已生成质检单 ${res.task.qcNo}`)
    emit('saved', res.task)
    emit('update:open', false)
  } catch (err) {
    console.error(err)
    message.error(err?.message || '生成质检单失败，请重试')
    return Promise.reject(err)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.qc-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.section-hint {
  margin-left: 8px;
  font-weight: 400;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.basic-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.remark-item) {
    width: 100%;

    .ant-form-item-control {
      flex: 1;
      max-width: none;
    }

    .ant-form-item-control-input,
    .ant-form-item-control-input-content {
      width: 100%;
    }

    textarea {
      width: 100%;
    }
  }
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
</style>

<style lang="less">
.generate-incoming-qc-modal-wrap {
  .ant-modal {
    max-width: 1440px;
  }

  .ant-modal-body {
    max-height: calc(100vh - 160px);
    overflow-y: auto;
  }
}
</style>
