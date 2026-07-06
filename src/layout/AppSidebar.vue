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
      :selected-keys="selectedKeys"
      v-model:openKeys="openKeys"
      mode="inline"
      :items="menuItems"
    />
  </a-layout-sider>
</template>

<script setup>
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Badge } from 'ant-design-vue'
import { sideMenus, resolveModuleKey } from '@/config/menus'
import { navigateTab } from '@/utils/navigateTab'
import { useWorkOrderMenuBadges } from '@/composables/useWorkOrderMenuBadges'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const { badges } = useWorkOrderMenuBadges()
const openKeys = ref([])

const moduleKey = computed(() => resolveModuleKey(route.path))

function renderLabel(item) {
  const count = badges.value[item.path] || 0
  if (count > 0) {
    return h('span', { class: 'menu-label-with-badge' }, [
      item.label,
      h(Badge, {
        count,
        size: 'small',
        overflowCount: 99,
        class: 'menu-badge',
      }),
    ])
  }
  return item.label
}

function mapMenuItem(item) {
  if (item.children?.length) {
    return {
      key: item.key,
      label: item.label,
      children: item.children.map(mapMenuItem),
    }
  }
  return {
    key: item.path,
    label: renderLabel(item),
    onClick: () => navigateTab(router, item.path),
  }
}

const menuItems = computed(() => (sideMenus[moduleKey.value] || []).map(mapMenuItem))

function flattenMenuPaths(menus) {
  const paths = []
  for (const m of menus) {
    if (m.path) paths.push(m.path)
    if (m.children?.length) paths.push(...flattenMenuPaths(m.children))
  }
  return paths
}

function resolveParentOpenKey(path) {
  const menus = sideMenus[moduleKey.value] || []
  for (const m of menus) {
    if (m.children?.some((c) => path === c.path || path.startsWith(`${c.path}/`))) {
      return m.key
    }
  }
  return null
}

function resolveActiveMenuPath(path) {
  const menus = sideMenus[moduleKey.value] || []
  const allPaths = flattenMenuPaths(menus)
  if (allPaths.includes(path)) return path
  const matched = allPaths.find((p) => path.startsWith(`${p}/`))
  return matched || path
}

const selectedKeys = computed(() => [resolveActiveMenuPath(route.path)])

watch(
  () => route.path,
  (path) => {
    const parentKey = resolveParentOpenKey(path)
    if (parentKey && !openKeys.value.includes(parentKey)) {
      openKeys.value = [...openKeys.value, parentKey]
    }
  },
  { immediate: true },
)
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

  :deep(.menu-label-with-badge) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    justify-content: space-between;
    padding-right: 4px;
  }

  :deep(.menu-badge) {
    .ant-badge-count {
      min-width: 16px;
      height: 16px;
      line-height: 16px;
      font-size: 10px;
      padding: 0 4px;
      box-shadow: none;
    }
  }
}
</style>
