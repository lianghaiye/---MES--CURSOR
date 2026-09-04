<template>
  <div v-if="pageMode" class="form-create-page">
    <div class="form-create-inner" :style="innerStyle">
      <div class="page-header">
        <div class="header-left">
          <a-button type="text" size="small" class="back-btn" @click="$emit('cancel')">
            <ArrowLeftOutlined />
          </a-button>
          <span class="page-title">{{ title }}</span>
        </div>
        <div v-if="$slots.footer" class="header-actions">
          <slot name="footer" />
        </div>
      </div>
      <div class="form-body">
        <slot />
      </div>
    </div>
  </div>
  <a-modal
    v-else
    :open="open"
    :title="title"
    :width="width"
    :mask-closable="maskClosable"
    :destroy-on-close="destroyOnClose"
    @cancel="$emit('cancel')"
    @update:open="(val) => $emit('update:open', val)"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <div class="footer-actions">
        <slot name="footer" />
      </div>
    </template>
  </a-modal>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

const props = defineProps({
  pageMode: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: '720px' },
  /** 页面模式左右内边距，默认 12 */
  pageSidePadding: { type: [String, Number], default: 12 },
  maskClosable: { type: Boolean, default: false },
  destroyOnClose: { type: Boolean, default: true },
})

defineEmits(['cancel', 'update:open'])

const innerStyle = computed(() => {
  const pad =
    typeof props.pageSidePadding === 'number'
      ? `${props.pageSidePadding}px`
      : String(props.pageSidePadding)
  return { paddingLeft: pad, paddingRight: pad }
})
</script>

<style lang="less" scoped>
.form-create-page {
  margin: -12px;
  padding: 0 0 24px;
  background: #f5f6f8;
  min-height: calc(100vh - 112px);
}

/* 全宽大盒子：标题栏与下方分区白盒同宽 */
.form-create-inner {
  width: 100%;
  margin: 12px 0 0;
  box-sizing: border-box;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  margin-bottom: 12px;
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.header-actions,
.footer-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 12px;

  :deep(.ant-btn + .ant-btn) {
    margin-inline-start: 0;
  }
}

.footer-actions {
  justify-content: flex-end;
  width: 100%;
}

.back-btn {
  padding: 0 4px;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
}

.form-body {
  padding: 0;

  :deep(.section-block) {
    background: #fff;
    border-radius: 6px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #1f1f1f;
    }

    .section-divider {
      display: none;
    }
  }
}
</style>
