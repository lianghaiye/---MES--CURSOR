<template>
  <div class="salary-stats-nav">
    <router-link
      to="/report-management/salary-summary"
      class="nav-tab"
      :class="{ active: active === 'summary' }"
    >
      工资核算
    </router-link>
    <router-link
      to="/report-management/salary-detail"
      class="nav-tab"
      :class="{ active: active === 'detail' }"
    >
      核算详情
    </router-link>
  </div>
</template>

<script setup>
defineProps({
  active: { type: String, required: true },
})
</script>

<style lang="less" scoped>
.salary-stats-nav {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.nav-tab {
  padding: 8px 0 10px;
  color: rgba(0, 0, 0, 0.65);
  text-decoration: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;

  &.active {
    color: #1677ff;
    font-weight: 600;
    border-bottom-color: #1677ff;
  }
}
</style>
