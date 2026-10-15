<template>
  <div class="so-ship-acc">
    <div class="toolbar">
      <a-space>
        <a-button size="small" :loading="syncing" :disabled="readonly" @click="handleSync">
          重新带出标准包
        </a-button>
        <a-button
          type="primary"
          size="small"
          :disabled="!gapSummary.gapCount"
          :loading="converting"
          @click="handleConvertPurchase"
        >
          缺口转采购{{ gapSummary.gapCount ? `（${gapSummary.gapCount}）` : '' }}
        </a-button>
      </a-space>
      <span class="hint">
        已纳入 {{ selectedCount }} 项
        <template v-if="gapSummary.gapCount">
          · 缺口 {{ gapSummary.gapCount }} 项 / {{ formatQty(gapSummary.gapQty) }}
        </template>
      </span>
    </div>

    <a-table
      :columns="columns"
      :data-source="rows"
      row-key="id"
      size="small"
      bordered
      :pagination="false"
      :scroll="{ x: 1100 }"
      :locale="{
        emptyText: '暂无随货配件：请确认产品已配置并启用随货配件标准包，或点击「重新带出标准包」',
      }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'selected'">
          <a-checkbox v-model:checked="record.selected" :disabled="readonly" @change="persist" />
        </template>
        <template v-else-if="column.key === 'kitSets'">
          <a-input-number
            v-model:value="record.kitSets"
            size="small"
            :min="0"
            :precision="0"
            style="width: 88px"
            :disabled="readonly"
            @change="() => onKitSetsChange(record)"
          />
        </template>
        <template v-else-if="column.key === 'shipQty'">
          <a-input-number
            v-model:value="record.shipQty"
            size="small"
            :min="0"
            :precision="3"
            style="width: 100px"
            :disabled="readonly || !record.selected"
            @change="persist"
          />
        </template>
        <template v-else-if="column.key === 'availableStock'">
          {{ formatQty(record.availableStock ?? record.warehouseStockQty) }}
        </template>
        <template v-else-if="column.key === 'gapQty'">
          <span :class="{ 'gap-warn': Number(record.gapQty) > 0 }">
            {{ formatQty(record.gapQty) }}
          </span>
        </template>
        <template v-else-if="column.key === 'product'">
          {{ record.productName || '—' }}
          <span v-if="record.productCode" class="muted">（{{ record.productCode }}）</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import {
  buildRequisitionFromShipAccessoryGaps,
  enrichShipAccessoryStock,
  summarizeShipAccessoryGaps,
  syncSalesOrderShipAccessories,
} from '@/utils/salesOrderShipAccessories'
import { formatNumber } from '@/utils/numberFormat'
import { useTabs } from '@/composables/useTabs'

const props = defineProps({
  order: { type: Object, required: true },
  warehouse: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
})

const emit = defineEmits(['change'])

const router = useRouter()
const { openTab } = useTabs()
const syncing = ref(false)
const converting = ref(false)

const rows = computed(() => props.order?.shipAccessories || [])
const selectedCount = computed(() => rows.value.filter((r) => r.selected !== false).length)
const gapSummary = computed(() => summarizeShipAccessoryGaps(rows.value))

const columns = [
  { title: '纳入', key: 'selected', width: 64, align: 'center' },
  { title: '产品', key: 'product', width: 180, ellipsis: true },
  { title: '配件编码', dataIndex: 'materialCode', width: 120, ellipsis: true },
  { title: '配件名称', dataIndex: 'materialName', width: 160, ellipsis: true },
  { title: '规格', dataIndex: 'specModel', width: 120, ellipsis: true },
  { title: '单位', dataIndex: 'unit', width: 64 },
  { title: '单位用量', dataIndex: 'unitQty', width: 88, align: 'right' },
  { title: '套数', key: 'kitSets', width: 100, align: 'right' },
  { title: '需求量', key: 'shipQty', width: 110, align: 'right' },
  { title: '可用库存', key: 'availableStock', width: 96, align: 'right' },
  { title: '缺口', key: 'gapQty', width: 88, align: 'right' },
]

function formatQty(val) {
  return formatNumber(val, 4, { empty: '—' })
}

function persist() {
  rows.value.forEach((r) => enrichShipAccessoryStock(r, props.warehouse))
  emit('change', props.order.shipAccessories)
}

function onKitSetsChange(record) {
  const sets = Math.max(0, Number(record.kitSets) || 0)
  const unit = Number(record.unitQty) || 1
  record.shipQty = Math.round(unit * sets * 10000) / 10000
  record.planQty = record.shipQty
  persist()
}

function handleSync() {
  syncing.value = true
  try {
    syncSalesOrderShipAccessories(props.order, {
      warehouse: props.warehouse,
      defaultSelected: true,
    })
    emit('change', props.order.shipAccessories)
    message.success(
      props.order.shipAccessories?.length
        ? `已带出 ${props.order.shipAccessories.length} 项随货配件`
        : '未匹配到已启用的随货配件标准包',
    )
  } finally {
    syncing.value = false
  }
}

function handleConvertPurchase() {
  converting.value = true
  try {
    const res = buildRequisitionFromShipAccessoryGaps(props.order, props.order.shipAccessories, {
      warehouse: props.warehouse,
    })
    if (!res.ok) {
      message.warning(res.message || '转采购失败')
      return
    }
    message.success(res.message)
    const path = `/procurement/purchase-req/${res.requisition.id}`
    openTab(path, `采购申请 ${res.requisition.reqNo}`)
    router.push(path).catch(() => {})
  } finally {
    converting.value = false
  }
}

watch(
  () => props.order?.id,
  () => {
    if (!props.order) return
    if (!props.order.shipAccessories?.length) {
      syncSalesOrderShipAccessories(props.order, {
        warehouse: props.warehouse,
        defaultSelected: true,
      })
    } else {
      props.order.shipAccessories.forEach((r) => enrichShipAccessoryStock(r, props.warehouse))
    }
  },
  { immediate: true },
)
</script>

<style scoped>
.so-ship-acc {
  width: 100%;
}
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.hint {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
}
.gap-warn {
  color: #ff4d4f;
  font-weight: 600;
}
.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
