<template>
  <a-modal
    :open="open"
    :title="isEdit ? '编辑看板' : '新建看板'"
    ok-text="保存"
    cancel-text="取消"
    destroy-on-close
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <a-form layout="vertical" :model="form">
      <a-form-item label="名称" required>
        <a-input v-model:value="form.name" placeholder="请输入看板名称" allow-clear />
      </a-form-item>
      <a-form-item label="编码" required>
        <a-input
          v-model:value="form.code"
          placeholder="如 work-order-monitor"
          allow-clear
          :disabled="isEdit"
        />
      </a-form-item>
      <a-form-item label="播放地址" required>
        <a-input v-model:value="form.playPath" placeholder="/board/xxx/screen" allow-clear />
      </a-form-item>
      <a-form-item label="启用">
        <a-switch v-model:checked="form.enabled" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { saveBoardCatalog } from '@/store/boardCatalogStore'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})

const emit = defineEmits(['update:open', 'saved'])

const isEdit = computed(() => Boolean(props.record?.id))

const form = reactive({
  id: '',
  name: '',
  code: '',
  playPath: '',
  enabled: true,
})

watch(
  () => [props.open, props.record],
  () => {
    if (!props.open) return
    form.id = props.record?.id || ''
    form.name = props.record?.name || ''
    form.code = props.record?.code || ''
    form.playPath = props.record?.playPath || ''
    form.enabled = props.record?.enabled !== false
  },
  { immediate: true },
)

function handleOk() {
  const res = saveBoardCatalog({ ...form })
  if (!res.ok) {
    message.error(res.message)
    return
  }
  message.success('已保存')
  emit('update:open', false)
  emit('saved')
}
</script>
