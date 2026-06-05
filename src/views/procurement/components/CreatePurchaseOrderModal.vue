<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑采购单' : '新增采购单'"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="采购单号">
              <a-input
                v-model:value="form.orderNo"
                placeholder="留空则系统自动生成"
                allow-clear
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供应商" required>
              <a-select
                v-model:value="form.supplier"
                size="small"
                show-search
                placeholder="请选择供应商"
                :options="supplierOpts"
                @change="onSupplierChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结算类型">
              <a-select
                v-model:value="form.settlementType"
                size="small"
                :options="settlementTypeOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结算周期">
              <a-select
                v-model:value="form.settlementCycle"
                size="small"
                :options="settlementCycleOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="结算方式">
              <a-select
                v-model:value="form.settlementMethod"
                size="small"
                :options="settlementMethodOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="生产工单号">
              <a-input
                v-model:value="form.workOrderNo"
                size="small"
                placeholder="请输入 生产工单号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货日期" required>
              <a-date-picker v-model:value="form.deliveryDate" size="small" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="提醒日期">
              <a-date-picker v-model:value="form.reminderDate" size="small" style="width: 100%" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货方式">
              <a-select
                v-model:value="form.deliveryMethod"
                size="small"
                :options="deliveryMethodOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供货期/天">
              <a-input-number
                v-model:value="form.leadTimeDays"
                size="small"
                :min="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="物流单号">
              <a-input
                v-model:value="form.logisticsNo"
                size="small"
                placeholder="请输入 物流单号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="联系人">
              <a-select
                v-model:value="form.contactPerson"
                size="small"
                allow-clear
                :options="contactOpts"
                @change="onContactChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="联系方式">
              <a-input
                v-model:value="form.contactPhone"
                size="small"
                placeholder="请输入 联系方式"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="采购申请单号">
              <a-input v-model:value="form.reqNo" size="small" placeholder="请输入 采购申请单号" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="合同编号">
              <a-input v-model:value="form.contractNo" size="small" placeholder="请输入 合同编号" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="销售单号">
              <a-input
                v-model:value="form.salesOrderNo"
                size="small"
                placeholder="请输入 销售单号"
              />
            </a-form-item>
          </a-col>
          <a-col :span="16">
            <a-form-item label="收货地址">
              <a-input
                v-model:value="form.shippingAddress"
                size="small"
                placeholder="请输入 收货地址"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="采购员">
              <a-select
                v-model:value="form.purchaser"
                size="small"
                show-search
                :options="purchaserOpts"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="500"
                show-count
                placeholder="请输入备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">采购清单</div>
      <a-divider class="section-divider" />
      <div class="detail-toolbar">
        <a-space wrap>
          <a-button type="primary" size="small" @click="openItemPicker">
            <PlusOutlined />
            选择物品
          </a-button>
          <a-button class="tax-toggle-btn" size="small" @click="toggleTaxMode">
            切换为：{{ taxModeExcluding ? '计算含税' : '计算不含税' }}
          </a-button>
          <span class="tax-hint">{{ taxModeHint }}</span>
        </a-space>
      </div>
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1400 }"
        locale="{ emptyText: '暂无数据' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'purchaseQty'">
            <a-input-number
              v-model:value="record.purchaseQty"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
              @change="onLineChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'unitPriceExTax'">
            <a-input-number
              v-model:value="record.unitPriceExTax"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
              :disabled="!taxModeExcluding"
              @change="onLineChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'taxRate'">
            <a-input-number
              v-model:value="record.taxRate"
              size="small"
              :min="0"
              :max="100"
              :precision="2"
              style="width: 100%"
              @change="onLineChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'unitPriceInTax'">
            <a-input-number
              v-model:value="record.unitPriceInTax"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
              :disabled="taxModeExcluding"
              @change="onLineChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'totalPriceExTax'">
            {{ formatMoney(record.totalPriceExTax) }}
          </template>
          <template v-else-if="column.key === 'totalPriceInTax'">
            {{ formatMoney(record.totalPriceInTax) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '-' }}
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="itemPickerOpen" title="选择物品" width="800px" @ok="confirmItemPick">
      <a-table
        :columns="itemPickerColumns"
        :data-source="mockInventory"
        row-key="code"
        size="small"
        :row-selection="{
          type: 'checkbox',
          selectedRowKeys: pickedItemKeys,
          onChange: (keys) => (pickedItemKeys = keys),
        }"
        :pagination="false"
      />
    </a-modal>

    <template #footer>
      <a-button @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import {
  supplierOptions,
  settlementTypeOptions,
  settlementCycleOptions,
  settlementMethodOptions,
  deliveryMethodOptions,
  contactOptions,
  purchaserOptions,
} from '@/mock/purchaseOrderOptions'
import { mockInventory } from '@/mock/inventory'
import { createPoLineItem } from '@/mock/purchaseOrders'
import { generatePurchaseOrderNo, recalcPoLine } from '@/store/purchaseOrderStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const taxModeExcluding = ref(true)
const itemPickerOpen = ref(false)
const pickedItemKeys = ref([])

const supplierOpts = supplierOptions
const settlementTypeOpts = settlementTypeOptions.map((v) => ({ label: v, value: v }))
const settlementCycleOpts = settlementCycleOptions.map((v) => ({ label: v, value: v }))
const settlementMethodOpts = settlementMethodOptions.map((v) => ({ label: v, value: v }))
const deliveryMethodOpts = deliveryMethodOptions.map((v) => ({ label: v, value: v }))
const purchaserOpts = purchaserOptions.map((v) => ({ label: v, value: v }))
const contactOpts = contactOptions.map((c) => ({ label: c.label, value: c.value, phone: c.phone }))

const taxModeHint = computed(() =>
  taxModeExcluding.value
    ? '当前：按不含税单价算含税（请填不含税单价，含税单价自动计算且不可编辑）'
    : '当前：按含税单价算不含税（请填含税单价，不含税单价自动计算且不可编辑）',
)

const lineColumns = [
  { title: '#', key: 'index', width: 48, align: 'center' },
  { title: '物品编码', dataIndex: 'itemCode', width: 120 },
  { title: '物品名称', dataIndex: 'itemName', width: 120, ellipsis: true },
  { title: '物品类型', dataIndex: 'itemType', width: 90 },
  { title: '类别', dataIndex: 'category', width: 80 },
  { title: '规格型号', dataIndex: 'specModel', width: 100 },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '采购数量', key: 'purchaseQty', width: 100 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '不含税单价', key: 'unitPriceExTax', width: 100 },
  { title: '税率(%)', key: 'taxRate', width: 80 },
  { title: '含税单价', key: 'unitPriceInTax', width: 100 },
  { title: '总价（不含税）', key: 'totalPriceExTax', width: 110, align: 'right' },
  { title: '总价（含税）', key: 'totalPriceInTax', width: 100, align: 'right' },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const itemPickerColumns = [
  { title: '物品编码', dataIndex: 'code', width: 130 },
  { title: '物品名称', dataIndex: 'name', width: 120 },
  { title: '型号规格', dataIndex: 'specModel', width: 100 },
  { title: '材质', dataIndex: 'material', width: 80 },
]

const form = reactive({
  orderNo: '',
  supplier: undefined,
  settlementType: '先款后货',
  settlementCycle: '月结',
  settlementMethod: '现金结算',
  workOrderNo: '',
  deliveryDate: null,
  reminderDate: null,
  deliveryMethod: '定时交货',
  leadTimeDays: 12,
  logisticsNo: '',
  contactPerson: undefined,
  contactPhone: '',
  reqNo: '',
  contractNo: '',
  salesOrderNo: '',
  shippingAddress: '',
  purchaser: 'admin1',
  remark: '',
  lineItems: [],
})

watch(
  () => props.open,
  (val) => {
    if (!val) return
    taxModeExcluding.value = true
    if (props.editRecord) {
      const r = props.editRecord
      form.orderNo = r.orderNo
      form.supplier = r.supplier
      form.settlementType = r.settlementType
      form.settlementCycle = r.settlementCycle
      form.settlementMethod = r.settlementMethod
      form.workOrderNo = r.workOrderNo || ''
      form.deliveryDate = r.deliveryDate ? dayjs(r.deliveryDate) : null
      form.reminderDate = r.reminderDate ? dayjs(r.reminderDate) : null
      form.deliveryMethod = r.deliveryMethod
      form.leadTimeDays = r.leadTimeDays
      form.logisticsNo = r.logisticsNo || ''
      form.contactPerson = r.contactPerson || undefined
      form.contactPhone = r.contactPhone || ''
      form.reqNo = r.reqNo || ''
      form.contractNo = r.contractNo || ''
      form.salesOrderNo = r.salesOrderNo || ''
      form.shippingAddress = r.shippingAddress || ''
      form.purchaser = r.purchaser
      form.remark = r.remark || ''
      form.lineItems = JSON.parse(JSON.stringify(r.lineItems || []))
      return
    }
    resetForm()
  },
)

function resetForm() {
  form.orderNo = ''
  form.supplier = undefined
  form.settlementType = '先款后货'
  form.settlementCycle = '月结'
  form.settlementMethod = '现金结算'
  form.workOrderNo = ''
  form.deliveryDate = null
  form.reminderDate = null
  form.deliveryMethod = '定时交货'
  form.leadTimeDays = 12
  form.logisticsNo = ''
  form.contactPerson = undefined
  form.contactPhone = ''
  form.reqNo = ''
  form.contractNo = ''
  form.salesOrderNo = ''
  form.shippingAddress = ''
  form.purchaser = 'admin1'
  form.remark = ''
  form.lineItems = []
}

function onSupplierChange() {
  /* placeholder for supplier linkage */
}

function onContactChange(name) {
  const c = contactOpts.find((item) => item.value === name)
  if (c?.phone) form.contactPhone = c.phone
}

function openItemPicker() {
  pickedItemKeys.value = []
  itemPickerOpen.value = true
}

function confirmItemPick() {
  pickedItemKeys.value.forEach((code) => {
    const item = mockInventory.find((m) => m.code === code)
    if (!item) return
    if (form.lineItems.some((l) => l.itemCode === code)) return
    const line = createPoLineItem({
      itemCode: item.code,
      itemName: item.name,
      itemType: item.materialType || '物料',
      category: item.supplyType,
      specModel: item.specModel,
      material: item.material,
      purchaseQty: 1,
      unit: item.unit || '个',
      taxRate: 13,
    })
    recalcLineWithMode(line)
    form.lineItems.push(line)
  })
  itemPickerOpen.value = false
}

function recalcLineWithMode(record) {
  const qty = Number(record.purchaseQty) || 0
  const rate = Number(record.taxRate) || 0
  if (taxModeExcluding.value) {
    const ex = Number(record.unitPriceExTax) || 0
    record.unitPriceInTax = Math.round(ex * (1 + rate / 100) * 100) / 100
  } else {
    const inc = Number(record.unitPriceInTax) || 0
    record.unitPriceExTax = Math.round((inc / (1 + rate / 100)) * 100) / 100
  }
  recalcPoLine(record)
  void qty
}

function onLineChange(record) {
  recalcLineWithMode(record)
}

function toggleTaxMode() {
  taxModeExcluding.value = !taxModeExcluding.value
  form.lineItems.forEach(recalcLineWithMode)
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
}

function formatMoney(val) {
  return Number(val || 0).toFixed(2)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.supplier) {
    message.warning('请选择供应商')
    return
  }
  if (!form.deliveryDate) {
    message.warning('请选择交货日期')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条采购清单')
    return
  }

  form.lineItems.forEach(recalcLineWithMode)
  const orderNo = form.orderNo?.trim() || generatePurchaseOrderNo()

  const payload = {
    ...JSON.parse(JSON.stringify(form)),
    orderNo,
    deliveryDate: form.deliveryDate.format('YYYY-MM-DD'),
    reminderDate: form.reminderDate ? form.reminderDate.format('YYYY-MM-DD') : '',
    documentDate: props.editRecord?.documentDate || dayjs().format('YYYY-MM-DD'),
    orderSource: props.editRecord?.orderSource || '新增',
    applyType: props.editRecord?.applyType || '日常采购申请',
    status: props.editRecord?.status || '待审批',
    approvalResult: props.editRecord?.approvalResult || '待审批',
    approverName: props.editRecord?.approverName || '',
    inboundStatus: props.editRecord?.inboundStatus || '未入库',
    creator: props.editRecord?.creator || 'admin1',
    createdAt: props.editRecord?.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    totalQty: form.lineItems.reduce((s, i) => s + (Number(i.purchaseQty) || 0), 0),
    amountExTax: form.lineItems.reduce((s, i) => s + (Number(i.totalPriceExTax) || 0), 0),
    amountInTax: form.lineItems.reduce((s, i) => s + (Number(i.totalPriceInTax) || 0), 0),
  }

  emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  message.success(isEdit.value ? '采购单已更新' : '采购单已保存')
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.section-block {
  margin-bottom: 12px;

  .section-title {
    font-weight: 600;
    font-size: 14px;
  }

  .section-divider {
    margin: 8px 0 12px;
  }
}

.header-form {
  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
    margin-inline-end: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label) {
    flex: 0 0 auto;
    padding-bottom: 0;

    > label {
      height: 24px;
      line-height: 24px;
      font-size: 13px;
      white-space: nowrap;
    }
  }

  :deep(.ant-form-item-control) {
    flex: 1;
    min-width: 0;
  }

  .remark-item {
    :deep(.ant-form-item-label) {
      flex: 0 0 68px;
    }
  }
}

.detail-toolbar {
  margin-bottom: 8px;

  .tax-toggle-btn {
    color: #1677ff;
    border-color: #91caff;
    background: #e6f4ff;
  }

  .tax-hint {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
