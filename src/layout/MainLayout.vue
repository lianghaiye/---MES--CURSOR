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
              <component :is="Component" :key="currentRoute.path" />
            </keep-alive>
          </router-view>
        </a-layout-content>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import GlobalTabs from './GlobalTabs.vue'
import { sideMenus, resolveModuleKey } from '@/config/menus'
import { createPageRegistry } from '@/config/createPages'

const route = useRoute()

const moduleKey = computed(() => resolveModuleKey(route.path))
const sideItems = computed(() => sideMenus[moduleKey.value] || [])

const cachedViews = [
  'ProductionPlanView',
  'ProductBomCreateView',
  'EbomDesignView',
  'EcnCreateView',
  'SalesOrderDetailView',
  ...createPageRegistry.map((page) => page.keepAlive),
]
</script>

<style lang="less" scoped>
.main-layout {
  min-height: 100vh;
  background: #f0f2f5;
}

.main-body {
  min-height: calc(100vh - 56px);
}

.content-wrap {
  flex: 1;
  min-width: 0;
  background: #f0f2f5;
}

.page-content {
  margin: 0 12px 12px;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  min-height: calc(100vh - 56px - 40px - 24px);
  overflow: auto;
}
</style>
