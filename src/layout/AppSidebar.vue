<template>
  <a-layout-sider
    class="app-sidebar"
    :width="160"
    :collapsed-width="0"
    breakpoint="lg"
    collapsible
    v-model:collapsed="collapsed"
  >
    <a-menu
      v-model:selectedKeys="selectedKeys"
      mode="inline"
      :items="menuItems"
      @click="onMenuClick"
    />
  </a-layout-sider>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sideMenus, resolveModuleKey } from '@/config/menus'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const router = useRouter()
const { openTab } = useTabs()
const collapsed = ref(false)

const moduleKey = computed(() => resolveModuleKey(route.path))

const menuItems = computed(() =>
  (sideMenus[moduleKey.value] || []).map((item) => ({
    key: item.path,
    label: item.label,
  })),
)

const selectedKeys = computed({
  get: () => [route.path],
  set: () => {},
})

function onMenuClick({ key }) {
  openTab(key)
  router.push(key)
}
</script>

<style lang="less" scoped>
.app-sidebar {
  background: #fff;
  border-right: 1px solid #f0f0f0;

  :deep(.ant-layout-sider-children) {
    display: flex;
    flex-direction: column;
  }

  :deep(.ant-menu) {
    border-inline-end: none;
    flex: 1;
  }
}
</style>
