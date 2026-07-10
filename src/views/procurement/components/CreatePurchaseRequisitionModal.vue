<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="90%"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="form.reqNo"
                placeholder="留空则系统自动生成"
                allow-clear
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="紧急度">
              <a-select v-model:value="form.urgency" size="small" :options="urgencyOpts" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货日期">
              <a-date-picker
                v-model:value="form.deliveryDate"
                size="small"
                style="width: 100%"
                placeholder="请选择交货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="期望到货日期" required>
              <a-date-picker
                v-model:value="form.estimatedArrivalDate"
                size="small"
                style="width: 100%"
                placeholder="请选择期望到货日期"
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
        <a-button type="primary" size="small" @click="openProductPicker">
          <PlusOutlined />
          添加产品
        </a-button>
      </div>
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1430 }"
        locale="{ emptyText: '暂无数据' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'planPurchaseQty'">
            <a-input-number
              v-model:value="record.planPurchaseQty"
              size="small"
              :min="0"
              :precision="2"
              style="width: 100%"
              @change="onQtyChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'supplierName'">
            <PlanSupplierSelect
              v-model:value="record.supplierName"
              size="small"
              placeholder="请搜索或选择供应商"
            />
          </template>
          <template v-else-if="column.key === 'remark'">
            <a-input
              v-model:value="record.remark"
              size="small"
              allow-clear
              placeholder="请输入备注"
            />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
          </template>
          <template v-else>
            {{ record[column.dataIndex] ?? '—' }}
          </template>
        </template>
      </a-table>
    </div>

    <SelectBomMaterialModal
      v-model:open="productPickerOpen"
      title="添加产品/物料"
      @selected="onProductsSelected"
    />

    <template #footer>
      <a-button size="small" @click="handleCancel">
        <CloseOutlined />
        取消
      </a-button>
      <a-button type="primary" size="small" @click="handleSave">
        <CheckOutlined />
        保存
      </a-button>
    </template>
  </FormCreateShell>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { PlusOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { urgencyOptions } from '@/mock/purchaseRequisitionOptions'
import { mockInventory } from '@/mock/inventory'
import { createLineItem } from '@/mock/purchaseRequisitions'
import {
  addPurchaseRequisition,
  generateReqNo,
  updatePurchaseRequisition,
} from '@/store/purchaseRequisitionStore'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'
import PlanSupplierSelect from '@/views/planning/components/PlanSupplierSelect.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.editRecord?.id))
const { isActive, shellTitle, handleCancel, closeAfterSave } = useFormCreateModal(props, emit, {
  listPath: '/procurement/purchase-req',
  getTitle: () => (isEdit.value ? '编辑采购申请单' : '新增采购申请单'),
})
const productPickerOpen = ref(false)

const urgencyOpts = urgencyOptions.map((v) => ({ label: v, value: v }))

const lineColumns = [
  { title: '序号', key: 'index', width: 56, align: 'center', fixed: 'left' },
  { title: '产品名称', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '产品编码', dataIndex: 'productCode', width: 120 },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 90 },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 72 },
  { title: '库存数', dataIndex: 'stockQty', width: 90, align: 'right' },
  { title: '计划采购数', key: 'planPurchaseQty', width: 110 },
  { title: '供应商', key: 'supplierName', width: 160 },
  { title: '备注', key: 'remark', width: 140 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const form = reactive({
  reqNo: '',
  urgency: '正常',
  deliveryDate: null,
  estimatedArrivalDate: null,
  remark: '',
  lineItems: [],
})

watch(
  () => isActive.value,
  (val) => {
    if (!val) return
    if (props.editRecord) {
      const r = props.editRecord
      form.reqNo = r.reqNo
      form.urgency = r.urgency
      form.deliveryDate = r.deliveryDate ? dayjs(r.deliveryDate) : null
      form.estimatedArrivalDate = r.estimatedArrivalDate ? dayjs(r.estimatedArrivalDate) : null
      form.remark = r.remark || ''
      form.lineItems = normalizeLineItems(r.lineItems || [])
      return
    }
    resetForm()
  },
  { immediate: true },
)

function normalizeLineItems(items) {
  return items.map((line) => ({
    ...line,
    productName: line.productName || line.inventoryName || '',
    productCode: line.productCode || line.inventoryCode || '',
    inventoryName: line.inventoryName || line.productName || '',
    inventoryCode: line.inventoryCode || line.productCode || '',
    drawingNo: line.drawingNo || '',
    remark: line.remark || '',
  }))
}

function resetForm() {
  form.reqNo = ''
  form.urgency = '正常'
  form.deliveryDate = null
  form.estimatedArrivalDate = null
  form.remark = ''
  form.lineItems = []
}

function resolveStockQty(code) {
  const inv = mockInventory.find((m) => m.code === code)
  return inv?.stockQty ?? 0
}

function lineItemCode(line) {
  return line.productCode || line.inventoryCode || ''
}

function openProductPicker() {
  productPickerOpen.value = true
}

function mapPickerToLineItem(payload) {
  const code = payload.code || ''
  const name = payload.name || ''
  return createLineItem({
    productName: name,
    productCode: code,
    inventoryName: name,
    inventoryCode: code,
    specModel: payload.specModel || '',
    material: payload.material || '',
    drawingNo: payload.drawingNo || '',
    materialType: payload.materialType || '零部件',
    supplyType: payload.supplyForm || '',
    unit: payload.inventoryUnit || '件',
    stockQty: resolveStockQty(code),
    demandQty: 1,
    planPurchaseQty: 1,
    supplierName: payload.defaultSupplier || '',
    designatedSupplier: Boolean(payload.defaultSupplier),
    remark: '',
  })
}

function onProductsSelected(rows) {
  rows.forEach((payload) => {
    const code = payload.code || ''
    if (!code) return
    if (form.lineItems.some((l) => lineItemCode(l) === code)) return
    form.lineItems.push(mapPickerToLineItem(payload))
  })
}

function onQtyChange(record) {
  record.demandQty = record.planPurchaseQty
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
}

function handleSave() {
  if (!form.estimatedArrivalDate) {
    message.warning('请选择期望到货日期')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少添加一条采购清单')
    return
  }

  const missingQty = form.lineItems.find(
    (line) => line.planPurchaseQty == null || Number(line.planPurchaseQty) <= 0,
  )
  if (missingQty) {
    message.warning(
      `请填写「${missingQty.productName || missingQty.inventoryName || '明细'}」的计划采购数`,
    )
    return
  }

  const reqNo = form.reqNo?.trim() || generateReqNo()
  const deliveryDate = form.deliveryDate ? form.deliveryDate.format('YYYY-MM-DD') : ''
  const estimatedArrivalDate = form.estimatedArrivalDate.format('YYYY-MM-DD')

  form.lineItems.forEach((line) => {
    line.demandQty = line.planPurchaseQty
    line.deliveryDate = deliveryDate
    line.expectedArrivalDate = estimatedArrivalDate
    line.productName = line.productName || line.inventoryName || ''
    line.productCode = line.productCode || line.inventoryCode || ''
    line.inventoryName = line.productName
    line.inventoryCode = line.productCode
  })

  const payload = {
    ...JSON.parse(JSON.stringify(form)),
    reqNo,
    deliveryDate,
    estimatedArrivalDate,
    orderDate: dayjs().format('YYYY-MM-DD'),
    source: '新增',
    docStatus: '待处理',
    overdueStatus: '未逾期',
    salesOrderNo: props.editRecord?.salesOrderNo || '',
    purchaseOrderNo: props.editRecord?.purchaseOrderNo || '',
    operator: '管理员',
    creator: props.editRecord?.creator || '管理员',
    createdAt: props.editRecord?.createdAt || dayjs().format('YYYY-MM-DD HH:mm'),
    updatedAt: dayjs().format('YYYY-MM-DD HH:mm'),
  }

  if (props.pageMode) {
    if (isEdit.value) {
      updatePurchaseRequisition(props.editRecord.id, payload)
    } else {
      addPurchaseRequisition({ ...payload, id: `pr-${Date.now()}` })
    }
  } else {
    emit('saved', { isEdit: isEdit.value, id: props.editRecord?.id, data: payload })
  }
  message.success(isEdit.value ? '采购申请已更新' : '采购申请已保存')
  closeAfterSave()
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
}
</style>
