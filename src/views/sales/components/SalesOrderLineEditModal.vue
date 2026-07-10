<template>
  <a-modal
    v-model:open="visible"
    title="编辑销售明细"
    width="880px"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="line-edit-form">
      <a-row :gutter="[16, 0]">
        <a-col :span="8">
          <a-form-item label="业务类型" required>
            <a-select
              v-model:value="draft.businessType"
              :options="businessTypeOpts"
              placeholder="请选择业务类型"
              @change="onBusinessTypeChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="产品名称" required>
            <a-input
              v-if="draft.isManualLine"
              v-model:value="draft.productName"
              placeholder="请输入产品名称"
            />
            <a-input v-else :value="draft.productName" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="产品编码" :required="draft.isManualLine">
            <a-input
              v-if="draft.isManualLine"
              v-model:value="draft.productCode"
              placeholder="请输入产品编码"
            />
            <a-input v-else :value="draft.productCode" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="规格型号">
            <a-input
              v-if="draft.isManualLine"
              v-model:value="draft.specModel"
              placeholder="请输入规格型号"
            />
            <a-input v-else :value="draft.specModel || '—'" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="材质">
            <a-input
              v-if="draft.isManualLine"
              v-model:value="draft.material"
              placeholder="请输入材质"
            />
            <a-input v-else :value="draft.material || '—'" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="图号">
            <a-input
              v-if="draft.isManualLine"
              v-model:value="draft.drawingNo"
              placeholder="请输入图号"
            />
            <a-input v-else :value="draft.drawingNo || '—'" disabled placeholder="—" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="单位" required>
            <a-input v-model:value="draft.unit" placeholder="如 件" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="销售数量" required>
            <a-input-number
              v-model:value="draft.salesQty"
              :min="0"
              :precision="0"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="交付方式" required>
            <a-select v-model:value="draft.deliveryMode" :options="deliveryModeOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="交货日期" required>
            <a-date-picker
              :value="deliveryDateValue"
              style="width: 100%"
              @change="onDeliveryDateChange"
            />
          </a-form-item>
        </a-col>
        <a-col v-if="showFulfillmentPath" :span="8">
          <a-form-item label="BOM名称+版本">
            <a-input :value="bomNameVersionDisplay" disabled placeholder="—" />
          </a-form-item>
        </a-col>
        <a-col v-if="showFulfillmentPath" :span="8">
          <a-form-item :label="BOM_FULFILLMENT_FIELD_LABEL" required>
            <a-select
              v-model:value="draft.bomFulfillmentPath"
              :options="fulfillmentPathOpts"
              :placeholder="`请选择${BOM_FULFILLMENT_FIELD_LABEL}`"
              @change="onFulfillmentPathChange"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="标准单价(不含税)">
            <a-input :value="formatMoney(draft.listUnitPriceExTax)" disabled />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item :label="taxModeExcluding ? '成交单价(不含税)' : '含税单价'" required>
            <a-input-number
              v-if="taxModeExcluding"
              v-model:value="draft.unitPriceExTax"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
            <a-input-number
              v-else
              v-model:value="draft.unitPriceInTax"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="税率(%)" required>
            <a-input-number
              v-model:value="draft.taxRate"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="行折扣(%)" required>
            <a-input-number
              v-model:value="draft.lineDiscountPercent"
              :min="1"
              :max="100"
              :precision="2"
              :disabled="lineDiscountReadOnly"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="包装形式">
            <a-input v-model:value="draft.packagingForm" placeholder="包装形式" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="技术参数">
            <a-textarea v-model:value="draft.techParams" :rows="2" placeholder="技术参数" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="配套要求">
            <a-textarea
              v-model:value="draft.matchingRequirements"
              :rows="2"
              placeholder="配套要求"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="补充说明">
            <a-textarea v-model:value="draft.supplementDesc" :rows="2" placeholder="补充说明" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { deliveryModeOptions } from '@/mock/salesOrderOptions'
import { productInfoState } from '@/store/productInfoStore'
import { getActiveBomForItem } from '@/store/productBomStore'
import {
  CUSTOM_SALES_BUSINESS_TYPE,
  MAINTENANCE_SERVICE_BUSINESS_TYPE,
  isSelfMadeBusinessType,
} from '@/utils/salesOrderBusiness'
import {
  BOM_FULFILLMENT_FIELD_LABEL,
  BOM_FULFILLMENT_PATH,
  getFulfillmentPathOptions,
  normalizeBomFulfillmentPath,
  suggestDefaultFulfillmentPath,
  validateFulfillmentPathForApprove,
} from '@/constants/salesOrderFulfillment'
import { DISCOUNT_STRATEGIES, normalizeDiscountRate, round2 } from '@/utils/salesOrderPricing'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  taxModeExcluding: { type: Boolean, default: true },
  discountStrategy: { type: String, default: DISCOUNT_STRATEGIES.LINE },
})

const emit = defineEmits(['update:open', 'saved'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const catalogBusinessTypeOpts = ['自产销售', '外购销售'].map((v) => ({
  label: v,
  value: v,
}))
const manualBusinessTypeOpts = [
  '外协销售',
  '质检服务',
  MAINTENANCE_SERVICE_BUSINESS_TYPE,
  CUSTOM_SALES_BUSINESS_TYPE,
].map((v) => ({ label: v, value: v }))

const deliveryModeOpts = deliveryModeOptions.map((v) => ({ label: v, value: v }))

const draft = reactive(createDraft())

const businessTypeOpts = computed(() => {
  const base = draft.isManualLine ? manualBusinessTypeOpts : catalogBusinessTypeOpts
  if (
    draft.isManualLine &&
    draft.businessType &&
    !base.some((opt) => opt.value === draft.businessType)
  ) {
    return [{ label: draft.businessType, value: draft.businessType }, ...base]
  }
  return base
})

const deliveryDateValue = computed(() => (draft.deliveryDate ? dayjs(draft.deliveryDate) : null))

const showFulfillmentPath = computed(() => isSelfMadeBusinessType(draft.businessType))

const fulfillmentPathOpts = computed(() =>
  getFulfillmentPathOptions(draft, { businessType: draft.businessType }),
)

const linkedCatalogBom = computed(() => {
  if (draft.isManualLine || !draft.productId) return null
  return getActiveBomForItem('product', draft.productId)
})

const lineDiscountReadOnly = computed(() => props.discountStrategy === DISCOUNT_STRATEGIES.ORDER)

const bomNameVersionDisplay = computed(() => {
  if (draft.bomName && draft.bomVersion) {
    return `${draft.bomName}（版本 ${draft.bomVersion}）`
  }
  if (linkedCatalogBom.value && draft.bomFulfillmentPath === BOM_FULFILLMENT_PATH.USE_CATALOG_BOM) {
    return `${linkedCatalogBom.value.bomName}（版本 ${linkedCatalogBom.value.version}）`
  }
  return '—'
})

watch(
  () => props.open,
  (open) => {
    if (!open || !props.line) return
    Object.assign(draft, createDraft(props.line))
    draft.bomFulfillmentPath = normalizeBomFulfillmentPath(draft.bomFulfillmentPath)
    if (lineDiscountReadOnly.value) {
      draft.lineDiscountPercent = 100
    }
    if (!draft.isManualLine && draft.businessType === CUSTOM_SALES_BUSINESS_TYPE) {
      draft.businessType = '自产销售'
    }
    syncFieldsFromProduct()
  },
)

function syncFieldsFromProduct() {
  if (draft.isManualLine || !draft.productId) return
  const product = productInfoState.products.find((p) => p.id === draft.productId)
  if (product?.drawingNo) {
    draft.drawingNo = product.drawingNo
  }
  syncCatalogBomFromProduct()
}

function syncCatalogBomFromProduct() {
  if (draft.isManualLine || !draft.productId || !showFulfillmentPath.value) return
  const bom = getActiveBomForItem('product', draft.productId)
  if (!draft.bomFulfillmentPath) {
    draft.bomFulfillmentPath = suggestDefaultFulfillmentPath(draft, {
      businessType: draft.businessType,
    })
  }
  if (draft.bomFulfillmentPath === BOM_FULFILLMENT_PATH.USE_CATALOG_BOM && bom) {
    draft.bomId = bom.id
    draft.bomName = bom.bomName
    draft.bomVersion = bom.version
  } else if (draft.bomFulfillmentPath === BOM_FULFILLMENT_PATH.DESIGN_REQUIRED) {
    draft.bomId = ''
    draft.bomName = ''
    draft.bomVersion = ''
  }
}

function createDraft(line = {}) {
  return {
    businessType: line.businessType || '自产销售',
    productName: line.productName || '',
    productCode: line.productCode || '',
    specModel: line.specModel || '',
    material: line.material || '',
    unit: line.unit || '件',
    salesQty: line.salesQty ?? line.qty ?? 1,
    deliveryMode: line.deliveryMode || '整机',
    deliveryDate: line.deliveryDate || '',
    listUnitPriceExTax: line.listUnitPriceExTax ?? 0,
    lineDiscountPercent: round2(normalizeDiscountRate(line.lineDiscountRate, 1) * 100),
    unitPriceExTax: line.unitPriceExTax ?? 0,
    unitPriceInTax: line.unitPriceInTax ?? 0,
    taxRate: line.taxRate ?? 13,
    drawingNo: line.drawingNo || '',
    techParams: line.techParams || '',
    matchingRequirements: line.matchingRequirements || '',
    packagingForm: line.packagingForm || '',
    supplementDesc: line.supplementDesc || '',
    isManualLine: Boolean(line.isManualLine),
    productId: line.productId || '',
    productAttr: line.productAttr || '',
    bomId: line.bomId || '',
    bomName: line.bomName || '',
    bomVersion: line.bomVersion || '',
    priceSource: line.priceSource || 'product',
    bomFulfillmentPath: line.bomFulfillmentPath || '',
  }
}

function onFulfillmentPathChange() {
  const bom = draft.productId ? getActiveBomForItem('product', draft.productId) : null
  if (draft.bomFulfillmentPath === 'use_catalog_bom' && bom) {
    draft.bomId = bom.id
    draft.bomName = bom.bomName
    draft.bomVersion = bom.version
  } else if (draft.bomFulfillmentPath === 'design_required') {
    draft.bomId = ''
    draft.bomName = ''
    draft.bomVersion = ''
  }
}

function onBusinessTypeChange(businessType) {
  if (businessType === MAINTENANCE_SERVICE_BUSINESS_TYPE) {
    draft.isManualLine = true
    draft.productId = ''
    draft.bomId = ''
    draft.bomName = ''
    draft.bomVersion = ''
    draft.productAttr = ''
    draft.bomFulfillmentPath = ''
    return
  }
  if (businessType === CUSTOM_SALES_BUSINESS_TYPE) {
    draft.productAttr = '定制产品'
    draft.bomId = ''
    draft.bomName = ''
    draft.bomVersion = ''
    draft.bomFulfillmentPath = suggestDefaultFulfillmentPath(draft, {
      businessType: draft.businessType,
    })
    return
  }
  if (draft.isManualLine) {
    draft.productAttr = ''
    draft.bomFulfillmentPath = ''
    return
  }
  const product = productInfoState.products.find((p) => p.id === draft.productId)
  if (product) {
    draft.productAttr = product.productAttribute || ''
  }
  if (businessType === '自产销售' || businessType === '外购销售') {
    const bom = getActiveBomForItem('product', draft.productId)
    draft.bomId = bom?.id || ''
    draft.bomName = bom?.bomName || ''
    draft.bomVersion = bom?.version || ''
  }
  if (businessType === '自产销售') {
    draft.bomFulfillmentPath = suggestDefaultFulfillmentPath(draft, {
      businessType: draft.businessType,
    })
  } else {
    draft.bomFulfillmentPath = ''
  }
}

function onDeliveryDateChange(date) {
  draft.deliveryDate = date ? date.format('YYYY-MM-DD') : ''
}

function formatMoney(val) {
  return Number(val || 0).toFixed(2)
}

function validate() {
  if (!draft.businessType) {
    message.warning('请选择业务类型')
    return false
  }
  if (!draft.productName?.trim()) {
    message.warning('请填写产品名称')
    return false
  }
  if (draft.isManualLine && !draft.productCode?.trim()) {
    message.warning('请填写产品编码')
    return false
  }
  if (!draft.unit?.trim()) {
    message.warning('请填写单位')
    return false
  }
  if (!draft.salesQty || Number(draft.salesQty) <= 0) {
    message.warning('销售数量须大于 0')
    return false
  }
  if (!draft.deliveryMode) {
    message.warning('请选择交付方式')
    return false
  }
  if (!draft.deliveryDate) {
    message.warning('请选择交货日期')
    return false
  }
  if (draft.taxRate == null || draft.taxRate === '') {
    message.warning('请填写税率')
    return false
  }
  const unitPrice = props.taxModeExcluding ? draft.unitPriceExTax : draft.unitPriceInTax
  if (unitPrice == null || unitPrice === '') {
    message.warning(props.taxModeExcluding ? '请填写成交单价(不含税)' : '请填写含税单价')
    return false
  }
  if (draft.lineDiscountPercent == null || draft.lineDiscountPercent === '') {
    message.warning('请填写行折扣')
    return false
  }
  if (showFulfillmentPath.value) {
    const check = validateFulfillmentPathForApprove(draft, { businessType: draft.businessType })
    if (!check.ok) {
      message.warning(check.message)
      return false
    }
  }
  return true
}

function handleCancel() {
  visible.value = false
}

function handleSave() {
  if (!validate()) return
  const unitPriceChanged = props.taxModeExcluding
    ? Number(draft.unitPriceExTax) !== Number(props.line?.unitPriceExTax)
    : Number(draft.unitPriceInTax) !== Number(props.line?.unitPriceInTax)
  emit('saved', {
    ...props.line,
    businessType: draft.businessType,
    productName: draft.productName.trim(),
    productCode: draft.productCode?.trim() || props.line?.productCode || '',
    specModel: draft.specModel || '',
    material: draft.material || '',
    unit: draft.unit.trim(),
    salesQty: Number(draft.salesQty),
    qty: Number(draft.salesQty),
    deliveryMode: draft.deliveryMode,
    deliveryDate: draft.deliveryDate,
    lineDiscountRate: lineDiscountReadOnly.value
      ? 1
      : normalizeDiscountRate((Number(draft.lineDiscountPercent) || 100) / 100, 1),
    unitPriceExTax: Number(draft.unitPriceExTax) || 0,
    unitPriceInTax: Number(draft.unitPriceInTax) || 0,
    taxRate: Number(draft.taxRate) || 0,
    drawingNo: draft.drawingNo || '',
    techParams: draft.techParams || '',
    matchingRequirements: draft.matchingRequirements || '',
    packagingForm: draft.packagingForm || '',
    supplementDesc: draft.supplementDesc || '',
    isManualLine: draft.isManualLine,
    productId: draft.productId,
    productAttr: draft.productAttr,
    bomId: draft.bomId,
    bomName: draft.bomName,
    bomVersion: draft.bomVersion,
    bomFulfillmentPath: draft.bomFulfillmentPath || '',
    priceSource: unitPriceChanged ? 'manual' : props.line?.priceSource || 'product',
  })
  visible.value = false
}
</script>
