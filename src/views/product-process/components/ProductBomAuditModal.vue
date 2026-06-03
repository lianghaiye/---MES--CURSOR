<template>
  <a-modal
    :open="open"
    title="审核发布"
    width="520px"
    :mask-closable="false"
    destroy-on-close
    @cancel="emit('update:open', false)"
  >
    <a-descriptions v-if="record" bordered size="small" :column="1">
      <a-descriptions-item label="BOM编号">{{ record.bomNo }}</a-descriptions-item>
      <a-descriptions-item label="BOM名称">{{ record.bomName }}</a-descriptions-item>
      <a-descriptions-item label="物品">{{ record.itemName }}</a-descriptions-item>
      <a-descriptions-item label="版本">{{ record.version }}</a-descriptions-item>
      <a-descriptions-item label="当前状态">
        <a-tag :color="bomStatusColor(record.status)">{{ record.status }}</a-tag>
      </a-descriptions-item>
    </a-descriptions>

    <a-alert
      v-if="activeConflict"
      type="warning"
      show-icon
      class="conflict-alert"
      :message="`该物品已有生效 BOM：${activeConflict.bomNo}（${activeConflict.version}）。审核通过后将自动归档原生效版本。`"
    />

    <a-form layout="vertical" class="audit-form">
      <a-form-item label="审核结果">
        <a-radio-group v-model:value="approved">
          <a-radio :value="true">通过并发布</a-radio>
          <a-radio :value="false">驳回（保持待发布）</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item v-if="approved" label="发布后状态">
        <a-radio-group v-model:value="publishMode">
          <a-radio value="active">直接生效（使用中，可用于生产）</a-radio>
          <a-radio value="pending">待启用（需手动启用后用于生产）</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="审核意见">
        <a-textarea v-model:value="comment" :rows="3" placeholder="选填" />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-button @click="emit('update:open', false)">取消</a-button>
      <a-button type="primary" :loading="loading" @click="submit">确认</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { bomStatusColor } from '@/mock/productBomOptions'
import { auditPublishBom, getActiveBomForItem } from '@/store/productBomStore'

const props = defineProps({
  open: Boolean,
  record: { type: Object, default: null },
})
const emit = defineEmits(['update:open', 'done'])

const approved = ref(true)
const publishMode = ref('active')
const comment = ref('')
const loading = ref(false)

const activeConflict = computed(() => {
  if (!props.record || !approved.value) return null
  const active = getActiveBomForItem(props.record.itemType, props.record.itemId)
  if (active && active.id !== props.record.id) return active
  return null
})

watch(
  () => props.open,
  (v) => {
    if (v) {
      approved.value = true
      publishMode.value = 'active'
      comment.value = ''
    }
  },
)

async function submit() {
  if (!props.record) return
  loading.value = true
  try {
    const res = auditPublishBom(props.record.id, {
      approved: approved.value,
      asPendingEnable: approved.value && publishMode.value === 'pending',
    })
    if (res?.error) {
      message.error(res.error)
      return
    }
    if (!approved.value) {
      message.info('已驳回，版本仍为待发布')
    } else if (publishMode.value === 'pending') {
      message.success('审核通过，状态为待启用')
    } else {
      message.success('审核发布成功，已生效，可用于生产')
    }
    emit('done')
    emit('update:open', false)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="less" scoped>
.conflict-alert {
  margin: 12px 0;
}
.audit-form {
  margin-top: 12px;
}
</style>
