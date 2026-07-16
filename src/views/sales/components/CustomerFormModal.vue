<template>
  <a-modal
    v-model:open="visible"
    :title="isEdit ? '编辑客户' : '新增客户'"
    width="720px"
    destroy-on-close
    @cancel="handleCancel"
  >
    <a-form layout="vertical">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="客户名称" required>
            <a-input v-model:value="form.name" placeholder="请输入客户名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="客户编码">
            <a-input v-model:value="form.code" placeholder="留空自动生成" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="价目等级">
            <a-select v-model:value="form.priceLevel" :options="priceLevelOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="默认折扣率(%)">
            <a-input-number
              v-model:value="form.defaultDiscountPercent"
              :min="1"
              :max="100"
              :precision="2"
              style="width: 100%"
              placeholder="100 表示无折扣"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="状态">
            <a-select v-model:value="form.status" :options="statusOpts" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="备注">
            <a-textarea v-model:value="form.remark" :rows="2" />
          </a-form-item>
        </a-col>
      </a-row>

      <div class="price-list-title">产品协议价（可选）</div>
      <a-table
        :columns="priceColumns"
        :data-source="form.customerPriceList"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'productCode'">
            <a-input v-model:value="record.productCode" size="small" placeholder="产品编码" />
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
          <template v-else-if="column.key === 'agreementUnitPriceExTax'">
            <a-input-number
              v-model:value="record.agreementUnitPriceExTax"
              size="small"
              :min="0"
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
        >+ 添加协议价</a-button
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
import { message } from 'ant-design-vue'
import { PRICE_LEVEL_OPTIONS } from '@/utils/customerPrice'
import { normalizeDiscountRate } from '@/utils/salesOrderPricing'
import { addCustomer, updateCustomer } from '@/store/customerStore'

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

const priceLevelOpts = PRICE_LEVEL_OPTIONS.map((v) => ({ label: v, value: v }))
const statusOpts = [
  { label: '启用', value: '启用' },
  { label: '停用', value: '停用' },
]

const priceColumns = [
  { title: '产品编码', key: 'productCode', width: 160 },
  { title: '协议折扣(%)', key: 'agreementDiscountPercent', width: 120 },
  { title: '协议单价(不含税)', key: 'agreementUnitPriceExTax', width: 140 },
  { title: '操作', key: 'action', width: 80 },
]

const form = reactive({
  name: '',
  code: '',
  priceLevel: '标准',
  defaultDiscountPercent: 100,
  status: '启用',
  remark: '',
  customerPriceList: [],
})

watch(
  () => props.open,
  (val) => {
    if (!val) return
    const r = props.record
    form.name = r?.name || ''
    form.code = r?.code || ''
    form.priceLevel = r?.priceLevel || '标准'
    form.defaultDiscountPercent = r?.defaultDiscountRate
      ? Number((r.defaultDiscountRate * 100).toFixed(2))
      : 100
    form.status = r?.status || '启用'
    form.remark = r?.remark || ''
    form.customerPriceList = (r?.customerPriceList || []).map((item) => ({
      ...item,
      agreementDiscountPercent:
        item.agreementDiscountRate != null
          ? Number((normalizeDiscountRate(item.agreementDiscountRate) * 100).toFixed(2))
          : null,
    }))
  },
)

function addPriceRow() {
  form.customerPriceList.push({
    id: `cpl-${Date.now()}`,
    productCode: '',
    productId: '',
    agreementDiscountPercent: null,
    agreementUnitPriceExTax: null,
  })
}

function removePriceRow(index) {
  form.customerPriceList.splice(index, 1)
}

function handleCancel() {
  visible.value = false
}

function handleSave() {
  const payload = {
    name: form.name,
    code: form.code,
    priceLevel: form.priceLevel,
    defaultDiscountRate: normalizeDiscountRate(form.defaultDiscountPercent / 100, 1),
    status: form.status,
    remark: form.remark,
    contacts: props.record?.contacts || [],
    customerPriceList: form.customerPriceList
      .filter((item) => item.productCode?.trim())
      .map((item) => ({
        id: item.id,
        productCode: item.productCode.trim(),
        productId: item.productId || '',
        agreementDiscountRate:
          item.agreementDiscountPercent != null
            ? normalizeDiscountRate(item.agreementDiscountPercent / 100, 1)
            : undefined,
        agreementUnitPriceExTax: item.agreementUnitPriceExTax ?? undefined,
      })),
  }
  const res = isEdit.value ? updateCustomer(props.record.id, payload) : addCustomer(payload)
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
  margin: 8px 0;
  font-weight: 500;
}
.add-price-btn {
  margin-top: 8px;
}
</style>
