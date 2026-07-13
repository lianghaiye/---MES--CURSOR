<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="92%"
    class="customer-form-page"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="entity-header">
      <a-row :gutter="[12, 12]">
        <a-col :span="8">
          <div class="field-label">客户编码</div>
          <a-input v-model:value="form.code" size="small" placeholder="留空按系统规则生成" />
        </a-col>
        <a-col :span="8">
          <div class="field-label required">客户名称</div>
          <a-input v-model:value="form.name" size="small" placeholder="请输入客户名称" />
        </a-col>
        <a-col :span="8">
          <div class="field-label">客户简称</div>
          <a-input v-model:value="form.shortName" size="small" placeholder="请输入客户简称" />
        </a-col>
        <a-col :span="8">
          <div class="field-label">客户类型</div>
          <a-select
            v-model:value="form.customerTypeId"
            size="small"
            allow-clear
            placeholder="请选择客户类型"
            :options="customerTypeOpts"
            style="width: 100%"
          />
        </a-col>
        <a-col :span="8">
          <div class="field-label">客户分级</div>
          <a-select
            v-model:value="form.customerGrade"
            size="small"
            :options="customerGradeOptions"
            style="width: 100%"
          />
        </a-col>
        <a-col :span="8">
          <div class="field-label">外部编号</div>
          <a-input v-model:value="form.externalCode" size="small" placeholder="外部系统编号" />
        </a-col>
        <a-col :span="8">
          <div class="field-label">业务员</div>
          <a-input v-model:value="form.salesperson" size="small" placeholder="负责业务员" />
        </a-col>
        <a-col :span="16">
          <div class="field-label">备注</div>
          <a-input v-model:value="form.remark" size="small" placeholder="备注" />
        </a-col>
      </a-row>
    </div>

    <a-tabs v-model:active-key="activeTab" type="card" class="form-tabs">
      <a-tab-pane key="org" tab="组织与资质">
        <a-row :gutter="[12, 12]">
          <a-col :span="8">
            <div class="field-label">统一社会信用代码</div>
            <a-input
              v-model:value="form.unifiedSocialCreditCode"
              size="small"
              placeholder="营业执照号/税号"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">法定代表人</div>
            <a-input v-model:value="form.legalRepresentative" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">注册资本</div>
            <a-input v-model:value="form.registeredCapital" size="small" placeholder="如 5000万" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">成立日期</div>
            <a-date-picker
              v-model:value="establishedDateValue"
              size="small"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">所属行业</div>
            <a-input v-model:value="form.industry" size="small" placeholder="国民经济行业分类" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">企业规模</div>
            <a-select
              v-model:value="form.enterpriseScale"
              size="small"
              allow-clear
              :options="enterpriseScaleOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="24">
            <div class="field-label">营业执照附件</div>
            <BusinessLicenseUpload v-model="form.businessLicenseFiles" />
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="contact" tab="联系信息">
        <CustomerContactTable v-model="form.contacts" />
      </a-tab-pane>

      <a-tab-pane key="address" tab="地址信息">
        <CustomerAddressTable v-model="form.addresses" />
      </a-tab-pane>

      <a-tab-pane key="business" tab="商务与交易">
        <a-row :gutter="[12, 12]">
          <a-col :span="8">
            <div class="field-label">币种</div>
            <a-select
              v-model:value="form.currency"
              size="small"
              :options="currencyOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">结算方式</div>
            <a-select
              v-model:value="form.settlementMethod"
              size="small"
              allow-clear
              :options="settlementMethodOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">结算周期</div>
            <a-select
              v-model:value="form.settlementCycle"
              size="small"
              allow-clear
              :options="settlementCycleOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">结算类型</div>
            <a-select
              v-model:value="form.settlementType"
              size="small"
              allow-clear
              :options="settlementTypeOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">信用额度</div>
            <a-input-number
              v-model:value="form.creditLimit"
              size="small"
              :min="0"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">信用可用余额</div>
            <a-input-number
              v-model:value="form.creditAvailableBalance"
              size="small"
              :min="0"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">信用警戒线(%)</div>
            <a-input-number
              v-model:value="form.creditWarningPercent"
              size="small"
              :min="0"
              :max="100"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">税率(%)</div>
            <a-input-number
              v-model:value="form.taxRate"
              size="small"
              :min="0"
              :max="100"
              style="width: 100%"
            />
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="discount" tab="折扣设置">
        <a-row :gutter="[12, 12]" class="discount-header">
          <a-col :span="8">
            <div class="field-label">价目等级</div>
            <a-select
              v-model:value="form.priceLevel"
              size="small"
              :options="priceLevelOpts"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">默认折扣率(%)</div>
            <a-input-number
              v-model:value="form.defaultDiscountPercent"
              size="small"
              :min="1"
              :max="100"
              :precision="2"
              style="width: 100%"
              placeholder="100 表示无折扣"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">启用状态</div>
            <a-select
              v-model:value="form.status"
              size="small"
              :options="statusOpts"
              style="width: 100%"
            />
          </a-col>
        </a-row>
        <div class="section-subtitle">产品协议价（可选）</div>
        <p class="section-hint">
          建单时选择客户/产品将自动带出默认折扣与协议价；协议单价优先于协议折扣。
        </p>
        <CustomerPriceListTable v-model="form.customerPriceList" />
      </a-tab-pane>

      <a-tab-pane key="logistics" tab="物流与交付">
        <a-row :gutter="[12, 12]">
          <a-col :span="8">
            <div class="field-label">默认交货方式</div>
            <a-select
              v-model:value="form.defaultDeliveryMethod"
              size="small"
              allow-clear
              :options="deliveryMethodOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">默认承运商</div>
            <a-input v-model:value="form.defaultCarrier" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">运费承担方</div>
            <a-select
              v-model:value="form.freightBearer"
              size="small"
              allow-clear
              :options="freightBearerOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">交货提前期(天)</div>
            <a-input-number
              v-model:value="form.deliveryLeadTimeDays"
              size="small"
              :min="0"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">包装要求</div>
            <a-input v-model:value="form.packagingRequirements" size="small" />
          </a-col>
          <a-col :span="24">
            <div class="field-label">特殊要求</div>
            <a-textarea v-model:value="form.specialRequirements" :rows="2" size="small" />
          </a-col>
        </a-row>
      </a-tab-pane>

      <a-tab-pane key="finance" tab="财务信息">
        <a-row :gutter="[12, 12]">
          <a-col :span="8">
            <div class="field-label">开户银行</div>
            <a-input v-model:value="form.openingBank" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">银行账号</div>
            <a-input v-model:value="form.bankAccount" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">开票名称</div>
            <a-input v-model:value="form.invoiceName" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">开票税号</div>
            <a-input v-model:value="form.invoiceTaxNo" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">开票地址/电话</div>
            <a-input v-model:value="form.invoiceAddressPhone" size="small" />
          </a-col>
          <a-col :span="8">
            <div class="field-label">默认发票类型</div>
            <a-select
              v-model:value="form.defaultInvoiceType"
              size="small"
              allow-clear
              :options="invoiceTypeOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="24">
            <div class="field-label">收票人/收票地址</div>
            <a-textarea v-model:value="form.invoiceRecipientInfo" :rows="2" size="small" />
          </a-col>
        </a-row>
      </a-tab-pane>
    </a-tabs>

    <template #footer>
      <a-space>
        <a-button :size="pageMode ? 'small' : 'middle'" @click="handleCancel">取消</a-button>
        <a-button
          type="primary"
          :size="pageMode ? 'small' : 'middle'"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </a-button>
      </a-space>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import {
  customerGradeOptions,
  enterpriseScaleOptions,
  currencyOptions,
  settlementMethodOptions,
  settlementCycleOptions,
  settlementTypeOptions,
  deliveryMethodOptions,
  freightBearerOptions,
  invoiceTypeOptions,
} from '@/constants/customerMaster'
import { getCustomerTypeOptions } from '@/store/customerTypeStore'
import { addCustomer, updateCustomer } from '@/store/customerStore'
import {
  createDefaultCustomerForm,
  mapCustomerPriceListForForm,
  mapCustomerPriceListForSave,
} from '@/utils/customerMaster'
import { PRICE_LEVEL_OPTIONS } from '@/utils/customerPrice'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'
import CustomerAddressTable from './CustomerAddressTable.vue'
import CustomerContactTable from './CustomerContactTable.vue'
import BusinessLicenseUpload from './BusinessLicenseUpload.vue'
import CustomerPriceListTable from './CustomerPriceListTable.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/basic-config/customers' },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const activeTab = ref('org')
const saving = ref(false)
const form = reactive(createDefaultCustomerForm())

const isEdit = computed(() => Boolean(props.record?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => (isEdit.value ? '编辑客户' : '新增客户'),
})

const customerTypeOpts = computed(() => getCustomerTypeOptions())
const priceLevelOpts = PRICE_LEVEL_OPTIONS.map((v) => ({ label: v, value: v }))
const statusOpts = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
]

const establishedDateValue = computed({
  get: () => form.establishedDate || null,
  set: (val) => {
    form.establishedDate = val || ''
  },
})

function loadForm(record) {
  const base = createDefaultCustomerForm(record || {})
  Object.keys(form).forEach((key) => {
    if (key in base) form[key] = base[key]
  })
  form.addresses = [...(base.addresses || [])]
  form.businessLicenseFiles = [...(base.businessLicenseFiles || [])]
  form.contacts = [...(base.contacts || [])]
  form.customerPriceList = mapCustomerPriceListForForm(base.customerPriceList || [])
  form.defaultDiscountPercent = base.defaultDiscountRate
    ? Number((normalizeDiscountRate(base.defaultDiscountRate) * 100).toFixed(2))
    : 100
}

watch(
  () => isActive.value,
  (active) => {
    if (!active) return
    activeTab.value = 'org'
    loadForm(props.record)
  },
  { immediate: true },
)

function validate() {
  if (!form.name?.trim()) {
    message.warning('请填写客户名称')
    return false
  }
  return true
}

function buildPayload() {
  const contacts = (form.contacts || []).map((item) => ({
    ...item,
    phone: item.phone || item.mobile || '',
  }))
  const defaultContact = contacts.find((item) => item.isDefault) || contacts[0]
  return {
    ...form,
    name: form.name.trim(),
    code: form.code?.trim() || undefined,
    contacts,
    contactPerson: defaultContact?.name || '',
    contactTitle: defaultContact?.title || '',
    contactPhone: defaultContact?.phone || '',
    contactMobile: defaultContact?.mobile || '',
    contactEmail: defaultContact?.email || '',
    contactFax: defaultContact?.fax || '',
    invoiceName: form.invoiceName?.trim() || form.name.trim(),
    invoiceTaxNo: form.invoiceTaxNo?.trim() || form.unifiedSocialCreditCode?.trim() || '',
    priceLevel: form.priceLevel || '标准',
    defaultDiscountRate: normalizeDiscountRate((form.defaultDiscountPercent ?? 100) / 100, 1),
    status: form.status || '启用',
    customerPriceList: mapCustomerPriceListForSave(form.customerPriceList),
    dataStatus: form.dataStatus || '草稿',
  }
}

function handleSave() {
  if (!validate()) return
  saving.value = true
  const payload = buildPayload()
  const res = isEdit.value ? updateCustomer(props.record.id, payload) : addCustomer(payload)
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success(isEdit.value ? '已更新' : '已创建')
  emit('saved', res.data)
  closeAfterSave()
}
</script>

<style lang="less" scoped>
.customer-form-page {
  .entity-header {
    background: #fff;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .field-label {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.55);
    margin-bottom: 4px;

    &.required::before {
      content: '*';
      color: #ff4d4f;
      margin-right: 4px;
    }
  }

  .form-tabs {
    background: #fff;
    border-radius: 6px;
    padding: 0 12px 12px;
  }

  .discount-header {
    margin-bottom: 12px;
  }

  .section-subtitle {
    margin: 0 0 4px;
    font-weight: 500;
    font-size: 13px;
  }

  .section-hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
