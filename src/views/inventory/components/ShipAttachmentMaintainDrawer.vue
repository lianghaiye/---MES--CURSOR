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
    <a-alert type="info" show-icon class="drawer-alert" :message="statusHint" />
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
      empty-description="暂无发货附件。可点「带出标准包」按本单产品带出（默认不纳入），再勾选纳入。"
    />
    <template #footer>
      <a-space>
        <a-button size="small" @click="handleClose">取消</a-button>
        <a-button
          type="primary"
          size="small"
          :loading="saving"
          :disabled="!editable"
          @click="handleSave"
        >
          保存
        </a-button>
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
import DeliveryShipAttachmentSection from '@/views/sales/components/DeliveryShipAttachmentSection.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  delivery: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const editorRef = ref(null)
const saving = ref(false)
const draft = ref(null)

const editable = computed(() => canEditDeliveryOrder(props.delivery))

const drawerTitle = computed(() => {
  const code = props.delivery?.deliveryCode || ''
  return code ? `维护发货附件 · ${code}` : '维护发货附件'
})

const salesOrder = computed(() => {
  const id = draft.value?.salesOrderId || props.delivery?.salesOrderId
  if (!id) return null
  return salesOrderState.orders.find((o) => o.id === id) || null
})

const statusHint = computed(() => {
  if (!editable.value) {
    return '关联出库单已出库或发货单已不可改，附件仅供查看。'
  }
  return '纳入后会随本发货单生成/同步到同一张销售出库单。默认不纳入；请勾选本票要发的附件并填写套数。'
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
    const synced = res?.outboundSynced ? '，关联待出库出库单已同步更新' : ''
    message.success(`发货附件已保存${synced}`)
    emit('saved')
    handleClose()
  } finally {
    saving.value = false
  }
}
</script>

<style lang="less" scoped>
.drawer-alert {
  margin-bottom: 12px;
}
</style>
