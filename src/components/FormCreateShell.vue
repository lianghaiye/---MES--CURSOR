<template>
  <div v-if="pageMode && embedded && contentOnly" class="form-embedded-content-only">
    <div class="embedded-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="embedded-footer">
      <slot name="footer" />
    </div>
  </div>
  <div v-else-if="pageMode && embedded" class="form-embedded-panel">
    <div class="embedded-header">
      <div class="header-left">
        <span class="page-title">{{ title }}</span>
        <slot name="header-extra" />
      </div>
      <a-space v-if="$slots.footer" :size="8" class="header-actions">
        <slot name="footer" />
      </a-space>
    </div>
    <div class="embedded-body">
      <slot />
    </div>
  </div>
  <div v-else-if="pageMode && detailMode" class="form-detail-page">
    <div class="detail-sticky-bar">
      <div class="page-header is-detail">
        <div class="header-left">
          <span class="order-no">{{ title }}</span>
          <slot name="header-extra" />
        </div>
        <a-space v-if="$slots.footer" :size="8" class="header-actions">
          <slot name="footer" />
        </a-space>
      </div>
    </div>
    <div class="tab-body">
      <slot />
    </div>
  </div>
  <div v-else-if="pageMode" class="form-create-page" :class="rootClass">
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
    :class="rootClass"
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
import { computed, useAttrs } from 'vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  pageMode: { type: Boolean, default: false },
  /** 只读详情：顶栏对齐销售订单（单号 + 标签 + 右侧操作） */
  detailMode: { type: Boolean, default: false },
  /** 主从卡片右侧内嵌（无返回、占满容器高度） */
  embedded: { type: Boolean, default: false },
  /** 仅表单内容（用于详情 Tab，不重复顶栏） */
  contentOnly: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [String, Number], default: '720px' },
  /** 页面模式左右内边距；默认 0，与 GlobalTabs / 内容白盒左缘对齐（勿再叠一层 12） */
  pageSidePadding: { type: [String, Number], default: 0 },
  maskClosable: { type: Boolean, default: false },
  destroyOnClose: { type: Boolean, default: true },
})

defineEmits(['cancel', 'update:open'])

const attrs = useAttrs()
const rootClass = computed(() => attrs.class)

const innerStyle = computed(() => {
  const pad =
    typeof props.pageSidePadding === 'number'
      ? `${props.pageSidePadding}px`
      : String(props.pageSidePadding)
  return { paddingLeft: pad, paddingRight: pad }
})
</script>

<style lang="less" scoped>
.form-embedded-content-only {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--page-bg, #f0f2f5);

  .embedded-body {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    padding: 0 0 8px;
    display: flex;
    flex-direction: column;

    :deep(.section-block) {
      background: #fff;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      .section-title {
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 10px;
        color: #1f1f1f;
      }
    }

    :deep(.form-layout) {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
  }

  .embedded-footer {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 8px 0 0;
    background: var(--page-bg, #f0f2f5);
  }
}

.form-embedded-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  overflow: hidden;
}

.embedded-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.embedded-body {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;

  :deep(.section-block) {
    background: #fff;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 10px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

    .section-title {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #1f1f1f;
    }
  }

  :deep(.form-layout) {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
}

.form-detail-page {
  margin: -12px;
  padding: 12px;
  height: calc(100vh - 112px);
  max-height: calc(100vh - 112px);
  min-height: 0;
  background: var(--page-bg, #f0f2f5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-sticky-bar {
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--page-bg, #f0f2f5);
}

.page-header.is-detail {
  border: 1px solid #e8eef8;
  border-radius: 8px;
  margin-bottom: 0;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  position: static;
  background: linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%);

  .header-left {
    gap: 8px;
  }
}

.order-no {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

.tab-body {
  flex: 1;
  min-height: 0;
  padding: 8px 0 16px;
  overflow: auto;
}

.form-create-page {
  /* 抵消 page-content 的 12px padding；本层 padding 12 后与 GlobalTabs（margin 24）左缘对齐 */
  margin: -12px;
  padding: 12px 12px 24px;
  background: var(--page-bg, #f0f2f5);
  min-height: calc(100vh - 112px);
  box-sizing: border-box;
  /* 明细随内容撑开，整页滚动；勿锁高度导致表内滚动 */
  height: auto;
  max-height: none;
  overflow: visible;
}

.form-create-inner {
  width: 100%;
  margin: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  min-height: 48px;
  padding: 0 16px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #f0f5ff 0%, #ffffff 100%);
  border: 1px solid #e8eef8;
  border-radius: 8px;
  margin-bottom: 0;
  position: sticky;
  top: 0;
  z-index: 30;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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
  display: flex;
  flex-direction: column;
  gap: 8px;

  :deep(.form-layout) {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  :deep(.section-block) {
    background: #fff;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 0;
    border: 1px solid #e5e6eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    flex: none;

    .section-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #1f1f1f;
    }

    .section-divider {
      display: none;
    }
  }
}
</style>
