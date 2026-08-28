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
  background: #fff;
  padding: 0 12px;
  border-bottom: 1px solid #f0f0f0;
  z-index: 40;

  :deep(.ant-tabs-nav) {
    margin-bottom: 0;
  }

  :deep(.ant-tabs-tab) {
    padding: 8px 12px;
  }
}
</style>
