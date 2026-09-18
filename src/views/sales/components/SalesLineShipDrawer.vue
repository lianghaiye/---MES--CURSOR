<template>
  <a-drawer :open="open" :title="drawerTitle" width="980" destroy-on-close @close="handleClose">
    <div v-if="lineRow" class="ship-drawer-body">
      <div class="subtitle">
        <span>销售单号：{{ lineRow.orderNo || '—' }}</span>
        <span class="sep">·</span>
        <span>客户：{{ lineRow.customerName || '—' }}</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="displayDeliveries"
        row-key="id"
        size="small"
        bordered
        :pagination="false"
        :scroll="{ x: 960, y: 420 }"
        :locale="{ emptyText: '本行暂无发货单' }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'deliveryCode'">
            <a class="link-code" @click.prevent="openDeliveryDetail(record)">{{
              record.deliveryCode || '—'
            }}</a>
          </template>
          <template v-else-if="column.key === 'lineShipQty'">
            {{ formatQty(record.lineShipQty) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '—' }}
          </template>
        </template>
      </a-table>
    </div>
    <a-empty v-else description="未选择销售明细行" />

    <template #footer>
      <div class="drawer-footer">
        <a-button @click="handleClose">关闭</a-button>
        <a-button type="primary" :disabled="!lineRow?.orderId" @click="openSalesOrder">
          打开销售订单
        </a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { salesOrderState } from '@/store/salesOrderStore'
import { listDeliveriesForLine } from '@/utils/salesLineShipInfo'

const props = defineProps({
  open: Boolean,
  lineRow: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const { openTab } = useTabs()

const columns = [
  { key: 'deliveryCode', title: '发货单号', width: 140, fixed: 'left' },
  { key: 'shipmentMethod', title: '交货方式', dataIndex: 'shipmentMethod', width: 90 },
  {
    key: 'lineShipQty',
    title: '发货数量',
    dataIndex: 'lineShipQty',
    width: 90,
    align: 'right',
  },
  { key: 'logisticsNo', title: '物流单号', dataIndex: 'logisticsNo', width: 130, ellipsis: true },
  {
    key: 'deliveryAddress',
    title: '交货地址',
    dataIndex: 'deliveryAddress',
    width: 180,
    ellipsis: true,
  },
  { key: 'outboundWarehouse', title: '出库仓库', dataIndex: 'outboundWarehouse', width: 110 },
  { key: 'driverName', title: '司机姓名', dataIndex: 'driverName', width: 90 },
  { key: 'driverPhone', title: '司机联系方式', dataIndex: 'driverPhone', width: 120 },
  { key: 'plateNo', title: '车牌号', dataIndex: 'plateNo', width: 100 },
]

const drawerTitle = computed(() => {
  const name = props.lineRow?.productName || '—'
  return `发货信息 · ${name}`
})

const displayDeliveries = computed(() => {
  void salesOrderState.orders
  const row = props.lineRow
  if (!row?.orderId || !row?.lineId) return []
  const order = salesOrderState.orders.find((o) => o.id === row.orderId)
  return listDeliveriesForLine(order, row.lineId)
})

function handleClose() {
  emit('update:open', false)
}

function formatQty(val) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (!Number.isFinite(n)) return '—'
  return String(n)
}

function openDeliveryDetail(record) {
  if (!record?.id) return
  const path = `/sales/delivery/${record.id}`
  openTab(path, `发货单 ${record.deliveryCode || ''}`)
  router.push({ name: 'sales-delivery-detail', params: { id: record.id } })
}

function openSalesOrder() {
  const row = props.lineRow
  if (!row?.orderId) return
  const path = `/sales/orders/${row.orderId}`
  openTab(path, `销售订单 ${row.orderNo || ''}`)
  router.push({
    name: 'sales-orders-detail',
    params: { id: row.orderId },
  })
  handleClose()
}
</script>

<style lang="less" scoped>
.ship-drawer-body {
  .subtitle {
    margin-bottom: 12px;
    color: rgba(0, 0, 0, 0.65);
    font-size: 13px;

    .sep {
      margin: 0 6px;
      color: rgba(0, 0, 0, 0.25);
    }
  }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.link-code {
  color: #1677ff;
  cursor: pointer;

  &:hover {
    color: #4096ff;
  }
}
</style>
