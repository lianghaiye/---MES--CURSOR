<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="92%"
    class="supplier-form-page"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="entity-header">
      <a-row :gutter="[12, 12]">
        <a-col :span="8">
          <div class="field-label">供应商编码</div>
          <a-input v-model:value="form.code" size="small" placeholder="留空按系统规则生成" />
        </a-col>
        <a-col :span="8">
          <div class="field-label required">供应商名称</div>
          <a-input v-model:value="form.name" size="small" placeholder="请输入供应商名称" />
        </a-col>
        <a-col :span="8">
          <div class="field-label">供应商简称</div>
          <a-input v-model:value="form.shortName" size="small" placeholder="请输入供应商简称" />
        </a-col>
        <a-col :span="8">
          <div class="field-label">供应商类型</div>
          <a-checkbox-group v-model:value="form.supplierRoles" :options="supplierRoleOptions" />
        </a-col>
        <a-col :span="8">
          <div class="field-label">供应商分类</div>
          <a-select
            v-model:value="form.supplierCategoryId"
            size="small"
            allow-clear
            placeholder="请选择供应商分类"
            :options="supplierCategoryOpts"
            style="width: 100%"
          />
        </a-col>
        <a-col :span="8">
          <div class="field-label">规模</div>
          <a-select
            v-model:value="form.enterpriseScale"
            size="small"
            allow-clear
            :options="enterpriseScaleOptions"
            style="width: 100%"
          />
        </a-col>
        <a-col :span="24">
          <div class="field-label">备注</div>
          <a-input v-model:value="form.remark" size="small" placeholder="备注" />
        </a-col>
      </a-row>
    </div>

    <a-tabs v-model:active-key="activeTab" type="card" class="form-tabs">
      <a-tab-pane key="business" tab="商务/采购">
        <a-row :gutter="[12, 12]">
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
            <div class="field-label">付款方式</div>
            <a-select
              v-model:value="form.paymentMethod"
              size="small"
              allow-clear
              :options="paymentMethodOptions"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">供货周期(天)</div>
            <a-input-number
              v-model:value="form.supplyCycleDays"
              size="small"
              :min="0"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">最小起订量</div>
            <a-input-number
              v-model:value="form.minOrderQty"
              size="small"
              :min="0"
              :precision="3"
              style="width: 100%"
            />
          </a-col>
          <a-col :span="8">
            <div class="field-label">报价方式</div>
            <a-select
              v-model:value="form.quoteMethod"
              size="small"
              allow-clear
              :options="quoteMethodOptions"
              style="width: 100%"
            />
          </a-col>
        </a-row>
        <div class="section-subtitle">主要供应物料</div>
        <SupplierMainMaterialTable v-model="form.mainMaterials" />
      </a-tab-pane>

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
  enterpriseScaleOptions,
  invoiceTypeOptions,
  paymentMethodOptions,
  quoteMethodOptions,
  settlementCycleOptions,
  settlementMethodOptions,
  settlementTypeOptions,
  supplierRoleOptions,
} from '@/constants/supplierMaster'
import { getSupplierCategoryOptions } from '@/store/supplierCategoryStore'
import { addSupplier, updateSupplier } from '@/store/supplierStore'
import { createDefaultSupplierForm } from '@/utils/supplierMaster'
import CustomerContactTable from '@/views/basic-config/customers/components/CustomerContactTable.vue'
import BusinessLicenseUpload from '@/views/basic-config/customers/components/BusinessLicenseUpload.vue'
import SupplierMainMaterialTable from './SupplierMainMaterialTable.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/basic-config/suppliers' },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const activeTab = ref('business')
const saving = ref(false)
const form = reactive(createDefaultSupplierForm())

const isEdit = computed(() => Boolean(props.record?.id))

const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => (isEdit.value ? '编辑供应商' : '新增供应商'),
})

const supplierCategoryOpts = computed(() => getSupplierCategoryOptions())

const establishedDateValue = computed({
  get: () => form.establishedDate || null,
  set: (val) => {
    form.establishedDate = val || ''
  },
})

function loadForm(record) {
  const base = createDefaultSupplierForm(record || {})
  Object.keys(form).forEach((key) => {
    if (key in base) form[key] = base[key]
  })
  form.businessLicenseFiles = [...(base.businessLicenseFiles || [])]
  form.contacts = [...(base.contacts || [])]
  form.mainMaterials = [...(base.mainMaterials || [])]
  form.supplierRoles = [...(base.supplierRoles || [])]
}

watch(
  () => isActive.value,
  (active) => {
    if (!active) return
    activeTab.value = 'business'
    loadForm(props.record)
  },
  { immediate: true },
)

function validate() {
  if (!form.name?.trim()) {
    message.warning('请填写供应商名称')
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
    shortName: form.shortName?.trim() || '',
    supplierRoles: [...(form.supplierRoles || [])],
    contacts,
    contactPerson: defaultContact?.name || '',
    contactPhone: defaultContact?.phone || '',
    contactMobile: defaultContact?.mobile || '',
    contactEmail: defaultContact?.email || '',
    invoiceName: form.invoiceName?.trim() || form.name.trim(),
    invoiceTaxNo: form.invoiceTaxNo?.trim() || form.unifiedSocialCreditCode?.trim() || '',
    mainMaterials: (form.mainMaterials || []).filter((item) => item.materialCode?.trim()),
    status: form.status || '启用',
  }
}

function handleSave() {
  if (!validate()) return
  saving.value = true
  const payload = buildPayload()
  const res = isEdit.value ? updateSupplier(props.record.id, payload) : addSupplier(payload)
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
.supplier-form-page {
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

  .section-subtitle {
    margin: 16px 0 8px;
    font-weight: 500;
    font-size: 13px;
  }
}
</style>
