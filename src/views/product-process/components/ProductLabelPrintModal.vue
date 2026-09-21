<template>
  <a-modal :open="open" title="打印产品标签" :width="480" destroy-on-close @cancel="handleClose">
    <a-form layout="vertical" class="label-print-form">
      <a-form-item label="已选产品/物料">
        <div class="selected-summary">共 {{ items.length }} 项</div>
        <div class="selected-list">
          <div v-for="item in items.slice(0, 8)" :key="item.id || item.code" class="selected-row">
            <span class="code">{{ item.code }}</span>
            <span class="name">{{ item.name || '—' }}</span>
          </div>
          <div v-if="items.length > 8" class="selected-more">… 还有 {{ items.length - 8 }} 项</div>
        </div>
      </a-form-item>
      <a-form-item label="每项打印份数">
        <a-input-number v-model:value="copies" :min="1" :max="99" style="width: 120px" />
      </a-form-item>
      <div class="hint">二维码内容为产品/物料编码，贴标后可用小程序扫码盘点。</div>
    </a-form>
    <template #footer>
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" @click="handlePreview">预览并打印</a-button>
    </template>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { openProductLabelPrintPreview } from '@/utils/productLabelPrintPreview'

const props = defineProps({
  open: { type: Boolean, default: false },
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open'])

const router = useRouter()
const { openTab } = useTabs()
const copies = ref(1)

watch(
  () => props.open,
  (v) => {
    if (v) copies.value = 1
  },
)

function handleClose() {
  emit('update:open', false)
}

function handlePreview() {
  const result = openProductLabelPrintPreview(router, openTab, props.items, {
    copies: copies.value,
  })
  if (result?.ok) handleClose()
}
</script>

<style lang="less" scoped>
.label-print-form {
  .selected-summary {
    margin-bottom: 8px;
    color: rgba(0, 0, 0, 0.65);
  }

  .selected-list {
    max-height: 180px;
    overflow: auto;
    padding: 8px 10px;
    background: #fafafa;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  .selected-row {
    display: flex;
    gap: 8px;
    font-size: 13px;
    line-height: 22px;

    .code {
      flex-shrink: 0;
      font-weight: 600;
      color: rgba(0, 0, 0, 0.88);
    }

    .name {
      min-width: 0;
      color: rgba(0, 0, 0, 0.65);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .selected-more {
    margin-top: 4px;
    color: rgba(0, 0, 0, 0.45);
    font-size: 12px;
  }

  .hint {
    margin-top: 4px;
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45);
  }
}
</style>
