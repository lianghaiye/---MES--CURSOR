<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="920px"
    :mask-closable="false"
    destroy-on-close
    class="contract-form-shell"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <a-form layout="vertical" class="contract-form">
      <div class="section-block">
        <div class="section-title">基本信息</div>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="合同类型" required>
              <a-select
                v-model:value="form.contractType"
                :options="contractTypeOptions"
                :disabled="isEdit"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="合同编号" required>
              <a-input v-model:value="form.contractNo" placeholder="请输入合同编号" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="合同名称">
              <a-input v-model:value="form.contractName" placeholder="请输入合同名称" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="客户名称" required>
              <a-select
                v-model:value="form.customerName"
                show-search
                :options="customerOpts"
                placeholder="请选择客户"
                @change="onCustomerChange"
              />
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
                v-model:value="form.settlementCycle"
                allow-clear
                :options="settlementCycleOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="账期起算">
              <a-select
                v-model:value="form.paymentTermStart"
                allow-clear
                :options="paymentTermStartOptions"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="账期天数">
              <a-input-number
                v-model:value="form.paymentTermDays"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="额度金额">
              <a-input-number
                v-model:value="form.limitAmount"
                :min="0"
                :precision="2"
                style="width: 100%"
                placeholder="合同金额上限"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="额度数量">
              <a-input-number
                v-model:value="form.limitQty"
                :min="0"
                :precision="3"
                style="width: 100%"
                placeholder="可选"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="超额度">
              <a-checkbox v-model:checked="form.allowExceedQuota">允许订单超过剩余额度</a-checkbox>
              <div class="field-tip">仅展示与预警，不拦截下单</div>
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
              <a-textarea v-model:value="form.remark" :rows="2" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="合同扫描件">
              <a-upload :file-list="fileList" :before-upload="beforeUpload" @remove="onRemoveFile">
                <a-button size="small">上传附件</a-button>
              </a-upload>
              <div class="field-tip">演示环境仅记录文件名，不上传服务器</div>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <div v-if="isFramework" class="section-block">
        <div class="section-title">产品协议价</div>
        <a-table
          :columns="priceColumns"
          :data-source="form.priceItems"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'productCode'">
              <a-input v-model:value="record.productCode" size="small" />
            </template>
            <template v-else-if="column.key === 'agreementDiscountPercent'">
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
              <a-button type="link" size="small" danger @click="form.priceItems.splice(index, 1)">
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block class="add-row-btn" @click="addPriceRow">
          + 添加协议价
        </a-button>
      </div>

      <div v-else class="section-block">
        <div class="section-title">合同明细</div>
        <a-table
          :columns="lineColumns"
          :data-source="form.lineItems"
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
            <template v-else-if="column.key === 'unit'">
              <a-input v-model:value="record.unit" size="small" />
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
              {{ formatMoney(record.amountExTax) }}
            </template>
            <template v-else-if="column.key === 'deliveryDate'">
              <a-date-picker
                :value="record.deliveryDate ? dayjs(record.deliveryDate) : null"
                size="small"
                style="width: 100%"
                @change="(d) => (record.deliveryDate = d ? d.format('YYYY-MM-DD') : '')"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="form.lineItems.splice(index, 1)">
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block class="add-row-btn" @click="addLineRow">+ 添加明细</a-button>
      </div>

      <div class="section-block">
        <div class="section-title">回款节点</div>
        <a-table
          :columns="nodeColumns"
          :data-source="form.paymentNodes"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'name'">
              <a-input v-model:value="record.name" size="small" />
            </template>
            <template v-else-if="column.key === 'ratioPercent'">
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
                placeholder="可填金额"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="form.paymentNodes.splice(index, 1)">
                删除
              </a-button>
            </template>
          </template>
        </a-table>
        <a-button type="dashed" block class="add-row-btn" @click="addPaymentNode">
          + 添加节点
        </a-button>
      </div>
    </a-form>

    <template #footer>
      <a-button :size="pageMode ? 'small' : 'middle'" @click="handleCancel">取消</a-button>
      <a-button :size="pageMode ? 'small' : 'middle'" @click="handleSave(false)">保存草稿</a-button>
      <a-button type="primary" :size="pageMode ? 'small' : 'middle'" @click="handleSave(true)">
        保存并生效
      </a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { getCustomerByName, getCustomerOptions } from '@/store/customerStore'
import {
  addSalesContract,
  createDefaultPaymentNodes,
  updateSalesContract,
} from '@/store/salesContractStore'
import { CONTRACT_STATUS, CONTRACT_TYPE, contractTypeOptions } from '@/constants/salesContract'
import { paymentTermStartOptions, settlementCycleOptions } from '@/constants/customerMaster'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/sales/contracts' },
  record: { type: Object, default: null },
  defaultType: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))
const isFramework = computed(() => form.contractType === CONTRACT_TYPE.FRAMEWORK)

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => {
    if (isEdit.value) return '编辑合同'
    return form.contractType === CONTRACT_TYPE.STANDARD ? '新增标准合同' : '新增框架合同'
  },
})

const customerOpts = computed(() =>
  getCustomerOptions().map((c) => ({ label: c.label, value: c.value })),
)

const priceColumns = [
  { title: '产品编码', key: 'productCode' },
  { title: '协议折扣(%)', key: 'agreementDiscountPercent', width: 130 },
  { title: '操作', key: 'action', width: 80 },
]

const lineColumns = [
  { title: '产品编码', key: 'productCode', width: 120 },
  { title: '产品名称', key: 'productName', width: 160 },
  { title: '数量', key: 'qty', width: 90 },
  { title: '单位', key: 'unit', width: 70 },
  { title: '单价(不含税)', key: 'unitPriceExTax', width: 120 },
  { title: '金额', key: 'amountExTax', width: 100 },
  { title: '交期', key: 'deliveryDate', width: 140 },
  { title: '操作', key: 'action', width: 70 },
]

const nodeColumns = [
  { title: '节点名称', key: 'name', width: 140 },
  { title: '比例(%)', key: 'ratioPercent', width: 110 },
  { title: '金额', key: 'amount', width: 120 },
  { title: '操作', key: 'action', width: 70 },
]

const form = reactive({
  contractType: CONTRACT_TYPE.FRAMEWORK,
  contractNo: '',
  contractName: '',
  customerName: undefined,
  defaultDiscountPercent: 100,
  settlementCycle: undefined,
  paymentTermStart: undefined,
  paymentTermDays: undefined,
  validFrom: null,
  validTo: null,
  limitAmount: null,
  limitQty: null,
  allowExceedQuota: true,
  remark: '',
  priceItems: [],
  lineItems: [],
  paymentNodes: [],
  attachments: [],
})

const fileList = computed(() =>
  (form.attachments || []).map((f, i) => ({
    uid: f.id || `att-${i}`,
    name: f.name,
    status: 'done',
  })),
)

function formatMoney(val) {
  if (val == null || val === '') return '—'
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function syncLineAmount(line) {
  const qty = Number(line.qty) || 0
  const price = Number(line.unitPriceExTax) || 0
  line.amountExTax = Math.round(qty * price * 100) / 100
}

function applyCustomerTerms(name, { force = false } = {}) {
  const customer = getCustomerByName(name)
  if (!customer) return
  if (force || !form.settlementCycle) form.settlementCycle = customer.settlementCycle || undefined
  if (force || !form.paymentTermStart)
    form.paymentTermStart = customer.paymentTermStart || undefined
  if (force || form.paymentTermDays == null || form.paymentTermDays === '') {
    form.paymentTermDays =
      customer.paymentTermDays != null && customer.paymentTermDays !== ''
        ? Number(customer.paymentTermDays)
        : undefined
  }
}

function onCustomerChange(name) {
  applyCustomerTerms(name, { force: true })
}

function addPriceRow() {
  form.priceItems.push({
    id: `fci-${Date.now()}`,
    productCode: '',
    productId: '',
    agreementDiscountPercent: null,
  })
}

function addLineRow() {
  form.lineItems.push({
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

function addPaymentNode() {
  form.paymentNodes.push({
    id: `cpn-${Date.now()}`,
    name: '',
    ratio: null,
    amount: null,
  })
}

function beforeUpload(file) {
  form.attachments.push({
    id: `att-${Date.now()}`,
    name: file.name,
    size: file.size,
  })
  return false
}

function onRemoveFile(file) {
  form.attachments = form.attachments.filter((f) => f.name !== file.name)
}

function loadForm() {
  const r = props.record
  form.contractType = r?.contractType || props.defaultType || CONTRACT_TYPE.FRAMEWORK
  form.contractNo = r?.contractNo || ''
  form.contractName = r?.contractName || ''
  form.customerName = r?.customerName
  form.defaultDiscountPercent = r?.defaultDiscountRate
    ? Number((r.defaultDiscountRate * 100).toFixed(2))
    : 100
  form.settlementCycle = r?.settlementCycle || undefined
  form.paymentTermStart = r?.paymentTermStart || undefined
  form.paymentTermDays =
    r?.paymentTermDays != null && r?.paymentTermDays !== '' ? Number(r.paymentTermDays) : undefined
  form.validFrom = r?.validFrom ? dayjs(r.validFrom) : null
  form.validTo = r?.validTo ? dayjs(r.validTo) : null
  form.limitAmount = r?.limitAmount ?? null
  form.limitQty = r?.limitQty ?? null
  form.allowExceedQuota = r?.allowExceedQuota !== false
  form.remark = r?.remark || ''
  form.attachments = [...(r?.attachments || [])]
  form.priceItems = (r?.priceItems || []).map((item) => ({
    ...item,
    agreementDiscountPercent:
      item.agreementDiscountRate != null
        ? Number((normalizeDiscountRate(item.agreementDiscountRate) * 100).toFixed(2))
        : null,
  }))
  form.lineItems = (r?.lineItems || []).map((item) => ({ ...item }))
  form.paymentNodes = (r?.paymentNodes?.length ? r.paymentNodes : createDefaultPaymentNodes()).map(
    (item) => ({ ...item }),
  )
  if (!isEdit.value && form.customerName) applyCustomerTerms(form.customerName)
}

watch(
  () => [isActive.value, props.defaultType, props.record?.id],
  ([active]) => {
    if (!active) return
    loadForm()
  },
  { immediate: true },
)

function buildPayload(activate) {
  const lineItems = form.lineItems
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
    })
  let limitAmount = form.limitAmount
  if (
    form.contractType === CONTRACT_TYPE.STANDARD &&
    (limitAmount == null || limitAmount === '') &&
    lineItems.length
  ) {
    limitAmount = lineItems.reduce((s, l) => s + (Number(l.amountExTax) || 0), 0)
  }
  return {
    contractNo: form.contractNo,
    contractName: form.contractName,
    customerName: form.customerName,
    contractType: form.contractType,
    defaultDiscountRate: normalizeDiscountRate(form.defaultDiscountPercent / 100, 1),
    settlementCycle: form.settlementCycle || '',
    paymentTermStart: form.paymentTermStart || '',
    paymentTermDays:
      form.paymentTermDays != null && form.paymentTermDays !== ''
        ? Number(form.paymentTermDays)
        : null,
    validFrom: form.validFrom ? form.validFrom.format('YYYY-MM-DD') : '',
    validTo: form.validTo ? form.validTo.format('YYYY-MM-DD') : '',
    limitAmount: limitAmount != null && limitAmount !== '' ? Number(limitAmount) : null,
    limitQty: form.limitQty != null && form.limitQty !== '' ? Number(form.limitQty) : null,
    allowExceedQuota: form.allowExceedQuota !== false,
    remark: form.remark,
    attachments: form.attachments,
    priceItems: form.priceItems
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
    lineItems,
    paymentNodes: form.paymentNodes
      .filter((item) => item.name?.trim())
      .map((item) => ({
        id: item.id,
        name: item.name.trim(),
        ratio: item.ratio,
        amount: item.amount,
      })),
    status: activate ? CONTRACT_STATUS.ACTIVE : CONTRACT_STATUS.DRAFT,
    approvedAt: activate ? dayjs().format('YYYY-MM-DD HH:mm') : '',
    approvedBy: activate ? 'admin' : '',
  }
}

function handleSave(activate) {
  if (!form.contractNo?.trim()) {
    message.warning('请输入合同编号')
    return
  }
  if (!form.customerName) {
    message.warning('请选择客户')
    return
  }
  const payload = buildPayload(activate)
  const res = isEdit.value
    ? updateSalesContract(props.record.id, payload)
    : addSalesContract(payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(activate ? '合同已保存并生效' : isEdit.value ? '已保存' : '草稿已创建')
  emit('saved', res.data)
  closeAfterSave()
}
</script>

<style scoped>
.contract-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.add-row-btn {
  margin-top: 8px;
  margin-bottom: 0;
}
.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
