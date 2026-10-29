<template>
  <a-modal
    :open="open"
    title="打印采购对账单"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    class="purchase-settle-print-modal"
    @cancel="emit('update:open', false)"
  >
    <a-form layout="vertical" size="small" class="print-form">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="纸张大小">
            <a-select v-model:value="form.paper" :options="paperOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="打印方向">
            <a-radio-group v-model:value="form.orientation">
              <a-radio value="portrait">纵向</a-radio>
              <a-radio value="landscape">横向</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="print-tip">
      <template v-if="isBatch">已选择 {{ targetSettles.length }} 条对账单。</template>
      预览包含对账基本信息与结算明细，可在预览页再次调起浏览器打印。
    </div>

    <div class="print-actions">
      <button type="button" class="action-card" @click="openPreview(false)">
        <EyeOutlined class="action-icon" />
        <span class="action-title">预览</span>
        <span class="action-desc">打开预览页查看打印效果</span>
      </button>
      <button type="button" class="action-card" @click="openPreview(true)">
        <PrinterOutlined class="action-icon" />
        <span class="action-title">直接打印</span>
        <span class="action-desc">打开预览页并调起浏览器打印</span>
      </button>
    </div>

    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { EyeOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import {
  buildPurchaseSettleBatchPrintPayload,
  buildPurchaseSettlePrintPayload,
  openPurchaseSettlePrintPreview,
} from '@/utils/purchaseSettlePrintPreview'

const props = defineProps({
  open: Boolean,
  settle: { type: Object, default: null },
  settles: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open'])

const router = useRouter()

const form = reactive({
  paper: 'A4',
  orientation: 'portrait',
})

const paperOptions = [
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
]

const targetSettles = computed(() => {
  if (props.settles?.length) return props.settles
  return props.settle ? [props.settle] : []
})

const isBatch = computed(() => targetSettles.value.length > 1)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    form.paper = 'A4'
    form.orientation = 'portrait'
  },
)

function openPreview(autoPrint) {
  const list = targetSettles.value
  if (!list.length) return
  const options = {
    paper: form.paper,
    orientation: form.orientation,
    autoPrint,
  }
  const payload =
    list.length === 1
      ? buildPurchaseSettlePrintPayload(list[0], options)
      : buildPurchaseSettleBatchPrintPayload(list, options)
  if (!payload) return
  openPurchaseSettlePrintPreview(router, payload, { autoPrint })
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.purchase-settle-print-modal {
  .print-form {
    margin-bottom: 8px;
  }

  .print-tip {
    margin-bottom: 16px;
    color: rgba(0, 0, 0, 0.45);
    font-size: 13px;
    line-height: 1.5;
  }

  .print-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .action-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    padding: 14px 16px;
    border: 1px solid #f0f0f0;
    border-radius: 10px;
    background: #fafafa;
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;

    &:hover {
      border-color: #91caff;
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.12);
      background: #fff;
    }
  }

  .action-icon {
    font-size: 20px;
    color: #1677ff;
    margin-bottom: 4px;
  }

  .action-title {
    font-size: 15px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.88);
  }

  .action-desc {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
    line-height: 1.4;
  }
}
</style>
