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
      <template #rightExtra>
        <a-dropdown :trigger="['click']" placement="bottomRight">
          <a class="tabs-ops-trigger" @click.prevent>
            <EllipsisOutlined />
          </a>
          <template #overlay>
            <a-menu @click="onOpsMenuClick">
              <a-menu-item key="close-all">关闭所有</a-menu-item>
              <a-menu-item key="close-others">关闭其他</a-menu-item>
              <a-menu-item key="clear-cache">清除缓存</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>
    </a-tabs>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { EllipsisOutlined } from '@ant-design/icons-vue'
import { useTabs } from '@/composables/useTabs'
import { clearAllCreatePageDrafts } from '@/utils/createPageDraft'

const router = useRouter()
const { tabState, closeTab, closeAllTabs, closeOtherTabs, setActive, getTabNavigateTo } = useTabs()

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

function onOpsMenuClick({ key }) {
  if (key === 'close-all') {
    closeAllTabs()
    router.push(getTabNavigateTo(tabState.activePath))
    return
  }
  if (key === 'close-others') {
    closeOtherTabs()
    router.push(getTabNavigateTo(tabState.activePath))
    return
  }
  if (key === 'clear-cache') {
    Modal.confirm({
      title: '清除缓存',
      content: '将清除页面草稿等临时缓存并刷新，是否继续？',
      okText: '清除并刷新',
      cancelText: '取消',
      onOk: () => {
        clearAllCreatePageDrafts()
        message.success('缓存已清除，正在刷新…')
        window.location.reload()
      },
    })
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
  min-width: 0;

  :deep(.ant-tabs) {
    color: rgba(0, 0, 0, 0.65);
    min-width: 0;
  }

  :deep(.ant-tabs-nav) {
    margin: 0 !important;
    padding: 4px;
    background: #fff;
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    box-sizing: border-box;
    display: flex !important;
    align-items: center;
    flex-wrap: nowrap;
    min-width: 0;

    &::before {
      display: none !important;
      border: none !important;
    }
  }

  /* 标签可横向滚动/收纳，为右侧操作区留出空间 */
  :deep(.ant-tabs-nav-wrap) {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    overflow: hidden !important;
  }

  :deep(.ant-tabs-nav-list) {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :deep(.ant-tabs-nav-operations) {
    flex-shrink: 0;
    align-self: center;

    .ant-tabs-nav-more {
      padding: 4px 8px;
      border-radius: 6px;
      margin-inline-end: 4px;
    }
  }

  :deep(.ant-tabs-extra-content) {
    display: flex;
    align-items: center;
    margin-left: 4px;
    flex: 0 0 auto !important;
    position: relative;
    z-index: 2;
  }

  .tabs-ops-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 1px solid #e5e6eb;
    background: #f5f7fa;
    color: rgba(0, 0, 0, 0.65);
    font-size: 18px;
    line-height: 1;
    transition:
      background 0.2s,
      color 0.2s,
      border-color 0.2s;

    &:hover {
      background: #e6f4ff;
      border-color: #91caff;
      color: #1677ff;
    }
  }

  :deep(.ant-tabs-tab) {
    margin: 0 !important;
    padding: 6px 12px !important;
    background: transparent !important;
    border: none !important;
    border-radius: 6px !important;
    flex-shrink: 0;
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
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
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

  :deep(.ant-tabs-content-holder) {
    display: none;
  }
}
</style>
