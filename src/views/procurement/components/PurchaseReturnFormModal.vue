<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    class="purchase-return-form"
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="退货单号">
              <a-input
                v-model:value="form.returnNo"
                size="small"
                allow-clear
                placeholder="可自定义，留空系统自动生成"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="采购订单" required>
              <PurchaseOrderSearchSelect
                v-model:value="form.purchaseOrderNo"
                :disabled="isEdit"
                @change="onPurchaseOrderChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="供应商">
              <a-input
                :value="form.supplier"
                disabled
                size="small"
                placeholder="选择采购订单后带出"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="采购员">
              <a-input
                :value="form.purchaser"
                disabled
                size="small"
                placeholder="选择采购订单后带出"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="退货地址">
              <a-input
                v-model:value="form.returnAddress"
                size="small"
                allow-clear
                placeholder="请输入退货地址"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="备注" class="remark-item">
              <a-input
                v-model:value="form.remark"
                size="small"
                allow-clear
                placeholder="请输入备注"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title-row">
        <div class="section-title">退货清单</div>
        <a-space :size="8">
          <a-button size="small" :disabled="!lineItems.length" @click="invertSelection">
            反选
          </a-button>
          <a-button size="small" danger :disabled="!selectedRowKeys.length" @click="batchRemove">
            批量移出
          </a-button>
        </a-space>
      </div>
      <a-divider class="section-divider" />
      <a-table
        :columns="lineColumns"
        :data-source="lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1680 }"
        :row-selection="rowSelection"
      >
        <template #headerCell="{ column }">
          <template v-if="column.required">
            <span class="col-title-required">
              <span class="required-star">*</span>{{ column.title }}
            </span>
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'purchaseQty'">
            {{ formatQtyWithUnit(record.purchaseQty, record.purchaseUnit || record.unit) }}
          </template>
          <template v-else-if="column.key === 'receivedQty'">
            {{ formatQtyWithUnit(record.receivedQty, record.purchaseUnit || record.unit) }}
          </template>
          <template v-else-if="column.key === 'returnQty'">
            <a-input-number
              v-model:value="record.returnQty"
              :min="0"
              :precision="4"
              size="small"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'settleUnit'">
            {{ record.settleUnit || '—' }}
          </template>
          <template v-else-if="column.key === 'settleQty'">
            <a-input-number
              v-if="record.settleUnit"
              v-model:value="record.settleQty"
              :min="0"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              size="small"
              style="width: 100%"
              placeholder="实重"
            />
            <span v-else>—</span>
          </template>
          <template v-else-if="column.key === 'unit'">
            <a-select
              v-model:value="record.unit"
              size="small"
              style="width: 100%"
              :options="
                (record.unitOptions || [record.unit])
                  .filter(Boolean)
                  .map((u) => ({ label: u, value: u }))
              "
            />
          </template>
          <template v-else-if="column.key === 'shipWarehouse'">
            <a-select
              v-model:value="record.shipWarehouse"
              size="small"
              style="width: 100%"
              :options="warehouseOpts"
              placeholder="请选择"
            />
          </template>
          <template v-else-if="column.key === 'returnType'">
            <a-select
              v-model:value="record.returnType"
              size="small"
              style="width: 100%"
              :options="returnTypeOpts"
              placeholder="请选择"
            />
          </template>
          <template v-else-if="column.key === 'remark'">
            <a class="remark-link" @click.prevent="openRemark(record)">
              <span class="remark-text">{{ record.remark || '填写备注' }}</span>
              <EditOutlined />
            </a>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openLineEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="removeLine(record)">
                移出本单
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <PurchaseReturnLineEditModal
      v-model:open="lineEditOpen"
      :line="lineEditTarget"
      @saved="onLineEditSaved"
    />

    <a-modal
      v-model:open="remarkOpen"
      title="填写备注"
      :mask-closable="false"
      destroy-on-close
      @ok="saveRemark"
    >
      <a-textarea v-model:value="remarkDraft" :rows="4" placeholder="请输入备注" />
    </a-modal>

    <template #footer>
      <a-button size="small" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" :loading="saving" @click="handleOk">确定</a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { EditOutlined } from '@ant-design/icons-vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import { purchaseOrderState } from '@/store/purchaseOrderStore'
import { getDictOptions, systemDictState } from '@/store/systemDictStore'
import {
  addPurchaseReturn,
  updatePurchaseReturn,
  canEditPurchaseReturn,
} from '@/store/purchaseReturnStore'
import { buildReturnLinesFromPurchaseOrder, formatQtyWithUnit } from '@/utils/purchaseReturnLine'
import { inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import PurchaseOrderSearchSelect from './PurchaseOrderSearchSelect.vue'
import PurchaseReturnLineEditModal from './PurchaseReturnLineEditModal.vue'

const props = defineProps({
  open: Boolean,
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '/procurement/purchase-returns' },
  record: { type: Object, default: null },
  /** 新增时预填采购单号 */
  initialPurchaseOrderNo: { type: String, default: '' },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))
const saving = ref(false)
const selectedRowKeys = ref([])
const lineItems = ref([])
const lineEditOpen = ref(false)
const lineEditTarget = ref(null)
const remarkOpen = ref(false)
const remarkDraft = ref('')
const remarkTargetId = ref('')

const form = reactive({
  returnNo: '',
  purchaseOrderNo: '',
  purchaseOrderId: '',
  supplier: '',
  purchaser: '',
  returnAddress: '',
  remark: '',
  shipWarehouse: '',
})

const { shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: props.listPath,
  getTitle: () => (isEdit.value ? '编辑采购退货单' : '新增采购退货单'),
})

const warehouseOpts = warehouseOptions

const returnTypeOpts = computed(() => {
  void systemDictState.dicts
  const opts = getDictOptions('purchase_return_type')
  return opts.length
    ? opts
    : [
        { label: '换货', value: '换货' },
        { label: '退货', value: '退货' },
      ]
})

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '变体属性', dataIndex: 'variantSummary', width: 120, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '采购数量', key: 'purchaseQty', width: 110 },
  { title: '已入库数量', key: 'receivedQty', width: 110 },
  { title: '退货数量', key: 'returnQty', width: 120, required: true },
  { title: '单位', key: 'unit', width: 100, required: true },
  { title: '结算单位', dataIndex: 'settleUnit', key: 'settleUnit', width: 80 },
  { title: '结算数量', key: 'settleQty', width: 110 },
  { title: '出货仓库', key: 'shipWarehouse', width: 120, required: true },
  { title: '退货类型', key: 'returnType', width: 110, required: true },
  { title: '备注', key: 'remark', width: 140 },
  { title: '操作', key: 'action', width: 140, fixed: 'right' },
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys) => {
    selectedRowKeys.value = keys
  },
}))

function resetForm() {
  form.returnNo = ''
  form.purchaseOrderNo = ''
  form.purchaseOrderId = ''
  form.supplier = ''
  form.purchaser = ''
  form.returnAddress = ''
  form.remark = ''
  form.shipWarehouse = ''
  lineItems.value = []
  selectedRowKeys.value = []
}

function loadRecord(record) {
  form.returnNo = record.returnNo || ''
  form.purchaseOrderNo = record.purchaseOrderNo || ''
  form.purchaseOrderId = record.purchaseOrderId || ''
  form.supplier = record.supplier || ''
  form.purchaser = record.purchaser || ''
  form.returnAddress = record.returnAddress || ''
  form.remark = record.remark || ''
  form.shipWarehouse = record.shipWarehouse || ''
  lineItems.value = (record.lineItems || []).map((l) => ({
    ...l,
    unitOptions: l.unitOptions?.length ? [...l.unitOptions] : [l.unit].filter(Boolean),
  }))
  selectedRowKeys.value = []
}

watch(
  () => [props.pageMode, props.open, props.record?.id, props.initialPurchaseOrderNo],
  () => {
    if (!props.pageMode && !props.open) return
    if (props.record?.id) {
      if (!canEditPurchaseReturn(props.record)) {
        message.warning('仅「新建」状态的退货单可编辑')
        handleCancel()
        return
      }
      loadRecord(props.record)
      return
    }
    resetForm()
    const prefillNo = String(props.initialPurchaseOrderNo || '').trim()
    if (prefillNo) onPurchaseOrderChange(prefillNo)
  },
  { immediate: true },
)

function findPoByOrderNo(orderNo) {
  const no = String(orderNo || '').trim()
  if (!no) return null
  return purchaseOrderState.orders.find((o) => o.orderNo === no) || null
}

function onPurchaseOrderChange(orderNo) {
  const po = findPoByOrderNo(orderNo)
  if (!po) {
    form.purchaseOrderId = ''
    form.supplier = ''
    form.purchaser = ''
    form.shipWarehouse = ''
    lineItems.value = []
    selectedRowKeys.value = []
    return
  }
  form.purchaseOrderNo = po.orderNo
  form.purchaseOrderId = po.id
  form.supplier = po.supplier || ''
  form.purchaser = po.purchaser || ''
  form.shipWarehouse = po.receivingWarehouse || ''
  if (!form.returnAddress && po.shippingAddress) {
    form.returnAddress = po.shippingAddress
  }
  lineItems.value = buildReturnLinesFromPurchaseOrder(po)
  selectedRowKeys.value = []
}

function invertSelection() {
  const all = lineItems.value.map((l) => l.id)
  const set = new Set(selectedRowKeys.value)
  selectedRowKeys.value = all.filter((id) => !set.has(id))
}

function removeLine(record) {
  Modal.confirm({
    title: '移出本单',
    content: `确定将「${record.productName || record.productCode || '明细'}」移出本单吗？`,
    okType: 'danger',
    onOk: () => {
      lineItems.value = lineItems.value.filter((l) => l.id !== record.id)
      selectedRowKeys.value = selectedRowKeys.value.filter((id) => id !== record.id)
    },
  })
}

function batchRemove() {
  if (!selectedRowKeys.value.length) {
    message.warning('请先勾选明细')
    return
  }
  Modal.confirm({
    title: '批量移出',
    content: `确定移出选中的 ${selectedRowKeys.value.length} 行明细吗？`,
    okType: 'danger',
    onOk: () => {
      const set = new Set(selectedRowKeys.value)
      lineItems.value = lineItems.value.filter((l) => !set.has(l.id))
      selectedRowKeys.value = []
    },
  })
}

function openLineEdit(record) {
  lineEditTarget.value = record
  lineEditOpen.value = true
}

function onLineEditSaved(patch) {
  const target = lineItems.value.find((l) => l.id === lineEditTarget.value?.id)
  if (!target) return
  Object.assign(target, patch)
}

function openRemark(record) {
  remarkTargetId.value = record.id
  remarkDraft.value = record.remark || ''
  remarkOpen.value = true
}

function saveRemark() {
  const target = lineItems.value.find((l) => l.id === remarkTargetId.value)
  if (target) target.remark = String(remarkDraft.value || '').trim()
  remarkOpen.value = false
}

function validate() {
  if (!form.purchaseOrderNo) {
    message.warning('请选择采购订单')
    return false
  }
  if (!lineItems.value.length) {
    message.warning('退货清单不能为空')
    return false
  }
  const invalidQty = lineItems.value.find((l) => !(Number(l.returnQty) > 0))
  if (invalidQty) {
    message.warning(`请填写「${invalidQty.productName || invalidQty.productCode}」的退货数量`)
    return false
  }
  const settleInvalid = lineItems.value.find(
    (l) => String(l.settleUnit || '').trim() && !(Number(l.settleQty) > 0),
  )
  if (settleInvalid) {
    message.warning(
      `「${settleInvalid.productName || settleInvalid.productCode}」已启用结算单位，请填写结算数量（${settleInvalid.settleUnit}）`,
    )
    return false
  }
  const invalidUnit = lineItems.value.find((l) => !l.unit)
  if (invalidUnit) {
    message.warning(`请选择「${invalidUnit.productName || invalidUnit.productCode}」的单位`)
    return false
  }
  const invalidWh = lineItems.value.find((l) => !l.shipWarehouse)
  if (invalidWh) {
    message.warning(`请选择「${invalidWh.productName || invalidWh.productCode}」的出货仓库`)
    return false
  }
  return true
}

function buildPayload() {
  const warehouses = [...new Set(lineItems.value.map((l) => l.shipWarehouse).filter(Boolean))]
  return {
    returnNo: String(form.returnNo || '').trim(),
    purchaseOrderNo: form.purchaseOrderNo,
    purchaseOrderId: form.purchaseOrderId,
    supplier: form.supplier,
    purchaser: form.purchaser,
    returnAddress: String(form.returnAddress || '').trim(),
    remark: String(form.remark || '').trim(),
    shipWarehouse: warehouses[0] || form.shipWarehouse || '',
    lineItems: lineItems.value.map((l) => ({ ...l })),
  }
}

async function handleOk() {
  if (!validate()) return
  saving.value = true
  try {
    const payload = buildPayload()
    if (isEdit.value) {
      const updated = updatePurchaseReturn(props.record.id, payload)
      if (!updated) {
        message.error('保存失败')
        return
      }
      message.success('采购退货单已保存')
      emit('saved', updated)
    } else {
      const created = addPurchaseReturn(payload)
      message.success(`已创建退货单 ${created.returnNo}`)
      emit('saved', created)
    }
    closeAfterSave()
  } finally {
    saving.value = false
  }
}
</script>

<script>
export default { name: 'PurchaseReturnFormModal' }
</script>

<style lang="less" scoped>
.section-block {
  background: #fff;
  border-radius: 6px;
  padding: 12px 16px 16px;
  margin: 0 12px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.section-divider {
  margin: 8px 0 12px;
}

.horizontal-form {
  width: 100%;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }

  :deep(.ant-form-item-row) {
    flex-wrap: nowrap;
    align-items: center;
  }

  :deep(.ant-form-item-label > label) {
    height: 24px;
    line-height: 24px;
    font-size: 13px;
  }
}

.remark-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1677ff;
  max-width: 100%;

  .remark-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100px;
  }
}

.col-title-required .required-star {
  color: #ff4d4f;
  margin-right: 2px;
  font-family: SimSun, sans-serif;
}
</style>
