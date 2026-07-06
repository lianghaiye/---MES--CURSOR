<template>
  <div class="global-tabs">
    <a-tabs
      type="editable-card"
      hide-add
      :active-key="tabState.activePath"
      @tabClick="onTabClick"
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

import { navigateTab } from '@/utils/navigateTab'

const router = useRouter()
const { tabState, closeTab } = useTabs()

function onTabClick(key) {
  if (key === tabState.activePath) return
  navigateTab(router, key)
}

function onTabEdit(targetKey, action) {
  if (action === 'remove') {
    const closingActive = tabState.activePath === targetKey
    closeTab(targetKey)
    if (closingActive) {
      navigateTab(router, tabState.activePath)
    }
  }
}
</script>

<style lang="less" scoped>
.global-tabs {
  background: #fff;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }

  :deep(.ant-tabs-tab) {
    padding: 8px 12px;
  }
}
</style>
