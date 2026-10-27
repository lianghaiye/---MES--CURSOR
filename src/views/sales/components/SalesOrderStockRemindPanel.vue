<template>
  <div class="stock-remind">
    <a-table
      size="small"
      bordered
      row-key="lineId"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
      :scroll="{ x: 1080 }"
      :row-class-name="rowClassName"
      :locale="{ emptyText: '暂无销售明细或随货配件，添加后将按现存量与他单占用展示库存提醒' }"
    >
      <template #headerCell="{ column }">
        <template v-if="column.key === 'mtsWip'">
          <span class="col-title-with-tip">
            在途在制
            <a-tooltip :title="MTS_WIP_COLUMN_TIP">
              <QuestionCircleOutlined class="col-tip-icon" />
            </a-tooltip>
          </span>
        </template>
        <template v-else>{{ column.title }}</template>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'mtsWip'">
          <span v-if="record.isMts">{{ record.mtsWipText || '—' }}</span>
          <span v-else class="muted">—</span>
        </template>
        <template v-else-if="column.key === 'otherQty'">
          {{ record.otherQty || 0 }}
        </template>
        <template v-else-if="column.key === 'source'">
          <a-tag :color="record.source === '随货配件' ? 'blue' : 'default'">{{
            record.source
          }}</a-tag>
        </template>
        <template v-else-if="column.key === 'specModel' || column.key === 'material'">
          {{ record[column.dataIndex] || '—' }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import {
  buildLineStockReminder,
  salesStockAllocationState,
} from '@/store/salesStockAllocationStore'
import { getMtsFreeStockWipByItemCode } from '@/utils/mtsFreeStockWip'
import { workOrderState } from '@/store/workOrderStore'
import { assemblyWorkOrderState } from '@/store/assemblyWorkOrderStore'
import { productionPlanState } from '@/store/productionPlanStore'
import { functionParamState, isShipAttachmentDecidedAtOrder } from '@/store/functionParamStore'

const MTS_WIP_COLUMN_TIP =
  '当前仅展示自由备货相关数量，即计划策略为「按库存MTS」的在途/在制（待下发/执行中）。不含按销售订单排产的在制。'

const props = defineProps({
  order: { type: Object, required: true },
  /** 高亮指定销售明细行 */
  focusLineId: { type: String, default: '' },
})

const columns = [
  { title: '来源', key: 'source', dataIndex: 'source', width: 96 },
  { title: '编码', dataIndex: 'itemCode', width: 110 },
  { title: '名称', dataIndex: 'productName', ellipsis: true, width: 140 },
  { title: '规格型号', key: 'specModel', dataIndex: 'specModel', ellipsis: true, width: 100 },
  { title: '材质', key: 'material', dataIndex: 'material', ellipsis: true, width: 80 },
  { title: '自由备货量', dataIndex: 'freeQty', width: 96, align: 'right' },
  { title: '他单占用', key: 'otherQty', dataIndex: 'otherQty', width: 88, align: 'right' },
  { title: '现存总量', dataIndex: 'onHand', width: 88, align: 'right' },
  { title: '需求', dataIndex: 'need', width: 72, align: 'right' },
  { title: '可用量', dataIndex: 'availableQty', width: 80, align: 'right' },
  { title: '在途在制', key: 'mtsWip', width: 130, align: 'right' },
  { title: '库存状态', key: 'status', width: 96 },
]

function toRemindRow(line, order, extra) {
  const r = buildLineStockReminder(line, order)
  const mtsWip = getMtsFreeStockWipByItemCode(r.itemCode)
  return {
    ...r,
    ...extra,
    productName: extra.productName || line.productName || '',
    specModel: extra.specModel || line.specModel || '',
    material: extra.material || line.material || '',
    availableQty: Math.max(0, (Number(r.onHand) || 0) - (Number(r.otherQty) || 0)),
    mtsWipQty: mtsWip.mtsWipQty,
    mtsWipText: mtsWip.mtsWipText,
    isMts: mtsWip.isMts,
  }
}

const rows = computed(() => {
  void salesStockAllocationState.allocations
  void workOrderState.orders
  void assemblyWorkOrderState.orders
  void productionPlanState.orders
  const order = props.order
  const salesRows = (order?.lineItems || [])
    .filter((l) => l.productCode)
    .map((line) =>
      toRemindRow(line, order, {
        lineId: line.id,
        source: '销售明细',
        productName: line.productName || '',
        specModel: line.specModel || '',
        material: line.material || '',
      }),
    )
  void functionParamState.params.shipAttachmentDecideStage
  const accessoryRows = isShipAttachmentDecidedAtOrder()
    ? (order?.shipAccessories || [])
        .filter((row) => row.materialCode || row.itemCode)
        .map((row) => {
          const code = row.materialCode || row.itemCode
          return toRemindRow(
            {
              id: row.id,
              productCode: code,
              productName: row.materialName || '',
              specModel: row.specModel || '',
              material: row.material || '',
              salesQty: Number(row.shipQty ?? row.planQty) || 0,
            },
            order,
            {
              lineId: `acc-${row.id}`,
              source: '随货配件',
              productName: row.materialName || '',
              specModel: row.specModel || '',
              material: row.material || '',
            },
          )
        })
    : []
  return [...salesRows, ...accessoryRows]
})

function statusColor(status) {
  if (status === '缺货') return 'error'
  if (status === '部分缺货') return 'warning'
  return 'success'
}

function rowClassName(record) {
  return props.focusLineId && String(record.lineId) === String(props.focusLineId)
    ? 'stock-remind-row-focus'
    : ''
}
</script>

<style lang="less" scoped>
.stock-remind {
  :deep(.ant-table-body) {
    overflow-y: visible !important;
    max-height: none !important;
  }

  :deep(.stock-remind-row-focus) > td {
    background: #e6f4ff !important;
  }
}

.muted {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
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
</style>
