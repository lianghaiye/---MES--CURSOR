<template>
  <FormCreateShell
    :page-mode="pageMode"
    :open="open"
    :title="shellTitle"
    width="1100px"
    class="inventory-deduct-edit-modal"
    @cancel="onShellCancel"
    @update:open="(val) => emit('update:open', val)"
  >
    <div class="form-layout">
      <DetailSectionCard title="基本信息">
        <div class="deduct-basic-section">
          <div class="meta-bar">
            <div v-for="item in metaItems" :key="item.key" class="meta-item">
              <span class="field-label">{{ item.label }}</span>
              <span class="field-value" :title="item.value">{{ item.value }}</span>
            </div>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="field-label">工单号</span>
              <span class="field-value" :title="basicInfo.workOrderNo">{{
                basicInfo.workOrderNo
              }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">产品名称</span>
              <span class="field-value" :title="basicInfo.productName">{{
                basicInfo.productName
              }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">产品编码</span>
              <span class="field-value" :title="basicInfo.productCode">{{
                basicInfo.productCode
              }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">规格型号</span>
              <span class="field-value" :title="basicInfo.productSpec">{{
                basicInfo.productSpec
              }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">材质</span>
              <span class="field-value" :title="basicInfo.material">{{ basicInfo.material }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">变体属性</span>
              <span class="field-value" :title="basicInfo.variantSummary">{{
                basicInfo.variantSummary
              }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">图号</span>
              <span class="field-value" :title="basicInfo.drawingNo">{{
                basicInfo.drawingNo
              }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">报工数量</span>
              <span class="field-value">{{ basicInfo.reportQty }}</span>
            </div>
            <div class="info-item">
              <span class="field-label">EBOM</span>
              <span class="field-value" :title="basicInfo.ebomLabel">{{
                basicInfo.ebomLabel
              }}</span>
            </div>
            <div class="info-item info-item-warehouse">
              <span class="field-label">扣减仓库</span>
              <span class="field-value field-value-control">
                <a-select
                  v-model:value="form.warehouseKey"
                  :options="warehouseOpts"
                  show-search
                  option-filter-prop="label"
                  placeholder="请选择扣减仓库"
                  size="small"
                  style="width: 100%; max-width: 280px"
                />
              </span>
            </div>
          </div>
        </div>
      </DetailSectionCard>

      <DetailSectionCard title="扣减明细">
        <div class="line-toolbar">
          <a-button type="primary" size="small" @click="pickerOpen = true">
            <PlusOutlined />
            添加物料
          </a-button>
        </div>
        <a-table
          :columns="columns"
          :data-source="form.lines"
          row-key="id"
          size="small"
          bordered
          :pagination="false"
          :scroll="{ x: 1480 }"
        >
          <template #headerCell="{ column }">
            <template v-if="column.key === 'stockDisplay'">
              <span class="col-title-with-tip">
                当前库存量
                <a-tooltip :title="STOCK_DISPLAY_TIP">
                  <InfoCircleOutlined class="col-tip-icon" />
                </a-tooltip>
              </span>
            </template>
            <template v-else>{{ column.title }}</template>
          </template>
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.key === 'index'">
              {{ index + 1 }}
            </template>
            <template v-else-if="column.key === 'lineStatus'">
              <span class="line-status-tag" :class="lineStatusClass(record.status)">
                {{ lineStatusLabel(record.status) }}
              </span>
            </template>
            <template v-else-if="column.key === 'issueMode'">
              <a-tag
                :color="
                  (record.issueMode || (record.isBackflush ? '倒冲' : '领料')) === '倒冲'
                    ? 'orange'
                    : 'blue'
                "
              >
                {{ record.issueMode || (record.isBackflush ? '倒冲' : '领料') }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'blankSizeText'">
              {{ record.blankSizeText || '—' }}
            </template>
            <template v-else-if="column.key === 'stockDisplay'">
              <span class="stock-display">{{ formatStockDisplay(record) }}</span>
            </template>
            <template v-else-if="column.key === 'unitUsage'">
              {{ formatUnitUsage(record) }}
            </template>
            <template v-else-if="column.key === 'shouldQty'">
              {{ formatShouldQty(record) }}
            </template>
            <template v-else-if="column.key === 'planQty'">
              <a-input-number
                v-model:value="record.planQty"
                :min="0"
                :precision="3"
                size="small"
                style="width: 100%"
                :disabled="record.deductible === false"
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" size="small" danger @click="form.lines.splice(index, 1)">
                删除
              </a-button>
            </template>
          </template>
        </a-table>
      </DetailSectionCard>
    </div>

    <template #footer>
      <a-button @click="onShellCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleOk">保存</a-button>
    </template>
  </FormCreateShell>

  <SelectBomMaterialModal
    v-model:open="pickerOpen"
    :multiple="true"
    :include-spu-templates="false"
    @selected="onMaterialsPicked"
  />
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined, PlusOutlined } from '@ant-design/icons-vue'
import DetailSectionCard from '@/components/DetailSectionCard.vue'
import FormCreateShell from '@/components/FormCreateShell.vue'
import { useFormCreateModal } from '@/composables/useFormCreateModal'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { workOrderState } from '@/store/workOrderStore'
import {
  getMaterialDeductLockedQty,
  materialRequisitionState,
  updatePendingMaterialDeduct,
} from '@/store/materialRequisitionStore'
import {
  MATERIAL_DEDUCT_STATUS,
  normalizeMaterialDeductStatus,
} from '@/mock/materialRequisitionRecords'
import { getStockQty, stockState } from '@/store/stockStore'
import { formatDeductEbomLabel, resolveBackflushWarehouse } from '@/utils/backflushDeduct'
import { formatNumber } from '@/utils/numberFormat'
import SelectBomMaterialModal from '@/views/product-process/components/SelectBomMaterialModal.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  pageMode: { type: Boolean, default: false },
  listPath: { type: String, default: '' },
  editRecord: { type: Object, default: null },
  /** @deprecated 兼容旧调用，优先使用 editRecord */
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const activeRecord = computed(() => props.editRecord || props.record)

const {
  isActive,
  shellTitle,
  handleCancel: onShellCancel,
  closeAfterSave,
} = useFormCreateModal(props, emit, {
  listPath: '/inventory/deduct-records',
  getTitle: () => {
    const no = activeRecord.value?.deductNo
    return no ? `编辑扣减记录 ${no}` : '编辑待确认'
  },
})

const pickerOpen = ref(false)
const saving = ref(false)
const form = reactive({
  warehouseKey: '',
  lines: [],
})

const warehouseOpts = ref([])

const STOCK_DISPLAY_TIP =
  '展示为 锁定量/库存量。锁定量=所选仓库下全部待确认扣减单对该物料的预扣合计（含本单及其他单，非仅本单）；库存量=所选仓库现存量。'

const relatedWorkOrder = computed(() => {
  void workOrderState.orders
  const row = activeRecord.value
  if (!row) return null
  return (
    workOrderState.orders.find(
      (o) =>
        (row.workOrderId && o.id === row.workOrderId) ||
        (row.workOrderNo && o.code === row.workOrderNo),
    ) || null
  )
})

function display(val) {
  const t = val !== undefined && val !== null ? String(val).trim() : ''
  return t || '—'
}

const basicInfo = computed(() => {
  const row = activeRecord.value || {}
  const wo = relatedWorkOrder.value || {}
  const ebomLabel = formatDeductEbomLabel(row) || formatDeductEbomLabel(wo) || ''
  return {
    workOrderNo: display(row.workOrderNo || wo.code),
    productName: display(row.productName || wo.productName),
    productCode: display(row.productCode || wo.materialCode || wo.productCode || wo.itemCode),
    productSpec: display(row.productSpec || wo.specModel || wo.productSpec),
    material: display(row.material || wo.material),
    variantSummary: display(row.variantSummary || wo.variantSummary),
    drawingNo: display(row.drawingNo || wo.drawingNo),
    reportQty: display(row.reportQty),
    ebomLabel: display(ebomLabel),
  }
})

const metaItems = computed(() => {
  const row = activeRecord.value || {}
  return [
    { key: 'status', label: '状态', value: display(row.status) },
    { key: 'creator', label: '创建人', value: display(row.creator || row.applicant) },
    { key: 'createdAt', label: '创建时间', value: display(row.createdAt) },
    {
      key: 'operator',
      label: '操作人',
      value: display(row.confirmer || row.auditor || row.operator),
    },
    {
      key: 'operatedAt',
      label: '操作时间',
      value: display(row.confirmedAt || row.auditedAt || row.operatedAt),
    },
    { key: 'deductTime', label: '扣减时间', value: display(row.deductTime) },
  ]
})

const selectedWarehouseName = computed(() => {
  if (!form.warehouseKey) return ''
  return String(form.warehouseKey.split('|')[0] || '').trim()
})

const columns = [
  { title: '序号', key: 'index', width: 56, align: 'center' },
  { title: '状态', key: 'lineStatus', width: 96 },
  { title: '物料编码', dataIndex: 'materialCode', key: 'materialCode', width: 110 },
  { title: '物料名称', dataIndex: 'materialName', key: 'materialName', width: 120 },
  { title: '发料方式', key: 'issueMode', width: 88 },
  { title: '规格型号', dataIndex: 'specModel', key: 'specModel', width: 100, ellipsis: true },
  { title: '材质', dataIndex: 'material', key: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', key: 'drawingNo', width: 100, ellipsis: true },
  {
    title: '变体属性',
    dataIndex: 'variantSummary',
    key: 'variantSummary',
    width: 110,
    ellipsis: true,
  },
  { title: '下料尺寸', key: 'blankSizeText', width: 130, ellipsis: true },
  { title: '当前库存量', key: 'stockDisplay', width: 130 },
  { title: 'BOM单位用量', key: 'unitUsage', width: 110, align: 'right' },
  { title: '应扣', key: 'shouldQty', width: 80, align: 'right' },
  { title: '扣减数量', key: 'planQty', width: 100 },
  { title: '操作', key: 'action', width: 70 },
]

function lineStatusLabel(status) {
  const s = normalizeMaterialDeductStatus(status)
  if (s === MATERIAL_DEDUCT_STATUS.PENDING) return '待扣减'
  if (s === MATERIAL_DEDUCT_STATUS.SUCCESS) return '扣减成功'
  if (s === MATERIAL_DEDUCT_STATUS.FAILED) return '扣减失败'
  return s || '待扣减'
}

function lineStatusClass(status) {
  const s = normalizeMaterialDeductStatus(status)
  if (s === MATERIAL_DEDUCT_STATUS.SUCCESS) return 'is-success'
  if (s === MATERIAL_DEDUCT_STATUS.FAILED) return 'is-failed'
  if (s === MATERIAL_DEDUCT_STATUS.PENDING) return 'is-pending'
  return ''
}

function resolveUnitUsage(line, reportQty) {
  const fromBom = Number(line?.unitUsage ?? line?.unitQty)
  if (fromBom > 0) return fromBom
  const rq = Number(reportQty) || 0
  const pq = Number(line?.planQty) || 0
  if (rq > 0 && pq > 0) return Math.round((pq / rq) * 1000) / 1000
  return pq > 0 ? pq : 0
}

function formatUnitUsage(line) {
  const n = resolveUnitUsage(line, activeRecord.value?.reportQty)
  if (!(n > 0)) return '—'
  return formatNumber(n, 3, { empty: '—' })
}

function resolveShouldQty(line) {
  const unitUsage = resolveUnitUsage(line, activeRecord.value?.reportQty)
  const reportQty = Number(activeRecord.value?.reportQty) || 0
  if (!(unitUsage > 0) || !(reportQty > 0)) return 0
  return Math.round(unitUsage * reportQty * 1000) / 1000
}

function formatShouldQty(line) {
  const n = resolveShouldQty(line)
  if (!(n > 0)) return '—'
  return formatNumber(n, 3, { empty: '—' })
}

function formatStockDisplay(line) {
  void materialRequisitionState.records
  void stockState.records
  const code = line?.materialCode
  const wh = selectedWarehouseName.value
  if (!code || !wh) return '—'
  const locked = getMaterialDeductLockedQty(code, { warehouseName: wh })
  const onHand = getStockQty(wh, code)
  const a = formatNumber(locked, 3, { empty: '0' })
  const b = formatNumber(onHand, 3, { empty: '0' })
  return `${a} / ${b}`
}

function loadWarehouses() {
  warehouseOpts.value = warehouseState.warehouses
    .filter((w) => w.enabled !== false)
    .map((w) => ({
      label: `${w.name}${w.code ? ` (${w.code})` : ''}`,
      value: `${w.name}|${w.code || ''}`,
    }))
  if (!warehouseOpts.value.length) {
    warehouseOpts.value = getWarehouseSelectOptions().map((w) => ({
      label: w.label,
      value: `${w.value}|`,
    }))
  }
}

function resolveDefaultWarehouseKey(record) {
  if (record?.warehouseName) {
    return `${record.warehouseName}|${record.warehouseCode || ''}`
  }
  const wo = relatedWorkOrder.value
  if (wo) {
    const wh = resolveBackflushWarehouse(wo)
    if (wh.warehouseName) return `${wh.warehouseName}|${wh.warehouseCode || ''}`
  }
  return ''
}

function loadEdit(record) {
  loadWarehouses()
  form.warehouseKey = resolveDefaultWarehouseKey(record)
  const reportQty = Number(record?.reportQty) || 0
  form.lines = (record.lines || []).map((l) => ({
    ...l,
    unitUsage: resolveUnitUsage(l, reportQty),
    status: normalizeMaterialDeductStatus(l.status) || MATERIAL_DEDUCT_STATUS.PENDING,
  }))
}

watch(
  () => [isActive.value, activeRecord.value?.id, relatedWorkOrder.value?.id],
  () => {
    if (!isActive.value || !activeRecord.value) return
    loadEdit(activeRecord.value)
  },
  { immediate: true },
)

function onMaterialsPicked(items) {
  const list = Array.isArray(items) ? items : [items]
  const reportQty = Number(activeRecord.value?.reportQty) || 0
  list.forEach((item) => {
    const code = item.code || item.itemCode || ''
    const exists = form.lines.find((l) => l.materialCode === code)
    if (exists) {
      exists.planQty = Number(exists.planQty || 0) + 1
      return
    }
    const unitUsage = Number(item.unitUsage) || Number(item.unitQty) || Number(item.shipQty) || 1
    const planQty = reportQty > 0 ? Math.round(unitUsage * reportQty * 1000) / 1000 : unitUsage
    form.lines.push({
      id: `edit-line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      materialCode: code,
      materialName: item.name || item.itemName || '',
      specModel: item.specModel || '',
      material: item.material || '',
      drawingNo: item.drawingNo || '',
      variantSummary: item.variantSummary || '',
      variantValues: item.variantValues ? { ...item.variantValues } : {},
      blankSize: item.blankSize || null,
      blankSizeText: item.blankSizeText || '',
      blankSizeMode: item.blankSizeMode || '',
      unitUsage,
      planQty,
      actualQty: 0,
      status: MATERIAL_DEDUCT_STATUS.PENDING,
      failReason: '',
      warehouseStockQty: null,
      deductible: true,
    })
  })
}

function handleOk() {
  if (!activeRecord.value?.id) {
    message.warning('记录不存在')
    return
  }
  if (!form.warehouseKey) {
    message.warning('请选择扣减仓库')
    return
  }
  if (!form.lines.length) {
    message.warning('请至少保留一条物料')
    return
  }
  saving.value = true
  const [warehouseName, warehouseCode = ''] = form.warehouseKey.split('|')
  const res = updatePendingMaterialDeduct(activeRecord.value.id, {
    warehouseName,
    warehouseCode,
    lines: form.lines,
  })
  saving.value = false
  if (!res.ok) {
    message.warning(res.message)
    return
  }
  message.success('已保存')
  emit('saved')
  closeAfterSave()
}
</script>

<style lang="less" scoped>
@label-width: 88px;

.form-layout {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deduct-basic-section {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}

.field-label {
  flex: 0 0 @label-width;
  width: @label-width;
  padding-right: 8px;
  text-align: right;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.field-value {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 22px;
  color: rgba(0, 0, 0, 0.88);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.field-value-control {
  overflow: visible;
  white-space: normal;
}

.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e8e8e8;
}

.meta-item {
  display: flex;
  align-items: center;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  column-gap: 20px;
  row-gap: 10px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  min-width: 0;
}

.info-item-warehouse {
  grid-column: span 2;
  align-items: center;
}

.line-toolbar {
  margin-bottom: 8px;
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  cursor: help;
}

.stock-display {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.line-status-tag {
  display: inline-block;
  padding: 0 8px;
  height: 22px;
  line-height: 20px;
  border-radius: 4px;
  font-size: 12px;
  border: 1px solid transparent;

  &.is-success {
    color: #fff;
    background: #52c41a;
    border-color: #52c41a;
  }

  &.is-failed {
    color: #fff;
    background: #ff4d4f;
    border-color: #ff4d4f;
  }

  &.is-pending {
    color: #d46b08;
    background: #fff7e6;
    border-color: #ffd591;
  }
}

@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .info-item-warehouse {
    grid-column: 1 / -1;
  }
}
</style>
