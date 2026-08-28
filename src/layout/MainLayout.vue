<template>
  <a-layout class="main-layout">
    <AppHeader />
    <a-layout class="main-body">
      <AppSidebar v-if="sideItems.length" />
      <a-layout class="content-wrap">
        <GlobalTabs />
        <a-layout-content class="page-content">
          <router-view v-slot="{ Component, route: currentRoute }">
            <keep-alive :include="cachedViews">
              <component :is="Component" :key="viewCacheKey(currentRoute)" />
            </keep-alive>
          </router-view>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import GlobalTabs from './GlobalTabs.vue'
import { sideMenus, resolveModuleKey } from '@/config/menus'
import { createPageRegistry } from '@/config/createPages'
import { enhanceListFilterBars, startListFilterBarObserver } from '@/utils/listFilterEnhance'
import { useTabs } from '@/composables/useTabs'

const route = useRoute()
const { syncTabWithRoute } = useTabs()

const moduleKey = computed(() => resolveModuleKey(route.path))
const sideItems = computed(() => sideMenus[moduleKey.value] || [])

const cachedViews = [
  'ProductionPlanView',
  'ProductBomCreateView',
  'EbomDesignView',
  'EcnCreateView',
  'SalesOrderDetailView',
  'SalesOrderEditView',
  ...createPageRegistry.map((page) => page.keepAlive),
]

/** 一律用 path 做缓存 key，避免 query 编码差异/丢参导致新建页重挂载刷新 */
function viewCacheKey(currentRoute) {
  return String(currentRoute?.path || '')
}

let filterObserver = null
onMounted(() => {
  filterObserver = startListFilterBarObserver()
})
onUnmounted(() => {
  filterObserver?.disconnect?.()
  filterObserver = null
})
watch(
  () => route.fullPath,
  () => {
    syncTabWithRoute(route.fullPath, route.path)
    requestAnimationFrame(() => enhanceListFilterBars(document))
  },
  { immediate: true },
)
</script>

<style lang="less" scoped>
.main-layout {
  height: 100%;
  overflow: hidden;
  background: #f0f2f5;
}

.main-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.content-wrap {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f0f2f5;
}

.page-content {
  flex: 1;
  min-height: 0;
  margin: 0 12px 12px;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  overflow: auto;

  /* 各页标题操作栏随内容区顶部固定 */
  :deep(.page-header) {
    position: sticky;
    top: 0;
    z-index: 30;
    background: #fff;
  }
}
</style>
