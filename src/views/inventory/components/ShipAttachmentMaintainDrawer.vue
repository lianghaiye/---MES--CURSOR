<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    width="1180"
    class="ship-attachment-maintain-drawer"
    :mask-closable="false"
    destroy-on-close
    @close="handleClose"
  >
    <DeliveryShipAttachmentSection
      v-if="draft"
      ref="editorRef"
      v-model="draft.shipAttachments"
      :line-items="draft.lineItems"
      :scatter-shipments="draft.scatterShipments"
      :sales-order="salesOrder"
      :sales-order-id="draft.salesOrderId || ''"
      :warehouse="draft.outboundWarehouse || ''"
      :disabled="!editable"
      show-bring-standard-kit
      expand-all-by-default
      title="本单纳入附件"
      title-tip="勾选「纳入本单」即本票要发的附件。待出库时可保存并再次同步到出库单；出库单已出库后不可再改。"
      hide-inner-alert
      hide-product-source-columns
      show-outbound-status
      :delivery="delivery"
      empty-description="暂无附件。可点「带出标准包」按本单产品带出（默认不纳入），再勾选纳入。"
    />

    <div class="kit-wrap">
      <ShipAttachmentStandardKitBlock :kits="standardKits" />
    </div>

    <template #footer>
      <a-space>
        <a-button size="small" @click="handleClose">{{ editable ? '取消' : '关闭' }}</a-button>
        <a-tooltip :title="saveTip">
          <a-button
            type="primary"
            size="small"
            :loading="saving"
            :disabled="!editable"
            @click="handleSave"
          >
            保存并同步到出库单
          </a-button>
        </a-tooltip>
      </a-space>
    </template>
  </a-drawer>
</template>

<script>
export default { name: 'ShipAttachmentMaintainDrawer' }
</script>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { canEditDeliveryOrder, updateDeliveryOrder } from '@/store/deliveryOrderStore'
import { salesOrderState } from '@/store/salesOrderStore'
import { findLinkedSalesOutbound } from '@/utils/deliveryOutbound'
import { suggestStandardKitsForDelivery } from '@/utils/shipAttachmentQuery'
import DeliveryShipAttachmentSection from '@/views/sales/components/DeliveryShipAttachmentSection.vue'
import ShipAttachmentStandardKitBlock from './ShipAttachmentStandardKitBlock.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  delivery: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const editorRef = ref(null)
const saving = ref(false)
const draft = ref(null)

const editable = computed(() => canEditDeliveryOrder(props.delivery))

const linkedOutbound = computed(() => findLinkedSalesOutbound(props.delivery))

const drawerTitle = computed(() => {
  const code = props.delivery?.deliveryCode || ''
  return code ? `维护发货附件 · ${code}` : '维护发货附件'
})

const salesOrder = computed(() => {
  const id = draft.value?.salesOrderId || props.delivery?.salesOrderId
  if (!id) return null
  return salesOrderState.orders.find((o) => o.id === id) || null
})

const standardKits = computed(() => suggestStandardKitsForDelivery(props.delivery || draft.value))

const saveTip = computed(() => {
  if (!editable.value) return '出库单已出库或已发货，不可再改附件'
  if (linkedOutbound.value?.status === '待出库') {
    return '修改后保存会覆盖同步到同一张待出库的销售出库单'
  }
  return '保存后写入本发货单，并生成/同步到同一张销售出库单'
})

watch(
  () => [props.open, props.delivery?.id],
  ([open]) => {
    if (!open || !props.delivery) {
      draft.value = null
      return
    }
    draft.value = {
      id: props.delivery.id,
      salesOrderId: props.delivery.salesOrderId || '',
      outboundWarehouse: props.delivery.outboundWarehouse || '',
      lineItems: JSON.parse(JSON.stringify(props.delivery.lineItems || [])),
      scatterShipments: JSON.parse(JSON.stringify(props.delivery.scatterShipments || [])),
      shipAttachments: JSON.parse(JSON.stringify(props.delivery.shipAttachments || [])),
    }
  },
)

function handleClose() {
  emit('update:open', false)
}

function handleSave() {
  if (!editable.value) {
    message.warning('当前发货单不可维护附件')
    return
  }
  if (!draft.value?.id) return
  if (editorRef.value && editorRef.value.validate() === false) return

  saving.value = true
  try {
    const res = updateDeliveryOrder(draft.value.id, {
      shipAttachments: JSON.parse(JSON.stringify(draft.value.shipAttachments || [])),
    })
    if (res && res.ok === false) {
      message.warning(res.message || '保存失败')
      return
    }
    const synced = res?.outboundSynced ? '，已同步到出库单' : ''
    message.success(`发货附件已保存${synced}`)
    emit('saved')
    handleClose()
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.kit-wrap {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}
</style>
