<template>
  <a-modal
    :open="open"
    title="打印"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    class="bom-print-modal"
    @cancel="handleClose"
  >
    <a-form layout="vertical" size="small" class="print-form">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="数量">
            <a-input-number
              v-model:value="form.quantity"
              :min="0"
              :precision="2"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="纸张大小">
            <a-select v-model:value="form.paper" :options="paperOptions" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
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
      将按列设置中<strong>已显示</strong>的字段输出（当前 {{ visibleColumnCount }} 列），隐藏列不会打印。
    </div>

    <div class="action-list">
      <button type="button" class="action-item" @click="handlePreview">
        <EyeOutlined class="action-icon" />
        <span class="action-text">
          <span class="action-title">预览</span>
          <span class="action-desc">在新标签页中查看 BOM 清单</span>
        </span>
      </button>
      <button type="button" class="action-item action-item-disabled" @click="handleDownloadPdf">
        <FilePdfOutlined class="action-icon" />
        <span class="action-text">
          <span class="action-title">下载 PDF</span>
          <span class="action-desc">功能预留，即将上线</span>
        </span>
      </button>
      <button type="button" class="action-item action-item-primary" @click="handlePrint">
        <PrinterOutlined class="action-icon" />
        <span class="action-text">
          <span class="action-title">直接打印</span>
          <span class="action-desc">打开预览页并调起浏览器打印</span>
        </span>
      </button>
    </div>

    <template #footer>
      <a-button @click="handleClose">取消</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { EyeOutlined, FilePdfOutlined, PrinterOutlined } from '@ant-design/icons-vue'
import { defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'
import { mergeColumnSettings } from '@/utils/tableColumnSettings'
import { buildBomPrintPayload, openBomPrintPreview } from '@/utils/bomPrintPreview'

const props = defineProps({
  open: Boolean,
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootItemName: { type: String, default: '' },
  overviewInfo: { type: Object, default: () => ({}) },
  quantity: { type: Number, default: 1 },
  columnSettings: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const effectiveColumnSettings = ref([])

const form = reactive({
  paper: 'A4',
  orientation: 'portrait',
  quantity: 1,
})

const paperOptions = [
  { label: 'A4', value: 'A4' },
  { label: 'A3', value: 'A3' },
]

const visibleColumnCount = computed(
  () => effectiveColumnSettings.value.filter((col) => !col.hidden).length + 1,
)

watch(
  () => props.open,
  (visible) => {
    if (!visible) return
    form.paper = 'A4'
    form.orientation = 'portrait'
    form.quantity = Number(props.quantity) || 1
    effectiveColumnSettings.value = loadLatestColumnSettings()
  },
)

function loadLatestColumnSettings() {
  try {
    const raw = localStorage.getItem('i_doms_table_col_bom-overview-list')
    if (raw) {
      return mergeColumnSettings(defaultBomOverviewColumnSettings, JSON.parse(raw))
    }
  } catch {
    /* ignore */
  }
  if (props.columnSettings?.length) {
    return JSON.parse(JSON.stringify(props.columnSettings))
  }
  return JSON.parse(JSON.stringify(defaultBomOverviewColumnSettings))
}

function buildPayload() {
  return buildBomPrintPayload({
    flatNodes: props.flatNodes,
    lineItems: props.lineItems,
    rootItemName: props.rootItemName,
    overviewInfo: props.overviewInfo,
    quantity: form.quantity,
    columnSettings: effectiveColumnSettings.value,
    paper: form.paper,
    orientation: form.orientation,
  })
}

function handlePreview() {
  openBomPrintPreview(router, buildPayload())
  handleClose()
}

function handlePrint() {
  openBomPrintPreview(router, buildPayload(), { autoPrint: true })
  handleClose()
}

function handleDownloadPdf() {
  message.info('PDF 下载功能即将上线')
}

function handleClose() {
  emit('update:open', false)
}
</script>

<style lang="less" scoped>
.bom-print-modal {
  .print-form {
    margin-bottom: 4px;
  }

  .print-tip {
    margin-bottom: 16px;
    padding: 8px 12px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    line-height: 1.6;
  }

  .action-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #d9d9d9;
    border-radius: 6px;
    background: #fff;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: #1677ff;
      background: #f0f7ff;
    }
  }

  .action-item-primary {
    border-color: #91caff;
    background: #f0f7ff;

    &:hover {
      border-color: #1677ff;
      background: #e6f4ff;
    }
  }

  .action-item-disabled {
    opacity: 0.72;

    &:hover {
      border-color: #d9d9d9;
      background: #fff;
    }
  }

  .action-icon {
    font-size: 20px;
    color: #1677ff;
    flex-shrink: 0;
  }

  .action-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .action-title {
    font-size: 14px;
    font-weight: 600;
    color: #262626;
  }

  .action-desc {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
