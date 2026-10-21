<template>
  <a-modal
    v-model:open="visible"
    :title="`合同变更 · ${form.changeNo || ''}`"
    width="960px"
    destroy-on-close
    :mask-closable="false"
    @cancel="handleCancel"
  >
    <a-alert
      type="info"
      show-icon
      class="mb-12"
      :message="`合同 ${form.contractNo}（${form.contractType}）· ${form.customerName}`"
    />
    <a-form layout="vertical">
      <a-form-item label="变更原因" required>
        <a-textarea v-model:value="form.reason" :rows="2" placeholder="说明本次变更原因" />
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="合同名称">
            <a-input v-model:value="form.after.contractName" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="有效期起">
            <a-date-picker v-model:value="form.validFrom" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="有效期止">
            <a-date-picker v-model:value="form.validTo" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="结算周期">
            <a-select
              v-model:value="form.after.settlementCycle"
              allow-clear
              :options="settlementCycleOptions"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="账期起算">
            <a-select
              v-model:value="form.after.paymentTermStart"
              allow-clear
              :options="paymentTermStartOptions"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="账期天数">
            <a-input-number
              v-model:value="form.after.paymentTermDays"
              :min="0"
              :precision="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="额度金额">
            <a-input-number
              v-model:value="form.after.limitAmount"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="额度数量">
            <a-input-number
              v-model:value="form.after.limitQty"
              :min="0"
              :precision="3"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="超额度">
            <a-checkbox v-model:checked="form.after.allowExceedQuota">
              允许订单超过剩余额度
            </a-checkbox>
          </a-form-item>
        </a-col>
        <a-col v-if="isFramework" :span="8">
          <a-form-item label="默认折扣率(%)">
            <a-input-number
              v-model:value="form.defaultDiscountPercent"
              :min="1"
              :max="100"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.after.remark" :rows="2" />
          </a-form-item>
        </a-col>
      </a-row>

      <template v-if="isFramework">
        <div class="section-title">产品协议价（变更后）</div>
        <a-table
          :columns="priceColumns"
          :data-source="form.after.priceItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'productCode'">
              <a-input v-model:value="record.productCode" size="small" />
            </template>
            <template v-else-if="column.key === 'discount'">
              <a-input-number
                v-model:value="record.agreementDiscountPercent"
                size="small"
                :min="1"
                :max="100"
                :precision="2"
                style="width: 100%"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                @click="form.after.priceItems.splice(index, 1)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block class="add-btn" @click="addPriceRow">+ 添加协议价</a-button>
      </template>

      <template v-else>
        <div class="section-title">合同明细（变更后）</div>
        <a-table
          :columns="lineColumns"
          :data-source="form.after.lineItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'productCode'">
              <a-input v-model:value="record.productCode" size="small" />
            </template>
            <template v-else-if="column.key === 'productName'">
              <a-input v-model:value="record.productName" size="small" />
            </template>
            <template v-else-if="column.key === 'qty'">
              <a-input-number
                v-model:value="record.qty"
                size="small"
                :min="0"
                :precision="3"
                style="width: 100%"
                @change="() => syncLineAmount(record)"
              />
            </template>
            <template v-else-if="column.key === 'unitPriceExTax'">
              <a-input-number
                v-model:value="record.unitPriceExTax"
                size="small"
                :min="0"
                :precision="2"
                style="width: 100%"
                @change="() => syncLineAmount(record)"
              />
            </template>
            <template v-else-if="column.key === 'amountExTax'">
              {{ record.amountExTax ?? '—' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                @click="form.after.lineItems.splice(index, 1)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block class="add-btn" @click="addLineRow">+ 添加明细</a-button>
      </template>

      <div class="section-title">回款节点（变更后）</div>
      <a-table
        :columns="nodeColumns"
        :data-source="form.after.paymentNodes"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'name'">
            <a-input v-model:value="record.name" size="small" />
          </template>
          <template v-else-if="column.key === 'ratio'">
            <a-input-number
              :value="record.ratio != null ? Number((record.ratio * 100).toFixed(2)) : null"
              size="small"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
              @update:value="(v) => (record.ratio = v != null ? v / 100 : null)"
            />
          </template>
          <template v-else-if="column.key === 'amount'">
            <a-input-number
              v-model:value="record.amount"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              type="link"
              size="small"
              danger
              @click="form.after.paymentNodes.splice(index, 1)"
            >
              删除
            </a-button>
          </template>
        </template>
      </a-table>
      <a-button type="dashed" block class="add-btn" @click="addNodeRow">+ 添加节点</a-button>

      <div class="section-title">变更对比</div>
      <a-table
        :columns="diffColumns"
        :data-source="diffRows"
        row-key="field"
        size="small"
        bordered
        :pagination="false"
      >
        <template #emptyText>
          <a-empty :image="false" description="暂无字段变更" />
        </template>
      </a-table>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button @click="handleSave(false)">保存草稿</a-button>
      <a-button type="primary" @click="handleSave(true)">保存并提交审核</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { CONTRACT_TYPE } from '@/constants/salesContract'
import { paymentTermStartOptions, settlementCycleOptions } from '@/constants/customerMaster'
import {
  diffContractSnapshots,
  formatContractChangeDiffRows,
  submitContractChange,
  updateContractChange,
} from '@/store/salesContractChangeStore'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (v) => emit('update:open', v),
})

const isFramework = computed(() => form.contractType === CONTRACT_TYPE.FRAMEWORK)

const form = reactive({
  id: '',
  changeNo: '',
  contractNo: '',
  contractType: '',
  customerName: '',
  reason: '',
  validFrom: null,
  validTo: null,
  defaultDiscountPercent: 100,
  after: {
    contractName: '',
    settlementCycle: undefined,
    paymentTermStart: undefined,
    paymentTermDays: undefined,
    limitAmount: null,
    limitQty: null,
    allowExceedQuota: true,
    remark: '',
    priceItems: [],
    lineItems: [],
    paymentNodes: [],
    attachments: [],
  },
  before: {},
})

const priceColumns = [
  { title: '产品编码', key: 'productCode' },
  { title: '协议折扣(%)', key: 'discount', width: 130 },
  { title: '操作', key: 'action', width: 70 },
]
const lineColumns = [
  { title: '产品编码', key: 'productCode', width: 120 },
  { title: '名称', key: 'productName', width: 140 },
  { title: '数量', key: 'qty', width: 90 },
  { title: '单价', key: 'unitPriceExTax', width: 110 },
  { title: '金额', key: 'amountExTax', width: 100 },
  { title: '操作', key: 'action', width: 70 },
]
const nodeColumns = [
  { title: '节点', key: 'name', width: 120 },
  { title: '比例(%)', key: 'ratio', width: 110 },
  { title: '金额', key: 'amount', width: 110 },
  { title: '操作', key: 'action', width: 70 },
]
const diffColumns = [
  { title: '字段', dataIndex: 'label', width: 120 },
  { title: '变更前', dataIndex: 'beforeText' },
  { title: '变更后', dataIndex: 'afterText' },
]

const currentAfterSnapshot = computed(() => buildAfterSnapshot())

const diffRows = computed(() =>
  formatContractChangeDiffRows(diffContractSnapshots(form.before, currentAfterSnapshot.value)),
)

function syncLineAmount(line) {
  line.amountExTax =
    Math.round((Number(line.qty) || 0) * (Number(line.unitPriceExTax) || 0) * 100) / 100
}

function addPriceRow() {
  form.after.priceItems.push({
    id: `fci-${Date.now()}`,
    productCode: '',
    agreementDiscountPercent: null,
  })
}

function addLineRow() {
  form.after.lineItems.push({
    id: `sci-${Date.now()}`,
    productCode: '',
    productName: '',
    qty: 1,
    unit: '台',
    unitPriceExTax: null,
    amountExTax: null,
    deliveryDate: '',
  })
}

function addNodeRow() {
  form.after.paymentNodes.push({
    id: `cpn-${Date.now()}`,
    name: '',
    ratio: null,
    amount: null,
  })
}

function buildAfterSnapshot() {
  return {
    contractName: form.after.contractName || '',
    validFrom: form.validFrom ? form.validFrom.format('YYYY-MM-DD') : '',
    validTo: form.validTo ? form.validTo.format('YYYY-MM-DD') : '',
    settlementCycle: form.after.settlementCycle || '',
    paymentTermStart: form.after.paymentTermStart || '',
    paymentTermDays:
      form.after.paymentTermDays != null && form.after.paymentTermDays !== ''
        ? Number(form.after.paymentTermDays)
        : null,
    limitAmount:
      form.after.limitAmount != null && form.after.limitAmount !== ''
        ? Number(form.after.limitAmount)
        : null,
    limitQty:
      form.after.limitQty != null && form.after.limitQty !== ''
        ? Number(form.after.limitQty)
        : null,
    allowExceedQuota: form.after.allowExceedQuota !== false,
    defaultDiscountRate: normalizeDiscountRate(form.defaultDiscountPercent / 100, 1),
    remark: form.after.remark || '',
    attachments: form.after.attachments || [],
    priceItems: (form.after.priceItems || [])
      .filter((item) => item.productCode?.trim())
      .map((item) => ({
        id: item.id,
        productCode: item.productCode.trim(),
        productId: item.productId || '',
        agreementDiscountRate:
          item.agreementDiscountPercent != null
            ? normalizeDiscountRate(item.agreementDiscountPercent / 100, 1)
            : undefined,
      })),
    lineItems: (form.after.lineItems || [])
      .filter((item) => item.productCode?.trim() || item.productName?.trim())
      .map((item) => {
        syncLineAmount(item)
        return {
          id: item.id,
          productCode: item.productCode?.trim() || '',
          productName: item.productName?.trim() || '',
          qty: Number(item.qty) || 0,
          unit: item.unit || '',
          unitPriceExTax: item.unitPriceExTax,
          amountExTax: item.amountExTax,
          deliveryDate: item.deliveryDate || '',
        }
      }),
    paymentNodes: (form.after.paymentNodes || [])
      .filter((item) => item.name?.trim())
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        ratio: item.ratio,
        amount: item.amount,
      })),
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open || !props.record) return
    const r = props.record
    const after = JSON.parse(JSON.stringify(r.afterSnapshot || {}))
    form.id = r.id
    form.changeNo = r.changeNo
    form.contractNo = r.contractNo
    form.contractType = r.contractType
    form.customerName = r.customerName
    form.reason = r.reason || ''
    form.before = JSON.parse(JSON.stringify(r.beforeSnapshot || {}))
    form.validFrom = after.validFrom ? dayjs(after.validFrom) : null
    form.validTo = after.validTo ? dayjs(after.validTo) : null
    form.defaultDiscountPercent = after.defaultDiscountRate
      ? Number((after.defaultDiscountRate * 100).toFixed(2))
      : 100
    form.after.contractName = after.contractName || ''
    form.after.settlementCycle = after.settlementCycle || undefined
    form.after.paymentTermStart = after.paymentTermStart || undefined
    form.after.paymentTermDays = after.paymentTermDays ?? undefined
    form.after.limitAmount = after.limitAmount ?? null
    form.after.limitQty = after.limitQty ?? null
    form.after.allowExceedQuota = after.allowExceedQuota !== false
    form.after.remark = after.remark || ''
    form.after.attachments = after.attachments || []
    form.after.priceItems = (after.priceItems || []).map((item) => ({
      ...item,
      agreementDiscountPercent:
        item.agreementDiscountRate != null
          ? Number((normalizeDiscountRate(item.agreementDiscountRate) * 100).toFixed(2))
          : null,
    }))
    form.after.lineItems = (after.lineItems || []).map((item) => ({ ...item }))
    form.after.paymentNodes = (after.paymentNodes || []).map((item) => ({ ...item }))
  },
)

function handleCancel() {
  emit('update:open', false)
}

function handleSave(submit) {
  if (!form.reason?.trim()) {
    message.warning('请填写变更原因')
    return
  }
  const afterSnapshot = buildAfterSnapshot()
  const diffs = diffContractSnapshots(form.before, afterSnapshot)
  if (!diffs.length) {
    message.warning('未发生任何变更')
    return
  }
  const res = updateContractChange(form.id, {
    reason: form.reason.trim(),
    afterSnapshot,
  })
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  if (submit) {
    const sub = submitContractChange(form.id)
    if (!sub.ok) {
      message.warning(sub.message)
      return
    }
    message.success('变更单已提交审核')
  } else {
    message.success('变更草稿已保存')
  }
  emit('saved', res.data)
  emit('update:open', false)
}
</script>

<style scoped>
.mb-12 {
  margin-bottom: 12px;
}
.section-title {
  margin: 12px 0 8px;
  font-weight: 500;
}
.add-btn {
  margin: 8px 0 12px;
}
</style>
