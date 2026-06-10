<template>
  <a-modal
    :open="open"
    title="生成采购申请单"
    width="90%"
    :mask-closable="false"
    destroy-on-close
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">基础信息</div>
      <a-divider class="section-divider" />
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="8">
            <a-form-item label="申请单号">
              <a-input
                v-model:value="form.reqNo"
                placeholder="系统生成"
                allow-clear
                size="small"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="销售单号">
              <a-input :value="order?.orderNo || ''" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="期望到货日期" required>
              <a-date-picker
                v-model:value="form.estimatedArrivalDate"
                size="small"
                style="width: 100%"
                placeholder="请选择"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="收货仓库" required>
              <a-select
                v-model:value="form.receivingWarehouse"
                size="small"
                placeholder="请选择"
                :options="warehouseOpts"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="交货日期">
              <a-date-picker
                v-model:value="form.deliveryDate"
                size="small"
                style="width: 100%"
                placeholder="请选择"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea
                v-model:value="form.remark"
                :rows="2"
                :maxlength="500"
                placeholder="请输入"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <div class="section-block">
      <div class="section-title">采购清单</div>
      <a-divider class="section-divider" />
      <a-table
        :columns="lineColumns"
        :data-source="form.lineItems"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        locale="{ emptyText: '暂无数据' }"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'planPurchaseQty'">
            <a-input-number
              v-model:value="record.planPurchaseQty"
              size="small"
              :min="0"
              :precision="3"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'designatedSupplier'">
            <a-switch
              v-model:checked="record.designatedSupplier"
              size="small"
              @change="(checked) => onDesignatedSupplierChange(record, checked)"
            />
          </template>
          <template v-else-if="column.key === 'supplierName'">
            <a-select
              v-model:value="record.supplierName"
              size="small"
              allow-clear
              show-search
              placeholder="请选择"
              :disabled="!record.designatedSupplier"
              :options="supplierOpts"
              :filter-option="filterSelectOption"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'receivingWarehouse'">
            <a-select
              v-model:value="record.receivingWarehouse"
              size="small"
              allow-clear
              placeholder="请选择"
              :options="warehouseOpts"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'remark'">
            <a-input v-model:value="record.remark" size="small" placeholder="请输入" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="removeLine(index)">删除</a-button>
          </template>
          <template v-else>
            {{ formatCell(record, column) }}
          </template>
        </template>
        <template #summary>
          <a-table-summary v-if="form.lineItems.length">
            <a-table-summary-row>
              <a-table-summary-cell
                v-for="(col, colIndex) in lineColumns"
                :key="col.key || col.dataIndex"
                :index="colIndex"
              >
                <template v-if="colIndex === 0">合计</template>
                <template v-else-if="col.key === 'planPurchaseQty'">
                  {{ formatQty(totalPlanQty) }}
                </template>
              </a-table-summary-cell>
            </a-table-summary-row>
          </a-table-summary>
        </template>
      </a-table>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleSave">保存</a-button>
    </template>
  </a-modal>
</template>

<script>
export default { name: 'GeneratePurchaseRequisitionModal' }
</script>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { warehouseOptions } from '@/mock/purchaseRequisitionOptions'
import { createLineItem } from '@/mock/purchaseRequisitions'
import { planSupplierOptions } from '@/utils/productionPlanMaterial'
import {
  buildRequisitionFromMaterials,
  generatePlanReqNo,
  isReqNoTaken,
} from '@/store/purchaseRequisitionStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  order: { type: Object, default: null },
  materials: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'saved'])

const warehouseOpts = warehouseOptions
const supplierOpts = planSupplierOptions

const lineColumns = [
  { title: '物料名称', dataIndex: 'inventoryName', width: 140, ellipsis: true, fixed: 'left' },
  { title: '物料编码', dataIndex: 'inventoryCode', width: 120, fixed: 'left' },
  { title: '型号规格', dataIndex: 'specModel', width: 100 },
  { title: '规格属性', dataIndex: 'specAttr', width: 90 },
  { title: '材质', dataIndex: 'material', width: 80 },
  { title: '物料类型', dataIndex: 'materialType', width: 90 },
  { title: '计量单位', dataIndex: 'unit', width: 80 },
  { title: '供方类型', dataIndex: 'supplyType', width: 90 },
  { title: '库存数量', dataIndex: 'stockQty', width: 90, align: 'right' },
  { title: '可用库存', dataIndex: 'availableStock', width: 90, align: 'right' },
  { title: '在途库存', dataIndex: 'inTransitQty', width: 90, align: 'right' },
  { title: '需求数', dataIndex: 'demandQty', width: 90, align: 'right' },
  { title: '缺口数', dataIndex: 'gapQty', width: 90, align: 'right' },
  { title: '计划数量', key: 'planPurchaseQty', width: 100, align: 'right' },
  { title: '指定供应商', key: 'designatedSupplier', width: 96, align: 'center' },
  { title: '供应商名称', key: 'supplierName', width: 140 },
  { title: '收货仓库', key: 'receivingWarehouse', width: 120 },
  { title: '补充说明', key: 'remark', width: 120 },
  { title: '操作', key: 'action', width: 70, fixed: 'right' },
]

const tableScrollX = computed(() =>
  lineColumns.reduce((sum, col) => sum + (col.width || 80), 0),
)

const form = reactive({
  reqNo: '',
  estimatedArrivalDate: null,
  deliveryDate: null,
  receivingWarehouse: undefined,
  remark: '',
  lineItems: [],
})

function defaultDeliveryDate() {
  const order = props.order
  if (!order) return null
  const date = order.planAssemblyDate || order.deliveryDate
  return date ? dayjs(date) : null
}

const totalPlanQty = computed(() =>
  form.lineItems.reduce((sum, line) => sum + (Number(line.planPurchaseQty) || 0), 0),
)

watch(
  () => props.open,
  (val) => {
    if (!val) return
    resetForm()
    initLineItems()
  },
)

watch(
  () => form.receivingWarehouse,
  (wh) => {
    if (!wh) return
    form.lineItems.forEach((line) => {
      if (!line.receivingWarehouse) line.receivingWarehouse = wh
    })
  },
)

function resetForm() {
  form.reqNo = ''
  form.estimatedArrivalDate = null
  form.deliveryDate = defaultDeliveryDate()
  form.receivingWarehouse = undefined
  form.remark = props.order?.remark || ''
  form.lineItems = []
}

function initLineItems() {
  const deliveryDate = form.deliveryDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
  form.lineItems = props.materials.map((m) => {
    const demandQty = m.demandQty ?? 0
    const gapQty = m.gapQty ?? Math.max(0, demandQty - (m.availableStock ?? 0))
    return createLineItem({
      inventoryName: m.name,
      inventoryCode: m.code,
      specModel: m.spec,
      specAttr: m.specAttr || '',
      material: m.material || '',
      materialType: m.type || '零部件',
      supplyType: m.supplyType,
      unit: m.unit || '件',
      stockQty: m.stockQty ?? 0,
      availableStock: m.availableStock ?? 0,
      inTransitQty: m.inTransitQty ?? 0,
      demandQty,
      gapQty,
      planPurchaseQty: gapQty || m.planQty || 0,
      supplierName: m.supplier || '',
      designatedSupplier: Boolean(m.designateSupplier || m.supplier),
      receivingWarehouse: form.receivingWarehouse || '',
      remark: m.remark || '',
      deliveryDate,
      expectedArrivalDate: deliveryDate,
    })
  })
}

function formatQty(val) {
  const num = Number(val)
  if (Number.isNaN(num)) return '0'
  return Number.isInteger(num) ? String(num) : num.toFixed(3).replace(/\.?0+$/, '')
}

function formatCell(record, column) {
  const val = record[column.dataIndex]
  if (val === 0) return '0'
  return val ?? '-'
}

function filterSelectOption(input, option) {
  return (option?.label || '').toLowerCase().includes(input.toLowerCase())
}

function onDesignatedSupplierChange(record, checked) {
  if (!checked) record.supplierName = ''
}

function removeLine(index) {
  form.lineItems.splice(index, 1)
}

function handleCancel() {
  emit('update:open', false)
}

function handleSave() {
  if (!form.estimatedArrivalDate) {
    message.warning('请选择期望到货日期')
    return
  }
  if (!form.receivingWarehouse) {
    message.warning('请选择收货仓库')
    return
  }
  if (!form.lineItems.length) {
    message.warning('请至少保留一条采购明细')
    return
  }
  const invalidQty = form.lineItems.some((l) => !l.planPurchaseQty || l.planPurchaseQty <= 0)
  if (invalidQty) {
    message.warning('计划数量须大于 0')
    return
  }
  const missingSupplier = form.lineItems.find(
    (l) => l.designatedSupplier && !String(l.supplierName || '').trim(),
  )
  if (missingSupplier) {
    message.warning(`「${missingSupplier.inventoryName}」已指定供应商，请填写供应商名称`)
    return
  }
  const missingWarehouse = form.lineItems.find((l) => !l.receivingWarehouse)
  if (missingWarehouse) {
    message.warning(`请为「${missingWarehouse.inventoryName}」选择收货仓库`)
    return
  }

  const reqNo = form.reqNo?.trim() || generatePlanReqNo()
  if (isReqNoTaken(reqNo)) {
    message.warning(`申请单号「${reqNo}」已存在，请更换`)
    return
  }

  const deliveryDate = form.deliveryDate?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
  const estimatedArrivalDate = form.estimatedArrivalDate.format('YYYY-MM-DD')
  const lineItems = form.lineItems.map((line) => ({
    ...line,
    deliveryDate,
    expectedArrivalDate: estimatedArrivalDate,
    receivingWarehouse: line.receivingWarehouse || form.receivingWarehouse,
  }))

  const requisition = buildRequisitionFromMaterials(props.materials, props.order, {
    reqNo,
    remark: form.remark,
    receivingWarehouse: form.receivingWarehouse,
    deliveryDate,
    estimatedArrivalDate,
    lineItems,
  })

  emit('saved', requisition)
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
</style>
