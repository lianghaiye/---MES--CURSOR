<template>
  <div class="global-tabs">
    <a-tabs
      type="editable-card"
      hide-add
      :active-key="tabState.activePath"
      @change="onTabChange"
      @edit="onTabEdit"
    >
      <a-tab-pane
        v-for="tab in tabState.tabs"
        :key="tab.path"
        :tab="tab.title"
        :closable="tab.closable"
      />
    </a-tabs>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'

const router = useRouter()
const { tabState, closeTab, setActive, getTabNavigateTo } = useTabs()

function onTabChange(key) {
  setActive(key)
  // 必须推 fullPath（含 query），否则新建页会丢参并被重新 init
  router.push(getTabNavigateTo(key))
}

function onTabEdit(targetKey, action) {
  if (action === 'remove') {
    const closingActive = tabState.activePath === targetKey
    closeTab(targetKey)
    if (closingActive) {
      router.push(getTabNavigateTo(tabState.activePath))
    }
  }
}
</script>

<style lang="less" scoped>
.global-tabs {
  flex-shrink: 0;
  /* 与 page-content 的 margin(12) + padding(12) 对齐，保证标签盒与下方内容白盒左缘一致 */
  margin: 0 24px;
  padding: 8px 0 0;
  background: transparent;
  z-index: 40;

  :deep(.ant-tabs) {
    color: rgba(0, 0, 0, 0.65);
  }

  :deep(.ant-tabs-nav) {
    margin: 0 !important;
    padding: 4px;
    background: #fff;
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    box-sizing: border-box;

    &::before {
      display: none !important;
      border: none !important;
    }
  }

  :deep(.ant-tabs-nav-wrap) {
    overflow: visible !important;
  }

  :deep(.ant-tabs-nav-list) {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :deep(.ant-tabs-tab) {
    margin: 0 !important;
    padding: 6px 12px !important;
    background: transparent !important;
    border: none !important;
    border-radius: 6px !important;
    transition:
      background 0.2s,
      color 0.2s;

    + .ant-tabs-tab {
      margin: 0 !important;
    }

    .ant-tabs-tab-btn {
      color: rgba(0, 0, 0, 0.65);
      font-size: 13px;
      line-height: 20px;
      text-shadow: none;
    }

    .ant-tabs-tab-remove {
      margin-left: 6px;
      color: rgba(0, 0, 0, 0.35);
      font-size: 12px;

      &:hover {
        color: rgba(0, 0, 0, 0.65);
      }
    }

    &:hover {
      background: #f5f7fa !important;

      .ant-tabs-tab-btn {
        color: rgba(0, 0, 0, 0.88);
      }
    }
  }

  :deep(.ant-tabs-tab-active) {
    background: #e6f4ff !important;

    .ant-tabs-tab-btn {
      color: #1677ff !important;
      font-weight: 600;
    }

    .ant-tabs-tab-remove {
      color: #1677ff;

      &:hover {
        color: #0958d9;
      }
    }
  }

  :deep(.ant-tabs-ink-bar) {
    display: none !important;
  }

  :deep(.ant-tabs-nav-operations) {
    .ant-tabs-nav-more {
      padding: 4px 8px;
      border-radius: 6px;
    }
  }

  :deep(.ant-tabs-content-holder) {
    display: none;
  }
}
</style>
