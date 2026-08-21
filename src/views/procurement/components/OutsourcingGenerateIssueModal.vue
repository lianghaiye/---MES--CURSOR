<template>
  <a-modal
    :open="open"
    title="发料出库"
    width="96%"
    :mask-closable="false"
    destroy-on-close
    wrap-class-name="outsourcing-generate-issue-modal-wrap"
    @cancel="handleCancel"
  >
    <div class="section-block">
      <div class="section-title">基本信息</div>
      <a-form layout="inline" class="header-form horizontal-form">
        <a-row :gutter="[12, 8]" style="width: 100%">
          <a-col :span="6">
            <a-form-item label="外协单号" required>
              <a-input :value="outsourcingOrder?.orderNo" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="供应商">
              <a-input :value="outsourcingOrder?.supplier" disabled size="small" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="出货日期" required>
              <a-date-picker
                v-model:value="form.shipDate"
                size="small"
                style="width: 100%"
                placeholder="请选择出货日期"
              />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注" class="remark-item">
              <a-textarea v-model:value="form.remark" :rows="2" placeholder="请输入备注" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </div>

    <a-alert
      type="info"
      show-icon
      class="issue-tip"
      message="勾选上方外协产品并填写本次套数后，系统按产品 BOM 自动生成下方发料物料；改套数将覆盖重算物料数量。橙色表示多产品共用物料。"
    />

    <div class="section-block">
      <div class="section-title">
        外协产品清单 ({{ productRows.length }})
        <span class="section-hint">默认全选可发产品；取消勾选则不发该产品物料</span>
      </div>
      <a-table
        :columns="productColumns"
        :data-source="productRows"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 1180 }"
        :row-selection="productRowSelection"
        :row-class-name="productRowClassName"
        :custom-row="productCustomRow"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'color'">
            <span class="color-dot" :style="{ background: record.colorBar }" />
          </template>
          <template v-else-if="column.key === 'appliedIssueQty'">
            {{ formatQty(record.appliedIssueQty) }}
          </template>
          <template v-else-if="column.key === 'remainQty'">
            {{ formatQty(record.remainQty) }}
          </template>
          <template v-else-if="column.key === 'planQty'">
            {{ formatQty(record.planQty) }}
          </template>
          <template v-else-if="column.key === 'setQty'">
            <a-input-number
              v-model:value="record.setQty"
              size="small"
              :min="0"
              :max="record.remainQty"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
              :disabled="!record.selected || record.locked"
              @change="() => onSetQtyChange(record)"
            />
          </template>
          <template v-else-if="column.key === 'bom'">
            <span :class="{ 'bom-missing': !record.hasBom }">
              {{ record.bom || (record.hasBom ? '—' : '无BOM') }}
            </span>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
          </template>
        </template>
      </a-table>
    </div>

    <div class="section-block">
      <div class="section-title">
        发料物料明细 ({{ issueLines.length }})
        <span class="section-hint">左侧色条与上方产品对应；共用物料为橙色</span>
      </div>
      <a-table
        :columns="materialColumns"
        :data-source="issueLines"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: tableScrollX }"
        :row-class-name="materialRowClassName"
        :custom-row="materialCustomRow"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'issueProgress'">
            <span class="col-title-with-tip">
              发货进度
              <a-tooltip :title="WX_ISSUE_PROGRESS_TOOLTIP">
                <InfoCircleOutlined class="col-tip-icon" />
              </a-tooltip>
            </span>
          </template>
          <template v-else>{{ column.title }}</template>
        </template>
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'color'">
            <span class="color-dot" :style="{ background: record.colorBar }" />
          </template>
          <template v-else-if="column.key === 'issueProgress'">
            {{ formatWxIssueProgress(record.issuedQty, record.appliedIssueQty, record.planQty) }}
          </template>
          <template v-else-if="column.key === 'sourceProduct'">
            <div class="source-products">
              <span
                v-for="src in record.sourceProducts || []"
                :key="src.lineId"
                class="source-chip"
              >
                <span class="color-dot color-dot--sm" :style="{ background: src.colorBar }" />
                {{ src.productName || src.productCode || '—' }}
              </span>
              <a-tag v-if="record.shared" color="orange" class="shared-tag">共用</a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'issueQty'">
            <a-input-number
              v-model:value="record.issueQty"
              size="small"
              :min="0"
              :max="record.remainingQty != null ? record.remainingQty : undefined"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
            />
          </template>
          <template v-else-if="column.key === 'shipWarehouse'">
            <a-select
              v-model:value="record.shipWarehouse"
              size="small"
              style="width: 100%"
              placeholder="请选择"
              :options="warehouseOpts"
              @change="() => refreshLineStock(record)"
            />
          </template>
          <template v-else-if="column.key === 'stockQty'">
            {{ formatQty(record.stockQty) }}
          </template>
          <template v-else-if="column.key === 'warehouseStockQty'">
            {{ formatQty(record.warehouseStockQty) }}
          </template>
          <template v-else-if="column.key === 'remark'">
            <LongTextEditCell :value="record.remark" @edit="openRemarkEdit(record)" />
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="0">
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="removeLine(record.id)">
                移出本单
              </a-button>
            </a-space>
          </template>
          <template v-else>
            {{ displayCell(record, column) }}
          </template>
        </template>
      </a-table>
    </div>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleConfirm">确定</a-button>
    </template>

    <OutsourcingIssueLineEditModal
      v-model:open="editOpen"
      :line="editingLine"
      @confirm="onEditConfirm"
    />

    <a-modal
      v-model:open="remarkOpen"
      title="编辑备注"
      width="520px"
      :mask-closable="false"
      destroy-on-close
      @ok="saveRemark"
      @cancel="remarkOpen = false"
    >
      <a-textarea v-model:value="remarkDraft" :rows="4" allow-clear placeholder="请输入备注" />
    </a-modal>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import { submitOutsourcingIssue } from '@/store/outsourcingOrderStore'
import { warehouseOptions } from '@/mock/purchaseOrderOptions'
import { enrichOutboundLineStock } from '@/utils/outboundLineHelpers'
import { formatWxIssueProgress, WX_ISSUE_PROGRESS_TOOLTIP } from '@/utils/outsourcingInbound'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'
import {
  buildOutsourcingIssueMaterialRows,
  buildOutsourcingIssueProductRows,
} from '@/utils/outsourcingIssueMaterials'
import OutsourcingIssueLineEditModal from './OutsourcingIssueLineEditModal.vue'
import LongTextEditCell from '@/components/LongTextEditCell.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  outsourcingOrder: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'confirmed'])

const form = reactive({
  shipDate: null,
  remark: '',
})
const productRows = ref([])
const issueLines = ref([])
const editOpen = ref(false)
const editingLine = ref(null)
const remarkOpen = ref(false)
const remarkDraft = ref('')
const remarkTargetId = ref('')
const warehouseOpts = warehouseOptions

const productColumns = [
  { title: '', key: 'color', width: 36, align: 'center', fixed: 'left' },
  { title: '外协单号', dataIndex: 'orderNo', width: 140 },
  { title: '产品', dataIndex: 'productName', width: 140, ellipsis: true },
  { title: '编号', dataIndex: 'productCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '关联BOM', key: 'bom', width: 140, ellipsis: true },
  { title: '计划数量', key: 'planQty', width: 90, align: 'right' },
  { title: '已申请', key: 'appliedIssueQty', width: 90, align: 'right' },
  { title: '可发数', key: 'remainQty', width: 90, align: 'right' },
  { title: '本次套数', key: 'setQty', width: 110 },
]

const materialColumns = [
  { title: '序号', key: 'index', width: 52, align: 'center', fixed: 'left' },
  { title: '', key: 'color', width: 36, align: 'center', fixed: 'left' },
  { title: '发货进度', key: 'issueProgress', width: 170, fixed: 'left' },
  {
    title: '物品名称',
    key: 'itemName',
    dataIndex: 'itemName',
    width: 140,
    ellipsis: true,
    fixed: 'left',
  },
  { title: '来源产品', key: 'sourceProduct', width: 180, ellipsis: true },
  { title: '编号', dataIndex: 'itemCode', width: 120, ellipsis: true },
  { title: '规格型号', dataIndex: 'specModel', width: 110, ellipsis: true },
  { title: '材质', dataIndex: 'material', width: 80, ellipsis: true },
  { title: '图号', dataIndex: 'drawingNo', width: 100, ellipsis: true },
  { title: '下料尺寸', dataIndex: 'blankSizeText', width: 110, ellipsis: true },
  { title: '单位用量', dataIndex: 'unitUsage', key: 'unitUsage', width: 90, align: 'right' },
  { title: '条码类型', dataIndex: 'barcodeType', width: 100, ellipsis: true },
  { title: '出库数量', key: 'issueQty', width: 110 },
  { title: '单位', dataIndex: 'unit', width: 70 },
  { title: '出库仓库', key: 'shipWarehouse', width: 120 },
  { title: '当前库存数', key: 'stockQty', width: 100, align: 'right' },
  { title: '当前仓库数量', key: 'warehouseStockQty', width: 110, align: 'right' },
  { title: '备注', key: 'remark', width: 140 },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
]

const tableScrollX = materialColumns.reduce((sum, col) => sum + (col.width || 100), 0)

const selectedProductKeys = computed(() =>
  productRows.value.filter((r) => r.selected && !r.locked).map((r) => r.id),
)

const productRowSelection = computed(() => ({
  selectedRowKeys: selectedProductKeys.value,
  getCheckboxProps: (record) => ({
    disabled: record.locked || record.remainQty <= 0,
  }),
  onChange: (keys) => {
    const keySet = new Set(keys)
    productRows.value.forEach((row) => {
      if (row.locked || row.remainQty <= 0) {
        row.selected = false
        row.setQty = 0
        return
      }
      const next = keySet.has(row.id)
      if (next && !row.selected) {
        row.selected = true
        row.setQty = row.remainQty
      } else if (!next) {
        row.selected = false
        row.setQty = 0
      }
    })
    rebuildMaterials()
  },
}))

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function displayCell(record, column) {
  const key = column.dataIndex || column.key
  const val = record[key]
  return val !== undefined && val !== null && String(val).trim() !== '' ? val : '—'
}

function refreshLineStock(line) {
  const stock = enrichOutboundLineStock({
    itemCode: line.itemCode || line.productCode || '',
    shipWarehouse: line.shipWarehouse || '',
  })
  line.stockQty = stock.stockQty
  line.warehouseStockQty = stock.warehouseStockQty
}

function rebuildMaterials() {
  const rows = buildOutsourcingIssueMaterialRows(productRows.value, props.outsourcingOrder).map(
    (row) => {
      refreshLineStock(row)
      return row
    },
  )
  issueLines.value = rows
}

function onSetQtyChange(record) {
  if (!record.selected) return
  const max = Number(record.remainQty) || 0
  let qty = Number(record.setQty) || 0
  if (qty > max) qty = max
  if (qty < 0) qty = 0
  record.setQty = qty
  rebuildMaterials()
}

function productRowClassName(record) {
  return record.locked ? 'issue-row-locked' : ''
}

function materialRowClassName(record) {
  return record.shared ? 'issue-row-shared' : ''
}

function productCustomRow(record) {
  return {
    style: {
      background: record.colorBg,
      boxShadow: `inset 3px 0 0 ${record.colorBar}`,
    },
  }
}

function materialCustomRow(record) {
  return {
    style: {
      background: record.colorBg,
      boxShadow: `inset 3px 0 0 ${record.colorBar}`,
    },
  }
}

watch(
  () => props.open,
  (val) => {
    if (!val || !props.outsourcingOrder) return
    form.shipDate = dayjs()
    form.remark = props.outsourcingOrder.remark || ''
    productRows.value = buildOutsourcingIssueProductRows(props.outsourcingOrder)
    rebuildMaterials()
  },
)

function removeLine(id) {
  issueLines.value = issueLines.value.filter((l) => l.id !== id)
}

function openEdit(record) {
  editingLine.value = {
    ...record,
    productName: record.itemName,
    productCode: record.itemCode,
    // 物料行不以产品可发套数封顶；编辑时允许调整数量
    remainingQty:
      record.remainingQty != null
        ? record.remainingQty
        : Math.max(Number(record.issueQty) || 0, 1) * 100,
    issuedQty: record.issuedQty ?? 0,
    appliedIssueQty: record.appliedIssueQty ?? 0,
    planQty: record.planQty ?? record.issueQty,
  }
  editOpen.value = true
}

function openRemarkEdit(record) {
  remarkTargetId.value = record.id
  remarkDraft.value = record.remark || ''
  remarkOpen.value = true
}

function saveRemark() {
  const target = issueLines.value.find((l) => l.id === remarkTargetId.value)
  if (target) target.remark = remarkDraft.value || ''
  remarkOpen.value = false
}

function onEditConfirm(payload) {
  const idx = issueLines.value.findIndex((l) => l.id === payload.id)
  if (idx < 0) return
  const next = {
    ...issueLines.value[idx],
    ...payload,
    itemName: payload.productName ?? payload.itemName ?? issueLines.value[idx].itemName,
    itemCode: payload.productCode ?? payload.itemCode ?? issueLines.value[idx].itemCode,
  }
  refreshLineStock(next)
  issueLines.value[idx] = next
}

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  if (!form.shipDate) {
    message.warning('请选择出货日期')
    return
  }
  const productSets = productRows.value
    .filter((p) => p.selected && !p.locked && (Number(p.setQty) || 0) > 0)
    .map((p) => ({ lineId: p.id, setQty: p.setQty }))
  if (!productSets.length) {
    message.warning('请至少勾选一个产品并填写本次套数')
    return
  }
  const submitMaterials = issueLines.value.filter((l) => Number(l.issueQty) > 0)
  if (!submitMaterials.length) {
    message.warning('请至少填写一行物料出库数量')
    return
  }
  const invalidWh = submitMaterials.find((l) => !String(l.shipWarehouse || '').trim())
  if (invalidWh) {
    message.warning(`请为「${invalidWh.itemName || invalidWh.itemCode}」选择出库仓库`)
    return
  }
  const result = submitOutsourcingIssue(
    props.outsourcingOrder.id,
    {
      productSets,
      materialLines: submitMaterials.map((l) => ({
        lineId: l.sourceProducts?.[0]?.lineId || '',
        sourceProductLineIds: (l.sourceProducts || []).map((s) => s.lineId),
        sourceProductText: (l.sourceProducts || [])
          .map((s) => s.productName || s.productCode)
          .filter(Boolean)
          .join('、'),
        itemName: l.itemName,
        itemCode: l.itemCode,
        productName: l.itemName,
        productCode: l.itemCode,
        specModel: l.specModel,
        material: l.material,
        drawingNo: l.drawingNo,
        issueQty: l.issueQty,
        shipWarehouse: l.shipWarehouse,
        remark: l.remark,
        barcodeType: l.barcodeType,
        blankSizeText: l.blankSizeText,
        unitUsage: l.unitUsage,
        unit: l.unit,
      })),
    },
    {
      shipDate: form.shipDate.format('YYYY-MM-DD'),
      remark: form.remark,
    },
  )
  if (result.ok) {
    message.success(result.message)
    emit('confirmed')
    emit('update:open', false)
  } else {
    message.warning(result.message)
  }
}
</script>

<script>
export default { name: 'OutsourcingGenerateIssueModal' }
</script>

<style lang="less" scoped>
.horizontal-form {
  width: 100%;
  margin-bottom: 12px;

  :deep(.ant-form-item) {
    width: 100%;
    margin-bottom: 0;
  }
}

.remark-item {
  width: 100%;
}

.issue-tip {
  margin-bottom: 12px;
}

.section-block {
  margin-bottom: 16px;
}

.section-title {
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.section-hint {
  font-weight: 400;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.col-title-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.col-tip-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.color-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  vertical-align: middle;

  &--sm {
    width: 8px;
    height: 8px;
    margin-right: 4px;
  }
}

.source-products {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
}

.shared-tag {
  margin: 0;
  line-height: 18px;
}

.bom-missing {
  color: #fa8c16;
}

:deep(.issue-row-locked) {
  color: rgba(0, 0, 0, 0.35);
}

:deep(.issue-row-shared) {
  /* 底色由 custom-row 橙色提供 */
}
</style>

<style lang="less">
.outsourcing-generate-issue-modal-wrap {
  .ant-modal {
    max-width: 1680px;
    top: 24px;
    padding-bottom: 24px;
  }

  .ant-modal-body {
    max-height: calc(100vh - 160px);
    overflow-y: auto;
  }
}
</style>
