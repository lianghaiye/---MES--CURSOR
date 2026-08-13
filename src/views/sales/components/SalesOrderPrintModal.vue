<template>
  <a-modal
    :open="open"
    title="打印销售订单"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    class="sales-order-print-modal"
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
      <template v-if="isBatch">已选择 {{ targetOrders.length }} 条销售订单。</template>
      预览包含销售订单基本信息与销售明细，可在预览页再次调起浏览器打印。
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
  buildSalesOrderBatchPrintPayload,
  buildSalesOrderPrintPayload,
  openSalesOrderPrintPreview,
} from '@/utils/salesOrderPrintPreview'

const props = defineProps({
  open: Boolean,
  salesOrder: { type: Object, default: null },
  salesOrders: { type: Array, default: () => [] },
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

const targetOrders = computed(() => {
  if (props.salesOrders?.length) return props.salesOrders
  return props.salesOrder ? [props.salesOrder] : []
})

const isBatch = computed(() => targetOrders.value.length > 1)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    form.paper = 'A4'
    form.orientation = 'portrait'
  },
)

function openPreview(autoPrint) {
  const list = targetOrders.value
  if (!list.length) return
  const options = {
    paper: form.paper,
    orientation: form.orientation,
    autoPrint,
  }
  const payload =
    list.length === 1
      ? buildSalesOrderPrintPayload(list[0], options)
      : buildSalesOrderBatchPrintPayload(list, options)
  if (!payload) return
  openSalesOrderPrintPreview(router, payload, { autoPrint })
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.sales-order-print-modal {
  .print-form {
    margin-bottom: 8px;
  }

  .print-tip {
    margin-bottom: 16px;
    padding: 10px 12px;
    background: #f6ffed;
    border: 1px solid #b7eb8f;
    border-radius: 6px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
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
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    text-align: left;
    transition:
      border-color 0.2s,
      box-shadow 0.2s;

    &:hover {
      border-color: #1677ff;
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.12);
    }

    .action-icon {
      font-size: 18px;
      color: #1677ff;
    }

    .action-title {
      font-size: 14px;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.88);
    }

    .action-desc {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.45);
      line-height: 1.4;
    }
  }
}
</style>
