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
const { tabState, closeTab, setActive } = useTabs()

function onTabChange(key) {
  setActive(key)
  router.push(key)
}

function onTabEdit(targetKey, action) {
  if (action === 'remove') {
    const closingActive = tabState.activePath === targetKey
    closeTab(targetKey)
    if (closingActive) {
      router.push(tabState.activePath)
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
