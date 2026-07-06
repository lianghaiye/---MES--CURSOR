<template>
  <div class="global-tabs">
    <a-tabs
      type="editable-card"
      hide-add
      :active-key="route.path"
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
import { useRoute, useRouter } from 'vue-router'
import { useTabs } from '@/composables/useTabs'
import { navigateTab } from '@/utils/navigateTab'

const route = useRoute()
const router = useRouter()
const { tabState, closeTab } = useTabs()

function onTabChange(key) {
  if (key === route.path) return
  navigateTab(router, key)
}

function onTabEdit(targetKey, action) {
  if (action === 'remove') {
    const closingActive = route.path === targetKey
    const nextPath = closeTab(targetKey)
    if (closingActive && nextPath) {
      navigateTab(router, nextPath)
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
