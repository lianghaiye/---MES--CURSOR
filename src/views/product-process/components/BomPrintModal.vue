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

    <div class="print-tip-row">
      <div class="print-tip">
        将按列设置中<strong>已显示</strong>的字段输出（当前
        {{ visibleColumnCount }} 列），隐藏列不会打印。
      </div>
      <a-button
        v-if="isProductionPlanPrint"
        size="small"
        class="print-column-btn"
        @click="printColumnDrawerOpen = true"
      >
        <SettingOutlined />
        设置打印项
      </a-button>
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
      <button type="button" class="action-item" @click="handlePrint">
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

    <TableColumnSettingDrawer
      v-if="isProductionPlanPrint"
      v-model:open="printColumnDrawerOpen"
      v-model:settings="effectiveColumnSettings"
      :default-settings="printDefaultColumnSettings"
      title="设置打印项"
      hint="调整打印清单中显示的字段；隐藏列不会出现在预览与打印输出中。"
      :show-frozen="false"
    />
  </a-modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  EyeOutlined,
  FilePdfOutlined,
  PrinterOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { defaultBomOverviewColumnSettings } from '@/mock/bomOverviewColumns'
import {
  PRODUCTION_PLAN_PRINT_COLUMN_STORAGE_KEY,
  productionPlanPrintColumnSettings,
} from '@/mock/productionPlanPrintColumns'
import { mergeColumnSettings } from '@/utils/tableColumnSettings'
import { buildBomPrintPayload, openBomPrintPreview } from '@/utils/bomPrintPreview'
import TableColumnSettingDrawer from '@/components/TableColumnSettingDrawer.vue'

const COLUMN_STORAGE_PREFIX = 'i_doms_table_col_'

const props = defineProps({
  open: Boolean,
  flatNodes: { type: Array, default: () => [] },
  lineItems: { type: Array, default: () => [] },
  rootItemName: { type: String, default: '' },
  overviewInfo: { type: Object, default: () => ({}) },
  quantity: { type: Number, default: 1 },
  columnSettings: { type: Array, default: () => [] },
  /** 生产计划打印：固定列配置，不读取 BOM 概览 localStorage */
  fixedColumnSettings: { type: Array, default: () => [] },
  printBaseColumns: { type: Array, default: () => [] },
  materialQtyByCode: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const effectiveColumnSettings = ref([])
const printColumnDrawerOpen = ref(false)

const isProductionPlanPrint = computed(() => props.printBaseColumns?.length > 0)

const printDefaultColumnSettings = computed(() => {
  if (props.fixedColumnSettings?.length) {
    return JSON.parse(JSON.stringify(props.fixedColumnSettings))
  }
  return JSON.parse(JSON.stringify(productionPlanPrintColumnSettings))
})

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
  if (isProductionPlanPrint.value) {
    const defaults = printDefaultColumnSettings.value
    try {
      const raw = localStorage.getItem(
        COLUMN_STORAGE_PREFIX + PRODUCTION_PLAN_PRINT_COLUMN_STORAGE_KEY,
      )
      if (raw) {
        return mergeColumnSettings(defaults, JSON.parse(raw))
      }
    } catch {
      /* ignore */
    }
    return JSON.parse(JSON.stringify(defaults))
  }
  if (props.fixedColumnSettings?.length) {
    return JSON.parse(JSON.stringify(props.fixedColumnSettings))
  }
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
    baseColumns: props.printBaseColumns?.length ? props.printBaseColumns : undefined,
    paper: form.paper,
    orientation: form.orientation,
    materialQtyByCode: props.materialQtyByCode,
    printScene: isProductionPlanPrint.value ? 'production-plan' : null,
  })
}

watch(
  effectiveColumnSettings,
  (value) => {
    if (!isProductionPlanPrint.value) return
    localStorage.setItem(
      COLUMN_STORAGE_PREFIX + PRODUCTION_PLAN_PRINT_COLUMN_STORAGE_KEY,
      JSON.stringify(value),
    )
  },
  { deep: true },
)

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

  .print-tip-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .print-tip {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.65);
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
    line-height: 1.6;
  }

  .print-column-btn {
    flex-shrink: 0;
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
