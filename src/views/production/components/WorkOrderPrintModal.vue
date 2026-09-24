<template>
  <a-modal
    :open="open"
    title="打印工单"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    class="work-order-print-modal"
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
        <a-col :span="24">
          <a-form-item label="打印内容">
            <a-radio-group v-model:value="form.printContent" :options="contentOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="报工二维码">
            <a-checkbox v-model:checked="form.qrEnabled">打印报工二维码</a-checkbox>
          </a-form-item>
        </a-col>
        <a-col v-if="form.qrEnabled" :span="24">
          <a-form-item label="二维码粒度">
            <a-radio-group v-model:value="form.qrMode" :options="qrModeOptions" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>

    <div class="print-tip">
      <template v-if="isBatch"> 已选择 {{ targetOrders.length }} 条工单。 </template>
      <template v-if="form.printContent === 'order_with_bom'">
        预览包含工单基本信息、工序配置与 BOM 清单，可在预览页再次调起浏览器打印。
      </template>
      <template v-else>预览包含工单基本信息与工序配置，可在预览页再次调起浏览器打印。</template>
      <template v-if="form.qrEnabled">
        二维码供小程序扫码报工；演示期为 path+token，正式环境可换成微信小程序码。
      </template>
    </div>

    <div class="print-actions">
      <button type="button" class="action-card" :disabled="building" @click="openPreview(false)">
        <EyeOutlined class="action-icon" />
        <span class="action-title">预览</span>
        <span class="action-desc">打开预览页查看打印效果</span>
      </button>
      <button type="button" class="action-card" :disabled="building" @click="openPreview(true)">
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
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { EyeOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import {
  WORK_ORDER_PRINT_CONTENT,
  WORK_ORDER_PRINT_CONTENT_OPTIONS,
  buildWorkOrderBatchPrintPayload,
  buildWorkOrderPrintPayload,
  openWorkOrderPrintPreview,
} from '@/utils/workOrderPrintPreview'
import {
  WORK_ORDER_QR_MODE,
  WORK_ORDER_QR_MODE_OPTIONS,
  loadWorkOrderQrPrintPrefs,
  saveWorkOrderQrPrintPrefs,
} from '@/utils/workOrderQrToken'

const props = defineProps({
  open: Boolean,
  workOrder: { type: Object, default: null },
  workOrders: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const building = ref(false)

const form = reactive({
  paper: 'A4',
  orientation: 'portrait',
  printContent: WORK_ORDER_PRINT_CONTENT.ORDER_ONLY,
  qrEnabled: false,
  qrMode: WORK_ORDER_QR_MODE.ORDER,
})

const paperOptions = [
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
]

const contentOptions = WORK_ORDER_PRINT_CONTENT_OPTIONS
const qrModeOptions = WORK_ORDER_QR_MODE_OPTIONS

const targetOrders = computed(() => {
  if (props.workOrders?.length) return props.workOrders
  return props.workOrder ? [props.workOrder] : []
})

const isBatch = computed(() => targetOrders.value.length > 1)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    form.paper = 'A4'
    form.orientation = 'portrait'
    form.printContent = WORK_ORDER_PRINT_CONTENT.ORDER_ONLY
    const prefs = loadWorkOrderQrPrintPrefs()
    form.qrEnabled = prefs.qrEnabled
    form.qrMode = prefs.qrMode
  },
)

async function openPreview(autoPrint) {
  const orders = targetOrders.value
  if (!orders.length) return
  const options = {
    paper: form.paper,
    orientation: form.orientation,
    printContent: form.printContent,
    qrEnabled: form.qrEnabled,
    qrMode: form.qrMode,
    autoPrint,
  }
  building.value = true
  try {
    saveWorkOrderQrPrintPrefs({ qrEnabled: form.qrEnabled, qrMode: form.qrMode })
    const payload =
      orders.length === 1
        ? await buildWorkOrderPrintPayload(orders[0], options)
        : await buildWorkOrderBatchPrintPayload(orders, options)
    if (!payload) {
      message.warning('无法生成打印数据')
      return
    }
    openWorkOrderPrintPreview(router, payload, { autoPrint })
    emit('update:open', false)
  } catch (e) {
    console.error(e)
    message.error('生成打印预览失败')
  } finally {
    building.value = false
  }
}
</script>

<style lang="less" scoped>
.work-order-print-modal {
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

    &:hover:not(:disabled) {
      border-color: #1677ff;
      box-shadow: 0 2px 8px rgba(22, 119, 255, 0.12);
    }

    &:disabled {
      opacity: 0.55;
      cursor: not-allowed;
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
