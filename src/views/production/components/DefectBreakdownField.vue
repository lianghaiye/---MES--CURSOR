<template>
  <div v-if="defectQty > 0 && items.length" class="defect-breakdown">
    <div class="breakdown-head">
      <span class="breakdown-label">不良原因分配</span>
      <span class="breakdown-status" :class="statusClass">{{ allocated }} / {{ defectQty }}</span>
    </div>
    <div v-for="item in items" :key="item.id" class="breakdown-row">
      <span class="reason-name">{{ item.name }}</span>
      <a-input-number
        :value="getQty(item.id)"
        :min="0"
        :max="maxQtyFor(item.id)"
        :precision="0"
        size="small"
        style="width: 96px"
        @update:value="(val) => setQty(item, val)"
      />
    </div>
    <div v-if="allocated !== defectQty" class="breakdown-hint">
      请将 {{ defectQty }} 件不良品全部分配到各原因
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getBreakdownQty, setBreakdownQty, sumBreakdownQty } from '@/utils/defectBreakdown'

const props = defineProps({
  defectQty: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
  modelValue: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const allocated = computed(() => sumBreakdownQty(props.modelValue))

const statusClass = computed(() => {
  if (allocated.value === props.defectQty) return 'ok'
  if (allocated.value > props.defectQty) return 'over'
  return 'warn'
})

function getQty(itemId) {
  return getBreakdownQty(props.modelValue, itemId)
}

function maxQtyFor(itemId) {
  const current = getQty(itemId)
  const remaining = Math.max(0, props.defectQty - allocated.value + current)
  return remaining
}

function setQty(item, val) {
  const next = setBreakdownQty(props.modelValue, item, val)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.defect-breakdown {
  margin-bottom: 8px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}

.breakdown-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.breakdown-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.breakdown-status {
  font-size: 12px;
  color: #fa8c16;
  font-weight: 600;
}

.breakdown-status.ok {
  color: #52c41a;
}

.breakdown-status.over {
  color: #ff4d4f;
}

.breakdown-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f0f0f0;
}

.breakdown-row:last-of-type {
  border-bottom: none;
}

.reason-name {
  flex: 1;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.88);
}

.breakdown-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
