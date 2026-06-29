<template>
  <a-modal
    v-model:open="openModel"
    :title="modalTitle"
    width="880px"
    :footer="null"
    destroy-on-close
    @cancel="handleClose"
  >
    <template v-if="record">
      <a-descriptions bordered size="small" :column="3">
        <a-descriptions-item label="出入库单号">{{ record.docNo }}</a-descriptions-item>
        <a-descriptions-item label="业务类型">{{ record.businessType }}</a-descriptions-item>
        <a-descriptions-item label="单据类型">{{ record.docType }}</a-descriptions-item>
        <a-descriptions-item label="单据状态">
          <a-tag :color="inOutDocStatusColor(resolvedDocStatus)">{{
            resolvedDocStatus || '—'
          }}</a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="出入库状态">
          <a-tag v-if="record.ioStatus" :color="ioStatusColor(record.ioStatus)">
            {{ record.ioStatus }}
          </a-tag>
          <span v-else>—</span>
        </a-descriptions-item>
        <a-descriptions-item label="物品类型">{{ record.itemType || '—' }}</a-descriptions-item>
        <a-descriptions-item label="物品名称">{{ record.itemName || '—' }}</a-descriptions-item>
        <a-descriptions-item label="规格属性">{{ record.specAttr || '—' }}</a-descriptions-item>
        <a-descriptions-item label="数量">{{ record.qty ?? '—' }}</a-descriptions-item>
        <a-descriptions-item label="变动后库存数">{{
          record.stockAfter ?? '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="单位">{{ record.unit || '—' }}</a-descriptions-item>
        <a-descriptions-item label="条码编号/批次号" :span="2">
          {{ record.barcodeBatchNo || '—' }}
        </a-descriptions-item>
        <a-descriptions-item label="生产日期">{{
          record.productionDate || '—'
        }}</a-descriptions-item>
        <a-descriptions-item label="过账日期">{{ record.postingDate || '—' }}</a-descriptions-item>
        <a-descriptions-item label="过期日期">{{ record.expiryDate || '—' }}</a-descriptions-item>
        <a-descriptions-item label="操作人">{{ record.operator || '—' }}</a-descriptions-item>
        <a-descriptions-item label="备注" :span="3">{{ record.remark || '—' }}</a-descriptions-item>
      </a-descriptions>

      <div v-if="record.businessType === '出库单'" class="outbound-placeholder">
        出库单详情功能暂未开放，后续补充。
      </div>
    </template>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
import { resolveInOutDocStatus, inOutDocStatusColor } from '@/utils/inOutDetailHelpers'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open'])

const openModel = computed({
  get: () => props.open,
  set: (val) => emit('update:open', val),
})

const modalTitle = computed(() => {
  if (!props.record) return '出入库详情'
  return `${props.record.businessType}详情 · ${props.record.docNo}`
})

const resolvedDocStatus = computed(() => resolveInOutDocStatus(props.record))

function ioStatusColor(status) {
  const map = { 待入库: 'warning', 部分入库: 'processing', 全部入库: 'success' }
  return map[status] || 'default'
}

function handleClose() {
  openModel.value = false
}
</script>

<style scoped>
.outbound-placeholder {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}
</style>
