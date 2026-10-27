<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑框架合同' : '新增框架合同'"
    width="760px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="合同编号" required>
            <a-input v-model:value="form.contractNo" placeholder="请输入合同编号" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="合同名称">
            <a-input v-model:value="form.contractName" placeholder="请输入合同名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
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
        <a-col :span="12">
          <a-form-item>
            <template #label>
              <span class="label-with-tip">
                默认折扣率(%)
                <a-tooltip
                  title="价目未命中时：产品/物料主数据标准采购价 × 本折扣写入订单成交价；结算不再二次打折。"
                >
                  <QuestionCircleOutlined class="label-tip-icon" />
                </a-tooltip>
              </span>
            </template>
            <a-input-number
              v-model:value="form.defaultDiscountPercent"
              :min="1"
              :max="100"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="结算周期">
            <a-select
              v-model:value="form.settlementCycle"
              allow-clear
              :options="settlementCycleOptions"
              placeholder="对账频率，可选"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="账期天数">
            <a-input-number
              v-model:value="form.paymentTermDays"
              :min="0"
              :precision="0"
              placeholder="默认 30"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="有效期起">
            <a-date-picker v-model:value="form.validFrom" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="有效期止">
            <a-date-picker v-model:value="form.validTo" style="width: 100%" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" :rows="2" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="price-list-title">产品协议价目（可选）</div>
      <a-alert
        type="info"
        show-icon
        class="price-items-rule-alert"
        message="① 有协议单价 → 销售订单直接用该未税单价作成交价，行折扣 100%，不倒算。② 无单价、仅有协议折扣或默认折扣 → 销售订单不带入。结算/开票按订单成交价。"
      />
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
          <template v-else-if="column.key === 'agreementUnitPriceExTax'">
            <a-input-number
              v-model:value="record.agreementUnitPriceExTax"
              size="small"
              :min="0"
              :precision="4"
              style="width: 100%"
              placeholder="未税"
            />
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
            <a-button type="link" size="small" danger @click="removePriceRow(index)">删除</a-button>
          </template>
        </template>
      </a-table>
      <a-button type="dashed" block class="add-price-btn" @click="addPriceRow"
        >+ 添加协议价目</a-button
      >
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { getCustomerByName, getCustomerOptions } from '@/store/customerStore'
import { addFrameworkContract, updateFrameworkContract } from '@/store/frameworkContractStore'
import { settlementCycleOptions } from '@/constants/customerMaster'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const isEdit = computed(() => Boolean(props.record?.id))
const customerOpts = computed(() =>
  getCustomerOptions().map((c) => ({ label: c.label, value: c.value })),
)

const priceColumns = [
  { title: '产品编码', key: 'productCode', width: 160 },
  { title: '协议单价(未税)', key: 'agreementUnitPriceExTax', width: 130 },
  { title: '协议折扣(%)', key: 'agreementDiscountPercent', width: 120 },
  { title: '操作', key: 'action', width: 80 },
]

const form = reactive({
  contractNo: '',
  contractName: '',
  customerName: undefined,
  defaultDiscountPercent: 100,
  settlementCycle: undefined,
  paymentTermDays: 30,
  validFrom: null,
  validTo: null,
  remark: '',
  priceItems: [],
})

function applyCustomerPaymentTerms(customerName, { force = false } = {}) {
  const customer = getCustomerByName(customerName)
  if (!customer) return
  if (force || !form.settlementCycle) {
    form.settlementCycle = customer.settlementCycle || undefined
  }
  if (force || form.paymentTermDays == null || form.paymentTermDays === '') {
    form.paymentTermDays =
      customer.paymentTermDays != null && customer.paymentTermDays !== ''
        ? Number(customer.paymentTermDays)
        : 30
  }
}

function onCustomerChange(name) {
  applyCustomerPaymentTerms(name, { force: true })
}

watch(
  () => props.open,
  (val) => {
    if (!val) return
    const r = props.record
    form.contractNo = r?.contractNo || ''
    form.contractName = r?.contractName || ''
    form.customerName = r?.customerName
    form.defaultDiscountPercent = r?.defaultDiscountRate
      ? Number((r.defaultDiscountRate * 100).toFixed(2))
      : 100
    form.settlementCycle = r?.settlementCycle || undefined
    form.paymentTermDays =
      r?.paymentTermDays != null && r?.paymentTermDays !== '' ? Number(r.paymentTermDays) : 30
    form.validFrom = r?.validFrom ? dayjs(r.validFrom) : null
    form.validTo = r?.validTo ? dayjs(r.validTo) : null
    form.remark = r?.remark || ''
    form.priceItems = (r?.priceItems || []).map((item) => ({
      ...item,
      agreementUnitPriceExTax:
        item.agreementUnitPriceExTax != null && item.agreementUnitPriceExTax !== ''
          ? Number(item.agreementUnitPriceExTax)
          : null,
      agreementDiscountPercent:
        item.agreementDiscountRate != null
          ? Number((normalizeDiscountRate(item.agreementDiscountRate) * 100).toFixed(2))
          : null,
    }))
    if (!isEdit.value && form.customerName) {
      applyCustomerPaymentTerms(form.customerName)
    }
  },
)

function addPriceRow() {
  form.priceItems.push({
    id: `fci-${Date.now()}`,
    productCode: '',
    productId: '',
    agreementUnitPriceExTax: null,
    agreementDiscountPercent: null,
  })
}

function removePriceRow(index) {
  form.priceItems.splice(index, 1)
}

function handleCancel() {
  visible.value = false
}

function handleSave() {
  const payload = {
    contractNo: form.contractNo,
    contractName: form.contractName,
    customerName: form.customerName,
    contractType: '框架合同',
    defaultDiscountRate: normalizeDiscountRate(form.defaultDiscountPercent / 100, 1),
    settlementCycle: form.settlementCycle || '',
    paymentTermDays:
      form.paymentTermDays != null && form.paymentTermDays !== ''
        ? Number(form.paymentTermDays)
        : 30,
    validFrom: form.validFrom ? form.validFrom.format('YYYY-MM-DD') : '',
    validTo: form.validTo ? form.validTo.format('YYYY-MM-DD') : '',
    remark: form.remark,
    status: '生效中',
    priceItems: form.priceItems
      .filter((item) => item.productCode?.trim())
      .map((item) => ({
        id: item.id,
        productCode: item.productCode.trim(),
        productId: item.productId || '',
        agreementUnitPriceExTax:
          item.agreementUnitPriceExTax != null && item.agreementUnitPriceExTax !== ''
            ? Number(item.agreementUnitPriceExTax)
            : undefined,
        agreementDiscountRate:
          item.agreementDiscountPercent != null
            ? normalizeDiscountRate(item.agreementDiscountPercent / 100, 1)
            : undefined,
      })),
  }
  const res = isEdit.value
    ? updateFrameworkContract(props.record.id, payload)
    : addFrameworkContract(payload)
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已保存' : '已新增')
  emit('saved')
  visible.value = false
}
</script>

<style scoped>
.price-list-title {
  margin: 8px 0 4px;
  font-weight: 500;
}
.price-items-rule-alert {
  margin-bottom: 8px;
  padding: 4px 10px;

  :deep(.ant-alert-icon) {
    font-size: 12px;
    margin-inline-end: 6px;
  }

  :deep(.ant-alert-message) {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    color: rgba(0, 0, 0, 0.65);
  }
}
.label-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.label-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}
.add-price-btn {
  margin-top: 8px;
}
</style>
