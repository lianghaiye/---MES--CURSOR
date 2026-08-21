<template>
  <a-modal
    v-model:open="visible"
    :title="title"
    width="820px"
    :mask-closable="false"
    destroy-on-close
    wrap-class-name="inventory-line-edit-modal"
    @cancel="handleCancel"
  >
    <a-form layout="vertical" class="edit-form">
      <a-form-item>
        <template #label>
          <span class="field-label">
            <FileTextOutlined />
            物品信息
          </span>
        </template>
        <a-input :value="lockedItemLabel" disabled />
        <div class="item-preview">
          <div class="preview-grid">
            <div class="preview-row">
              <span class="preview-label">物品编号</span>
              <span>{{ draft.itemCode || draft.productCode || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">物品名称</span>
              <span>{{ draft.itemName || draft.productName || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">规格型号</span>
              <span>{{ draft.specModel || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">材质</span>
              <span>{{ draft.material || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">图号</span>
              <span>{{ draft.drawingNo || '—' }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">单位用量</span>
              <span>{{ formatQty(draft.unitUsage) }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">来源产品</span>
              <span :title="sourceProductText">{{ sourceProductText }}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label">单位</span>
              <span>{{ draft.unit || '—' }}</span>
            </div>
          </div>
          <div class="preview-bottom">
            <div class="preview-rest">
              <div class="preview-row">
                <span class="preview-label">库存数</span>
                <span>{{ formatQty(draft.stockQty) }} {{ draft.unit || '' }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">发货进度</span>
                <span>{{ progressDisplay }}</span>
              </div>
              <div class="preview-row">
                <span class="preview-label">剩余可出库</span>
                <span>{{ formatQty(draft.remainingQty) }} {{ draft.unit || '' }}</span>
              </div>
            </div>
            <div class="preview-stock-box">
              <div class="stock-value">{{ formatQty(draft.warehouseStockQty) }}</div>
              <div class="stock-label">当前仓库数量({{ draft.unit || '件' }})</div>
            </div>
          </div>
        </div>
      </a-form-item>

      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item required>
            <template #label>
              <span class="field-label">
                <HomeOutlined />
                出库仓库
              </span>
            </template>
            <a-select
              v-model:value="draft.shipWarehouse"
              allow-clear
              placeholder="请选择出库仓库"
              :options="warehouseOpts"
              @change="refreshStock"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item required>
            <template #label>
              <span class="field-label">
                <UnorderedListOutlined />
                出库数量
              </span>
            </template>
            <a-input-number
              v-model:value="draft.issueQty"
              :min="0"
              :max="draft.remainingQty != null ? draft.remainingQty : undefined"
              :precision="4"
              :formatter="inputNumberFormatter"
              :parser="inputNumberParser"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item>
            <template #label>
              <span class="field-label">
                <FileTextOutlined />
                备注
              </span>
            </template>
            <a-textarea v-model:value="draft.remark" :rows="2" placeholder="请输入备注" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <template #footer>
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { FileTextOutlined, HomeOutlined, UnorderedListOutlined } from '@ant-design/icons-vue'
import { getWarehouseSelectOptions, warehouseState } from '@/store/warehouseStore'
import { enrichOutboundLineStock } from '@/utils/outboundLineHelpers'
import { formatWxIssueProgress } from '@/utils/outsourcingInbound'
import { formatNumber, inputNumberFormatter, inputNumberParser } from '@/utils/numberFormat'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  title: { type: String, default: '编辑发料明细' },
})

const emit = defineEmits(['update:open', 'confirm'])

const visible = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const draft = reactive(createDraft())

const warehouseOpts = computed(() => {
  void warehouseState.warehouses
  return getWarehouseSelectOptions()
})

const lockedItemLabel = computed(() => {
  const code = draft.itemCode || draft.productCode || ''
  const name = draft.itemName || draft.productName || ''
  if (code && name) return `[${code}] ${name}`
  return name || code || ''
})

const sourceProductText = computed(() => {
  const fromSources = (draft.sourceProducts || [])
    .map((s) => s.productName || s.productCode)
    .filter(Boolean)
  if (fromSources.length) return fromSources.join('、')
  return draft.sourceProductText || '—'
})

const progressDisplay = computed(() =>
  formatWxIssueProgress(draft.issuedQty, draft.appliedIssueQty, draft.planQty),
)

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function createDraft(line = {}) {
  return {
    id: line.id || '',
    itemName: line.itemName || line.productName || '',
    itemCode: line.itemCode || line.productCode || '',
    productName: line.productName || line.itemName || '',
    productCode: line.productCode || line.itemCode || '',
    specModel: line.specModel || '',
    material: line.material || '',
    drawingNo: line.drawingNo || '',
    unitUsage: line.unitUsage ?? null,
    unit: line.unit || '',
    sourceProducts: line.sourceProducts || [],
    sourceProductText: line.sourceProductText || '',
    issuedQty: line.issuedQty ?? null,
    appliedIssueQty: line.appliedIssueQty ?? null,
    planQty: line.planQty ?? null,
    remainingQty: line.remainingQty ?? null,
    issueQty: line.issueQty ?? 0,
    shipWarehouse: line.shipWarehouse || '',
    remark: line.remark || '',
    stockQty: line.stockQty ?? null,
    warehouseStockQty: line.warehouseStockQty ?? null,
  }
}

function refreshStock() {
  const stock = enrichOutboundLineStock({
    itemCode: draft.itemCode || draft.productCode || '',
    shipWarehouse: draft.shipWarehouse || '',
  })
  draft.stockQty = stock.stockQty
  draft.warehouseStockQty = stock.warehouseStockQty
}

watch(
  () => props.open,
  (open) => {
    if (!open || !props.line) return
    Object.assign(draft, createDraft(props.line))
    refreshStock()
  },
)

function handleCancel() {
  visible.value = false
}

function handleOk() {
  if (!String(draft.shipWarehouse || '').trim()) {
    message.warning('请选择出库仓库')
    return
  }
  if (!(Number(draft.issueQty) > 0)) {
    message.warning('请填写出库数量')
    return
  }
  if (
    draft.remainingQty != null &&
    Number.isFinite(Number(draft.remainingQty)) &&
    Number(draft.issueQty) > Number(draft.remainingQty) + 1e-9
  ) {
    message.warning('出库数量不能超过剩余可出库数量')
    return
  }
  emit('confirm', {
    ...props.line,
    ...draft,
    itemName: draft.itemName,
    itemCode: draft.itemCode,
    productName: draft.itemName || draft.productName,
    productCode: draft.itemCode || draft.productCode,
    issueQty: draft.issueQty,
    shipWarehouse: draft.shipWarehouse || '',
    remark: draft.remark || '',
    stockQty: draft.stockQty,
    warehouseStockQty: draft.warehouseStockQty,
  })
  visible.value = false
}
</script>

<script>
export default { name: 'OutsourcingIssueLineEditModal' }
</script>

<style lang="less">
@import '../../inventory/components/inventoryLineEditModal.less';
</style>

<style lang="less" scoped>
.item-preview {
  flex-direction: column;
  align-items: stretch;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
  margin-bottom: 8px;

  .preview-row {
    margin-bottom: 0;
    min-width: 0;

    > span:last-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.preview-bottom {
  display: flex;
  align-items: stretch;
  gap: 12px;
}

.preview-rest {
  flex: 1;
  min-width: 0;
}

.preview-stock-box {
  width: 148px;
  min-height: 96px;
}
</style>
